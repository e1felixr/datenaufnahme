"""Führt mehrere Rückläufer-ZIPs der Datenaufnahme-App zu einer Mappe zusammen.

Aufruf:  py -3.13 zusammenfuehren.py [ordner] [--nummern-glaetten]

Liest alle *.zip im Ordner, führt die Tabellenblätter zeilenweise zusammen,
sammelt die Fotos in einem gemeinsamen Ordner und legt ein Blatt "Prüfpunkte"
an, das Doubletten, Nummernkollisionen, Nummernsprünge und umbenannte Fotos
ausweist.

--nummern-glaetten setzt die HK-Nummern der Räume zurück, die nicht bei 1
beginnen, und benennt die zugehörigen Fotos mit um. Das geschieht bewusst nur
auf Zuruf: Ein Sprung ist meist der App-Fehler bis v4.14.0, kann aber auch
gewollt sein — und still umzunummerieren würde denselben Fehler verbergen,
gegen den die App seit v4.13.0 beim Speichern warnt.

Hintergrund zu den Foto-Kollisionen: Der App-Export bildet den Dateinamen aus
Geschoss + Raum-Nr. + HK-Nr. Tragen zwei Einträge denselben Schlüssel, landen
zwei verschiedene Bilder unter demselben Namen im ZIP — beim gewöhnlichen
Entpacken überschreibt das zweite das erste. Dieses Skript rettet beide.
Die Zuordnung Datei -> Zeile ist dabei eindeutig, weil der Export Fotos in
derselben sortierten Reihenfolge schreibt wie die Tabellenzeilen.
"""

import hashlib
import re
import sys
import zipfile
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

# Spalten, die den fachlichen Schlüssel eines Heizkörpers bilden
KEY_COLS = ("Gebäude", "Geschoss", "Raum-Nr.", "HK-Nr.")
# Spalten, die beim Doublettenvergleich nicht zählen (Metadaten, keine Fachdaten).
# "App-Version" muss hier stehen: Läuft eine Begehung über ein Update hinweg,
# tragen sonst identische Zeilen verschiedene Stände — sie gälten dann nicht
# mehr als Doublette, sondern als zwei verschiedene Heizkörper.
IGNORE_ON_COMPARE = ("Erfasst am", "Aufgenommen von", "App-Version")

# Spalte, die das Skript ergänzt: wer die Aufnahme tatsächlich gemacht hat.
# Die App-Spalte "Erfasser" trägt den Namen, der auf dem Gerät hinterlegt ist —
# das ist der Gerätebesitzer, nicht zwingend die Person, die vor Ort war.
# Beispiel Berlin 09/2026: Max nahm auf Davids Gerät auf, Leander auf Stevens.
AUFNEHMER_COL = "Aufgenommen von"

E1_GRUEN = "66B32F"


def absender(zip_stem):
    """Name, der dem Export-Dateinamen manuell angehängt wurde.

    Die App bildet den ZIP-Namen aus bereinigtem Projekt- und Modulnamen und
    setzt dabei nie ein Leerzeichen. Alles ab dem ersten Leerzeichen ist also
    von Hand ergänzt — üblicherweise der Name dessen, der die Daten schickt.
    """
    teile = zip_stem.split(" ", 1)
    return teile[1].strip() if len(teile) > 1 else ""


# ── Sortierung ──────────────────────────────────────────────────────────────

def geschoss_key(v):
    """UG/KG vor EG vor OG 1..n vor DG."""
    s = str(v or "").strip().upper()
    zahl = re.search(r"(\d+)", s)
    n = int(zahl.group(1)) if zahl else 0
    if s.startswith("UG") or s.startswith("KG"):
        return (-2, -n)
    if s.startswith("EG"):
        return (-1, 0)
    if s.startswith("DG"):
        return (2, n)
    if s.startswith("OG"):
        return (0, n)
    return (1, n)


def natural_key(v):
    """'0.10' nach '0.9', 'A3' nach 'A2' — Zahlenblöcke numerisch vergleichen."""
    s = str(v or "").strip()
    return tuple(
        (0, int(t), "") if t.isdigit() else (1, 0, t.lower())
        for t in re.split(r"(\d+)", s) if t
    )


def num_key(v):
    m = re.search(r"(\d+)", str(v or ""))
    return int(m.group(1)) if m else 0


def finde_nummernspruenge(eintraege):
    """Räume, deren HK-Nummern nicht bei 1 beginnen.

    Ursache ist ein Fehler der App bis v4.14.0: Wurde ein Heizkörper über "+"
    aus der Übersicht angelegt, bekam er die projektweit höchste Nummer plus
    eins statt der nächsten freien im Raum. In den Berliner Rückläufern trug
    Raum 0.12 dadurch HK 14-20 statt 1-7.

    Es bleibt eine Deutung: Auch wer "-> nächster HK" drückt und die Raum-Nr.
    von Hand ändert, erzeugt einen Sprung — dann ist die Nummer gewollt.
    Darum wird nur gemeldet; geglättet wird ausschließlich auf Zuruf
    (--nummern-glaetten).

    Rückgabe: Liste von dicts mit Raumschlüssel, Versatz und Zeilen.
    """
    raeume = defaultdict(list)
    for herkunft, z in eintraege:
        schluessel = tuple(str(z.get(k) or "").strip()
                           for k in ("Gebäude", "Geschoss", "Raum-Nr."))
        if not schluessel[2]:
            continue
        raeume[schluessel].append(z)

    treffer = []
    for schluessel, zeilen in sorted(raeume.items()):
        nrn = [str(z.get("HK-Nr.") or "").strip() for z in zeilen]
        if not all(n.isdigit() for n in nrn):
            continue
        zahlen = [int(n) for n in nrn]
        versatz = min(zahlen) - 1
        if versatz <= 0:
            continue
        treffer.append({
            "schluessel": schluessel,
            "versatz": versatz,
            "alt": sorted(set(zahlen)),
            "neu": sorted({n - versatz for n in zahlen}),
            "zeilen": zeilen,
        })
    return treffer


def glaette_nummern(spruenge, foto_cols, ziel_fotos):
    """Verschiebt die HK-Nummern der betroffenen Räume auf den Beginn bei 1.

    Verschoben wird um einen festen Versatz, nicht stur auf 1..n durchgezählt:
    Eine echte Lücke innerhalb des Raums bleibt so sichtbar, statt stillschweigend
    zugezogen zu werden. Die Fotos tragen die HK-Nr. im Dateinamen und werden
    mitgezogen — sonst verweist eine Zeile "HK 1" auf ein Bild "..._HK14.jpg".

    Rückgabe: Liste von Protokollzeilen für das Prüfblatt.
    """
    protokoll = []
    for s in spruenge:
        versatz = s["versatz"]
        geb, gesch, raum = s["schluessel"]

        # Erst die Umbenennungen sammeln, dann ausführen: Ein Bild kann von
        # mehreren Zeilen referenziert werden (Doubletten teilen sich eins).
        umbenennen = {}
        for z in s["zeilen"]:
            for c in foto_cols:
                ref = str(z.get(c) or "").strip()
                if not ref:
                    continue
                alt = Path(ref).name
                neu = re.sub(r"_HK(\d+)",
                             lambda m: f"_HK{int(m.group(1)) - versatz}", alt, count=1)
                if neu != alt:
                    umbenennen[alt] = neu

        belegt = set()
        for alt, neu in sorted(umbenennen.items()):
            quelle, ziel = ziel_fotos / alt, ziel_fotos / neu
            if ziel.exists() or neu in belegt:
                # Zielname schon vergeben (die Namen führen das Gebäude nicht
                # mit, zwei Gebäude können dasselbe Geschoss/Raum haben).
                # Lieber den alten Namen behalten als ein fremdes Bild stören.
                umbenennen[alt] = alt
                protokoll.append(
                    f"{geb}, {gesch}, Raum {raum}: Foto „{alt}“ behält seinen Namen "
                    f"— „{neu}“ ist bereits vergeben")
                continue
            if quelle.exists():
                quelle.rename(ziel)
                belegt.add(neu)

        for z in s["zeilen"]:
            z["HK-Nr."] = str(int(str(z["HK-Nr."]).strip()) - versatz)
            for c in foto_cols:
                ref = str(z.get(c) or "").strip()
                if ref and Path(ref).name in umbenennen:
                    z[c] = f"Fotos/{umbenennen[Path(ref).name]}"

        protokoll.append(
            f"{geb}, {gesch}, Raum {raum}: HK-Nr. "
            f"{', '.join(str(n) for n in s['alt'])} -> "
            f"{', '.join(str(n) for n in s['neu'])} (um {versatz} zurückgesetzt)")
    return protokoll


def abstand_minuten(zeiten):
    """Spanne zwischen erstem und letztem Zeitstempel in Minuten, sonst None.

    Ein großer Abstand zwischen sonst identischen Zeilen schließt einen
    versehentlichen Doppeltipp aus — die Rückfrage muss dann anders lauten.
    """
    from datetime import datetime
    stempel = []
    for z in zeiten:
        try:
            stempel.append(datetime.strptime(str(z).strip(), "%d.%m.%Y, %H:%M"))
        except ValueError:
            return None
    if not stempel:
        return None
    return int((max(stempel) - min(stempel)).total_seconds() // 60)


# ── Einlesen ────────────────────────────────────────────────────────────────

def lies_zip(pfad):
    """Gibt (blattname, kopfzeile, zeilen, fotos) zurück.

    fotos: dict {name_im_zip: [bytes, ...]} — Liste, weil ein Name mehrfach
    vorkommen kann (Export-Kollision).
    """
    fotos = defaultdict(list)
    xlsx_bytes = None
    with zipfile.ZipFile(pfad) as z:
        for info in z.infolist():
            if info.is_dir():
                continue
            daten = z.read(info)
            if info.filename.lower().endswith(".xlsx"):
                xlsx_bytes = daten
            elif info.filename.startswith("Fotos/"):
                fotos[info.filename].append(daten)
    if xlsx_bytes is None:
        raise SystemExit(f"Keine xlsx in {pfad.name}")

    import io
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), data_only=True)
    ws = wb.active
    kopf = [c.value for c in ws[1]]
    zeilen = []
    for r in ws.iter_rows(min_row=2):
        werte = [c.value for c in r]
        if any(v not in (None, "") for v in werte):
            zeilen.append({kopf[i]: werte[i] for i in range(len(kopf)) if kopf[i]})
    return ws.title, kopf, zeilen, fotos


# ── Fotos zusammenlegen ─────────────────────────────────────────────────────

def loese_fotos_auf(quellen, ziel_fotos):
    """Legt alle Fotos ab und liefert die Umbenennungstabelle.

    quellen: Liste (herkunft, fotos-dict)
    Rückgabe: {(herkunft, zip_name, instanz_nr): endgueltiger_name}
              plus Liste der Umbenennungen für das Prüfblatt.
    """
    ziel_fotos.mkdir(parents=True, exist_ok=True)
    vergeben = {}        # endgueltiger_name -> md5
    zuordnung = {}       # (herkunft, zip_name, idx) -> endgueltiger_name
    umbenennungen = []

    for herkunft, fotos in quellen:
        for zip_name in sorted(fotos):
            basis = Path(zip_name).name
            for idx, daten in enumerate(fotos[zip_name]):
                md5 = hashlib.md5(daten).hexdigest()
                name = basis
                suffix = 0
                # Name schon vergeben? Gleicher Inhalt -> mitbenutzen,
                # anderer Inhalt -> _b, _c, ... anhängen.
                while name in vergeben and vergeben[name] != md5:
                    suffix += 1
                    p = Path(basis)
                    name = f"{p.stem}_{chr(ord('a') + suffix)}{p.suffix}"
                if name not in vergeben:
                    (ziel_fotos / name).write_bytes(daten)
                    vergeben[name] = md5
                if name != basis:
                    umbenennungen.append((
                        herkunft,
                        f"„{basis}“ kam doppelt vor und trug zwei verschiedene Bilder — "
                        f"das zweite liegt nun als „{name}“ vor"))
                elif idx > 0:
                    umbenennungen.append((
                        herkunft,
                        f"„{basis}“ kam doppelt vor, beide Male derselbe Bildinhalt — "
                        f"einmal abgelegt, beide Zeilen verweisen darauf"))
                zuordnung[(herkunft, zip_name, idx)] = name
    return zuordnung, umbenennungen


# ── Rückfragen an die Aufnehmenden ──────────────────────────────────────────

def schreibe_rueckfragen(pfad, befunde, mappenname, uebersicht, glaettungen=()):
    """Textdatei mit den offenen Punkten, nach Aufnehmenden gruppiert.

    uebersicht: {aufnehmer: set(geraetebesitzer)} — die App-Spalte "Erfasser"
    nennt den auf dem Gerät hinterlegten Namen, nicht die Person vor Ort.
    """
    from datetime import datetime

    nach_person = defaultdict(list)
    for b in befunde:
        for e in b["aufnehmer"]:
            nach_person[e].append(b)

    L = []
    L.append("RÜCKFRAGEN ZUR HEIZKÖRPER-AUFNAHME")
    L.append("=" * 70)
    L.append("")
    L.append(f"Stand: {datetime.now():%d.%m.%Y, %H:%M} Uhr")
    L.append(f"Grundlage: {mappenname}, Blatt „Prüfpunkte“")
    L.append("")
    # Die Spalte "Erfasser" trägt den Namen, der auf dem Gerät hinterlegt ist.
    # Wer tatsächlich vor Ort war, steht im Namen des eingesandten Rückläufers.
    L.append("Wer hat aufgenommen — und auf wessen Gerät:")
    L.append(f"   {'Aufgenommen von':<18} Gerät")
    for person in sorted(uebersicht):
        L.append(f"   {person:<18} {', '.join(sorted(uebersicht[person]))}")
    L.append("")
    L.append("Hinweis: In der Spalte „Erfasser“ der Mappe steht der Name, der auf")
    L.append("dem jeweiligen Gerät hinterlegt ist — also der Gerätebesitzer. Wer die")
    L.append("Aufnahme gemacht hat, steht in der Spalte „Aufgenommen von“.")
    L.append("")
    if glaettungen:
        L.append("Zur Kenntnis — in diesen Räumen wurden die HK-Nummern")
        L.append("zurückgesetzt, weil sie nicht bei 1 begannen:")
        L.append("")
        for zeile in glaettungen:
            L.append(f"   {zeile}")
        L.append("")
        L.append("Ursache war ein Fehler der App (bis v4.14.0): Wurde ein Heizkörper")
        L.append("über „+“ aus der Übersicht angelegt, bekam er die höchste Nummer")
        L.append("des ganzen Projekts statt der nächsten freien im Raum. Die Fotos")
        L.append("sind mit umbenannt, ihr müsst nichts nachtragen.")
        L.append("")
    if not nach_person:
        L.append("Keine offenen Punkte — die Aufnahmen sind in sich stimmig.")
        pfad.write_text("\n".join(L) + "\n", encoding="utf-8")
        return

    L.append("Beim Zusammenführen der Rückläufer sind ein paar Stellen aufgefallen,")
    L.append("die sich vom Schreibtisch aus nicht klären lassen. Die Zeilennummern")
    L.append("beziehen sich auf das Blatt „HK-Aufnahme“ der zusammengeführten Mappe.")
    L.append("")

    for person in sorted(nach_person):
        L.append("")
        L.append("-" * 70)
        L.append(f"An {person}")
        L.append("-" * 70)
        for i, b in enumerate(nach_person[person], start=1):
            geb, gesch, raum, hknr = b["schluessel"]
            ort = f"{geb}, {gesch}, Raum {raum}, HK-Nr. {hknr}"
            L.append("")
            L.append(f"{i}. {ort}   (Zeile {b['zeilen']})")
            if b["art"] == "Nummernkollision":
                bez = [r for r in b["raeume"] if r != "— leer —"]
                L.append(f"   Unter dieser Kennung stehen {b['anzahl']} verschiedene "
                         f"Heizkörper —")
                L.append("   sie unterscheiden sich in Maßen, Gliederzahl oder Strang.")
                if len(bez) > 1:
                    L.append(f"   Die Raumbezeichnungen lauten: {', '.join(bez)}.")
                    L.append("   Das sieht danach aus, als wäre die Raum-Nummer beim")
                    L.append("   Weitergehen in den nächsten Raum nicht mitgeändert worden.")
                    L.append("   Frage: Welche Raum-Nummer gehört jeweils dazu?")
                else:
                    L.append("   Frage: Sind das wirklich mehrere Heizkörper im selben Raum?")
                    L.append("   Dann bräuchten sie fortlaufende HK-Nummern (1, 2, 3 …).")
                    L.append("   Oder gehören sie in verschiedene Räume?")
            elif b["art"] == "Nummernsprung":
                L.append(f"   Die {b['anzahl']} Heizkörper dieses Raums tragen die "
                         f"Nummern {b['schluessel'][3]} —")
                L.append("   sie beginnen also nicht bei 1.")
                L.append("   Das geht vermutlich auf einen Fehler der App zurück: Bis")
                L.append("   v4.14.0 vergab sie beim Anlegen über „+“ die höchste Nummer")
                L.append("   des ganzen Projekts statt der nächsten freien im Raum.")
                L.append("   Frage: Hast du die Nummern bewusst so vergeben — oder")
                L.append("   dürfen sie auf 1, 2, 3 … zurückgesetzt werden?")
            elif b["art"] == "Doublette":
                zeiten = b["zeiten"]
                L.append(f"   {b['anzahl']} Zeilen mit vollständig identischen Angaben —")
                if len(set(zeiten)) == 1:
                    L.append(f"   beide zur selben Minute erfasst ({zeiten[0]}).")
                    L.append("   Das sieht nach einem doppelten Tipp auf „Speichern“ aus.")
                    L.append("   Frage: Derselbe Heizkörper versehentlich zweimal aufgenommen?")
                    L.append("   Dann streiche ich die zweite Zeile.")
                elif b["abstand_min"] is not None and b["abstand_min"] >= 60:
                    st = b["abstand_min"] // 60
                    L.append(f"   erfasst um {zeiten[0]} und {zeiten[-1]} —")
                    L.append(f"   also rund {st} Stunden auseinander, mit demselben Foto.")
                    L.append("   Ein versehentlicher Doppeltipp erklärt das nicht.")
                    L.append(f"   Frage: Weißt du noch, was du um {zeiten[-1][-5:]} Uhr gemacht")
                    L.append("   hast? Den Eintrag nochmal geöffnet und gespeichert, im Zug")
                    L.append("   oder abends nachgearbeitet? Die Antwort hilft, einen Fehler")
                    L.append("   in der App einzugrenzen — es geht nicht um einen Vorwurf.")
                else:
                    L.append(f"   erfasst um {zeiten[0]} und {zeiten[-1]}.")
                    L.append("   Frage: Derselbe Heizkörper versehentlich zweimal aufgenommen?")
                    L.append("   Dann streiche ich die zweite Zeile.")
            else:  # Doppelaufnahme
                L.append(f"   Diesen Heizkörper haben mehrere aufgenommen "
                         f"({', '.join(b['aufnehmer'])}).")
                L.append("   Frage: Wer war in diesem Raum — damit die doppelte")
                L.append("   Aufnahme entfallen kann?")
        L.append("")

    L.append("")
    L.append("-" * 70)
    if glaettungen:
        L.append("Solange nichts geklärt ist, bleiben alle Zeilen in der Mappe stehen —")
        L.append("gelöscht wurde nichts. Umnummeriert wurde ausschließlich in den oben")
        L.append("genannten Räumen.")
    else:
        L.append("Solange nichts geklärt ist, bleiben alle Zeilen unverändert in der")
        L.append("Mappe stehen — es wurde nichts gelöscht und nichts umnummeriert.")
    pfad.write_text("\n".join(L) + "\n", encoding="utf-8")


# ── Hauptlauf ───────────────────────────────────────────────────────────────

def main():
    # Das Skript liegt im Projektordner, die Rückläufer in einem Unterordner.
    # Ohne Argument wird darum im Arbeitsverzeichnis gesucht; findet sich dort
    # nichts, werden die Unterordner mit ZIPs zur Auswahl genannt.
    argumente = [a for a in sys.argv[1:] if not a.startswith("--")]
    glaetten = "--nummern-glaetten" in sys.argv[1:]
    ordner = Path(argumente[0]) if argumente else Path.cwd()
    zips = sorted(p for p in ordner.glob("*.zip"))
    if not zips:
        basis = Path(__file__).parent
        kandidaten = sorted({p.parent for p in basis.glob("*/*.zip")})
        hinweis = ""
        if kandidaten:
            hinweis = "\n\n  Rückläufer liegen offenbar hier:\n" + "\n".join(
                f'     py -3.13 "{Path(__file__).name}" "{k.name}"' for k in kandidaten)
        raise SystemExit(f"\n  Keine ZIP-Dateien in {ordner}{hinweis}")

    blattname = "HK-Aufnahme"
    alle_kopf = []
    eintraege = []      # (herkunft, zeilendict)
    foto_quellen = []

    for p in zips:
        herkunft = p.stem
        aufnehmer = absender(herkunft)
        titel, kopf, zeilen, fotos = lies_zip(p)
        blattname = titel
        for h in kopf:
            if h and h not in alle_kopf:
                alle_kopf.append(h)
        for z in zeilen:
            z[AUFNEHMER_COL] = aufnehmer
            eintraege.append((herkunft, z))
        foto_quellen.append((herkunft, fotos))
        geraet = sorted({str(z.get("Erfasser") or "—") for z in zeilen})
        print(f"  {p.name}: {len(zeilen)} Zeilen, "
              f"{sum(len(v) for v in fotos.values())} Fotos "
              f"— aufgenommen von {aufnehmer or '(unbekannt)'}, "
              f"Gerät von {', '.join(geraet)}")

    # "Aufgenommen von" direkt hinter "Erfasser", Foto-Spalten ans Ende
    if "Erfasser" in alle_kopf:
        alle_kopf.insert(alle_kopf.index("Erfasser") + 1, AUFNEHMER_COL)
    else:
        alle_kopf.append(AUFNEHMER_COL)
    foto_cols = sorted((h for h in alle_kopf if str(h).startswith("Foto")), key=num_key)
    kopf = [h for h in alle_kopf if not str(h).startswith("Foto")] + foto_cols

    # Die Ausgabe liegt neben den ZIPs. Beim Aufräumen darum NICHT pauschal
    # leeren, sondern ausschließlich das anfassen, was ein früherer Lauf selbst
    # erzeugt hat — die Rückläufer und dieses Skript müssen unberührt bleiben.
    ziel = ordner
    mappe = ziel / f"{zips[0].stem.split('_')[0]}_HK-Aufnahme_zusammengefuehrt.xlsx"
    rueckfragen = ziel / "Rueckfragen.txt"
    veraltet = [p for p in (ziel / "Fotos").glob("*") if p.is_file()]
    veraltet += [p for p in (mappe, rueckfragen) if p.exists()]
    for p in veraltet:
        try:
            p.unlink()
        except PermissionError:
            raise SystemExit(
                f"\n  Die Datei ist gesperrt und lässt sich nicht ersetzen:\n"
                f"    {p}\n"
                f"  Vermutlich noch in Excel oder in der Bildvorschau geöffnet.\n"
                f"  Bitte schließen und das Skript erneut starten.")
    zuordnung, umbenennungen = loese_fotos_auf(foto_quellen, ziel / "Fotos")

    # Foto-Referenzen je Zeile auf die endgültigen Namen umbiegen.
    # Instanz-Zähler pro (herkunft, zip_name) läuft in Zeilenreihenfolge mit —
    # genau so schreibt der Export die Dateien.
    instanz = defaultdict(int)
    for herkunft, zeile in eintraege:
        for c in foto_cols:
            ref = zeile.get(c)
            if not ref:
                continue
            zip_name = str(ref).strip()
            idx = instanz[(herkunft, zip_name)]
            instanz[(herkunft, zip_name)] += 1
            neu = zuordnung.get((herkunft, zip_name, idx))
            zeile[c] = f"Fotos/{neu}" if neu else ref

    # Nummernsprünge suchen — vor dem Sortieren, damit die Fotoreferenzen schon
    # auf den endgültigen Namen zeigen und mit umbenannt werden können.
    spruenge = finde_nummernspruenge(eintraege)
    glaettungen = []
    if spruenge and glaetten:
        glaettungen = glaette_nummern(spruenge, foto_cols, ziel / "Fotos")
        print(f"\n  {len(spruenge)} Raum/Räume mit Nummernsprung geglättet:")
        for zeile in glaettungen:
            print(f"     {zeile}")
    elif spruenge:
        print(f"\n  {len(spruenge)} Raum/Räume beginnen nicht bei HK-Nr. 1 "
              f"— siehe Prüfpunkte.")
        print(f"     Geradeziehen mit:  --nummern-glaetten")

    # Sortieren
    eintraege.sort(key=lambda e: (
        natural_key(e[1].get("Gebäude")),
        geschoss_key(e[1].get("Geschoss")),
        natural_key(e[1].get("Raum-Nr.")),
        num_key(e[1].get("HK-Nr.")),
        str(e[1].get("Erfasst am") or ""),
    ))

    # ── Mappe schreiben ──
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = blattname
    ws.append(kopf)
    for _, z in eintraege:
        ws.append([z.get(h) for h in kopf])

    kopf_fill = PatternFill("solid", fgColor=E1_GRUEN)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = kopf_fill
        c.alignment = Alignment(vertical="center", wrap_text=True)
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    # Foto-Zellen klickbar machen. Der Link ist relativ zur Mappe — beide
    # liegen im selben Ordner, das Verschieben des ganzen Ordners schadet also
    # nicht. Wandert die Mappe allein woandershin, brechen die Links.
    link_font = Font(color="0563C1", underline="single")
    for i in (kopf.index(c) + 1 for c in foto_cols):
        for zelle in ws[get_column_letter(i)][1:]:
            if not zelle.value:
                continue
            zelle.hyperlink = quote(str(zelle.value).replace("\\", "/"),
                                    safe="/._-")
            zelle.font = link_font

    for i, h in enumerate(kopf, start=1):
        breite = max(len(str(h)), *(len(str(z.get(h) or "")) for _, z in eintraege), 10)
        ws.column_dimensions[get_column_letter(i)].width = min(breite + 2, 40)
        # Raum-Nr. als Text festnageln, sonst macht Excel ein Datum daraus
        if h in ("Raum-Nr.", "HK-Nr.", "Strang-Nr."):
            for c in ws[get_column_letter(i)][1:]:
                c.number_format = "@"

    # ── Befunde sammeln ──
    gruppen = defaultdict(list)
    zeilennr = {}
    for nr, (herkunft, z) in enumerate(eintraege, start=2):
        gruppen[tuple(str(z.get(k) or "") for k in KEY_COLS)].append((nr, herkunft, z))
        zeilennr[id(z)] = nr

    vergleichs_cols = [h for h in kopf
                       if h not in IGNORE_ON_COMPARE and not str(h).startswith("Foto")]
    befunde = []
    for schluessel, gruppe in sorted(gruppen.items()):
        if len(gruppe) < 2:
            continue
        zeilen_nrn = ", ".join(str(n) for n, _, _ in gruppe)
        signaturen = {tuple(str(z.get(c) or "") for c in vergleichs_cols) for _, _, z in gruppe}
        # Für die Rückfrage zählt, wer vor Ort war — nicht, wessen Gerät lief.
        aufnehmer = sorted({str(z.get(AUFNEHMER_COL) or "").strip() or "(unbekannt)"
                            for _, _, z in gruppe})
        geraete = sorted({str(z.get("Erfasser") or "") for _, _, z in gruppe})
        raeume = sorted({str(z.get("Raumbezeichnung") or "").strip() or "— leer —"
                         for _, _, z in gruppe})
        zeiten = sorted(str(z.get("Erfasst am") or "") for _, _, z in gruppe)
        if len(aufnehmer) > 1:
            # Zwei Leute haben denselben Heizkörper aufgenommen — andere Ursache,
            # andere Rückfrage als eine Kollision innerhalb einer Aufnahme.
            art = "Doppelaufnahme"
            befund = (f"{len(gruppe)} Zeilen zur selben Kennung von verschiedenen "
                      f"Aufnehmern ({', '.join(aufnehmer)}); "
                      f"Fachdaten {'identisch' if len(signaturen) == 1 else 'abweichend'}")
            empf = ("Klären, wer den Raum tatsächlich aufgenommen hat; "
                    "die doppelte Aufnahme entfernen.")
        elif len(signaturen) == 1:
            art = "Doublette"
            if len(set(zeiten)) == 1:
                befund = (f"{len(gruppe)} Zeilen mit identischen Fachdaten, "
                          f"auch derselbe Zeitstempel ({zeiten[0]}) — "
                          f"vermutlich doppelt gespeichert")
            else:
                befund = (f"{len(gruppe)} Zeilen mit identischen Fachdaten, "
                          f"nur der Zeitstempel weicht ab ({' / '.join(zeiten)})")
            empf = "Prüfen, ob eine Zeile zu löschen ist."
        else:
            art = "Nummernkollision"
            befund = (f"{len(gruppe)} verschiedene Heizkörper unter derselben Kennung; "
                      f"Raumbezeichnungen: {', '.join(raeume)}")
            empf = "Raum-Nr. bzw. HK-Nr. nachführen, damit jede Kennung eindeutig wird."
        befunde.append({
            "art": art, "zeilen": zeilen_nrn, "schluessel": schluessel,
            "aufnehmer": aufnehmer, "geraete": geraete, "raeume": raeume,
            "zeiten": zeiten, "abstand_min": abstand_minuten(zeiten),
            "anzahl": len(gruppe), "befund": befund, "empfehlung": empf,
        })

    # Nummernsprünge als Befund — nur, solange nicht geglättet wurde.
    # Nach der Glättung ist es keine offene Frage mehr, sondern eine
    # Mitteilung; die steht weiter unten im Prüfblatt.
    if not glaettungen:
        for s in spruenge:
            zeilen = sorted(zeilennr[id(z)] for z in s["zeilen"])
            spanne = (f"{s['alt'][0]}-{s['alt'][-1]}" if len(s["alt"]) > 1
                      else str(s["alt"][0]))
            personen = sorted({str(z.get(AUFNEHMER_COL) or "").strip() or "(unbekannt)"
                               for z in s["zeilen"]})
            befunde.append({
                "art": "Nummernsprung",
                "zeilen": ", ".join(str(n) for n in zeilen),
                "schluessel": (*s["schluessel"], spanne),
                "aufnehmer": personen,
                "geraete": sorted({str(z.get("Erfasser") or "") for z in s["zeilen"]}),
                "raeume": sorted({str(z.get("Raumbezeichnung") or "").strip()
                                  or "— leer —" for z in s["zeilen"]}),
                "zeiten": sorted(str(z.get("Erfasst am") or "") for z in s["zeilen"]),
                "abstand_min": None,
                "anzahl": len(s["zeilen"]),
                "befund": (f"Die HK-Nummern dieses Raums beginnen bei {s['alt'][0]} "
                           f"statt bei 1 ({', '.join(str(n) for n in s['alt'])})"),
                "empfehlung": ("Vermutlich der App-Fehler bis v4.14.0. "
                               "Geradeziehen mit --nummern-glaetten."),
            })

    # ── Blatt Prüfpunkte ──
    pruef = wb.create_sheet("Prüfpunkte")
    pruef.append(["Art", "Zeile(n)", "Gebäude", "Geschoss", "Raum-Nr.",
                  "HK-Nr.", "Aufgenommen von", "Befund", "Empfehlung"])
    for b in befunde:
        pruef.append([b["art"], b["zeilen"], *b["schluessel"],
                      ", ".join(b["aufnehmer"]), b["befund"], b["empfehlung"]])

    for herkunft, befund in umbenennungen:
        pruef.append(["Foto-Kollision", "", "", "", "", "", "",
                      f"{herkunft}: {befund}",
                      "Referenz in der Tabelle ist bereits angepasst."])

    for zeile in glaettungen:
        pruef.append(["Nummer geglättet", "", "", "", "", "", "", zeile,
                      "Tabelle und Fotonamen sind bereits angepasst."])

    for c in pruef[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = kopf_fill
        c.alignment = Alignment(vertical="center")
    pruef.freeze_panes = "A2"
    for i, b in enumerate([18, 14, 12, 10, 12, 8, 18, 80, 45], start=1):
        pruef.column_dimensions[get_column_letter(i)].width = b
    for r in pruef.iter_rows(min_row=2):
        r[7].alignment = Alignment(wrap_text=True, vertical="top")
        r[8].alignment = Alignment(wrap_text=True, vertical="top")

    wb.save(mappe)

    uebersicht = defaultdict(set)
    for _, z in eintraege:
        person = str(z.get(AUFNEHMER_COL) or "").strip() or "(unbekannt)"
        uebersicht[person].add(str(z.get("Erfasser") or "—"))
    schreibe_rueckfragen(rueckfragen, befunde, mappe.name, uebersicht, glaettungen)

    fotos_gesamt = len(list((ziel / "Fotos").glob("*")))
    print(f"\n  -> {mappe}")
    print(f"     {len(eintraege)} Zeilen, {fotos_gesamt} Fotos, "
          f"{pruef.max_row - 1} Prüfpunkte")
    print(f"  -> {rueckfragen.name}")


if __name__ == "__main__":
    main()
