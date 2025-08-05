// pdf/pdfGenerator.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportPDF(data, results) {
  const doc = new jsPDF();
  const title = `Risk Assessment - ${data.project.caseName}`;

  // --- Header ---
  doc.setFontSize(14);
  doc.text('Lightning protection risk management calculations', 14, 20);
  doc.setFontSize(12);
  doc.text('To BS EN 62305-2:2012', 14, 27);
  doc.text(`Project name: ${data.project.projectName}`, 14, 35);
  doc.text(`Client: ${data.project.client}`, 14, 42);
  doc.text(`Prepared by: ${data.project.preparedBy}`, 14, 49);
  doc.text(`Date: ${data.project.date}`, 14, 56);
  doc.text(`Case name: ${data.project.caseName}`, 14, 63);

  // --- Summary Table of Primary Risks ---
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

  // --- Environmental ---
  doc.text('Environmental Factors:', 14, y);
  y += 6;
  Object.entries(data.environment).forEach(([k,v])=>{
    doc.text(`  • ${k}: ${v}`, 14, y);
    y += 5;
  });

  // --- Primary Structure ---
  y += 4;
  doc.text('Primary Structure:', 14, y);
  y += 6;
  ['H','L','W','KS1','KS2','KS3','LPL'].forEach(field=>{
    const val = data.structure[field] ?? '';
    doc.text(`  • ${field}: ${val}`, 14, y);
    y += 5;
  });

  // --- Remote Structures ---
  if (data.remotes.length) {
    y += 4;
    doc.text('Remote Structures:', 14, y);
    y += 6;
    data.remotes.forEach((r, idx) => {
      doc.text(`  Structure ${idx+1}: H=${r.H}, L=${r.L}, W=${r.W}, CDJ=${r.CDJ}`, 14, y);
      y += 5;
    });
  }

  // --- Zones ---
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

  // --- Service Lines ---
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

  // Save PDF
  doc.save(`${title}.pdf`);
}