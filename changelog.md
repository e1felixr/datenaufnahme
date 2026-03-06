# Changelog

### v3.11

* ~~Sonstiges-Bereich: 2 Spalten statt 3, Erreichbarkeit-Label entfernt, LPH unter Checkbox~~ **erledigt v3.11.5**
* ~~Gebäudedaten-Parser: altes XLSX-Format (Schwedenstraße) zeigt jetzt alle Räume pro Geschoss~~ **erledigt v3.11.4** (lastGeb/lastGes über leere Zeilen merken)
* ~~Eingabefelder kompakter~~ **erledigt v3.11.3** (field-padding 10px→6px, form-group margin 10px→8px)
* ~~alert() durch showInfo()-Modal ersetzt~~ **erledigt v3.11.2** (eigener Info-Dialog ohne Browser-Header "Auf e1felixr.github.io wird Folgendes angezeigt:")
* ~~Steuerung: 5 Checkboxen in einer Zeile~~ **erledigt v3.11.1** (steuerung-grid auf repeat(5, auto))
* ~~Sonstiges: 3-Spalten-Layout~~ **erledigt v3.11.1** (Raumdecke/Erreichbarkeit/LPH in form-row-3, Zustand-Grid auf 3 Spalten, "schlecht erreichbar" mit Label in Kapitaelchen)
* ~~Gluehbirne als eigene Leuchtmittel-Kategorie~~ **erledigt v3.11** (E14: 25/40/60W, E27: 25/40/60/75/100W, eigene Sub-Felder mit Fassung+Wattage)
* ~~Neue Sockeltypen: GU5,3 / GY6,35~~ **erledigt v3.11** (GU5,3 mit 20/35/45/50W, GY6,35 mit 28/40W unter Sonstige)
* ~~MR16 Wattage +45W, GU10 +25W~~ **erledigt v3.11** (MR16: [20,35,45,50], GU10: [25,35,50])
* ~~T9 Ring neu unter Sonstige~~ **erledigt v3.11** (22/32/40W, Sockel G10q)
* ~~SQ28 korrigiert zu SQ~~ **erledigt v3.11** (Wattages [16,28], Sockel GR8)
* ~~Dulux L 80W entfernt~~ **erledigt v3.11** (nur noch bis 55W)
* ~~Fassung auto-setzen bei bekannten Sockeltypen~~ **erledigt v3.11** (MR11→GU4, MR16→GU5,3, GU10→GU10, GY6,35→GY6,35, T5Ring→2GX13, T9Ring→G10q, SQ→GR8; readonly)
* ~~Fassung von Select zu Input+Datalist~~ **erledigt v3.11** (alle gaengigen Sockel als Vorschlaege)
* ~~dulux.png Info-Symbol bei Wendelanzahl~~ **erledigt v3.11** (?-Button oeffnet hilfe/bel/dulux.png)
* ~~montageart.png Info-Symbol bei Montageart~~ **erledigt v3.11** (?-Button oeffnet hilfe/bel/montageart.png)
* ~~"Diese Leuchte als Standard" Feature~~ **erledigt v3.11** (BEL_STANDARD_FIELDS, localStorage bel-standard, analog zu HK-Standard)
* ~~leuchtmittel.txt synchronisiert~~ **erledigt v3.11** (alle DB-Aenderungen uebernommen)

### v3.10

* ~~Wendelanzahl filtert Dulux-Wattage vor~~ **erledigt v3.10** (updateDuluxWattageFilter() filtert Datalist nach Wendel+VSG, Wattage-Feld als Input+Datalist)
* ~~Gebaeude Auto-Advance nach Etage~~ **erledigt v3.10** (f-gebaeude hat list-Attribut, setupAutoAdvance() greift automatisch)
* ~~Montageart + Leuchtenart nach Leuchteninfo verschoben~~ **erledigt v3.10** (Label "Installationsart" umbenannt zu "Montageart", zusammen mit Leuchtenart in Leuchteninfo-Section vor Anz. Reihen)
* ~~"Zustand" umbenannt zu "Sonstiges"~~ **erledigt v3.10** (enthaelt jetzt Raumdecke mit ?-Button, schlecht erreichbar+LPH, Zustand-Checkboxen, Bemerkung)
* ~~Section "Installation" entfernt~~ **erledigt v3.10** (alle Felder in Leuchteninfo bzw. Sonstiges verschoben)

### v3.9

* ~~Installationsart/VSG/Leuchtmittel: Toggle-Buttons durch Eingabefelder mit Datalist-Vorschlaegen ersetzt~~ **erledigt v3.9** (Input+Datalist statt Toggle-Buttons, Auto-Advance bei Auswahl)
* ~~Section-Titel "Raum" vereinheitlicht~~ **erledigt v3.9** (dynamische Klasse section-title-hk/section-title-bel je nach Modul)
* ~~Zwischenueberschrift "Beleuchtung" entfernt~~ **erledigt v3.9**
* ~~Bemerkung: Placeholder "z.B. besondere Lichtfarbe"~~ **erledigt v3.9**
* ~~Steuerung: "defekt" Checkbox hinzugefuegt~~ **erledigt v3.9** (in DB/Formular/Export integriert)
* ~~T5-Laengen korrigiert: 49W = 1449mm~~ **erledigt v3.9** (war faelschlicherweise 1149mm)
* ~~SW.js: gebaeudedaten.xlsx Fallback bei Offline~~ **erledigt v3.9** (fetch().catch() mit Cache-Fallback)
* ~~Meta-Tag mobile-web-app-capable ergaenzt~~ **erledigt v3.9** (Deprecation-Warning behoben)
* ~~Checkbox-Abstaende vereinheitlicht~~ **erledigt v3.9** (14px, box-sizing border-box, einheitliche Gaps)

### v3.8

* ~~Auto-Advance bei Datalist/Select-Auswahl~~ **erledigt v3.8** (setupAutoAdvance() mit Event-Delegation)
* ~~Datalist: Feld leeren bei Fokus fuer erneute Vorschlaege~~ **erledigt v3.8** (focusin/focusout mit _dlPrev)
* ~~Header Version/Zeitstempel persistent~~ **erledigt v3.8** (navigate-Override setzt APP_VERSION+APP_BUILD_DATE)
* ~~Robuster Auto-Update-Mechanismus~~ **erledigt v3.8** (CDN Cache-Buster ?_update=timestamp)
* ~~LPH Komma/Punkt Dezimaleingabe~~ **erledigt v3.8** (inputmode decimal, Komma→Punkt Konvertierung)

### v3.7

* ~~Kompakte Raumliste~~ **erledigt v3.7** (padding/margin reduziert, Chips kompakter)
* ~~Buttons nach Ctrl+Shift+R repariert~~ **erledigt v3.7** (globaler Error-Handler, navigate-Init)

### v3.6

* ~~Baumdarstellung Leuchtmittel-DB~~ **erledigt v3.6** (als Text ausgegeben)
* ~~Checkbox-Ausrichtung~~ **erledigt v3.6** (min-width/min-height, margin:0, span line-height:1.2)
* ~~Steuerung Info-Symbol~~ **erledigt v3.6** (Platzhalter-?-Button mit BWM/dimmbar/DALI/KNX Erklaerung)
* ~~Hilfe-Ordner umstrukturiert~~ **erledigt v3.6** (alle Pfade von hilfe/ auf hilfe/hzg/ bzw. hilfe/bel/ aktualisiert in index.html + sw.js)
* ~~"schlecht erreichbar" von Zustand nach Installation verschoben~~ **erledigt v3.6**
* ~~Fiktive xlsx-Exporte~~ **erledigt v3.6** (beispiel_hk_export.xlsx 50 Zeilen, beispiel_bel_export.xlsx 46 Zeilen)
* ~~Sortierung in Uebersicht~~ **erledigt v3.6** (Dropdown Raumnr/Gebaeude/Etage/Datum, Datum = neuester Eintrag zuerst)

### v3.5

* ~~HQI/HIT als Strahler-Typ unter "Sonstige" mit freier Wattage-Eingabe~~ **erledigt v3.5** (LEUCHTMITTEL_DB.sonstige['HQI/HIT'] mit freeInput-Flag, Wattage als input+datalist)
* ~~AR111 entfernt~~ **erledigt v3.5** (aus LEUCHTMITTEL_DB.sonstige entfernt)
* ~~Fassung-Feld (E14/E27/E40/Sonstige) bei Strahler-Typen~~ **erledigt v3.5** (MR11, MR16, GU10, HQI/HIT zeigen Fassung-Dropdown, Info-Button erklaert LED-Ersatz-Moeglichkeit)
* ~~Beleuchtungssteuerung: BWM, dimmbar, DALI, KNX als Checkboxen~~ **erledigt v3.5** (Steuerung-Section mit 4-spaltigem Grid, in DB/Formular/Export integriert)

### v3.4

* ~~"Standort" -> "Raum", "Rauminfo" -> "Installation", "Leuchten-Anordnung" -> "Leuchteninfo"~~ **erledigt v3.4**
* ~~Zwischenueberschrift "Vorschaltgeraet/Leuchtmittel" entfernt, VSG + Leuchtmittel in eine Zeile~~ **erledigt v3.4** (form-row, VSG mit Erlaeuterung im Info-Button)
* ~~T5/T8 als eigene Kategorien, T12 entfernt (65W unter T8), Spot/SQ28/T5 Ring unter "Sonstige"~~ **erledigt v3.4** (LEUCHTMITTEL_DB umgebaut, Typ-Dropdown entfaellt fuer T5/T8)
* ~~Checkboxen kleiner, Text vertikal zentriert~~ **erledigt v3.4** (20px statt 22px, align-items: center)
* ~~Leuchtenart "Tafelbeleuchtung" ergaenzt~~ **erledigt v3.4**
* ~~Bei naechstem Raum: Defaults vom ersten Eintrag des Raums~~ **erledigt v3.4** (saveBelAndNextRoom nutzt firstInRoom statt aktuellen Eintrag)

### v3.3

* ~~Kompakteres Beleuchtungs-Formular~~ **erledigt v3.3** (Raumdecke + Installationsart in form-row, Leuchten-Anordnung 3 Felder in form-row-3, Labels gekuerzt)
* ~~Zustand-Checkboxen: sichtbare Haken, Mehrfachauswahl, Info-Texte~~ **erledigt v3.3** (Custom CSS-Checkboxen mit Haken-Zeichen, schwarzer Haken bei Gelb-Theme, Info-Buttons bei defekt/beschaedigt/verschmutzt/abgaengig, "beschaedigt (-> Foto!)")
* ~~Leuchtenart "Panel" waehlbar~~ **erledigt v3.3** (Panel als Option im Leuchtenart-Dropdown)

### v3.1

* ~~Geschoss->Raum-Filterung~~ **erledigt v3.1** (parseGebaeudedatenXlsx speichert geschossRaum-Mapping, filterDatalistsForGeschoss() filtert Raum-Datalist bei Geschoss-Auswahl)
* ~~Gruppennr. aus Formular entfernen~~ **erledigt v3.1** (Feld unsichtbar, intern auto-inkrementiert fuer Export-Sortierung, Chip zeigt Leuchtenart statt BEL-Nr.)
* ~~Abschnitt "Rauminfo" mit Raumdecke, Installationsart, Leuchtenart~~ **erledigt v3.1** (neue Section "Rauminfo" im Formular)
* ~~Pull-to-Refresh landet bei "neuer Heizkoerper"~~ **erledigt v3.1** (CSS overscroll-behavior-y: contain verhindert Pull-to-Refresh, sessionStorage speichert aktuellen Screen)
* ~~Zustand: Checkboxen + Mehrfachauswahl + beschaedigt-Info~~ **erledigt v3.1** (Info-Button bei "beschaedigt" mit Alert)
* ~~"schlecht erreichbar (--> Foto)" Checkbox~~ **erledigt v3.1** (neue Checkbox in Zustand-Grid, loest Foto-Hinweis aus)
* ~~Leuchtmittel je Leuchte als Nummernfeld mit Vorschlaegen~~ **erledigt v3.1** (Toggle-Buttons ersetzt durch number-Input + Datalist 1-4)
* ~~Bidirektionales Leuchtmittel Smart-Lookup~~ **erledigt v3.1** (onLinearFieldChange(): Aenderung von Laenge/Wattage aktualisiert die jeweils anderen Felder)
* ~~Vorschaltgeraet vor Leuchtmittelkategorie + EVG-Logik~~ **erledigt v3.1** (LEUCHTMITTEL_DB mit ballast-Flags, EVG filtert T12 raus, Dulux bevorzugt /E-Varianten)
* ~~"bitte Typenschilder fotografieren" entfernen~~ **erledigt v3.1**

### v3.0

* ~~Beleuchtungs-Modul: Aufnahme der Beleuchtung jedes Raumes~~ **erledigt v3.0** (Modulauswahl bei Projekterstellung, neuer IndexedDB Store 'beleuchtung', komplettes Formular)
* ~~GUI-Farbschema: HK in #FF6633, Beleuchtung in #FFCC00, Beides in #FF8C00~~ **erledigt v3.0** (CSS --module-color System, applyModuleTheme())
* ~~Beleuchtungs-Formular komplett~~ **erledigt v3.0** (Raumdecke, Reihen, LM je Leuchte, Installationsart, Leuchtenart, Leuchtmittel, VSG, Zustand, Bemerkung)
* ~~Leuchtmittel Smart-Lookup~~ **erledigt v3.0** (LEUCHTMITTEL_DB + updateLeuchtmittelFields())
* ~~Info-Symbole bei Beleuchtungsfeldern~~ **erledigt v3.0** (VSG-Tipp als Alert)
* ~~Mehrere Beleuchtungsarten pro Raum~~ **erledigt v3.0** (saveBelAndNextGroup())
* ~~Mehrere Lichtreihen pro Raum~~ **erledigt v3.0** (Gruppen-Nr. Auto-Increment)
* ~~Fotos bei Beleuchtung~~ **erledigt v3.0** (eigene Foto-Slots im Bel-Formular)
* ~~Tastatur ueberdeckt Eingabefelder im Querformat~~ **erledigt v3.0** (Header sticky->relative bei Landscape, VisualViewport API)

### v2.12

* ~~Hilfe-Fotos Pinch-to-Zoom~~ **erledigt v2.12** (custom JS Pinch-to-Zoom via touchstart/touchmove, Klick resettet Zoom)
* ~~Export CSV/XLSX Buttons entfernt~~ **erledigt v2.12** (nur noch ZIP-Versand via sendData())

### v2.11

* ~~OCR-Verbesserungen Gebaeudeplaene~~ **erledigt v2.11** (--debug Flag, Bild-Vorverarbeitung, Qualitaetsreport, groessere Kachelueberlappung)
* ~~Foto-Download-Dialog entfernt~~ **erledigt v2.11** (capture-Attribut entfernt, Komprimierung erst beim Export)

### v2.10

* ~~"Heizkoerper-Typ" Label mit ?-Button~~ **erledigt v2.10** (Section-Title ohne Button)
* ~~Dropdown Defaultwert "Bitte waehlen"~~ **erledigt v2.10** (fillSelect() einheitlich)
* ~~Einbausituation als Checkboxen~~ **erledigt v2.10** (gleicher Stil wie Hahnblock)
* ~~DN Ventil als Freitext+Datalist~~ **erledigt v2.10** (select -> input+datalist mit DN10/15/20/25)
* ~~Hauptkamera statt Selfie-Cam~~ **erledigt v2.10** (facingMode: environment, Fallback auf input capture)

### v2.9

* ~~HK-Standard: nur Typ/Subtyp/Einbausituation uebernehmen~~ **erledigt v2.9** (Masse nicht uebernommen, 2 Foto-Slots default)
* ~~Einbausituation Checkboxen + Hilfe-Bild~~ **erledigt v2.9**
* ~~Thermostatkopf: Fernversteller, fehlt, Sonstiges~~ **erledigt v2.9** (Optionen + Hilfe-Bild im ?-Modal)
* ~~Winkeleck ohne li./re.~~ **erledigt v2.9**
* ~~Titel nur in Header~~ **erledigt v2.9**
* ~~Raumbezeichnung bei Raumnr-Wechsel leeren~~ **erledigt v2.9**
* ~~Hahnblock etc. nach Einbau verschoben~~ **erledigt v2.9** (mit Hilfe-Bildern)
* ~~Hilfe-Symbole kleiner~~ **erledigt v2.9**

### v2.3

* ~~Hilfe-Bilder (hk-typen, ventiltypen, hilfe_kompakt)~~ **erledigt v2.3** (btn-help-inline ?-Buttons, openHelpImage()-Modal, Bilder im SW-Cache)
* ~~Strangzuordnung~~ **erledigt v2.3** (f-strang Freitext-Feld, wird als Standard uebernommen)

### v2.2

* ~~Mode-Toggle "neuer HK im Raum" / "neuer Raum"~~ **erledigt v2.2** (setNewHkMode() in app.js)
* ~~Autovervollstaendigen Substring-Filter~~ **erledigt v2.2** (setupDatalistFilters())

### v2.1

* ~~README in App anzeigen~~ **erledigt v2.1** (openHelp()/fetchReadme()/renderReadme(), Info-Button im Header)
* ~~"Raum X" statt "R1.54"~~ **erledigt v2.1** (renderHkList())
* ~~"+Raum" Button~~ **erledigt v2.1** (saveAndNextRoom())
* ~~Zeitstempel je Heizkoerper~~ **erledigt v2.1** (erstelltAm in db.js und export.js)
* ~~Foto-Benennung korrekt~~ **erledigt v2.1** (sanitizeFilename(): . und - erlaubt)
* ~~Bildkompression min 0,5 MB~~ **erledigt v2.1** (zweistufige Qualitaet 0.92/0.97, maxW 2560px)
* ~~Checkboxen statt J/N-Buttons~~ **erledigt v2.1** (.checkbox-grid mit .checkbox-row)
* ~~Ventil voreinstellbar~~ **erledigt v2.1** (f-ventilVoreinstellbar + group-ventilWert)
* ~~Default-Uebernahme Thermostatkopf/Einbau/Voreinstellbar~~ **erledigt v2.1** (STANDARD_FIELDS erweitert)
* ~~Bauhoehen Autocomplete + Nabenabstand-Verknuepfung~~ **erledigt v2.1** (CONFIG.gussNaBA/gussBANA, text+datalist statt select)

### v1.8

* ~~Zeitstempel korrekt~~ **erledigt v1.8** (APP_BUILD_DATE manuell aktualisiert)
* ~~J/N-Buttons kleiner~~ **erledigt v1.8** (Toggle-Buttons J/N, 40px breit)
* ~~Versenden: Anhang echt anhaengen~~ **erledigt v1.8** (Web Share API sendet ZIP als Anhang; Fallback: ZIP-Download)

### v1.7

* ~~Dropdown-Auswahl Typ anpassen~~ **erledigt v1.7** (CONFIG.typ in app.js)
* ~~Typabhaengige Felder ein-/ausblenden~~ **erledigt v1.7** (updateTypFields())
* ~~Entlueftung/Entleerung/Thermostatkopf~~ **erledigt v1.7** (Toggle-Buttons + Dropdown)
* ~~Daten versenden~~ **erledigt v1.7** (sendData() mit Web Share API + mailto-Fallback)
* ~~Foto-Benennung~~ **erledigt v1.7** (erstes Foto ohne Suffix, ab 2. Foto _2, _3)
* ~~Browser-Optimierung Chrome/Edge/Firefox~~ **erledigt v1.7** (Standard-Webtechnologien, PWA-Manifest)

### v1.0

* ~~PWA erstellt~~ **erledigt v1.0** (Heizkoerper-Aufnahme, Mobile-first, offline-faehig via Service Worker + IndexedDB)
* ~~Felder aus xlsx-Vorlage uebernommen~~ **erledigt v1.0**
* ~~Erfassungsformular mit Smart-Defaults~~ **erledigt v1.0**
* ~~3 Foto-Slots mit Kamera + Komprimierung~~ **erledigt v1.0**
* ~~Schriftgroesse reduziert~~ **erledigt v1.0** (16px -> 13px)
* ~~Export als ZIP~~ **erledigt v1.0** (xlsx + Fotos-Ordner)
