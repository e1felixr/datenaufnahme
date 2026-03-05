// app.js - Hauptlogik, Navigation, Event-Handling

const APP_VERSION = 'v2.12';
const APP_BUILD_DATE = '05.03.2026 08:40'; // wird nach Commit aktualisiert

// ── Dropdown-Konfiguration ──
const CONFIG = {
  typ: ['Kompakt-HK', 'Stahlröhren-HK', 'Stahlglieder-HK', 'Gussglieder-HK', 'Konvektoren', 'Sonstige'],
  subtypKompakt: ['10', '11', '20', '21', '22', '30', '33'],
  subtypKonvektoren: ['21', '22', '32', '43', '54'],
  subtypStahlplatte: ['ER', 'EK', 'DR', 'C', 'DK', 'T', 'TK1', 'TK2', 'TK3'],
  anzahlRoehren: [2, 3, 4, 5, 6],
  baulaengeOpts: [400,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1800,2000,2200,2400,2600,2800,3000],
  bauhoeheKompakt: [200,300,400,500,600,700,800,900,1000],
  bauhoeheRoehren: [190,300,350,400,450,500,550,600,750,900,1000,1100,1200,1500,1800,2000,2500,2800],
  bauhoeheGuss:    [280,430,580,680,980],
  bauhoeheStahl:   [300,400,600,1000],
  // Nabenabstand↔Bauhöhe Mapping für Gussglieder und Stahlglieder
  gussNaBA: { 280:200, 430:350, 580:500, 680:600, 980:900 },
  gussBANA: { 200:280, 350:430, 500:580, 600:680, 900:980 },
  stahlNaBA: { 300:200, 400:350, 600:500, 1000:900 },
  stahlBANA: { 200:300, 350:400, 500:600, 900:1000 },
  nabenabstandOpts: [100,150,200,300,350,500,600,900],
  dnVentil: ['DN10', 'DN15', 'DN20', 'DN25'],
  ventilform: ['Durchgang', 'Eck', 'Axial', 'Winkeleck'],
  artThermostatkopf: ['nur auf/zu', 'analog', 'digital', 'Behörde', 'Fernversteller', 'fehlt', 'Sonstiges'],
  einbausituationCheckboxes: ['verkleidung', 'bruestung', 'moebel', 'sonstige']
};

let currentProjektId = null;
let currentHkId = null;
let formPhotos = [null, null];
let settingsReady = false;
let allGebaeudeDaten = {}; // Key=Liegenschaft, Value={gebaeude,geschoss,raum,raumDetails}
let currentLiegenschaft = null;
let newHkBaseData = null; // Basisdaten für Mode-Toggle (neuer HK)
const DATALIST_OPTS = {}; // Volle Optionslisten für Autocomplete-Filter

// ── Navigation ──

function navigate(screen, pushState = true) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screen).classList.add('active');
  if (pushState) {
    const hash = screen === 'screen-projekte' ? '' : screen;
    history.pushState({ screen }, '', hash ? '#' + hash : window.location.pathname);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.screen) {
    navigate(e.state.screen, false);
  } else {
    navigate('screen-projekte', false);
  }
});

// ── Toast ──

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ── Projektliste ──

async function renderProjekte() {
  const list = document.getElementById('projekt-list');
  const projekte = await getAllProjekte();
  if (projekte.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128203;</div>
        <p>Noch keine Projekte vorhanden.<br>Erstellen Sie ein neues Projekt.</p>
      </div>`;
    return;
  }
  projekte.sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
  let html = '';
  for (const p of projekte) {
    const hks = await getHeizkoerperByProjekt(p.id);
    const datum = new Date(p.erstelltAm).toLocaleDateString('de-DE');
    const liegBadge = p.liegenschaft ? ` <span class="badge">${esc(p.liegenschaft)}</span>` : '';
    html += `
      <div class="card" data-id="${p.id}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="flex:1;cursor:pointer" onclick="openProjekt('${p.id}')">
            <div class="card-title">${esc(p.name)}${liegBadge}</div>
            <div class="card-sub">${datum} &middot; ${hks.length} HK</div>
          </div>
          <button class="btn-icon btn-icon-danger" onclick="event.stopPropagation();confirmDeleteProjekt('${p.id}')" title="Löschen">&#128465;</button>
        </div>
      </div>`;
  }
  list.innerHTML = html;
}

function showNewProjektDialog() {
  document.getElementById('modal-new-projekt').style.display = 'flex';
  const inp = document.getElementById('input-projekt-name');
  inp.value = '';
  // Liegenschaft-Select befüllen
  const sel = document.getElementById('input-projekt-liegenschaft');
  const keys = Object.keys(allGebaeudeDaten);
  sel.innerHTML = '<option value="">-- Liegenschaft --</option>' +
    keys.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
  if (keys.length === 1) sel.value = keys[0];
  inp.focus();
}

function closeNewProjektDialog() {
  document.getElementById('modal-new-projekt').style.display = 'none';
}

async function createNewProjekt() {
  const name = document.getElementById('input-projekt-name').value.trim();
  if (!name) return;
  const liegenschaft = document.getElementById('input-projekt-liegenschaft').value;
  await createProjekt(name, liegenschaft);
  closeNewProjektDialog();
  await renderProjekte();
  showToast('Projekt erstellt');
}

async function openProjekt(id) {
  if (!localStorage.getItem('erfasser-name')) {
    openSettings();
    return;
  }
  currentProjektId = id;
  const p = await getProjekt(id);
  document.getElementById('header-projekt-name').textContent = p.name;
  // Liegenschaft setzen und Datalists aktualisieren
  currentLiegenschaft = p.liegenschaft || null;
  renderDatalists();
  await renderHkList();
  navigate('screen-hk-list');
}

async function confirmDeleteProjekt(id) {
  const p = await getProjekt(id);
  if (confirm(`Projekt "${p.name}" und alle Heizkörper wirklich löschen?`)) {
    await deleteProjekt(id);
    await renderProjekte();
    showToast('Projekt gelöscht');
  }
}

// ── Heizkörper-Liste ──

async function renderHkList() {
  const list = document.getElementById('hk-list');
  let hks = await getHeizkoerperByProjekt(currentProjektId);

  // Filter
  const filterText = document.getElementById('filter-text')?.value?.toLowerCase() || '';
  if (filterText) {
    hks = hks.filter(hk =>
      (hk.gebaeude || '').toLowerCase().includes(filterText) ||
      (hk.geschoss || '').toLowerCase().includes(filterText) ||
      (hk.raumnr || '').toLowerCase().includes(filterText) ||
      (hk.raumbezeichnung || '').toLowerCase().includes(filterText)
    );
  }

  // Sortierung: Gebäude > Geschoss > Raum > HK-Nr
  hks.sort((a, b) =>
    (a.gebaeude || '').localeCompare(b.gebaeude || '') ||
    (a.geschoss || '').localeCompare(b.geschoss || '') ||
    (a.raumnr || '').localeCompare(b.raumnr || '') ||
    (Number(a.hkNr) || 0) - (Number(b.hkNr) || 0)
  );

  document.getElementById('hk-count').textContent = hks.length;

  if (hks.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128293;</div>
        <p>Noch keine Heizkörper erfasst.<br>Tippen Sie auf + um einen hinzuzufügen.</p>
      </div>`;
    return;
  }

  // Nach Raum gruppieren
  const rooms = [];
  const roomMap = new Map();
  for (const hk of hks) {
    const key = `${hk.gebaeude || ''}|${hk.geschoss || ''}|${hk.raumnr || ''}`;
    if (!roomMap.has(key)) {
      const room = { gebaeude: hk.gebaeude, geschoss: hk.geschoss, raumnr: hk.raumnr, raumbezeichnung: hk.raumbezeichnung, hks: [] };
      roomMap.set(key, room);
      rooms.push(room);
    }
    const room = roomMap.get(key);
    room.hks.push(hk);
    if (hk.raumbezeichnung && !room.raumbezeichnung) room.raumbezeichnung = hk.raumbezeichnung;
  }

  let html = '';
  for (const room of rooms) {
    const info = [room.gebaeude, room.geschoss, room.raumnr ? 'Raum ' + room.raumnr : ''].filter(Boolean).join(' / ');
    const label = room.raumbezeichnung ? ' · ' + esc(room.raumbezeichnung) : '';
    // Typ einmal auf Raumebene zeigen, falls alle HK denselben Typ haben
    const typen = [...new Set(room.hks.map(h => h.typ).filter(Boolean))];
    const roomTyp = typen.length === 1 ? typen[0] : '';
    html += `<div class="card room-card">
      <div class="room-header">${esc(info)}${label}${roomTyp ? ` <span class="badge">${esc(roomTyp)}</span>` : ''}</div>
      <div class="room-hks">`;
    for (const hk of room.hks) {
      const chipTyp = typen.length > 1 && hk.typ ? `<span class="badge">${esc(hk.typ)}</span>` : '';
      html += `
        <div class="room-hk-chip" onclick="openHkForm('${hk.id}')">
          <span class="room-hk-nr">HK ${esc(String(hk.hkNr || '-'))}</span>
          ${chipTyp}
          <button class="room-hk-del" onclick="event.stopPropagation();confirmDeleteHk('${hk.id}')" title="Löschen">&times;</button>
        </div>`;
    }
    html += `</div></div>`;
  }
  list.innerHTML = html;
}

// ── Erfassungsformular ──

async function openHkForm(hkId) {
  currentHkId = hkId || null;
  let hk;

  if (hkId) {
    // Bearbeiten
    hk = await getHeizkoerper(hkId);
    document.getElementById('header-form-title').textContent = 'HK bearbeiten';
    document.getElementById('btn-delete-hk').style.display = 'inline-flex';
    document.getElementById('new-hk-mode-toggle').style.display = 'none';
  } else {
    // Neu: Smart-Defaults aus Standard oder letztem Eintrag
    const std = getHkStandard();
    const last = await getLastHeizkoerper(currentProjektId);
    const defaults = std || last;
    hk = newHeizkoerper(currentProjektId, defaults ? {
      gebaeude: defaults.gebaeude,
      geschoss: defaults.geschoss,
      raumnr: last ? last.raumnr : ''
    } : null);
    // HK-Typ und technische Daten übernehmen
    if (defaults) {
      for (const f of STANDARD_FIELDS) {
        hk[f] = defaults[f] || '';
      }
    }
    // Nächste HK-Nr ermitteln
    const all = await getHeizkoerperByProjekt(currentProjektId);
    const maxNr = all.reduce((max, h) => Math.max(max, Number(h.hkNr) || 0), 0);
    hk.hkNr = maxNr + 1;
    document.getElementById('header-form-title').textContent = 'Neuer Heizkörper';
    document.getElementById('btn-delete-hk').style.display = 'none';

    // Mode-Toggle vorbereiten
    newHkBaseData = {
      lastRaumnr: last ? (last.raumnr || '') : '',
      lastRaumbezeichnung: last ? (last.raumbezeichnung || '') : '',
      nextHkNr: maxNr + 1
    };
    const toggle = document.getElementById('new-hk-mode-toggle');
    toggle.style.display = last ? 'block' : 'none';
    document.getElementById('btn-mode-same-room').classList.add('active');
    document.getElementById('btn-mode-new-room').classList.remove('active');
  }

  fillForm(hk);
  navigate('screen-form');
}

function setNewHkMode(mode) {
  document.getElementById('btn-mode-same-room').classList.toggle('active', mode === 'same-room');
  document.getElementById('btn-mode-new-room').classList.toggle('active', mode === 'new-room');
  if (!newHkBaseData) return;
  if (mode === 'same-room') {
    document.getElementById('f-raumnr').value = newHkBaseData.lastRaumnr;
    document.getElementById('f-raumbezeichnung').value = newHkBaseData.lastRaumbezeichnung;
    document.getElementById('f-hkNr').value = newHkBaseData.nextHkNr;
  } else {
    document.getElementById('f-raumnr').value = '';
    document.getElementById('f-raumbezeichnung').value = '';
    document.getElementById('f-hkNr').value = 1;
  }
}

function setupDatalistFilters() {
  const pairs = [
    ['f-baulaenge', 'dl-baulaenge'],
    ['f-bauhoehe', 'dl-bauhoehe'],
    ['f-nabenabstand', 'dl-nabenabstand'],
  ];
  for (const [inputId, dlId] of pairs) {
    const input = document.getElementById(inputId);
    if (!input) continue;
    input.addEventListener('input', () => {
      const val = input.value;
      const allOpts = DATALIST_OPTS[dlId] || [];
      const filtered = val ? allOpts.filter(o => o.includes(val)) : allOpts;
      const dl = document.getElementById(dlId);
      if (dl) dl.innerHTML = filtered.map(v => `<option value="${v}">`).join('');
    });
  }
}

function fillForm(hk) {
  document.getElementById('f-gebaeude').value = hk.gebaeude || '';
  document.getElementById('f-geschoss').value = hk.geschoss || '';
  document.getElementById('f-raumnr').value = hk.raumnr || '';
  document.getElementById('f-raumbezeichnung').value = hk.raumbezeichnung || '';
  document.getElementById('f-hkNr').value = hk.hkNr || '';

  // Typ: Alte Werte migrieren
  let typ = hk.typ || '';
  if (typ === 'Flach-HK profiliert' || typ === 'Flach-HK glatt') typ = 'Kompakt-HK';
  else if (typ === 'Glieder') typ = 'Stahlglieder-HK';
  else if (typ === 'Konvektor') typ = 'Konvektoren';
  else if (typ === 'Bad') typ = 'Stahlröhren-HK';
  document.getElementById('f-typ').value = typ;

  // Subtyp: Alte artFlach-Werte übernehmen
  document.getElementById('f-subtyp').value = hk.subtyp || hk.artFlach || '';
  document.getElementById('f-konvektorBauart').value = hk.konvektorBauart || '';
  document.getElementById('f-baulaenge').value = hk.baulaenge || '';
  document.getElementById('f-bauhoehe').value = hk.bauhoehe || '';
  document.getElementById('f-anzahlRoehren').value = hk.anzahlRoehren || '';
  document.getElementById('f-anzahlGlieder').value = hk.anzahlGlieder || '';
  document.getElementById('f-nabenabstand').value = hk.nabenabstand || '';
  document.getElementById('f-dnVentil').value = hk.dnVentil || '';
  let vf = hk.ventilform || '';
  if (vf === 'Winkeleck li.' || vf === 'Winkeleck re.') vf = 'Winkeleck';
  document.getElementById('f-ventilform').value = vf;
  document.getElementById('f-artThermostatkopf').value = hk.artThermostatkopf || '';
  // Einbausituation: String → Checkboxen (mit Migration: "zugestellt"→"hinter Möbeln")
  const einbauStr = (hk.einbausituation || '').replace('zugestellt', 'hinter Möbeln');
  document.getElementById('f-einbau-verkleidung').checked = einbauStr.includes('hinter Verkleidung');
  document.getElementById('f-einbau-bruestung').checked = einbauStr.includes('unter Brüstung');
  document.getElementById('f-einbau-moebel').checked = einbauStr.includes('hinter Möbeln');
  document.getElementById('f-einbau-sonstige').checked = einbauStr.includes('sonstige');
  document.getElementById('f-strang').value = hk.strang || '';
  document.getElementById('f-bemerkung').value = hk.bemerkung || '';

  setToggle('f-hahnblock', hk.hahnblock);
  setToggle('f-rlVerschraubung', hk.rlVerschraubung);
  setToggle('f-entlueftung', hk.entlueftung);
  setToggle('f-entleerung', hk.entleerung);
  setToggle('f-ventilVoreinstellbar', hk.ventilVoreinstellbar);
  document.getElementById('f-ventilVoreinstellbarWert').value = hk.ventilVoreinstellbarWert || '';
  document.getElementById('group-ventilWert').style.display = hk.ventilVoreinstellbar ? 'block' : 'none';

  // Typabhängige Felder (inkl. Bauhöhen-Datalist)
  updateTypFields();

  // Fotos (dynamisch, min. 2 Slots)
  formPhotos = [null, null];
  if (hk.fotos && hk.fotos.length > 0) {
    formPhotos = hk.fotos.map(f => f || null);
    while (formPhotos.length < 2) formPhotos.push(null);
  }
  renderPhotoSlots();
  checkSonstigeHinweis();
}

function updateTypFields() {
  const typ = document.getElementById('f-typ').value;
  const groupSubtyp = document.getElementById('group-subtyp');
  const groupKonvektorBauart = document.getElementById('group-konvektorBauart');
  const groupRoehrenGlieder = document.getElementById('group-roehrenGlieder');
  const groupBaulaenge = document.getElementById('group-baulaenge');

  // Subtyp-Optionen je nach Typ füllen
  let subtypOptions = [];
  if (typ === 'Kompakt-HK') subtypOptions = CONFIG.subtypKompakt;
  else if (typ === 'Konvektoren') subtypOptions = CONFIG.subtypKonvektoren;

  const subtypSel = document.getElementById('f-subtyp');
  const curSubtyp = subtypSel.value;
  if (subtypOptions.length > 0) {
    fillSelect('f-subtyp', subtypOptions, 'Bauart');
    subtypSel.value = subtypOptions.includes(curSubtyp) ? curSubtyp : '';
    groupSubtyp.style.display = 'block';
  } else {
    subtypSel.value = '';
    groupSubtyp.style.display = 'none';
  }

  // Konvektor-Bauart: nur für Konvektoren
  if (typ === 'Konvektoren') {
    groupKonvektorBauart.style.display = 'block';
  } else {
    document.getElementById('f-konvektorBauart').value = '';
    groupKonvektorBauart.style.display = 'none';
  }

  // Röhren/Glieder: nur für Stahlröhren, Stahlglieder, Gussglieder
  const hasRoehren = ['Stahlröhren-HK', 'Stahlglieder-HK', 'Gussglieder-HK'].includes(typ);
  groupRoehrenGlieder.style.display = hasRoehren ? 'grid' : 'none';
  if (!hasRoehren) {
    document.getElementById('f-anzahlRoehren').value = '';
    document.getElementById('f-anzahlGlieder').value = '';
  }

  // Baulänge: ausblenden für Röhren-/Glieder-Typen (dort Gliederanzahl statt Länge)
  const hasBaulaenge = !hasRoehren;
  groupBaulaenge.style.display = hasBaulaenge ? 'block' : 'none';
  if (!hasBaulaenge) document.getElementById('f-baulaenge').value = '';

  // Bauhöhen-Datalist je nach Typ
  let bauhoeheOpts;
  if (typ === 'Kompakt-HK' || typ === 'Konvektoren') bauhoeheOpts = CONFIG.bauhoeheKompakt;
  else if (typ === 'Stahlröhren-HK') bauhoeheOpts = CONFIG.bauhoeheRoehren;
  else if (typ === 'Gussglieder-HK') bauhoeheOpts = CONFIG.bauhoeheGuss;
  else if (typ === 'Stahlglieder-HK') bauhoeheOpts = CONFIG.bauhoeheStahl;
  else bauhoeheOpts = [...CONFIG.bauhoeheKompakt, ...CONFIG.bauhoeheRoehren];
  fillDatalist('dl-bauhoehe', bauhoeheOpts);

  // Baulängen-Datalist
  fillDatalist('dl-baulaenge', CONFIG.baulaengeOpts);

  // Nabenabstand-Datalist
  fillDatalist('dl-nabenabstand', CONFIG.nabenabstandOpts);
}

function fillDatalist(id, opts) {
  const dl = document.getElementById(id);
  if (!dl) return;
  DATALIST_OPTS[id] = opts.map(String); // für Autocomplete-Filter speichern
  dl.innerHTML = opts.map(v => `<option value="${v}">`).join('');
}

function onBauhoeheChange() {
  const typ = document.getElementById('f-typ').value;
  const bh = parseInt(document.getElementById('f-bauhoehe').value);
  if (!bh) return;
  let map = null;
  if (typ === 'Gussglieder-HK') map = CONFIG.gussBANA;
  else if (typ === 'Stahlglieder-HK') map = CONFIG.stahlBANA;
  if (map && map[bh] !== undefined) {
    document.getElementById('f-nabenabstand').value = map[bh];
  }
}

function onNabenabstandChange() {
  const typ = document.getElementById('f-typ').value;
  const na = parseInt(document.getElementById('f-nabenabstand').value);
  if (!na) return;
  let map = null;
  if (typ === 'Gussglieder-HK') map = CONFIG.gussNaBA;
  else if (typ === 'Stahlglieder-HK') map = CONFIG.stahlNaBA;
  if (map && map[na] !== undefined) {
    document.getElementById('f-bauhoehe').value = map[na];
  }
}

function setToggle(name, value) {
  const el = document.getElementById(name);
  if (el) el.checked = !!value;
}

function getToggleValue(name) {
  const el = document.getElementById(name);
  return el ? el.checked : false;
}

// Felder, die als Standard übernommen werden (ohne Standort/HK-Nr/Bemerkung/Fotos)
const STANDARD_FIELDS = [
  'typ', 'subtyp', 'konvektorBauart',
  'nabenabstand', 'dnVentil', 'ventilform', 'einbausituation', 'strang',
  'artThermostatkopf', 'ventilVoreinstellbar', 'ventilVoreinstellbarWert'
];

function readFormIntoHk(hk) {
  hk.gebaeude = document.getElementById('f-gebaeude').value.trim();
  hk.geschoss = document.getElementById('f-geschoss').value.trim();
  hk.raumnr = document.getElementById('f-raumnr').value.trim();
  hk.raumbezeichnung = document.getElementById('f-raumbezeichnung').value.trim();
  hk.hkNr = document.getElementById('f-hkNr').value.trim();
  hk.typ = document.getElementById('f-typ').value;
  hk.subtyp = document.getElementById('f-subtyp').value;
  hk.konvektorBauart = document.getElementById('f-konvektorBauart').value;
  hk.baulaenge = document.getElementById('f-baulaenge').value;
  hk.bauhoehe = document.getElementById('f-bauhoehe').value;
  hk.anzahlRoehren = document.getElementById('f-anzahlRoehren').value;
  hk.anzahlGlieder = document.getElementById('f-anzahlGlieder').value.trim();
  hk.nabenabstand = document.getElementById('f-nabenabstand').value;
  hk.dnVentil = document.getElementById('f-dnVentil').value;
  hk.ventilform = document.getElementById('f-ventilform').value;
  hk.hahnblock = getToggleValue('f-hahnblock');
  hk.rlVerschraubung = getToggleValue('f-rlVerschraubung');
  hk.entlueftung = getToggleValue('f-entlueftung');
  hk.entleerung = getToggleValue('f-entleerung');
  hk.ventilVoreinstellbar = getToggleValue('f-ventilVoreinstellbar');
  hk.ventilVoreinstellbarWert = document.getElementById('f-ventilVoreinstellbarWert').value.trim();
  hk.artThermostatkopf = document.getElementById('f-artThermostatkopf').value;
  // Einbausituation: Checkboxen → komma-separierter String
  const einbauParts = [];
  if (document.getElementById('f-einbau-verkleidung').checked) einbauParts.push('hinter Verkleidung');
  if (document.getElementById('f-einbau-bruestung').checked) einbauParts.push('unter Brüstung');
  if (document.getElementById('f-einbau-moebel').checked) einbauParts.push('hinter Möbeln');
  if (document.getElementById('f-einbau-sonstige').checked) einbauParts.push('sonstige');
  hk.einbausituation = einbauParts.length > 0 ? einbauParts.join(', ') : 'normal';
  hk.strang = document.getElementById('f-strang').value.trim();
  hk.bemerkung = document.getElementById('f-bemerkung').value.trim();
  hk.fotos = formPhotos.filter(Boolean);
  hk.erfasser = localStorage.getItem('erfasser-name') || '';
  return hk;
}

function checkAndSaveStandard(hk) {
  const cb = document.getElementById('f-setStandard');
  if (cb && cb.checked) {
    const std = {};
    for (const f of STANDARD_FIELDS) std[f] = hk[f] || '';
    std.gebaeude = hk.gebaeude || '';
    std.geschoss = hk.geschoss || '';
    localStorage.setItem('hk-standard', JSON.stringify(std));
    cb.checked = false;
    showToast('Standard gespeichert');
  }
}

function getHkStandard() {
  const stored = localStorage.getItem('hk-standard');
  return stored ? JSON.parse(stored) : null;
}

async function saveForm() {
  const hk = currentHkId ? await getHeizkoerper(currentHkId) : newHeizkoerper(currentProjektId);
  readFormIntoHk(hk);
  checkAndSaveStandard(hk);

  await saveHeizkoerper(hk);
  await renderHkList();
  navigate('screen-hk-list');
  showToast('Heizkörper gespeichert');
}

async function saveAndNextRoom() {
  // Aktuellen HK speichern
  const hk = currentHkId ? await getHeizkoerper(currentHkId) : newHeizkoerper(currentProjektId);
  readFormIntoHk(hk);
  checkAndSaveStandard(hk);
  await saveHeizkoerper(hk);
  await renderHkList();

  // Neuer HK in neuem Raum: Standortdaten zurücksetzen, Typ/Daten behalten
  const nextHk = newHeizkoerper(currentProjektId);
  nextHk.gebaeude = hk.gebaeude;
  nextHk.geschoss = hk.geschoss;
  nextHk.raumnr = '';
  nextHk.raumbezeichnung = '';
  nextHk.hkNr = 1;
  nextHk.typ = hk.typ;
  nextHk.subtyp = hk.subtyp;
  nextHk.nabenabstand = hk.nabenabstand;
  nextHk.dnVentil = hk.dnVentil;
  nextHk.ventilform = hk.ventilform;
  nextHk.einbausituation = hk.einbausituation;
  nextHk.strang = hk.strang;
  nextHk.artThermostatkopf = hk.artThermostatkopf;
  nextHk.ventilVoreinstellbar = hk.ventilVoreinstellbar;
  nextHk.ventilVoreinstellbarWert = hk.ventilVoreinstellbarWert;

  currentHkId = null;
  document.getElementById('header-form-title').textContent = 'Neuer Heizkörper';
  document.getElementById('btn-delete-hk').style.display = 'none';
  fillForm(nextHk);
  window.scrollTo(0, 0);
  document.getElementById('f-raumnr').focus();
  showToast(`HK ${hk.hkNr} gespeichert → neuer Raum`);
}

async function saveAndNextHk() {
  // Aktuellen HK speichern
  const hk = currentHkId ? await getHeizkoerper(currentHkId) : newHeizkoerper(currentProjektId);
  readFormIntoHk(hk);
  checkAndSaveStandard(hk);
  await saveHeizkoerper(hk);
  await renderHkList();

  // Neuen HK im selben Raum anlegen mit gleichen Grunddaten
  const nextHk = newHeizkoerper(currentProjektId);
  nextHk.gebaeude = hk.gebaeude;
  nextHk.geschoss = hk.geschoss;
  nextHk.raumnr = hk.raumnr;
  nextHk.raumbezeichnung = hk.raumbezeichnung;
  nextHk.hkNr = (Number(hk.hkNr) || 0) + 1;
  nextHk.typ = hk.typ;
  nextHk.subtyp = hk.subtyp;
  nextHk.nabenabstand = hk.nabenabstand;
  nextHk.dnVentil = hk.dnVentil;
  nextHk.ventilform = hk.ventilform;
  nextHk.einbausituation = hk.einbausituation;
  nextHk.strang = hk.strang;

  currentHkId = null;
  document.getElementById('header-form-title').textContent = 'Neuer Heizkörper';
  document.getElementById('btn-delete-hk').style.display = 'none';
  fillForm(nextHk);
  window.scrollTo(0, 0);
  showToast(`HK ${hk.hkNr} gespeichert → HK ${nextHk.hkNr}`);
}

async function deleteCurrentHk() {
  if (!currentHkId) return;
  if (confirm('Heizkörper wirklich löschen?')) {
    await deleteHeizkoerper(currentHkId);
    await renderHkList();
    navigate('screen-hk-list');
    showToast('Heizkörper gelöscht');
  }
}

async function confirmDeleteHk(id) {
  const hk = await getHeizkoerper(id);
  if (confirm(`HK ${hk.hkNr || '-'} (${hk.geschoss || ''} / R${hk.raumnr || ''}) wirklich löschen?`)) {
    await deleteHeizkoerper(id);
    await renderHkList();
    showToast('Heizkörper gelöscht');
  }
}

// ── Fotos ──

function renderPhotoSlots() {
  const container = document.getElementById('photo-slots-container');
  if (!container) return;
  let html = '';
  for (let i = 0; i < formPhotos.length; i++) {
    if (formPhotos[i]) {
      html += `<div class="photo-slot" onclick="triggerPhoto(${i})">
        <img src="${formPhotos[i]}" alt="Foto ${i + 1}">
        <button class="remove-photo" onclick="event.stopPropagation(); removePhoto(${i})">&times;</button>
      </div>`;
    } else {
      html += `<div class="photo-slot" onclick="triggerPhoto(${i})">
        <div class="placeholder">Foto ${i + 1}</div>
      </div>`;
    }
  }
  // "+Foto"-Button
  html += `<div class="photo-slot photo-slot-add" onclick="addPhotoSlot()">
    <div class="placeholder" style="font-size:1.5rem">+</div>
  </div>`;
  container.innerHTML = html;
}

function addPhotoSlot() {
  formPhotos.push(null);
  const newIndex = formPhotos.length - 1;
  renderPhotoSlots();
  triggerPhoto(newIndex);
}

// ── Sonstige-Hinweis ──

function checkSonstigeHinweis() {
  const hinweis = document.getElementById('sonstige-foto-hinweis');
  if (!hinweis) return;
  const typ = document.getElementById('f-typ').value;
  const einbau = document.getElementById('f-einbausituation');
  const einbauSonstige = document.getElementById('f-einbau-sonstige');
  const thermo = document.getElementById('f-artThermostatkopf').value;
  const einbauIsSonstige = einbauSonstige ? einbauSonstige.checked : (einbau ? einbau.value === 'sonstige' : false);
  hinweis.style.display = (typ === 'Sonstige' || einbauIsSonstige || thermo === 'Sonstiges') ? 'block' : 'none';
}

let _cameraStream = null;
let _cameraIndex = 0;

async function triggerPhoto(index) {
  _cameraIndex = index;
  // Versuche getUserMedia für explizite Rückkamera (höhere Auflösung)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 4096 }, height: { ideal: 3072 } }
      });
      openCameraModal(stream);
      return;
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        showToast('Kamera-Berechtigung benötigt');
        return;
      }
      // Andere Fehler: Fallback auf File-Input (ohne capture-Attribut)
    }
  }
  const input = document.getElementById('photo-input');
  input.dataset.index = index;
  input.click();
}

function openCameraModal(stream) {
  _cameraStream = stream;
  const modal = document.getElementById('camera-modal');
  const video = document.getElementById('camera-preview');
  video.srcObject = stream;
  modal.style.display = 'flex';
}

function closeCameraModal() {
  if (_cameraStream) {
    _cameraStream.getTracks().forEach(t => t.stop());
    _cameraStream = null;
  }
  const modal = document.getElementById('camera-modal');
  modal.style.display = 'none';
  const video = document.getElementById('camera-preview');
  video.srcObject = null;
}

function captureFromStream() {
  const video = document.getElementById('camera-preview');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  closeCameraModal();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  compressImage(null, (compressed) => {
    formPhotos[_cameraIndex] = compressed;
    renderPhotoSlots();
  }, dataUrl);
}

function handlePhotoInput(input) {
  const file = input.files[0];
  if (!file) return;
  const index = parseInt(input.dataset.index);
  compressImage(file, (dataUrl) => {
    formPhotos[index] = dataUrl;
    renderPhotoSlots();
  });
  input.value = '';
}

function compressImage(file, callback, directDataUrl) {
  // Speicherung in hoher Qualität — Komprimierung erst beim Export/Versenden
  const MAX_BYTES = 3_000_000;  // 3 MB für Speicherung (statt 800KB)

  function processImage(src) {
    const img = new Image();
    img.onerror = () => {
      showToast('Foto konnte nicht geladen werden');
      renderPhotoSlots();
    };
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const maxW = 2560;  // Höhere Auflösung für Speicherung
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      // Leichte Komprimierung für Speicherung (hohe Qualität beibehalten)
      let quality = 0.92;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);

      while (bytes > MAX_BYTES && quality > 0.5) {
        quality -= 0.05;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
      }
      callback(dataUrl);
    };
    img.src = src;
  }

  if (directDataUrl) {
    processImage(directDataUrl);
  } else {
    const reader = new FileReader();
    reader.onerror = () => {
      showToast('Fehler beim Laden des Fotos');
      renderPhotoSlots();
    };
    reader.onload = (e) => processImage(e.target.result);
    reader.readAsDataURL(file);
  }
}

function removePhoto(index) {
  formPhotos[index] = null;
  renderPhotoSlots();
}

// ── Gebäudedaten-Import ──

function parseGebaeudedatenXlsx(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const result = {}; // Key=Liegenschaft (Sheet-Name), Value={gebaeude,geschoss,raum,raumDetails}

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    const gebaeude = new Set();
    const geschoss = new Set();
    const raum = new Set();
    const raumDetails = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] != null && String(row[0]).trim()) gebaeude.add(String(row[0]).trim());
      if (row[2] != null && String(row[2]).trim()) geschoss.add(String(row[2]).trim());
      if (row[4] != null && String(row[4]).trim()) {
        const rNr = String(row[4]).trim();
        raum.add(rNr);
        raumDetails[rNr] = {
          flaeche: row[5] != null ? String(row[5]).trim() : '',
          nutzung: row[6] != null ? String(row[6]).trim() : '',
          barcode: row[7] != null ? String(row[7]).trim() : ''
        };
      }
    }

    result[sheetName] = {
      gebaeude: [...gebaeude],
      geschoss: [...geschoss],
      raum: [...raum],
      raumDetails
    };
  }

  return result;
}

function importGebaeudedaten(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    allGebaeudeDaten = parseGebaeudedatenXlsx(e.target.result);
    localStorage.setItem('gebaeudedaten', JSON.stringify(allGebaeudeDaten));
    renderDatalists();
    const keys = Object.keys(allGebaeudeDaten);
    const totalRaeume = keys.reduce((s, k) => s + allGebaeudeDaten[k].raum.length, 0);
    showToast(`${keys.length} Liegenschaft(en), ${totalRaeume} Räume importiert`);
  };
  reader.readAsArrayBuffer(file);
  document.getElementById('file-gebaeudedaten').value = '';
}

async function fetchGebaeudedatenFromServer() {
  try {
    const resp = await fetch('gebaeudedaten.xlsx', { cache: 'no-cache' });
    if (!resp.ok) return false;
    const buf = await resp.arrayBuffer();
    allGebaeudeDaten = parseGebaeudedatenXlsx(buf);
    localStorage.setItem('gebaeudedaten', JSON.stringify(allGebaeudeDaten));
    renderDatalists();
    return true;
  } catch {
    return false;
  }
}

async function loadGebaeudedaten() {
  // Zuerst vom Server holen (immer aktuell)
  const fetched = await fetchGebaeudedatenFromServer();
  if (!fetched) {
    // Offline-Fallback: aus localStorage laden
    const stored = localStorage.getItem('gebaeudedaten');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Backwards-Compat: altes Format {gebaeude,...} → {Standard: {...}}
      if (parsed.gebaeude && Array.isArray(parsed.gebaeude)) {
        allGebaeudeDaten = { Standard: parsed };
      } else {
        allGebaeudeDaten = parsed;
      }
    } else {
      allGebaeudeDaten = {};
    }
    renderDatalists();
  }
}

function getActiveGebaeudeDaten() {
  if (currentLiegenschaft && allGebaeudeDaten[currentLiegenschaft]) {
    return allGebaeudeDaten[currentLiegenschaft];
  }
  // Fallback: erste verfügbare Liegenschaft
  const keys = Object.keys(allGebaeudeDaten);
  if (keys.length > 0) return allGebaeudeDaten[keys[0]];
  return { gebaeude: [], geschoss: [], raum: [], raumDetails: {} };
}

function renderDatalists() {
  const data = getActiveGebaeudeDaten();
  const dlGeb = document.getElementById('dl-gebaeude');
  const dlGes = document.getElementById('dl-geschoss');
  const dlRaum = document.getElementById('dl-raumnr');
  dlGeb.innerHTML = data.gebaeude.map(v => `<option value="${esc(v)}">`).join('');
  dlGes.innerHTML = data.geschoss.map(v => `<option value="${esc(v)}">`).join('');
  dlRaum.innerHTML = data.raum.map(v => `<option value="${esc(v)}">`).join('');
}

// ── Versand ──

function showSendDialog() {
  document.getElementById('modal-send').style.display = 'flex';
}

function closeSendDialog() {
  document.getElementById('modal-send').style.display = 'none';
}

async function sendData() {
  const hks = await getHeizkoerperByProjekt(currentProjektId);
  const projekt = await getProjekt(currentProjektId);
  if (hks.length === 0) {
    showToast('Keine Heizkörper zum Versenden');
    return;
  }

  hks.sort((a, b) =>
    (a.gebaeude || '').localeCompare(b.gebaeude || '') ||
    (a.geschoss || '').localeCompare(b.geschoss || '') ||
    (a.raumnr || '').localeCompare(b.raumnr || '') ||
    (Number(a.hkNr) || 0) - (Number(b.hkNr) || 0)
  );

  const safeName = sanitizeFilename(projekt.name);
  const subject = `HK-Aufnahme: ${projekt.name}`;
  const zipFileName = safeName + '_HK-Aufnahme.zip';

  // Empfänger sammeln
  const recipients = [];
  if (document.getElementById('send-r1').checked) recipients.push(document.getElementById('send-r1').value);
  if (document.getElementById('send-r2').checked) recipients.push(document.getElementById('send-r2').value);
  const r3check = document.getElementById('send-r3-check');
  const r3val = document.getElementById('send-r3').value.trim();
  if (r3check && r3check.checked && r3val) recipients.push(r3val);

  // ZIP erstellen (Fotos werden beim Export komprimiert)
  const zipBlob = await buildExportZip(hks, safeName);
  const zipFile = new File([zipBlob], zipFileName, { type: 'application/zip' });

  // Web Share API: Datei wird tatsächlich als Anhang geteilt
  if (navigator.canShare && navigator.canShare({ files: [zipFile] })) {
    try {
      const shareData = { title: subject, files: [zipFile] };
      // Empfänger-Info im Text mitgeben, falls vorhanden
      if (recipients.length > 0) {
        shareData.text = 'An: ' + recipients.join(', ') + '\n\nHK-Aufnahme als ZIP-Datei.';
      }
      await navigator.share(shareData);
      closeSendDialog();
      showToast('Daten versendet');
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  // Fallback: ZIP herunterladen, dann mailto mit Hinweis zum Anhängen
  downloadBlob(zipBlob, zipFileName);
  if (recipients.length > 0) {
    const body = 'Bitte die heruntergeladene Datei "' + zipFileName + '" an diese E-Mail anhängen.';
    const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  }
  closeSendDialog();
  showToast('ZIP heruntergeladen – bitte manuell an E-Mail anhängen');
}

async function buildExportZip(hks, safeName) {
  const data = [EXPORT_HEADERS, ...hks.map(hkToRow)];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = EXPORT_HEADERS.map((h, i) => ({
    wch: Math.max(h.length, ...hks.map(hk => String(hkToRow(hk)[i] || '').length), 10)
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HK-Aufnahme');
  const xlsxBytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  const zipFiles = [{ name: safeName + '_HK-Aufnahme.xlsx', data: new Uint8Array(xlsxBytes) }];
  for (const hk of hks) {
    if (!hk.fotos) continue;
    for (let i = 0; i < hk.fotos.length; i++) {
      if (hk.fotos[i]) {
        const compressed = await compressForExport(hk.fotos[i]);
        zipFiles.push({ name: fotoFilename(hk, i), data: compressed });
      }
    }
  }
  const zipData = buildZip(zipFiles);
  return new Blob([zipData], { type: 'application/zip' });
}

// ── Dropdown füllen ──

function populateDropdowns() {
  fillSelect('f-typ', CONFIG.typ, 'Typ');
  fillSelect('f-anzahlRoehren', CONFIG.anzahlRoehren.map(String), 'Anz. Röhren');
  fillDatalist('dl-dnVentil', CONFIG.dnVentil);
  fillSelect('f-ventilform', CONFIG.ventilform, 'Ventilform');
  fillSelect('f-artThermostatkopf', CONFIG.artThermostatkopf, 'Thermostatkopf');
  // Datalists werden in updateTypFields befüllt
  fillDatalist('dl-baulaenge', CONFIG.baulaengeOpts);
  fillDatalist('dl-nabenabstand', CONFIG.nabenabstandOpts);
}

function fillSelect(id, options, label) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">Bitte wählen</option>`;
  for (const opt of options) {
    sel.innerHTML += `<option value="${esc(opt)}">${esc(opt)}</option>`;
  }
}

// ── Hilfsfunktionen ──

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Hilfe-Bild Modal ──

let _helpPinchHandlers = null;

function openHelpImage(src, title) {
  document.getElementById('help-image-title').textContent = title || 'Hilfe';
  const img = document.getElementById('help-image-img');
  img.src = src;
  img.alt = title || 'Hilfe';
  img.classList.remove('zoomed');
  img.style.width = '';
  img.style.maxWidth = '';
  document.getElementById('modal-help-image').style.display = 'flex';
  // Tipp zum Umschalten zwischen Normal/Zoom
  img.onclick = () => {
    if (img.style.width) {
      // nach Pinch-Zoom: zurücksetzen
      img.style.width = '';
      img.style.maxWidth = '';
    } else {
      img.classList.toggle('zoomed');
    }
  };
  setupHelpImagePinchZoom(img);
}

function setupHelpImagePinchZoom(img) {
  const body = img.parentElement;
  // Alte Handler entfernen
  if (_helpPinchHandlers) {
    body.removeEventListener('touchstart', _helpPinchHandlers.start);
    body.removeEventListener('touchmove', _helpPinchHandlers.move);
    _helpPinchHandlers = null;
  }

  let startDist = 0;
  let startWidth = 0;

  function onStart(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      startDist = Math.sqrt(dx * dx + dy * dy);
      startWidth = img.offsetWidth;
      e.preventDefault();
    }
  }

  function onMove(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / startDist;
      const maxW = body.offsetWidth * 4;
      const minW = body.offsetWidth * 0.8;
      const newW = Math.max(minW, Math.min(maxW, startWidth * scale));
      img.style.width = newW + 'px';
      img.style.maxWidth = 'none';
      img.classList.remove('zoomed');
      e.preventDefault();
    }
  }

  _helpPinchHandlers = { start: onStart, move: onMove };
  body.addEventListener('touchstart', onStart, { passive: false });
  body.addEventListener('touchmove', onMove, { passive: false });
}

function closeHelpImage() {
  document.getElementById('modal-help-image').style.display = 'none';
  const img = document.getElementById('help-image-img');
  img.classList.remove('zoomed');
  img.style.width = '';
  img.style.maxWidth = '';
}

// ── Hilfe / README ──

const README_URL = 'https://raw.githubusercontent.com/e1felixr/heizkoerper/main/README.md';

function openHelp() {
  navigate('screen-help');
  // Default: Kurzanleitung zeigen
  document.getElementById('help-quick').style.display = 'block';
  document.getElementById('help-detail').style.display = 'none';
}

function toggleDetailHelp() {
  const quick = document.getElementById('help-quick');
  const detail = document.getElementById('help-detail');
  if (detail.style.display === 'none') {
    detail.style.display = 'block';
    quick.style.display = 'none';
    // README laden falls noch nicht geladen
    const cached = localStorage.getItem('readme-cache');
    if (cached) renderReadme(cached);
    fetchReadme(false);
  } else {
    detail.style.display = 'none';
    quick.style.display = 'block';
  }
}

async function fetchReadme(showToastOnSuccess) {
  try {
    const resp = await fetch(README_URL, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('Fetch failed');
    const md = await resp.text();
    localStorage.setItem('readme-cache', md);
    renderReadme(md);
    if (showToastOnSuccess) showToast('Anleitung aktualisiert');
  } catch {
    if (!localStorage.getItem('readme-cache')) {
      document.getElementById('help-content').innerHTML =
        '<p style="color:var(--text-sec)">Anleitung konnte nicht geladen werden. Bitte online gehen und erneut versuchen.</p>';
    }
  }
}

function renderReadme(md) {
  // Minimaler Markdown → HTML Konverter
  let html = esc_md(md)
    // Code-Blöcke (```…```)
    .replace(/```[\w]*\n([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trimEnd()}</code></pre>`)
    // Tabellen (einfach, Header + Rows)
    .replace(/(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)*)/g, mdTable)
    // Überschriften
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Checkbox-Listenpunkte
    .replace(/^- \[ \] (.+)$/gm, '<li class="cb-open">&#9744; $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="cb-done">&#9745; $1</li>')
    // Ungeordnete Listen
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Aufeinanderfolgende <li> in <ul> wrappen
    .replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, m => `<ul>${m}</ul>`)
    // Fett
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Kursiv
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline-Code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Horizontale Linie
    .replace(/^---+$/gm, '<hr>')
    // Leerzeilen → Absätze (nur zwischen nicht-Block-Elementen)
    .replace(/\n{2,}/g, '\n<br>\n');

  document.getElementById('help-content').innerHTML = html;
}

function esc_md(str) {
  // Nur HTML-Sonderzeichen escapen, die nicht Teil von Markdown-Syntax sind
  // Wir escapen < und > außerhalb von bereits verarbeiteten Tags
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mdTable(match) {
  const lines = match.trim().split('\n').filter(l => !l.match(/^[\|:\- ]+$/));
  let html = '<table class="md-table">';
  lines.forEach((line, i) => {
    const cells = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1);
    const tag = i === 0 ? 'th' : 'td';
    html += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
  });
  return html + '</table>';
}

// ── Einstellungen ──

function loadSettings() {
  const fontSize = localStorage.getItem('ui-font-size') || '13';
  const fieldPadding = localStorage.getItem('ui-field-padding') || '10';
  const erfasser = localStorage.getItem('erfasser-name') || '';

  document.documentElement.style.setProperty('--ui-font-size', fontSize + 'px');
  document.documentElement.style.setProperty('--ui-field-padding', fieldPadding + 'px');

  settingsReady = !!erfasser;
  return { fontSize, fieldPadding, erfasser };
}

function openSettings() {
  const s = loadSettings();
  document.getElementById('set-erfasser').value = s.erfasser;
  document.getElementById('set-fontsize').value = s.fontSize;
  document.getElementById('val-fontsize').textContent = s.fontSize + 'px';
  document.getElementById('set-fieldpadding').value = s.fieldPadding;
  document.getElementById('val-fieldpadding').textContent = s.fieldPadding + 'px';

  // Abbrechen-Button ausblenden wenn Erfasser noch nicht gesetzt (Pflicht)
  document.getElementById('btn-settings-cancel').style.display = settingsReady ? '' : 'none';

  navigate('screen-settings');
}

function saveSettings() {
  const erfasser = document.getElementById('set-erfasser').value.trim();
  if (!erfasser) {
    showToast('Bitte Erfasser-Name eingeben');
    document.getElementById('set-erfasser').focus();
    return;
  }
  const fontSize = document.getElementById('set-fontsize').value;
  const fieldPadding = document.getElementById('set-fieldpadding').value;

  localStorage.setItem('erfasser-name', erfasser);
  localStorage.setItem('ui-font-size', fontSize);
  localStorage.setItem('ui-field-padding', fieldPadding);

  loadSettings();
  navigate('screen-projekte');
  showToast('Einstellungen gespeichert');
}

async function resetAllData() {
  if (!confirm('ACHTUNG: Alle Projekte, Heizkörper und Gebäudedaten werden unwiderruflich gelöscht!\n\nFortfahren?')) return;
  if (!confirm('Wirklich ALLE Daten löschen? Dies kann nicht rückgängig gemacht werden!')) return;

  // IndexedDB löschen
  const projekte = await getAllProjekte();
  for (const p of projekte) {
    await deleteProjekt(p.id);
  }
  localStorage.removeItem('gebaeudedaten');

  currentProjektId = null;
  allGebaeudeDaten = {};
  currentLiegenschaft = null;
  await renderProjekte();
  navigate('screen-projekte');
  showToast('Alle Daten gelöscht');
}

function initSettingsSliders() {
  const fontSlider = document.getElementById('set-fontsize');
  const paddingSlider = document.getElementById('set-fieldpadding');

  fontSlider.addEventListener('input', () => {
    const v = fontSlider.value;
    document.getElementById('val-fontsize').textContent = v + 'px';
    document.documentElement.style.setProperty('--ui-font-size', v + 'px');
  });

  paddingSlider.addEventListener('input', () => {
    const v = paddingSlider.value;
    document.getElementById('val-fieldpadding').textContent = v + 'px';
    document.documentElement.style.setProperty('--ui-field-padding', v + 'px');
  });
}

// ── Init ──

document.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  initSettingsSliders();
  document.getElementById('header-version').textContent = APP_VERSION;
  document.getElementById('header-timestamp').textContent = 'letzte Änderung: ' + APP_BUILD_DATE;

  await openDB();
  populateDropdowns();
  setupDatalistFilters();
  await loadGebaeudedaten();
  await renderProjekte();

  // Event-Listener für Typ-Dropdown
  document.getElementById('f-typ').addEventListener('change', () => { updateTypFields(); checkSonstigeHinweis(); });
  document.getElementById('f-artThermostatkopf').addEventListener('change', checkSonstigeHinweis);

  // Raumnummer-Änderung: Nutzung aus Gebäudedaten als Raumbezeichnung vorschlagen
  document.getElementById('f-raumnr').addEventListener('change', () => {
    const rNr = document.getElementById('f-raumnr').value.trim();
    const data = getActiveGebaeudeDaten();
    const details = data.raumDetails && data.raumDetails[rNr];
    if (details && details.nutzung) {
      document.getElementById('f-raumbezeichnung').value = details.nutzung;
    } else {
      document.getElementById('f-raumbezeichnung').value = '';
    }
  });

  // Filter
  document.getElementById('filter-text').addEventListener('input', renderHkList);

  // Enter in Projekt-Name -> erstellen
  document.getElementById('input-projekt-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createNewProjekt();
  });

  // Wenn kein Erfasser-Name gesetzt -> Settings erzwingen
  if (!settingsReady) {
    openSettings();
    return;
  }

  // Startseite oder Hash-Navigation
  const hash = location.hash.replace('#', '');
  if (hash) {
    navigate(hash, false);
  }
});

// ── Service Worker Registrierung ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ── Automatischer Versionscheck beim Start ──
async function checkForUpdate() {
  try {
    const resp = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!resp.ok) return;
    const data = await resp.json();
    if (data.version && data.version !== APP_VERSION) {
      console.log(`Update verfügbar: ${APP_VERSION} → ${data.version}`);
      await forceUpdate();
    }
  } catch {
    // Offline oder Fehler - kein Update möglich, weiter mit aktueller Version
  }
}

async function forceUpdate() {
  // 1. Service Worker Cache komplett löschen
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
  // 2. Service Worker deregistrieren
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }
  // 3. Seite komplett neu laden (vom Server)
  window.location.reload();
}

// Versionscheck 2 Sekunden nach Start (damit UI sofort da ist)
setTimeout(checkForUpdate, 2000);
