#!/usr/bin/env python3
"""
Parst Gebäudeplan-PDFs via Kachel-OCR und erzeugt gebaeudedaten.xlsx
Erkennt Raumnummern, Flächen (HNF), Bezeichnungen und Barcodes.

Nutzung:
  python parse_gebaeudeplan.py                        # alle *.pdf aus plaene/
  python parse_gebaeudeplan.py plan1.pdf plan2.pdf    # bestimmte PDFs
  python parse_gebaeudeplan.py -o output.xlsx *.pdf   # Output-Datei angeben
"""

import re
import sys
import os
import glob
import fitz  # PyMuPDF
import easyocr
from PIL import Image
import openpyxl

OUTPUT_FILE = "gebaeudedaten.xlsx"
DPI = 600
TILE_SIZE = 1500
TILE_OVERLAP = 200

# --- Pattern ---
# Raumnummern: X.YY oder X.YYa — Ganzzahlteil wird pro PDF aus Metadaten gefiltert
ROOM_PATTERN = re.compile(r'^(\d{1,2}\.\d{2,3}[a-z]?)$')
SPECIAL_ROOM_PATTERN = re.compile(r'^(TH\s*[A-Z]|A\s*\d+)$')
BARCODE_PATTERN = re.compile(r'[Bb]arcode[:\s;]+(\S+)')
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
    for key, val in NUTZUNG_MAP.items():
        if key in t or t in key:
            return val
    return None


def distance(x1, y1, x2, y2):
    return ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5


def ocr_tiled(img_path, reader):
    """OCR auf Kacheln für bessere Erkennung bei großen Bildern."""
    img = Image.open(img_path)
    W, H = img.size
    print(f"  Bild: {W}x{H}, Kacheln à {TILE_SIZE}px")

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

    print(f"  {tile_count} Kacheln, {len(all_results)} Textblöcke erkannt")

    # Deduplizieren
    unique = []
    for r in all_results:
        dup = False
        for i, u in enumerate(unique):
            if abs(r['x'] - u['x']) < 40 and abs(r['y'] - u['y']) < 40:
                if r['text'] == u['text']:
                    if r['conf'] > u['conf']:
                        unique[i] = r
                    dup = True
                    break
        if not dup:
            unique.append(r)

    print(f"  Nach Deduplizierung: {len(unique)} eindeutige Textblöcke")
    return unique


def classify_texts(ocr_results, room_prefix=None):
    """Klassifiziert OCR-Ergebnisse in Raumnummern, Barcodes, Flächen, Nutzungen."""
    rooms = []
    barcodes = []
    areas = []
    nutzungen = []
    hnf_markers = []

    for r in ocr_results:
        text = r['text']
        x, y = r['x'], r['y']
        conf = r['conf']

        # Raumnummer
        if ROOM_PATTERN.match(text) and conf > 0.4 and text not in KNOWN_DIMENSIONS:
            # Wenn Gebäude-Prefix bekannt, nur passende Raumnummern akzeptieren
            if room_prefix is not None:
                nr_prefix = text.split('.')[0]
                if nr_prefix != str(room_prefix):
                    continue
            rooms.append({'nr': text, 'x': x, 'y': y, 'conf': conf})
            continue

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

        # Fläche mit m²-Suffix
        am = AREA_PATTERN.match(text)
        if am and conf > 0.5:
            val = am.group(1).replace(',', '.')
            fval = float(val)
            if 3 < fval < 300:
                areas.append({'area': val, 'x': x, 'y': y})
                continue

        # Reiner Zahlenwert neben HNF
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

    print(f"  Klassifiziert: {len(rooms)} Räume, {len(barcodes)} Barcodes, "
          f"{len(areas)} Flächen, {len(nutzungen)} Nutzungen, {len(hnf_markers)} HNF-Marker")
    return rooms, barcodes, areas, nutzungen, hnf_markers


def assign_to_rooms(rooms, barcodes, areas, nutzungen, hnf_markers):
    """Ordnet Barcodes, Flächen und Nutzungen den nächsten Raumnummern zu."""
    MAX_DIST_BARCODE = 350
    MAX_DIST_AREA = 350
    MAX_DIST_NUTZUNG = 300

    result = {}
    for room in rooms:
        nr = room['nr']
        if nr in result:
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
        best = None
        best_dist = max_dist
        for r in room_list:
            dy = y - r['y']
            if dy < -50:
                continue
            d = distance(x, y, r['x'], r['y'])
            if d < best_dist:
                best_dist = d
                best = r
        return best

    for bc in barcodes:
        room = find_nearest_room(bc['x'], bc['y'], MAX_DIST_BARCODE)
        if room and not room['barcode']:
            room['barcode'] = bc['code']

    for area in areas:
        has_hnf = any(distance(area['x'], area['y'], h['x'], h['y']) < 150 for h in hnf_markers)
        if not has_hnf:
            continue
        room = find_nearest_room(area['x'], area['y'], MAX_DIST_AREA)
        if room and not room['flaeche']:
            room['flaeche'] = area['area']

    for nutz in nutzungen:
        room = find_nearest_room(nutz['x'], nutz['y'], MAX_DIST_NUTZUNG)
        if room and not room['nutzung']:
            room['nutzung'] = nutz['nutzung']

    return result


def extract_metadata(pdf_file):
    """Extrahiert Gebäude und Etage aus PDF-Text oder Dateiname."""
    gebaeude = None
    etage = None
    geb_nr = None

    # 1. Versuch: aus dem PDF-Text (Helvetica-Font)
    doc = fitz.open(pdf_file)
    page = doc[0]
    blocks = page.get_text('dict')['blocks']
    for b in blocks:
        if 'lines' not in b:
            continue
        for line in b['lines']:
            for span in line['spans']:
                if span['font'] == 'Helvetica':
                    text = span['text'].strip()
                    m = re.search(r'Geb.ude\s+(\d+),\s+(\S+\s*\d*)', text)
                    if m:
                        geb_nr = int(m.group(1))
                        gebaeude = f'Gebäude {geb_nr}'
                        etage = m.group(2).strip()
    doc.close()

    # 2. Fallback: aus dem Dateinamen
    # z.B. "2018 - Gebaeude 1 - 1.Obergeschoss.pdf"
    basename = os.path.basename(pdf_file)
    if not gebaeude:
        m = re.search(r'Geb.ude\s*(\d+)', basename, re.IGNORECASE)
        if m:
            geb_nr = int(m.group(1))
            gebaeude = f'Gebäude {geb_nr}'
    if not etage:
        # Etage aus Dateiname: "1.Obergeschoss" -> "OG 1", "Erdgeschoss" -> "EG",
        # "1.Untergeschoss" -> "UG 1"
        m = re.search(r'(\d+)\.\s*Obergeschoss', basename, re.IGNORECASE)
        if m:
            etage = f'OG {m.group(1)}'
        elif re.search(r'Erdgeschoss', basename, re.IGNORECASE):
            etage = 'EG'
        m = re.search(r'(\d+)\.\s*Untergeschoss', basename, re.IGNORECASE)
        if m:
            etage = f'UG {m.group(1)}'

    return gebaeude, etage, geb_nr


def process_single_pdf(pdf_file, reader):
    """Verarbeitet eine einzelne PDF und gibt (gebaeude, etage, rooms) zurück."""
    print(f"\n{'='*60}")
    print(f"Verarbeite: {pdf_file}")
    print(f"{'='*60}")

    if not os.path.exists(pdf_file):
        print(f"  FEHLER: Datei nicht gefunden!")
        return None, None, {}

    # Metadaten
    gebaeude, etage, geb_nr = extract_metadata(pdf_file)
    print(f"  Gebäude: {gebaeude}, Etage: {etage}")

    # PDF rendern
    print(f"  Rendere bei {DPI} DPI...")
    doc = fitz.open(pdf_file)
    page = doc[0]
    pix = page.get_pixmap(dpi=DPI)
    img_path = "_temp_plan_ocr.png"
    pix.save(img_path)

    # OCR
    print(f"  Starte Kachel-OCR...")
    ocr_results = ocr_tiled(img_path, reader)

    # Klassifizieren (mit Gebäude-Prefix-Filter)
    rooms, barcodes, areas, nutzungen, hnf_markers = classify_texts(ocr_results, room_prefix=geb_nr)

    # Zuordnen
    room_data = assign_to_rooms(rooms, barcodes, areas, nutzungen, hnf_markers)

    # Ergebnis anzeigen
    sorted_rooms = sorted(room_data.values(), key=sort_key)
    print(f"\n  {'Raum':<10} {'Fläche':>10} {'Nutzung':<20} {'Barcode':<10}")
    print(f"  {'-'*55}")
    for r in sorted_rooms:
        print(f"  {r['raumnr']:<10} {r['flaeche']:>10} {r['nutzung']:<20} {r['barcode']:<10}")

    with_barcode = sum(1 for r in sorted_rooms if r['barcode'])
    with_area = sum(1 for r in sorted_rooms if r['flaeche'])
    with_nutzung = sum(1 for r in sorted_rooms if r['nutzung'])
    print(f"\n  Statistik: {len(sorted_rooms)} Räume, "
          f"{with_barcode} Barcodes, {with_area} Flächen, {with_nutzung} Nutzungen")

    return gebaeude, etage, room_data


def sort_key(room):
    nr = room['raumnr']
    m = re.match(r'(\d+)\.(\d+)([a-z]?)', nr)
    if m:
        return (0, int(m.group(1)), int(m.group(2)), m.group(3))
    return (1, 0, 0, nr)


def write_xlsx(all_pdf_data, output_file):
    """Schreibt alle Raumdaten aus allen PDFs in eine xlsx."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Gebaeudedaten"

    ws.append(['Gebäude', None, 'Etagen', None, 'Raumnr.', 'Fläche (m²)', 'Nutzung', 'Barcode'])

    total_rooms = 0
    # Sammle alle Etagen pro Gebäude
    gebaeude_etagen = {}  # {gebaeude: set(etagen)}
    for gebaeude, etage, rooms in all_pdf_data:
        if gebaeude:
            if gebaeude not in gebaeude_etagen:
                gebaeude_etagen[gebaeude] = set()
            if etage:
                gebaeude_etagen[gebaeude].add(etage)

    first_gebaeude = True
    first_etage_per_geb = {}

    for gebaeude, etage, rooms in all_pdf_data:
        sorted_rooms = sorted(rooms.values(), key=sort_key)
        if not sorted_rooms:
            continue

        is_first_geb = gebaeude not in first_etage_per_geb
        first_etage_per_geb.setdefault(gebaeude, True)

        for i, room in enumerate(sorted_rooms):
            flaeche = float(room['flaeche']) if room['flaeche'] else None
            row = [
                gebaeude if i == 0 and is_first_geb else None,
                None,
                etage if i == 0 else None,
                None,
                room['raumnr'],
                flaeche,
                room['nutzung'],
                room['barcode']
            ]
            ws.append(row)
            total_rooms += 1

        if is_first_geb:
            first_etage_per_geb[gebaeude] = False

    ws.column_dimensions['A'].width = 15
    ws.column_dimensions['C'].width = 10
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 12
    ws.column_dimensions['G'].width = 20
    ws.column_dimensions['H'].width = 12

    wb.save(output_file)
    print(f"\n{output_file} geschrieben: {total_rooms} Räume aus {len(all_pdf_data)} PDFs")


def main():
    # Argumente parsen
    args = sys.argv[1:]
    output = OUTPUT_FILE
    pdf_files = []

    i = 0
    while i < len(args):
        if args[i] == '-o' and i + 1 < len(args):
            output = args[i + 1]
            i += 2
        else:
            pdf_files.append(args[i])
            i += 1

    # Wenn keine PDFs angegeben, alle *.pdf im Ordner /plaene (rekursiv) nehmen
    if not pdf_files:
        pdf_files = sorted(glob.glob('plaene/**/*.pdf', recursive=True))
        if not pdf_files:
            pdf_files = sorted(glob.glob('plaene/*.pdf'))
        if not pdf_files:
            pdf_files = sorted(glob.glob('*.pdf'))
        if not pdf_files:
            print("Keine PDF-Dateien gefunden!")
            print("Lege PDFs in den Ordner 'plaene/' oder gib sie als Argument an:")
            print("  python parse_gebaeudeplan.py plan1.pdf plan2.pdf ...")
            sys.exit(1)

    print(f"Verarbeite {len(pdf_files)} PDF(s): {', '.join(pdf_files)}")
    print(f"Ausgabe: {output}")

    # OCR-Reader einmal initialisieren (spart Zeit bei mehreren PDFs)
    print("\nInitialisiere OCR-Reader...")
    reader = easyocr.Reader(['de', 'en'], gpu=False)

    # Alle PDFs verarbeiten
    all_pdf_data = []  # [(gebaeude, etage, rooms), ...]
    for pdf_file in pdf_files:
        gebaeude, etage, rooms = process_single_pdf(pdf_file, reader)
        if rooms:
            all_pdf_data.append((gebaeude, etage, rooms))

    if not all_pdf_data:
        print("\nKeine Raumdaten erkannt!")
        sys.exit(1)

    # Zusammenfassung
    total = sum(len(rooms) for _, _, rooms in all_pdf_data)
    print(f"\n{'='*60}")
    print(f"GESAMT: {total} Räume aus {len(all_pdf_data)} PDFs")
    print(f"{'='*60}")

    # Schreiben
    write_xlsx(all_pdf_data, output)

    # Aufräumen
    for f in ['_temp_plan_ocr.png', '_temp_tile.png']:
        if os.path.exists(f):
            os.remove(f)


if __name__ == '__main__':
    main()
