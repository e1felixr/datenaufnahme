Offene Punkte

* ~~Passe die Dropdownauswahl "Typ" an: Kompakt-HK, Stahlröhren-HK, Stahlglieder-HK, Gussglieder-HK, Konvektoren, Stahlplatte, Sonstige~~ **erledigt v1.7** (CONFIG.typ in app.js)

* ~~Je nach Auswahl des Typs sollen dann nur die folgende Parameter abgefragt werden (also bei Kompakt: Typen 10 bis 33, Bauhöhe und Baulänge). Die anderen sollen ausgegraut oder gar nicht angezeigt werden. Alle anderen Parameter (z.B. Nabenabstand, RL-Verschraubung, ...) sollen für jeden Heizkörper abgefragt werden.~~ **erledigt v1.7** (updateTypFields() in app.js: Subtyp, Röhren/Glieder, Baulänge/Bauhöhe je nach Typ ein-/ausgeblendet)

        Kompaktheizkörper (profiliert/Glatt wäre für die Leistungsermittlung irrelevant)
        Typ 10 11 21 22 33 
            Bauhöhe, Baulänge

        Stahlröhrenradiator
            Anzahl Röhren (2/3/4/5/6)
            Anzahl Glieder
            Bauhöhe

        Stahlgliederradiatoren
            Anzahl Röhren (2/3/4/5/6)
            Anzahl Glieder
            Bauhöhe

        Gussgliederradiatoren
            Anzahl Röhren (2/3/4/5/6)
            Anzahl Glieder
            Bauhöhe

        Konvektoren
            Typ 21 22 32 43 54
            Bauhöhe
            Baulänge

        Stahlplatte
            Typ ER EK DR C DK T TK1 TK2 TK3
            Bauhöhe 
            Baulänge

* ~~Zusätzliche Abfragen:~~
    ~~- Entlüftung vorhanden?~~
    ~~- Entleerung vorhanden?~~
    ~~- Art Thermostatkopf: Auswahlmöglichkeit: "nur auf/zu", "analog", "digital", "Behörde"~~
    **erledigt v1.7** (Toggle-Buttons für Entlüftung/Entleerung + Dropdown artThermostatkopf in index.html/app.js)

* Schau dir gebaeudeplan.pdf an. Ich brauche für jeden Raum die Raumnr. (z.B. "1.54"), die Fläche (hier: 30,46m². Dezimaltrennzeichen Komma statt Punkt), die Nutzung (hier "Büro") und den Barcode (hier "TO9"). Lies alle Daten aus und füge sie in gebaeudedaten.xlsx als zusätzliche Spalten ein.

* ~~Der Zeitstempel "letzte Änderung" muss korrekt sein, darf nicht erfunden sein und nicht in der Zukunft liegen!!~~ **erledigt v1.8** (APP_BUILD_DATE wird bei jeder Änderung manuell aktualisiert)

* ~~Ein Upload der erhobenen Daten in die Guthub-Repo erfordert je Gerät einen Zugangstoken, richtig? Ich will Verwaltugnsaufwand vermeiden. Implementiere einen Button "Daten versenden", der die xlsx samt der (nicht zu stark komprimierten) Bilder an folgende Adressen verschickt felix.rundel@e1-energie.com ; patrick.dimler@e1-energie.com ; [Platzhalter] verschickt. in "[Platzhalter]" soll eine weitere Adresse eingegeben werden. Jede Adresse soll eine Checkbox erhalten. Nur Versand an diese Adresse, wenn box gesetzt (default alle aus). Genutzt werden kann die Standard-eMail-App auf dem Endgerät.~~ **erledigt v1.7** (sendData() mit Web Share API + mailto-Fallback, Empfänger-Checkboxen im Modal)
~~Betreff der Mail: "HK-Aufnahme: [Projektbezeichnung]", zip als Anhang.~~

* ~~Foto-Benennung: [Geschoss]_[Raumnr]_HK[Nr].jpg statt [Geschoss]_[Raumnr]_HK[Nr]_1.jpg~~ **erledigt v1.7** (fotoFilename() in export.js: erstes Foto ohne Suffix, ab 2. Foto _2, _3)

* ~~Nutzung per Chrome, Edge oder Firefox. Optimiere App auf diese Browser.~~ **erledigt v1.7** (Standard-Webtechnologien, PWA-Manifest, responsive CSS)

* ~~Mach die "Ja"/"Nein"-Buttons nicht so riesig! "J" und "N" reicht! Achte generell auf Kompaktheit. Es braucht keine unnötig breiten Eingabefelder, mach dann lieber mehrere nebeneinander. Denk an den Nutzer, der beim Abgehen des Gebäudes nicht doomscrollen will.~~ **erledigt v1.8** (Toggle-Buttons auf J/N, 40px breit, reduzierte Abstände)

* ~~Versenden: Anhang muss auch wirklich angehängt, nicht nur im mailtext erwähnt werden!~~ **erledigt v1.8** (Web Share API sendet ZIP als echten Anhang; Fallback: ZIP-Download + Hinweis zum manuellen Anhängen)


-------------------------------------------------------------------------------------------
IMMER:
* Bei relevanten Änderungen Version hochzählen
* Immer Zeitstempel "letzte Änderung" aktualisieren.
* Aktuellen Code immer in Github-Repo hochladen.
* Alle erledigten Punkte als "erledigt" markieren, Version in der sie umgesetzt wurden, ergänzen und dann in den folgenden Abschnitt verschieben, aber nicht löschen1

* ~~Ich möchte eine kleine "App" bauen, mit der die Aufnahme von Heizkörpern und sämtlicher relevanter Eigenschaften erleichtert werden soll.~~ **erledigt** (PWA erstellt)
* ~~In der xlsx siehst du unter "Tabelle", welche Daten je Heizkörper erfasst werden sollen. Unter Grundlagen sind diverse Auswahloptionen für einige Spalten enthalten.~~ **erledigt** (alle Felder und Dropdowns aus Vorlage übernommen)
* ~~Man geht also durch ein Gebäude, hat einen Grundrissplan dabei und trägt in jedem Raum jeden Heizkörper mitsamt aller relevanten Daten ein.~~ **erledigt** (Erfassungsformular mit Smart-Defaults)
* ~~Es soll keine kommerzielle App werden, sondern für sozusagen für den Privatgebrauch.~~ **erledigt**
* ~~Um die Erfassung zu erleichtern, wäre das Eintragen der Daten per Tablet oder Smartphone sinnvoll. Office-Anwendungen laufen auf diesen GEräten nicht oder schlecht, sodass xlsx keine Option ist.~~ **erledigt** (Mobile-first PWA, touch-optimiert)
* ~~Ich stelle mir eine GUI vor, die offline arbeitet. Bedenke, dass in Gebäuden (v.a. Keller) oftmals kein Mobilfunkempfang herrscht.~~ **erledigt** (Service Worker + IndexedDB, voll offline-fähig)
* ~~Geh davon aus, dass Android >11 installiert ist. Andere OS kannst du ignorieren.~~ **erledigt** (PWA funktioniert auf Android Chrome)
* ~~Ich gehe davon aus, dass es dazu eine Art Datenbank braucht.~~ **erledigt** (IndexedDB)
* ~~Falls möglich, wäre das Hinzufügen von bis zu 3 Fotos je Heizkörper schön.~~ **erledigt** (3 Foto-Slots mit Kamera + Komprimierung)
* ~~Mache die Schriftgrößen kleiner~~ **erledigt** (Basis von 16px auf 13px reduziert, alle Elemente proportional kleiner)
* ~~Wenn ich zwei Fotos mache, speichere und danach als xlsx exportiere, hat die Datei nur wenige kB. Dort können die Fotos also nicht enthalten sein. Das muss anders funktionieren. Du kannst die Bilder auch in einem "Schwesterordner" ablegen, entsprechend umbenennen (z.b. \[Etage]\_\[Raumnr.]\_\[HK-Nr.] und in der Excel nur verlinken.~~ **erledigt** (Export als ZIP: xlsx + Fotos-Ordner mit Benennung [Geschoss]_[Raumnr]_HK[Nr]_1.jpg, Dateinamen in xlsx-Spalten verlinkt)








