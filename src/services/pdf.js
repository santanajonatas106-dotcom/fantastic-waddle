const PDFDocument = require('pdfkit');

function writeSection(doc, title, content) {
  if (!content) return;
  doc.moveDown(0.7).fontSize(13).font('Helvetica-Bold').text(title.toUpperCase());
  doc.moveDown(0.25).fontSize(10.5).font('Helvetica').text(content, { lineGap: 3 });
}

function streamResumePdf(res, resume) {
  const doc = new PDFDocument({ size: 'A4', margin: 52, info: { Title: `Currículo - ${resume.full_name}` } });
  const safeName = String(resume.full_name || 'curriculo').replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '-');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="curriculo-${safeName}.pdf"`);
  doc.pipe(res);

  doc.font('Helvetica-Bold').fontSize(24).text(resume.full_name || 'Nome completo');
  if (resume.target_role) doc.moveDown(0.2).font('Helvetica').fontSize(13).text(resume.target_role);
  const contact = [resume.email, resume.phone, resume.city].filter(Boolean).join('  •  ');
  if (contact) doc.moveDown(0.5).fontSize(9.5).text(contact);
  doc.moveDown(0.7).moveTo(52, doc.y).lineTo(543, doc.y).stroke();

  writeSection(doc, 'Resumo profissional', resume.professional_summary);
  writeSection(doc, 'Experiência profissional', resume.experience);
  writeSection(doc, 'Formação', resume.education);
  writeSection(doc, 'Competências', resume.skills);

  doc.end();
}

module.exports = { streamResumePdf };
