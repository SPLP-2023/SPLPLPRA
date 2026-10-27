/*
 * Test cases rebuilt from three StrikeRisk v6.0 full case reports.
 * Expected values are copied from those reports unless noted.
 */
function mains(id, name, extra) {
  return Object.assign({
    id, name, type: 'power', CT: 'lv', construction: 'unshielded_buried', UW: '4', KS3: 'large',
    sections: [{ length: 50, CI: 'buried' }], adjacentId: 'sub'
  }, extra || {});
}

module.exports = [
  {
    name: 'Tobacco Warehouse (18/12/2024)',
    state: {
      risks: { r1: true, r2: false, r3: true },
      env: { NG: 0.7, CD: 'same', CE: 'urban' },
      structure: { shape: 'rect', L: 220, W: 50, H: 40 },
      adjacent: [{ id: 'sub', name: 'Substation', L: 5, W: 5, H: 3, CD: 'higher' }],
      lines: [
        mains('l1', 'Mains Intake 1', { overrides: { PLD: 0.9 } }),
        mains('l2', 'Mains Intake 2', { overrides: { PLD: 0.9 } }),
        mains('l3', 'Mains Intake 3', { overrides: { PLD: 0.9 } }),
        mains('l4', 'Mains Intake 4', { overrides: { PLD: 0.9 } }),
        { id: 'l5', name: 'Telecom & Data', type: 'telecom', CT: 'lv', construction: 'unshielded_aerial', UW: '2.5', KS3: 'large', sections: [{ length: 100, CI: 'aerial' }] }
      ],
      zones: [
        { id: 'z1', name: 'Internal Area', location: 'inside', nz: 540, tz: 8760, rt: 'agri', rf: 'fire_low', hz: 'evac', LF1: 'flats', LO1: 'none', cz: 10464000, LF3: 'museum' },
        { id: 'z2', name: 'Outside Area', location: 'outside', nz: 5, tz: 8760, rt: 'agri', rf: 'fire_low', hz: 'none', LF1: 'flats', LO1: 'none', cz: 0, LF3: 'museum' }
      ],
      protection: {
        lps: 'IV', earthing: 'A',
        lines: { l1: { peb: 'III-IV' }, l2: { peb: 'III-IV' }, l3: { peb: 'III-IV' }, l4: { peb: 'III-IV' }, l5: { peb: 'III-IV' } },
        zones: { z1: { rp: 'auto' }, z2: { rp: 'none' } }
      }
    },
    expect: [
      ['structure.AD', 121038.93, 1e-6],
      ['structure.AM', 1055398.16, 1e-6],
      ['structure.ND', 4.2364e-2, 1e-4],
      ['structure.NM', 7.3878e-1, 1e-4],
      ['adjacent.sub.ADJ', 459.47, 1e-5],
      ['lines.0.NDJ', 8.0407e-5, 1e-4],
      ['lines.0.NL', 7e-5, 1e-6],
      ['lines.0.NI', 7e-3, 1e-6],
      ['lines.4.NL', 2.8e-4, 1e-6],
      ['lines.0.PV', 4.5e-2, 1e-6],
      ['lines.0.PW', 9e-1, 1e-6],
      ['lines.0.PZ', 1.6e-1, 1e-6],
      ['lines.4.PZ', 2e-1, 1e-6],
      ['zones.0.PA', 2e-1, 1e-6],
      ['zones.0.perLine.0.PMS', 2.5e-3, 1e-6],
      ['zones.0.perLine.4.PMS', 6.4e-3, 1e-6],
      ['zones.0.PM', 1.6299e-2, 1e-4],
      ['zones.0.PC', 1, 1e-6],
      ['zones.0.perLine.0.PU', 4.5e-2, 1e-6],
      ['zones.0.L1.LA', 9.9083e-5, 1e-4],
      ['zones.0.L1.LB', 9.9083e-4, 1e-4],
      ['zones.1.L1.LA', 9.1743e-7, 1e-4],
      ['zones.0.L3.LB', 2e-5, 1e-6],
      ['zones.0.R1.RA', 8.395e-7, 1e-4],
      ['zones.0.R1.RB', 8.395e-6, 1e-4],
      ['zones.0.R1.lines.0.RU', 6.7062e-10, 1e-4],
      ['zones.0.R1.lines.0.RV', 6.7062e-9, 1e-4],
      ['zones.0.R1.lines.4.RU', 1.3872e-9, 1e-4],
      ['zones.0.R1.lines.4.RV', 1.3872e-8, 1e-4],
      ['zones.0.R3.RB', 1.6945e-7, 1e-4],
      ['zones.0.R3.lines.0.RV', 1.3537e-10, 1e-4],
      ['zones.1.R1.RA', 7.7731e-9, 1e-4],
      ['zones.1.R1.RB', 0, 0],
      ['totals.r1.total', 9.287e-6, 1e-4],
      ['totals.r1.direct', 9.2423e-6, 1e-4],
      ['totals.r1.indirect', 4.4766e-8, 1e-4],
      ['totals.r1.shock', 8.5134e-7, 1e-4],
      ['totals.r1.fire', 8.4357e-6, 1e-4],
      ['totals.r3.total', 1.7028e-7, 1e-4],
      ['design.ISPD', 10, 1e-9],
      ['design.N', 27, 0]
    ]
  },
  {
    name: 'Daimler Court (22/09/2026)',
    note: 'A_D follows formula A.2 (7,659.50 m²). StrikeRisk printed 7,155.50 m² from its eaves/ridge input with ridge 0 m, so N_D, R_A, R_B and R1 are scaled by that ratio. P_C = 1 because coordinated SPDs do not reduce P_C without an LPS (UK annex NB.3).',
    state: {
      risks: { r1: true },
      env: { NG: 0.9, CD: 'higher', CE: 'urban' },
      structure: { shape: 'rect', L: 30, W: 14, H: 12 },
      adjacent: [
        { id: 'sub', name: 'Substation', L: 5, W: 5, H: 3, CD: 'higher' },
        { id: 'tx', name: 'Telecom Exchange', L: 8, W: 5, H: 3, CD: 'higher' }
      ],
      lines: [
        { id: 'l1', name: 'Mains LV Power', type: 'power', CT: 'lv', construction: 'unshielded_buried', UW: '4', KS3: 'none', sections: [{ length: 1000, CI: 'buried' }], adjacentId: 'sub' },
        { id: 'l2', name: 'Telecom/Data', type: 'telecom', CT: 'lv', construction: 'unshielded_buried', UW: '4', KS3: 'none', sections: [{ length: 1000, CI: 'buried' }], adjacentId: 'tx' }
      ],
      zones: [
        { id: 'z1', name: 'LPZ 1 - Internal', location: 'inside', nz: 60, tz: 8760, rt: 'agri', rf: 'fire_ord', hz: 'low_panic', LF1: 'flats', LO1: 'none' },
        { id: 'z2', name: 'LPZ 0a - External', location: 'outside', nz: 0, tz: 8760, rt: 'agri', rf: 'fire_ord', hz: 'low_panic', LF1: 'flats', LO1: 'none' }
      ],
      protection: {
        lps: 'none',
        lines: { l1: { peb: 'III-IV', pspd: 'III-IV' }, l2: { peb: 'III-IV', pspd: 'III-IV' } },
        zones: { z1: { rp: 'auto' }, z2: { rp: 'auto' } }
      }
    },
    expect: [
      ['structure.AD', 7659.504, 1e-5],
      ['structure.AM', 829398.16, 1e-6],
      ['structure.ND', 0.9 * 7659.504 * 0.25e-6, 1e-5],
      ['adjacent.sub.ADJ', 459.47, 1e-5],
      ['adjacent.tx.ADJ', 528.47, 1e-5],
      ['lines.0.NDJ', 1.0338e-4, 1e-4],
      ['lines.1.NDJ', 1.1891e-4, 1e-4],
      ['lines.0.NL', 1.8e-3, 1e-6],
      ['lines.0.NI', 1.8e-1, 1e-6],
      ['lines.0.PZ', 8e-3, 1e-6],
      ['lines.1.PZ', 4e-3, 1e-6],
      ['zones.0.PM', 6.2402e-3, 1e-4],
      ['zones.0.perLine.0.PMS', 6.25e-2, 1e-6],
      ['zones.0.perLine.0.PU', 5e-2, 1e-6],
      ['zones.0.PC', 1, 1e-9],
      ['zones.0.L1.LA', 1e-4, 1e-6],
      ['zones.0.L1.LB', 4e-3, 1e-6],
      ['zones.0.R1.RA', 1.61e-7 * 7659.504 / 7155.50, 1e-4],
      ['zones.0.R1.RB', 6.44e-6 * 7659.504 / 7155.50, 1e-4],
      ['zones.0.R1.lines.0.RU', 9.5169e-9, 1e-4],
      ['zones.0.R1.lines.0.RV', 3.8068e-7, 1e-4],
      ['zones.0.R1.lines.1.RU', 9.5945e-9, 1e-4],
      ['zones.0.R1.lines.1.RV', 3.8378e-7, 1e-4],
      ['totals.r1.indirect', 7.8357e-7, 1e-4],
      ['totals.r1.total', 6.601e-6 * 7659.504 / 7155.50 + 7.8357e-7, 1e-4],
      ['design.ISPD', 0, 0]
    ]
  },
  {
    name: 'St Francis De Sales (24/06/2026)',
    note: 'Entered as rectangular at eaves height 10 m, which is what StrikeRisk calculated. The pitched-roof graphical area is checked separately.',
    state: {
      risks: { r1: true },
      env: { NG: 1, CD: 'higher', CE: 'rural' },
      structure: { shape: 'rect', L: 12, W: 27, H: 10 },
      adjacent: [
        { id: 'sub', name: 'Substation', L: 5, W: 5, H: 3, CD: 'higher' },
        { id: 'tx', name: 'Telecom Exchange', L: 8, W: 5, H: 3, CD: 'higher' }
      ],
      lines: [
        { id: 'l1', name: 'Mains LV Power', type: 'power', CT: 'lv', construction: 'unshielded_buried', UW: '4', KS3: 'none', sections: [{ length: 1000, CI: 'buried' }], adjacentId: 'sub' },
        { id: 'l2', name: 'Telecom/Data', type: 'telecom', CT: 'lv', construction: 'unshielded_buried', UW: '4', KS3: 'none', sections: [{ length: 1000, CI: 'buried' }], adjacentId: 'tx' }
      ],
      zones: [
        { id: 'z1', name: 'LPZ 1 - Internal', location: 'inside', nz: 40, tz: 728, rt: 'agri', rf: 'fire_ord', hz: 'low_panic', LF1: 'church', LO1: 'none' },
        { id: 'z2', name: 'LPZ 0a - External', location: 'outside', nz: 0, tz: 8760, rt: 'agri', rf: 'fire_ord', hz: 'none', LF1: 'church', LO1: 'none' }
      ],
      protection: { lps: 'none', lines: {}, zones: { z1: { rp: 'manual' }, z2: { rp: 'none' } } }
    },
    expect: [
      ['structure.AD', 5491.43, 1e-5],
      ['structure.ND', 1.3729e-3, 1e-4],
      ['adjacent.sub.ADJ', 459.47, 1e-5],
      ['lines.0.NL', 2e-2, 1e-6],
      ['lines.0.NI', 2, 1e-6],
      ['zones.0.PM', 1.2109e-1, 1e-4],
      ['zones.0.perLine.0.PU', 1, 0],
      ['totals.r1.total', 3.1129e-6, 1e-4]
    ]
  }
];
