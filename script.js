// script.js
import {
  NG_OPTIONS, CE_OPTIONS, CD_OPTIONS,
  KS1_OPTIONS, KS2_OPTIONS, KS3_OPTIONS,
  LPL_OPTIONS, SPD_OPTIONS, UW_OPTIONS,
  CI_OPTIONS, LINE_LENGTH_OPTIONS, SHIELD_OPTIONS,
  NZ_OPTIONS, TZ_OPTIONS, HZ_OPTIONS, RP_OPTIONS, RT_OPTIONS
} from './tables/constants.js';

import {
  calcAD, calcAM, calcND, calcNM, calcNL, calcNI, calcNDJ
} from './tables/annexA.js';

import {
  calcPA, calcPB, calcPC, calcPM,
  calcPU, calcPV, calcPW, calcPLI, calcPZ
} from './tables/annexB.js';

import {
  calcD1Loss, calcD2Loss, calcD3Loss
} from './tables/annexC.js';

import { exportPDF as genPDF } from './pdf/pdfGenerator.js';

let zoneCounter = 0;
let lineCounter = 0;
let remoteCounter = 0;

function addZone() {
  const template = document.getElementById("zoneTemplate").content.cloneNode(true);
  template.querySelector(".zone-num").innerText = ++zoneCounter;
  document.getElementById("zoneList").appendChild(template);
}
function removeZone(btn) { btn.closest(".zone-entry").remove(); }

function addLine() {
  const template = document.getElementById("lineTemplate").content.cloneNode(true);
  template.querySelector(".line-num").innerText = ++lineCounter;
  document.getElementById("lineList").appendChild(template);
}
function removeLine(btn) { btn.closest(".line-entry").remove(); }

function addRemote() {
  const template = document.getElementById("remoteTemplate").content.cloneNode(true);
  template.querySelector(".remote-num").innerText = ++remoteCounter;
  document.getElementById("remoteList").appendChild(template);
}
function removeRemote(btn) { btn.closest(".remote-entry").remove(); }

function collectInputs() {
  const data = {
    project: Object.fromEntries(new FormData(document.getElementById("projectForm"))),
    environment: Object.fromEntries(new FormData(document.getElementById("envForm"))),
    structure: Object.fromEntries(new FormData(document.getElementById("structForm"))),
    protection: Object.fromEntries(new FormData(document.getElementById("protectionForm"))),
    zones: [], lines: [], remotes: []
  };
  document.querySelectorAll(".zone-entry").forEach(z => {
    data.zones.push({
      lpz: z.querySelector(".zone-lpz").value,
      nz: parseFloat(z.querySelector(".zone-nz").value),
      tz: parseFloat(z.querySelector(".zone-tz").value),
      hz: parseFloat(z.querySelector(".zone-hz").value),
      rp: parseFloat(z.querySelector(".zone-rp").value),
      rt: parseFloat(z.querySelector(".zone-rt").value)
    });
  });
  document.querySelectorAll(".line-entry").forEach(l => {
    data.lines.push({
      type: l.querySelector(".line-type").value,
      ci: parseFloat(l.querySelector(".line-ci").value),
      length: parseInt(l.querySelector(".line-length").value),
      shield: parseFloat(l.querySelector(".line-shield").value)
    });
  });
  document.querySelectorAll(".remote-entry").forEach(r => {
    data.remotes.push({
      H: parseFloat(r.querySelector(".remote-H").value),
      L: parseFloat(r.querySelector(".remote-L").value),
      W: parseFloat(r.querySelector(".remote-W").value),
      CDJ: parseFloat(r.querySelector(".remote-CDJ").value)
    });
  });
  return data;
}

function calculateRisk() {
  const data = collectInputs();
  const { environment, structure, protection, zones, lines } = data;
  const H = +structure.H, L = +structure.L, W = +structure.W;
  const Ng = +environment.Ng, CE = +environment.CE, KS1 = +structure.KS1;
  const AD = calcAD(H, L, W), AM = calcAM(L, W);
  const ND = calcND(Ng, AD, CE, KS1), NM = calcNM(Ng, AM, CE);

  let RA=0, RB=0, RC=0, RM=0, RU=0, RV=0, RW=0, RZ=0;
  const nt = zones.reduce((s,z)=>s+z.nz,0)||1;
  zones.forEach(z=>{
    const { nz,tz,hz,rp,rt } = z;
    const PTA=1, PB = protection.LPL==='none'?1.0:+protection.PEB;
    const PA=calcPA(PTA,PB), PC=calcPC(+protection.PSPD), PM=calcPM(0);
    const LT=0.01, LF=1.0, LO=0.0;
    const la=calcD1Loss(rt,LT,nz,nt,tz);
    const lb=calcD2Loss(rp,0.01,hz,LF,nz,nt,tz);
    const lc=calcD3Loss(LO,nz,nt,tz), lm=lc;
    RA+=ND*PA*la; RB+=ND*PB*lb; RC+=ND*PC*lc; RM+=NM*PM*lm;
  });

  lines.forEach(line=>{
    const AL=40000, AI=4000000;
    const NL=calcNL(Ng,AL,CE,line.shield),
          NI=calcNI(Ng,AI,CE,line.shield);
    const PU=calcPU(+protection.PEB), PV=calcPV(+protection.PEB),
          PW=calcPW(+protection.PSPD), PLI=calcPLI(0.16), PZ=calcPZ(PLI);
    const LU=calcD1Loss(1,0.01,1,1,8760),
          LV=calcD2Loss(1,0.01,1,1,1,8760),
          LW=calcD3Loss(0,1,1,8760), LZ=LW;
    RU+=NL*PU*LU; RV+=NL*PV*LV; RW+=NL*PW*LW; RZ+=NI*PZ*LZ;
  });

  const R1=RA+RB+RC+RM,
        R2=RB+RC+RM+RV+RW+RZ,
        R3=RB+RV,
        R4=RA+RB+RC+RM+RU+RV+RW+RZ;
  const results=[
    {name:'R1',value:R1,tolerable:1e-5,status:R1<=1e-5?'Within':'Exceeds'},
    {name:'R2',value:R2,tolerable:1e-4,status:R2<=1e-4?'Within':'Exceeds'},
    {name:'R3',value:R3,tolerable:1e-4,status:R3<=1e-4?'Within':'Exceeds'},
    {name:'R4',value:R4,tolerable:1e-3,status:R4<=1e-3?'Within':'Exceeds'}
  ];

  document.getElementById('resultDisplay').innerHTML =
    results.map(r=>`<div class="${r.status==='Within'?'result-pass':'result-fail'}">
      <strong>${r.name}</strong>: ${r.value.toExponential(3)} (RT ${r.tolerable.toExponential(1)}) - ${r.status}
    </div>`).join('');

  window.lastReport = { data, results };
}

function exportPDF() {
  if (!window.lastReport) return alert('Calculate risk first');
  genPDF(window.lastReport.data, window.lastReport.results);
}

Object.assign(window, {
  addZone, removeZone,
  addLine, removeLine,
  addRemote, removeRemote,
  calculateRisk, exportPDF
});