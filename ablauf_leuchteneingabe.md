# Ablaufdiagramm: Leuchteneingabe — Feldsteuerung

```
┌─────────────────────────────────────────────────────────┐
│  LEUCHTENINFO (immer sichtbar)                          │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Montageart    │  │ Leuchtenart  │  │ LM je Leuchte│  │
│  └───────┬───────┘  └──────────────┘  └──────────────┘  │
│          │                                               │
│          ▼                                               │
│   ┌──────────────┐                                       │
│   │ = "Pendel" ? │──ja──▶ Pendellänge (cm) einblenden   │
│   └──────┬───────┘                                       │
│          │nein                                            │
│          ▼                                               │
│   Pendellänge ausblenden                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  LEUCHTMITTEL                                            │
│  ┌────────────────────┐  ┌────────────────┐              │
│  │ Vorschaltgerät     │  │ LM-Kategorie   │              │
│  │ (KVG/VVG / EVG)    │  │ (Datalist)     │              │
│  └────────────────────┘  └───────┬────────┘              │
│                                  │                       │
│          ┌───────────────────────┼───────────────────┐   │
│          ▼                       ▼                   ▼   │
│                                                          │
│  ╔═══════════════════════════════════════════════════╗    │
│  ║  Kategorie = "T5" oder "T8"                      ║    │
│  ║  → lm-linear-fields einblenden                   ║    │
│  ║  ┌──────────────┐    ┌──────────────┐            ║    │
│  ║  │ Länge (mm)   │◄──▶│ Wattage (W)  │            ║    │
│  ║  │ (Datalist)   │    │ (Datalist)   │            ║    │
│  ║  └──────────────┘    └──────────────┘            ║    │
│  ║  Bidirektionaler Smart-Lookup:                   ║    │
│  ║  - Länge eingeben → passende Wattages filtern    ║    │
│  ║  - Wattage eingeben → passende Längen filtern    ║    │
│  ║  - Eindeutig → anderes Feld auto-ausfüllen      ║    │
│  ║  - T8+EVG: vvgOnly-Einträge rausfiltern          ║    │
│  ╚═══════════════════════════════════════════════════╝    │
│                                                          │
│  ╔═══════════════════════════════════════════════════╗    │
│  ║  Kategorie = "Dulux"                             ║    │
│  ║  → lm-dulux-fields einblenden                    ║    │
│  ║  ┌──────────────┐    ┌──────────────┐            ║    │
│  ║  │ Wendelanzahl │───▶│ Wattage (W)  │            ║    │
│  ║  │ (S/D/T)  [?] │    │ (Datalist)   │            ║    │
│  ║  └──────────────┘    └──────┬───────┘            ║    │
│  ║                             │                    ║    │
│  ║                             ▼                    ║    │
│  ║                      ┌──────────────┐            ║    │
│  ║                      │ Typ (auto)   │            ║    │
│  ║                      │ z.B. Dulux   │            ║    │
│  ║                      │ D/E 26W      │            ║    │
│  ║                      └──────────────┘            ║    │
│  ║  Filter-Logik:                                   ║    │
│  ║  - Wendel+VSG → Wattage-Datalist filtern         ║    │
│  ║  - Wendel+Wattage → Typ auto-ermitteln           ║    │
│  ║  - EVG → bevorzugt /E-Varianten                  ║    │
│  ╚═══════════════════════════════════════════════════╝    │
│                                                          │
│  ╔═══════════════════════════════════════════════════╗    │
│  ║  Kategorie = "Sonstige"                          ║    │
│  ║  → lm-sonstige-fields einblenden                 ║    │
│  ║  ┌──────────────────┐                            ║    │
│  ║  │ Typ (Select)     │                            ║    │
│  ║  │ T5 Ring/T9 Ring/ │                            ║    │
│  ║  │ MR11/MR16/GU10/  │                            ║    │
│  ║  │ GU5,3/GY6,35/    │                            ║    │
│  ║  │ SQ/HQI-HIT       │                            ║    │
│  ║  └────────┬─────────┘                            ║    │
│  ║           │                                      ║    │
│  ║           ▼                                      ║    │
│  ║  ┌──────────────┐    ┌──────────────┐            ║    │
│  ║  │ Wattage (W)  │    │ Fassung      │            ║    │
│  ║  │ (Datalist)   │    │ (Input)      │            ║    │
│  ║  └──────────────┘    └──────────────┘            ║    │
│  ║  Fassung-Logik:                                  ║    │
│  ║  - MR11→GU4, MR16→GU5,3, GU10→GU10 (readonly)  ║    │
│  ║  - GU5,3→GU5,3, GY6,35→GY6,35 (readonly)       ║    │
│  ║  - T5 Ring→2GX13, T9 Ring→G10q, SQ→GR8 (ro)     ║    │
│  ║  - HQI/HIT → Fassung frei wählbar (Datalist)    ║    │
│  ╚═══════════════════════════════════════════════════╝    │
│                                                          │
│  ╔═══════════════════════════════════════════════════╗    │
│  ║  Kategorie = "LED"                               ║    │
│  ║  → lm-led-fields einblenden                      ║    │
│  ║  ┌──────────────┐                                ║    │
│  ║  │ Beschreibung │  (Freitext)                    ║    │
│  ║  └──────────────┘                                ║    │
│  ╚═══════════════════════════════════════════════════╝    │
│                                                          │
│  ╔═══════════════════════════════════════════════════╗    │
│  ║  Kategorie = "Glühbirne"                         ║    │
│  ║  → lm-gluehbirne-fields einblenden               ║    │
│  ║  ┌──────────────┐    ┌──────────────┐            ║    │
│  ║  │ Fassung      │───▶│ Wattage (W)  │            ║    │
│  ║  │ (E14/E27)    │    │ (Datalist)   │            ║    │
│  ║  └──────────────┘    └──────────────┘            ║    │
│  ║  - E14 → 25/40/60W                              ║    │
│  ║  - E27 → 25/40/60/75/100W                       ║    │
│  ╚═══════════════════════════════════════════════════╝    │
│                                                          │
│  Kein Match → alle Sub-Felder ausgeblendet               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  SONSTIGES                                               │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Raumdecke │  │ Erreichbar-  │  │ LPH (m)     │      │
│  │ (Datalist)│  │ keit [✓]     │  │ (nur wenn    │      │
│  └───────────┘  └──────┬───────┘  │  checked)    │      │
│                        │          └──────────────┘      │
│                        ▼                                 │
│                 "schlecht erreichbar" angehakt?           │
│                   ja → LPH-Feld einblenden               │
│                   nein → LPH-Feld ausblenden             │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Zustand-Grid (Checkboxen):                        │  │
│  │ eingeschaltet | defekt | Steuerung defekt         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Foto-Hinweis (orange Box) erscheint wenn:               │
│  - Raumdecke = "Sonstige" ODER                           │
│  - Montageart = "Sonstige" ODER                          │
│  - Leuchtenart = "Sonstige" ODER                         │
│  - "schlecht erreichbar" angehakt                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  STEUERUNG (5 Checkboxen in einer Zeile)                 │
│  □ BWM  □ dimmbar  □ DALI  □ KNX  □ defekt              │
└─────────────────────────────────────────────────────────┘
```

## Zusammenfassung Feldsteuerung

| Auslöser | Aktion |
|---|---|
| Montageart = "Pendel" | Pendellänge einblenden |
| LM-Kategorie = T5/T8 | Länge + Wattage (bidirektional) |
| LM-Kategorie = Dulux | Wendel + Wattage → Typ auto |
| LM-Kategorie = Sonstige | Typ-Select → Wattage + Fassung |
| LM-Kategorie = LED | Beschreibung (Freitext) |
| LM-Kategorie = Glühbirne | Fassung → Wattage |
| Sonstige-Typ gewählt | Fassung auto-gesetzt (readonly) bei bekannten Sockeln |
| VSG = EVG (bei T8) | vvgOnly-Einträge ausfiltern |
| VSG = EVG (bei Dulux) | /E-Varianten bevorzugen |
| "schlecht erreichbar" ✓ | LPH-Feld einblenden |
| Sonstige-Werte gewählt | Foto-Hinweis einblenden |
