# Datenaufnahme (HK + Beleuchtung)

Progressive Web App (PWA) zur mobilen Erfassung von Heizkörpern und Beleuchtung bei Gebäudebegehungen. Läuft komplett im Browser, funktioniert offline und kann auf dem Smartphone wie eine native App installiert werden.

**App starten:** [https://e1felixr.github.io/datenaufnahme/](https://e1felixr.github.io/datenaufnahme/)

## Installation auf dem Smartphone

Die App-URL im Browser öffnen und dann je nach Browser installieren:

**Chrome (Android) — empfohlen:**
1. Menü (drei Punkte oben rechts) antippen
2. "Zum Startbildschirm hinzufügen" oder "App installieren" wählen
3. Namen bestätigen > "Hinzufügen"

**Edge (Android):**
1. Menü (drei Punkte unten mittig) antippen
2. "Zum Smartphone hinzufügen" wählen
3. "Installieren" bestätigen

**Samsung Internet:**
1. Menü (drei Striche unten rechts) antippen
2. "Seite hinzufügen zu" > "Startbildschirm" wählen
3. Namen bestätigen > "Hinzufügen"

Die App erscheint danach als Icon auf dem Startbildschirm und öffnet sich ohne Browser-Leiste im Vollbildmodus.

## Updates & Versionierung

### Wie bekomme ich die neueste Version?

Die App nutzt eine **Network-first-Strategie**: Solange das Gerät online ist, werden bei jedem Öffnen automatisch die aktuellsten Dateien vom Server geladen. Updates werden **automatisch und sofort** angewendet – es ist kein manuelles Eingreifen nötig.

Die aktuelle Version und das Datum der letzten Änderung werden im Header der App angezeigt.

### Wann muss ich den Cache manuell löschen?

Im Normalfall **nie** - das Update-System erledigt alles automatisch. Nur in diesen Ausnahmefällen ist ein manuelles Eingreifen nötig:

| Problem | Lösung |
|---------|--------|
| App zeigt trotz Internet eine alte Version und kein Update-Banner erscheint | Cache löschen (siehe unten) |
| App startet nicht oder zeigt eine leere Seite | Cache löschen und neu installieren |
| Nach einem fehlgeschlagenen Update hängt die App | Cache löschen |

**Cache löschen (Chrome/Edge/Firefox):**
- Browser > Einstellungen > Datenschutz > Browserdaten löschen > "Bilder und Dateien im Cache" auswählen
- Oder (Android): Lange auf das App-Icon drücken > App-Info > Speicher > Cache leeren

**Wichtig:** Beim Cache-Löschen gehen **keine Projektdaten verloren!** Projekte und Heizkörper werden in der IndexedDB gespeichert, die vom Cache-Löschen nicht betroffen ist.

### Wann muss ich die App neu installieren?

Nur wenn sich die `manifest.json` ändert (z.B. App-Name, Icons, Orientierung). In diesem Fall:
1. App vom Startbildschirm entfernen
2. Seite im Browser neu öffnen
3. Erneut zum Startbildschirm hinzufügen

## Datenspeicherung

| Was | Wo | Überlebt Cache-Löschen? |
|-----|-----|------------------------|
| Projekte, Heizkörper & Beleuchtung | IndexedDB (im Browser) | Ja |
| Gebäudedaten (Import) | localStorage (pro Projekt) | Ja |
| Einstellungen (Erfasser, Schriftgröße) | localStorage | Ja |
| App-Dateien (HTML, CSS, JS) | Service Worker Cache | Nein (wird automatisch neu geladen) |

Alle Nutzerdaten bleiben lokal auf dem Gerät. Es werden keine Daten an einen Server übertragen.

### Daten zurücksetzen

Unter **Einstellungen > "Alle Daten zurücksetzen"** können sämtliche Projekte, Heizkörper, Beleuchtungsdaten und importierte Gebäudedaten unwiderruflich gelöscht werden. Vor dem endgültigen Löschen erfolgt eine doppelte Sicherheitsabfrage.

## Neue Erfassung vorbereiten

Bevor ein neues Gebäude / eine neue Liegenschaft erfasst wird, sind folgende Schritte nötig:

### 1. Gebäudedaten-Datei anlegen

Die Datei `gebaeudedaten.xlsx` im Repository enthält die Vorschlagslisten für das Formular. Vor einer neuen Erfassung muss sie mit den passenden Daten des Objekts befüllt werden:

1. `gebaeudedaten.xlsx` öffnen (direkt im Repo oder lokal bearbeiten)
2. Spalte A: alle **Gebäude** eintragen (z.B. "Haus 1", "Haus Norbert")
3. Spalte C: alle **Etagen** eintragen (z.B. "UG", "EG", "OG 1")
4. Spalte E: alle **Räume** eintragen (z.B. "Raum 1", "Raum 12")
5. Zeile 1 ist die Überschrift und wird übersprungen
6. Datei speichern, committen und pushen

### 2. Erfasser-Name eintragen

Beim ersten Start der App wird der **Erfasser-Name** abgefragt (Pflichtfeld). Dieser wird automatisch bei jedem erfassten Heizkörper gespeichert. Der Name kann jederzeit unter Einstellungen geändert werden.

### 3. Projekt anlegen

In der App auf **"+"** tippen und einen Projektnamen vergeben (z.B. "Musterstraße 12" oder "Liegenschaft Nord"). Erfassungsart wählen: **HK**, **Beleuchtung** oder **Beides**. Die Gebäudedaten aus der zentralen xlsx-Datei stehen danach automatisch als Autovervollständigung zur Verfügung.

### 4. Erfassung starten

Im Projekt auf **"+"** tippen, um den ersten Eintrag anzulegen. Bei "Beides" wird gefragt, ob Heizkörper oder Beleuchtung erfasst werden soll. Die Felder Gebäude, Geschoss und Raum-Nr. bieten Autovervollständigung aus den Gebäudedaten.

### Checkliste vor der Begehung

- [ ] `gebaeudedaten.xlsx` mit den Gebäude-/Etagen-/Raumdaten des Objekts befüllt und gepusht
- [ ] App auf allen beteiligten Geräten installiert (siehe [Installation](#installation-auf-dem-smartphone))
- [ ] App einmal online öffnen, damit die aktuellen Gebäudedaten geladen werden
- [ ] Erfasser-Name auf jedem Gerät eingetragen
- [ ] Projekt in der App angelegt

## Gebäudedaten importieren

Beim Ausfüllen des HK-Formulars werden Vorschlagslisten für Gebäude, Etagen und Räume als Autovervollständigung angeboten. Die Daten stammen aus der Datei `gebaeudedaten.xlsx` im Repository.

### Zentrale Datei im Repository (empfohlen)

Die Datei **`gebaeudedaten.xlsx`** liegt direkt im Repo-Stammverzeichnis. Alle Geräte laden diese Datei beim App-Start automatisch vom Server - es muss nichts manuell auf die einzelnen Geräte kopiert werden.

**Gebäudedaten aktualisieren:**
1. Die Datei `gebaeudedaten.xlsx` im Repository bearbeiten
2. Änderung committen und pushen
3. Beim nächsten Öffnen der App laden alle Geräte automatisch die aktualisierten Daten

### Manueller Import (Fallback)

Über den Button **"Gebäudedaten"** in der Heizkörper-Liste kann alternativ eine xlsx-Datei vom Gerät importiert werden. Dies überschreibt die zentrale Datei lokal.

### Datei-Anforderungen

- **Format:** `.xlsx` (Excel)
- **Dateiname im Repo:** `gebaeudedaten.xlsx` (ohne Umlaute)

### Aufbau der xlsx-Datei

Die Datei muss folgende Spaltenstruktur haben (Zeile 1 = Überschrift, wird übersprungen):

| Spalte A | Spalte B | Spalte C | Spalte D | Spalte E |
|----------|----------|----------|----------|----------|
| **Gebäude** | *(frei)* | **Etage** | *(frei)* | **Raum** |
| Haus 1 | | UG | | Raum 1 |
| Haus 2 | | EG | | Raum 2 |
| Haus Norbert | | OG 1 | | Raum 12 |
| | | OG 2 | | |

- Nur die Spalten **A**, **C** und **E** werden ausgelesen
- Spalten B und D werden ignoriert (können leer sein oder andere Daten enthalten)
- Leere Zellen und Duplikate werden automatisch gefiltert
- Die Listen müssen nicht gleich lang sein (z.B. 3 Gebäude, 5 Etagen, 20 Räume)

### Hinweise

- Die Gebäudedaten gelten **für alle Projekte** gleichermaßen
- Online: Die App holt sich bei jedem Start die aktuelle Version vom Server
- Offline: Die zuletzt geladene Version wird aus dem lokalen Speicher verwendet
- Ein manueller Import über den Button überschreibt die zentrale Datei lokal
- Nach erfolgreichem Import erscheint ein Toast mit der Anzahl der importierten Einträge

## Features

- Projekte anlegen und verwalten (HK, Beleuchtung oder Beides)
- **Heizkörper:** Standort, Typ, Maße, Ventil- und Einbaudaten, Fotos
- **Beleuchtung:** Raumdecke, Installationsart, Leuchtenart, Leuchtmittel mit Smart-Lookup (bidirektional: Typ/Länge/Wattage), Vorschaltgerät (EVG/VVG-Erkennung)
- Raumweise Übersicht: Einträge gruppiert nach Raum
- Fotos direkt über die Kamera aufnehmen (unbegrenzte Anzahl)
- Hilfe-Bilder zu Heizkörpertypen, Ventiltypen etc. direkt im Formular
- Gebäudedaten aus xlsx-Datei importieren (Autovervollständigung, Geschoss-Raum-Filterung)
- Export als ZIP (xlsx + Fotos), Multi-Sheet bei "Beides"
- Daten versenden per Web Share API (ZIP als echter Anhang)
- Offline-fähig
- Optimiert für Chrome und Edge (empfohlen)

## Technischer Aufbau

```
index.html          Haupt-HTML mit allen Screens
app.js              Hauptlogik, Navigation, Event-Handling
db.js               IndexedDB-Wrapper (Projekte, HK & Beleuchtung)
export.js           Export-Funktionen (xlsx, ZIP)
style.css           Mobile-first CSS
sw.js               Service Worker (Offline-Cache)
manifest.json       PWA-Manifest
lib/xlsx.mini.min.js  SheetJS für xlsx-Import/Export
```

## Hilfe / Probleme

### Was soll ich tun, wenn ich Probleme mit der Bedienung habe?

Laut schreien und fluchen (z.B. *"So eine verdammte Scheiße!"* oder *"Immer dieser App-Scheiß!"* oder *"War ja klar, dass der Dreck wieder nicht funktioniert!"*), das mobile Endgerät wegpacken und wie in grauer Vorzeit handschriftlich auf Papier notieren!
