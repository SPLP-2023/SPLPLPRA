/*
 * Strike Point Risk — values from BS EN 62305-2:2012 with the UK National Annex
 * (Annexes NB, NC, NF), BS EN 62305-1:2011 and BS EN 62305-3:2011.
 * Every value here is listed in the signed-off "verified values" document.
 * Labels are written in our own words.
 */
(function (root) {
  const T = {};

  // Tolerable risk — Table NF.1 (UK)
  T.RT = { r1: 1e-5, r2: 1e-4, r3: 1e-4 };

  // Location factor C_D / C_DJ — Table A.1
  T.CD = [
    { key: 'higher', label: 'Surrounded by higher objects', v: 0.25 },
    { key: 'same', label: 'Surrounded by objects of the same height or smaller', v: 0.5 },
    { key: 'isolated', label: 'Isolated — nothing else nearby', v: 1 },
    { key: 'hilltop', label: 'Isolated on a hilltop or knoll', v: 2 }
  ];

  // Line environmental factor C_E — Table A.4
  T.CE = [
    { key: 'rural', label: 'Rural', v: 1 },
    { key: 'suburban', label: 'Suburban', v: 0.5 },
    { key: 'urban', label: 'Urban', v: 0.1 },
    { key: 'urban_tall', label: 'Urban with buildings over 20 m', v: 0.01 }
  ];

  // Line installation factor C_I — Table A.2
  T.CI = [
    { key: 'buried', label: 'Buried', v: 0.5 },
    { key: 'aerial', label: 'Aerial (overhead)', v: 1 },
    { key: 'meshed', label: 'Buried entirely within a meshed earth', v: 0.01 }
  ];

  // Line type factor C_T — Table A.3
  T.CT = [
    { key: 'lv', label: 'LV supply, telecom or data', v: 1 },
    { key: 'hv', label: 'HV supply with HV/LV transformer', v: 0.2 }
  ];

  // Cable construction → C_LD, C_LI (Table NB.4) and which P_LD row applies (Table NB.8)
  T.construction = [
    { key: 'unshielded_buried', label: 'Unshielded buried cable', CLD: 1, CLI: 1, pld: 'unshielded' },
    { key: 'unshielded_aerial', label: 'Unshielded aerial cable', CLD: 1, CLI: 1, pld: 'unshielded' },
    { key: 'mgn', label: 'Multi-grounded neutral power line', CLD: 1, CLI: 0.2, pld: 'unshielded' },
    { key: 'shield_buried_unbonded', label: 'Shielded buried — shield not bonded to equipment earth bar', CLD: 1, CLI: 0.3, pld: 'unshielded' },
    { key: 'shield_aerial_unbonded', label: 'Shielded aerial — shield not bonded to equipment earth bar', CLD: 1, CLI: 0.1, pld: 'unshielded' },
    { key: 'shield_buried_bonded', label: 'Shielded buried — shield bonded to equipment earth bar', CLD: 1, CLI: 0, pld: 'shielded' },
    { key: 'shield_aerial_bonded', label: 'Shielded aerial — shield bonded to equipment earth bar', CLD: 1, CLI: 0, pld: 'shielded' },
    { key: 'protective', label: 'Lightning protective cable, duct or metal conduit (bonded)', CLD: 0, CLI: 0, pld: 'shielded' },
    { key: 'isolating', label: 'Isolating interface (fibre, isolation transformer)', CLD: 0, CLI: 0, pld: 'unshielded' }
  ];

  // Cable screen resistance bands — Table NB.8
  T.RS = [
    { key: '5-20', label: '5 to 20 Ω/km' },
    { key: '1-5', label: '1 to 5 Ω/km' },
    { key: 'le1', label: '1 Ω/km or less' }
  ];

  // Impulse withstand voltage U_W of equipment (kV)
  T.UW = [
    { key: '1', label: '1 kV — electronic / telecom equipment', v: 1 },
    { key: '1.5', label: '1.5 kV — Cat I, sensitive equipment', v: 1.5 },
    { key: '2.5', label: '2.5 kV — Cat II, appliances', v: 2.5 },
    { key: '4', label: '4 kV — Cat III, distribution', v: 4 },
    { key: '6', label: '6 kV — Cat IV, origin of installation', v: 6 }
  ];
  const UW_INDEX = { '1': 0, '1.5': 1, '2.5': 2, '4': 3, '6': 4 };
  T.UW_INDEX = UW_INDEX;

  // P_LD — Table NB.8 (columns U_W 1, 1.5, 2.5, 4, 6 kV)
  T.PLD = {
    unshielded: [1, 1, 1, 1, 1],
    '5-20': [1, 1, 0.95, 0.9, 0.8],
    '1-5': [0.9, 0.8, 0.6, 0.3, 0.1],
    le1: [0.6, 0.4, 0.2, 0.04, 0.02]
  };

  // P_LI — Table NB.9
  T.PLI = {
    power: [1, 0.6, 0.3, 0.16, 0.1],
    telecom: [1, 0.5, 0.2, 0.08, 0.04]
  };

  // K_S3 internal wiring — Table NB.5
  T.KS3 = [
    { key: 'large', label: 'Unshielded, routed to avoid large loops (~10 m²)', v: 0.2 },
    { key: 'none', label: 'Unshielded, no routing precautions (~50 m² loops)', v: 1 },
    { key: 'small', label: 'Unshielded, routed to avoid loops (~0.5 m²)', v: 0.01 },
    { key: 'shielded', label: 'Shielded cable or metal conduit, bonded both ends', v: 0.0001 }
  ];

  // Shields K_S1 / K_S2 — NB.5
  T.SHIELD = [
    { key: 'none', label: 'No shielding', v: 1 },
    { key: 'grid', label: 'Grid-like shield or LPS mesh (enter mesh width)' },
    { key: 'continuous', label: 'Continuous metal shield ≥ 0.1 mm', v: 0.0001 }
  ];

  // P_EB (Table NB.7) and P_SPD (Table NB.3) — same values
  T.SPD = [
    { key: 'none', label: 'None', v: 1 },
    { key: 'III-IV', label: 'LPL III–IV', v: 0.05 },
    { key: 'III-IV*', label: 'LPL III–IV* (enhanced, low U_P)', v: 0.005 },
    { key: 'II', label: 'LPL II', v: 0.02 },
    { key: 'II*', label: 'LPL II* (enhanced, low U_P)', v: 0.002 },
    { key: 'I', label: 'LPL I', v: 0.01 },
    { key: 'I*', label: 'LPL I* (enhanced, low U_P)', v: 0.001 }
  ];

  // P_B — Table NB.2, and class used for design values
  T.LPS = [
    { key: 'none', label: 'No lightning protection system', PB: 1, cls: 0 },
    { key: 'IV', label: 'Class IV', PB: 0.2, cls: 4 },
    { key: 'III', label: 'Class III', PB: 0.1, cls: 3 },
    { key: 'II', label: 'Class II', PB: 0.05, cls: 2 },
    { key: 'I', label: 'Class I', PB: 0.02, cls: 1 },
    { key: 'I_frame', label: 'Class I air termination + metal/RC frame as down conductors', PB: 0.01, cls: 1 },
    { key: 'metal_roof', label: 'Metal roof + air termination + metal/RC frame', PB: 0.001, cls: 1 }
  ];

  // Design values per class — BS EN 62305-3 Tables 2 and 4; BS EN 62305-1 Tables 3–5
  // (probability below I_max for Class IV set to 97% to match StrikeRisk, as agreed)
  T.CLASS = {
    1: { name: 'I', mesh: 5, sphere: 20, dc: 10, Imax: 200, Imin: 3, pMax: 0.99, pMin: 0.99 },
    2: { name: 'II', mesh: 10, sphere: 30, dc: 10, Imax: 150, Imin: 5, pMax: 0.98, pMin: 0.97 },
    3: { name: 'III', mesh: 15, sphere: 45, dc: 15, Imax: 100, Imin: 10, pMax: 0.95, pMin: 0.91 },
    4: { name: 'IV', mesh: 20, sphere: 60, dc: 20, Imax: 100, Imin: 16, pMax: 0.97, pMin: 0.84 }
  };

  // P_TA — Table NB.1 (product of measures)
  T.PTA = [
    { key: 'notices', label: 'Warning notices', v: 0.1 },
    { key: 'insulation', label: 'Insulated down conductors (≥ 3 mm XLPE)', v: 0.01 },
    { key: 'equipot', label: 'Effective soil equipotentialisation (meshed earth)', v: 0.01 },
    { key: 'restrict', label: 'Physical restrictions, or frame used as down conductors', v: 0 }
  ];

  // P_TU — Table NB.6 (product of measures)
  T.PTU = [
    { key: 'notices', label: 'Warning notices', v: 0.1 },
    { key: 'insulation', label: 'Electrical insulation', v: 0.01 },
    { key: 'restrict', label: 'Physical restrictions', v: 0 }
  ];

  // r_t — Table NC.3
  T.rt = [
    { key: 'agri', label: 'Agricultural ground, concrete', v: 1e-2 },
    { key: 'marble', label: 'Marble, ceramic', v: 1e-3 },
    { key: 'gravel', label: 'Gravel, carpet', v: 1e-4 },
    { key: 'asphalt', label: 'Asphalt, linoleum, wood', v: 1e-5 }
  ];

  // r_p — Table NC.4
  T.rp = [
    { key: 'none', label: 'No fire provisions', v: 1 },
    { key: 'manual', label: 'Extinguishers, manual alarm, hydrants, compartments or escape routes', v: 0.5 },
    { key: 'auto', label: 'Automatic extinguishing or automatic alarm', v: 0.2 }
  ];

  // r_f — Table NC.5
  T.rf = [
    { key: 'fire_low', label: 'Low fire risk (under 400 MJ/m²)', v: 1e-3 },
    { key: 'fire_ord', label: 'Ordinary fire risk (400–800 MJ/m²)', v: 1e-2 },
    { key: 'fire_high', label: 'High fire risk (over 800 MJ/m² or combustible)', v: 1e-1 },
    { key: 'expl_2', label: 'Explosion risk — zones 2 / 22', v: 1e-3, expl: true },
    { key: 'expl_1', label: 'Explosion risk — zones 1 / 21', v: 1e-1, expl: true },
    { key: 'expl_0', label: 'Explosion risk — zones 0 / 20, solid explosives', v: 1, expl: true },
    { key: 'none', label: 'No fire or explosion risk', v: 0 }
  ];

  // h_z — Table NC.6
  T.hz = [
    { key: 'none', label: 'No special hazard', v: 1 },
    { key: 'low_panic', label: 'Low panic (up to 2 floors, up to 100 people)', v: 2 },
    { key: 'avg_panic', label: 'Average panic (100–1000 people)', v: 5 },
    { key: 'evac', label: 'Difficult evacuation (immobile people, hospitals)', v: 5 },
    { key: 'high_panic', label: 'High panic (over 1000 people)', v: 10 }
  ];

  // L_F for L1 — Table NC.2 (UK)
  T.LF1 = [
    { key: 'hospital', label: 'Hospital', v: 1 },
    { key: 'hotel', label: 'Hotel', v: 1 },
    { key: 'large_house', label: 'Large house', v: 1 },
    { key: 'flats', label: 'Block of flats', v: 1 },
    { key: 'refinery', label: 'Oil refinery / chemical plant', v: 1 },
    { key: 'halls', label: 'Halls of residence', v: 1 },
    { key: 'prison', label: 'Prison', v: 1 },
    { key: 'police', label: 'Police / ambulance station', v: 1 },
    { key: 'farm', label: 'Farm building', v: 1 },
    { key: 'nursing', label: 'Nursing / children’s home', v: 1 },
    { key: 'factory', label: 'Factory', v: 0.75 },
    { key: 'railway', label: 'Railway station', v: 0.75 },
    { key: 'airport', label: 'Airport building', v: 0.75 },
    { key: 'fuel', label: 'Fuel / service station', v: 0.67 },
    { key: 'leisure', label: 'Leisure centre', v: 0.67 },
    { key: 'shop', label: 'Shop / shopping centre', v: 0.5 },
    { key: 'cathedral', label: 'Cathedral', v: 0.5 },
    { key: 'university', label: 'University', v: 0.42 },
    { key: 'museum', label: 'Museum', v: 0.42 },
    { key: 'office', label: 'Commercial building / office block', v: 0.42 },
    { key: 'dept_store', label: 'Department store', v: 0.42 },
    { key: 'warehouse', label: 'Industrial warehouse', v: 0.42 },
    { key: 'civic', label: 'Civic building', v: 0.33 },
    { key: 'commercial_centre', label: 'Commercial centre', v: 0.33 },
    { key: 'medical', label: 'Medical centre', v: 0.33 },
    { key: 'telephone', label: 'Telephone exchange', v: 0.33 },
    { key: 'water', label: 'Water treatment works', v: 0.33 },
    { key: 'power', label: 'Power station', v: 0.33 },
    { key: 'substation', label: 'Substation', v: 0.33 },
    { key: 'school', label: 'School', v: 0.33 },
    { key: 'gas', label: 'Gas compound', v: 0.33 },
    { key: 'theatre', label: 'Theatre', v: 0.21 },
    { key: 'church', label: 'Church', v: 0.08 },
    { key: 'stadium', label: 'Sports stadium', v: 0.04 },
    { key: 'base_station', label: 'Base station', v: 0.04 },
    { key: 'wind_farm', label: 'Wind farm', v: 0.04 },
    { key: 'ruins', label: 'Ruins', v: 0.04 },
    { key: 'other', label: 'Other', v: 0.33 }
  ];
  T.LT = 0.01; // Table NC.2, all types

  // L_O for L1 — Table NC.2 (UK, values as printed)
  T.LO1 = [
    { key: 'none', label: 'No — failure does not endanger life', v: 0 },
    { key: 'explosion', label: 'Risk of explosion', v: 0.1 },
    { key: 'icu', label: 'Hospital ICU / operating theatre', v: 0.001 },
    { key: 'hospital', label: 'Other parts of hospital', v: 0.33 }
  ];

  // L2 — Table NC.8
  T.L2 = [
    { key: 'service', label: 'Public service provider (gas, water, power, comms, health, retail…)', LF: 0.1, LO: 0.01 }
  ];

  // L3 — Table NC.10
  T.LF3 = [
    { key: 'museum', label: 'Museums, galleries and heritage buildings', v: 0.1 }
  ];

  T.find = function (list, key) {
    for (const o of list) if (o.key === key) return o;
    return list[0];
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  else root.SPTables = T;
})(typeof self !== 'undefined' ? self : this);
