// backend/src/controllers/contratController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden } from '../utils/helpers';
import { emailService } from '../services/email.service';
import puppeteer from 'puppeteer';

const generateContratReference = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.contrat.count({
    where: { reference: { startsWith: `CTR-${year}` } }
  });
  return `CTR-${year}-${String(count + 1).padStart(4, '0')}`;
};

// ============================================
// RÉCUPÉRER LES DONNÉES POUR PRÉ-REMPLIR LE FORMULAIRE
// ============================================
export const getDonneesPrecontrat = async (req: Request, res: Response) => {
  try {
    const { candidatureId } = req.params;

    const candidature = await prisma.candidature.findUnique({
      where: { id: candidatureId },
      include: {
        offre: {
          include: {
            demande: {
              include: { direction: true }
            }
          }
        }
      }
    });

    if (!candidature) return sendNotFound(res, 'Candidature non trouvée');

    const ficheData = (candidature.ficheRenseignementData as Record<string, any>) || {};

    const donnees = {
      candidat: {
        id: candidature.id,
        nom: candidature.nom,
        prenom: candidature.prenom,
        email: candidature.email,
        telephone: candidature.telephone,
        adresse: ficheData.adresse || '',
        ville: ficheData.ville || '',
        dateNaissance: ficheData.dateNaissance || '',
        nationalite: ficheData.nationalite || '',
        situationFamiliale: ficheData.situationFamiliale || '',
        nombreEnfants: ficheData.nombreEnfants || ''
      },
      offre: {
        id: candidature.offre?.id,
        intitule: candidature.offre?.intitule || '',
        reference: candidature.offre?.reference || '',
        typeContrat: candidature.offre?.typeContrat || 'CDI',
        description: candidature.offre?.description || '',
        competences: candidature.offre?.competences || []
      },
      demande: {
        id: candidature.offre?.demande?.id,
        budgetMin: candidature.offre?.demande?.budgetMin,
        budgetMax: candidature.offre?.demande?.budgetMax,
        direction: candidature.offre?.demande?.direction?.nom || '',
        niveau: candidature.offre?.demande?.niveau || ''
      }
    };

    sendSuccess(res, { donnees });
  } catch (error) {
    console.error('getDonneesPrecontrat error:', error);
    sendError(res, 'Erreur lors de la récupération des données');
  }
};

// ============================================
// CRÉER UN CONTRAT
// ============================================
export const createContrat = async (req: Request, res: Response) => {
  try {
    const {
      candidatureId,
      reference,
      typeContrat,
      dateDebut,
      dateFin,
      salaire,
      prime,
      avantages,
      clauseParticuliere,
      employeurNom,
      employeurRepresentant,
      employeurAdresse,
      employePoste,
      employeDirection,
      employeSuperieur,
      employeLieuTravail,
      periodeEssaiDuree,
      periodeEssaiRenouvelable,
      horairesHebdo,
      horairesPrecision,
      congesPayes,
      preavis,
      observations,
      documentsFournis
    } = req.body;

    const userRole = (req as any).user.role;
    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Seul le Responsable Paie peut créer des contrats');
    }

    if (!candidatureId || !typeContrat || !salaire || !dateDebut) {
      return sendError(res, 'Tous les champs requis sont obligatoires', 400);
    }

    const candidature = await prisma.candidature.findUnique({
      where: { id: candidatureId },
      include: {
        offre: {
          include: {
            demande: { include: { direction: true } }
          }
        }
      }
    });

    if (!candidature) return sendNotFound(res, 'Candidature non trouvée');
    if (candidature.statut !== 'ACCEPTEE') {
      return sendError(res, 'Seules les candidatures acceptées peuvent avoir un contrat', 400);
    }

    const existingContrat = await prisma.contrat.findFirst({ where: { candidatureId } });
    if (existingContrat) {
      return sendError(res, 'Un contrat existe déjà pour cette candidature', 400);
    }

    const finalReference = reference || await generateContratReference();
    const dateDebutContrat = new Date(dateDebut);

    let dateFinPeriodeEssai: Date;
    if (dateFin) {
      dateFinPeriodeEssai = new Date(dateFin);
    } else {
      dateFinPeriodeEssai = new Date(dateDebutContrat);
      const dureeEssai = periodeEssaiDuree ? parseInt(periodeEssaiDuree) : 3;
      dateFinPeriodeEssai.setMonth(dateFinPeriodeEssai.getMonth() + dureeEssai);
    }

    const ficheData = (candidature.ficheRenseignementData as Record<string, any>) || {};

    const donneesContrat = {
      candidat: {
        nom: candidature.nom,
        prenom: candidature.prenom,
        email: candidature.email,
        telephone: candidature.telephone || '',
        adresse: ficheData.adresse || '',
        ville: ficheData.ville || '',
        dateNaissance: ficheData.dateNaissance || '',
        nationalite: ficheData.nationalite || '',
        situationFamiliale: ficheData.situationFamiliale || '',
        nombreEnfants: ficheData.nombreEnfants || ''
      },
      poste: {
        intitule: employePoste || candidature.offre?.intitule || '',
        direction: employeDirection || candidature.offre?.demande?.direction?.nom || '',
        superieur: employeSuperieur || 'Manager direct',
        lieuTravail: employeLieuTravail || 'Siège social - Tunis'
      },
      employeur: {
        nom: employeurNom || 'KILANI GROUPE',
        representant: employeurRepresentant || 'M. Karim Kilani, Directeur Général',
        adresse: employeurAdresse || 'Immeuble Kilani, Centre Urbain Nord, Tunis'
      },
      contrat: {
        typeContrat,
        salaire,
        prime: prime || '',
        avantages: avantages || '',
        clauseParticuliere: clauseParticuliere || '',
        periodeEssaiDuree: periodeEssaiDuree || '3',
        periodeEssaiRenouvelable: periodeEssaiRenouvelable ?? true,
        horairesHebdo: horairesHebdo || '40 heures',
        horairesPrecision: horairesPrecision || 'Du lundi au vendredi, 8h30 - 17h00',
        congesPayes: congesPayes || '30 jours ouvrables par an',
        preavis: preavis || '1 mois',
        observations: observations || '',
        documentsFournis: documentsFournis || ''
      }
    };

    const contrat = await prisma.contrat.create({
      data: {
        reference: finalReference,
        typeContrat: typeContrat as any,
        salaire,
        dateDebut: dateDebutContrat,
        dateFin: dateFinPeriodeEssai,
        statut: 'BROUILLON',
        candidatureId,
        donneesContrat
      },
      include: {
        candidature: {
          include: {
            offre: {
              include: {
                demande: { include: { direction: true } }
              }
            }
          }
        }
      }
    });

    sendCreated(res, contrat, 'Contrat créé avec succès');
  } catch (error) {
    console.error('createContrat error:', error);
    sendError(res, 'Erreur lors de la création du contrat');
  }
};

// ============================================
// RÉCUPÉRER TOUS LES CONTRATS
// ============================================
export const getContrats = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorisé');
    }

    const { statut } = req.query;
    const where: any = {};
    if (statut) where.statut = statut as string;

    const contrats = await prisma.contrat.findMany({
      where,
      include: {
        candidature: {
          include: {
            offre: {
              select: {
                id: true,
                reference: true,
                intitule: true,
                demande: {
                  select: {
                    budgetMin: true,
                    budgetMax: true,
                    direction: true
                  }
                }
              }
            }
          }
        },
        evaluationPE: true,
        avenants: true
      },
      orderBy: { dateDebut: 'desc' }
    });

    sendSuccess(res, { contrats });
  } catch (error) {
    console.error('getContrats error:', error);
    sendError(res, 'Erreur lors de la récupération des contrats');
  }
};

// ============================================
// RÉCUPÉRER UN CONTRAT PAR ID
// ============================================
export const getContratById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contrat = await prisma.contrat.findUnique({
      where: { id },
      include: {
        candidature: {
          include: {
            offre: { include: { demande: { include: { direction: true } } } },
            entretiens: true
          }
        },
        evaluationPE: true,
        avenants: true
      }
    });

    if (!contrat) return sendNotFound(res, 'Contrat non trouvé');
    sendSuccess(res, { contrat });
  } catch (error) {
    console.error('getContratById error:', error);
    sendError(res, 'Erreur lors de la récupération');
  }
};

// ============================================
// ENVOYER LE CONTRAT À L'EMPLOYÉ
// ============================================
export const envoyerContrat = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorisé');
    }

    const contrat = await prisma.contrat.findUnique({
      where: { id },
      include: { candidature: true }
    });

    if (!contrat) return sendNotFound(res, 'Contrat non trouvé');
    if (contrat.statut !== 'BROUILLON') {
      return sendError(res, 'Seuls les contrats en brouillon peuvent être envoyés', 400);
    }

    const consultationUrl = `${process.env.FRONTEND_URL}/contrats/consultation/${contrat.id}`;

    await emailService.sendNotificationEmail({
      nom: contrat.candidature!.nom,
      prenom: contrat.candidature!.prenom,
      email: contrat.candidature!.email,
      message: `Veuillez trouver votre contrat ${contrat.reference} à consulter. La signature se fera physiquement au siège.`,
      actionUrl: consultationUrl
    });

    const updated = await prisma.contrat.update({
      where: { id },
      data: { statut: 'ENVOYE' }
    });

    sendSuccess(res, updated, 'Contrat envoyé avec succès');
  } catch (error) {
    console.error('envoyerContrat error:', error);
    sendError(res, 'Erreur lors de l\'envoi');
  }
};

// ============================================
// CONSULTATION DU CONTRAT PAR L'EMPLOYÉ
// ============================================
export const consulterContrat = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contrat = await prisma.contrat.findUnique({
      where: { id },
      include: {
        candidature: {
          include: {
            offre: { include: { demande: { include: { direction: true } } } }
          }
        }
      }
    });

    if (!contrat) return sendNotFound(res, 'Contrat non trouvé');
    if (contrat.statut !== 'ENVOYE' && contrat.statut !== 'ACTIF') {
      return sendError(res, 'Contrat non disponible pour consultation', 400);
    }

    sendSuccess(res, { contrat });
  } catch (error) {
    console.error('consulterContrat error:', error);
    sendError(res, 'Erreur lors de la consultation');
  }
};

// ============================================
// MARQUER COMME SIGNÉ (après signature physique)
// ============================================
export const signerContrat = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorisé');
    }

    const contrat = await prisma.contrat.findUnique({
      where: { id },
      include: {
        candidature: {
          include: {
            offre: {
              include: {
                demande: {
                  include: { direction: true }
                }
              }
            }
          }
        }
      }
    });

    if (!contrat) return sendNotFound(res, 'Contrat non trouvé');
    if (contrat.statut !== 'ENVOYE') {
      return sendError(res, 'Seuls les contrats envoyés peuvent être signés', 400);
    }

    // Mettre à jour le contrat en ACTIF
    const updated = await prisma.contrat.update({
      where: { id },
      data: { statut: 'ACTIF' }
    });

    // ✅ CRÉER L'ÉVALUATION PE APRÈS LA SIGNATURE
    try {
      const evaluation = await creerEvaluationPEDepuisContrat(contrat);
      if (evaluation) {
        console.log(`✅ Évaluation PE créée avec succès: ${evaluation.reference}`);
      }
    } catch (evalError) {
      console.error('❌ Erreur lors de la création de l\'évaluation PE:', evalError);
      // Ne pas bloquer la signature si l'évaluation échoue
    }

    await emailService.sendNotificationEmail({
      nom: contrat.candidature!.nom,
      prenom: contrat.candidature!.prenom,
      email: contrat.candidature!.email,
      message: `Félicitations ! Votre contrat ${contrat.reference} est maintenant actif. Une période d'essai de 3 mois débute.`,
      actionUrl: `${process.env.FRONTEND_URL}/contrats/consultation/${contrat.id}`
    });

    sendSuccess(res, updated, 'Contrat signé et évaluation PE créée');

  } catch (error) {
    console.error('signerContrat error:', error);
    sendError(res, 'Erreur lors de la signature');
  }
};

// ============================================
// ✅ NOUVELLE FONCTION : Créer l'évaluation PE depuis un contrat
// ============================================
async function creerEvaluationPEDepuisContrat(contrat: any) {
  console.log(`🔍 Création évaluation PE pour contrat ${contrat.reference}...`);

  // Vérifier si une évaluation existe déjà
  const existingEval = await prisma.evaluationPE.findFirst({
    where: { contratId: contrat.id }
  });

  if (existingEval) {
    console.log(`⚠️ Une évaluation existe déjà pour ce contrat (${existingEval.reference})`);
    return null;
  }

  // Récupérer la candidature associée
  const candidature = await prisma.candidature.findUnique({
    where: { id: contrat.candidatureId! },
    include: { offre: { include: { demande: { include: { direction: true } } } } }
  });

  if (!candidature) {
    console.log(`⚠️ Candidature non trouvée pour contrat ${contrat.reference}`);
    return null;
  }

  // Trouver ou créer un employé (User avec role EMPLOYE)
  // On utilise l'email de la candidature pour trouver l'employé correspondant
  let employe = await prisma.user.findFirst({
    where: { email: candidature.email, role: 'EMPLOYE' }
  });

  if (!employe) {
    // Créer un employé à partir de la candidature
    const defaultPassword = await require('bcrypt').hash('Password123!', 10);
    employe = await prisma.user.create({
      data: {
        email: candidature.email,
        password: defaultPassword,
        nom: candidature.nom,
        prenom: candidature.prenom,
        role: 'EMPLOYE',
        poste: contrat.donneesContrat?.poste?.intitule || candidature.offre?.intitule || 'Employé',
        telephone: candidature.telephone,
        directionId: candidature.offre?.demande?.directionId,
        dateArrivee: contrat.dateDebut,
        actif: true,
        mustChangePassword: true
      }
    });
    console.log(`✅ Employé créé: ${employe.prenom} ${employe.nom} (${employe.email})`);
  }

  // Trouver le manager de la même direction
  const manager = await prisma.user.findFirst({
    where: {
      role: 'MANAGER',
      directionId: candidature.offre?.demande?.directionId,
      actif: true
    }
  });

  if (!manager) {
    console.log(`⚠️ Aucun manager trouvé pour la direction ${candidature.offre?.demande?.directionId}`);
    return null;
  }

  // Calculer les jours restants
  const today = new Date();
  const dateFin = contrat.dateFin;
  const joursRestants = Math.ceil((dateFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Générer la référence
  const year = new Date().getFullYear();
  const count = await prisma.evaluationPE.count();
  const reference = `EVAL-${year}-${String(count + 1).padStart(4, '0')}`;

  // Créer l'évaluation
  const evaluation = await prisma.evaluationPE.create({
    data: {
      reference,
      employeId: employe.id,
      managerId: manager.id,
      contratId: contrat.id,
      dateDebut: contrat.dateDebut,
      dateFin: dateFin,
      joursRestants: joursRestants > 0 ? joursRestants : 0,
      statut: 'BROUILLON',
      etapeActuelle: 0,
      totalEtapes: 3
    }
  });

  console.log(`✅ Évaluation PE créée: ${evaluation.reference} (J-${joursRestants})`);
  
  // Notifier le responsable paie
  const respPaie = await prisma.user.findFirst({ where: { role: 'RESP_PAIE', actif: true } });
  if (respPaie) {
    await emailService.sendNotificationEmail({
      nom: respPaie.nom,
      prenom: respPaie.prenom,
      email: respPaie.email,
      message: `Une nouvelle évaluation PE a été créée pour ${candidature.prenom} ${candidature.nom}. Veuillez saisir les données contractuelles.`,
      actionUrl: `${process.env.FRONTEND_URL}/evaluations/${evaluation.id}`
    });
  }

  return evaluation;
}

// ============================================
// GÉNÉRER ET TÉLÉCHARGER LE PDF
// ============================================
export const telechargerPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contrat = await prisma.contrat.findUnique({
      where: { id },
      include: {
        candidature: {
          include: {
            offre: {
              include: {
                demande: { include: { direction: true } }
              }
            }
          }
        }
      }
    });

    if (!contrat) return res.status(404).json({ message: 'Contrat non trouvé' });

    const donnees = (contrat.donneesContrat as any) || {};
    const candidat = donnees.candidat || {};
    const poste = donnees.poste || {};
    const employeur = donnees.employeur || {};
    const contratData = donnees.contrat || {};

    const ficheData = (contrat.candidature?.ficheRenseignementData as Record<string, any>) || {};
    const offre = contrat.candidature?.offre;
    const demande = offre?.demande;
    const direction = demande?.direction;

    const nomCandidatFinal = candidat.nom || contrat.candidature?.nom || '';
    const prenomCandidatFinal = candidat.prenom || contrat.candidature?.prenom || '';
    const emailFinal = candidat.email || contrat.candidature?.email || '';
    const telephoneFinal = candidat.telephone || contrat.candidature?.telephone || 'Non renseigné';
    const adresseFinal = candidat.adresse || ficheData.adresse || 'Non renseignée';
    const dateNaissanceFinal = candidat.dateNaissance || ficheData.dateNaissance || 'Non renseignée';
    const nationaliteFinal = candidat.nationalite || ficheData.nationalite || 'Non renseignée';

    const employeurNomFinal = employeur.nom || 'KILANI GROUPE';
    const employeurRepFinal = employeur.representant || 'M. Karim Kilani, Directeur Général';
    const employeurAdrFinal = employeur.adresse || 'Immeuble Kilani, Centre Urbain Nord, Tunis';

    const posteFinal = poste.intitule || offre?.intitule || 'Employé';
    const directionFinal = poste.direction || direction?.nom || 'Non spécifié';
    const superieurFinal = poste.superieur || 'Manager direct';
    const lieuFinal = poste.lieuTravail || 'Siège social - Tunis';

    const salaireFinal = contrat.salaire;
    const primeFinal = contratData.prime || 'Aucune';
    const avantagesFinal = contratData.avantages || '';
    const clauseFinal = contratData.clauseParticuliere || '';
    const horairesHebdoFinal = contratData.horairesHebdo || '40 heures';
    const horairesPrecisionFinal = contratData.horairesPrecision || 'Du lundi au vendredi, 8h30 - 17h00';
    const congesPayesFinal = contratData.congesPayes || '30 jours ouvrables par an';
    const preavisFinal = contratData.preavis || '1 mois';
    const observationsFinal = contratData.observations || '';
    const periodeRenouvelable = contratData.periodeEssaiRenouvelable ? 'Oui' : 'Non';

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contrat de travail ${contrat.reference}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.4;
      color: #000;
      background: white;
      padding: 40px;
      margin: 0;
    }
    .header {
      text-align: right;
      margin-bottom: 30px;
    }
    .header strong {
      font-size: 14pt;
    }
    h1 {
      text-align: center;
      font-size: 18pt;
      text-transform: uppercase;
      margin: 20px 0;
      letter-spacing: 2px;
    }
    h2 {
      font-size: 14pt;
      margin: 20px 0 10px;
      border-bottom: 1px solid #333;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    td {
      padding: 8px 12px;
      border: 1px solid #ccc;
      vertical-align: top;
    }
    .bold {
      font-weight: bold;
      background-color: #f5f5f5;
      width: 35%;
    }
    .notice {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 12px;
      margin: 20px 0;
      text-align: center;
      font-size: 11pt;
    }
    .signature-block {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      margin-top: 50px;
      border-top: 1px solid #000;
      padding-top: 5px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 9pt;
      color: #666;
      border-top: 1px solid #eee;
      padding-top: 15px;
    }
  </style>
</head>
<body>

<div class="header">
  <strong>KILANI GROUPE</strong><br>
  ${directionFinal}<br>
  Tunis, le ${new Date().toLocaleDateString('fr-FR')}
</div>

<h1>CONTRAT DE TRAVAIL</h1>

<p style="text-align:center; margin-bottom:20px;">
  <strong>Référence :</strong> ${contrat.reference} &nbsp;|&nbsp; 
  <strong>Type :</strong> ${contrat.typeContrat}
</p>

<h2>ARTICLE 1 - IDENTITÉ DES PARTIES</h2>
<table>
  <tr><td class="bold">Employeur</td><td>${employeurNomFinal}</td></tr>
  <tr><td class="bold">Représentant légal</td><td>${employeurRepFinal}</td></tr>
  <tr><td class="bold">Adresse siège social</td><td>${employeurAdrFinal}</td></tr>
  <tr><td class="bold">Salarié(e)</td><td>${prenomCandidatFinal} ${nomCandidatFinal}</td></tr>
  <tr><td class="bold">Date de naissance</td><td>${dateNaissanceFinal}</td></tr>
  <tr><td class="bold">Nationalité</td><td>${nationaliteFinal}</td></tr>
  <tr><td class="bold">Adresse personnelle</td><td>${adresseFinal}</td></tr>
  <tr><td class="bold">Téléphone</td><td>${telephoneFinal}</td></tr>
  <tr><td class="bold">Email</td><td>${emailFinal}</td></tr>
</table>

<h2>ARTICLE 2 - POSTE ET AFFECTATION</h2>
<table>
  <tr><td class="bold">Poste occupé</td><td>${posteFinal}</td></tr>
  <tr><td class="bold">Direction / Service</td><td>${directionFinal}</td></tr>
  <tr><td class="bold">Supérieur hiérarchique</td><td>${superieurFinal}</td></tr>
  <tr><td class="bold">Lieu de travail</td><td>${lieuFinal}</td></tr>
</table>

<h2>ARTICLE 3 - CONDITIONS DU CONTRAT</h2>
<table>
  <tr><td class="bold">Type de contrat</td><td>${contrat.typeContrat}</td></tr>
  <tr><td class="bold">Date de prise de poste</td><td>${new Date(contrat.dateDebut).toLocaleDateString('fr-FR')}</td></tr>
  <tr><td class="bold">Fin de période d'essai</td><td>${contrat.dateFin ? new Date(contrat.dateFin).toLocaleDateString('fr-FR') : 'Non définie'}</td></tr>
  <tr><td class="bold">Période d'essai renouvelable</td><td>${periodeRenouvelable}</td></tr>
</table>

<h2>ARTICLE 4 - RÉMUNÉRATION ET AVANTAGES</h2>
<table>
  <tr><td class="bold">Salaire brut mensuel</td><td><strong>${salaireFinal}</strong></td></tr>
  <tr><td class="bold">Prime / Bonus</td><td>${primeFinal}</td></tr>
  <tr><td class="bold">Avantages</td><td>${avantagesFinal || 'Aucun avantage particulier'}</td></tr>
</table>

<h2>ARTICLE 5 - DURÉE DU TRAVAIL ET CONGÉS</h2>
<table>
  <tr><td class="bold">Durée hebdomadaire</td><td>${horairesHebdoFinal}</td></tr>
  <tr><td class="bold">Horaires</td><td>${horairesPrecisionFinal}</td></tr>
  <tr><td class="bold">Congés payés annuels</td><td>${congesPayesFinal}</td></tr>
  <tr><td class="bold">Préavis de rupture</td><td>${preavisFinal}</td></tr>
</table>

${clauseFinal ? `
<h2>ARTICLE 6 - CLAUSES PARTICULIÈRES</h2>
<div style="margin:10px 0; padding:10px; background:#f5f5f5;">${clauseFinal}</div>
` : ''}

${observationsFinal ? `
<h2>OBSERVATIONS</h2>
<div style="margin:10px 0; padding:10px; background:#f5f5f5;">${observationsFinal}</div>
` : ''}

<div class="notice">
  <strong>⚠️ Document à titre de consultation</strong><br>
  La signature définitive sera effectuée physiquement au siège social de l'entreprise.
</div>

<div class="signature-block">
  <div class="signature-box">
    <div class="signature-line"></div>
    <p><strong>L'Employeur</strong><br>${employeurRepFinal}</p>
  </div>
  <div class="signature-box">
    <div class="signature-line"></div>
    <p><strong>Le(La) Salarié(e)</strong><br>${prenomCandidatFinal} ${nomCandidatFinal}</p>
  </div>
</div>

<div class="footer">
  <p>Fait à Tunis, en deux exemplaires originaux, le ${new Date().toLocaleDateString('fr-FR')}</p>
  <p>${employeurNomFinal} — Tous droits réservés</p>
</div>

</body>
</html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrat_${contrat.reference}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('telechargerPDF error:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  }
};

// ============================================
// METTRE À JOUR LE STATUT
// ============================================
export const updateContratStatut = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    const userRole = (req as any).user.role;

    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorisé');
    }

    const statutsValides = ['BROUILLON', 'ENVOYE', 'ACTIF', 'RESILIE', 'TERMINE'];
    if (!statutsValides.includes(statut)) {
      return sendError(res, 'Statut invalide', 400);
    }

    const contrat = await prisma.contrat.update({ where: { id }, data: { statut } });
    sendSuccess(res, contrat, `Statut mis à jour : ${statut}`);
  } catch (error) {
    console.error('updateContratStatut error:', error);
    sendError(res, 'Erreur lors de la mise à jour');
  }
};

// ============================================
// CRÉER UN AVENANT
// ============================================
export const createAvenant = async (req: Request, res: Response) => {
  try {
    const { contratId, typeAvenant, description, dateEffet, nouveauSalaire, nouvelleDateFin } = req.body;
    const userRole = (req as any).user.role;

    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorisé');
    }

    const contrat = await prisma.contrat.findUnique({ where: { id: contratId } });
    if (!contrat) return sendNotFound(res, 'Contrat non trouvé');

    const avenant = await prisma.avenant.create({
      data: { typeAvenant, description, date: new Date(dateEffet), contratId }
    });

    if (nouveauSalaire) {
      await prisma.contrat.update({ where: { id: contratId }, data: { salaire: nouveauSalaire } });
    }
    if (nouvelleDateFin) {
      await prisma.contrat.update({ where: { id: contratId }, data: { dateFin: new Date(nouvelleDateFin) } });
    }

    sendCreated(res, avenant, 'Avenant créé avec succès');
  } catch (error) {
    console.error('createAvenant error:', error);
    sendError(res, 'Erreur lors de la création de l\'avenant');
  }
};

// ============================================
// RÉCUPÉRER LES AVENANTS
// ============================================
export const getAvenants = async (req: Request, res: Response) => {
  try {
    const { contratId } = req.params;
    const avenants = await prisma.avenant.findMany({
      where: { contratId },
      orderBy: { date: 'desc' }
    });
    sendSuccess(res, { avenants });
  } catch (error) {
    console.error('getAvenants error:', error);
    sendError(res, 'Erreur lors de la récupération');
  }
};