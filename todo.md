Oberhalb der gepunkteten Linie dürfen stets nur die offenen Aufgaben stehen!!

Offene Punkte:

* Banner „Sonstiges → Foto!" anklickbar machen — Tipp aufs Banner öffnet direkt die Kamera (Rückmeldung Max 09.06.2026, bewusst zurückgestellt 02.07.2026)

* Foto-Dateinamen im Export kollidieren — stiller Datenverlust (gefunden 21.09.2026 beim Zusammenführen der Berlin-Rückläufer)
  `fotoFilename()` / `belFotoFilename()` in js/export.js bilden den Namen nur aus Geschoss + Raum-Nr. + HK-Nr.
  Tragen zwei Einträge denselben Schlüssel (gleiche Raum-Nr., gleiche HK-Nr.), landen zwei verschiedene
  Bilder unter demselben Namen im ZIP. Beim normalen Entpacken überschreibt das zweite das erste — ohne
  jede Warnung. In beiden Berlin-Rückläufern je einmal aufgetreten.
  Fix: in buildExportZip() die vergebenen Namen mitführen und bei Kollision durchnummerieren
  (z. B. `_b`, `_c`), die Excel-Referenz derselben Zeile entsprechend setzen.
  Zusätzlich erwägen: beim Speichern eines Eintrags warnen, wenn Raum-Nr. + HK-Nr. schon belegt sind.

* Doppeltes Speichern erzeugt zwei identische Einträge (gefunden 21.09.2026, Rückläufer Leander)
  Zwei Zeilen vollständig deckungsgleich — gleiche Werte, gleiche Bemerkung, gleiches Foto,
  gleiche Erfassungsminute (16.09.2026, 09:32). Deutet auf einen doppelten Tipp auf „Speichern“.
  Fix: Speichern-Button nach dem ersten Tipp bis zum Abschluss sperren.

* Feld „Erfasser“ klebt am Gerät, nicht an der Person (gefunden 21.09.2026)
  Der Name wird einmal im Gerät hinterlegt und wandert unverändert in jeden Export. Werden
  Geräte verliehen, steht in den Daten der Falsche: In der Berliner Aufnahme nahm Max auf
  Davids Gerät auf und Leander auf Stevens — die Spalte „Erfasser“ nennt aber David und Steven.
  Wer später Rückfragen stellt, wendet sich an den Falschen; nur der von Hand ergänzte
  Dateiname des Rückläufers verriet, wer tatsächlich vor Ort war.
  Fix: Beim Anlegen bzw. Öffnen eines Projekts den Erfassernamen abfragen oder bestätigen
  lassen, statt ihn still aus dem Gerät zu übernehmen.



IMMER:

* Bei relevanten Änderungen Version hochzählen
* Immer Zeitstempel "letzte Änderung" aktualisieren, damit ist das letzte Änderungsdatum egal welcher Datei gemeint.
* Readme aktuell halten
* Aktuellen Code immer in Github-Repo hochladen.
* Alle erledigten Punkte als "erledigt" markieren, Version in der sie umgesetzt wurden, ergänzen und dann von oben in changelog.md verschieben!



……………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………

Erledigte Punkte → siehe changelog.md

