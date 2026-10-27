/*
 * Strike Point Risk — calculation engine, BS EN 62305-2:2012 + UK National Annex.
 * Pure functions: assessment state in, every intermediate value and risk out.
 */
(function (root) {
  const T = (typeof module !== 'undefined' && module.exports) ? require('./tables.js') : root.SPTables;
  const G = (typeof module !== 'undefined' && module.exports) ? require('./geometry.js') : root.SPGeometry;

  const opt = (list, key) => T.find(list, key);
  const num = (v, d) => (v === '' || v === null || v === undefined || isNaN(+v)) ? d : +v;
  const prod = arr => arr.reduce((p, q) => p * q, 1);

  // Value of a factor stored as {key} with optional custom override
  function factor(list, key, custom, flags, what) {
    if (key === 'custom') {
      const v = num(custom, NaN);
      if (!isNaN(v)) { flags.push({ kind: 'override', text: what + ': custom value ' + v + ' used (not a table value).' }); return v; }
      return list[0].v;
    }
    return opt(list, key).v;
  }

  function shieldK(mode, width) {
    if (mode === 'continuous') return 1e-4;
    if (mode === 'grid') return Math.min(1, 0.12 * Math.max(0, num(width, 0)));
    return 1;
  }

  function compute(st) {
    const flags = [];
    const sel = st.risks || { r1: true };
    const env = st.env || {};
    const NG = num(env.NG, 0);
    const CD = opt(T.CD, env.CD).v;
    const siteCE = opt(T.CE, env.CE).v;

    // ---------- structure ----------
    const s = st.structure;
    const sd = { shape: s.shape, L: num(s.L, 1), W: num(s.W, 1), H: num(s.H, 1), Hr: num(s.Hr, num(s.H, 1)), ridgeDir: s.ridgeDir || 'L', Hp: num(s.Hp, num(s.H, 1)), Pw: num(s.Pw, 1) };
    if (sd.shape === 'pitched' && sd.Hr < sd.H) { flags.push({ kind: 'note', text: 'Ridge height was below eaves height; eaves height used for the ridge.' }); sd.Hr = sd.H; }
    if (sd.shape === 'protrusion' && sd.Hp < sd.H) sd.Hp = sd.H;
    const ad = G.ad(sd);
    const AD = ad.value;
    const AM = G.am(sd.L, sd.W);
    const ND = NG * AD * CD * 1e-6;
    const NM = NG * AM * 1e-6;
    const perimeterAuto = 2 * (sd.L + sd.W);
    const P = (s.perimeter !== '' && s.perimeter !== null && s.perimeter !== undefined && num(s.perimeter, 0) > 0) ? num(s.perimeter, 0) : perimeterAuto;
    if (P !== perimeterAuto) flags.push({ kind: 'override', text: 'Perimeter entered as ' + P + ' m (2 × (L + W) would be ' + round(perimeterAuto, 1) + ' m).' });
    const maxH = Math.max(sd.H, sd.shape === 'pitched' ? sd.Hr : 0, sd.shape === 'protrusion' ? sd.Hp : 0);

    // ---------- protection (structure level) ----------
    const pr = st.protection || {};
    const lps = opt(T.LPS, pr.lps || 'none');
    const PB = lps.PB;
    const hasLPS = lps.key !== 'none';
    const KS1 = shieldK(pr.ks1 || 'none', pr.ks1w);
    const cls = lps.cls ? T.CLASS[lps.cls] : null;

    // ---------- adjacent structures ----------
    const adj = {};
    (st.adjacent || []).forEach(a => {
      const ADJ = G.adRect(num(a.L, 1), num(a.W, 1), num(a.H, 1));
      adj[a.id] = { id: a.id, name: a.name, ADJ, CDJ: opt(T.CD, a.CD).v };
    });

    // ---------- lines ----------
    const lines = (st.lines || []).map((ln, idx) => {
      const CT = opt(T.CT, ln.CT).v;
      const con = opt(T.construction, ln.construction);
      const uwKey = ln.UW || '4';
      const UW = opt(T.UW, uwKey).v;
      const ui = T.UW_INDEX[uwKey] !== undefined ? T.UW_INDEX[uwKey] : 3;
      let CLD = con.CLD, CLI = con.CLI;
      let PLD = con.pld === 'shielded' ? T.PLD[ln.RS || '5-20'][ui] : T.PLD.unshielded[ui];
      let PLI = T.PLI[ln.type === 'telecom' ? 'telecom' : 'power'][ui];
      const ov = ln.overrides || {};
      const label = 'Line ' + (idx + 1) + ' (' + (ln.name || 'unnamed') + ')';
      if (ov.CLD !== undefined && ov.CLD !== '' && ov.CLD !== null) { flags.push({ kind: 'override', text: label + ': C_LD set to ' + ov.CLD + ' (construction gives ' + CLD + ').' }); CLD = +ov.CLD; }
      if (ov.CLI !== undefined && ov.CLI !== '' && ov.CLI !== null) { flags.push({ kind: 'override', text: label + ': C_LI set to ' + ov.CLI + ' (construction gives ' + CLI + ').' }); CLI = +ov.CLI; }
      if (ov.PLD !== undefined && ov.PLD !== '' && ov.PLD !== null) { flags.push({ kind: 'override', text: label + ': P_LD set to ' + ov.PLD + ' (construction gives ' + PLD + ').' }); PLD = +ov.PLD; }
      if (ov.PLI !== undefined && ov.PLI !== '' && ov.PLI !== null) { flags.push({ kind: 'override', text: label + ': P_LI set to ' + ov.PLI + ' (table gives ' + PLI + ').' }); PLI = +ov.PLI; }
      const KS3 = opt(T.KS3, ln.KS3).v;
      const KS4 = Math.min(1, 1 / UW);

      const sections = (ln.sections && ln.sections.length ? ln.sections : [{}]).map((sec, si) => {
        let LL = num(sec.length, NaN);
        if (isNaN(LL) || LL <= 0) { LL = 1000; flags.push({ kind: 'default', text: label + ', section ' + (si + 1) + ': length not known — 1000 m used.' }); }
        const CI = opt(T.CI, sec.CI).v;
        const CE = sec.CE ? opt(T.CE, sec.CE).v : siteCE;
        const AL = 40 * LL, AI = 4000 * LL;
        return { LL, CI, CE, AL, AI, NL: NG * AL * CI * CE * CT * 1e-6, NI: NG * AI * CI * CE * CT * 1e-6 };
      });
      const NL = sections.reduce((p, q) => p + q.NL, 0);
      const NI = sections.reduce((p, q) => p + q.NI, 0);
      const aj = ln.adjacentId && adj[ln.adjacentId];
      const NDJ = aj ? NG * aj.ADJ * aj.CDJ * CT * 1e-6 : 0;

      const lp = (pr.lines && pr.lines[ln.id]) || {};
      const PEB = opt(T.SPD, lp.peb || 'none').v;
      const PSPD = opt(T.SPD, lp.pspd || 'none').v;
      // NB.3 Note 1: a coordinated SPD system only reduces P_C where there is an LPS
      const PSPDc = hasLPS ? PSPD : 1;
      if (!hasLPS && PSPD < 1) flags.push({ kind: 'note', text: label + ': coordinated SPDs do not reduce P_C without an LPS (UK annex NB.3, note 1); P_C calculated with P_SPD = 1.' });

      return {
        id: ln.id, name: ln.name || ('Line ' + (idx + 1)), type: ln.type || 'power', CT, construction: con.label,
        UW, KS3, KS4, CLD, CLI, PLD, PLI, PEB, PSPD, PSPDc,
        sections, NL, NI, NDJ, adjacentName: aj ? aj.name : '', ADJ: aj ? aj.ADJ : 0, CDJ: aj ? aj.CDJ : 0,
        PC: PSPDc * CLD,
        PV: PEB * PLD * CLD,
        PW: PSPD * PLD * CLD,
        PZ: PSPD * PLI * CLI
      };
    });

    // ---------- zones ----------
    const zonesIn = st.zones || [];
    const ntAuto = zonesIn.reduce((p, z) => p + num(z.nz, 0), 0);
    const nt = num(st.totals && st.totals.nt, 0) > 0 ? num(st.totals.nt, 0) : ntAuto;
    if (nt !== ntAuto) flags.push({ kind: 'override', text: 'Total people n_t entered as ' + nt + ' (zones add up to ' + ntAuto + ').' });
    const nt2Auto = zonesIn.reduce((p, z) => p + num(z.users, 0), 0);
    const nt2 = num(st.totals && st.totals.nt2, 0) > 0 ? num(st.totals.nt2, 0) : nt2Auto;
    const ct3Auto = zonesIn.reduce((p, z) => p + num(z.cz, 0), 0);
    const ct3 = num(st.totals && st.totals.ct3, 0) > 0 ? num(st.totals.ct3, 0) : ct3Auto;

    // P_C for the structure (combined across lines) — formula 14
    const PCall = lines.length ? 1 - prod(lines.map(l => 1 - l.PC)) : 0;

    const zones = zonesIn.map((z, zi) => {
      const inside = z.location !== 'outside';
      const zp = (pr.zones && pr.zones[z.id]) || {};
      const zl = 'Zone ' + (zi + 1) + ' (' + (z.name || 'unnamed') + ')';
      let PTA = prod((zp.pta || []).map(k => opt(T.PTA, k).v));
      if (!hasLPS && (zp.pta || []).length) { flags.push({ kind: 'note', text: zl + ': touch and step measures only reduce P_A where there is an LPS (UK annex NB.1, note 1); P_TA = 1 used.' }); PTA = 1; }
      const PTU = prod((zp.ptu || []).map(k => opt(T.PTU, k).v));
      const PA = PTA * PB;
      const KS2 = shieldK(z.ks2 || 'none', z.ks2w);

      const rt = opt(T.rt, z.rt).v;
      const rfo = opt(T.rf, z.rf);
      const rf = rfo.v;
      let rp = opt(T.rp, zp.rp || 'none').v;
      if (rfo.expl && rp !== 1) { rp = 1; flags.push({ kind: 'note', text: zl + ': explosion risk, so fire provisions are not counted (r_p = 1).' }); }
      const hz = opt(T.hz, z.hz).v;
      const LF1 = factor(T.LF1, z.LF1, z.LF1custom, flags, zl + ' L_F');
      const LO1 = factor(T.LO1, z.LO1, z.LO1custom, flags, zl + ' L_O');
      const nz = num(z.nz, 0);
      let tz = num(z.tz, 8760);
      if (tz > 8760) tz = 8760;
      const occ = nt > 0 ? (nz / nt) * (tz / 8760) : 0;

      const L1 = {
        LA: rt * T.LT * occ, LU: rt * T.LT * occ,
        LB: rp * rf * hz * LF1 * occ, LV: rp * rf * hz * LF1 * occ,
        LC: LO1 * occ, LM: LO1 * occ, LW: LO1 * occ, LZ: LO1 * occ
      };
      const l2 = opt(T.L2, z.L2 || 'service');
      const u = nt2 > 0 ? num(z.users, 0) / nt2 : 0;
      const L2 = { LB: rp * rf * l2.LF * u, LV: rp * rf * l2.LF * u, LC: l2.LO * u, LM: l2.LO * u, LW: l2.LO * u, LZ: l2.LO * u };
      const LF3 = factor(T.LF3, z.LF3 || 'museum', z.LF3custom, flags, zl + ' L_F (heritage)');
      const c = ct3 > 0 ? num(z.cz, 0) / ct3 : 0;
      const L3 = { LB: rp * rf * LF3 * c, LV: rp * rf * LF3 * c };

      // per line, per zone
      const perLine = lines.map(l => {
        const PMS = Math.pow(KS1 * KS2 * l.KS3 * l.KS4, 2);
        const PM = l.PSPD * PMS; // NB.3: P_M = P_MS without coordinated SPDs (P_SPD = 1)
        const PU = PTU * l.PEB * l.PLD * l.CLD;
        return { lineId: l.id, PMS, PM, PU };
      });
      const PM = lines.length ? 1 - prod(perLine.map(p => 1 - p.PM)) : Math.pow(KS1 * KS2, 2);
      const PC = PCall;

      function comps(L, which) {
        const r = { RA: 0, RB: 0, RC: 0, RM: 0, lines: [] };
        if (which.A) r.RA = ND * PA * L.LA;
        if (!inside) { r.lines = lines.map(() => ({ RU: 0, RV: 0, RW: 0, RZ: 0 })); return r; }
        r.RB = ND * PB * L.LB;
        r.RC = ND * PC * L.LC;
        r.RM = NM * PM * L.LM;
        r.lines = lines.map((l, i) => {
          const n = l.NL + l.NDJ;
          return {
            RU: which.U ? n * perLine[i].PU * L.LU : 0,
            RV: n * l.PV * L.LV,
            RW: n * l.PW * L.LW,
            RZ: l.NI * l.PZ * L.LZ
          };
        });
        return r;
      }
      const R1 = comps(L1, { A: true, U: true });
      const R2 = comps(Object.assign({ LA: 0, LU: 0 }, L2), { A: false, U: false });
      const R3 = comps(Object.assign({ LA: 0, LU: 0, LC: 0, LM: 0, LW: 0, LZ: 0 }, L3), { A: false, U: false });
      return {
        id: z.id, name: z.name || ('Zone ' + (zi + 1)), inside, nz, tz, rt, rf, rp, hz, LF1, LO1, LF3, PTA, PTU, PA, KS2, PM, PC,
        perLine, L1, L2, L3, R1, R2, R3
      };
    });

    // ---------- totals ----------
    function total(key) {
      const t = { RA: 0, RB: 0, RC: 0, RM: 0, RU: 0, RV: 0, RW: 0, RZ: 0 };
      zones.forEach(z => {
        const r = z[key];
        t.RA += r.RA; t.RB += r.RB; t.RC += r.RC; t.RM += r.RM;
        r.lines.forEach(x => { t.RU += x.RU; t.RV += x.RV; t.RW += x.RW; t.RZ += x.RZ; });
      });
      const sum = t.RA + t.RB + t.RC + t.RM + t.RU + t.RV + t.RW + t.RZ;
      return {
        total: sum, comps: t,
        direct: t.RA + t.RB + t.RC, indirect: t.RM + t.RU + t.RV + t.RW + t.RZ,
        shock: t.RA + t.RU, fire: t.RB + t.RV, systems: t.RC + t.RM + t.RW + t.RZ
      };
    }
    const totals = { r1: total('R1'), r2: total('R2'), r3: total('R3') };

    // ---------- design values ----------
    const nLines = lines.length;
    const design = {
      lps: lps.key, lpsLabel: lps.label, cls: lps.cls, clsName: cls ? cls.name : null,
      mesh: cls ? cls.mesh : null, sphere: cls ? cls.sphere : null, dcSpacing: cls ? cls.dc : null,
      Imax: cls ? cls.Imax : null, Imin: cls ? cls.Imin : null, pMax: cls ? cls.pMax : null, pMin: cls ? cls.pMin : null,
      perimeter: P, N: cls ? Math.max(2, Math.ceil(P / cls.dc - 1e-9)) : 0,
      earthing: pr.earthing || 'A',
      ISPD: cls && nLines ? cls.Imax * 0.5 / nLines : 0, nLines
    };

    return {
      flags, selected: sel, RT: T.RT,
      env: { NG, CD, CE: siteCE },
      structure: { shape: sd.shape, dims: sd, AD, ADmethod: ad.method, ADeaves: G.adRect(sd.L, sd.W, sd.H), AM, ND, NM, maxH },
      adjacent: adj, lines, zones, nt, nt2, ct3,
      PB, KS1, hasLPS, totals, design
    };
  }

  function round(v, d) { const m = Math.pow(10, d); return Math.round(v * m) / m; }

  const E = { compute };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
  else root.SPEngine = E;
})(typeof self !== 'undefined' ? self : this);
