Oberhalb der gepunkteten Linie dürften stets nur die offenen Aufgaben stehen!!
Offene Punkte:

* Die Hilfe-Fotos sollen mit den Fingern zoombar sein!

* Funktionen export csv und export xlsx können entfallen



………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………

IMMER:
* Bei relevanten Änderungen Version hochzählen
* Immer Zeitstempel "letzte Änderung" aktualisieren, damit ist das letzte änderungsdatum egal welcher datei gemeint.
* Aktuellen Code immer in Github-Repo hochladen.
* Alle erledigten Punkte als "erledigt" markieren, Version in der sie umgesetzt wurden, ergänzen und dann von oben in den folgenden Abschnitt verschieben, aber nicht löschen! Oberhalb der gestrichelten Linie dürften stets nur die offenen Aufgaben stehen.

---

### v2.11

* ~~Es gibt Pläne, die sehr gut erkannt werden (z.B. der erste) und andere, die sehr schlecht erkannt werden. Woran liegt das?~~ **erledigt v2.11** (OCR-Verbesserungen in parse_gebaeudeplan.py: --debug Flag mit annotiertem Debug-Bild, Bild-Vorverarbeitung mit Kontrast/Schärfe, Qualitätsreport pro Plan, Bounding-Box-Mitte statt Ecke, größere Kachelüberlappung 300px, Deduplizierungsradius 60px, adaptive Zuordnung bei <50% Erkennungsrate)

* ~~Wenn ich ein Foto hinzufüge, wird zunächst eine Downloadabfrage eingeblendet. Beim Zweiten Bild nervt im oberen Bereich die Downloadanzeige. Kann das nicht im Hintergrund laufen? Fotos sollen erst beim Versenden komprimiert und gezippt werden.~~ **erledigt v2.11** (capture="environment" aus File-Input entfernt → kein Download-Dialog mehr; getUserMedia mit höherer Auflösung 4096px + bessere Fehlerbehandlung; Fotos werden in hoher Qualität in IndexedDB gespeichert, max 2560px/3MB; Komprimierung auf 800KB erst beim Export/Versenden via compressForExport())

### v2.10

* ~~Nicht "Heizkörper" soll den Info-Button haben, sondern "Heizkörper-Typ" (statt "Typ")~~ **erledigt v2.10** (Label "Typ" → "Heizkörper-Typ" mit ?-Button, Section-Title ohne Button)

* ~~Bei Dropdown: defaultwert: "Bitte wählen"~~ **erledigt v2.10** (fillSelect() gibt einheitlich "Bitte wählen" aus)

* ~~Bei Einbausituation: Gleiche Checkboxen wie z.B. Hahnblock. Es können auch mehrere Einbausituationen zutreffen.~~ **erledigt v2.10** (Einbau-Checkboxen in gleicher checkbox-grid wie Hahnblock, gleicher Stil)

* ~~DN Ventil: Nicht Dropdown, sondern freies Eingabefeld mit den Vorschlägen, die bisher in der Liste standen. Es müssen aber auch freie Einträge möglich sein.~~ **erledigt v2.10** (select → input+datalist mit DN10/15/20/25 als Vorschläge)

* ~~Ich will die Hauptkamera nutzen, NIE die Selfie-Cam. Wenn ich das Foto beim Tablet speichern möchte, kommt eine Meldung dass angeblich zu wenig Speicherplatz zur Verfügung steht. Danach sind die Foto-Buttons weg.~~ **erledigt v2.10** (getUserMedia mit facingMode: environment, Fallback auf input capture; Fehlerbehandlung in compressImage mit img.onerror/reader.onerror + showToast + renderPhotoSlots)

### v2.9

* ~~Heizkörper als Standard definiert: Maße sollen nicht übernommen werden, nur Typ, ggf. Subtyp und Einbausituation. Die Maße werden sich ja in jedem Raum ändern. Außerdem sollen default nur 2 Plätze für Fotos angezeigt werden und als drittes das "+"-Symbol. Außerdem ist immer noch die Selfie-Cam aktiv, es muss immer die Hauptkamera angewählt werden!~~ **erledigt v2.9** (Maße nicht übernommen, 2 Foto-Slots default, Hauptkamera via facingMode: environment)

* ~~Wenn ich ein Foto hinzufüge, wird zunächst eine Downloadabfrage eingeblendet. Beides stört.~~ **teilweise erledigt v2.9, vollständig v2.11** (Auto-Download deaktiviert; ab v2.11: capture-Attribut entfernt, Komprimierung beim Export)

* ~~Mach die Einbausituation nicht mehr mit Dropdown, sondern mit Checkboxen, weil auch Kombinationen vorkommen können. Es soll dann "besondere Einbausituation?" heißen und die Optionen "hinter Verkleidung", "unter Brüstung/Fensterbank", "hinter Möbeln", "Sonstige -> Foto!" geben. Außerdem Hilfesymbol und einbausituation.jpg einbinden.~~ **erledigt v2.9** (Checkboxen statt Dropdown, Hilfe-Bild eingebunden)

* ~~Bei Thermostatköpfen die Optionen "Fernversteller" und "fehlt" und "Sonstiges -> Foto!" anbieten und thermostatkoepfe.jpg hinter ?-Symbol einbinden.~~ **erledigt v2.9** (Optionen + Hilfe-Bild im ?-Modal)

* ~~Unterscheidung "Winkeleck li/re" kann entfallen. "Winkeleck" reicht.~~ **erledigt v2.9** (Winkeleck ohne li./re.)

* ~~Bei "Neuer Heizkörper" reicht die Nennung ganz oben in der blauen Zeile. Im Eingabebereich muss das dann nicht nochmal stehen.~~ **erledigt v2.9** (Titel nur noch in Header-Leiste)

* ~~Wenn erst eine hinterlegte Raumnummer eingegeben wird und dann eine andere, nicht hinterlegte, dann muss die Raumbezeichnung auch wieder entfernt werden aus dem Nachbarfeld.~~ **erledigt v2.9** (Bezeichnung wird immer überschrieben/geleert)

* ~~Verschiebe Hahnblock, Entlüftung, RL-Verschraubung, voreinstellbar, Entleerung nach Einbau/Sonstiges~~ **erledigt v2.9** (nach Einbau/Sonstiges verschoben, mit Hilfe-Bildern)

* ~~Mache alle Hilfe-Symbole einen Deut kleiner~~ **erledigt v2.9** (Hilfe-Buttons verkleinert)

* ~~Es gibt Pläne, die sehr gut erkannt werden und andere, die sehr schlecht erkannt werden. Nach Durchlauf des Parsens soll Shell außerdem geöffnet bleiben.~~ **teilweise erledigt v2.9, vollständig v2.11** (Shell bleibt offen via input(); ab v2.11: OCR-Verbesserungen mit Debug-Modus, Vorverarbeitung, adaptiver Zuordnung)

### v2.3

* ~~Wir müssen noch etwas Hilfestellung bieten. Es gibt ja eine Vielzahl an verschiendenen Heizkörpertypen oder Ventiltypen. Dazu möchte ich an relevanten Stellen kleine "Hilfe"- oder "Info"- oder "?"-Buttons haben, bei deren Klick sich Bilddateien öffnen. Diese habe ich im Ordner /hilfe abgelegt: ventiltypen.png und hk-typen.png und hilfe_kompakt.jpg~~ **erledigt v2.3** (btn-help-inline "?"-Buttons an Section-Titles Heizkörper/Ventil/Einbau, openHelpImage()-Modal in app.js, Bilder im SW-Cache)

* ~~Eine Strangzuordnung muss möglich sein (Eingabefeld: "Strang:"). Freie Eingabe ermöglichen.~~ **erledigt v2.3** (f-strang Freitext-Feld in Einbau/Sonstiges, in db.js/app.js/export.js, wird als Standard übernommen)

### v2.2

* ~~Wenn ein Raum gespeichert ist und man auf der Übersichtsseite dann "+" drückt, wird die Vorlage für einen zusätzlichen Raum angezeigt. FÜge oben einen Schalter ein: "neuer HK im Raum" <> "neuer Raum". Die vorausfüllung der Felder ändert sich entsprechend.~~ **erledigt v2.2** (setNewHkMode() in app.js, Mode-Toggle in index.html/style.css)

* ~~Das Autovervollständigen klappt nicht. wenn ich z.B. bei Baulänge "2" eintippe, will ich schon "2000" angezeigt bekommen, weil das in der liste steht.~~ **erledigt v2.2** (setupDatalistFilters() in app.js: Substring-Filter auf Datalist bei Eingabe)

### v2.1

* ~~die github-Readme soll auch in der App angezeigt werden. links neben dem einstellungen-rädchen~~ **erledigt v2.1** (openHelp()/fetchReadme()/renderReadme() in app.js, ℹ-Button im Header, Markdown-Renderer)

* ~~In der Raumweisen Übersicht. Nicht "R1.54", sondern "Raum 1.54". Es muss nicht bei jedem Heizkörper des Raumes die Art dabeistehen.~~ **erledigt v2.1** (renderHkList(): "Raum X", Typ einmal pro Raumkarte)

* ~~Füge einen weiteren Button "+Raum" hinzu. Mit diesem wird der aktuelle heizkörper gespeichert und sofort ein neuer HK in einem neuen Raum angelegt. Man erspart sich damit "Speichern", "zurück", "+" drücken.~~ **erledigt v2.1** (saveAndNextRoom() in app.js, Button in index.html)

* ~~Speichere bei jedem Heizkörper den Zeitstempel, wann der Eintrag angelegt wurde.~~ **erledigt v2.1** (erstelltAm in db.js und export.js)

* ~~Beim Umbenennen der Fotos sollte die Raumnummer nach Möglichkeit komplett korrekt übernommen werden. Viele Räume haben einen Punkt oder einen Bindestrich in der Bezeichnung, z.B. "1.54" oder "1-003".~~ **erledigt v2.1** (sanitizeFilename() in export.js: nur Pfad-Sonderzeichen entfernt, . und - erlaubt)

* ~~Beim Export muss sichergestellt werden, dass die Bilder nicht zu brutal komprimiert werden. Min-Größe sollte bei ca. 0,5 MB liegen.~~ **erledigt v2.1** (compressImage(): zweistufige Qualität 0.92/0.97, maxW 2560px)

* ~~Anstatt "J"/"N"-Buttons: Checkboxen. Bei allen vier Optionen ("Hahnblock", .... , "Entleerung") jeweils noch ein "vorhanden?" mit anhängen, damit eindeutig wird, was die checkbox aussagt.~~ **erledigt v2.1** (.checkbox-grid mit .checkbox-row in index.html + style.css)

* ~~Neuer Abfragewert: "Ventil voreinstellbar"? mit Checkbox (default nein). Wenn Checkbox aktiv, dann soll der eingestellte Wert einzugeben sein.~~ **erledigt v2.1** (f-ventilVoreinstellbar + group-ventilWert in index.html/app.js)

* ~~Folgende Parameter sollen vom unmittelbar vorher eingetragenen Heizkörper default übernommen werden: Art Thermostatkopf, Einbausituation, Ventil voreinstellbar~~ **erledigt v2.1** (STANDARD_FIELDS in app.js erweitert)

* ~~Bauhöhen als Autocomplete mit typabhängigen Optionen; Nabenabstand↔Bauhöhe Verknüpfung für Guss-/Stahlglieder~~ **erledigt v2.1** (CONFIG.bauhoeheXxx, CONFIG.gussNaBA/gussBANA etc., onBauhoeheChange()/onNabenabstandChange(), text+datalist statt select)

### v1.8

* ~~Der Zeitstempel "letzte Änderung" muss korrekt sein, darf nicht erfunden sein und nicht in der Zukunft liegen!!~~ **erledigt v1.8** (APP_BUILD_DATE wird bei jeder Änderung manuell aktualisiert)

* ~~Mach die "Ja"/"Nein"-Buttons nicht so riesig! "J" und "N" reicht!~~ **erledigt v1.8** (Toggle-Buttons auf J/N, 40px breit, reduzierte Abstände)

* ~~Versenden: Anhang muss auch wirklich angehängt, nicht nur im mailtext erwähnt werden!~~ **erledigt v1.8** (Web Share API sendet ZIP als echten Anhang; Fallback: ZIP-Download + Hinweis)

### v1.7

* ~~Passe die Dropdownauswahl "Typ" an: Kompakt-HK, Stahlröhren-HK, Stahlglieder-HK, Gussglieder-HK, Konvektoren, Stahlplatte, Sonstige~~ **erledigt v1.7** (CONFIG.typ in app.js)

* ~~Je nach Auswahl des Typs sollen dann nur die folgende Parameter abgefragt werden (also bei Kompakt: Typen 10 bis 33, Bauhöhe und Baulänge). Die anderen sollen ausgegraut oder gar nicht angezeigt werden. Alle anderen Parameter (z.B. Nabenabstand, RL-Verschraubung, ...) sollen für jeden Heizkörper abgefragt werden.~~ **erledigt v1.7** (updateTypFields() in app.js: Subtyp, Röhren/Glieder, Baulänge/Bauhöhe je nach Typ ein-/ausgeblendet)

* ~~Zusätzliche Abfragen:~~
    ~~- Entlüftung vorhanden?~~
    ~~- Entleerung vorhanden?~~
    ~~- Art Thermostatkopf: Auswahlmöglichkeit: "nur auf/zu", "analog", "digital", "Behörde"~~
    **erledigt v1.7** (Toggle-Buttons für Entlüftung/Entleerung + Dropdown artThermostatkopf in index.html/app.js)

* ~~Ein Upload der erhobenen Daten in die Guthub-Repo erfordert je Gerät einen Zugangstoken, richtig? Ich will Verwaltugnsaufwand vermeiden. Implementiere einen Button "Daten versenden"...~~ **erledigt v1.7** (sendData() mit Web Share API + mailto-Fallback, Empfänger-Checkboxen im Modal)

* ~~Foto-Benennung: [Geschoss]_[Raumnr]_HK[Nr].jpg statt [Geschoss]_[Raumnr]_HK[Nr]_1.jpg~~ **erledigt v1.7** (fotoFilename() in export.js: erstes Foto ohne Suffix, ab 2. Foto _2, _3)

* ~~Nutzung per Chrome, Edge oder Firefox. Optimiere App auf diese Browser.~~ **erledigt v1.7** (Standard-Webtechnologien, PWA-Manifest, responsive CSS)

### v1.0 (Grundfunktionen)

* ~~Ich möchte eine kleine "App" bauen, mit der die Aufnahme von Heizkörpern und sämtlicher relevanter Eigenschaften erleichtert werden soll.~~ **erledigt** (PWA erstellt)
* ~~In der xlsx siehst du unter "Tabelle", welche Daten je Heizkörper erfasst werden sollen.~~ **erledigt** (alle Felder und Dropdowns aus Vorlage übernommen)
* ~~Man geht also durch ein Gebäude, hat einen Grundrissplan dabei und trägt in jedem Raum jeden Heizkörper mitsamt aller relevanten Daten ein.~~ **erledigt** (Erfassungsformular mit Smart-Defaults)
* ~~Es soll keine kommerzielle App werden, sondern für sozusagen für den Privatgebrauch.~~ **erledigt**
* ~~Um die Erfassung zu erleichtern, wäre das Eintragen der Daten per Tablet oder Smartphone sinnvoll.~~ **erledigt** (Mobile-first PWA, touch-optimiert)
* ~~Ich stelle mir eine GUI vor, die offline arbeitet.~~ **erledigt** (Service Worker + IndexedDB, voll offline-fähig)
* ~~Geh davon aus, dass Android >11 installiert ist.~~ **erledigt** (PWA funktioniert auf Android Chrome)
* ~~Ich gehe davon aus, dass es dazu eine Art Datenbank braucht.~~ **erledigt** (IndexedDB)
* ~~Falls möglich, wäre das Hinzufügen von bis zu 3 Fotos je Heizkörper schön.~~ **erledigt** (3 Foto-Slots mit Kamera + Komprimierung)
* ~~Mache die Schriftgrößen kleiner~~ **erledigt** (Basis von 16px auf 13px reduziert)
* ~~Wenn ich zwei Fotos mache, speichere und danach als xlsx exportiere, hat die Datei nur wenige kB.~~ **erledigt** (Export als ZIP: xlsx + Fotos-Ordner)
