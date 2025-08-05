// tables/constants.js
export const NG_OPTIONS = [
  { label:"5 days/y (0.2)",value:0.2},{label:"10 days/y (0.5)",value:0.5},
  { label:"20 days/y (1.1)",value:1.1},{label:"30 days/y (1.9)",value:1.9},
  { label:"40 days/y (2.8)",value:2.8},{label:"50 days/y (3.7)",value:3.7},
  { label:"60 days/y (4.7)",value:4.7},{label:"80 days/y (6.9)",value:6.9},
  { label:"100 days/y (9.2)",value:9.2}
];

export const CD_OPTIONS = [
  {label:"Isolated/hilltop (1.0)",value:1.0},
  {label:"Similar surroundings (0.5)",value:0.5},
  {label:"Surrounded by taller (0.25)",value:0.25}
];

export const CE_OPTIONS = [
  {label:"Rural (1.0)",value:1.0},
  {label:"Suburban (0.5)",value:0.5},
  {label:"Urban (0.1)",value:0.1},
  {label:"Urban >20m (0.01)",value:0.01}
];

// Structure factors
export const KS1_OPTIONS = [
  {label:"Non-cond (1.0)",value:1.0},
  {label:"Non-cond w/ LPS I (0.6)",value:0.6},
  {label:"Cond frame, non-cond clad (0.6)",value:0.6},
  {label:"Cond frame, cond clad (0.25)",value:0.25},
  {label:"Cond frame, metal clad 100mm (0.01)",value:0.01},
  {label:"Cond frame, metal clad 10mm (0.001)",value:0.001},
  {label:"Fully metal no openings (0.0001)",value:0.0001}
];
export const KS2_OPTIONS = [
  {label:"No shielding (1.0)",value:1.0},
  {label:"Partial (0.6)",value:0.6},
  {label:"Full (0.3)",value:0.3}
];
export const KS3_OPTIONS = [
  {label:"Normal wiring (1.0)",value:1.0},
  {label:"Grounded conduit (0.5)",value:0.5},
  {label:"Optical fibre (0.1)",value:0.1}
];

export const LPL_OPTIONS = [
  {label:"No LPS (PB=1.0)",value:"none"},
  {label:"IV (PB=0.2)",value:"IV"},
  {label:"III (PB=0.1)",value:"III"},
  {label:"II (PB=0.05)",value:"II"},
  {label:"I (PB=0.02)",value:"I"}
];

export const SPD_OPTIONS = [
  {label:"None",value:0},{label:"2.5 kA",value:2.5},
  {label:"12.5 kA",value:12.5},{label:"25 kA",value:25}
];

export const UW_OPTIONS = [
  {label:"1 kV",value:1},{label:"1.5 kV",value:1.5},
  {label:"2.5 kV",value:2.5},{label:"4 kV",value:4},
  {label:"6 kV",value:6}
];

export const CI_OPTIONS = [
  {label:"Overhead (1.0)",value:1.0},
  {label:"Buried (0.5)",value:0.5},
  {label:"Conduit (0.25)",value:0.25}
];

export const LINE_LENGTH_OPTIONS = [100,200,500,1000];

export const SHIELD_OPTIONS = [
  {label:"Unshielded (1.0)",value:1.0},
  {label:"Partial (0.5)",value:0.5},
  {label:"Full (0.25)",value:0.25}
];

export const NZ_OPTIONS = [
  {label:"1–10 people (0.01)",value:0.01},
  {label:"10–50 people (0.05)",value:0.05},
  {label:"50–100 people (0.1)",value:0.1},
  {label:"100+ people (0.2)",value:0.2}
];

export const TZ_OPTIONS = [
  {label:"1 hr/day (365)",value:365},
  {label:"8 hr/day (2920)",value:2920},
  {label:"24/7 (8760)",value:8760}
];

export const HZ_OPTIONS = [
  {label:"None (1.0)",value:1.0},
  {label:"Flammable (2.0)",value:2.0},
  {label:"Explosive (3.0)",value:3.0}
];

export const RP_OPTIONS = [
  {label:"None (1.0)",value:1.0},
  {label:"Alarm only (0.8)",value:0.8},
  {label:"Extinguishing (0.5)",value:0.5}
];

export const RT_OPTIONS = [
  {label:"Conductive (1.0)",value:1.0},
  {label:"Semi (0.8)",value:0.8},
  {label:"Non-cond (0.5)",value:0.5}
];

