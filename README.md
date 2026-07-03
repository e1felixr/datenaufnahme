# E1 Begehung

Progressive Web App (PWA) zur mobilen Erfassung von Heizkörpern und Beleuchtung bei Gebäudebegehungen. Läuft komplett im Browser, funktioniert offline und kann auf dem Smartphone wie eine native App installiert werden.

**App starten:** [https://e1felixr.github.io/datenaufnahme/](https://e1felixr.github.io/datenaufnahme/)

**aktuelle Version:** v4.11.3 · **Letzte Änderung:** 03.07.2026 13:01

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

**Eine Raumliste ist keine Pflicht:** Es kann jederzeit eine **freie Liegenschaft** angelegt werden — einfach beim Projekt-Anlegen einen beliebigen Namen eintippen (z.B. "Grundschule Musterstadt") und loslegen. Gebäude, Geschoss und Raum-Nr. werden dann von Hand eingetragen; die App merkt sich die Eingaben und schlägt sie beim nächsten Raum wieder vor. Nur die **automatische Vervollständigung aus einem hinterlegten Raumbuch** entfällt.

Wer die Raum-Vorschläge nutzen möchte, bereitet die Erfassung so vor:

### 1. Raumliste hinterlegen lassen

Wer für eine Liegenschaft die Raum-Vorschläge nutzen möchte, schickt das Raumbuch (Excel-Datei, z.B. vom Auftraggeber) einfach an **Felix Rundel** — er pflegt es zentral ein. Beim nächsten Öffnen der App laden alle Geräte die neue Raumliste automatisch, es ist nichts weiter zu tun.

### 2. Erfasser-Name eintragen

Beim ersten Start der App wird der **Erfasser-Name** abgefragt (Pflichtfeld). Dieser wird automatisch bei jedem erfassten Eintrag gespeichert. Der Name kann jederzeit unter Einstellungen geändert werden.

### 3. Projekt anlegen

In der App auf **"+"** tippen und einen Projektnamen vergeben (z.B. "Musterstraße 12" oder "Liegenschaft Nord"). Erfassungsart wählen: **Heizkörper** (voreingestellt), **Beleuchtung** oder **Beides**. Die Gebäudedaten aus der zentralen xlsx-Datei stehen danach automatisch als Autovervollständigung zur Verfügung.

### 4. Erfassung starten

Im Projekt auf **"+"** tippen, um den ersten Eintrag anzulegen. Bei der Erfassungsart "Beides" liegen Heizkörper und Leuchten im selben Projekt — deshalb fragt die App bei jedem neuen Eintrag kurz, welches von beiden erfasst werden soll. Die Felder Gebäude, Geschoss und Raum-Nr. bieten Autovervollständigung aus den Gebäudedaten.

### 5. Erfassung beenden & Daten versenden

Am Ende der Begehung in der Eintragsliste auf **"Daten versenden"** tippen und die Empfänger ankreuzen. Die App erstellt eine ZIP-Datei (Excel-Tabelle + alle Fotos) und lädt sie herunter; gleichzeitig öffnet sich das Mailprogramm mit Betreff und Empfängern — die **ZIP-Datei bitte manuell anhängen** und abschicken. Die Fotos werden erst beim Versand komprimiert; auf dem Gerät bleibt alles erhalten, bis es unter Einstellungen bewusst gelöscht wird.

### Checkliste vor der Begehung

- [ ] Falls Raum-Vorschläge gewünscht: Raumbuch an Felix geschickt und eingepflegt
- [ ] App auf allen beteiligten Geräten installiert (siehe [Installation](#installation-auf-dem-smartphone))
- [ ] App einmal online öffnen, damit die aktuellen Gebäudedaten geladen werden
- [ ] Erfasser-Name auf jedem Gerät eingetragen
- [ ] Projekt in der App angelegt

## Hilfe / Probleme

### Was soll ich tun, wenn ich Probleme mit der Bedienung habe?

Laut schreien und fluchen (z.B. *"So eine verdammte Scheiße!"* oder *"Immer dieser App-Scheiß!"* oder *"War ja klar, dass der Dreck wieder nicht funktioniert!"*), das mobile Endgerät wegpacken und wie bisher handschriftlich auf Papier notieren!
