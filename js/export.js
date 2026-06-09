// export.js - xlsx- und CSV-Export mit Foto-ZIP

// Obergrenze für Foto-Spalten in der Excel — schützt vor Ausreißern,
// die ZIP enthält ohnehin alle Bilder.
const FOTO_HEADER_LIMIT = 10;

function maxFotoCount(items) {
  let max = 0;
  for (const item of items || []) {
    const n = (item.fotos || []).filter(Boolean).length;
    if (n > max) max = n;
  }
  return Math.min(max, FOTO_HEADER_LIMIT);
}

function fotoHeaders(n) {
  return Array.from({ length: n }, (_, i) => `Foto ${i + 1}`);
}

// ── HK Export ──

const EXPORT_HEADERS_BASE = [
  'Gebäude', 'Geschoss', 'Raum-Nr.', 'Raumbezeichnung', 'HK-Nr.',
  'Typ', 'Bauart', 'Bauart Konvektor', 'Baulänge [mm]', 'Bauhöhe [mm]', 'Anz. Röhren', 'Anz. Glieder',
  'Nabenabstand [mm]', 'DN Ventil', 'Ventiltyp',
  'Hahnblock', 'RL-Verschraubung', 'Entlüftung', 'Entleerung',
  'Ventil voreinstellbar', 'Voreinstellwert', 'Art Thermostatkopf',
  'Einbausituation', 'Strang-Nr.', 'Bemerkung', 'Erfasser', 'Erfasst am'
];

function exportHeaders(maxFotos) {
  return [...EXPORT_HEADERS_BASE, ...fotoHeaders(maxFotos)];
}

const EXPORT_FIELDS = [
  'gebaeude', 'geschoss', 'raumnr', 'raumbezeichnung', 'hkNr',
  'typ', 'subtyp', 'konvektorBauart', 'baulaenge', 'bauhoehe', 'anzahlRoehren', 'anzahlGlieder',
  'nabenabstand', 'dnVentil', 'ventilform',
  'hahnblock', 'rlVerschraubung', 'entlueftung', 'entleerung',
  'ventilVoreinstellbar', 'ventilVoreinstellbarWert', 'artThermostatkopf',
  'einbausituation', 'strang', 'bemerkung', 'erfasser', 'erstelltAm'
];

function fotoFilename(hk, index) {
  const parts = [
    hk.geschoss || 'X',
    hk.raumnr || 'X',
    'HK' + (hk.hkNr || 'X')
  ].map(s => sanitizeFilename(String(s)));
  const suffix = index > 0 ? `_${index + 1}` : '';
  return `Fotos/${parts.join('_')}${suffix}.jpg`;
}

function formatErstelltAm(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function hkToRow(hk, maxFotos) {
  const row = EXPORT_FIELDS.map(f => {
    const val = hk[f];
    if (f === 'erstelltAm') return formatErstelltAm(val);
    if (typeof val === 'boolean') return val ? 'Ja' : 'Nein';
    return val != null ? String(val) : '';
  });
  for (let i = 0; i < maxFotos; i++) {
    row.push(hk.fotos && hk.fotos[i] ? fotoFilename(hk, i) : '');
  }
  return row;
}

// ── Beleuchtung Export ──

const BEL_EXPORT_HEADERS_BASE = [
  'Gebäude', 'Geschoss', 'Raum-Nr.', 'Raumbezeichnung', 'Gruppen-Nr.',
  'Maßnahme',
  'Raumdecke', 'Anzahl Reihen', 'Leuchten je Reihe', 'Leuchtmittel je Leuchte',
  'Installationsart', 'Installationsart Detail', 'Leuchtenart',
  'Leuchtmittel Kategorie', 'Leuchtmittel Typ', 'Leuchtmittel Länge [mm]', 'Leuchtmittel Wattage [W]',
  'Fassung', 'Vorschaltgerät', 'Steuerung', 'LPH [m]', 'UGR 19', 'Zustand',
  'Bemerkung', 'Erfasser', 'Erfasst am'
];

function belExportHeaders(maxFotos) {
  return [...BEL_EXPORT_HEADERS_BASE, ...fotoHeaders(maxFotos)];
}

const BEL_EXPORT_FIELDS = [
  'gebaeude', 'geschoss', 'raumnr', 'raumbezeichnung', 'gruppenNr',
  'konversionTyp',
  'raumdecke', 'anzahlReihen', 'leuchtenJeReihe', 'leuchtmittelJeLeuchte',
  'installationsart', 'installationsartSub', 'leuchtenart',
  'leuchtmittelKategorie', 'leuchtmittelTyp', 'leuchtmittelLaenge', 'leuchtmittelWattage',
  'fassung', 'vorschaltgeraet', 'steuerung', 'lph', 'ugr19', 'zustand',
  'bemerkung', 'erfasser', 'erstelltAm'
];

function belFotoFilename(bel, index) {
  const parts = [
    bel.geschoss || 'X',
    bel.raumnr || 'X',
    'BEL' + (bel.gruppenNr || 'X')
  ].map(s => sanitizeFilename(String(s)));
  const suffix = index > 0 ? `_${index + 1}` : '';
  return `Fotos/${parts.join('_')}${suffix}.jpg`;
}

function belToRow(bel, maxFotos) {
  const row = BEL_EXPORT_FIELDS.map(f => {
    const val = bel[f];
    if (f === 'erstelltAm') return formatErstelltAm(val);
    if (f === 'konversionTyp') return val === 'neue-leuchte' ? 'Neue Leuchte' : 'Leuchtmitteltausch';
    if (typeof val === 'boolean') return val ? 'Ja' : 'Nein';
    return val != null ? String(val) : '';
  });
  for (let i = 0; i < maxFotos; i++) {
    row.push(bel.fotos && bel.fotos[i] ? belFotoFilename(bel, i) : '');
  }
  return row;
}

// ── Base64 zu Uint8Array ──

function base64ToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Export-Komprimierung (erst beim Versenden/Exportieren) ──

function compressForExport(dataUrl) {
  return new Promise((resolve) => {
    const MAX_BYTES = (Number(localStorage.getItem('export-photo-size')) || 2000) * 1000;
    const img = new Image();
    img.onerror = () => resolve(base64ToBytes(dataUrl)); // Fallback: unkomprimiert
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const maxW = 2560;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      let quality = 0.85;
      let result = canvas.toDataURL('image/jpeg', quality);
      let bytes = Math.round((result.length - result.indexOf(',') - 1) * 3 / 4);

      while (bytes > MAX_BYTES && quality > 0.5) {
        quality -= 0.05;
        result = canvas.toDataURL('image/jpeg', quality);
        bytes = Math.round((result.length - result.indexOf(',') - 1) * 3 / 4);
      }
      resolve(base64ToBytes(result));
    };
    img.src = dataUrl;
  });
}

// ── Minimaler ZIP-Builder (Store-Methode, kein Komprimieren nötig für JPEGs) ──

// DOS-Zeit/Datum aus einem JS-Date (Datei-Zeitstempel im ZIP-Header)
function dosDateTime(input) {
  if (input == null) return { date: 0, time: 0 };
  const d = (input instanceof Date) ? input : new Date(input);
  if (isNaN(d.getTime()) || d.getFullYear() < 1980) return { date: 0, time: 0 };
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  return { date, time };
}

function buildZip(files) {
  // files: Array von { name: string, data: Uint8Array, mtime?: number|Date }
  const entries = [];
  let offset = 0;

  // Local file headers + data
  const localParts = [];
  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const { date: dosDate, time: dosTime } = dosDateTime(file.mtime);
    const header = new ArrayBuffer(30);
    const hv = new DataView(header);
    hv.setUint32(0, 0x04034b50, true);   // signature
    hv.setUint16(4, 20, true);            // version needed
    hv.setUint16(6, 0x0800, true);        // flags (UTF-8)
    hv.setUint16(8, 0, true);             // compression: store
    hv.setUint16(10, dosTime, true);      // mod time
    hv.setUint16(12, dosDate, true);      // mod date
    hv.setUint32(14, crc32(file.data), true);  // crc32
    hv.setUint32(18, file.data.length, true);  // compressed size
    hv.setUint32(22, file.data.length, true);  // uncompressed size
    hv.setUint16(26, nameBytes.length, true);  // name length
    hv.setUint16(28, 0, true);                 // extra length

    entries.push({ offset, nameBytes, file, dosDate, dosTime });
    const localHeader = new Uint8Array(header);
    localParts.push(localHeader, nameBytes, file.data);
    offset += 30 + nameBytes.length + file.data.length;
  }

  // Central directory
  const centralParts = [];
  let centralSize = 0;
  for (const entry of entries) {
    const cd = new ArrayBuffer(46);
    const cv = new DataView(cd);
    cv.setUint32(0, 0x02014b50, true);   // signature
    cv.setUint16(4, 20, true);            // version made by
    cv.setUint16(6, 20, true);            // version needed
    cv.setUint16(8, 0x0800, true);        // flags (UTF-8)
    cv.setUint16(10, 0, true);            // compression
    cv.setUint16(12, entry.dosTime, true);// mod time
    cv.setUint16(14, entry.dosDate, true);// mod date
    cv.setUint32(16, crc32(entry.file.data), true);
    cv.setUint32(20, entry.file.data.length, true);
    cv.setUint32(24, entry.file.data.length, true);
    cv.setUint16(28, entry.nameBytes.length, true);
    cv.setUint16(30, 0, true);            // extra length
    cv.setUint16(32, 0, true);            // comment length
    cv.setUint16(34, 0, true);            // disk start
    cv.setUint16(36, 0, true);            // internal attr
    cv.setUint32(38, 0, true);            // external attr
    cv.setUint32(42, entry.offset, true); // local header offset

    centralParts.push(new Uint8Array(cd), entry.nameBytes);
    centralSize += 46 + entry.nameBytes.length;
  }

  // End of central directory
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const allParts = [...localParts, ...centralParts, new Uint8Array(eocd)];
  const totalSize = allParts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of allParts) {
    result.set(part, pos);
    pos += part.length;
  }
  return result;
}

// CRC32 Tabelle
const crc32Table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(data) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) c = crc32Table[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── Hilfsfunktionen ──

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name) {
  return name.replace(/[\/\\:*?"<>|]/g, '').replace(/\s+/g, '_');
}

// ── Web Share API (System-Share, idR Outlook auf Android) ──

function canShareZip(file) {
  return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
}

// Versucht, das ZIP über das System-Share-Sheet zu teilen.
// Rückgabe:
//   'shared'    → erfolgreich geteilt (kein Fallback nötig)
//   'aborted'   → User hat das Share-Sheet abgebrochen (KEIN Fallback)
//   'unsupported' → Share-API nicht verfügbar oder Dateityp abgelehnt (Fallback nötig)
//   'failed'    → Share-Versuch warf einen anderen Fehler (Fallback nötig)
async function shareZipFile(blob, fileName, subject, body) {
  const file = new File([blob], fileName, { type: 'application/zip' });
  if (!canShareZip(file)) return 'unsupported';
  try {
    await navigator.share({ files: [file], title: subject, text: body });
    return 'shared';
  } catch (err) {
    if (err && err.name === 'AbortError') return 'aborted';
    return 'failed';
  }
}
