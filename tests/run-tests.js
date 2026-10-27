#!/usr/bin/env node
/* Runs the StrikeRisk reference cases against the engine. Exit code 1 on any failure. */
const E = require('../js/engine.js');
const G = require('../js/geometry.js');
const cases = require('./cases.js');

let fails = 0, passes = 0;
function get(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function check(label, actual, expected, relTol) {
  const ok = expected === 0 ? Math.abs(actual) <= 1e-15 : Math.abs(actual - expected) / Math.abs(expected) <= Math.max(relTol, 1e-12);
  if (ok) passes++; else { fails++; console.log('  FAIL ' + label + ': got ' + actual + ', expected ' + expected); }
}

for (const c of cases) {
  console.log(c.name + (c.note ? '\n  note: ' + c.note : ''));
  const r = E.compute(c.state);
  for (const [path, exp, tol] of c.expect) check(path, get(r, path), exp, tol);
}

console.log('Geometry');
// St Francis pitched roof, ridge 14 m along the 27 m side: stadium 27 × 84 + π × 42²
const pitched = G.ad({ shape: 'pitched', L: 12, W: 27, H: 10, Hr: 14, ridgeDir: 'W' }).value;
check('pitched graphical A_D', pitched, 27 * 84 + Math.PI * 42 * 42, 2e-3);
// rectangle via graphical routine must agree with formula A.2
const rectG = G.collection({ shape: 'rect', L: 220, W: 50, H: 40 }).area;
check('graphical = A.2 for rectangle', rectG, G.adRect(220, 50, 40), 1e-3);
// protrusion: never smaller than either part alone
const prot = G.ad({ shape: 'protrusion', L: 30, W: 14, H: 12, Hp: 22, Pw: 4 }).value;
check('protrusion >= A.3 approximation', prot >= Math.max(G.adRect(30, 14, 12), Math.PI * 66 * 66) ? 1 : 0, 1, 0);
check('27 down conductor positions', G.dcPositions(220, 50, 27).length, 27, 0);

console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
