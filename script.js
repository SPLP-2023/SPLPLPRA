// script.js (Bundled, Complete)
// Full lightning protection risk assessment tool script
// Includes constants, Annex calculations, UI logic, and PDF export (for GitHub Pages)

// ------------------------------
// CONSTANTS
// ------------------------------
const LINE_LENGTH_OPTIONS = [100, 200, 500, 1000];

// ------------------------------
// ANNEX A - N_x Calculations
// ------------------------------
function calcAD(H, L, W) { return H * (L + W); }
function calcAM(L, W) { return 2 * 500 * (L + W) + Math.PI * 500 * 500; }
function calcND(Ng, AD, CE, KS1) { return Ng * AD * CE * KS1; }
function calcNM(Ng, AM, CE) { return Ng * AM * CE; }
function calcNL(Ng, AL, CE, CLD) { return Ng * AL * CE * CLD; }
function calcNI(Ng, AI, CE, CLI) { return Ng * AI * CE * CLI; }
function calcNDJ(Ng, ADJ, CE, CDJ, KS1_remote) { return Ng * ADJ * CE * CDJ * KS1_remote; }

// ------------------------------
// ANNEX B - P_x Probabilities
// ------------------------------
function calcPA(PTA, PB) { return PTA * PB; }
function calcPB(PB) { return PB; }
function calcPC(PSPD) { return PSPD; }
function calcPM(PM) { return PM; }
function calcPU(PEB) { return PEB; }
function calcPV(PEB) { return PEB; }
function calcPW(PSPD) { return PSPD; }
function calcPLI(PLI) { return PLI; }
function calcPZ(PLI) { return PLI; }

// ------------------------------
// ANNEX C - L_x Losses
// ------------------------------
function calcD1Loss(rt, LT, nz, nt, tz) {
  return rt * LT * (nz / nt) * (tz / 8760);
}
function calcD2Loss(rp, rf, hz, LF, nz, nt, tz) {
  return rp * rf * hz * LF * (nz / nt) * (tz / 8760);
}
function calcD3Loss(LO, nz, nt, tz) {
  return LO * (nz / nt) * (tz / 8760);
}

// ------------------------------
// PDF GENERATOR
// ------------------------------
function exportPDF(data, results) {
  const doc = new window.jspdf.jsPDF();
  const title = `Risk Assessment - ${data.project.caseName}`;

  doc.setFontSize(14);
  doc.text('Lightning protection risk management calculations', 14, 20);
  doc.setFontSize(12);
  doc.text('To BS EN 62305-2:2012', 14, 27);
  doc.text(`Project name: ${data.project.projectName}`, 14, 35);
  doc.text(`Client: ${data.project.client}`, 14, 42);
  doc.text(`Prepared by: ${data.project.preparedBy}`, 14, 49);
  doc.text(`Date: ${data.project.date}`, 14, 56);
  doc.text(`Case name: ${data.project.caseName}`, 14, 63);

  doc.autoTable({
    startY: 70,
    head: [['Risk','Value','Tolerable','Status']],
    body: results.map(r=>[
      r.name,
      r.value.toExponential(3),
      r.tolerable.toExponential(1),
      r.status
    ])
  });

  let y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.text('Environmental Factors:', 14, y);
  y += 6;
  Object.entries(data.environment).forEach(([k,v])=>{
    doc.text(`  • ${k}: ${v}`, 14, y);
    y += 5;
  });

  y += 4;
  doc.text('Primary Structure:', 14, y);
  y += 6;
  ['H','L','W','KS1','KS2','KS3','LPL'].forEach(field=>{
    const val = data.structure[field] ?? '';
    doc.text(`  • ${field}: ${val}`, 14, y);
    y += 5;
  });

  if (data.remotes.length) {
    y += 4;
    doc.text('Remote Structures:', 14, y);
    y += 6;
    data.remotes.forEach((r, idx) => {
      doc.text(`  Structure ${idx+1}: H=${r.H}, L=${r.L}, W=${r.W}, CDJ=${r.CDJ}`, 14, y);
      y += 5;
    });
  }

  if (data.zones.length) {
    y += 4;
    doc.text('Zones (LPZs):', 14, y);
    y += 6;
    data.zones.forEach((z, idx) => {
      doc.text(
        `  Zone ${idx+1}: Type=${z.lpz}, n_z=${z.nz}, t_z=${z.tz}, h_z=${z.hz}, r_p=${z.rp}, r_t=${z.rt}`,
        14, y
      );
      y += 5;
    });
  }

  if (data.lines.length) {
    y += 4;
    doc.text('Service Lines:', 14, y);
    y += 6;
    data.lines.forEach((l, idx) => {
      doc.text(
        `  Line ${idx+1}: Type=${l.type}, CI=${l.ci}, Length=${l.length}, Shield=${l.shield}`,
        14, y
      );
      y += 5;
    });
  }

  doc.save(`${title}.pdf`);
}

// ------------------------------
// UI + RISK CALCULATION
// ------------------------------
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
    const NL=calcNL(Ng,AL,CE,line.shield), NI=calcNI(Ng,AI,CE,line.shield);
    const PU=calcPU(+protection.PEB), PV=calcPV(+protection.PEB), PW=calcPW(+protection.PSPD);
    const PLI=calcPLI(0.16), PZ=calcPZ(PLI);
    const LU=calcD1Loss(1,0.01,1,1,8760), LV=calcD2Loss(1,0.01,1,1,1,8760);
    const LW=calcD3Loss(0,1,1,8760), LZ=LW;
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

function handleExportPDF() {
  if (!window.lastReport) return alert('Please calculate risk first');
  exportPDF(window.lastReport.data, window.lastReport.results);
}

// Attach to window
Object.assign(window, {
  addZone, removeZone,
  addLine, removeLine,
  addRemote, removeRemote,
  calculateRisk, exportPDF: handleExportPDF
});
