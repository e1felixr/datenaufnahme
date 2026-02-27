Offene Punkte

* Einige Räume haben scheinbar QR-Codes an den Türen. Mach es möglich, dass diese mit der Kamera abfotografiert werden können und versuche dann, den ausgelesenen Code mit der Raumlsite aus Gebäudedaten verschränkt zu bekommen. Das würde bedeuten: Wenn der Barcode erkannt wird, werden die Raumnummer und -bezeichnung sofort in die Eingabemaske übernommen.

* Schau dir gebaeudeplan.pdf an. Ich brauche für jeden Raum die Raumnr. (z.B. "1.54"), die Fläche (hier: 30,46m². Dezimaltrennzeichen Komma statt Punkt), die Nutzung (hier "Büro") und den Barcode (hier "TO9"). Lies alle Daten aus und füge sie in gebaeudedaten.xlsx als zusätzliche Spalten ein.



-------------------------------------------------------------------------------------------

IMMER:
* Bei relevanten Änderungen Version hochzählen
* Immer Zeitstempel "letzte Änderung" aktualisieren, damit ist das letzte änderungsdatum egal welcher datei gemeint.
* Aktuellen Code immer in Github-Repo hochladen.
* Alle erledigten Punkte als "erledigt" markieren, Version in der sie umgesetzt wurden, ergänzen und dann von oben in den folgenden Abschnitt verschieben, aber nicht löschen! Oberhalb der gestrichelten Linie dürften stets nur die offenen Aufgaben stehen.

* ~~Wenn ein Raum gespeichert ist und man auf der Übersichtsseite dann "+" drückt, wird die Vorlage für einen zusätzlichen Raum angezeigt. FÜge oben einen Schalter ein: "neuer HK im Raum" <> "neuer Raum". Die vorausfüllung der Felder ändert sich entsprechend.~~ **erledigt v2.2** (setNewHkMode() in app.js, Mode-Toggle in index.html/style.css)

* ~~Das Autovervollständigen klappt nicht. wenn ich z.B. bei Baulänge "2" eintippe, will ich schon "2000" angezeigt bekommen, weil das in der liste steht.~~ **erledigt v2.2** (setupDatalistFilters() in app.js: Substring-Filter auf Datalist bei Eingabe)

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

* ~~Passe die Dropdownauswahl "Typ" an: Kompakt-HK, Stahlröhren-HK, Stahlglieder-HK, Gussglieder-HK, Konvektoren, Stahlplatte, Sonstige~~ **erledigt v1.7** (CONFIG.typ in app.js)

* ~~Je nach Auswahl des Typs sollen dann nur die folgende Parameter abgefragt werden (also bei Kompakt: Typen 10 bis 33, Bauhöhe und Baulänge). Die anderen sollen ausgegraut oder gar nicht angezeigt werden. Alle anderen Parameter (z.B. Nabenabstand, RL-Verschraubung, ...) sollen für jeden Heizkörper abgefragt werden.~~ **erledigt v1.7** (updateTypFields() in app.js: Subtyp, Röhren/Glieder, Baulänge/Bauhöhe je nach Typ ein-/ausgeblendet)

* ~~Zusätzliche Abfragen:~~
    ~~- Entlüftung vorhanden?~~
    ~~- Entleerung vorhanden?~~
    ~~- Art Thermostatkopf: Auswahlmöglichkeit: "nur auf/zu", "analog", "digital", "Behörde"~~
    **erledigt v1.7** (Toggle-Buttons für Entlüftung/Entleerung + Dropdown artThermostatkopf in index.html/app.js)

* ~~Der Zeitstempel "letzte Änderung" muss korrekt sein, darf nicht erfunden sein und nicht in der Zukunft liegen!!~~ **erledigt v1.8** (APP_BUILD_DATE wird bei jeder Änderung manuell aktualisiert)

* ~~Ein Upload der erhobenen Daten in die Guthub-Repo erfordert je Gerät einen Zugangstoken, richtig? Ich will Verwaltugnsaufwand vermeiden. Implementiere einen Button "Daten versenden"...~~ **erledigt v1.7** (sendData() mit Web Share API + mailto-Fallback, Empfänger-Checkboxen im Modal)

* ~~Foto-Benennung: [Geschoss]_[Raumnr]_HK[Nr].jpg statt [Geschoss]_[Raumnr]_HK[Nr]_1.jpg~~ **erledigt v1.7** (fotoFilename() in export.js: erstes Foto ohne Suffix, ab 2. Foto _2, _3)

* ~~Nutzung per Chrome, Edge oder Firefox. Optimiere App auf diese Browser.~~ **erledigt v1.7** (Standard-Webtechnologien, PWA-Manifest, responsive CSS)

* ~~Mach die "Ja"/"Nein"-Buttons nicht so riesig! "J" und "N" reicht!~~ **erledigt v1.8** (Toggle-Buttons auf J/N, 40px breit, reduzierte Abstände)

* ~~Versenden: Anhang muss auch wirklich angehängt, nicht nur im mailtext erwähnt werden!~~ **erledigt v1.8** (Web Share API sendet ZIP als echten Anhang; Fallback: ZIP-Download + Hinweis)

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
