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

    // ✅ Cast correct — ficheRenseignementData est un champ Json dans Prisma
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
// ✅ CORRIGÉ : on sauvegarde TOUTES les données du formulaire en JSON
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

    // ✅ CORRIGÉ : plus de `ficheRenseignementData: true` dans include (ce n'est pas une relation)
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

    // ✅ Récupérer les données de la fiche de renseignement
    const ficheData = (candidature.ficheRenseignementData as Record<string, any>) || {};

    // ✅ Construire l'objet donneesContrat complet pour le PDF
    const donneesContrat = {
      // Données candidat (depuis candidature + fiche)
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
      // Données poste
      poste: {
        intitule: employePoste || candidature.offre?.intitule || '',
        direction: employeDirection || candidature.offre?.demande?.direction?.nom || '',
        superieur: employeSuperieur || 'Manager direct',
        lieuTravail: employeLieuTravail || 'Siège social - Tunis'
      },
      // Données employeur
      employeur: {
        nom: employeurNom || 'KILANI GROUPE',
        representant: employeurRepresentant || 'M. Karim Kilani, Directeur Général',
        adresse: employeurAdresse || 'Immeuble Kilani, Centre Urbain Nord, Tunis'
      },
      // Données contrat
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

    // ✅ Sauvegarde du contrat avec toutes les données
    const contrat = await prisma.contrat.create({
      data: {
        reference: finalReference,
        typeContrat: typeContrat as any,
        salaire,
        dateDebut: dateDebutContrat,
        dateFin: dateFinPeriodeEssai,
        statut: 'BROUILLON',
        candidatureId,
        donneesContrat  // ✅ toutes les données sauvegardées en JSON
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

    // ✅ Mettre à jour le contrat en ACTIF
    const updated = await prisma.contrat.update({
      where: { id },
      data: { statut: 'ACTIF' }
    });

    // ✅ DÉCLENCHER L'ÉVALUATION PE AUTOMATIQUEMENT
    await declencherEvaluationPE(contrat);

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
async function declencherEvaluationPE(contrat: any) {
  try {
    console.log(`🔍 Déclenchement évaluation PE pour contrat ${contrat.reference}...`);
    
    // Vérifier si une évaluation existe déjà
    const existingEval = await prisma.evaluationPE.findFirst({
      where: { contratId: contrat.id }
    });

    if (existingEval) {
      console.log(`⚠️ Une évaluation existe déjà pour ce contrat`);
      return;
    }

    // Calculer la date de fin de période d'essai (3 mois après date début)
    const dateFinPE = new Date(contrat.dateDebut);
    dateFinPE.setMonth(dateFinPE.getMonth() + 3);
    
    // Calculer les jours restants
    const today = new Date();
    const joursRestants = Math.ceil((dateFinPE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Trouver le manager de la même direction
    const directionId = contrat.candidature?.offre?.demande?.directionId;
    const manager = await prisma.user.findFirst({
      where: {
        role: 'MANAGER',
        directionId: directionId,
        actif: true
      }
    });

    if (!manager) {
      console.log(`⚠️ Aucun manager trouvé pour la direction ${directionId}`);
    }

    // Générer la référence
    const year = new Date().getFullYear();
    const count = await prisma.evaluationPE.count();
    const reference = `EVAL-${year}-${String(count + 1).padStart(4, '0')}`;

    // Créer l'évaluation
    const evaluation = await prisma.evaluationPE.create({
      data: {
        reference,
        employeId: contrat.candidature!.id,
        managerId: manager?.id || '',
        contratId: contrat.id,
        dateDebut: contrat.dateDebut,
        dateFin: dateFinPE,
        joursRestants: joursRestants > 0 ? joursRestants : 0,
        statut: 'BROUILLON',
        etapeActuelle: 0,
        totalEtapes: 3
      }
    });

    console.log(`✅ Évaluation PE créée: ${evaluation.reference}`);
    
    // Notifier le responsable paie
    const respPaie = await prisma.user.findFirst({ where: { role: 'RESP_PAIE', actif: true } });
    if (respPaie) {
      await emailService.sendNotificationEmail({
        nom: respPaie.nom,
        prenom: respPaie.prenom,
        email: respPaie.email,
        message: `Une nouvelle évaluation PE a été créée pour ${contrat.candidature?.prenom} ${contrat.candidature?.nom}. Veuillez saisir les données contractuelles.`,
        actionUrl: `${process.env.FRONTEND_URL}/evaluations/${evaluation.id}`
      });
    }
    
  } catch (error) {
    console.error('Erreur lors du déclenchement PE:', error);
  }
}

// ============================================
// GÉNÉRER ET TÉLÉCHARGER LE PDF
// ✅ CORRIGÉ : lit les données depuis la DB (donneesContrat), pas req.body
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

    // ✅ Lire les données depuis donneesContrat (sauvegardé lors de la création)
    const donnees = (contrat.donneesContrat as any) || {};
    const candidat = donnees.candidat || {};
    const poste = donnees.poste || {};
    const employeur = donnees.employeur || {};
    const contratData = donnees.contrat || {};

    // Fallbacks depuis les relations Prisma si donneesContrat est vide (contrats du seed)
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
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; padding: 40px; font-size: 13px; color: #222; }
    .header-logo { text-align: right; margin-bottom: 30px; font-size: 12px; color: #555; }
    .header-logo strong { font-size: 16px; color: #2c3e50; display: block; }
    h1 { text-align: center; color: #2c3e50; font-size: 22px; margin: 20px 0 6px; text-transform: uppercase; letter-spacing: 2px; }
    .ref-line { text-align: center; font-size: 12px; color: #777; margin-bottom: 30px; }
    h2 { font-size: 14px; margin: 24px 0 10px; color: #2c3e50; border-bottom: 2px solid #2c3e50; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 16px; }
    td { padding: 8px 12px; border: 1px solid #ddd; }
    .bold { font-weight: bold; background: #f0f4f8; width: 38%; color: #2c3e50; }
    .section-text { margin: 8px 0 16px; padding: 10px 14px; background: #fafafa; border-left: 3px solid #2c3e50; font-size: 13px; }
    .notice { background: #fff8e1; border: 1px solid #f9a825; padding: 12px 16px; margin: 24px 0; border-radius: 6px; font-size: 12px; text-align: center; color: #555; }
    .signature-block { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-box { width: 44%; text-align: center; }
    .signature-box p { font-size: 12px; color: #444; margin-bottom: 4px; }
    .signature-line { margin-top: 50px; border-top: 1px solid #333; padding-top: 6px; font-size: 11px; color: #777; }
    .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
    .badge { display: inline-block; background: #e8f4fd; color: #1a73e8; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
  </style>
</head>
<body>

  <div class="header-logo">
    <strong>${employeurNomFinal}</strong>
    ${directionFinal}<br>
    Tunis, le ${new Date().toLocaleDateString('fr-FR')}
  </div>

  <h1>Contrat de Travail</h1>
  <div class="ref-line">Référence : <strong>${contrat.reference}</strong> &nbsp;|&nbsp; Type : <span class="badge">${contrat.typeContrat}</span></div>

  <!-- PARTIE I : PARTIES -->
  <h2>Article 1 — Identité des parties</h2>
  <table>
    <tr><td class="bold">Employeur</td><td>${employeurNomFinal}</td></tr>
    <tr><td class="bold">Représentant légal</td><td>${employeurRepFinal}</td></tr>
    <tr><td class="bold">Adresse siège social</td><td>${employeurAdrFinal}</td></tr>
  </table>
  <table>
    <tr><td class="bold">Salarié(e)</td><td>${prenomCandidatFinal} ${nomCandidatFinal}</td></tr>
    <tr><td class="bold">Date de naissance</td><td>${dateNaissanceFinal}</td></tr>
    <tr><td class="bold">Nationalité</td><td>${nationaliteFinal}</td></tr>
    <tr><td class="bold">Adresse personnelle</td><td>${adresseFinal}</td></tr>
    <tr><td class="bold">Téléphone</td><td>${telephoneFinal}</td></tr>
    <tr><td class="bold">Email</td><td>${emailFinal}</td></tr>
  </table>

  <!-- PARTIE II : POSTE -->
  <h2>Article 2 — Poste et affectation</h2>
  <table>
    <tr><td class="bold">Poste occupé</td><td>${posteFinal}</td></tr>
    <tr><td class="bold">Direction / Service</td><td>${directionFinal}</td></tr>
    <tr><td class="bold">Supérieur hiérarchique</td><td>${superieurFinal}</td></tr>
    <tr><td class="bold">Lieu de travail</td><td>${lieuFinal}</td></tr>
  </table>

  <!-- PARTIE III : CONDITIONS -->
  <h2>Article 3 — Conditions du contrat</h2>
  <table>
    <tr><td class="bold">Type de contrat</td><td>${contrat.typeContrat}</td></tr>
    <tr><td class="bold">Date de prise de poste</td><td>${new Date(contrat.dateDebut).toLocaleDateString('fr-FR')}</td></tr>
    <tr><td class="bold">Fin de période d'essai</td><td>${contrat.dateFin ? new Date(contrat.dateFin).toLocaleDateString('fr-FR') : 'Non définie'}</td></tr>
    <tr><td class="bold">Période d'essai renouvelable</td><td>${periodeRenouvelable}</td></tr>
  </table>

  <!-- PARTIE IV : RÉMUNÉRATION -->
  <h2>Article 4 — Rémunération et avantages</h2>
  <table>
    <tr><td class="bold">Salaire brut mensuel</td><td><strong>${salaireFinal}</strong></td></tr>
    <tr><td class="bold">Prime / Bonus</td><td>${primeFinal}</td></tr>
    <tr><td class="bold">Avantages</td><td>${avantagesFinal || 'Aucun avantage particulier'}</td></tr>
  </table>

  <!-- PARTIE V : HORAIRES -->
  <h2>Article 5 — Durée du travail et congés</h2>
  <table>
    <tr><td class="bold">Durée hebdomadaire</td><td>${horairesHebdoFinal}</td></tr>
    <tr><td class="bold">Horaires</td><td>${horairesPrecisionFinal}</td></tr>
    <tr><td class="bold">Congés payés annuels</td><td>${congesPayesFinal}</td></tr>
    <tr><td class="bold">Préavis de rupture</td><td>${preavisFinal}</td></tr>
  </table>

  ${clauseFinal ? `
  <!-- PARTIE VI : CLAUSES -->
  <h2>Article 6 — Clauses particulières</h2>
  <div class="section-text">${clauseFinal}</div>
  ` : ''}

  ${observationsFinal ? `
  <h2>Observations</h2>
  <div class="section-text">${observationsFinal}</div>
  ` : ''}

  <div class="notice">
     Ce document est fourni à titre de consultation.<br>
    La signature définitive sera effectuée physiquement au siège social de l'entreprise.
  </div>

  <div class="signature-block">
    <div class="signature-box">
      <p><strong>L'Employeur</strong></p>
      <p>${employeurRepFinal}</p>
      <div class="signature-line">Signature et cachet</div>
    </div>
    <div class="signature-box">
      <p><strong>Le(La) Salarié(e)</strong></p>
      <p>${prenomCandidatFinal} ${nomCandidatFinal}</p>
      <div class="signature-line">Signature précédée de « Lu et approuvé »</div>
    </div>
  </div>

  <div class="footer">
    <p>Fait à Tunis, en deux exemplaires originaux, le ${new Date().toLocaleDateString('fr-FR')}</p>
    <p style="margin-top:6px">${employeurNomFinal} — Tous droits réservés</p>
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