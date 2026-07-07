// backend/src/controllers/contratController.ts
//
// Corrections apportées par rapport à la version précédente :
//   1. FIX CRITIQUE : signerContrat créait l'EvaluationPE IMMÉDIATEMENT à la
//      signature (et notifiait le RESP_PAIE tout de suite), au lieu
//      d'attendre le déclenchement automatique à J-30 décrit dans le cahier
//      des charges. -> La création de l'EvaluationPE reste exclusivement
//      dans evaluationPEService.verifierContratsEcheance (job J-30).
//   2. FIX MÉTIER : l'EMPLOYE n'a PAS accès à la plateforme — seuls
//      SUPER_ADMIN, MANAGER, DIRECTEUR, DRH, DAF, DGA, DG et RESP_PAIE s'y
//      connectent. La version précédente traitait le User (role EMPLOYE)
//      créé à la signature comme un vrai "compte" : mot de passe temporaire
//      à transmettre, notification au Resp. Paie pour "communiquer les
//      identifiants de connexion", mustChangePassword présenté comme un
//      vrai parcours de première connexion. Rien de tout cela n'a de sens
//      pour un rôle qui ne se connecte jamais. Ce User n'existe que pour
//      deux raisons strictement internes : (a) EvaluationPE.employeId est
//      une FK obligatoire qui a besoin d'une ligne à référencer, et (b) les
//      écrans RH (annuaire, fiches employé) affichent ces données. On parle
//      donc désormais de "fiche employé", pas de "compte" : mot de passe
//      aléatoire jamais communiqué (juste pour satisfaire la contrainte
//      NOT NULL de la colonne), pas de notification de type "voici ses
//      identifiants".
//   3. FIX : génération de `reference` contrat protégée contre les
//      collisions concurrentes (retry sur violation de contrainte unique
//      au lieu d'un count() naïf).

import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden } from '../utils/helpers';
import { emailService } from '../services/email.service';
import puppeteer from 'puppeteer';
import { avenantService } from '../services/avenant.service';
const generateContratReference = async (): Promise<string> => {
  const year = new Date().getFullYear();
  for (let tentative = 0; tentative < 5; tentative++) {
    const count = await prisma.contrat.count({
      where: { reference: { startsWith: `CTR-${year}` } }
    });
    const suffixe = tentative === 0 ? '' : `-${Date.now().toString().slice(-4)}`;
    const reference = `CTR-${year}-${String(count + 1 + tentative).padStart(4, '0')}${suffixe}`;
    const existe = await prisma.contrat.findUnique({ where: { reference } });
    if (!existe) return reference;
  }
  return `CTR-${year}-${Date.now()}`;
};

// Génère une valeur aléatoire pour le champ `password` (NOT NULL en base)
// de la fiche EMPLOYE auto-créée à la signature. Cette valeur n'est
// JAMAIS communiquée à qui que ce soit : l'EMPLOYE n'a pas accès à la
// plateforme, donc ce mot de passe ne sert jamais à une connexion réelle.
const genererValeurPlaceholder = (): string => {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12) + 'Aa1!';
};


// RÉCUPÉRER LES DONNÉES POUR PRÉ-REMPLIR LE FORMULAIRE

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


// CRÉER UN CONTRAT

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


// RÉCUPÉRER TOUS LES CONTRATS

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


// RÉCUPÉRER UN CONTRAT PAR ID

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


// ENVOYER LE CONTRAT À L'EMPLOYÉ

export const envoyerContrat = async (req: Request, res: Response) => {
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
          include: { offre: true }
        }
      }
    });

    if (!contrat) return sendNotFound(res, 'Contrat non trouvé');
    if (contrat.statut !== 'BROUILLON') {
      return sendError(res, 'Seuls les contrats en brouillon peuvent être envoyés', 400);
    }

    const consultationUrl = `${process.env.BACKEND_URL}/api/contrats/${contrat.id}/pdf`;
    await emailService.sendContratEmail({
      nom: contrat.candidature!.nom,
      prenom: contrat.candidature!.prenom,
      email: contrat.candidature!.email,
      contratRef: contrat.reference,
      typeContrat: contrat.typeContrat,
      poste: contrat.candidature?.offre?.intitule || '',
      dateDebut: contrat.dateDebut,
      salaire: contrat.salaire,
      consultationUrl
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


// CONSULTATION DU CONTRAT PAR L'EMPLOYÉ

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


// MARQUER COMME SIGNÉ (après signature physique)

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

    // FIX : on crée UNIQUEMENT la fiche employé ici (pas un "compte" —
    // l'EMPLOYE n'a pas accès à la plateforme, voir
    // creerFicheEmployeDepuisContrat ci-dessous). La création de
    // l'EvaluationPE reste exclusivement déclenchée par
    // evaluationPEService.verifierContratsEcheance() à J-30.
    try {
      const { employe, ficheCreee } = await creerFicheEmployeDepuisContrat(contrat);
      if (employe && ficheCreee) {
        console.log(`✅ Fiche employé créée: ${employe.email}`);
      }
    } catch (ficheError) {
      console.error(' Erreur lors de la création de la fiche employé:', ficheError);
      // Ne pas bloquer la signature si la création de la fiche échoue —
      // mais alerter, sinon le job J-30 ne trouvera personne à évaluer.
      const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', actif: true } });
      if (superAdmin) {
        await emailService.sendNotificationEmail({
          nom: superAdmin.nom,
          prenom: superAdmin.prenom,
          email: superAdmin.email,
          message: `Le contrat ${contrat.reference} a été signé mais la création automatique de la ` +
            `fiche employé a échoué. Merci de créer le dossier manuellement.`,
          actionUrl: `${process.env.FRONTEND_URL}/contrats/${contrat.id}`
        });
      }
    }

    await emailService.sendContratSigneEmail({
      nom: contrat.candidature!.nom,
      prenom: contrat.candidature!.prenom,
      email: contrat.candidature!.email,
      contratRef: contrat.reference,
      typeContrat: contrat.typeContrat,
      dateDebut: contrat.dateDebut,
      periodeEssaiFin: contrat.dateFin || contrat.dateDebut,
      consultationUrl: `${process.env.BACKEND_URL}/api/contrats/${contrat.id}/pdf`
    });

    sendSuccess(res, updated, 'Contrat signé et dossier employé créé. L\'évaluation de période d\'essai sera générée automatiquement à J-30 de la fin de période d\'essai.');

  } catch (error) {
    console.error('signerContrat error:', error);
    sendError(res, 'Erreur lors de la signature');
  }
};


// Crée (ou retrouve) la FICHE employé (User, role EMPLOYE) correspondant
// au candidat dont le contrat vient d'être signé.
//
// FIX IMPORTANT : un EMPLOYE n'a PAS accès à la plateforme — seuls
// SUPER_ADMIN, MANAGER, DIRECTEUR, DRH, DAF, DGA, DG et RESP_PAIE s'y
// connectent. La version précédente traitait ce User comme un vrai
// "compte" (mot de passe temporaire généré et à transmettre, workflow de
// première connexion) alors que ce rôle ne se connecte jamais. Ce User
// n'existe ici que pour deux raisons strictement internes :
//   1. EvaluationPE.employeId est une FK obligatoire vers User : il faut
//      bien une ligne à référencer pour pouvoir suivre sa période d'essai.
//   2. Les écrans RH (annuaire, fiches employé) affichent ces données
//      (poste, direction, manager...).
// Le champ `password` reste NOT NULL en base (contrainte du schéma), donc
// on y met une valeur aléatoire non communiquée à qui que ce soit — elle
// ne sera jamais utilisée puisqu'aucune connexion EMPLOYE n'est prévue.
// On ne crée PLUS l'EvaluationPE ici (voir note dans signerContrat
// ci-dessus) — c'est désormais le job J-30 qui s'en charge exclusivement,
// via evaluationPEService.verifierContratsEcheance().
async function creerFicheEmployeDepuisContrat(contrat: any): Promise<{ employe: any; ficheCreee: boolean }> {
  const candidature = await prisma.candidature.findUnique({
    where: { id: contrat.candidatureId! },
    include: { offre: { include: { demande: { include: { direction: true } } } } }
  });

  if (!candidature) {
    console.log(` Candidature non trouvée pour contrat ${contrat.reference}`);
    return { employe: null, ficheCreee: false };
  }

  let employe = await prisma.user.findFirst({
    where: { email: candidature.email, role: 'EMPLOYE' }
  });

  if (employe) {
    return { employe, ficheCreee: false };
  }

  const bcrypt = require('bcrypt');
  const valeurPlaceholder = genererValeurPlaceholder();
  const passwordHash = await bcrypt.hash(valeurPlaceholder, 10);

  employe = await prisma.user.create({
    data: {
      email: candidature.email,
      password: passwordHash,
      nom: candidature.nom,
      prenom: candidature.prenom,
      role: 'EMPLOYE',
      poste: contrat.donneesContrat?.poste?.intitule || candidature.offre?.intitule || 'Employé',
      telephone: candidature.telephone,
      directionId: candidature.offre?.demande?.directionId,
      dateArrivee: contrat.dateDebut,
      actif: true,
      // Sans objet pour un rôle qui ne se connecte jamais à la
      // plateforme ; laissé à true par cohérence avec le reste du modèle.
      mustChangePassword: true
    }
  });

  console.log(` Fiche employé créée : ${employe.prenom} ${employe.nom} (${employe.email}) — sans accès plateforme`);

  // On informe le Resp. Paie que le dossier RH a été créé, pour son suivi
  // administratif — mais on ne parle plus d'identifiants de connexion :
  // l'employé n'en a pas et n'en aura jamais besoin.
  const respPaie = await prisma.user.findFirst({ where: { role: 'RESP_PAIE', actif: true } });
  if (respPaie) {
    await emailService.sendNotificationEmail({
      nom: respPaie.nom,
      prenom: respPaie.prenom,
      email: respPaie.email,
      message: `Le dossier employé de ${employe.prenom} ${employe.nom} (${employe.email}) a été créé ` +
        `suite à la signature du contrat ${contrat.reference}. Cet employé n'a pas d'accès à la ` +
        `plateforme ; aucune action de votre part n'est requise à ce sujet.`,
      actionUrl: `${process.env.FRONTEND_URL}/employes/${employe.id}`
    });
  }

  return { employe, ficheCreee: true };
}


// GÉNÉRER ET TÉLÉCHARGER LE PDF

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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.4; color: #000; background: white; padding: 40px; margin: 0; }
    .header { text-align: right; margin-bottom: 30px; }
    .header strong { font-size: 14pt; }
    h1 { text-align: center; font-size: 18pt; text-transform: uppercase; margin: 20px 0; letter-spacing: 2px; }
    h2 { font-size: 14pt; margin: 20px 0 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    td { padding: 8px 12px; border: 1px solid #ccc; vertical-align: top; }
    .bold { font-weight: bold; background-color: #f5f5f5; width: 35%; }
    .notice { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; margin: 20px 0; text-align: center; font-size: 11pt; }
    .signature-block { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-box { width: 45%; text-align: center; }
    .signature-line { margin-top: 50px; border-top: 1px solid #000; padding-top: 5px; }
    .footer { margin-top: 40px; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #eee; padding-top: 15px; }
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
  <strong> Document à titre de consultation</strong><br>
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


// METTRE À JOUR LE STATUT

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

// CRÉER UN AVENANT

export const createAvenant = async (req: Request, res: Response) => {
  try {
    const {
      contratId, typeAvenant, description, dateEffet, nouveauSalaire, nouvelleDateFin,
      nouveauPoste, nouvelleDirectionId, dateResiliation, motifResiliation
    } = req.body;
    const userRole = (req as any).user.role;

    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorisé');
    }

    if (!contratId || !typeAvenant || !description || !dateEffet) {
      return sendError(res, 'Tous les champs requis sont obligatoires', 400);
    }
    if (typeAvenant === 'RUPTURE' && (!dateResiliation || !motifResiliation)) {
      return sendError(res, 'Date et motif de résiliation obligatoires pour une rupture', 400);
    }

    const contrat = await prisma.contrat.findUnique({
      where: { id: contratId },
      include: { candidature: true }
    });
    if (!contrat) return sendNotFound(res, 'Contrat non trouvé');
    if (!contrat.candidature) {
      console.warn(`Avenant créé pour le contrat ${contrat.reference} sans candidature associée — email non envoyé.`);
    }

    // FIX : pour appliquer un changement de poste/direction, il faut la
    // fiche employé (User, role EMPLOYE) créée à la signature — retrouvée
    // par email, comme dans creerFicheEmployeDepuisContrat.
    let employeId: string | undefined;
    if (contrat.candidature?.email) {
      const employe = await prisma.user.findFirst({
        where: { email: contrat.candidature.email, role: 'EMPLOYE' }
      });
      employeId = employe?.id;
      if (!employeId && (nouveauPoste || nouvelleDirectionId)) {
        return sendError(res, 'Aucune fiche employé trouvée pour appliquer ce changement de poste/direction', 400);
      }
    }

    const avenant = await avenantService.appliquerAvenant({
      contratId,
      employeId,
      typeAvenant,
      description,
      dateEffet: new Date(dateEffet),
      nouveauSalaire: nouveauSalaire || null,
      nouvelleDateFin: nouvelleDateFin ? new Date(nouvelleDateFin) : null,
      nouveauPoste: nouveauPoste || null,
      nouvelleDirectionId: nouvelleDirectionId || null,
      dateResiliation: dateResiliation ? new Date(dateResiliation) : null,
      motifResiliation: motifResiliation || null
    });

    if (contrat.candidature) {
      await emailService.sendAvenantEmail({
        nom: contrat.candidature.nom,
        prenom: contrat.candidature.prenom,
        email: contrat.candidature.email,
        contratRef: contrat.reference,
        typeAvenant,
        description,
        nouveauSalaire: nouveauSalaire || undefined,
        nouvelleDateFin: nouvelleDateFin ? new Date(nouvelleDateFin) : undefined,
        consultationUrl: `${process.env.BACKEND_URL}/api/contrats/avenants/${avenant.id}/pdf`
      });
    }

    sendCreated(res, avenant, 'Avenant créé avec succès, employé notifié par email');
  } catch (error) {
    console.error('createAvenant error:', error);
    sendError(res, 'Erreur lors de la création de l\'avenant');
  }
};
// RÉCUPÉRER LES AVENANTS

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
// GÉNÉRER ET TÉLÉCHARGER LE PDF D'UN AVENANT
//
// Même logique que telechargerPDF (contrat) : document public consultable
// sans authentification (comme le contrat, le candidat/employé n'a pas de
// compte plateforme). Le PDF reflète les conditions APRES application de
// l'avenant, puisque avenantService.appliquerAvenant a déjà mis à jour le
// Contrat (et éventuellement le User) au moment de la création de
// l'avenant.

export const telechargerAvenantPDF = async (req: Request, res: Response) => {
  try {
    const { avenantId } = req.params;

    const avenant = await prisma.avenant.findUnique({ where: { id: avenantId } });
    if (!avenant) return res.status(404).json({ message: 'Avenant non trouvé' });

    const contrat = await prisma.contrat.findUnique({
      where: { id: avenant.contratId },
      include: {
        candidature: {
          include: {
            offre: { include: { demande: { include: { direction: true } } } }
          }
        }
      }
    });
    if (!contrat) return res.status(404).json({ message: 'Contrat non trouvé' });

    const donnees = (contrat.donneesContrat as any) || {};
    const candidat = donnees.candidat || {};
    const poste = donnees.poste || {};
    const employeur = donnees.employeur || {};

    const nomFinal = candidat.nom || contrat.candidature?.nom || '';
    const prenomFinal = candidat.prenom || contrat.candidature?.prenom || '';
    const employeurNomFinal = employeur.nom || 'KILANI GROUPE';
    const employeurRepFinal = employeur.representant || 'M. Karim Kilani, Directeur Général';
    const posteFinal = poste.intitule || contrat.candidature?.offre?.intitule || 'Employé';
    const directionFinal = poste.direction || contrat.candidature?.offre?.demande?.direction?.nom || 'Non spécifié';

    const typeLabels: Record<string, string> = {
      CONFIRMATION_PE: 'Confirmation de période d\'essai',
      PROLONGATION_PE: 'Prolongation de période d\'essai',
      CHANGEMENT_SITUATION: 'Changement de situation',
      CHANGEMENT_POSTE: 'Changement de poste',
      AUGMENTATION_SALAIRE: 'Augmentation de salaire',
      RUPTURE: 'Rupture',
      AUTRE: 'Modification contractuelle'
    };
    const typeLabel = typeLabels[avenant.typeAvenant] || avenant.typeAvenant;

    const statutLabels: Record<string, string> = {
      BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', ACTIF: 'Actif',
      RESILIE: 'Résilié', TERMINE: 'Terminé'
    };

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Avenant au contrat ${contrat.reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.4; color: #000; background: white; padding: 40px; margin: 0; }
    .header { text-align: right; margin-bottom: 30px; }
    .header strong { font-size: 14pt; }
    h1 { text-align: center; font-size: 18pt; text-transform: uppercase; margin: 20px 0; letter-spacing: 2px; }
    h2 { font-size: 14pt; margin: 20px 0 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    td { padding: 8px 12px; border: 1px solid #ccc; vertical-align: top; }
    .bold { font-weight: bold; background-color: #f5f5f5; width: 35%; }
    .notice { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; margin: 20px 0; text-align: center; font-size: 11pt; }
    .desc-box { margin: 15px 0; padding: 12px; background: #f5f5f5; border-left: 4px solid #2b6cb0; }
    .signature-block { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-box { width: 45%; text-align: center; }
    .signature-line { margin-top: 50px; border-top: 1px solid #000; padding-top: 5px; }
    .footer { margin-top: 40px; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #eee; padding-top: 15px; }
  </style>
</head>
<body>

<div class="header">
  <strong>KILANI GROUPE</strong><br>
  ${directionFinal}<br>
  Tunis, le ${new Date().toLocaleDateString('fr-FR')}
</div>

<h1>AVENANT AU CONTRAT DE TRAVAIL</h1>

<p style="text-align:center; margin-bottom:20px;">
  <strong>Contrat de référence :</strong> ${contrat.reference} &nbsp;|&nbsp;
  <strong>Type d'avenant :</strong> ${typeLabel} &nbsp;|&nbsp;
  <strong>Date d'effet :</strong> ${new Date(avenant.date).toLocaleDateString('fr-FR')}
</p>

<h2>ARTICLE 1 - PARTIES CONCERNÉES</h2>
<table>
  <tr><td class="bold">Employeur</td><td>${employeurNomFinal}</td></tr>
  <tr><td class="bold">Représentant légal</td><td>${employeurRepFinal}</td></tr>
  <tr><td class="bold">Salarié(e)</td><td>${prenomFinal} ${nomFinal}</td></tr>
</table>

<h2>ARTICLE 2 - OBJET DE L'AVENANT</h2>
<div class="desc-box">${avenant.description}</div>

<h2>ARTICLE 3 - CONDITIONS APRÈS MODIFICATION</h2>
<table>
  <tr><td class="bold">Poste occupé</td><td>${posteFinal}</td></tr>
  <tr><td class="bold">Direction / Service</td><td>${directionFinal}</td></tr>
  <tr><td class="bold">Salaire brut mensuel</td><td><strong>${contrat.salaire}</strong></td></tr>
  <tr><td class="bold">Statut du contrat</td><td>${statutLabels[contrat.statut] || contrat.statut}</td></tr>
  <tr><td class="bold">Date de fin de période d'essai / contrat</td><td>${contrat.dateFin ? new Date(contrat.dateFin).toLocaleDateString('fr-FR') : 'Non définie'}</td></tr>
</table>

${contrat.statut === 'RESILIE' ? `
<div class="notice" style="background:#fde8e8;border-color:#f44336;">
  <strong>Contrat résilié</strong><br>
  Ce contrat a été résilié à compter du ${contrat.dateFin ? new Date(contrat.dateFin).toLocaleDateString('fr-FR') : '-'}.
</div>
` : `
<div class="notice">
  <strong>Toutes les autres clauses du contrat initial demeurent inchangées.</strong>
</div>
`}

<div class="signature-block">
  <div class="signature-box">
    <div class="signature-line"></div>
    <p><strong>L'Employeur</strong><br>${employeurRepFinal}</p>
  </div>
  <div class="signature-box">
    <div class="signature-line"></div>
    <p><strong>Le(La) Salarié(e)</strong><br>${prenomFinal} ${nomFinal}</p>
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
    res.setHeader('Content-Disposition', `inline; filename="avenant_${avenant.typeAvenant}_${contrat.reference}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('telechargerAvenantPDF error:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  }
};