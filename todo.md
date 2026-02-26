Offene Punkte

* die github-Readme soll auch in der App angezeigt werden. links neben dem einstellungen-rädchen

* In der Raumweisen Übersicht. Nicht "R1.54", sondern "Raum 1.54". Es muss nicht bei jedem Heizkörper des Raumes die Art dabeistehen.

* Füge einen weiteren Button "+Raum" hinzu. Mit diesem wird der aktuelle heizkörper gespeichert und sofort ein neuer HK in einem neuen Raum angelegt. Man erspart sich damit "Speichern", "zurück", "+" drücken. Schau nach weiteren verbesserungsmöglichkeiten.

* Speichere bei jedem Heizkörper den Zeitstempel, wann der Eintrag angelegt wurde.

* Beim Umbenennen der Fotos sollte die Raumnummer nach Möglichkeit komplett korrekt übernommen werden. Viele Räume haben einen Punkt oder einen Bindestrich in der Bezeichnung, z.B. "1.54" oder "1-003". Diese sollten doch exakt so in einem Dateinamen übernehmbar sein, solange kein Slash/Backslash etc enthalten ist, oder?

* Beim Export muss sichergestellt werden, dass die Bilder nicht zu brutal komprimiert werden. Min-Größe sollte bei ca. 0,5 MB liegen.

* Einige Räume haben scheinbar QR-Codes an den Türen. Mach es möglich, dass diese mit der Kamera abfotografiert werden können und versuche dann, den ausgelesenen Code mit der Raumlsite aus Gebäudedaten verschränkt zu bekommen. Das würde bedeuten: Wenn der Barcode erkannt wird, werden die Raumnummer und -bezeichnung sofort in die Eingabemaske übernommen.

* Anstatt "J"/"N"-Buttons: Checkboxen. Bei allen vier Optionen ("Hahnblock", .... , "Entleerung") jeweils noch ein "vorhanden?" mit anhängen, damit eindeutig wird, was die checkbox aussagt.

* Neuer Abfragewert: "Ventil voreinstellbar"? mit Checkbox (default nein). Wenn Checkbox aktiv, dann soll der eingestellte Wert einzugeben sein.

* Folgende Parameter sollen vom unmittelbar vorher eingetragenen Heizkörper default übernommen werden, weil sie sich innerhalb eines gebäudes i.d.R. selten ändern: ARt Thermostatkopf, Einbausituation, Ventil voreinstellbar

* Bauhöhen
    Stahlrohrradiatoren: 190,300,350,400,450,500,550,600,750,900,1000,1100,1200,1500,1800,2000,2500,2800
    Kompakt-HK: 200,300,400,500,600,700,800,900,1000
    Gussglieder: 280,430,580,680,980 (entspricht Nabenabstand: 200,350,500,600,900 // wenn einer der beiden Werte ausgefüllt wird, wird der andere automatisch eingetragen)
    Stahlglieder: 300,400,600,1000 (entspricht NA: 200,350,500,900 // siehe oben)
    es müssen in allen Fällen aber auch eigene Einträge möglich sein! Die Optionen sollen nicht als dropdown, sondern via autovervollständigen angeboten werden.

* 

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
* Immer Zeitstempel "letzte Änderung" aktualisieren, damit ist das letzte änderungsdatum egal welcher datei gemeint.
* Aktuellen Code immer in Github-Repo hochladen.
* Alle erledigten Punkte als "erledigt" markieren, Version in der sie umgesetzt wurden, ergänzen und dann von oben in den folgenden Abschnitt verschieben, aber nicht löschen! Oberhalb der gestrichelten Linie dürften stets nur die offenen Aufgaben stehen.

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








