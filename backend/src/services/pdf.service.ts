// backend/src/services/pdf.service.ts

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export const generatePDF = async (contrat: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const ficheData = contrat.candidature?.ficheRenseignementData as any || {};
    const candidature = contrat.candidature;
    const offre = candidature?.offre;
    const direction = offre?.demande?.direction;

    // ── En-tête
    doc
      .fontSize(10)
      .text('KILANI GROUPE', { align: 'right' })
      .text(direction?.nom || 'Direction Générale', { align: 'right' })
      .text(`Tunis, le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' })
      .moveDown(2);

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('CONTRAT DE TRAVAIL', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Référence : ${contrat.reference}`, { align: 'center' })
      .moveDown(1.5);

    // ── Section helper
    const section = (title: string) => {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text(title)
        .moveDown(0.3);
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#cccccc')
        .stroke()
        .moveDown(0.5);
      doc.font('Helvetica').fillColor('black').fontSize(10);
    };

    const row = (label: string, value: string) => {
      doc
        .font('Helvetica-Bold')
        .text(label + ' : ', { continued: true })
        .font('Helvetica')
        .text(value || 'Non renseigné')
        .moveDown(0.3);
    };

    // ── Partie I : Identité des parties
    section('Partie I : Identité des parties');
    row('Employeur', 'KILANI GROUPE');
    row('Représentant', 'M. Karim Kilani, Directeur Général');
    row('Adresse', 'Immeuble Kilani, Centre Urbain Nord, Tunis');
    row('Salarié(e)', `${candidature?.prenom || ''} ${candidature?.nom || ''}`);
    row('Date de naissance', ficheData.dateNaissance || 'Non renseignée');
    row('Nationalité', ficheData.nationalite || 'Non renseignée');
    row('Adresse personnelle', ficheData.adresse || 'Non renseignée');
    doc.moveDown(0.8);

    // ── Partie II : Contenu du contrat
    section('Partie II : Contenu du contrat');
    row('Poste occupé', offre?.intitule || 'Employé');
    row('Direction / Service', direction?.nom || 'Non spécifié');
    row('Type de contrat', contrat.typeContrat);
    row('Date de début', new Date(contrat.dateDebut).toLocaleDateString('fr-FR'));
    row("Fin période d'essai", new Date(contrat.dateFin).toLocaleDateString('fr-FR'));
    row('Rémunération brute mensuelle', contrat.salaire);
    row('Lieu de travail', 'Siège social - Tunis');
    row('Durée du travail', '40 heures par semaine');
    row('Congés payés', '30 jours ouvrables par an');
    doc.moveDown(0.8);

    // ── Notice
    doc
      .rect(50, doc.y, 495, 35)
      .fillAndStroke('#fff3cd', '#ffc107');
    doc
      .fillColor('#856404')
      .fontSize(10)
      .text(
        '⚠  Document à titre de consultation — La signature finale devra être effectuée physiquement au siège.',
        60,
        doc.y - 30,
        { width: 475, align: 'center' }
      );
    doc.fillColor('black').moveDown(2);

    // ── Signatures
    const sigY = doc.y + 40;
    doc.fontSize(10).text("Signature de l'Employeur", 80, sigY, { width: 180, align: 'center' });
    doc.text('Signature du Salarié', 310, sigY, { width: 180, align: 'center' });
    doc
      .moveTo(80, sigY - 5).lineTo(260, sigY - 5).stroke()
      .moveTo(310, sigY - 5).lineTo(490, sigY - 5).stroke();

    // ── Footer
    doc.moveDown(4);
    doc
      .fontSize(9)
      .fillColor('#777777')
      .text(`Fait à Tunis, le ${new Date().toLocaleDateString('fr-FR')} — Original à conserver par chaque partie`, {
        align: 'center'
      });

    doc.end();
  });
};