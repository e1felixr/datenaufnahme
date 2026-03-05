// app.js - Hauptlogik, Navigation, Event-Handling

const APP_VERSION = 'v3.6';
const APP_BUILD_DATE = '05.03.2026 22:06'; // wird nach Commit aktualisiert

// ── Dropdown-Konfiguration (HK) ──
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

// ── Leuchtmittel-Datenbank ──
// ballast: 'both' = KVG/VVG + EVG, 'evg' = nur EVG, 'vvg' = nur KVG/VVG
const LEUCHTMITTEL_DB = {
  t5: [
    { w: 8, mm: 288 }, { w: 14, mm: 549 }, { w: 21, mm: 849 }, { w: 24, mm: 549 },
    { w: 28, mm: 1149 }, { w: 35, mm: 1449 }, { w: 39, mm: 849 },
    { w: 49, mm: 1149 }, { w: 54, mm: 1149 }, { w: 80, mm: 1449 }
  ],
  t8: [
    { w: 18, mm: 604 }, { w: 30, mm: 909 }, { w: 36, mm: 1213 },
    { w: 38, mm: 1047 }, { w: 58, mm: 1514 },
    { w: 65, mm: 1514, vvgOnly: true }  // ehemals T12, nur KVG/VVG
  ],
  dulux: {
    'Dulux S':   { wendel: 'S', evg: false, wattages: [5, 7, 9, 11] },
    'Dulux S/E': { wendel: 'S', evg: true,  wattages: [5, 7, 9, 11] },
    'Dulux D':   { wendel: 'D', evg: false, wattages: [10, 13, 18, 26] },
    'Dulux D/E': { wendel: 'D', evg: true,  wattages: [10, 13, 18, 26] },
    'Dulux T':   { wendel: 'T', evg: false, wattages: [13, 18, 26] },
    'Dulux T/E': { wendel: 'T', evg: true,  wattages: [13, 18, 26, 32, 42] },
    'Dulux F':   { wendel: null, evg: false, wattages: [18, 24, 36] },
    'Dulux L':   { wendel: null, evg: null, wattages: [18, 24, 36, 40, 55, 80] }  // 2G11: beide Vorschaltgeräte möglich
  },
  sonstige: {
    'T5 Ring': { entries: [{ w: 22, mm: 216 }, { w: 40, mm: 300 }] },
    'MR11':    { wattages: [20, 35] },
    'MR16':    { wattages: [20, 35, 50] },
    'GU10':    { wattages: [35, 50] },
    'SQ28':    { wattages: [21, 28, 38] },
    'HQI/HIT': { wattages: [70, 100, 150, 250, 400, 1000, 2000], freeInput: true }
  }
};

let currentProjektId = null;
let currentProjektModul = 'beleuchtung'; // 'hk' | 'beleuchtung' | 'beides'
let currentHkId = null;
let currentBelId = null;
let formPhotos = [null, null];
let belFormPhotos = [null, null];
let settingsReady = false;
let allGebaeudeDaten = {};
let currentLiegenschaft = null;
let newHkBaseData = null;
let newBelBaseData = null;
const DATALIST_OPTS = {};

// ── Navigation ──

function navigate(screen, pushState = true) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screen).classList.add('active');
  if (pushState) {
    const hash = screen === 'screen-projekte' ? '' : screen;
    history.pushState({ screen }, '', hash ? '#' + hash : window.location.pathname);
  }
  sessionStorage.setItem('currentScreen', screen);
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

// ── Theme Switching ──

function applyModuleTheme(modulType) {
  const html = document.documentElement;
  if (modulType === 'hk') {
    html.style.setProperty('--module-color', '#FF6633');
    html.style.setProperty('--module-color-light', '#FFF3E0');
    html.style.setProperty('--module-color-dark', '#E65100');
    html.style.setProperty('--module-text', '#fff');
    html.dataset.theme = 'hk';
  } else if (modulType === 'beleuchtung') {
    html.style.setProperty('--module-color', '#FFCC00');
    html.style.setProperty('--module-color-light', '#FFF9C4');
    html.style.setProperty('--module-color-dark', '#B8860B');
    html.style.setProperty('--module-text', '#000');
    html.dataset.theme = 'bel';
  } else {
    // beides: blau
    html.style.setProperty('--module-color', '#1565C0');
    html.style.setProperty('--module-color-light', '#E3F2FD');
    html.style.setProperty('--module-color-dark', '#0D47A1');
    html.style.setProperty('--module-text', '#fff');
    html.dataset.theme = 'beides';
  }
}

// ── Modul-Toggle im Projekt-Dialog ──

function setModulToggle(val) {
  document.getElementById('input-projekt-modul').value = val;
  document.querySelectorAll('.modul-toggle-btn').forEach(btn => {
    btn.className = 'modul-toggle-btn';
    if (btn.dataset.modul === val) {
      if (val === 'hk') btn.classList.add('active-hk');
      else if (val === 'beleuchtung') btn.classList.add('active-bel');
      else btn.classList.add('active-beides');
    }
  });
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
    const bels = await getBeleuchtungByProjekt(p.id);
    const datum = new Date(p.erstelltAm).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const modul = p.modulType || 'hk';
    const modulLabel = modul === 'hk' ? 'HK' : modul === 'beleuchtung' ? 'BEL' : 'HK+BEL';
    let countInfo = '';
    if (modul === 'hk') countInfo = `${hks.length} HK`;
    else if (modul === 'beleuchtung') countInfo = `${bels.length} Leuchten`;
    else countInfo = `${hks.length} HK, ${bels.length} BEL`;
    html += `
      <div class="card" data-id="${p.id}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="flex:1;cursor:pointer" onclick="openProjekt('${p.id}')">
            <div class="card-title">${esc(p.name)} <span class="badge">${modulLabel}</span></div>
            <div class="card-sub">${datum} &middot; ${countInfo}</div>
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
  const keys = Object.keys(allGebaeudeDaten);
  document.getElementById('dl-liegenschaften').innerHTML = keys.map(k => `<option value="${esc(k)}">`).join('');
  if (keys.length === 1) inp.value = keys[0];
  setModulToggle('beleuchtung');
  inp.focus();
}

function closeNewProjektDialog() {
  document.getElementById('modal-new-projekt').style.display = 'none';
}

async function createNewProjekt() {
  const name = document.getElementById('input-projekt-name').value.trim();
  if (!name) return;
  // Liegenschaft = Name, wenn in Gebäudedaten vorhanden; sonst leer (freie Eingabe)
  const liegenschaft = allGebaeudeDaten[name] ? name : '';
  const modulType = document.getElementById('input-projekt-modul').value || 'beleuchtung';
  await createProjekt(name, liegenschaft, modulType);
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
  currentProjektModul = p.modulType || 'hk';
  document.getElementById('header-projekt-name').textContent = p.name;
  currentLiegenschaft = p.liegenschaft || null;
  applyModuleTheme(currentProjektModul);
  renderDatalists();
  await renderHkList();
  navigate('screen-hk-list');
}

async function confirmDeleteProjekt(id) {
  const p = await getProjekt(id);
  if (confirm(`Projekt "${p.name}" und alle Daten wirklich löschen?`)) {
    await deleteProjekt(id);
    await renderProjekte();
    showToast('Projekt gelöscht');
  }
}

// ── FAB Button ──

function onFabAdd() {
  if (currentProjektModul === 'hk') {
    openHkForm();
  } else if (currentProjektModul === 'beleuchtung') {
    openBelForm();
  } else {
    // beides: Auswahl-Dialog
    document.getElementById('modal-fab-choice').style.display = 'flex';
  }
}

// ── Liste (HK + Beleuchtung) ──

async function renderHkList() {
  const list = document.getElementById('hk-list');
  const showHk = currentProjektModul === 'hk' || currentProjektModul === 'beides';
  const showBel = currentProjektModul === 'beleuchtung' || currentProjektModul === 'beides';

  let hks = showHk ? await getHeizkoerperByProjekt(currentProjektId) : [];
  let bels = showBel ? await getBeleuchtungByProjekt(currentProjektId) : [];

  const filterText = document.getElementById('filter-text')?.value?.toLowerCase() || '';
  const filterFn = item =>
    (item.gebaeude || '').toLowerCase().includes(filterText) ||
    (item.geschoss || '').toLowerCase().includes(filterText) ||
    (item.raumnr || '').toLowerCase().includes(filterText) ||
    (item.raumbezeichnung || '').toLowerCase().includes(filterText);

  if (filterText) {
    hks = hks.filter(filterFn);
    bels = bels.filter(filterFn);
  }

  const sortMode = document.getElementById('sort-select')?.value || 'raumnr';
  let sortFn;
  if (sortMode === 'datum') {
    sortFn = (a, b) => (b.erstelltAm || '').localeCompare(a.erstelltAm || '');
  } else if (sortMode === 'gebaeude') {
    sortFn = (a, b) =>
      (a.gebaeude || '').localeCompare(b.gebaeude || '') ||
      (a.geschoss || '').localeCompare(b.geschoss || '') ||
      (a.raumnr || '').localeCompare(b.raumnr || '');
  } else if (sortMode === 'geschoss') {
    sortFn = (a, b) =>
      (a.geschoss || '').localeCompare(b.geschoss || '') ||
      (a.raumnr || '').localeCompare(b.raumnr || '') ||
      (a.gebaeude || '').localeCompare(b.gebaeude || '');
  } else {
    sortFn = (a, b) =>
      (a.raumnr || '').localeCompare(b.raumnr || '') ||
      (a.geschoss || '').localeCompare(b.geschoss || '') ||
      (a.gebaeude || '').localeCompare(b.gebaeude || '');
  }

  hks.sort((a, b) => sortFn(a, b) || (Number(a.hkNr) || 0) - (Number(b.hkNr) || 0));
  bels.sort((a, b) => sortFn(a, b) || (Number(a.gruppenNr) || 0) - (Number(b.gruppenNr) || 0));

  // Count
  const allItems = [...hks, ...bels];
  const raumCount = new Set(allItems.map(i => `${i.gebaeude}|${i.geschoss}|${i.raumnr}`)).size;
  let countText = `${raumCount} Räume`;
  if (showHk) countText += `, ${hks.length} HK`;
  if (showBel) countText += `, ${bels.length} Leuchtengruppen`;
  document.getElementById('hk-count').textContent = countText;

  if (allItems.length === 0) {
    const icon = showBel ? '&#128161;' : '&#128293;';
    const label = showBel ? 'Leuchtengruppen' : 'Heizkörper';
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">${icon}</div>
        <p>Noch keine ${label} erfasst.<br>Tippen Sie auf + um einen hinzuzufügen.</p>
      </div>`;
    return;
  }

  // Nach Raum gruppieren (HK + BEL zusammen)
  const rooms = [];
  const roomMap = new Map();
  for (const item of [...hks.map(h => ({...h, _type: 'hk'})), ...bels.map(b => ({...b, _type: 'bel'}))]) {
    const key = `${item.gebaeude || ''}|${item.geschoss || ''}|${item.raumnr || ''}`;
    if (!roomMap.has(key)) {
      const room = { gebaeude: item.gebaeude, geschoss: item.geschoss, raumnr: item.raumnr, raumbezeichnung: item.raumbezeichnung, hks: [], bels: [] };
      roomMap.set(key, room);
      rooms.push(room);
    }
    const room = roomMap.get(key);
    if (item._type === 'hk') room.hks.push(item);
    else room.bels.push(item);
    if (item.raumbezeichnung && !room.raumbezeichnung) room.raumbezeichnung = item.raumbezeichnung;
  }

  // Rooms sortieren (gleiche Sortierung wie items)
  if (sortMode === 'datum') {
    // Bei Datum: Raum mit neuestem Eintrag zuerst
    const roomNewest = new Map();
    for (const item of [...hks, ...bels]) {
      const key = `${item.gebaeude || ''}|${item.geschoss || ''}|${item.raumnr || ''}`;
      const cur = roomNewest.get(key) || '';
      if ((item.erstelltAm || '') > cur) roomNewest.set(key, item.erstelltAm || '');
    }
    rooms.sort((a, b) => {
      const ka = `${a.gebaeude || ''}|${a.geschoss || ''}|${a.raumnr || ''}`;
      const kb = `${b.gebaeude || ''}|${b.geschoss || ''}|${b.raumnr || ''}`;
      return (roomNewest.get(kb) || '').localeCompare(roomNewest.get(ka) || '');
    });
  } else {
    rooms.sort((a, b) => sortFn(a, b));
  }

  let html = '';
  for (const room of rooms) {
    const info = [room.gebaeude, room.geschoss, room.raumnr ? 'Raum ' + room.raumnr : ''].filter(Boolean).join(' / ');
    const label = room.raumbezeichnung ? ' · ' + esc(room.raumbezeichnung) : '';
    html += `<div class="card room-card">
      <div class="room-header">${esc(info)}${label}</div>
      <div class="room-items">`;

    // HK Chips
    for (const hk of room.hks) {
      const fotoCount = hk.fotos ? hk.fotos.filter(Boolean).length : 0;
      const chipFotos = fotoCount > 0 ? `<span class="chip-fotos">${'📷'.repeat(fotoCount)}</span>` : '';
      html += `
        <div class="room-hk-chip" onclick="openHkForm('${hk.id}')">
          <span class="room-hk-nr">HK ${esc(String(hk.hkNr || '-'))}</span>
          ${hk.typ ? `<span class="badge" style="background:#FFF3E0;color:#E65100">${esc(hk.typ)}</span>` : ''}
          ${chipFotos}
          <button class="room-hk-del" onclick="event.stopPropagation();confirmDeleteHk('${hk.id}')" title="Löschen">&times;</button>
        </div>`;
    }

    // BEL Chips
    for (const bel of room.bels) {
      const fotoCount = bel.fotos ? bel.fotos.filter(Boolean).length : 0;
      const chipFotos = fotoCount > 0 ? `<span class="chip-fotos">${'📷'.repeat(fotoCount)}</span>` : '';
      const lmInfo = bel.leuchtmittelTyp || bel.leuchtmittelKategorie || '';
      const artInfo = bel.leuchtenart || '';
      html += `
        <div class="room-bel-chip" onclick="openBelForm('${bel.id}')">
          <span class="room-bel-nr">${esc(artInfo || 'BEL')}</span>
          ${lmInfo ? `<span class="badge" style="background:#FFF9C4;color:#B8860B">${esc(lmInfo)}</span>` : ''}
          ${chipFotos}
          <button class="room-bel-del" onclick="event.stopPropagation();confirmDeleteBel('${bel.id}')" title="Löschen">&times;</button>
        </div>`;
    }

    html += `</div></div>`;
  }
  list.innerHTML = html;
}

// ── HK Erfassungsformular ──

async function openHkForm(hkId) {
  currentHkId = hkId || null;
  currentBelId = null;
  let hk;

  // Sektionen anzeigen/verstecken
  document.getElementById('hk-form-section').style.display = 'block';
  document.getElementById('bel-form-section').style.display = 'none';

  if (hkId) {
    hk = await getHeizkoerper(hkId);
    document.getElementById('header-form-title').textContent = 'HK bearbeiten';
    document.getElementById('btn-delete-hk').style.display = 'inline-flex';
    document.getElementById('new-hk-mode-toggle').style.display = 'none';
  } else {
    const std = getHkStandard();
    const last = await getLastHeizkoerper(currentProjektId);
    const defaults = std || last;
    hk = newHeizkoerper(currentProjektId, defaults ? {
      gebaeude: defaults.gebaeude,
      geschoss: defaults.geschoss,
      raumnr: last ? last.raumnr : ''
    } : null);
    if (defaults) {
      for (const f of STANDARD_FIELDS) {
        hk[f] = defaults[f] || '';
      }
    }
    const all = await getHeizkoerperByProjekt(currentProjektId);
    const maxNr = all.reduce((max, h) => Math.max(max, Number(h.hkNr) || 0), 0);
    hk.hkNr = maxNr + 1;
    document.getElementById('header-form-title').textContent = 'Neuer Heizkörper';
    document.getElementById('btn-delete-hk').style.display = 'none';

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

  let typ = hk.typ || '';
  if (typ === 'Flach-HK profiliert' || typ === 'Flach-HK glatt') typ = 'Kompakt-HK';
  else if (typ === 'Glieder') typ = 'Stahlglieder-HK';
  else if (typ === 'Konvektor') typ = 'Konvektoren';
  else if (typ === 'Bad') typ = 'Stahlröhren-HK';
  document.getElementById('f-typ').value = typ;

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

  updateTypFields();

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

  if (typ === 'Konvektoren') {
    groupKonvektorBauart.style.display = 'block';
  } else {
    document.getElementById('f-konvektorBauart').value = '';
    groupKonvektorBauart.style.display = 'none';
  }

  const hasRoehren = ['Stahlröhren-HK', 'Stahlglieder-HK', 'Gussglieder-HK'].includes(typ);
  groupRoehrenGlieder.style.display = hasRoehren ? 'grid' : 'none';
  if (!hasRoehren) {
    document.getElementById('f-anzahlRoehren').value = '';
    document.getElementById('f-anzahlGlieder').value = '';
  }

  const hasBaulaenge = !hasRoehren;
  groupBaulaenge.style.display = hasBaulaenge ? 'block' : 'none';
  if (!hasBaulaenge) document.getElementById('f-baulaenge').value = '';

  let bauhoeheOpts;
  if (typ === 'Kompakt-HK' || typ === 'Konvektoren') bauhoeheOpts = CONFIG.bauhoeheKompakt;
  else if (typ === 'Stahlröhren-HK') bauhoeheOpts = CONFIG.bauhoeheRoehren;
  else if (typ === 'Gussglieder-HK') bauhoeheOpts = CONFIG.bauhoeheGuss;
  else if (typ === 'Stahlglieder-HK') bauhoeheOpts = CONFIG.bauhoeheStahl;
  else bauhoeheOpts = [...CONFIG.bauhoeheKompakt, ...CONFIG.bauhoeheRoehren];
  fillDatalist('dl-bauhoehe', bauhoeheOpts);
  fillDatalist('dl-baulaenge', CONFIG.baulaengeOpts);
  fillDatalist('dl-nabenabstand', CONFIG.nabenabstandOpts);
}

function fillDatalist(id, opts) {
  const dl = document.getElementById(id);
  if (!dl) return;
  DATALIST_OPTS[id] = opts.map(String);
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
  const hk = currentHkId ? await getHeizkoerper(currentHkId) : newHeizkoerper(currentProjektId);
  readFormIntoHk(hk);
  checkAndSaveStandard(hk);
  await saveHeizkoerper(hk);
  await renderHkList();

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
  const hk = currentHkId ? await getHeizkoerper(currentHkId) : newHeizkoerper(currentProjektId);
  readFormIntoHk(hk);
  checkAndSaveStandard(hk);
  await saveHeizkoerper(hk);
  await renderHkList();

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

// ── Beleuchtungs-Formular ──

async function openBelForm(belId) {
  currentBelId = belId || null;
  currentHkId = null;
  let bel;

  document.getElementById('hk-form-section').style.display = 'none';
  document.getElementById('bel-form-section').style.display = 'block';

  if (belId) {
    bel = await getBeleuchtung(belId);
    document.getElementById('header-form-title').textContent = 'Beleuchtung bearbeiten';
    document.getElementById('btn-delete-bel').style.display = 'inline-flex';
    document.getElementById('new-hk-mode-toggle').style.display = 'none';
  } else {
    const last = await getLastBeleuchtung(currentProjektId);
    const defaults = last ? {
      gebaeude: last.gebaeude,
      geschoss: last.geschoss,
      raumnr: last.raumnr,
      raumdecke: last.raumdecke,
      installationsart: last.installationsart,
      installationsartSub: last.installationsartSub,
      leuchtenart: last.leuchtenart,
      leuchtmittelKategorie: last.leuchtmittelKategorie,
      vorschaltgeraet: last.vorschaltgeraet
    } : null;
    bel = newBeleuchtung(currentProjektId, defaults);

    const all = await getBeleuchtungByProjekt(currentProjektId);
    const maxNr = all.reduce((max, b) => Math.max(max, Number(b.gruppenNr) || 0), 0);
    bel.gruppenNr = maxNr + 1;
    document.getElementById('header-form-title').textContent = 'Neue Leuchte';
    document.getElementById('btn-delete-bel').style.display = 'none';

    newBelBaseData = {
      lastRaumnr: last ? (last.raumnr || '') : '',
      lastRaumbezeichnung: last ? (last.raumbezeichnung || '') : '',
      nextGruppenNr: maxNr + 1
    };
    const toggle = document.getElementById('new-hk-mode-toggle');
    toggle.style.display = last ? 'block' : 'none';
    document.getElementById('btn-mode-same-room').classList.add('active');
    document.getElementById('btn-mode-new-room').classList.remove('active');
  }

  fillBelForm(bel);
  navigate('screen-form');
}

function fillBelForm(bel) {
  document.getElementById('f-gebaeude').value = bel.gebaeude || '';
  document.getElementById('f-geschoss').value = bel.geschoss || '';
  document.getElementById('f-raumnr').value = bel.raumnr || '';
  document.getElementById('f-raumbezeichnung').value = bel.raumbezeichnung || '';
  document.getElementById('f-gruppenNr').value = bel.gruppenNr || '';
  document.getElementById('f-raumdecke').value = bel.raumdecke || '';
  document.getElementById('f-anzahlReihen').value = bel.anzahlReihen || '';
  document.getElementById('f-leuchtenJeReihe').value = bel.leuchtenJeReihe || '';
  document.getElementById('f-leuchtmittelJeLeuchte').value = bel.leuchtmittelJeLeuchte || '';
  document.getElementById('f-installationsart').value = bel.installationsart || '';
  document.getElementById('f-installationsartSub').value = bel.installationsartSub || '';
  updateInstallationsartFields();
  document.getElementById('f-leuchtenart').value = bel.leuchtenart || '';
  document.getElementById('f-leuchtmittelKategorie').value = bel.leuchtmittelKategorie || '';
  document.getElementById('f-vorschaltgeraet').value = bel.vorschaltgeraet || '';

  // Steuerung checkboxen
  const steuerung = bel.steuerung || '';
  document.getElementById('f-steuerung-bwm').checked = steuerung.includes('BWM');
  document.getElementById('f-steuerung-dimmbar').checked = steuerung.includes('dimmbar');
  document.getElementById('f-steuerung-dali').checked = steuerung.includes('DALI');
  document.getElementById('f-steuerung-knx').checked = steuerung.includes('KNX');

  // Zustand checkboxen
  const zustand = bel.zustand || '';
  document.getElementById('f-zustand-defekt').checked = zustand.includes('defekt');
  document.getElementById('f-zustand-beschaedigt').checked = zustand.includes('beschädigt');
  document.getElementById('f-zustand-verschmutzt').checked = zustand.includes('stark verschmutzt');
  document.getElementById('f-zustand-abgaengig').checked = zustand.includes('abgängig');
  document.getElementById('f-zustand-erreichbar').checked = zustand.includes('schlecht erreichbar');

  document.getElementById('f-bel-bemerkung').value = bel.bemerkung || '';

  // Leuchtmittel Sub-Felder laden
  updateLeuchtmittelFields();

  // Sub-Felder nachsetzen (nach updateLeuchtmittelFields, das die Selects befüllt)
  setTimeout(() => {
    const kat = bel.leuchtmittelKategorie || '';
    if (kat === 't5' || kat === 't8') {
      document.getElementById('f-lm-linear-laenge').value = bel.leuchtmittelLaenge || '';
      document.getElementById('f-lm-linear-wattage').value = bel.leuchtmittelWattage || '';
    } else if (kat === 'dulux') {
      document.getElementById('f-lm-dulux-wattage').value = bel.leuchtmittelWattage || '';
      document.getElementById('f-lm-dulux-wendel').value = bel.wendelanzahl || '';
      document.getElementById('f-lm-dulux-typ').value = bel.leuchtmittelTyp || '';
    } else if (kat === 'sonstige') {
      document.getElementById('f-lm-sonstige-typ').value = bel.leuchtmittelTyp || '';
      updateSonstigeLmFields();
      setTimeout(() => {
        document.getElementById('f-lm-sonstige-wattage').value = bel.leuchtmittelWattage || '';
        document.getElementById('f-lm-fassung').value = bel.fassung || '';
      }, 0);
    } else if (kat === 'led') {
      document.getElementById('f-lm-led-text').value = bel.leuchtmittelTyp || '';
    }
  }, 0);

  // Fotos
  belFormPhotos = [null, null];
  if (bel.fotos && bel.fotos.length > 0) {
    belFormPhotos = bel.fotos.map(f => f || null);
    while (belFormPhotos.length < 2) belFormPhotos.push(null);
  }
  renderBelPhotoSlots();
  checkBelSonstigeHinweis();
}

function readBelFormIntoObj(bel) {
  bel.gebaeude = document.getElementById('f-gebaeude').value.trim();
  bel.geschoss = document.getElementById('f-geschoss').value.trim();
  bel.raumnr = document.getElementById('f-raumnr').value.trim();
  bel.raumbezeichnung = document.getElementById('f-raumbezeichnung').value.trim();
  bel.gruppenNr = document.getElementById('f-gruppenNr').value || bel.gruppenNr || '';
  bel.raumdecke = document.getElementById('f-raumdecke').value;
  bel.anzahlReihen = document.getElementById('f-anzahlReihen').value.trim();
  bel.leuchtenJeReihe = document.getElementById('f-leuchtenJeReihe').value.trim();
  bel.leuchtmittelJeLeuchte = document.getElementById('f-leuchtmittelJeLeuchte').value.trim();
  bel.installationsart = document.getElementById('f-installationsart').value;
  bel.installationsartSub = document.getElementById('f-installationsartSub').value;
  bel.leuchtenart = document.getElementById('f-leuchtenart').value;
  bel.leuchtmittelKategorie = document.getElementById('f-leuchtmittelKategorie').value;
  bel.vorschaltgeraet = document.getElementById('f-vorschaltgeraet').value;

  // Leuchtmittel aus aktiver Kategorie lesen
  const kat = bel.leuchtmittelKategorie;
  if (kat === 't5' || kat === 't8') {
    bel.leuchtmittelTyp = kat.toUpperCase();
    bel.leuchtmittelLaenge = document.getElementById('f-lm-linear-laenge').value;
    bel.leuchtmittelWattage = document.getElementById('f-lm-linear-wattage').value;
    bel.wendelanzahl = '';
    bel.fassung = '';
  } else if (kat === 'dulux') {
    bel.leuchtmittelTyp = document.getElementById('f-lm-dulux-typ').value;
    bel.leuchtmittelWattage = document.getElementById('f-lm-dulux-wattage').value;
    bel.wendelanzahl = document.getElementById('f-lm-dulux-wendel').value;
    bel.leuchtmittelLaenge = '';
    bel.fassung = '';
  } else if (kat === 'sonstige') {
    bel.leuchtmittelTyp = document.getElementById('f-lm-sonstige-typ').value;
    bel.leuchtmittelWattage = document.getElementById('f-lm-sonstige-wattage').value;
    bel.fassung = document.getElementById('f-lm-fassung').value;
    bel.leuchtmittelLaenge = '';
    bel.wendelanzahl = '';
  } else if (kat === 'led') {
    bel.leuchtmittelTyp = document.getElementById('f-lm-led-text').value.trim();
    bel.leuchtmittelWattage = '';
    bel.leuchtmittelLaenge = '';
    bel.wendelanzahl = '';
    bel.fassung = '';
  } else {
    bel.leuchtmittelTyp = '';
    bel.leuchtmittelWattage = '';
    bel.leuchtmittelLaenge = '';
    bel.wendelanzahl = '';
    bel.fassung = '';
  }

  // Zustand
  const zustandParts = [];
  if (document.getElementById('f-zustand-defekt').checked) zustandParts.push('defekt');
  if (document.getElementById('f-zustand-beschaedigt').checked) zustandParts.push('beschädigt (→ Foto!)');
  if (document.getElementById('f-zustand-verschmutzt').checked) zustandParts.push('stark verschmutzt');
  if (document.getElementById('f-zustand-abgaengig').checked) zustandParts.push('abgängig');
  if (document.getElementById('f-zustand-erreichbar').checked) zustandParts.push('schlecht erreichbar');
  bel.zustand = zustandParts.join(', ');

  // Steuerung
  const steuerungParts = [];
  if (document.getElementById('f-steuerung-bwm').checked) steuerungParts.push('BWM');
  if (document.getElementById('f-steuerung-dimmbar').checked) steuerungParts.push('dimmbar');
  if (document.getElementById('f-steuerung-dali').checked) steuerungParts.push('DALI');
  if (document.getElementById('f-steuerung-knx').checked) steuerungParts.push('KNX');
  bel.steuerung = steuerungParts.join(', ');

  bel.bemerkung = document.getElementById('f-bel-bemerkung').value.trim();
  bel.fotos = belFormPhotos.filter(Boolean);
  bel.erfasser = localStorage.getItem('erfasser-name') || '';
  return bel;
}

async function saveBelForm() {
  const bel = currentBelId ? await getBeleuchtung(currentBelId) : newBeleuchtung(currentProjektId);
  readBelFormIntoObj(bel);
  await saveBeleuchtung(bel);
  await renderHkList();
  navigate('screen-hk-list');
  showToast('Leuchte gespeichert');
}

async function saveBelAndNextGroup() {
  const bel = currentBelId ? await getBeleuchtung(currentBelId) : newBeleuchtung(currentProjektId);
  readBelFormIntoObj(bel);
  await saveBeleuchtung(bel);
  await renderHkList();

  const nextBel = newBeleuchtung(currentProjektId, {
    gebaeude: bel.gebaeude,
    geschoss: bel.geschoss,
    raumnr: bel.raumnr,
    raumbezeichnung: bel.raumbezeichnung,
    raumdecke: bel.raumdecke,
    installationsart: bel.installationsart,
    installationsartSub: bel.installationsartSub,
    leuchtenart: bel.leuchtenart,
    leuchtmittelKategorie: bel.leuchtmittelKategorie,
    vorschaltgeraet: bel.vorschaltgeraet
  });
  nextBel.gruppenNr = (Number(bel.gruppenNr) || 0) + 1;

  currentBelId = null;
  document.getElementById('header-form-title').textContent = 'Neue Leuchte';
  document.getElementById('btn-delete-bel').style.display = 'none';
  fillBelForm(nextBel);
  window.scrollTo(0, 0);
  showToast('Leuchte gespeichert → nächste Leuchte im Raum');
}

async function saveBelAndNextRoom() {
  const bel = currentBelId ? await getBeleuchtung(currentBelId) : newBeleuchtung(currentProjektId);
  readBelFormIntoObj(bel);
  await saveBeleuchtung(bel);
  await renderHkList();

  // Ersten Eintrag des Raums als Vorlage (nicht den zuletzt gespeicherten)
  const allBels = await getBeleuchtungByProjekt(currentProjektId);
  const firstInRoom = allBels.find(b => b.raumnr === bel.raumnr && b.geschoss === bel.geschoss);
  const src = firstInRoom || bel;
  const nextBel = newBeleuchtung(currentProjektId, {
    gebaeude: src.gebaeude,
    geschoss: src.geschoss,
    raumdecke: src.raumdecke,
    installationsart: src.installationsart,
    installationsartSub: src.installationsartSub,
    leuchtenart: src.leuchtenart,
    leuchtmittelKategorie: src.leuchtmittelKategorie,
    vorschaltgeraet: src.vorschaltgeraet
  });
  nextBel.raumnr = '';
  nextBel.raumbezeichnung = '';
  nextBel.gruppenNr = 1;

  currentBelId = null;
  document.getElementById('header-form-title').textContent = 'Neue Leuchte';
  document.getElementById('btn-delete-bel').style.display = 'none';
  fillBelForm(nextBel);
  window.scrollTo(0, 0);
  document.getElementById('f-raumnr').focus();
  showToast('Leuchte gespeichert → neuer Raum');
}

async function deleteCurrentBel() {
  if (!currentBelId) return;
  if (confirm('Leuchte wirklich löschen?')) {
    await deleteBeleuchtung(currentBelId);
    await renderHkList();
    navigate('screen-hk-list');
    showToast('Leuchte gelöscht');
  }
}

async function confirmDeleteBel(id) {
  const bel = await getBeleuchtung(id);
  if (confirm(`Leuchte (${bel.geschoss || ''} / R${bel.raumnr || ''}) wirklich löschen?`)) {
    await deleteBeleuchtung(id);
    await renderHkList();
    showToast('Leuchte gelöscht');
  }
}

// ── Installationsart Sub-Select ──

function updateInstallationsartFields() {
  const art = document.getElementById('f-installationsart').value;
  document.getElementById('group-installationsartSub').style.display = art === 'Pendel' ? 'block' : 'none';
  if (art !== 'Pendel') document.getElementById('f-installationsartSub').value = '';
  checkBelSonstigeHinweis();
}

// ── Leuchtmittel Smart-Lookup ──

// Hilfsfunktion: alle Linear-Einträge über alle Typen sammeln
// Bidirektionaler Smart-Lookup für T5/T8
function onLinearFieldChange(changedField) {
  const kat = document.getElementById('f-leuchtmittelKategorie').value;
  const laengeEl = document.getElementById('f-lm-linear-laenge');
  const wattEl = document.getElementById('f-lm-linear-wattage');
  const vsg = document.getElementById('f-vorschaltgeraet').value;

  if (kat !== 't5' && kat !== 't8') return;

  let entries = LEUCHTMITTEL_DB[kat];
  if (kat === 't8' && vsg === 'EVG') entries = entries.filter(e => !e.vvgOnly);

  const curLaenge = laengeEl.value ? Number(laengeEl.value) : null;
  const curWatt = wattEl.value ? Number(wattEl.value) : null;

  // Datalists aktualisieren (gefiltert nach Eingaben)
  let laengen, wattages;
  if (curWatt && changedField !== 'laenge') {
    const matching = entries.filter(e => e.w === curWatt);
    laengen = matching.length > 0 ? matching.map(e => e.mm) : entries.map(e => e.mm);
  } else {
    laengen = entries.map(e => e.mm);
  }
  if (curLaenge && changedField !== 'wattage') {
    const matching = entries.filter(e => e.mm === curLaenge);
    wattages = matching.length > 0 ? matching.map(e => e.w) : entries.map(e => e.w);
  } else {
    wattages = entries.map(e => e.w);
  }
  document.getElementById('dl-lm-laenge').innerHTML = [...new Set(laengen)].sort((a,b) => a-b).map(v => `<option value="${v}">`).join('');
  document.getElementById('dl-lm-wattage').innerHTML = [...new Set(wattages)].sort((a,b) => a-b).map(v => `<option value="${v}">`).join('');

  // Auto-fill wenn eindeutig
  if (changedField === 'laenge' && curLaenge) {
    const matching = entries.filter(e => e.mm === curLaenge);
    if (matching.length === 1) wattEl.value = matching[0].w;
  } else if (changedField === 'wattage' && curWatt) {
    const matching = entries.filter(e => e.w === curWatt);
    if (matching.length === 1) laengeEl.value = matching[0].mm;
  }
}

// Dulux Typ-Ermittlung (eigene Funktion für bidirektionales Lookup)
function updateDuluxTyp() {
  const wattage = Number(document.getElementById('f-lm-dulux-wattage').value);
  const wendel = document.getElementById('f-lm-dulux-wendel').value;
  const vsg = document.getElementById('f-vorschaltgeraet').value;
  let ermittelt = '';

  if (wattage && wendel) {
    // Bei EVG bevorzugt /E-Varianten
    const candidates = [];
    for (const [name, info] of Object.entries(LEUCHTMITTEL_DB.dulux)) {
      if (info.wendel === wendel && info.wattages.includes(wattage)) {
        candidates.push({ name, info });
      }
    }
    if (candidates.length > 0) {
      let best;
      if (vsg === 'EVG') {
        best = candidates.find(c => c.info.evg === true) || candidates[0];
      } else if (vsg === 'KVG/VVG') {
        best = candidates.find(c => c.info.evg === false) || candidates[0];
      } else {
        best = candidates[0];
      }
      ermittelt = `${best.name} ${wattage}W`;
      // EVG auto-setzen wenn eindeutig
      if (best.info.evg === true && !vsg) {
        document.getElementById('f-vorschaltgeraet').value = 'EVG';
      }
    }
    // Falls keine Wendel-Match, Dulux F/L prüfen
    if (!ermittelt) {
      for (const name of ['Dulux F', 'Dulux L']) {
        if (LEUCHTMITTEL_DB.dulux[name].wattages.includes(wattage)) {
          ermittelt = `${name} ${wattage}W (?)`;
          break;
        }
      }
    }
  }
  document.getElementById('f-lm-dulux-typ').value = ermittelt;
}

function updateLeuchtmittelFields() {
  const kat = document.getElementById('f-leuchtmittelKategorie').value;
  const vsg = document.getElementById('f-vorschaltgeraet').value;

  // Alle Sub-Felder verstecken
  document.getElementById('lm-linear-fields').style.display = 'none';
  document.getElementById('lm-dulux-fields').style.display = 'none';
  document.getElementById('lm-sonstige-fields').style.display = 'none';
  document.getElementById('lm-led-fields').style.display = 'none';

  if (kat === 't5' || kat === 't8') {
    document.getElementById('lm-linear-fields').style.display = 'block';
    // Direkt Datalists für Länge/Wattage befüllen (kein Typ-Dropdown nötig)
    let entries = LEUCHTMITTEL_DB[kat];
    if (kat === 't8' && vsg === 'EVG') {
      entries = entries.filter(e => !e.vvgOnly);  // 65W rausfiltern bei EVG
    }
    document.getElementById('dl-lm-laenge').innerHTML = [...new Set(entries.map(e => e.mm))].sort((a,b) => a-b).map(v => `<option value="${v}">`).join('');
    document.getElementById('dl-lm-wattage').innerHTML = [...new Set(entries.map(e => e.w))].sort((a,b) => a-b).map(v => `<option value="${v}">`).join('');

  } else if (kat === 'dulux') {
    document.getElementById('lm-dulux-fields').style.display = 'block';
    updateDuluxTyp();

  } else if (kat === 'sonstige') {
    document.getElementById('lm-sonstige-fields').style.display = 'block';
    const typSel = document.getElementById('f-lm-sonstige-typ');
    const curTyp = typSel.value;
    typSel.innerHTML = '<option value="">Bitte wählen</option>';
    for (const t of Object.keys(LEUCHTMITTEL_DB.sonstige)) {
      typSel.innerHTML += `<option value="${esc(t)}">${esc(t)}</option>`;
    }
    typSel.value = curTyp;
    updateSonstigeLmFields();

  } else if (kat === 'led') {
    document.getElementById('lm-led-fields').style.display = 'block';
  }
}

function updateSonstigeLmFields() {
  const typ = document.getElementById('f-lm-sonstige-typ').value;
  const dlEl = document.getElementById('dl-lm-sonstige-wattage');
  dlEl.innerHTML = '';
  if (typ && LEUCHTMITTEL_DB.sonstige[typ]) {
    const data = LEUCHTMITTEL_DB.sonstige[typ];
    const wattages = data.wattages || (data.entries ? data.entries.map(e => e.w) : []);
    dlEl.innerHTML = wattages.map(w => `<option value="${w}">`).join('');
  }
  // Fassung-Feld bei Strahler-Typen anzeigen (MR11, MR16, GU10, HQI/HIT)
  const fassungTypes = ['MR11', 'MR16', 'GU10', 'HQI/HIT'];
  const fassungGroup = document.getElementById('group-fassung');
  if (fassungGroup) {
    fassungGroup.style.display = fassungTypes.includes(typ) ? 'block' : 'none';
    if (!fassungTypes.includes(typ)) document.getElementById('f-lm-fassung').value = '';
  }
}

// ── Bel Sonstige Hinweis ──

function checkBelSonstigeHinweis() {
  const hinweis = document.getElementById('bel-sonstige-foto-hinweis');
  if (!hinweis) return;
  const raumdecke = document.getElementById('f-raumdecke').value;
  const installationsart = document.getElementById('f-installationsart').value;
  const leuchtenart = document.getElementById('f-leuchtenart').value;
  const erreichbar = document.getElementById('f-zustand-erreichbar');
  const show = raumdecke === 'Sonstige' || installationsart === 'Sonstige' || leuchtenart === 'Sonstige' || (erreichbar && erreichbar.checked);
  hinweis.style.display = show ? 'block' : 'none';
}

// ── Bel Fotos ──

function renderBelPhotoSlots() {
  const container = document.getElementById('bel-photo-slots-container');
  if (!container) return;
  let html = '';
  for (let i = 0; i < belFormPhotos.length; i++) {
    if (belFormPhotos[i]) {
      html += `<div class="photo-slot" onclick="triggerBelPhoto(${i})">
        <img src="${belFormPhotos[i]}" alt="Foto ${i + 1}">
        <button class="remove-photo" onclick="event.stopPropagation(); removeBelPhoto(${i})">&times;</button>
      </div>`;
    } else {
      html += `<div class="photo-slot" onclick="triggerBelPhoto(${i})">
        <div class="placeholder">Foto ${i + 1}</div>
      </div>`;
    }
  }
  html += `<div class="photo-slot photo-slot-add" onclick="addBelPhotoSlot()">
    <div class="placeholder" style="font-size:1.5rem">+</div>
  </div>`;
  container.innerHTML = html;
}

function addBelPhotoSlot() {
  belFormPhotos.push(null);
  const newIndex = belFormPhotos.length - 1;
  renderBelPhotoSlots();
  triggerBelPhoto(newIndex);
}

let _belCameraIndex = 0;

async function triggerBelPhoto(index) {
  _belCameraIndex = index;
  _photoTarget = 'bel';
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 4096 }, height: { ideal: 3072 } }
      });
      openCameraModal(stream);
      return;
    } catch (e) {
      if (e.name === 'NotAllowedError') { showToast('Kamera-Berechtigung benötigt'); return; }
    }
  }
  const input = document.getElementById('bel-photo-input');
  input.dataset.index = index;
  input.click();
}

function handleBelPhotoInput(input) {
  const file = input.files[0];
  if (!file) return;
  const index = parseInt(input.dataset.index);
  compressImage(file, (dataUrl) => {
    belFormPhotos[index] = dataUrl;
    renderBelPhotoSlots();
  });
  input.value = '';
}

function removeBelPhoto(index) {
  belFormPhotos[index] = null;
  renderBelPhotoSlots();
}

// ── HK Fotos ──

let _photoTarget = 'hk'; // 'hk' or 'bel'

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

function checkSonstigeHinweis() {
  const hinweis = document.getElementById('sonstige-foto-hinweis');
  if (!hinweis) return;
  const typ = document.getElementById('f-typ').value;
  const einbauSonstige = document.getElementById('f-einbau-sonstige');
  const thermo = document.getElementById('f-artThermostatkopf').value;
  const einbauIsSonstige = einbauSonstige ? einbauSonstige.checked : false;
  hinweis.style.display = (typ === 'Sonstige' || einbauIsSonstige || thermo === 'Sonstiges') ? 'block' : 'none';
}

let _cameraStream = null;
let _cameraIndex = 0;

async function triggerPhoto(index) {
  _cameraIndex = index;
  _photoTarget = 'hk';
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
    if (_photoTarget === 'bel') {
      belFormPhotos[_belCameraIndex] = compressed;
      renderBelPhotoSlots();
    } else {
      formPhotos[_cameraIndex] = compressed;
      renderPhotoSlots();
    }
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
  const MAX_BYTES = 3_000_000;

  function processImage(src) {
    const img = new Image();
    img.onerror = () => {
      showToast('Foto konnte nicht geladen werden');
    };
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const maxW = 2560;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

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
  const result = {};

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 2) continue;

    const gebaeude = new Set();
    const geschoss = new Set();
    const raum = new Set();
    const raumDetails = {};
    const geschossRaum = {}; // Geschoss → [Raum-Nrn]

    // Format erkennen anhand Header-Zeile
    const header = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());
    const isNewFormat = header[0] && header[0].includes('geschoss') && header[1] && header[1].includes('raum');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      if (isNewFormat) {
        // Neues Format: A=Geschoss, B=Raum Nr., C=Raumbezeichnung, D=Bodenfläche
        const ges = (row[0] != null && String(row[0]).trim()) ? String(row[0]).trim() : '';
        if (ges) geschoss.add(ges);
        if (row[1] != null && String(row[1]).trim()) {
          const rNr = String(row[1]).trim();
          raum.add(rNr);
          raumDetails[rNr] = {
            nutzung: row[2] != null ? String(row[2]).trim() : '',
            flaeche: row[3] != null ? String(row[3]).trim() : '',
            barcode: ''
          };
          if (ges) {
            if (!geschossRaum[ges]) geschossRaum[ges] = [];
            if (!geschossRaum[ges].includes(rNr)) geschossRaum[ges].push(rNr);
          }
        }
      } else {
        // Altes Format: A=Gebäude, C=Geschoss, E=Raum, F=Fläche, G=Nutzung, H=Barcode
        if (row[0] != null && String(row[0]).trim()) gebaeude.add(String(row[0]).trim());
        const ges = (row[2] != null && String(row[2]).trim()) ? String(row[2]).trim() : '';
        if (ges) geschoss.add(ges);
        if (row[4] != null && String(row[4]).trim()) {
          const rNr = String(row[4]).trim();
          raum.add(rNr);
          raumDetails[rNr] = {
            flaeche: row[5] != null ? String(row[5]).trim() : '',
            nutzung: row[6] != null ? String(row[6]).trim() : '',
            barcode: row[7] != null ? String(row[7]).trim() : ''
          };
          if (ges) {
            if (!geschossRaum[ges]) geschossRaum[ges] = [];
            if (!geschossRaum[ges].includes(rNr)) geschossRaum[ges].push(rNr);
          }
        }
      }
    }

    result[sheetName] = {
      gebaeude: [...gebaeude],
      geschoss: [...geschoss],
      raum: [...raum],
      raumDetails,
      geschossRaum
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
  const fetched = await fetchGebaeudedatenFromServer();
  if (!fetched) {
    const stored = localStorage.getItem('gebaeudedaten');
    if (stored) {
      const parsed = JSON.parse(stored);
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
  const keys = Object.keys(allGebaeudeDaten);
  if (keys.length > 0) return allGebaeudeDaten[keys[0]];
  return { gebaeude: [], geschoss: [], raum: [], raumDetails: {}, geschossRaum: {} };
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

function showZipProgress(text, pct) {
  const overlay = document.getElementById('zip-progress-overlay');
  overlay.style.display = 'flex';
  document.getElementById('zip-progress-text').textContent = text;
  document.getElementById('zip-progress-bar').style.width = pct + '%';
}

function hideZipProgress() {
  document.getElementById('zip-progress-overlay').style.display = 'none';
}

async function sendData() {
  const projekt = await getProjekt(currentProjektId);
  const modul = projekt.modulType || 'hk';
  const showHk = modul === 'hk' || modul === 'beides';
  const showBel = modul === 'beleuchtung' || modul === 'beides';

  const hks = showHk ? await getHeizkoerperByProjekt(currentProjektId) : [];
  const bels = showBel ? await getBeleuchtungByProjekt(currentProjektId) : [];

  if (hks.length === 0 && bels.length === 0) {
    showToast('Keine Daten zum Versenden');
    return;
  }

  const btnSend = document.getElementById('btn-send-data');
  if (btnSend) btnSend.disabled = true;

  const sortFn = (a, b) =>
    (a.gebaeude || '').localeCompare(b.gebaeude || '') ||
    (a.geschoss || '').localeCompare(b.geschoss || '') ||
    (a.raumnr || '').localeCompare(b.raumnr || '');

  hks.sort((a, b) => sortFn(a, b) || (Number(a.hkNr) || 0) - (Number(b.hkNr) || 0));
  bels.sort((a, b) => sortFn(a, b) || (Number(a.gruppenNr) || 0) - (Number(b.gruppenNr) || 0));

  const safeName = sanitizeFilename(projekt.name);
  const modulLabel = modul === 'hk' ? 'HK-Aufnahme' : modul === 'beleuchtung' ? 'Beleuchtung' : 'HK+Beleuchtung';
  const subject = `${modulLabel}: ${projekt.name}`;
  const zipFileName = safeName + '_' + modulLabel.replace(/\+/g, '-') + '.zip';

  const recipients = [];
  if (document.getElementById('send-r1').checked) recipients.push(document.getElementById('send-r1').value);
  if (document.getElementById('send-r2').checked) recipients.push(document.getElementById('send-r2').value);
  const r3check = document.getElementById('send-r3-check');
  const r3val = document.getElementById('send-r3').value.trim();
  if (r3check && r3check.checked && r3val) recipients.push(r3val);

  try {
    showZipProgress('Erstelle Excel…', 0);
    const zipBlob = await buildExportZip(hks, bels, modul, safeName, (done, total) => {
      showZipProgress(`Foto ${done} von ${total} komprimiert`, done / total * 100);
    });
    hideZipProgress();

    const zipFile = new File([zipBlob], zipFileName, { type: 'application/zip' });

    if (navigator.canShare && navigator.canShare({ files: [zipFile] })) {
      try {
        const shareData = { title: subject, files: [zipFile] };
        if (recipients.length > 0) {
          shareData.text = 'An: ' + recipients.join(', ') + '\n\n' + modulLabel + ' als ZIP-Datei.';
        }
        await navigator.share(shareData);
        closeSendDialog();
        showToast('Daten versendet');
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    downloadBlob(zipBlob, zipFileName);
    if (recipients.length > 0) {
      const body = 'Bitte die heruntergeladene Datei "' + zipFileName + '" an diese E-Mail anhängen.';
      const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    }
    closeSendDialog();
    showToast('ZIP heruntergeladen – bitte manuell an E-Mail anhängen');
  } finally {
    hideZipProgress();
    if (btnSend) btnSend.disabled = false;
  }
}

async function buildExportZip(hks, bels, modul, safeName, onProgress) {
  const wb = XLSX.utils.book_new();

  if (hks.length > 0) {
    const hkData = [EXPORT_HEADERS, ...hks.map(hkToRow)];
    const wsHk = XLSX.utils.aoa_to_sheet(hkData);
    wsHk['!cols'] = EXPORT_HEADERS.map((h, i) => ({
      wch: Math.max(h.length, ...hks.map(hk => String(hkToRow(hk)[i] || '').length), 10)
    }));
    XLSX.utils.book_append_sheet(wb, wsHk, 'HK-Aufnahme');
  }

  if (bels.length > 0) {
    const belData = [BEL_EXPORT_HEADERS, ...bels.map(belToRow)];
    const wsBel = XLSX.utils.aoa_to_sheet(belData);
    wsBel['!cols'] = BEL_EXPORT_HEADERS.map((h, i) => ({
      wch: Math.max(h.length, ...bels.map(b => String(belToRow(b)[i] || '').length), 10)
    }));
    XLSX.utils.book_append_sheet(wb, wsBel, 'Beleuchtung');
  }

  const xlsxBytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const modulLabel = modul === 'hk' ? 'HK-Aufnahme' : modul === 'beleuchtung' ? 'Beleuchtung' : 'HK-Beleuchtung';
  const zipFiles = [{ name: safeName + '_' + modulLabel + '.xlsx', data: new Uint8Array(xlsxBytes) }];

  // Fotos sammeln
  const allFotos = [];
  for (const hk of hks)
    for (let i = 0; i < (hk.fotos || []).length; i++)
      if (hk.fotos[i]) allFotos.push({ item: hk, i, type: 'hk' });
  for (const bel of bels)
    for (let i = 0; i < (bel.fotos || []).length; i++)
      if (bel.fotos[i]) allFotos.push({ item: bel, i, type: 'bel' });

  const BATCH = 3;
  for (let b = 0; b < allFotos.length; b += BATCH) {
    const batch = allFotos.slice(b, b + BATCH);
    const results = await Promise.all(batch.map(f => compressForExport(f.item.fotos[f.i])));
    results.forEach((data, j) => {
      const f = batch[j];
      const fname = f.type === 'hk' ? fotoFilename(f.item, f.i) : belFotoFilename(f.item, f.i);
      zipFiles.push({ name: fname, data });
    });
    if (onProgress) onProgress(Math.min(b + BATCH, allFotos.length), allFotos.length);
    await new Promise(r => setTimeout(r, 0));
  }

  const zipData = buildZip(zipFiles);
  return new Blob([zipData], { type: 'application/zip' });
}

// ── Dropdown füllen ──

function populateDropdowns() {
  fillSelect('f-typ', CONFIG.typ, 'Typ', { 'Sonstige': 'Sonstige → Foto!' });
  fillSelect('f-anzahlRoehren', CONFIG.anzahlRoehren.map(String), 'Anz. Röhren');
  fillDatalist('dl-dnVentil', CONFIG.dnVentil);
  fillSelect('f-ventilform', CONFIG.ventilform, 'Ventilform');
  fillSelect('f-artThermostatkopf', CONFIG.artThermostatkopf, 'Thermostatkopf', { 'Sonstiges': 'Sonstiges → Foto!' });
  fillDatalist('dl-baulaenge', CONFIG.baulaengeOpts);
  fillDatalist('dl-nabenabstand', CONFIG.nabenabstandOpts);
}

function fillSelect(id, options, label, labelMap = {}) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">Bitte wählen</option>`;
  for (const opt of options) {
    const display = labelMap[opt] || opt;
    sel.innerHTML += `<option value="${esc(opt)}">${esc(display)}</option>`;
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
  img.onclick = () => {
    if (img.style.width) {
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
  document.getElementById('help-quick').style.display = 'block';
  document.getElementById('help-detail').style.display = 'none';
}

function toggleDetailHelp() {
  const quick = document.getElementById('help-quick');
  const detail = document.getElementById('help-detail');
  if (detail.style.display === 'none') {
    detail.style.display = 'block';
    quick.style.display = 'none';
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
  let html = esc_md(md)
    .replace(/```[\w]*\n([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trimEnd()}</code></pre>`)
    .replace(/(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)*)/g, mdTable)
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="cb-open">&#9744; $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="cb-done">&#9745; $1</li>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, m => `<ul>${m}</ul>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^---+$/gm, '<hr>')
    .replace(/\n{2,}/g, '\n<br>\n');

  document.getElementById('help-content').innerHTML = html;
}

function esc_md(str) {
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
  if (!confirm('ACHTUNG: Alle Projekte, Heizkörper, Beleuchtungsdaten und Gebäudedaten werden unwiderruflich gelöscht!\n\nFortfahren?')) return;
  if (!confirm('Wirklich ALLE Daten löschen? Dies kann nicht rückgängig gemacht werden!')) return;

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

  // HK Event-Listener
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

  // Gebäude-Filter: Geschoss-Datalist filtern
  document.getElementById('f-gebaeude').addEventListener('change', () => {
    filterDatalistsForGebaeude();
  });

  // Geschoss-Filter: Raum-Datalist filtern
  document.getElementById('f-geschoss').addEventListener('change', () => {
    filterDatalistsForGeschoss();
  });

  // Filter
  document.getElementById('filter-text').addEventListener('input', renderHkList);

  // Enter in Projekt-Name -> erstellen
  document.getElementById('input-projekt-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createNewProjekt();
  });

  // Landscape-Keyboard-Fix: Header ausblenden wenn Input fokussiert + Viewport zu klein
  setupLandscapeKeyboardFix();

  if (!settingsReady) {
    openSettings();
    return;
  }

  const hash = location.hash.replace('#', '');
  if (hash) {
    navigate(hash, false);
  }
});

// ── Landscape-Keyboard-Fix ──

function setupLandscapeKeyboardFix() {
  const header = document.getElementById('header');
  const inputs = 'input, select, textarea';

  function isLandscape() {
    return window.innerWidth > window.innerHeight;
  }

  function onFocusIn(e) {
    if (e.target.matches(inputs) && isLandscape()) {
      header.style.position = 'relative';
      // Fokussiertes Feld in den sichtbaren Bereich scrollen
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }

  function onFocusOut(e) {
    if (e.target.matches(inputs)) {
      header.style.position = '';
    }
  }

  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);

  // VisualViewport API: reagiert auf Keyboard ein-/ausblenden
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const focused = document.activeElement;
      if (focused && focused.matches(inputs) && isLandscape()) {
        header.style.position = 'relative';
      } else if (!focused || !focused.matches(inputs)) {
        header.style.position = '';
      }
    });
  }
}

// ── Raum-Filterung ──

function filterDatalistsForGebaeude() {
  const data = getActiveGebaeudeDaten();
  // Aktuell keine gebäude-spezifische Filterung, da Gebäudedaten-Format das nicht direkt unterstützt
  // Kann hier bei Bedarf erweitert werden
}

function filterDatalistsForGeschoss() {
  const data = getActiveGebaeudeDaten();
  const ges = document.getElementById('f-geschoss').value.trim();
  const dlRaum = document.getElementById('dl-raumnr');
  if (ges && data.geschossRaum && data.geschossRaum[ges]) {
    dlRaum.innerHTML = data.geschossRaum[ges].map(v => `<option value="${esc(v)}">`).join('');
  } else {
    dlRaum.innerHTML = data.raum.map(v => `<option value="${esc(v)}">`).join('');
  }
}

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
    // Offline oder Fehler
  }
}

async function forceUpdate() {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }
  window.location.reload();
}

setTimeout(checkForUpdate, 2000);
