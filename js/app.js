/* Strike Point Risk — app shell, input steps and live results */
(function () {
  'use strict';
  const T = window.SPTables, E = window.SPEngine, R = window.SPReport, V3 = window.SPView3D;
  const STORE = 'spr.current', SETTINGS = 'spr.settings';

  const STEPS = [
    { id: 'project', label: 'Project' },
    { id: 'environment', label: 'Environment' },
    { id: 'structure', label: 'Structure' },
    { id: 'lines', label: 'Lines' },
    { id: 'zones', label: 'Zones' },
    { id: 'protection', label: 'Protection' },
    { id: 'results', label: 'Results' },
    { id: 'report', label: 'Report' }
  ];

  // ---------- helpers ----------
  const $ = id => document.getElementById(id);
  const uid = p => p + Math.random().toString(36).slice(2, 8);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
  function fmtE(v) {
    if (v === 0) return '0';
    if (v == null || !isFinite(v)) return '—';
    const [m, e] = v.toExponential(3).split('e');
    const mm = String(+m), ee = +e;
    return mm + 'E' + (ee < 0 ? '-' : '+') + String(Math.abs(ee)).padStart(2, '0');
  }
  const fmtN = (v, d = 2) => (v == null || !isFinite(v)) ? '—' : v.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtV = v => (v == null || !isFinite(v)) ? '—' : (Math.abs(v) >= 0.001 || v === 0 ? String(+v.toPrecision(4)) : fmtE(v));
  function getPath(o, path) { return path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o); }
  function setPath(o, path, val) {
    const ks = path.split('.'); let x = o;
    for (let i = 0; i < ks.length - 1; i++) { if (x[ks[i]] == null || typeof x[ks[i]] !== 'object') x[ks[i]] = {}; x = x[ks[i]]; }
    x[ks[ks.length - 1]] = val;
  }
  function load(key, d) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600); }

  // ---------- state ----------
  let settings = load(SETTINGS, { name: '', position: '', signature: '' });
  function newZone(name, location) {
    return { id: uid('z'), name: name || 'Internal', location: location || 'inside', nz: '', tz: 8760, rt: 'agri', rf: 'fire_ord', hz: 'none', LF1: 'other', LO1: 'none', ks2: 'none', users: '', cz: '', LF3: 'museum' };
  }
  function newLine(name, type) {
    return { id: uid('l'), name: name || 'Mains supply', type: type || 'power', CT: 'lv', construction: 'unshielded_buried', RS: '5-20', UW: '4', KS3: 'large', sections: [{ length: '', CI: 'buried', CE: '' }], adjacentId: '', overrides: {} };
  }
  function newState() {
    const l1 = newLine('Mains supply', 'power'), l2 = newLine('Telecom / data', 'telecom');
    return {
      app: 'strike-point-risk', version: 1,
      meta: { projectName: '', projectRef: '', client: '', calcRef: '', address: '', caseName: '', caseStatus: 'existing', notes: '', assessor: settings.name || '', position: settings.position || '', date: today(), declaration: true },
      risks: { r1: true, r2: false, r3: false },
      env: { NG: '', CD: 'same', CE: 'suburban' },
      structure: { shape: 'rect', L: '', W: '', H: '', Hr: '', ridgeDir: 'L', Hp: '', Pw: '', perimeter: '' },
      adjacent: [],
      lines: [l1, l2],
      zones: [newZone('Internal', 'inside')],
      totals: { nt: '', nt2: '', ct3: '' },
      protection: { lps: 'none', earthing: 'A', ks1: 'none', ks1w: '', lines: {}, zones: {} }
    };
  }
  function exampleState() {
    const st = {
      app: 'strike-point-risk', version: 1,
      meta: { projectName: 'Tobacco Warehouse', projectRef: 'Upgrade LPS', client: 'Wayne Lloyd', calcRef: '', address: 'Dock, 21A Regent Road, Stanley L3 0BA', caseName: 'Tobacco Warehouse', caseStatus: 'proposed',
        notes: 'Example assessment. Grade II listed building being refurbished into apartments.', assessor: settings.name || 'L. Storey', position: settings.position || '', date: today(), declaration: true },
      risks: { r1: true, r2: false, r3: true },
      env: { NG: 0.7, CD: 'same', CE: 'urban' },
      structure: { shape: 'rect', L: 220, W: 50, H: 40, Hr: '', ridgeDir: 'L', Hp: '', Pw: '', perimeter: '' },
      adjacent: [{ id: 'sub', name: 'Substation', L: 5, W: 5, H: 3, CD: 'higher' }],
      lines: [], zones: [],
      totals: { nt: '', nt2: '', ct3: '' },
      protection: { lps: 'IV', earthing: 'A', ks1: 'none', ks1w: '', lines: {}, zones: {} }
    };
    for (let i = 1; i <= 4; i++) {
      const id = 'l' + i;
      st.lines.push({ id, name: 'Mains Intake ' + i, type: 'power', CT: 'lv', construction: 'unshielded_buried', RS: '5-20', UW: '4', KS3: 'large', sections: [{ length: 50, CI: 'buried', CE: '' }], adjacentId: 'sub', overrides: { PLD: 0.9 } });
      st.protection.lines[id] = { peb: 'III-IV', pspd: 'none' };
    }
    st.lines.push({ id: 'l5', name: 'Telecom & Data', type: 'telecom', CT: 'lv', construction: 'unshielded_aerial', RS: '5-20', UW: '2.5', KS3: 'large', sections: [{ length: 100, CI: 'aerial', CE: '' }], adjacentId: '', overrides: {} });
    st.protection.lines.l5 = { peb: 'III-IV', pspd: 'none' };
    st.zones.push({ id: 'z1', name: 'Internal Area', location: 'inside', nz: 540, tz: 8760, rt: 'agri', rf: 'fire_low', hz: 'evac', LF1: 'flats', LO1: 'none', ks2: 'none', users: '', cz: 10464000, LF3: 'museum' });
    st.zones.push({ id: 'z2', name: 'Outside Area', location: 'outside', nz: 5, tz: 8760, rt: 'agri', rf: 'fire_low', hz: 'none', LF1: 'flats', LO1: 'none', ks2: 'none', users: '', cz: 0, LF3: 'museum' });
    st.protection.zones = { z1: { rp: 'auto', pta: [], ptu: [] }, z2: { rp: 'none', pta: [], ptu: [] } };
    return st;
  }

  let state = load(STORE, null) || newState();
  let result = null;
  const ui = { step: 'project', line: 0, zone: 0, resRisk: 'r1', reportType: 'full', layers: { mesh: true, dc: true, earth: true, collect: true, sphere: false, adj: false }, showOverrides: {} };
  let viewer = null;

  function ready() {
    const s = state.structure;
    return +state.env.NG > 0 && +s.L > 0 && +s.W > 0 && +s.H > 0 && state.zones.length > 0;
  }
  function recalc() {
    try { result = E.compute(state); } catch (e) { console.error(e); result = null; }
  }
  let saveT = null;
  function persist() { clearTimeout(saveT); saveT = setTimeout(() => save(STORE, state), 300); }

  // ---------- field builders ----------
  let hid = 0;
  function help(text) {
    if (!text) return '';
    const id = 'h' + (++hid);
    return '<button type="button" class="q" aria-expanded="false" aria-controls="' + id + '" aria-label="What is this?" data-action="help">?</button></span><p class="hint" id="' + id + '" hidden>' + text + '</p><span hidden>';
  }
  function lab(label, h) { return '<span class="lab">' + label + help(h) + '</span>'; }
  function fNum(path, label, o) {
    o = o || {}; const v = getPath(state, path);
    return '<label class="field' + (o.span ? ' span2' : '') + '">' + lab(label, o.help) +
      '<input type="number" inputmode="decimal" data-bind="' + path + '" data-type="num"' + (o.rerender ? ' data-rerender="1"' : '') +
      ' value="' + esc(v == null ? '' : v) + '" step="' + (o.step || 'any') + '" min="' + (o.min == null ? 0 : o.min) + '"' + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.cls ? ' class="' + o.cls + '"' : '') + '>' +
      (o.note ? '<span class="val">' + o.note + '</span>' : '') + '</label>';
  }
  function fText(path, label, o) {
    o = o || {}; const v = getPath(state, path);
    return '<label class="field' + (o.span ? ' span2' : '') + '">' + lab(label, o.help) +
      '<input type="text" data-bind="' + path + '" data-type="str" value="' + esc(v) + '"' + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.rerender ? ' data-rerender="1"' : '') + '></label>';
  }
  function fArea(path, label, o) {
    o = o || {}; const v = getPath(state, path);
    return '<label class="field span2">' + lab(label, o.help) + '<textarea rows="' + (o.rows || 3) + '" data-bind="' + path + '" data-type="str">' + esc(v) + '</textarea></label>';
  }
  function optLabel(o, showValue) { return esc(o.label) + (showValue && o.v !== undefined ? ' — ' + fmtV(o.v) : ''); }
  function fSel(path, list, label, o) {
    o = o || {}; const v = getPath(state, path);
    let html = '<label class="field' + (o.span ? ' span2' : '') + '">' + lab(label, o.help) +
      '<select data-bind="' + path + '" data-type="str" data-rerender="1">' +
      (o.empty ? '<option value=""' + (!v ? ' selected' : '') + '>' + esc(o.empty) + '</option>' : '') +
      list.map(x => '<option value="' + esc(x.key) + '"' + (x.key === v ? ' selected' : '') + (x.disabled ? ' disabled' : '') + '>' + optLabel(x, o.showValue !== false) + '</option>').join('') +
      (o.custom ? '<option value="custom"' + (v === 'custom' ? ' selected' : '') + '>Custom value…</option>' : '') + '</select></label>';
    if (o.custom && v === 'custom') html += fNum(path + 'custom', 'Custom value', { step: 'any', help: 'A value that is not in the standard’s table. It will be flagged in the report.' });
    return html;
  }
  function fChoice(path, list, o) {
    o = o || {}; const v = getPath(state, path), name = 'c_' + path.replace(/\./g, '_');
    return '<div class="choice" role="radiogroup">' + list.map(x =>
      '<label><input type="radio" name="' + name + '" value="' + esc(x.key) + '" data-bind="' + path + '" data-type="str" data-rerender="1"' + (x.key === v ? ' checked' : '') + '>' +
      '<b>' + esc(x.label) + (x.v !== undefined && o.showValue !== false ? ' · ' + fmtV(x.v) : '') + '</b>' + (x.sub ? '<span>' + esc(x.sub) + '</span>' : '') + '</label>').join('') + '</div>';
  }
  function fChecks(path, list, o) {
    o = o || {}; const arr = getPath(state, path) || [];
    return list.map(x => '<label class="chk"><input type="checkbox" data-set="' + path + '" value="' + esc(x.key) + '"' + (arr.indexOf(x.key) >= 0 ? ' checked' : '') + ((o.disabled || {})[x.key] ? ' disabled' : '') + '><span>' + esc(x.label) + ' — ' + fmtV(x.v) + ((o.disabled || {})[x.key] ? ' <em>(' + o.disabled[x.key] + ')</em>' : '') + '</span></label>').join('');
  }
  function chip(text, warn) { return '<span class="chip' + (warn ? ' warn' : '') + '">' + text + '</span>'; }
  function stat(k, v) { return '<div class="stat"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
  function card(title, body, head) { return '<section class="card">' + (head ? '<div class="cardhead"><h2>' + title + '</h2>' + head + '</div>' : '<h2>' + title + '</h2>') + body + '</section>'; }
  function navFoot(prev, next) {
    const p = STEPS.find(s => s.id === prev), n = STEPS.find(s => s.id === next);
    return '<div class="navfoot">' + (p ? '<button type="button" class="btn" data-action="goto" data-step="' + p.id + '">← ' + p.label + '</button>' : '<span></span>') +
      (n ? '<button type="button" class="btn primary" data-action="goto" data-step="' + n.id + '">Next: ' + n.label + ' →</button>' : '') + '</div>';
  }

  // ---------- step: project ----------
  function stepProject() {
    const m = 'meta.';
    const riskCards = [
      { k: 'r1', t: 'R1 Loss of human life', s: 'Tolerable 1E-05 · almost always needed' },
      { k: 'r2', t: 'R2 Loss of service to the public', s: 'Tolerable 1E-04 · utilities, comms, health, retail' },
      { k: 'r3', t: 'R3 Loss of cultural heritage', s: 'Tolerable 1E-04 · listed buildings, museums' }
    ].map(x => '<label class="chk" style="border:1px solid var(--line-strong);border-radius:8px;padding:12px"><input type="checkbox" data-bind="risks.' + x.k + '" data-type="bool" data-rerender="1"' + (state.risks[x.k] ? ' checked' : '') + '><span><b>' + x.t + '</b><br><span class="sub">' + x.s + '</span></span></label>').join('') +
      '<label class="chk" style="border:1px dashed var(--line-strong);border-radius:8px;padding:12px;color:var(--faint)"><input type="checkbox" disabled><span><b>R4 Economic loss</b><br><span class="sub">Coming in a later version</span></span></label>';
    const sig = settings.signature ? '<img src="' + settings.signature + '" alt="Your signature"><button type="button" class="btn small danger" data-action="sigRemove">Remove signature</button>' : '<span class="sub">No signature uploaded.</span>';
    return '<div><h1>Project</h1><p class="lead">These details appear on the PDF cover and details page.</p></div>' +
      card('Project details', '<div class="grid two">' + fText(m + 'projectName', 'Project name', { rerender: false }) + fText(m + 'projectRef', 'Project ref') + fText(m + 'client', 'Client') + fText(m + 'calcRef', 'Calculation ref', { placeholder: 'Optional' }) + fArea(m + 'address', 'Site address', { rows: 2 }) + '</div>') +
      card('Case', '<div class="grid two">' + fText(m + 'caseName', 'Case name') +
        fSel(m + 'caseStatus', [{ key: 'existing', label: 'As found (existing)' }, { key: 'proposed', label: 'With proposed protection' }], 'Case status', { showValue: false, help: 'Printed on the report so the “before” and “after” PDFs are clearly labelled.' }) +
        fArea(m + 'notes', 'Survey / case notes', { rows: 4 }) + '</div>') +
      card('Risks to assess', '<div class="grid two">' + riskCards + '</div>') +
      card('Assessor and declaration', '<div class="grid">' + fText(m + 'assessor', 'Completed by') + fText(m + 'position', 'Position', { placeholder: 'e.g. Technical Director' }) + fText(m + 'date', 'Date of assessment') + '</div>' +
        '<label class="chk"><input type="checkbox" data-bind="meta.declaration" data-type="bool"' + (state.meta.declaration ? ' checked' : '') + '><span>Include the declaration page in the PDF</span></label>' +
        '<div class="field">' + lab('Signature image', 'Upload a scan or photo of your signature (PNG or JPG). It stays on this device and is added to the declaration page.') +
        '<div class="sigbox">' + sig + '<label class="btn small" for="sigFile">Upload signature</label><input type="file" id="sigFile" accept="image/png,image/jpeg" hidden></div></div>' +
        '<p class="sub">Your name, position and signature are remembered on this device for the next assessment.</p>') +
      card('Example', '<p class="sub">Load the Tobacco Warehouse example to see a complete assessment. It replaces the current one, so save first if needed.</p><div><button type="button" class="btn" data-action="example">Load example</button></div>') +
      navFoot(null, 'environment');
  }

  // ---------- step: environment ----------
  function stepEnvironment() {
    const cd = T.CD.map(x => Object.assign({}, x, { label: ({ higher: 'Taller objects around', same: 'Similar or lower', isolated: 'Isolated', hilltop: 'Hilltop' })[x.key], sub: x.label }));
    return '<div><h1>Environment</h1><p class="lead">How often lightning strikes the area, and what surrounds the building.</p></div>' +
      card('Lightning ground flash density N_G', '<div class="grid">' +
        fNum('env.NG', 'Flashes per km² per year', { step: 0.01, help: 'Read N_G for the site from the UK flash density map. UK values are usually between 0.1 and 1.0.' }) +
        '<label class="field">' + lab('Only know thunderstorm days?', 'N_G ≈ 0.1 × thunderstorm days per year (formula A.1).') + '<input type="number" min="0" step="1" id="tdHelper" data-action="td" placeholder="Thunderstorm days / year"></label></div>') +
      card('What surrounds the building? (C_D)', fChoice('env.CD', cd)) +
      card('Type of area (C_E)', '<p class="sub">Used for every line section unless changed on the Lines step.</p>' + fChoice('env.CE', T.CE)) +
      navFoot('project', 'structure');
  }

  // ---------- step: structure ----------
  function viewerBlock() {
    const L = ui.layers;
    const c = (k, t) => '<label class="chk"><input type="checkbox" data-layer="' + k + '"' + (L[k] ? ' checked' : '') + '><span>' + t + '</span></label>';
    return card('3D view', '<div id="viewerHost"></div><div class="layers">' + c('mesh', 'Air termination') + c('dc', 'Down conductors') + c('earth', 'Earthing') + c('collect', 'Collection area') + c('sphere', 'Rolling sphere') + c('adj', 'Adjacent structures') + '</div>' +
      '<div class="legend"><span><i class="sw" style="background:var(--copper)"></i>Conductors</span><span><i class="sw" style="background:var(--earth)"></i>Earthing</span><span><i class="sw" style="background:var(--collect)"></i>Collection area</span><span><i class="sw" style="background:var(--sphere)"></i>Rolling sphere</span><span>Drag to rotate · pinch or scroll to zoom</span></div>');
  }
  function stepStructure() {
    const s = state.structure, r = result;
    const shapes = [
      { key: 'rect', label: 'Rectangular', sub: 'Flat roof, one height' },
      { key: 'pitched', label: 'Pitched roof', sub: 'Eaves and ridge heights' },
      { key: 'protrusion', label: 'With protrusion', sub: 'Tower, chimney or plant room' }
    ];
    let dims = fNum('structure.L', 'Length L (m)', { step: 0.1 }) + fNum('structure.W', 'Width W (m)', { step: 0.1 }) +
      fNum('structure.H', s.shape === 'pitched' ? 'Eaves height (m)' : (s.shape === 'protrusion' ? 'Main roof height (m)' : 'Height H (m)'), { step: 0.1 });
    if (s.shape === 'pitched') dims += fNum('structure.Hr', 'Ridge height (m)', { step: 0.1, help: 'Must be at least the eaves height.' }) + fSel('structure.ridgeDir', [{ key: 'L', label: 'Along the length' }, { key: 'W', label: 'Along the width' }], 'Ridge runs', { showValue: false });
    if (s.shape === 'protrusion') dims += fNum('structure.Hp', 'Protrusion top height (m)', { step: 0.1, help: 'Height from ground to the top of the tower, chimney or plant room.' }) + fNum('structure.Pw', 'Protrusion size (m)', { step: 0.1, help: 'Plan size of the protrusion (square), centred on the roof.' });
    const autoP = (+s.L > 0 && +s.W > 0) ? 2 * (+s.L + +s.W) : '';
    dims += fNum('structure.perimeter', 'Perimeter (m)', { step: 0.1, placeholder: autoP ? 'Auto: ' + fmtN(autoP, 1) : 'Auto: 2 × (L + W)', help: 'Used for the number of down conductors. Leave blank for 2 × (L + W); enter the real perimeter for non-rectangular footprints.' });
    let calc = '<p class="sub">Enter the strike density and dimensions to see the collection area.</p>';
    if (r && ready()) {
      calc = '<div class="stats">' + stat('A_D collection area', '<span data-out="AD">' + fmtN(r.structure.AD) + '</span> m²') +
        (s.shape !== 'rect' ? stat('A_D using eaves height only', fmtN(r.structure.ADeaves) + ' m²') : '') +
        stat('A_M area near structure', '<span data-out="AM">' + fmtN(r.structure.AM) + '</span> m²') +
        stat('N_D strikes per year', '<span data-out="ND">' + fmtE(r.structure.ND) + '</span>') + stat('N_M nearby strikes per year', '<span data-out="NM">' + fmtE(r.structure.NM) + '</span>') + '</div>' +
        '<p class="sub">Method: <span data-out="ADm">' + esc(r.structure.ADmethod) + '</span>.</p>';
    }
    return '<div><h1>Structure</h1><p class="lead">The building being assessed. Its shape and size set the collection area A_D.</p></div>' +
      card('Shape', fChoice('structure.shape', shapes)) +
      card('Dimensions', '<div class="grid">' + dims + '</div>') +
      card('Calculated', calc) + viewerBlock() + navFoot('environment', 'lines');
  }

  // ---------- step: lines ----------
  function stepLines() {
    const lines = state.lines;
    if (ui.line >= lines.length) ui.line = Math.max(0, lines.length - 1);
    const list = lines.map((l, i) => {
      const sec = l.sections || [];
      const len = sec.reduce((p, q) => p + (+q.length || 0), 0);
      const aj = state.adjacent.find(a => a.id === l.adjacentId);
      return '<a href="#" data-action="pickLine" data-i="' + i + '"' + (i === ui.line ? ' aria-current="true"' : '') + '><b>' + (i + 1) + ' · ' + esc(l.name || 'Unnamed line') + '</b><span>' +
        (l.type === 'telecom' ? 'Telecom' : 'Power') + ' · ' + T.find(T.CI, (sec[0] || {}).CI).label.split(' ')[0].toLowerCase() + ' · ' + (len ? fmtN(len, 0) + ' m' : 'length ?') + (aj ? ' · ' + esc(aj.name) : '') + '</span></a>';
    }).join('');
    const side = '<div class="list"><h1>Lines</h1>' + (list || '<p class="sub">No lines entered. A structure with no incoming services has no line risks.</p>') +
      '<button type="button" class="btn ghost" data-action="addLine">+ Add line</button>' + (lines.length ? '<button type="button" class="btn" data-action="dupLine">Duplicate this line</button>' : '') +
      '<p class="sub">Several lines on the same route? The standard says enter only the worst one.</p></div>';
    if (!lines.length) return '<div class="split">' + side + '<div class="detail"></div></div>' + navFoot('structure', 'zones');

    const i = ui.line, l = lines[i], p = 'lines.' + i + '.', rl = result && result.lines[i];
    const con = T.find(T.construction, l.construction);
    let det = card('Line details', '<div class="grid two">' + fText(p + 'name', 'Name') +
      fSel(p + 'type', [{ key: 'power', label: 'Power' }, { key: 'telecom', label: 'Telecom / data' }], 'Line type', { showValue: false }) +
      fSel(p + 'CT', T.CT, 'Supply (C_T)', { help: 'Use 0.2 only where the line is fed from an HV/LV transformer on the line itself.' }) +
      fSel(p + 'construction', T.construction, 'Cable construction', { showValue: false, help: 'Sets C_LD and C_LI (Table NB.4) and which row of P_LD applies (Table NB.8).' }) +
      (con.pld === 'shielded' ? fSel(p + 'RS', T.RS, 'Cable screen resistance R_S', { showValue: false }) : '') +
      fSel(p + 'UW', T.UW, 'Equipment withstand voltage U_W', { showValue: false, help: 'Rated impulse withstand voltage of the equipment connected to this line. Use the lowest if there is a mix.' }) +
      fSel(p + 'KS3', T.KS3, 'Internal wiring (K_S3)', { help: 'How the internal wiring for this line is routed (Table NB.5).' }) + '</div>' +
      (rl ? '<div class="chips"><span class="sub">Gives:</span>' + chip('C_LD ' + fmtV(rl.CLD), l.overrides && l.overrides.CLD !== undefined && l.overrides.CLD !== '') + chip('C_LI ' + fmtV(rl.CLI), l.overrides && l.overrides.CLI !== undefined && l.overrides.CLI !== '') +
        chip('P_LD ' + fmtV(rl.PLD), l.overrides && l.overrides.PLD !== undefined && l.overrides.PLD !== '') + chip('P_LI ' + fmtV(rl.PLI), l.overrides && l.overrides.PLI !== undefined && l.overrides.PLI !== '') + chip('K_S4 ' + fmtV(rl.KS4)) +
        '<button type="button" class="btn small" data-action="toggleOv">' + (ui.showOverrides[l.id] ? 'Hide manual values' : 'Edit values') + '</button></div>' : '') +
      (ui.showOverrides[l.id] ? '<div class="grid">' + ['CLD', 'CLI', 'PLD', 'PLI'].map(k => fNum(p + 'overrides.' + k, k.replace(/^([CP])L/, '$1_L') + ' manual value', { step: 'any', placeholder: 'From table', help: 'Leave blank to use the table value. Any value entered is flagged in the report.' })).join('') + '</div>' : ''));

    const secRows = (l.sections || []).map((sc, si) => {
      const rs = rl && rl.sections[si];
      return '<tr><td>' + (si + 1) + '</td>' +
        '<td><input type="number" min="0" step="any" aria-label="Section ' + (si + 1) + ' length" data-bind="' + p + 'sections.' + si + '.length" data-type="num" value="' + esc(sc.length) + '" placeholder="1000"></td>' +
        '<td><select aria-label="Section ' + (si + 1) + ' routing" data-bind="' + p + 'sections.' + si + '.CI" data-type="str" data-rerender="1">' + T.CI.map(x => '<option value="' + x.key + '"' + (x.key === sc.CI ? ' selected' : '') + '>' + esc(x.label) + ' — ' + x.v + '</option>').join('') + '</select></td>' +
        '<td><select aria-label="Section ' + (si + 1) + ' environment" data-bind="' + p + 'sections.' + si + '.CE" data-type="str" data-rerender="1"><option value="">Site value</option>' + T.CE.map(x => '<option value="' + x.key + '"' + (x.key === sc.CE ? ' selected' : '') + '>' + esc(x.label) + ' — ' + x.v + '</option>').join('') + '</select></td>' +
        '<td><span data-out="NL' + si + '">' + (rs ? fmtE(rs.NL) : '—') + '</span></td><td><span data-out="NI' + si + '">' + (rs ? fmtE(rs.NI) : '—') + '</span></td>' +
        '<td>' + ((l.sections.length > 1) ? '<button type="button" class="btn small danger" data-action="delSection" data-si="' + si + '" aria-label="Remove section ' + (si + 1) + '">Remove</button>' : '') + '</td></tr>';
    }).join('');
    det += card('Sections (structure to first node)', '<div class="tablewrap"><table class="data"><thead><tr><th>#</th><th>Length (m)</th><th>Routing C_I</th><th>Environment C_E</th><th>N_L</th><th>N_I</th><th></th></tr></thead><tbody>' + secRows + '</tbody></table></div>' +
      '<p class="sub">Length not known? Leave it blank: 1000 m is used and flagged in the report.</p>', '<button type="button" class="btn small" data-action="addSection">+ Add section</button>');

    const aj = state.adjacent.find(a => a.id === l.adjacentId);
    const adjOpts = [{ key: '', label: 'No adjacent structure' }].concat(state.adjacent.map(a => ({ key: a.id, label: a.name || 'Unnamed structure' }))).concat([{ key: '__new', label: '+ New structure…' }]);
    let adjBody = '<label class="field">' + lab('Structure at the far end of this line', 'A substation, exchange or other building the line connects to. Strikes to it add N_DJ to this line.') +
      '<select data-bind="' + p + 'adjacentId" data-type="str" data-rerender="1">' + adjOpts.map(x => '<option value="' + esc(x.key) + '"' + (x.key === (l.adjacentId || '') ? ' selected' : '') + '>' + esc(x.label) + '</option>').join('') + '</select></label>';
    if (aj) {
      const ai = state.adjacent.indexOf(aj), ap = 'adjacent.' + ai + '.';
      const users = state.lines.filter(x => x.adjacentId === aj.id).length;
      adjBody += '<div class="grid">' + fText(ap + 'name', 'Name') + fNum(ap + 'L', 'L (m)', { step: 0.1 }) + fNum(ap + 'W', 'W (m)', { step: 0.1 }) + fNum(ap + 'H', 'H (m)', { step: 0.1 }) + fSel(ap + 'CD', T.CD, 'Its surroundings (C_DJ)') + '</div>' +
        (rl ? '<div class="chips">' + chip('A_DJ ' + fmtN(rl.ADJ) + ' m²') + chip('N_DJ <span data-out="NDJ">' + fmtE(rl.NDJ) + '</span>') + (users > 1 ? '<span class="sub">Shared with ' + (users - 1) + ' other line' + (users > 2 ? 's' : '') + '</span>' : '') + '</div>' : '');
    }
    det += card('Adjacent structure', adjBody);
    det += '<div><button type="button" class="btn danger" data-action="delLine">Remove this line</button></div>';
    return '<div class="split">' + side + '<div class="detail">' + det + '</div></div>' + navFoot('structure', 'zones');
  }

  // ---------- step: zones ----------
  function stepZones() {
    const zones = state.zones;
    if (ui.zone >= zones.length) ui.zone = Math.max(0, zones.length - 1);
    const r = result;
    const list = zones.map((z, i) => '<a href="#" data-action="pickZone" data-i="' + i + '"' + (i === ui.zone ? ' aria-current="true"' : '') + '><b>' + (i + 1) + ' · ' + esc(z.name || 'Unnamed zone') + '</b><span>' + (z.location === 'outside' ? 'Outside' : 'Inside') + ' · ' + (z.nz === '' ? '?' : esc(z.nz)) + ' people</span></a>').join('');
    const ntAuto = zones.reduce((p, z) => p + (+z.nz || 0), 0);
    const side = '<div class="list"><h1>Zones</h1>' + list + '<button type="button" class="btn ghost" data-action="addZone">+ Add zone</button>' +
      '<div class="card" style="padding:12px;gap:6px"><span class="sub">Total people n_t</span>' +
      '<input type="number" min="0" step="1" aria-label="Total people override" data-bind="totals.nt" data-type="num" value="' + esc(state.totals.nt) + '" placeholder="Auto: ' + ntAuto + '" style="min-height:40px;border:1px solid var(--line-strong);border-radius:6px;padding:0 10px;font-family:var(--mono)">' +
      '<span class="sub">Blank = sum of zones (' + ntAuto + ')</span></div></div>';
    if (!zones.length) return '<div class="split">' + side + '<div class="detail"><p class="sub">Add at least one zone.</p></div></div>' + navFoot('lines', 'protection');

    const i = ui.zone, z = zones[i], p = 'zones.' + i + '.', rz = r && r.zones[i];
    const outside = z.location === 'outside';
    let det = card('Zone and occupancy', '<div class="grid two">' + fText(p + 'name', 'Zone name') +
      '<div class="field">' + lab('Location', 'Outside zones (LPZ 0) only count touch and step voltage from strikes to the structure (R_A).') +
      fChoice(p + 'location', [{ key: 'inside', label: 'Inside the structure' }, { key: 'outside', label: 'Outside (touch & step only)' }], { showValue: false }) + '</div></div>' +
      '<div class="grid">' + fNum(p + 'nz', 'People in zone n_z', { step: 1 }) + fNum(p + 'tz', 'Hours present per year t_z', { step: 1, help: 'Default 8760 (all year). The UK building-type L_F values assume continuous occupancy.' }) +
      '<label class="field">' + lab('Or work it out: hours per day') + '<input type="number" min="0" max="24" step="0.5" data-action="hpd" placeholder="h/day × 365"></label></div>');
    let chars = '<div class="grid two">' + fSel(p + 'rt', T.rt, 'Floor or ground surface (r_t)', { help: 'Table NC.3. Affects touch and step voltage risk.' });
    if (!outside) {
      chars += fSel(p + 'LF1', T.LF1, 'Building type (L_F, UK table)', { custom: true, help: 'UK Table NC.2 typical loss for physical damage.' }) +
        fSel(p + 'rf', T.rf, 'Fire or explosion risk (r_f)', { help: 'Table NC.5. High: over 800 MJ/m² or combustible construction. Ordinary: 400–800. Low: under 400.' }) +
        fSel(p + 'hz', T.hz, 'Special hazard (h_z)', { help: 'Table NC.6.' }) +
        fSel(p + 'LO1', T.LO1, 'Internal system failure endangers life (L_O)', { custom: true, help: 'Only for risk of explosion or hospitals. Adds R_C, R_M, R_W and R_Z to R1.' }) +
        fSel(p + 'ks2', T.SHIELD, 'Internal shielding (K_S2)', { showValue: false });
      if (z.ks2 === 'grid') chars += fNum(p + 'ks2w', 'Internal shield mesh width (m)', { step: 0.1 });
    }
    chars += '</div>';
    det += card('Zone characteristics', chars);
    if (state.risks.r2 && !outside) det += card('Public service · R2', '<div class="grid">' + fNum(p + 'users', 'Users served by this zone', { step: 1 }) + fNum('totals.nt2', 'Total users (blank = sum)', { step: 1 }) + '</div><p class="sub">Service provider loss values: L_F 0.1, L_O 0.01 (Table NC.8).</p>');
    if (state.risks.r3 && !outside) det += card('Cultural heritage · R3', '<div class="grid">' + fNum(p + 'cz', 'Heritage value in zone c_z (£)', { step: 1 }) + fNum('totals.ct3', 'Total value c_t (£, blank = sum)', { step: 1 }) + fSel(p + 'LF3', T.LF3, 'Heritage loss L_F', { custom: true }) + '</div>');
    if (rz) {
      let ch = chip('L_A = L_U ' + fmtE(rz.L1.LA));
      if (!outside) ch += chip('L_B = L_V ' + fmtE(rz.L1.LB)) + chip('L_C…L_Z ' + fmtE(rz.L1.LC));
      if (state.risks.r2 && !outside) ch += chip('L_B2 ' + fmtE(rz.L2.LB)) + chip('L_C2 ' + fmtE(rz.L2.LC));
      if (state.risks.r3 && !outside) ch += chip('L_B3 ' + fmtE(rz.L3.LB));
      det += card('Calculated losses for this zone', '<div class="chips">' + ch + '</div><p class="sub">Uses fire provisions r_p = ' + fmtV(rz.rp) + ' from the Protection step.</p>');
    }
    if (zones.length > 1) det += '<div><button type="button" class="btn danger" data-action="delZone">Remove this zone</button></div>';
    return '<div class="split">' + side + '<div class="detail">' + det + '</div></div>' + navFoot('lines', 'protection');
  }

  // ---------- step: protection ----------
  function stepProtection() {
    const pr = state.protection, r = result, d = r && r.design;
    let lps = '<div class="grid two">' + fSel('protection.lps', T.LPS.map(x => Object.assign({}, x, { v: x.PB })), 'Lightning protection level (P_B)', { help: 'Sets P_B (Table NB.2) and the design values from BS EN 62305-3.' }) +
      fSel('protection.earthing', [{ key: 'A', label: 'Type A — rod per down conductor' }, { key: 'B', label: 'Type B — ring earth' }, { key: 'Bmesh', label: 'Type B — meshed earth' }], 'Earthing arrangement', { showValue: false, help: 'A meshed earth allows “effective soil equipotentialisation” (P_TA 0.01) and C_I 0.01 for lines buried inside it.' }) +
      fSel('protection.ks1', T.SHIELD, 'Structure screening (K_S1)', { showValue: false, help: 'Grid-like LPS or metal framework at the LPZ 0/1 boundary: K_S1 = 0.12 × mesh width (NB.5).' }) +
      (pr.ks1 === 'grid' ? fNum('protection.ks1w', 'Screen mesh width w_m1 (m)', { step: 0.1 }) : '') + '</div>';
    if (d && d.cls) {
      lps += '<div class="stats">' + stat('Rolling sphere', d.sphere + ' m') + stat('Roof mesh', d.mesh + ' × ' + d.mesh + ' m') +
        stat('Down conductors', d.N + ' <span class="sub">(' + fmtN(d.perimeter, 0) + ' ÷ ' + d.dcSpacing + ' m)</span>') +
        stat('Earthing', d.earthing === 'A' ? d.N + ' electrodes' : (d.earthing === 'Bmesh' ? 'Meshed ring earth' : 'Ring earth')) + '</div>';
    }
    const cls = d && d.cls;
    const rows = state.lines.map((l, i) => {
      const lp = (pr.lines && pr.lines[l.id]) || {};
      const sel = (k, v) => '<select aria-label="' + esc(l.name) + ' ' + k + '" data-bind="protection.lines.' + l.id + '.' + k + '" data-type="str" data-rerender="1">' + T.SPD.map(x => '<option value="' + x.key + '"' + (x.key === (v || 'none') ? ' selected' : '') + '>' + esc(x.label) + ' — ' + x.v + '</option>').join('') + '</select>';
      return '<tr><td>' + (i + 1) + ' · ' + esc(l.name) + '</td><td>' + sel('peb', lp.peb) + '</td><td>' + sel('pspd', lp.pspd) + '</td><td>' + (d && d.ISPD ? fmtN(d.ISPD, 1) + ' kA' : '—') + '</td></tr>';
    }).join('');
    const spd = state.lines.length ? '<div class="tablewrap"><table class="data"><thead><tr><th>Line</th><th>Service entrance SPD (P_EB)</th><th>Coordinated SPD set (P_SPD)</th><th>I_SPD</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="sub">' + (d && d.ISPD ? 'I_SPD = ' + d.Imax + ' kA × 50% ÷ ' + d.nLines + ' lines. ' : '') + 'Coordinated SPDs only reduce P_C where there is an LPS (UK annex NB.3). Enhanced (*) levels need SPDs with a low protection level U_P.</p>' : '<p class="sub">No lines entered.</p>';
    const zoneCards = state.zones.map(z => {
      const zp = 'protection.zones.' + z.id + '.';
      if (!getPath(state, 'protection.zones.' + z.id)) setPath(state, 'protection.zones.' + z.id, { rp: 'none', pta: [], ptu: [] });
      const dis = pr.earthing === 'Bmesh' ? {} : { equipot: 'needs a meshed earth' };
      return '<fieldset class="card" style="margin:0"><legend style="font-weight:600;padding:0 6px">' + esc(z.name) + (z.location === 'outside' ? ' · outside' : '') + '</legend>' +
        (z.location !== 'outside' ? fSel(zp + 'rp', T.rp, 'Fire provisions (r_p)', { help: 'Table NC.4. Automatic systems count only if protected against overvoltage and the fire service can arrive within 10 minutes.' }) : '') +
        '<span class="sub"><b>Touch and step, strikes to the structure (P_TA)</b></span>' + fChecks(zp + 'pta', T.PTA, { disabled: dis }) +
        (z.location !== 'outside' && state.lines.length ? '<span class="sub"><b>Touch voltage, strikes to lines (P_TU)</b></span>' + fChecks(zp + 'ptu', T.PTU) : '') + '</fieldset>';
    }).join('');
    return '<div><h1>Protection measures</h1><p class="lead">Everything that reduces risk, in one place. Run the assessment with nothing set, export the PDF, then add measures here and export again.</p></div>' +
      card('Structural lightning protection', lps) +
      card('Surge protection per line', spd, (state.lines.length && cls) ? '<button type="button" class="btn small" data-action="matchSPD">Match all lines to LPS level</button>' : '') +
      card('Measures per zone', '<div class="grid two">' + zoneCards + '</div>') +
      viewerBlock() + navFoot('zones', 'results');
  }

  // ---------- step: results ----------
  function compTable(key) {
    const r = result, cols = key === 'r3' ? ['RB', 'RV'] : (key === 'r2' ? ['RB', 'RC', 'RM', 'RV', 'RW', 'RZ'] : ['RA', 'RB', 'RC', 'RM', 'RU', 'RV', 'RW', 'RZ']);
    const lineCols = c => ['RU', 'RV', 'RW', 'RZ'].indexOf(c) >= 0;
    let max = 0, rows = '';
    r.zones.forEach(z => { const x = z[key.toUpperCase()]; cols.forEach(c => { if (!lineCols(c) && x[c] > max) max = x[c]; }); x.lines.forEach(l => cols.forEach(c => { if (lineCols(c) && l[c] > max) max = l[c]; })); });
    r.zones.forEach(z => {
      const x = z[key.toUpperCase()];
      rows += '<tr class="group"><td>' + esc(z.name) + (z.inside ? '' : ' (outside)') + '</td>' + cols.map(c => {
        if (lineCols(c)) return '<td></td>';
        if (!z.inside && c !== 'RA') return '<td class="na">n/a</td>';
        return '<td' + (x[c] === max && max > 0 ? ' class="hi"' : '') + '>' + fmtE(x[c]) + '</td>';
      }).join('') + '</tr>';
      if (z.inside) r.lines.forEach((l, li) => {
        const y = x.lines[li];
        rows += '<tr><td>&nbsp;&nbsp;↳ ' + esc(l.name) + '</td>' + cols.map(c => lineCols(c) ? '<td' + (y[c] === max && max > 0 ? ' class="hi"' : '') + '>' + fmtE(y[c]) + '</td>' : '<td></td>').join('') + '</tr>';
      });
    });
    rows += '<tr class="total"><td>Total ' + key.toUpperCase() + '</td>' + cols.map(c => '<td>' + fmtE(r.totals[key].comps[c]) + '</td>').join('') + '</tr>';
    return '<div class="tablewrap"><table class="data"><thead><tr><th>Source</th>' + cols.map(c => '<th>' + c.replace('R', 'R_') + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function stepResults() {
    if (!result || !ready()) return '<div><h1>Results</h1><p class="lead">Enter the strike density, structure dimensions and at least one zone to see results.</p></div>' + navFoot('protection', 'report');
    const r = result, keys = ['r1', 'r2', 'r3'].filter(k => state.risks[k]);
    if (keys.indexOf(ui.resRisk) < 0) ui.resRisk = keys[0];
    const names = { r1: 'R1 · Loss of human life', r2: 'R2 · Loss of service to the public', r3: 'R3 · Loss of cultural heritage' };
    const cards = keys.map(k => {
      const t = r.totals[k], rt = r.RT[k], over = t.total > rt;
      return '<div class="rcard' + (over ? ' over' : '') + '"><span class="k">' + names[k] + '</span><span class="v">' + fmtE(t.total) + '</span><span class="verdict' + (over ? ' over' : '') + '">' + (over ? 'Exceeds tolerable · limit ' : 'Tolerable · limit ') + fmtE(rt) + ' (' + fmtN(t.total / rt * 100, 1) + '% of limit)</span></div>';
    }).join('');
    const t1 = r.totals[ui.resRisk], tot = t1.total || 1;
    const brk = '<div class="stats">' + stat('Direct (strikes to the building)', fmtE(t1.direct)) + stat('Indirect (nearby and lines)', fmtE(t1.indirect)) +
      stat('Shock · Fire · Systems', fmtN(t1.shock / tot * 100, 0) + '% · ' + fmtN(t1.fire / tot * 100, 0) + '% · ' + fmtN(t1.systems / tot * 100, 0) + '%') + '</div>';
    const tabs = keys.length > 1 ? '<div role="group" aria-label="Risk shown" style="display:flex;gap:4px">' + keys.map(k => '<button type="button" class="btn small" data-action="resRisk" data-k="' + k + '" aria-pressed="' + (k === ui.resRisk) + '">' + k.toUpperCase() + '</button>').join('') + '</div>' : '';

    const s = r.structure;
    const lineRows = r.lines.map(l => '<tr><td>' + esc(l.name) + '</td><td>' + fmtE(l.NL) + '</td><td>' + fmtE(l.NI) + '</td><td>' + fmtE(l.NDJ) + '</td><td>' + fmtV(l.CLD) + '</td><td>' + fmtV(l.CLI) + '</td><td>' + fmtV(l.PLD) + '</td><td>' + fmtV(l.PLI) + '</td><td>' + fmtV(l.PEB) + '</td><td>' + fmtV(l.PSPD) + '</td><td>' + fmtE(l.PV) + '</td><td>' + fmtE(l.PW) + '</td><td>' + fmtE(l.PZ) + '</td></tr>').join('');
    const zoneRows = r.zones.map(z => '<tr><td>' + esc(z.name) + '</td><td>' + fmtV(z.PTA) + '</td><td>' + fmtE(z.PA) + '</td><td>' + fmtE(z.PC) + '</td><td>' + fmtE(z.PM) + '</td><td>' + fmtE(z.L1.LA) + '</td><td>' + fmtE(z.L1.LB) + '</td><td>' + fmtE(z.L1.LC) + '</td></tr>').join('');
    const puRows = r.zones.filter(z => z.inside).map(z => z.perLine.map((p, i) => '<tr><td>' + esc(z.name) + ' · ' + esc(r.lines[i].name) + '</td><td>' + fmtE(p.PMS) + '</td><td>' + fmtE(p.PM) + '</td><td>' + fmtE(p.PU) + '</td></tr>').join('')).join('');
    const steps = '<details class="calc" open><summary>Collection areas and dangerous events (A, N)</summary><div><div class="stats">' +
      stat('A_D', fmtN(s.AD) + ' m²') + stat('A_M', fmtN(s.AM) + ' m²') + stat('N_D', fmtE(s.ND)) + stat('N_M', fmtE(s.NM)) + stat('N_G · C_D', fmtV(r.env.NG) + ' · ' + fmtV(r.env.CD)) + '</div></div></details>' +
      (r.lines.length ? '<details class="calc"><summary>Lines (N and P)</summary><div><div class="tablewrap"><table class="data"><thead><tr><th>Line</th><th>N_L</th><th>N_I</th><th>N_DJ</th><th>C_LD</th><th>C_LI</th><th>P_LD</th><th>P_LI</th><th>P_EB</th><th>P_SPD</th><th>P_V</th><th>P_W</th><th>P_Z</th></tr></thead><tbody>' + lineRows + '</tbody></table></div>' +
        '<div class="tablewrap"><table class="data"><thead><tr><th>Zone · line</th><th>P_MS</th><th>P_M</th><th>P_U</th></tr></thead><tbody>' + puRows + '</tbody></table></div></div></details>' : '') +
      '<details class="calc"><summary>Zones (P and L for R1)</summary><div><div class="stats">' + stat('P_B', fmtV(r.PB)) + stat('K_S1', fmtV(r.KS1)) + stat('n_t', fmtV(r.nt)) + '</div><div class="tablewrap"><table class="data"><thead><tr><th>Zone</th><th>P_TA</th><th>P_A</th><th>P_C</th><th>P_M</th><th>L_A = L_U</th><th>L_B = L_V</th><th>L_C…L_Z</th></tr></thead><tbody>' + zoneRows + '</tbody></table></div></div></details>';
    const flags = r.flags.length ? card('Notes and overrides (' + r.flags.length + ')', '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + r.flags.map(f => '<li>' + esc(f.text) + '</li>').join('') + '</ul>') : '';
    return '<div><h1>Results</h1></div><div class="resultcards">' + cards + '</div>' +
      card(ui.resRisk.toUpperCase() + ' breakdown', brk + compTable(ui.resRisk) + '<p class="sub">Highlighted: largest component. Outside zones only count R_A.</p>', tabs) +
      card('Step-by-step values', steps) + flags + navFoot('protection', 'report');
  }

  // ---------- step: report ----------
  function stepReport() {
    const ok = result && ready();
    const ps = ok ? R.protectionSummary(state, result) : null;
    const psHtml = ps ? '<h3 style="margin:0;font-size:15px">' + esc(ps.heading) + '</h3>' + (ps.warning ? '<p class="flags" style="margin:0">' + esc(ps.warning) + '</p>' : '') +
      '<div class="grid two">' + ps.rows.map(([k, v]) => '<div class="field"><span class="lab">' + esc(k) + '</span><span>' + v.map(esc).join('<br>') + '</span></div>').join('') + '</div>' : '<p class="sub">Complete the earlier steps to build the report.</p>';
    const kinds = [{ key: 'full', label: 'Full report', sub: 'Every input and every calculation step' }, { key: 'summary', label: 'Summary report', sub: 'Inputs and only the calculations that contribute' }];
    return '<div><h1>Report</h1><p class="lead">Branded PDF for the client. The PDF is built on this device and works offline.</p></div>' +
      card('Report type', '<div class="choice" role="radiogroup">' + kinds.map(k => '<label><input type="radio" name="rtype" value="' + k.key + '" data-action="rtype"' + (ui.reportType === k.key ? ' checked' : '') + '><b>' + k.label + '</b><span>' + k.sub + '</span></label>').join('') + '</div>' +
        '<label class="chk"><input type="checkbox" data-bind="meta.declaration" data-type="bool"' + (state.meta.declaration ? ' checked' : '') + '><span>Include the declaration page' + (settings.signature ? ' with your signature' : ' (no signature uploaded — add one on the Project step)') + '</span></label>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn primary" data-action="pdf"' + (ok ? '' : ' disabled') + '>Create PDF</button><button type="button" class="btn" data-action="save">Save assessment file</button></div>') +
      card('Protection summary (as printed)', psHtml) + navFoot('results', null);
  }

  // ---------- live panel ----------
  function renderLive() {
    const el = $('live');
    if (!result || !ready()) { el.innerHTML = '<div class="livecard"><h2>Live result</h2><p class="sub" style="margin:0">Enter the strike density, structure size and a zone to see the risk.</p></div>'; return; }
    const names = { r1: 'R1 Human life', r2: 'R2 Public service', r3: 'R3 Heritage' };
    const risks = ['r1', 'r2', 'r3'].filter(k => state.risks[k]).map(k => {
      const v = result.totals[k].total, rt = result.RT[k], over = v > rt, pct = Math.max(2, Math.min(100, v / rt * 100));
      return '<div class="risk"><div class="row"><span class="name">' + names[k] + '</span><span class="num">' + fmtE(v) + '</span></div><div class="bar' + (over ? ' over' : '') + '"><i style="width:' + pct + '%"></i></div><span class="verdict' + (over ? ' over' : '') + '">' + (over ? 'Exceeds' : 'Tolerable') + ' — limit ' + fmtE(rt) + '</span></div>';
    }).join('');
    const c = result.totals.r1.comps, tot = result.totals.r1.total;
    let contrib = '';
    if (state.risks.r1 && tot > 0) {
      const items = [['R_B physical damage', c.RB], ['R_A touch and step', c.RA], ['Lines R_U + R_V', c.RU + c.RV], ['Internal systems', c.RC + c.RM + c.RW + c.RZ]].filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      contrib = '<div class="livecard contribcard"><h2>Biggest R1 contributors</h2><div class="contrib">' + items.map(x => '<div><span>' + x[0] + '</span><span>' + fmtN(x[1] / tot * 100, 1) + '%</span></div>').join('') + '</div></div>';
    }
    const flags = result.flags.length ? '<div class="flags"><h2>' + result.flags.length + ' note' + (result.flags.length > 1 ? 's' : '') + ' for the report</h2><ul>' + result.flags.slice(0, 4).map(f => '<li>' + esc(f.text) + '</li>').join('') + (result.flags.length > 4 ? '<li>…and ' + (result.flags.length - 4) + ' more on the Results step</li>' : '') + '</ul></div>' : '';
    el.innerHTML = '<div class="livecard"><h2>Live result</h2>' + risks + '</div>' + contrib + flags;
  }

  // ---------- render ----------
  function renderNav() {
    $('steps').innerHTML = STEPS.map((s, i) => '<a href="#' + s.id + '" data-action="goto" data-step="' + s.id + '"' + (s.id === ui.step ? ' aria-current="step"' : '') + '><span class="n">' + (i + 1) + '</span>' + s.label + '</a>').join('');
    const st = STEPS.findIndex(s => s.id === ui.step);
    $('stepLabel').textContent = 'Step ' + (st + 1) + ' of 8 · ' + STEPS[st].label;
    $('projName').textContent = (state.meta.projectName || 'New assessment') + (state.meta.projectRef ? ' — ' + state.meta.projectRef : '');
  }
  function renderStep(keepScroll) {
    hid = 0;
    const fns = { project: stepProject, environment: stepEnvironment, structure: stepStructure, lines: stepLines, zones: stepZones, protection: stepProtection, results: stepResults, report: stepReport };
    const y = window.scrollY;
    $('step').innerHTML = fns[ui.step]();
    // help markup trick: hint paragraphs sit outside the label span
    $('step').querySelectorAll('span[hidden]:empty').forEach(n => n.remove());
    const host = $('viewerHost');
    if (host) {
      if (!viewer) viewer = V3.createViewer();
      host.appendChild(viewer.el);
      requestAnimationFrame(() => viewer.update(state, result, ui.layers));
    }
    if (keepScroll) window.scrollTo(0, y);
  }
  function render(keepScroll) { recalc(); renderNav(); renderStep(keepScroll); renderLive(); }
  function refreshOutputs() {
    recalc(); renderLive(); renderNav();
    if (!result) return;
    const s = result.structure, set = (k, v) => { const n = document.querySelector('[data-out="' + k + '"]'); if (n) n.textContent = v; };
    set('AD', fmtN(s.AD)); set('AM', fmtN(s.AM)); set('ND', fmtE(s.ND)); set('NM', fmtE(s.NM));
    if (ui.step === 'lines' && result.lines[ui.line]) {
      const l = result.lines[ui.line];
      l.sections.forEach((x, i) => { set('NL' + i, fmtE(x.NL)); set('NI' + i, fmtE(x.NI)); });
      set('NDJ', fmtE(l.NDJ));
    }
    if (viewer && document.getElementById('viewerHost')) { clearTimeout(refreshOutputs.t); refreshOutputs.t = setTimeout(() => viewer.update(state, result, ui.layers), 150); }
  }
  function goto(step) {
    ui.step = step; try { history.replaceState(null, '', '#' + step); } catch (e) { }
    render(false); window.scrollTo(0, 0); $('step').focus({ preventScroll: true });
  }

  // ---------- events ----------
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.action === 'td') { const v = +t.value; if (v > 0) { state.env.NG = Math.round(v * 0.1 * 100) / 100; const ng = document.querySelector('[data-bind="env.NG"]'); if (ng) ng.value = state.env.NG; persist(); refreshOutputs(); } return; }
    if (t.dataset.action === 'hpd') { const v = +t.value; if (v >= 0) { const z = state.zones[ui.zone]; z.tz = Math.min(8760, Math.round(v * 365)); const f = document.querySelector('[data-bind="zones.' + ui.zone + '.tz"]'); if (f) f.value = z.tz; persist(); refreshOutputs(); } return; }
    if (!t.dataset.bind || t.tagName === 'SELECT' || t.type === 'checkbox' || t.type === 'radio') return;
    const v = t.dataset.type === 'num' ? (t.value === '' ? '' : +t.value) : t.value;
    setPath(state, t.dataset.bind, v);
    if (t.dataset.bind === 'meta.assessor') { settings.name = t.value; save(SETTINGS, settings); }
    if (t.dataset.bind === 'meta.position') { settings.position = t.value; save(SETTINGS, settings); }
    persist(); refreshOutputs();
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'fileOpen') return openFile(t);
    if (t.id === 'sigFile') return loadSignature(t);
    if (t.dataset.layer) { ui.layers[t.dataset.layer] = t.checked; if (viewer) viewer.update(state, result, ui.layers); return; }
    if (t.dataset.action === 'rtype') { ui.reportType = t.value; return; }
    if (t.dataset.set) {
      const arr = (getPath(state, t.dataset.set) || []).slice(), i = arr.indexOf(t.value);
      if (t.checked && i < 0) arr.push(t.value); if (!t.checked && i >= 0) arr.splice(i, 1);
      setPath(state, t.dataset.set, arr); persist(); refreshOutputs(); return;
    }
    if (!t.dataset.bind) return;
    let v = t.dataset.type === 'bool' ? t.checked : (t.dataset.type === 'num' ? (t.value === '' ? '' : +t.value) : t.value);
    if (t.dataset.bind.endsWith('.adjacentId') && v === '__new') {
      const a = { id: uid('a'), name: 'Substation', L: 5, W: 5, H: 3, CD: 'higher' };
      state.adjacent.push(a); v = a.id;
    }
    setPath(state, t.dataset.bind, v);
    if (t.dataset.bind === 'protection.earthing' && v !== 'Bmesh') state.zones.forEach(z => { const zp = state.protection.zones[z.id]; if (zp && zp.pta) zp.pta = zp.pta.filter(k => k !== 'equipot'); });
    if (t.dataset.bind.endsWith('.adjacentId')) state.adjacent = state.adjacent.filter(a => state.lines.some(l => l.adjacentId === a.id));
    persist();
    if (t.dataset.rerender) render(true); else refreshOutputs();
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b || b.tagName === 'INPUT') return;
    const a = b.dataset.action;
    if (a === 'goto') { e.preventDefault(); goto(b.dataset.step); return; }
    if (a === 'help') { const h = document.getElementById(b.getAttribute('aria-controls')); if (h) { h.hidden = !h.hidden; b.setAttribute('aria-expanded', String(!h.hidden)); } return; }
    if (a === 'pickLine') { e.preventDefault(); ui.line = +b.dataset.i; render(false); return; }
    if (a === 'pickZone') { e.preventDefault(); ui.zone = +b.dataset.i; render(false); return; }
    if (a === 'addLine') { state.lines.push(newLine('Line ' + (state.lines.length + 1), 'power')); ui.line = state.lines.length - 1; }
    if (a === 'dupLine') { const c = JSON.parse(JSON.stringify(state.lines[ui.line])); const old = c.id; c.id = uid('l'); c.name += ' (copy)'; state.lines.splice(ui.line + 1, 0, c); if (state.protection.lines[old]) state.protection.lines[c.id] = JSON.parse(JSON.stringify(state.protection.lines[old])); ui.line++; }
    if (a === 'delLine') { const l = state.lines.splice(ui.line, 1)[0]; delete state.protection.lines[l.id]; state.adjacent = state.adjacent.filter(x => state.lines.some(y => y.adjacentId === x.id)); ui.line = Math.max(0, ui.line - 1); }
    if (a === 'addSection') state.lines[ui.line].sections.push({ length: '', CI: 'buried', CE: '' });
    if (a === 'delSection') state.lines[ui.line].sections.splice(+b.dataset.si, 1);
    if (a === 'toggleOv') { const id = state.lines[ui.line].id; ui.showOverrides[id] = !ui.showOverrides[id]; if (!ui.showOverrides[id]) state.lines[ui.line].overrides = {}; }
    if (a === 'addZone') { state.zones.push(newZone('Zone ' + (state.zones.length + 1), 'inside')); ui.zone = state.zones.length - 1; }
    if (a === 'delZone') { const z = state.zones.splice(ui.zone, 1)[0]; delete state.protection.zones[z.id]; ui.zone = Math.max(0, ui.zone - 1); }
    if (a === 'matchSPD') { const c = result && result.design.cls; const k = c >= 3 ? 'III-IV' : (c === 2 ? 'II' : 'I'); state.lines.forEach(l => { setPath(state, 'protection.lines.' + l.id + '.peb', k); }); toast('Service entrance SPDs set to ' + k + ' on every line'); }
    if (a === 'resRisk') { ui.resRisk = b.dataset.k; }
    if (a === 'example') { state = exampleState(); ui.line = 0; ui.zone = 0; toast('Tobacco Warehouse example loaded'); }
    if (a === 'sigRemove') { settings.signature = ''; save(SETTINGS, settings); }
    if (a === 'save') { saveFile(); return; }
    if (a === 'pdf') { makePdf(b); return; }
    if (a === 'new') {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Tap again to start new'; setTimeout(() => { b.dataset.confirm = ''; b.textContent = 'New'; }, 4000); return; }
      b.dataset.confirm = ''; b.textContent = 'New'; state = newState(); ui.line = 0; ui.zone = 0; persist(); goto('project'); toast('New assessment started'); return;
    }
    persist(); render(true);
  });

  // ---------- files ----------
  function fileBase() { return ((state.meta.projectName || 'assessment') + (state.meta.caseName && state.meta.caseName !== state.meta.projectName ? ' - ' + state.meta.caseName : '')).replace(/[\\/:*?"<>|]+/g, '-').trim(); }
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function saveFile() {
    download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), 'LPRA - ' + fileBase() + '.json');
    toast('Assessment file saved');
  }
  function openFile(input) {
    const f = input.files && input.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const s = JSON.parse(rd.result);
        if (!s || s.app !== 'strike-point-risk') throw new Error('not ours');
        state = Object.assign(newState(), s); ui.line = 0; ui.zone = 0; persist(); goto('project'); toast('Opened ' + f.name);
      } catch (e) { toast('That file isn’t a Strike Point Risk assessment.'); }
      input.value = '';
    };
    rd.readAsText(f);
  }
  function loadSignature(input) {
    const f = input.files && input.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'), sc = Math.min(1, 600 / img.width);
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        settings.signature = c.toDataURL('image/jpeg', 0.9);
        if (!save(SETTINGS, settings)) toast('Signature too large to store on this device'); else toast('Signature saved on this device');
        render(true);
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  }
  async function makePdf(btn) {
    btn.disabled = true; const old = btn.textContent; btn.textContent = 'Creating PDF…';
    try {
      const blob = await R.build(state, result, { type: ui.reportType, signature: state.meta.declaration ? settings.signature : '', layers: ui.layers });
      download(blob, 'LPRA - ' + fileBase() + (ui.reportType === 'summary' ? ' (summary)' : '') + '.pdf');
      toast('PDF created');
    } catch (e) { console.error(e); toast('The PDF could not be created: ' + e.message); }
    btn.disabled = false; btn.textContent = old;
  }

  // ---------- start ----------
  const h = (location.hash || '').slice(1);
  if (STEPS.some(s => s.id === h)) ui.step = h;
  window.addEventListener('hashchange', () => { const k = location.hash.slice(1); if (k !== ui.step && STEPS.some(s => s.id === k)) goto(k); });
  window.SPApp = { get state() { return state; }, get result() { return result; } };
  render(false);
})();
