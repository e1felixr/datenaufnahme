# E1 Begehung

Progressive Web App (PWA) zur mobilen Erfassung von Heizkörpern und Beleuchtung bei Gebäudebegehungen. Läuft komplett im Browser, funktioniert offline und kann auf dem Smartphone wie eine native App installiert werden.

**App starten:** [https://e1felixr.github.io/datenaufnahme/](https://e1felixr.github.io/datenaufnahme/)

**aktuelle Version:** v3.18.10 · **Letzte Änderung:** 31.03.2026 13:54

### Muss ich neu installieren?

Die meisten Updates (Code, Styles, Funktionen) werden **automatisch** geladen, sobald das Gerät online ist. Manche Änderungen betreffen aber das App-Manifest (z.B. Orientierung, Icons, App-Name) – diese greifen erst nach einer **Neuinstallation**.

**Mindestversion für aktuelle Manifest-Änderungen: v3.15.3**

| Deine Version auf dem Gerät | Was tun? |
|------------------------------|----------|
| v3.15.3 oder neuer | Nichts – alles aktuell |
| älter als v3.15.3 | App deinstallieren & neu installieren* |

*Daten (Projekte, Einträge) gehen dabei **nicht** verloren.*

> App vom Startbildschirm entfernen → im Browser neu öffnen → erneut installieren

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

**Wichtig:** Beim Cache-Löschen gehen **keine Projektdaten verloren!** Projekte und Einträge werden in der IndexedDB gespeichert, die vom Cache-Löschen nicht betroffen ist.

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

Die Datei `gebaeudedaten.xlsx` im Repository enthält die Vorschlagslisten für das Formular. Vor einer neuen Erfassung muss sie mit den passenden Daten des Objekts befüllt werden. Es werden zwei Formate unterstützt:

**Neues Format (empfohlen):**

| Spalte A | Spalte B | Spalte C | Spalte D |
|----------|----------|----------|----------|
| **Geschoss** | **Raum Nr.** | **Raumbezeichnung** | **Bodenfläche** |
| EG | E415 | WC | 3.06 |
| EG | E416 | Lager | 11.01 |
| OG 1 | 1102 | Büro | 20.5 |

- Geschoss steht nur in der ersten Zeile einer Gruppe (nachfolgende Zeilen können leer sein)
- Bei Raumauswahl wird die Raumbezeichnung automatisch als Vorschlag übernommen

**Altes Format:**

| Spalte A | Spalte B | Spalte C | Spalte D | Spalte E | Spalte F | Spalte G | Spalte H |
|----------|----------|----------|----------|----------|----------|----------|----------|
| **Gebäude** | *(frei)* | **Etage** | *(frei)* | **Raum** | **Fläche** | **Nutzung** | **Barcode** |

- Gebäude und Etage stehen nur in der ersten Zeile einer Gruppe
- Spalten B und D werden ignoriert

**Datei aktualisieren:**
1. `gebaeudedaten.xlsx` bearbeiten (pro Liegenschaft ein Sheet)
2. Änderung committen und pushen
3. Beim nächsten Öffnen der App laden alle Geräte automatisch die aktualisierten Daten

### 2. Erfasser-Name eintragen

Beim ersten Start der App wird der **Erfasser-Name** abgefragt (Pflichtfeld). Dieser wird automatisch bei jedem erfassten Eintrag gespeichert. Der Name kann jederzeit unter Einstellungen geändert werden.

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

## Technischer Aufbau

```
index.html            Haupt-HTML mit allen Screens
js/app.js             Hauptlogik, Navigation, Event-Handling
js/db.js              IndexedDB-Wrapper (Projekte, HK & Beleuchtung)
js/export.js          Export-Funktionen (xlsx, ZIP)
css/style.css         Mobile-first CSS
sw.js                 Service Worker (Offline-Cache)
manifest.json         PWA-Manifest
lib/xlsx.mini.min.js  SheetJS für xlsx-Import/Export
hilfe/hzg/            Hilfe-Bilder Heizung
hilfe/bel/            Hilfe-Bilder Beleuchtung
icons/                PWA-Icons
```

## Hilfe / Probleme

### Was soll ich tun, wenn ich Probleme mit der Bedienung habe?

Laut schreien und fluchen (z.B. *"So eine verdammte Scheiße!"* oder *"Immer dieser App-Scheiß!"* oder *"War ja klar, dass der Dreck wieder nicht funktioniert!"*), das mobile Endgerät wegpacken und wie bisher handschriftlich auf Papier notieren!
