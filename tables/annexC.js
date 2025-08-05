// tables/annexC.js
export function calcD1Loss(rt, LT, nz, nt, tz) {
  return rt * LT * (nz / nt) * (tz / 8760);
}
export function calcD2Loss(rp, rf, hz, LF, nz, nt, tz) {
  return rp * rf * hz * LF * (nz / nt) * (tz / 8760);
}
export function calcD3Loss(LO, nz, nt, tz) {
  return LO * (nz / nt) * (tz / 8760);
}

