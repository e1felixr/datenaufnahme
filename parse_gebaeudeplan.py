#!/usr/bin/env python3
"""
Parst gebaeudeplan.pdf via Kachel-OCR und erzeugt gebaeudedaten.xlsx
Erkennt Raumnummern, Flächen (HNF), Bezeichnungen und Barcodes.

Nutzung:
  python parse_gebaeudeplan.py [input.pdf] [output.xlsx]
"""

import re
import sys
import os
import fitz  # PyMuPDF
import easyocr
from PIL import Image
import openpyxl

PDF_FILE = "gebaeudeplan.pdf"
OUTPUT_FILE = "gebaeudedaten.xlsx"
DPI = 600
TILE_SIZE = 1500
TILE_OVERLAP = 200

# --- Pattern ---
# Raumnummern im Format 1.XX oder 1.XXa (Gebäude 1)
# Ganzzahlteil muss 1 sein (für dieses Gebäude), Nachkommastellen 2-3 stellig
ROOM_PATTERN = re.compile(r'^(1\.(?:\d{2,3})[a-z]?)$')
SPECIAL_ROOM_PATTERN = re.compile(r'^(TH\s*[A-Z]|A\s*\d+)$')
BARCODE_PATTERN = re.compile(r'[Bb]arcode[:\s;]+(\S+)')
# Fläche: z.B. "40.36 m2", "17.45 mz", oder als reiner Zahlenwert neben HNF
AREA_PATTERN = re.compile(r'(\d{1,3}[\.,]\d{1,2})\s*m[2zZ²]?')

# Bekannte Maße (Fenster/Türen), die NICHT als Raumnummern erkannt werden sollen
KNOWN_DIMENSIONS = {'0.56', '0.68', '0.72', '0.81', '0.83', '0.88', '0.90', '0.91',
                    '0.93', '0.94', '0.98', '1.16', '1.18', '1.34', '1.90',
                    '1.92', '1.94', '1.95', '1.96', '2.08', '2.09', '2.12',
                    '2.14', '2.18', '2.20', '2.22', '108.12', '38.20',
                    '46.59', '16.04', '16.00'}

# Bekannte Nutzungen + OCR-Varianten
NUTZUNG_MAP = {
    'büro': 'Büro', 'buro': 'Büro', 'biro': 'Büro', 'buiro': 'Büro',
    'lager': 'Lager', 'lzger': 'Lager', 'lacei': 'Lager', 'laqer': 'Lager',
    'flur': 'Flur',
    'sanitärraum': 'Sanitärraum', 'sanitarraum': 'Sanitärraum',
    'teeküche': 'Teeküche', 'teekuche': 'Teeküche', 'teeküche': 'Teeküche',
    'treppenhaus': 'Treppenhaus', 'trecjenals': 'Treppenhaus',
    'aufzug': 'Aufzug',
    'druckerei': 'Druckerei', 'daickere': 'Druckerei', 'druckere': 'Druckerei',
    'besprechung': 'Besprechung', 'besprechunq': 'Besprechung',
    'fitnessraum': 'Fitnessraum', 'fitnesraum': 'Fitnessraum',
    'umkleideraum': 'Umkleideraum',
    'kopierer': 'Kopierer', 'kopieier': 'Kopierer',
    'wegefläche': 'Wegefläche', 'wegeflache': 'Wegefläche',
    'werkstatt': 'Werkstatt',
    'lager/werkstatt': 'Lager/Werkstatt',
    'serverraum': 'Serverraum',
    'technik': 'Technik',
    'archiv': 'Archiv',
    'küche': 'Küche', 'kuche': 'Küche',
}


def match_nutzung(text):
    """Versucht, einen OCR-Text einer bekannten Nutzung zuzuordnen."""
    t = text.strip().lower()
    if t in NUTZUNG_MAP:
        return NUTZUNG_MAP[t]
    # Substring-Match
    for key, val in NUTZUNG_MAP.items():
        if key in t or t in key:
            return val
    return None


def distance(x1, y1, x2, y2):
    return ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5


def ocr_tiled(img_path):
    """OCR auf Kacheln für bessere Erkennung bei großen Bildern."""
    img = Image.open(img_path)
    W, H = img.size
    print(f"Bild: {W}x{H}, Kacheln à {TILE_SIZE}px mit {TILE_OVERLAP}px Overlap")

    reader = easyocr.Reader(['de', 'en'], gpu=False)
    all_results = []

    ty = 0
    tile_count = 0
    while ty < H:
        tx = 0
        while tx < W:
            x2 = min(tx + TILE_SIZE, W)
            y2 = min(ty + TILE_SIZE, H)
            crop = img.crop((tx, ty, x2, y2))
            crop_path = '_temp_tile.png'
            crop.save(crop_path)
            results = reader.readtext(crop_path, paragraph=False)
            for bbox, text, conf in results:
                gx = bbox[0][0] + tx
                gy = bbox[0][1] + ty
                all_results.append({'x': gx, 'y': gy, 'text': text.strip(), 'conf': conf})
            tile_count += 1
            tx += TILE_SIZE - TILE_OVERLAP
        ty += TILE_SIZE - TILE_OVERLAP

    print(f"{tile_count} Kacheln verarbeitet, {len(all_results)} Textblöcke erkannt")

    # Deduplizieren (gleicher Text innerhalb 40px)
    unique = []
    for r in all_results:
        dup = False
        for i, u in enumerate(unique):
            if abs(r['x'] - u['x']) < 40 and abs(r['y'] - u['y']) < 40:
                # Nur als Duplikat werten wenn gleicher Text
                if r['text'] == u['text']:
                    if r['conf'] > u['conf']:
                        unique[i] = r
                    dup = True
                    break
        if not dup:
            unique.append(r)

    print(f"Nach Deduplizierung: {len(unique)} eindeutige Textblöcke")
    return unique


def classify_texts(ocr_results):
    """Klassifiziert OCR-Ergebnisse in Raumnummern, Barcodes, Flächen, Nutzungen."""
    rooms = []       # {'nr': str, 'x': float, 'y': float}
    barcodes = []    # {'code': str, 'x': float, 'y': float}
    areas = []       # {'area': str, 'x': float, 'y': float}
    nutzungen = []   # {'nutzung': str, 'x': float, 'y': float}
    hnf_markers = [] # {'x': float, 'y': float}

    for r in ocr_results:
        text = r['text']
        x, y = r['x'], r['y']
        conf = r['conf']

        # Raumnummer (bekannte Maße ausschließen)
        if ROOM_PATTERN.match(text) and conf > 0.4 and text not in KNOWN_DIMENSIONS:
            rooms.append({'nr': text, 'x': x, 'y': y, 'conf': conf})
            continue
        # Zahlen die wie Maße aussehen könnten aber trotzdem Raumnummern sein könnten
        # -> werden später per Kontextprüfung gefiltert

        if SPECIAL_ROOM_PATTERN.match(text) and conf > 0.5:
            rooms.append({'nr': text, 'x': x, 'y': y, 'conf': conf})
            continue

        # Barcode
        m = BARCODE_PATTERN.search(text)
        if m and conf > 0.4:
            code = m.group(1).rstrip(';.,')
            barcodes.append({'code': code, 'x': x, 'y': y})
            continue

        # HNF-Marker
        if text in ('HNF', 'HNF:', 'HNF(1,5m)'):
            hnf_markers.append({'x': x, 'y': y})
            continue

        # Fläche: mit m²-Suffix oder als reiner Zahlenwert neben HNF
        am = AREA_PATTERN.match(text)
        if am and conf > 0.5:
            val = am.group(1).replace(',', '.')
            fval = float(val)
            if 3 < fval < 300:
                areas.append({'area': val, 'x': x, 'y': y})
                continue

        # Reiner Zahlenwert (z.B. "40.36") — nur wenn HNF-Marker direkt daneben
        plain_num = re.match(r'^(\d{2,3}\.\d{2})$', text)
        if plain_num and conf > 0.6 and text not in KNOWN_DIMENSIONS:
            val = plain_num.group(1)
            fval = float(val)
            if 3 < fval < 300:
                near_hnf = any(distance(x, y, h['x'], h['y']) < 120 for h in hnf_markers)
                if near_hnf:
                    areas.append({'area': val, 'x': x, 'y': y})
                    continue

        # Nutzung
        nutz = match_nutzung(text)
        if nutz and conf > 0.4:
            nutzungen.append({'nutzung': nutz, 'x': x, 'y': y})

    print(f"Klassifiziert: {len(rooms)} Räume, {len(barcodes)} Barcodes, "
          f"{len(areas)} Flächen, {len(nutzungen)} Nutzungen, {len(hnf_markers)} HNF-Marker")
    return rooms, barcodes, areas, nutzungen, hnf_markers


def assign_to_rooms(rooms, barcodes, areas, nutzungen, hnf_markers):
    """Ordnet Barcodes, Flächen und Nutzungen den nächsten Raumnummern zu."""
    MAX_DIST_BARCODE = 350   # max Pixel-Abstand für Barcode-Zuordnung
    MAX_DIST_AREA = 350      # max Pixel-Abstand für Fläche
    MAX_DIST_NUTZUNG = 300   # max Pixel-Abstand für Nutzung

    result = {}
    for room in rooms:
        nr = room['nr']
        if nr in result:
            # Duplikat: höheres Confidence behalten
            if room['conf'] > result[nr]['conf']:
                result[nr] = {
                    'raumnr': nr, 'flaeche': '', 'nutzung': '', 'barcode': '',
                    'x': room['x'], 'y': room['y'], 'conf': room['conf']
                }
        else:
            result[nr] = {
                'raumnr': nr, 'flaeche': '', 'nutzung': '', 'barcode': '',
                'x': room['x'], 'y': room['y'], 'conf': room['conf']
            }

    room_list = list(result.values())

    def find_nearest_room(x, y, max_dist):
        """Findet den nächsten Raum, der unterhalb der y-Position liegt (Barcode/HNF sind unter der Raumnr)."""
        best = None
        best_dist = max_dist
        for r in room_list:
            # Zuordnungselemente liegen unterhalb der Raumnummer
            dy = y - r['y']
            if dy < -50:  # Element liegt deutlich über der Raumnummer -> skip
                continue
            d = distance(x, y, r['x'], r['y'])
            if d < best_dist:
                best_dist = d
                best = r
        return best

    # Barcodes zuordnen
    for bc in barcodes:
        room = find_nearest_room(bc['x'], bc['y'], MAX_DIST_BARCODE)
        if room and not room['barcode']:
            room['barcode'] = bc['code']

    # Flächen zuordnen (nur in der Nähe von HNF-Markern)
    for area in areas:
        # Prüfe ob ein HNF-Marker in der Nähe ist
        has_hnf = any(distance(area['x'], area['y'], h['x'], h['y']) < 150 for h in hnf_markers)
        if not has_hnf:
            continue
        room = find_nearest_room(area['x'], area['y'], MAX_DIST_AREA)
        if room and not room['flaeche']:
            room['flaeche'] = area['area']

    # Nutzungen zuordnen
    for nutz in nutzungen:
        room = find_nearest_room(nutz['x'], nutz['y'], MAX_DIST_NUTZUNG)
        if room and not room['nutzung']:
            room['nutzung'] = nutz['nutzung']

    # Validierung: Räume ohne Barcode UND ohne Nutzung UND ohne Fläche
    # mit verdächtiger Nummer (Ganzzahlteil > 1 oder < 1) entfernen
    to_remove = []
    for nr, room in result.items():
        m = re.match(r'^(\d+)\.(\d+)', nr)
        if m:
            prefix = int(m.group(1))
            # Raumnummern im Gebäude 1 beginnen mit 1.
            # Alles andere ist verdächtig und braucht Bestätigung durch Barcode/HNF
            if prefix != 1:
                if not room['barcode'] and not room['flaeche'] and not room['nutzung']:
                    to_remove.append(nr)
                elif not room['barcode'] and not room['nutzung']:
                    to_remove.append(nr)
    for nr in to_remove:
        print(f"  Entferne verdächtige Raumnummer: {nr}")
        del result[nr]

    return result


def extract_metadata(pdf_file):
    """Extrahiert Gebäude und Etage aus den lesbaren (Helvetica) Texten."""
    doc = fitz.open(pdf_file)
    page = doc[0]
    blocks = page.get_text('dict')['blocks']

    gebaeude = None
    etage = None

    for b in blocks:
        if 'lines' not in b:
            continue
        for line in b['lines']:
            for span in line['spans']:
                if span['font'] == 'Helvetica':
                    text = span['text'].strip()
                    m = re.search(r'Geb.ude\s+(\d+),\s+(\S+\s*\d*)', text)
                    if m:
                        gebaeude = f'Gebäude {m.group(1)}'
                        etage = m.group(2).strip()

    return gebaeude, etage


def sort_key(room):
    nr = room['raumnr']
    m = re.match(r'(\d+)\.(\d+)([a-z]?)', nr)
    if m:
        return (0, int(m.group(1)), int(m.group(2)), m.group(3))
    return (1, 0, 0, nr)


def write_xlsx(rooms, gebaeude, etage, output_file):
    """Schreibt die Raumdaten als xlsx."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Gebaeudedaten"

    ws.append(['Gebäude', None, 'Etagen', None, 'Raumnr.', 'Fläche (m²)', 'Nutzung', 'Barcode'])

    sorted_rooms = sorted(rooms.values(), key=sort_key)

    first = True
    for room in sorted_rooms:
        flaeche = float(room['flaeche']) if room['flaeche'] else None
        ws.append([
            gebaeude if first else None,
            None,
            etage if first else None,
            None,
            room['raumnr'],
            flaeche,
            room['nutzung'],
            room['barcode']
        ])
        first = False

    ws.column_dimensions['A'].width = 15
    ws.column_dimensions['C'].width = 10
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 12
    ws.column_dimensions['G'].width = 20
    ws.column_dimensions['H'].width = 12

    wb.save(output_file)
    print(f"\n{output_file} geschrieben: {len(sorted_rooms)} Räume")


def main():
    pdf_file = sys.argv[1] if len(sys.argv) > 1 else PDF_FILE
    output = sys.argv[2] if len(sys.argv) > 2 else OUTPUT_FILE

    if not os.path.exists(pdf_file):
        print(f"Fehler: {pdf_file} nicht gefunden!")
        sys.exit(1)

    # Metadaten aus PDF
    gebaeude, etage = extract_metadata(pdf_file)
    print(f"Gebäude: {gebaeude}, Etage: {etage}")

    # PDF rendern
    print(f"\nRendere PDF bei {DPI} DPI...")
    doc = fitz.open(pdf_file)
    page = doc[0]
    pix = page.get_pixmap(dpi=DPI)
    img_path = "_temp_plan_ocr.png"
    pix.save(img_path)

    # OCR
    print("\nStarte Kachel-OCR...")
    ocr_results = ocr_tiled(img_path)

    # Klassifizieren
    print("\nKlassifiziere Ergebnisse...")
    rooms, barcodes, areas, nutzungen, hnf_markers = classify_texts(ocr_results)

    # Zuordnen
    print("\nOrdne Daten den Räumen zu...")
    room_data = assign_to_rooms(rooms, barcodes, areas, nutzungen, hnf_markers)

    # Ausgabe
    sorted_rooms = sorted(room_data.values(), key=sort_key)
    print(f"\n{'Raum':<10} {'Fläche':>10} {'Nutzung':<20} {'Barcode':<10}")
    print('-' * 55)
    for r in sorted_rooms:
        print(f"{r['raumnr']:<10} {r['flaeche']:>10} {r['nutzung']:<20} {r['barcode']:<10}")

    # Statistik
    with_barcode = sum(1 for r in sorted_rooms if r['barcode'])
    with_area = sum(1 for r in sorted_rooms if r['flaeche'])
    with_nutzung = sum(1 for r in sorted_rooms if r['nutzung'])
    print(f"\nStatistik: {len(sorted_rooms)} Räume, "
          f"{with_barcode} mit Barcode, {with_area} mit Fläche, {with_nutzung} mit Nutzung")

    # Schreiben
    write_xlsx(room_data, gebaeude, etage, output)

    # Aufräumen
    for f in ['_temp_plan_ocr.png', '_temp_tile.png']:
        if os.path.exists(f):
            os.remove(f)


if __name__ == '__main__':
    main()
