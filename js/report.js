/* Strike Point Risk — PDF reports (full and summary) built on the device with jsPDF */
(function (root) {
  'use strict';
  const T = root.SPTables;
  const APP = 'Strike Point Risk v1.0';
  const BLUE = [7, 103, 173], INK = [21, 32, 43], MUTED = [74, 88, 102], LINE = [220, 226, 233], SOFT = [243, 247, 251], OK = [30, 107, 68], BAD = [161, 34, 27];

  function fmtE(v) {
    if (v === 0) return '0';
    if (v == null || !isFinite(v)) return '-';
    const [m, e] = v.toExponential(3).split('e');
    const ee = +e;
    return String(+m) + 'E' + (ee < 0 ? '-' : '+') + String(Math.abs(ee)).padStart(2, '0');
  }
  const fmtN = (v, d) => (v == null || !isFinite(v)) ? '-' : v.toLocaleString('en-GB', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });
  const fmtV = v => (v == null || !isFinite(v)) ? '-' : (Math.abs(v) >= 0.001 || v === 0 ? String(+v.toPrecision(4)) : fmtE(v));
  // jsPDF's standard fonts use WinAnsi: replace characters it cannot draw
  const clean = s => String(s == null ? '' : s).replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/Ω/g, 'ohm').replace(/²/g, '2').replace(/µ/g, 'u').replace(/→/g, '->').replace(/↳/g, '-').replace(/[₀-₉]/g, c => String(c.charCodeAt(0) - 8320)).replace(/·/g, '·');
  const cellClean = c => (c && typeof c === 'object') ? Object.assign({}, c, { content: clean(c.content) }) : clean(c);
  const spdName = k => ({ 'III-IV': 'LPL III–IV', 'III-IV*': 'LPL III–IV*', 'II': 'LPL II', 'II*': 'LPL II*', 'I': 'LPL I', 'I*': 'LPL I*' })[k] || k;

  // ---------- plain-English protection summary ----------
  function protectionSummary(state, r) {
    const d = r.design, pr = state.protection || {}, rows = [];
    const keys = ['r1', 'r2', 'r3'].filter(k => state.risks[k]);
    const over = keys.filter(k => r.totals[k].total > r.RT[k]);
    const cls = d.cls ? T.CLASS[d.cls] : null;
    if (cls) {
      const extra = d.lps === 'I_frame' ? ' Metal or reinforced concrete frame used as natural down conductors.' : (d.lps === 'metal_roof' ? ' Metal roof and metal or reinforced concrete frame used as natural components.' : '');
      rows.push(['Lightning protection', ['Class ' + cls.name + ' lightning protection system to BS EN 62305-3.' + extra]]);
      const pitched = state.structure.shape === 'pitched';
      rows.push(['Air termination', [(pitched ? 'Ridge and eaves conductors, with a mesh no larger than ' : 'Roof mesh no larger than ') + cls.mesh + ' m × ' + cls.mesh + ' m. Rolling sphere radius ' + cls.sphere + ' m for roof fixtures and edges.' + (state.structure.shape === 'protrusion' ? ' Air termination on the protrusion, bonded to the roof network.' : '')]]);
      rows.push(['Down conductors', [d.N + ' down conductors at about ' + cls.dc + ' m spacing around the ' + fmtN(d.perimeter, 0) + ' m perimeter, with one at each exposed corner where possible.']]);
      rows.push(['Earthing', [d.earthing === 'A' ? 'Type A arrangement: ' + d.N + ' earth electrodes, one per down conductor.' :
        (d.earthing === 'Bmesh' ? 'Type B meshed earth (ring electrode with cross conductors), connected to each down conductor.' : 'Type B ring earth electrode around the structure, connected to each of the ' + d.N + ' down conductors.')]]);
    } else {
      rows.push(['Lightning protection', ['No structural lightning protection system.']]);
    }
    const spd = [];
    state.lines.forEach((l, i) => {
      const lp = (pr.lines && pr.lines[l.id]) || {}, rl = r.lines[i];
      const tel = l.type === 'telecom';
      const aerial = (l.sections || []).some(s => s.CI === 'aerial');
      let t;
      if (lp.peb && lp.peb !== 'none') {
        const enh = lp.peb.indexOf('*') >= 0 ? ' with a low voltage protection level (enhanced)' : '';
        if (d.ISPD > 0) t = (tel ? 'Lightning current SPD at entry, ' : 'Type 1 SPD at the intake, ') + spdName(lp.peb) + ', rated at least ' + fmtN(d.ISPD, 1) + ' kA (10/350 waveform)' + enh + '.';
        else if (aerial) t = (tel ? 'Category D SPD at entry, ' + spdName(lp.peb) + ', 2.5 kA (10/350 waveform) per line' : 'Type 1 SPD at the intake, ' + spdName(lp.peb) + ', 12.5 kA (10/350 waveform)') + enh + '.';
        else t = (tel ? 'Overvoltage SPD at entry, ' : 'Type 2 SPD at the intake, ') + spdName(lp.peb) + ', tested with the 8/20 waveform' + enh + '.';
      } else t = 'No SPD at entry.';
      if (lp.pspd && lp.pspd !== 'none') t += ' Coordinated SPD set (Type 2/3) for internal equipment, ' + spdName(lp.pspd) + '.';
      spd.push((rl ? rl.name : l.name) + ': ' + t);
    });
    if (spd.length) rows.push(['Surge protection', spd]);
    const other = [];
    r.zones.forEach((z, i) => {
      const zs = state.zones[i], zp = (pr.zones && pr.zones[zs.id]) || {};
      if (z.inside && z.rp < 1) other.push(z.name + ': ' + T.find(T.rp, zp.rp).label.toLowerCase() + ' (r_p ' + fmtV(z.rp) + ').');
      (zp.pta || []).forEach(k => other.push(z.name + ': ' + T.find(T.PTA, k).label.toLowerCase() + ' (touch and step voltage).'));
      (zp.ptu || []).forEach(k => other.push(z.name + ': ' + T.find(T.PTU, k).label.toLowerCase() + ' at service entry points.'));
    });
    if (r.KS1 < 1) other.push('Structure screening K_S1 = ' + fmtV(r.KS1) + '.');
    if (other.length) rows.push(['Other measures', other]);
    const names = { r1: 'R1 (loss of human life)', r2: 'R2 (loss of service to the public)', r3: 'R3 (loss of cultural heritage)' };
    return {
      heading: over.length ? 'Protection measures in this assessment' : (cls || spd.some(s => s.indexOf('No SPD') < 0) || other.length ? 'Protection required' : 'Protection'),
      warning: over.length ? 'The tolerable risk is exceeded for ' + over.map(k => names[k]).join(' and ') + '. Further protection measures are needed.' : '',
      rows, overKeys: over, keys
    };
  }

  // ---------- PDF ----------
  async function imageData(src) {
    const res = await fetch(src); const b = await res.blob();
    const url = await new Promise((ok, no) => { const rd = new FileReader(); rd.onload = () => ok(rd.result); rd.onerror = no; rd.readAsDataURL(b); });
    const dim = await new Promise(ok => { const im = new Image(); im.onload = () => ok([im.naturalWidth, im.naturalHeight]); im.onerror = () => ok([800, 515]); im.src = url; });
    return { url, w: dim[0], h: dim[1] };
  }
  function stamp() { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  async function build(state, r, opts) {
    const { jsPDF } = root.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const W = 210, H = 297, M = 18, CW = W - 2 * M, TOP = 30, BOTTOM = H - 18;
    const full = opts.type !== 'summary';
    const meta = state.meta || {};
    const runAt = stamp();
    let logo = null;
    try { logo = await imageData('assets/logo.png'); } catch (e) { logo = null; }
    const txt = (s, x, y, o) => doc.text(clean(s), x, y, o);
    let y = TOP;

    function font(size, style, color) { doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size); doc.setTextColor.apply(doc, color || INK); }
    function newPage() { doc.addPage(); y = TOP; }
    function need(h) { if (y + h > BOTTOM) newPage(); }
    function h1(s) { need(16); font(18, 'bold', BLUE); txt(s, M, y + 6); y += 12; }
    function h2(s) { need(14); font(12, 'bold', INK); txt(s, M, y + 4); y += 8; }
    function para(s, size, color) {
      font(size || 10, 'normal', color || INK);
      const lines = doc.splitTextToSize(clean(s), CW);
      lines.forEach(l => { need(5.2); txt(l, M, y + 3.6); y += 5; });
      y += 1.5;
    }
    function table(head, body, o) {
      o = o || {};
      doc.autoTable(Object.assign({
        startY: y, head: head ? [head.map(cellClean)] : undefined, body: body.map(row => row.map(cellClean)),
        margin: { left: M, right: M, top: TOP, bottom: 20 }, theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0.2, overflow: 'linebreak' },
        headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 251, 253] }
      }, o));
      y = doc.lastAutoTable.finalY + 6;
    }
    const kv = (rows, o) => table(null, rows, Object.assign({ columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold', textColor: MUTED } } }, o));

    // ---------- cover ----------
    if (logo) { const lw = 120, lh = lw * logo.h / logo.w; doc.addImage(logo.url, 'PNG', (W - lw) / 2, 52, lw, lh); }
    font(15, 'normal', INK);
    txt('Lightning protection risk management calculations', W / 2, 152, { align: 'center' });
    txt('To BS EN 62305-2:2012 (Edition 2) with the UK National Annex', W / 2, 160, { align: 'center' });
    font(13, 'bold', BLUE); txt(full ? 'Full case report' : 'Summary report', W / 2, 172, { align: 'center' });
    const coverRows = [['Project name', meta.projectName], ['Project ref', meta.projectRef], ['Case name', meta.caseName], ['Case status', meta.caseStatus === 'proposed' ? 'With proposed protection' : 'As found (existing)'], ['Client', meta.client], ['Prepared by', meta.assessor], ['Issue date', meta.date]];
    font(10.5, 'normal', INK);
    let cy = 205;
    coverRows.forEach(([k, v]) => { font(10.5, 'normal', MUTED); txt(k, M + 10, cy); font(10.5, 'normal', INK); txt(v || '-', M + 52, cy); cy += 7; });

    // ---------- summary ----------
    newPage();
    h1('Summary');
    const keys = ['r1', 'r2', 'r3'].filter(k => state.risks[k]);
    const names = { r1: 'R1 Loss of human life', r2: 'R2 Loss of service to the public', r3: 'R3 Loss of cultural heritage' };
    table(['Risk', 'Calculated', 'Tolerable', 'Outcome'], keys.map(k => {
      const v = r.totals[k].total, over = v > r.RT[k];
      return [names[k], fmtE(v), fmtE(r.RT[k]), { content: over ? 'Exceeds tolerable risk' : 'Tolerable', styles: { textColor: over ? BAD : OK, fontStyle: 'bold' } }];
    }), { styles: { fontSize: 10, cellPadding: 2.5, textColor: INK, lineColor: LINE, lineWidth: 0.2 } });
    const ps = protectionSummary(state, r);
    if (ps.overKeys.length) para('With the protection measures below, the calculated risk is still above the limit set by BS EN 62305-2:2012 (UK National Annex) for ' + ps.overKeys.map(k => k.toUpperCase()).join(' and ') + '. Further measures are needed.', 10.5);
    else para('With the protection measures below in place, the calculated risk is within the limits set by BS EN 62305-2:2012 (UK National Annex) for every risk assessed.', 10.5);
    // protection box
    h2(ps.heading);
    table(null, ps.rows.map(([k, v]) => [k, v.join('\n')]), { theme: 'plain', styles: { fontSize: 9.5, cellPadding: 2.2, textColor: INK }, columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } }, tableLineWidth: 0, willDrawPage: undefined, didDrawPage: undefined, bodyStyles: { fillColor: SOFT } });
    h2('Basis of assessment');
    const s = r.structure, dims = s.dims;
    const shapeTxt = dims.shape === 'pitched' ? fmtV(dims.L) + ' × ' + fmtV(dims.W) + ' m, eaves ' + fmtV(dims.H) + ' m, ridge ' + fmtV(dims.Hr) + ' m' :
      (dims.shape === 'protrusion' ? fmtV(dims.L) + ' × ' + fmtV(dims.W) + ' × ' + fmtV(dims.H) + ' m with protrusion to ' + fmtV(dims.Hp) + ' m' : fmtV(dims.L) + ' × ' + fmtV(dims.W) + ' × ' + fmtV(dims.H) + ' m');
    kv([['Strike density N_G', fmtV(r.env.NG) + ' flashes/km²/year'], ['Structure', shapeTxt], ['Collection area A_D', fmtN(s.AD) + ' m² (' + s.ADmethod + ')'],
      ['Lines', r.lines.length ? r.lines.map(l => l.name).join(', ') : 'None'], ['Zones', r.zones.map(z => z.name + ' (' + fmtV(z.nz) + ' people)').join(', ')]]);
    if (r.flags.length) para(r.flags.length + ' value' + (r.flags.length > 1 ? 's are' : ' is') + ' a default, an override or a note, listed under “Notes and overrides”.', 9, MUTED);

    // ---------- 3D page ----------
    if (root.SPView3D) {
      const layers = { mesh: true, dc: true, earth: true, collect: true, sphere: false, adj: false };
      const iso = root.SPView3D.snapshot(state, r, 'iso', 1400, 900, layers, false);
      const plan = root.SPView3D.snapshot(state, r, 'plan', 1400, 900, layers, true);
      if (iso && plan) {
        newPage(); h1('Indicative protection layout');
        para('Drawn from the assessment inputs. Positions are typical and for illustration only. This is not a design drawing.', 9.5, MUTED);
        const iw = CW, ih = iw * 900 / 1400;
        doc.addImage(iso, 'JPEG', M, y, iw, ih * 0.92); y += ih * 0.92 + 3;
        font(9, 'normal', MUTED); txt('Isometric view', M, y + 2); y += 6;
        doc.addImage(plan, 'JPEG', M, y, iw, ih * 0.92); y += ih * 0.92 + 3;
        font(9, 'normal', MUTED); txt('Plan view. Blue outline: collection area A_D. Green: earthing.', M, y + 2); y += 6;
      }
    }

    // ---------- project, case and inputs ----------
    newPage();
    h1('Project and case details');
    kv([['Project name', meta.projectName], ['Client', meta.client], ['Standard', 'BS EN 62305-2:2012 (Edition 2), UK National Annex'], ['Project address', meta.address], ['Project ref', meta.projectRef],
      ['Calculation ref', meta.calcRef], ['Prepared by', meta.assessor + (meta.position ? ', ' + meta.position : '')], ['Assessment date', meta.date], ['Case name', meta.caseName],
      ['Case status', meta.caseStatus === 'proposed' ? 'With proposed protection' : 'As found (existing)'], ['Case notes', meta.notes || '-']]);

    h2('Environment');
    kv([['N_G', fmtV(r.env.NG) + ' — lightning ground flash density (flashes/km²/year)'], ['C_D', fmtV(r.env.CD) + ' — ' + T.find(T.CD, state.env.CD).label], ['C_E', fmtV(r.env.CE) + ' — ' + T.find(T.CE, state.env.CE).label]]);
    h2('Structure');
    const strRows = [['Shape', ({ rect: 'Rectangular', pitched: 'Pitched roof', protrusion: 'Rectangular with protrusion' })[dims.shape]], ['Length L', fmtV(dims.L) + ' m'], ['Width W', fmtV(dims.W) + ' m'],
      [dims.shape === 'pitched' ? 'Eaves height' : 'Height H', fmtV(dims.H) + ' m']];
    if (dims.shape === 'pitched') strRows.push(['Ridge height', fmtV(dims.Hr) + ' m, along the ' + (dims.ridgeDir === 'W' ? 'width' : 'length')]);
    if (dims.shape === 'protrusion') strRows.push(['Protrusion', fmtV(dims.Pw) + ' m square, top at ' + fmtV(dims.Hp) + ' m']);
    strRows.push(['Perimeter', fmtN(r.design.perimeter, 1) + ' m']);
    kv(strRows);
    const adjIds = Object.keys(r.adjacent);
    if (adjIds.length) {
      h2('Adjacent structures');
      table(['Structure', 'L × W × H (m)', 'C_DJ', 'A_DJ (m²)'], (state.adjacent || []).map(a => [a.name, fmtV(+a.L) + ' × ' + fmtV(+a.W) + ' × ' + fmtV(+a.H), fmtV(r.adjacent[a.id].CDJ), fmtN(r.adjacent[a.id].ADJ)]));
    }
    if (r.lines.length) {
      h2('Lines');
      r.lines.forEach((l, i) => {
        const sl = state.lines[i];
        const body = [['Type', (l.type === 'telecom' ? 'Telecom / data' : 'Power') + ', C_T ' + fmtV(l.CT)], ['Construction', l.construction], ['U_W', fmtV(l.UW) + ' kV'], ['K_S3', fmtV(l.KS3) + ' — ' + T.find(T.KS3, sl.KS3).label],
          ['C_LD / C_LI', fmtV(l.CLD) + ' / ' + fmtV(l.CLI)], ['P_LD / P_LI', fmtV(l.PLD) + ' / ' + fmtV(l.PLI)], ['Adjacent structure', l.adjacentName || 'None']];
        l.sections.forEach((sc, si) => body.push(['Section ' + (si + 1), fmtN(sc.LL, 0) + ' m, C_I ' + fmtV(sc.CI) + ', C_E ' + fmtV(sc.CE)]));
        table([{ content: 'Line ' + (i + 1) + ' · ' + l.name, colSpan: 2 }], body, { columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold', textColor: MUTED } } });
      });
    }
    h2('Zones');
    r.zones.forEach((z, i) => {
      const sz = state.zones[i];
      const body = [['Location', z.inside ? 'Inside the structure' : 'Outside the structure (touch and step only)'], ['People n_z / n_t', fmtV(z.nz) + ' / ' + fmtV(r.nt)], ['Hours present t_z', fmtV(z.tz) + ' h/year'],
        ['r_t', fmtV(z.rt) + ' — ' + T.find(T.rt, sz.rt).label]];
      if (z.inside) {
        body.push(['r_f', fmtV(z.rf) + ' — ' + T.find(T.rf, sz.rf).label], ['h_z', fmtV(z.hz) + ' — ' + T.find(T.hz, sz.hz).label],
          ['L_T / L_F / L_O', fmtV(T.LT) + ' / ' + fmtV(z.LF1) + (sz.LF1 !== 'custom' ? ' (' + T.find(T.LF1, sz.LF1).label + ')' : ' (custom)') + ' / ' + fmtV(z.LO1)], ['K_S2', fmtV(z.KS2)]);
        if (state.risks.r2) body.push(['Users served', fmtV(+sz.users || 0) + ' of ' + fmtV(r.nt2)]);
        if (state.risks.r3) body.push(['Heritage value c_z / c_t', '£' + fmtN(+sz.cz || 0, 0) + ' / £' + fmtN(r.ct3, 0) + ', L_F ' + fmtV(z.LF3)]);
      }
      table([{ content: 'Zone ' + (i + 1) + ' · ' + z.name, colSpan: 2 }], body, { columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold', textColor: MUTED } } });
    });
    h2('Protection measures');
    const pr = state.protection || {};
    const prow = [['Structural LPS', r.design.lpsLabel + ' (P_B ' + fmtV(r.PB) + ')'], ['Earthing', ({ A: 'Type A', B: 'Type B ring', Bmesh: 'Type B meshed' })[r.design.earthing]], ['Structure screening K_S1', fmtV(r.KS1)]];
    r.lines.forEach(l => prow.push([l.name, 'Entrance SPD P_EB ' + fmtV(l.PEB) + ', coordinated SPDs P_SPD ' + fmtV(l.PSPD)]));
    r.zones.forEach((z, i) => { const zp = (pr.zones && pr.zones[state.zones[i].id]) || {}; prow.push([z.name, (z.inside ? 'r_p ' + fmtV(z.rp) + ', ' : '') + 'P_TA ' + fmtV(z.PTA) + (z.inside ? ', P_TU ' + fmtV(z.PTU) : '') + ((zp.pta || []).length ? ' (' + zp.pta.map(k => T.find(T.PTA, k).label.toLowerCase()).join(', ') + ')' : '')]); });
    kv(prow);
    if (r.design.cls) {
      h2('Protection system design parameters');
      kv([['Lightning protection level', 'LPL ' + r.design.clsName], ['I_max', r.design.Imax + ' kA (' + Math.round(r.design.pMax * 100) + '% of flashes smaller)'], ['I_min', r.design.Imin + ' kA (' + Math.round(r.design.pMin * 100) + '% of flashes larger)'],
        ['Rolling sphere radius', r.design.sphere + ' m'], ['Mesh size', r.design.mesh + ' × ' + r.design.mesh + ' m'], ['Down conductor spacing', r.design.dcSpacing + ' m (' + r.design.N + ' down conductors)'],
        ['I_SPD per line', r.design.nLines ? fmtN(r.design.ISPD, 1) + ' kA (I_max × 50% ÷ ' + r.design.nLines + ' lines)' : '-']]);
    }

    // ---------- calculations ----------
    newPage();
    h1(full ? 'Calculations' : 'Calculations used');
    h2('Collection areas and dangerous events');
    const an = [['A_D', fmtN(s.AD) + ' m²', 'Collection area of the structure (' + s.ADmethod + ')'], ['A_M', fmtN(s.AM) + ' m²', 'Area for flashes near the structure'], ['N_D', fmtE(s.ND), 'Flashes to the structure per year'], ['N_M', fmtE(s.NM), 'Flashes near the structure per year']];
    r.lines.forEach(l => {
      if (l.NDJ) an.push(['N_DJ · ' + l.name, fmtE(l.NDJ), 'Flashes to ' + l.adjacentName + ' (A_DJ ' + fmtN(l.ADJ) + ' m²)']);
      if (full) l.sections.forEach((sc, si) => an.push(['A_L / A_I · ' + l.name + ' s' + (si + 1), fmtN(sc.AL, 0) + ' / ' + fmtN(sc.AI, 0) + ' m²', 'Collection areas for flashes to and near the line section']));
      an.push(['N_L / N_I · ' + l.name, fmtE(l.NL) + ' / ' + fmtE(l.NI), 'Flashes to and near the line per year']);
    });
    table(['Value', 'Result', 'Description'], an, { columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 42 } } });

    if (full) {
      h2('Probabilities');
      const pb = [['P_B', fmtV(r.PB), 'Physical damage from a flash to the structure'], ['K_S1', fmtV(r.KS1), 'Screening of the structure']];
      r.zones.forEach(z => {
        pb.push(['P_TA / P_A · ' + z.name, fmtV(z.PTA) + ' / ' + fmtE(z.PA), 'Injury from touch and step voltage']);
        if (z.inside) pb.push(['P_C / P_M · ' + z.name, fmtE(z.PC) + ' / ' + fmtE(z.PM), 'Failure of internal systems (flashes to / near the structure)']);
        if (z.inside) z.perLine.forEach((p, i) => pb.push(['P_MS / P_U · ' + z.name + ' · ' + r.lines[i].name, fmtE(p.PMS) + ' / ' + fmtE(p.PU), 'Per line: internal systems, and injury from flashes to the line']));
      });
      r.lines.forEach(l => {
        pb.push(['K_S3 / K_S4 · ' + l.name, fmtV(l.KS3) + ' / ' + fmtV(l.KS4), 'Internal wiring and withstand voltage']);
        pb.push(['P_EB / P_SPD · ' + l.name, fmtV(l.PEB) + ' / ' + fmtV(l.PSPD), 'Entrance and coordinated SPDs']);
        pb.push(['P_V / P_W / P_Z · ' + l.name, fmtE(l.PV) + ' / ' + fmtE(l.PW) + ' / ' + fmtE(l.PZ), 'Physical damage and system failure from flashes to / near the line']);
      });
      table(['Value', 'Result', 'Description'], pb, { columnStyles: { 0: { cellWidth: 62 }, 1: { cellWidth: 42 } } });
      h2('Losses');
      const lo = [];
      r.zones.forEach(z => {
        lo.push(['L_A = L_U · ' + z.name, fmtE(z.L1.LA), 'R1: injury from touch and step voltage']);
        if (z.inside) {
          lo.push(['L_B = L_V · ' + z.name, fmtE(z.L1.LB), 'R1: physical damage']);
          lo.push(['L_C = L_M = L_W = L_Z · ' + z.name, fmtE(z.L1.LC), 'R1: failure of internal systems']);
          if (state.risks.r2) { lo.push(['L_B = L_V (R2) · ' + z.name, fmtE(z.L2.LB), 'R2: physical damage']); lo.push(['L_C…L_Z (R2) · ' + z.name, fmtE(z.L2.LC), 'R2: failure of internal systems']); }
          if (state.risks.r3) lo.push(['L_B = L_V (R3) · ' + z.name, fmtE(z.L3.LB), 'R3: physical damage']);
        }
      });
      table(['Value', 'Result', 'Description'], lo, { columnStyles: { 0: { cellWidth: 62 }, 1: { cellWidth: 34 } } });
    }

    // risk components: N × P × L breakdown
    keys.forEach(k => {
      const K = k.toUpperCase();
      h2('Risk components · ' + names[k]);
      const rows = [];
      const add = (comp, where, n, p, l, v) => { if (full || v > 0) rows.push([comp, where, fmtE(n), fmtE(p), fmtE(l), { content: fmtE(v), styles: { fontStyle: 'bold' } }]); };
      r.zones.forEach(z => {
        const x = z[K], L = z['L' + k.slice(1)];
        if (k === 'r1') add('R_A', z.name, s.ND, z.PA, L.LA, x.RA);
        if (!z.inside) return;
        add('R_B', z.name, s.ND, r.PB, L.LB, x.RB);
        if (k !== 'r3') { add('R_C', z.name, s.ND, z.PC, L.LC, x.RC); add('R_M', z.name, s.NM, z.PM, L.LM, x.RM); }
        r.lines.forEach((ln, i) => {
          const y2 = x.lines[i], w = z.name + ' · ' + ln.name, n = ln.NL + ln.NDJ;
          if (k === 'r1') add('R_U', w, n, z.perLine[i].PU, L.LU, y2.RU);
          add('R_V', w, n, ln.PV, L.LV, y2.RV);
          if (k !== 'r3') { add('R_W', w, n, ln.PW, L.LW, y2.RW); add('R_Z', w, ln.NI, ln.PZ, L.LZ, y2.RZ); }
        });
      });
      if (!rows.length) rows.push(['-', 'No contributing components', '', '', '', '0']);
      table(['Component', 'Zone / line', 'N', 'P', 'L', 'R = N × P × L'], rows, { columnStyles: { 0: { cellWidth: 22 } } });
      const t = r.totals[k];
      kv([['Total ' + K, fmtE(t.total) + (t.total > r.RT[k] ? ' — exceeds' : ' — within') + ' tolerable ' + fmtE(r.RT[k])], ['Direct (flashes to the structure)', fmtE(t.direct)], ['Indirect (near the structure and lines)', fmtE(t.indirect)],
        ['Injury (D1) / Physical (D2) / Systems (D3)', fmtE(t.shock) + ' / ' + fmtE(t.fire) + ' / ' + fmtE(t.systems)]], { columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold', textColor: MUTED } } });
    });

    if (r.flags.length) {
      h2('Notes and overrides');
      table(['Type', 'Note'], r.flags.map(f => [({ default: 'Default', override: 'Override', note: 'Note' })[f.kind] || f.kind, f.text]), { columnStyles: { 0: { cellWidth: 22 } } });
    }

    // ---------- declaration ----------
    if (meta.declaration) {
      newPage();
      h1('Declaration');
      para('I declare that this lightning protection risk assessment has been carried out in accordance with BS EN 62305-2:2012 and its UK National Annex.', 11);
      para('To the best of my knowledge, the assessment is accurate to the information provided and the conditions observed at the time it was completed.', 11);
      para('The results rely on information supplied by the client and gathered during the site survey. Any later change to the structure, its use or occupancy, its connected services or its protection measures may change the outcome, and the assessment should then be reviewed.', 11);
      y += 6;
      const rowsD = [['Completed by', meta.assessor || ''], ['Position', meta.position || ''], ['Company', 'Strike Point Lightning Protection Ltd'], ['Signature', ''], ['Date', meta.date || '']];
      rowsD.forEach(([k, v]) => {
        const hh = k === 'Signature' ? 22 : 11;
        need(hh + 2);
        font(10, 'normal', MUTED); txt(k, M, y + hh - 3);
        doc.setDrawColor.apply(doc, [167, 179, 192]); doc.setLineWidth(0.3); doc.line(M + 40, y + hh - 1, W - M, y + hh - 1);
        if (k === 'Signature' && opts.signature) { try { const fmt = opts.signature.indexOf('image/png') > 0 ? 'PNG' : 'JPEG'; doc.addImage(opts.signature, fmt, M + 42, y + 1, 50, 18, undefined, 'FAST'); } catch (e) { } }
        else { font(11, k === 'Completed by' ? 'bold' : 'normal', INK); txt(v, M + 42, y + hh - 3); }
        y += hh + 3;
      });
      y += 4;
      font(9, 'normal', MUTED); txt('Assessment reference: ' + (meta.caseName || meta.projectName || '') + ' · run ' + runAt, M, y + 3);
    }

    // ---------- headers and footers ----------
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      if (i > 1) {
        font(9, 'normal', MUTED); txt(meta.projectName || '', M, 13);
        if (meta.address) txt(String(meta.address).split('\n')[0], M, 17.5);
        if (logo) { const lw = 26, lh = lw * logo.h / logo.w; doc.addImage(logo.url, 'PNG', W - M - lw, 8, lw, lh); }
      }
      doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.3); doc.line(M, H - 14, W - M, H - 14);
      font(8, 'normal', MUTED);
      txt(APP + ' · Run ' + runAt + (meta.assessor ? ' · Prepared by ' + meta.assessor : ''), M, H - 9);
      txt('Page ' + i + ' of ' + n, W - M, H - 9, { align: 'right' });
    }
    return doc.output('blob');
  }

  root.SPReport = { protectionSummary, build };
})(self);
