// tables/annexA.js
export function calcAD(H, L, W) {
  return H * (L + W);
}
export function calcAM(L, W) {
  return 2 * 500 * (L + W) + Math.PI * 500 * 500;
}
export function calcND(Ng, AD, CE, KS1) {
  return Ng * AD * CE * KS1;
}
export function calcNM(Ng, AM, CE) {
  return Ng * AM * CE;
}
export function calcNL(Ng, AL, CE, CLD) {
  return Ng * AL * CE * CLD;
}
export function calcNI(Ng, AI, CE, CLI) {
  return Ng * AI * CE * CLI;
}
export function calcNDJ(Ng, ADJ, CE, CDJ, KS1_remote) {
  return Ng * ADJ * CE * CDJ * KS1_remote;
}

