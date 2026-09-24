"""Führt mehrere Rückläufer-ZIPs der Datenaufnahme-App zu einer Mappe zusammen.

Aufruf:  py -3.13 zusammenfuehren.py [ordner] [--nummern-glaetten]
                                     [--rueckfragen-an=NAME]

Liest alle *.zip im Ordner (nicht rekursiv — ein Unterordner "Archiv" bleibt
außen vor) und gruppiert sie nach Liegenschaft. Es entsteht EINE Mappe
"HK-Aufnahme_zusammengefuehrt.xlsx" mit einem Datenblatt je Liegenschaft,
dem gemeinsamen Blatt "Prüfpunkte" (Doubletten, Nummernkollisionen,
Nummernsprünge, doppelt erfasste Räume, umbenannte Fotos) und dem Blatt
"Rückfragen". Textdateien daneben gibt es nicht.

Die Bilder liegen je Liegenschaft in "Fotos_<Liegenschaft>". Getrennte Ordner
sind Pflicht: Die Fotonamen bestehen aus Geschoss, Raum-Nr. und HK-Nr. und
führen die Liegenschaft nicht mit — in einem gemeinsamen Ordner würden zwei
Objekte einander überschreiben. Zum Weitergeben Mappe und die zugehörigen
Bilderordner gemeinsam mitnehmen; die Verweise sind relativ.

--rueckfragen-an=NAME bündelt alle Rückfragen bei einer Person, statt sie nach
Aufnehmenden zu trennen — bei jedem Punkt steht dann, wessen Aufnahme gemeint
ist. Bewusst ein eigener Schalter und nicht über "aufnehmer.txt" geregelt: Dort
denselben Namen einzutragen würde die Mappe verfälschen und die Erkennung
doppelt erfasster Räume blind machen, die genau diese Namen vergleicht.

Wer vor Ort aufgenommen hat, steht in "aufnehmer.txt" neben den Rückläufern;
fehlt die Datei, legt das Skript sie als Vorlage an. Der Dateiname allein
taugt dafür nicht — er nennt je nach Begehung das Gerät oder die Person.

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

    Die App bildet den ZIP-Namen aus bereinigtem Projekt- und Modulnamen.
    Angehängt wird von Hand — bis 09/2026 mit Leerzeichen ("… HK-Aufnahme Max"),
    seither mit Unterstrich ("…_HK-Aufnahme_Max"). Beide Schreibweisen werden
    erkannt. Ob der Name das Gerät oder die Person vor Ort meint, ist damit
    nicht gesagt — das klärt aufnehmer.txt.
    """
    if " " in zip_stem:
        return zip_stem.split(" ", 1)[1].strip()
    teile = zip_stem.split("_")
    return teile[-1].strip() if len(teile) > 2 else ""


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


def finde_doppelt_erfasste_raeume(eintraege):
    """Räume, an denen mehrere Personen gearbeitet haben.

    Die Doppelaufnahme-Erkennung weiter unten vergleicht je Kennung
    (Gebäude/Geschoss/Raum-Nr./HK-Nr.). Haben zwei Leute denselben Raum
    unabhängig voneinander durchnummeriert, kollidiert keine einzige
    Kennung und der Fall fällt durch — Schweden 09/2026, Gebäude 3,
    Raum 0.12: Max vergab HK 1-6, Steven zeitgleich HK 14-20, vermutlich
    für dieselben Heizkörper.
    """
    raeume = defaultdict(list)
    for _, z in eintraege:
        s = tuple(str(z.get(k) or "").strip()
                  for k in ("Gebäude", "Geschoss", "Raum-Nr."))
        if not s[2]:
            continue
        raeume[s].append(z)

    treffer = []
    for s, zeilen in sorted(raeume.items()):
        personen = sorted({str(z.get(AUFNEHMER_COL) or "").strip() or "(unbekannt)"
                           for z in zeilen})
        if len(personen) > 1:
            treffer.append({"schluessel": s, "personen": personen, "zeilen": zeilen})
    return treffer


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
        # Wo zwei Leute unabhängig nummeriert haben, darf keine Automatik ran:
        # Der Sprung ist dann kein App-Fehler, sondern die zweite Zählung.
        personen = {str(z.get(AUFNEHMER_COL) or "").strip() or "(unbekannt)"
                    for z in zeilen}
        treffer.append({
            "schluessel": schluessel,
            "versatz": versatz,
            "alt": sorted(set(zahlen)),
            "neu": sorted({n - versatz for n in zahlen}),
            "zeilen": zeilen,
            "mehrere_aufnehmer": len(personen) > 1,
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
                    z[c] = f"{ziel_fotos.name}/{umbenennen[Path(ref).name]}"

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

def baue_rueckfragen(liegenschaft_name, befunde, uebersicht, glaettungen=(),
                     empfaenger=None):
    """Textzeilen mit den offenen Punkten, nach Aufnehmenden gruppiert.

    Gibt die Zeilen zurück; geschrieben werden sie als Blatt "Rückfragen"
    derselben Mappe — es gibt bewusst keine Textdatei daneben.

    uebersicht: {aufnehmer: set(geraetebesitzer)} — die App-Spalte "Erfasser"
    nennt den auf dem Gerät hinterlegten Namen, nicht die Person vor Ort.
    """
    # Alles an eine Person, oder je Aufnehmenden getrennt. Der Empfänger wird
    # ausdrücklich gesetzt und nicht über die Aufnehmer-Zuordnung geregelt:
    # Sonst trüge die Mappe überall denselben Namen, und die Erkennung doppelt
    # erfasster Räume — die genau diese Namen vergleicht — würde blind.
    nach_person = defaultdict(list)
    if empfaenger:
        nach_person[empfaenger] = list(befunde)
    else:
        for b in befunde:
            for e in b["aufnehmer"]:
                nach_person[e].append(b)

    from datetime import datetime

    L = []
    L.append(f"RÜCKFRAGEN ZUR HEIZKÖRPER-AUFNAHME — {liegenschaft_name.upper()}")
    L.append("=" * 70)
    L.append("")
    L.append(f"Stand: {datetime.now():%d.%m.%Y, %H:%M} Uhr")
    L.append("Grundlage: Blatt „Prüfpunkte“ dieser Mappe")
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
        return L

    L.append("Beim Zusammenführen der Rückläufer sind ein paar Stellen aufgefallen,")
    L.append("die sich vom Schreibtisch aus nicht klären lassen. Die Zeilennummern")
    L.append(f"beziehen sich auf das Blatt „{liegenschaft_name}“ dieser Mappe.")
    L.append("")
    if empfaenger:
        L.append("Die Fragen sind in der Du-Form an die jeweils aufnehmende Person")
        L.append("formuliert — wer gemeint ist, steht bei jedem Punkt.")
        L.append("")

    for person in sorted(nach_person):
        L.append("")
        L.append("-" * 70)
        L.append(f"An {person}")
        L.append("-" * 70)
        for i, b in enumerate(nach_person[person], start=1):
            geb, gesch, raum, hknr = b["schluessel"]
            ort = f"{geb}, {gesch}, Raum {raum}"
            if hknr:
                ort += f", HK-Nr. {hknr}"
            L.append("")
            L.append(f"{i}. {ort}   (Zeile {b['zeilen']})")
            if empfaenger:
                L.append(f"   Aufgenommen von: {', '.join(b['aufnehmer'])}")
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
            elif b["art"] == "Raum mehrfach erfasst":
                L.append(f"   In diesem Raum haben {len(b['aufnehmer'])} Leute "
                         f"aufgenommen ({', '.join(b['aufnehmer'])}),")
                L.append(f"   zusammen {b['anzahl']} Heizkörper — jeder mit eigener")
                L.append("   Zählung, deshalb kollidiert keine Nummer.")
                if b["zeiten"][0] and b["zeiten"][-1]:
                    L.append(f"   Erfasst zwischen {b['zeiten'][0]} und {b['zeiten'][-1]}.")
                L.append("   Frage: Habt ihr denselben Raum zweimal aufgenommen?")
                L.append("   Dann streiche ich eine der beiden Zählungen — sagt mir")
                L.append("   bitte, welche stehen bleiben soll.")
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
    return L


# ── Liegenschaften und Aufnehmende ──────────────────────────────────────────

def liegenschaft(zip_stem):
    """Name der Liegenschaft — das, was die App dem Export voranstellt.

    Liegen mehrere Liegenschaften im selben Ordner, müssen sie getrennt
    bleiben: Raum-Nummern und Gebäude-Bezeichnungen wiederholen sich
    zwischen Objekten ("Gebäude 1" gibt es in beiden), und die Fotonamen
    führen die Liegenschaft nicht mit.
    """
    return zip_stem.split("_", 1)[0].strip()


def lies_aufnehmer(ordner, zips):
    """Zuordnung Rückläufer -> Person, die vor Ort aufgenommen hat.

    Der Dateiname nennt je nach Begehung mal das Gerät, mal den Absender,
    mal die Person — verlässlich weiß es nur, wer die Begehung organisiert
    hat. Darum eine Liste neben den Rückläufern statt einer Annahme im Code.
    Fehlt sie, wird sie als Vorlage angelegt und mit dem Namen aus dem
    Dateinamen vorbelegt.
    """
    pfad = ordner / "aufnehmer.txt"
    if pfad.exists():
        zuordnung = {}
        for zeile in pfad.read_text(encoding="utf-8").splitlines():
            zeile = zeile.split("#", 1)[0].strip()
            if "=" not in zeile:
                continue
            datei, person = zeile.split("=", 1)
            zuordnung[datei.strip()] = person.strip()
        return zuordnung

    vorbelegt = {p.stem: absender(p.stem) for p in zips}
    L = ["# Wer hat vor Ort aufgenommen? Eine Zeile je Rückläufer.",
         "# Der Dateiname nennt oft nur das Gerät oder den Absender — hier",
         "# steht die Person, die tatsächlich erfasst hat. Vorbelegt ist der",
         "# Name aus dem Dateinamen; bitte prüfen und berichtigen.",
         "# Diese Datei bleibt bei weiteren Läufen unangetastet.",
         ""]
    L += [f"{stem} = {name}" for stem, name in sorted(vorbelegt.items())]
    pfad.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"  Vorlage angelegt: {pfad.name} — bitte eintragen, wer vor Ort war.\n")
    return vorbelegt


# ── Hauptlauf ───────────────────────────────────────────────────────────────

def verarbeite(wb, name, zips, basis, glaetten, aufnehmer_map, empfaenger=None):
    """Führt die Rückläufer EINER Liegenschaft zu einem Blatt in wb zusammen.

    Rückgabe: (prüfpunkt-zeilen, rückfragen-textzeilen) — beide wandern in
    gemeinsame Blätter am Ende der Mappe, damit alle Liegenschaften in einer
    Datei liegen.
    """
    blattname = "HK-Aufnahme"
    alle_kopf = []
    eintraege = []      # (herkunft, zeilendict)
    foto_quellen = []

    # Nur ASCII in der Konsolenausgabe: Die Windows-Konsole laeuft unter
    # cp1252 und bricht an Rahmenzeichen hart ab.
    print(f"\n  --- {name} ---")
    for p in zips:
        herkunft = p.stem
        aufnehmer = aufnehmer_map.get(herkunft) or absender(herkunft)
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
    # Alles auf einer Ebene neben den Rückläufern — nur der Bilderordner trägt
    # die Liegenschaft im Namen. Ein gemeinsamer Ordner ginge nicht: Die
    # Fotonamen bestehen aus Geschoss, Raum-Nr. und HK-Nr. und führen die
    # Liegenschaft nicht mit, zwei Objekte würden sich gegenseitig überschreiben.
    ziel = basis
    foto_ordner = ziel / f"Fotos_{name}"
    # Altlasten früherer Läufe: Bis 24.09.2026 entstand je Liegenschaft eine
    # eigene Mappe plus Rückfragen-Textdatei. Beides ist durch die gemeinsame
    # Mappe abgelöst und bliebe sonst veraltet liegen.
    veraltet = [p for p in foto_ordner.glob("*") if p.is_file()]
    veraltet += [p for p in (ziel / f"{name}_HK-Aufnahme_zusammengefuehrt.xlsx",
                             ziel / f"Rueckfragen_{name}.txt",
                             ziel / "Rueckfragen.txt") if p.exists()]
    for p in veraltet:
        try:
            p.unlink()
        except PermissionError:
            raise SystemExit(
                f"\n  Die Datei ist gesperrt und lässt sich nicht ersetzen:\n"
                f"    {p}\n"
                f"  Vermutlich noch in Excel oder in der Bildvorschau geöffnet.\n"
                f"  Bitte schließen und das Skript erneut starten.")
    zuordnung, umbenennungen = loese_fotos_auf(foto_quellen, foto_ordner)

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
            zeile[c] = f"{foto_ordner.name}/{neu}" if neu else ref

    # Nummernsprünge suchen — vor dem Sortieren, damit die Fotoreferenzen schon
    # auf den endgültigen Namen zeigen und mit umbenannt werden können.
    spruenge = finde_nummernspruenge(eintraege)
    glaettbar = [s for s in spruenge if not s["mehrere_aufnehmer"]]
    offen = [s for s in spruenge if s["mehrere_aufnehmer"]]
    glaettungen = []
    if glaetten and glaettbar:
        glaettungen = glaette_nummern(glaettbar, foto_cols, foto_ordner)
        print(f"\n  {len(glaettbar)} Raum/Räume mit Nummernsprung geglättet:")
        for zeile in glaettungen:
            print(f"     {zeile}")
    elif spruenge:
        print(f"\n  {len(spruenge)} Raum/Räume beginnen nicht bei HK-Nr. 1 "
              f"— siehe Prüfpunkte.")
        print(f"     Geradeziehen mit:  --nummern-glaetten")
    if glaetten and offen:
        print(f"  {len(offen)} davon nicht angetastet — dort haben mehrere "
              f"aufgenommen, das braucht eine Klärung.")

    # Sortieren
    eintraege.sort(key=lambda e: (
        natural_key(e[1].get("Gebäude")),
        geschoss_key(e[1].get("Geschoss")),
        natural_key(e[1].get("Raum-Nr.")),
        num_key(e[1].get("HK-Nr.")),
        str(e[1].get("Erfasst am") or ""),
    ))

    # ── Mappe schreiben ──
    # Blattname ist die Liegenschaft, nicht der Modulname aus dem ZIP: Der
    # hieße bei jeder Liegenschaft gleich ("HK-Aufnahme") und kollidierte.
    ws = wb.create_sheet(name[:31])
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
    #
    # Maskiert wird nur, was einen Verweis wirklich zerreißt. Eine vollständige
    # URL-Maskierung macht aus Umlauten Prozentfolgen, und der Verweis zeigt an
    # der Datei vorbei: Köpi 09/2026 heißen die Geschosse "Erdgeschoß" statt
    # "EG" — dort waren alle 26 Bildverweise tot, während Schweden mit seinen
    # reinen ASCII-Namen unauffällig blieb.
    def als_verweis(pfad):
        s = str(pfad).replace("\\", "/")
        for zeichen, ersatz in (("%", "%25"), (" ", "%20"), ("#", "%23")):
            s = s.replace(zeichen, ersatz)
        return s

    link_font = Font(color="0563C1", underline="single")
    for i in (kopf.index(c) + 1 for c in foto_cols):
        for zelle in ws[get_column_letter(i)][1:]:
            if not zelle.value:
                continue
            zelle.hyperlink = als_verweis(zelle.value)
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
    def rahmen(zeilen_objekte):
        """Gemeinsame Felder eines raumbezogenen Befunds."""
        return {
            "zeilen": ", ".join(str(n) for n in
                                sorted(zeilennr[id(z)] for z in zeilen_objekte)),
            "aufnehmer": sorted({str(z.get(AUFNEHMER_COL) or "").strip()
                                 or "(unbekannt)" for z in zeilen_objekte}),
            "geraete": sorted({str(z.get("Erfasser") or "") for z in zeilen_objekte}),
            "raeume": sorted({str(z.get("Raumbezeichnung") or "").strip()
                              or "— leer —" for z in zeilen_objekte}),
            "zeiten": sorted(str(z.get("Erfasst am") or "") for z in zeilen_objekte),
            "abstand_min": None,
            "anzahl": len(zeilen_objekte),
        }

    # Räume, an denen mehrere gearbeitet haben. Nur melden, was die
    # Doppelaufnahme-Erkennung je Kennung nicht ohnehin schon hat.
    schon_gemeldet = {b["schluessel"][:3] for b in befunde
                      if b["art"] == "Doppelaufnahme"}
    for d in finde_doppelt_erfasste_raeume(eintraege):
        if d["schluessel"] in schon_gemeldet:
            continue
        je_person = defaultdict(list)
        for z in d["zeilen"]:
            je_person[str(z.get(AUFNEHMER_COL) or "").strip() or "(unbekannt)"].append(
                str(z.get("HK-Nr.") or "?").strip())
        aufteilung = "; ".join(f"{p}: HK {', '.join(sorted(n, key=num_key))}"
                               for p, n in sorted(je_person.items()))
        befunde.append({
            "art": "Raum mehrfach erfasst",
            **rahmen(d["zeilen"]),
            "schluessel": (*d["schluessel"], ""),
            "befund": (f"{len(d['personen'])} Personen haben in diesem Raum "
                       f"aufgenommen — {aufteilung}"),
            "empfehlung": ("Klären, ob dieselben Heizkörper zweimal erfasst wurden; "
                           "eine der beiden Zählungen entfernen."),
        })

    # Nummernsprünge: melden, was nicht geglättet wurde.
    for s in (offen if glaetten else spruenge):
        spanne = (f"{s['alt'][0]}-{s['alt'][-1]}" if len(s["alt"]) > 1
                  else str(s["alt"][0]))
        mehrere = s["mehrere_aufnehmer"]
        befunde.append({
            "art": "Nummernsprung",
            **rahmen(s["zeilen"]),
            "schluessel": (*s["schluessel"], spanne),
            "befund": (f"Die HK-Nummern dieses Raums beginnen bei {s['alt'][0]} "
                       f"statt bei 1 ({', '.join(str(n) for n in s['alt'])})"),
            "empfehlung": ("In diesem Raum haben mehrere aufgenommen — erst klären, "
                           "dann von Hand nummerieren; nicht automatisch glätten."
                           if mehrere else
                           "Vermutlich der App-Fehler bis v4.14.0. "
                           "Geradeziehen mit --nummern-glaetten."),
        })

    # ── Prüfpunkte sammeln ──
    # Das Blatt entsteht erst in main(), gemeinsam für alle Liegenschaften.
    # Die Spalten zwischen Art und Befund: Zeile(n), Gebäude, Geschoss,
    # Raum-Nr., HK-Nr., Aufgenommen von.
    leer = [""] * 6
    pruefzeilen = [
        [name, b["art"], b["zeilen"], *b["schluessel"],
         ", ".join(b["aufnehmer"]), b["befund"], b["empfehlung"]]
        for b in befunde
    ]
    pruefzeilen += [
        [name, "Foto-Kollision", *leer, f"{herkunft}: {befund}",
         "Referenz in der Tabelle ist bereits angepasst."]
        for herkunft, befund in umbenennungen
    ]
    pruefzeilen += [
        [name, "Nummer geglättet", *leer, zeile,
         "Tabelle und Fotonamen sind bereits angepasst."]
        for zeile in glaettungen
    ]

    uebersicht = defaultdict(set)
    for _, z in eintraege:
        person = str(z.get(AUFNEHMER_COL) or "").strip() or "(unbekannt)"
        uebersicht[person].add(str(z.get("Erfasser") or "—"))
    rueckfragen_zeilen = baue_rueckfragen(name, befunde, uebersicht, glaettungen,
                                          empfaenger)

    fotos_gesamt = len(list(foto_ordner.glob("*")))
    print(f"     Blatt „{name}“: {len(eintraege)} Zeilen, {fotos_gesamt} Fotos, "
          f"{len(pruefzeilen)} Prüfpunkte")
    return pruefzeilen, rueckfragen_zeilen


def main():
    # Das Skript liegt im Projektordner, die Rückläufer in einem Unterordner.
    # Ohne Argument wird darum im Arbeitsverzeichnis gesucht; findet sich dort
    # nichts, werden die Unterordner mit ZIPs zur Auswahl genannt.
    argumente = [a for a in sys.argv[1:] if not a.startswith("--")]
    glaetten = "--nummern-glaetten" in sys.argv[1:]
    empfaenger = next((a.split("=", 1)[1].strip() for a in sys.argv[1:]
                       if a.startswith("--rueckfragen-an=")), None)
    ordner = Path(argumente[0]) if argumente else Path.cwd()
    # Nicht rekursiv: Ein Unterordner "Archiv" mit früheren Rückläufern darf
    # nicht mit eingesammelt werden.
    zips = sorted(p for p in ordner.glob("*.zip"))
    if not zips:
        basis = Path(__file__).parent
        kandidaten = sorted({p.parent for p in basis.glob("*/*.zip")})
        hinweis = ""
        if kandidaten:
            hinweis = "\n\n  Rückläufer liegen offenbar hier:\n" + "\n".join(
                f'     py -3.13 "{Path(__file__).name}" "{k.name}"' for k in kandidaten)
        raise SystemExit(f"\n  Keine ZIP-Dateien in {ordner}{hinweis}")

    aufnehmer_map = lies_aufnehmer(ordner, zips)

    nach_liegenschaft = defaultdict(list)
    for p in zips:
        nach_liegenschaft[liegenschaft(p.stem)].append(p)
    if len(nach_liegenschaft) > 1:
        print(f"  {len(zips)} Rückläufer aus {len(nach_liegenschaft)} Liegenschaften: "
              f"{', '.join(sorted(nach_liegenschaft))}")
        print("  Jede bekommt eine eigene Mappe und einen eigenen Bilderordner —")
        print("  Raum-Nummern und Fotonamen wiederholen sich zwischen Objekten.")

    mappe = ordner / "HK-Aufnahme_zusammengefuehrt.xlsx"
    if mappe.exists():
        try:
            mappe.unlink()
        except PermissionError:
            raise SystemExit(
                f"\n  Die Mappe ist gesperrt und lässt sich nicht ersetzen:\n"
                f"    {mappe}\n"
                f"  Vermutlich noch in Excel geöffnet. Bitte schließen und das\n"
                f"  Skript erneut starten.")

    wb = openpyxl.Workbook()
    wb.remove(wb.active)          # das leere Vorgabeblatt

    alle_pruefzeilen, alle_rueckfragen = [], []
    for name in sorted(nach_liegenschaft):
        pz, rz = verarbeite(wb, name, nach_liegenschaft[name], ordner, glaetten,
                            aufnehmer_map, empfaenger)
        alle_pruefzeilen += pz
        if alle_rueckfragen:
            alle_rueckfragen += ["", "", ""]
        alle_rueckfragen += rz

    kopf_fill = PatternFill("solid", fgColor=E1_GRUEN)

    # ── Blatt Prüfpunkte ──
    pruef = wb.create_sheet("Prüfpunkte")
    pruef.append(["Liegenschaft", "Art", "Zeile(n)", "Gebäude", "Geschoss",
                  "Raum-Nr.", "HK-Nr.", "Aufgenommen von", "Befund", "Empfehlung"])
    for zeile in alle_pruefzeilen:
        pruef.append(zeile)
    for c in pruef[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = kopf_fill
        c.alignment = Alignment(vertical="center")
    pruef.freeze_panes = "A2"
    pruef.auto_filter.ref = pruef.dimensions
    for i, b in enumerate([14, 18, 14, 12, 12, 12, 8, 18, 80, 45], start=1):
        pruef.column_dimensions[get_column_letter(i)].width = b
    for r in pruef.iter_rows(min_row=2):
        r[8].alignment = Alignment(wrap_text=True, vertical="top")
        r[9].alignment = Alignment(wrap_text=True, vertical="top")

    # ── Blatt Rückfragen ──
    # Der Text steht zeilenweise in Spalte A. Absichtlich keine Tabelle: Die
    # Fragen sind Fließtext zum Weiterreichen, nicht zum Filtern.
    #
    # Jede Zelle wird ausdrücklich als Text gekennzeichnet. Sonst deutet Excel
    # alles, was mit "=" beginnt, als Formel — die Trennlinien aus
    # Gleichheitszeichen machten die Mappe so unlesbar ("Problem bei einigen
    # Inhalten erkannt"). Der Typ wird für alle Zeilen erzwungen, nicht nur für
    # die Linien: Auch ein Satz, der mit "-", "+" oder "@" anfängt, träfe es.
    rueck = wb.create_sheet("Rückfragen")
    for n, zeile in enumerate(alle_rueckfragen, start=1):
        if not zeile:
            continue
        c = rueck.cell(row=n, column=1, value=zeile)
        c.data_type = "s"
        c.alignment = Alignment(vertical="top")
    rueck.column_dimensions["A"].width = 95

    wb.save(mappe)
    print(f"\n  -> {mappe}")
    print(f"     Blätter: {', '.join(wb.sheetnames)}")


if __name__ == "__main__":
    main()
