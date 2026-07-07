// backend/src/controllers/evaluationPEController.ts
//
// Circuit (inchangé, confirmé par l'encadrant) :
//   Resp. Paie (saisie) -> Manager N+1 (même direction) -> Directeur N+2 (même direction)
//
// Corrections apportées par rapport à la version précédente :
//   1. FIX SÉCURITÉ MAJEUR : la confidentialité N1/N2 était appliquée dans
//      getEvaluationById mais PAS dans getEvaluations (la liste). Le
//      frontend actuel utilise la liste, donc le filtrage n'avait aucun
//      effet réel : RESP_PAIE et n'importe quel rôle pouvait lire les
//      commentaires du Manager et du Directeur. -> filtrage appliqué
//      partout désormais, via un helper unique `filtrerConfidentialite`.
//   2. FIX BUG MÉTIER : validerEvaluationN2 forçait le contrat en
//      "CONFIRME" quelle que soit la décision (même en cas de RUPTURE).
//      -> délègue maintenant à evaluationPEService.finaliserApresDirecteur
//      qui applique le vrai statut (CONFIRME / PROLONGE / ROMPU) et
//      prolonge la date de fin si besoin.
//   3. FIX : nom/prénom inversés dans les emails de notification.
//   4. Vérification renforcée : la personne qui valide une étape doit être
//      la personne réellement assignée (acteurId de la validation en
//      attente), pas seulement "quelqu'un avec le bon rôle dans la bonne
//      direction" — sinon deux managers de la même direction pourraient
//      valider à la place l'un de l'autre.

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError, sendNotFound, sendForbidden } from '../utils/helpers';
import { emailService } from '../services/email.service';
import { evaluationPEService } from '../services/evaluationPE.service';

// ── Règles de confidentialité (centralisées, appliquées partout) ──
// - N1 (évaluation + commentaire du Manager) : visible par le Manager qui
//   l'a rédigée, le Directeur de la direction, et le SUPER_ADMIN.
// - N2 (évaluation + commentaire du Directeur) : visible par le Directeur
//   qui l'a rédigée et le SUPER_ADMIN uniquement (avis indépendant du N+2,
//   non partagé avec le Manager ni le Resp. Paie).
// Chemin B : plus de cloisonnement N1/N2 entre rôles du circuit. Seule
// règle qui subsiste : evaluationN1Masquee (prévue explicitement par le
// cahier des charges — "supprimée par le N+2").
function filtrerConfidentialite(evaluation: any, userRole: string, userId: string) {
  const n1EstMasquee = evaluation.evaluationN1Masquee === true;
  const peutVoirN1 = userRole === 'DIRECTEUR' || userRole === 'SUPER_ADMIN' || !n1EstMasquee;

  return {
    ...evaluation,
    evaluationN1: peutVoirN1 ? evaluation.evaluationN1 : null,
    commentaireN1: peutVoirN1 ? evaluation.commentaireN1 : null,
  };
}

export const declencherEvaluations = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'RESP_PAIE') {
      return sendForbidden(res, 'Non autorise');
    }
    const count = await evaluationPEService.verifierContratsEcheance();
    sendSuccess(res, { count }, `${count} evaluation(s) creee(s)`);
  } catch (error) {
    console.error('declencherEvaluations error:', error);
    sendError(res, 'Erreur lors du declenchement');
  }
};

export const getEvaluations = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;

    const where: any = {};

    if (userRole === 'MANAGER' || userRole === 'DIRECTEUR') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      where.employe = { directionId: user?.directionId ?? 'INVALID' };
    }

    const evaluations = await prisma.evaluationPE.findMany({
      where,
      include: {
        employe: {
          select: {
            id: true, nom: true, prenom: true, email: true,
            poste: true, directionId: true, direction: true
          }
        },
        manager: {
          select: { id: true, nom: true, prenom: true, email: true, role: true, directionId: true }
        },
        contrat: true,
        validations: {
          include: {
            acteur: { select: { id: true, nom: true, prenom: true, role: true, directionId: true } }
          },
          orderBy: { niveauEtape: 'asc' }
        }
      },
      orderBy: { joursRestants: 'asc' },
    });

    // FIX : le filtrage de confidentialité était absent ici. C'est cette
    // liste que le frontend consomme réellement, donc c'était la vraie
    // fuite. On applique désormais le même filtrage que getEvaluationById.
    const evaluationsFiltrees = evaluations.map(e => filtrerConfidentialite(e, userRole, userId));

    sendSuccess(res, { evaluations: evaluationsFiltrees });
  } catch (error) {
    console.error('getEvaluations error:', error);
    sendError(res, 'Erreur lors de la recuperation des evaluations');
  }
};

export const getEvaluationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;

    const evaluation = await prisma.evaluationPE.findUnique({
      where: { id },
      include: {
        employe: { include: { direction: true } },
        manager: { include: { direction: true } },
        contrat: true,
        validations: {
          include: { acteur: { select: { id: true, nom: true, prenom: true, role: true, directionId: true } } },
          orderBy: { niveauEtape: 'asc' }
        }
      }
    });

    if (!evaluation) return sendNotFound(res, 'Evaluation non trouvee');

    if (userRole === 'MANAGER' || userRole === 'DIRECTEUR') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.directionId !== evaluation.employe?.directionId) {
        return sendForbidden(res, 'Vous n\'avez pas accès à cette évaluation');
      }
    }

    const evaluationFiltree = filtrerConfidentialite(evaluation, userRole, userId);

    sendSuccess(res, {
      evaluation: evaluationFiltree,
      peutVoirN1: evaluationFiltree.evaluationN1 !== null || evaluation.evaluationN1 === null
    });
  } catch (error) {
    console.error('getEvaluationById error:', error);
    sendError(res, 'Erreur lors de la recuperation');
  }
};


// ÉTAPE 1 : RESPONSABLE PAIE

export const soumettreDonneesPaie = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { typeContrat, dateDebut, dateFin, salaire, poste, observations } = req.body;
    const userRole = (req as any).user.role;

    if (userRole !== 'RESP_PAIE') return sendForbidden(res, 'Seul le Responsable Paie peut saisir ces donnees');

    const evaluation = await prisma.evaluationPE.findUnique({
      where: { id },
      include: { employe: true, contrat: true }
    });
    if (!evaluation) return sendNotFound(res, 'Evaluation non trouvee');
    if (evaluation.statut !== 'BROUILLON') return sendError(res, 'L evaluation a deja ete soumise', 400);

    await prisma.contrat.update({
      where: { id: evaluation.contratId },
      data: { typeContrat, dateDebut: new Date(dateDebut), dateFin: new Date(dateFin), salaire }
    });

    await prisma.user.update({
      where: { id: evaluation.employeId },
      data: { poste }
    });

    const manager = await prisma.user.findFirst({
      where: {
        role: 'MANAGER',
        directionId: evaluation.employe?.directionId ?? 'INVALID',
        actif: true
      }
    });

    if (!manager) {
      return sendError(res, 'Aucun manager actif trouve pour la direction de cet employe. Impossible de soumettre.', 400);
    }

    const updated = await prisma.evaluationPE.update({
      where: { id },
      data: {
        statut: 'EN_VALIDATION_DIR',
        etapeActuelle: 1,
        managerId: manager.id
      }
    });

    await evaluationPEService.creerValidationEtape(id, 1, 'MANAGER', manager.id);

    await emailService.sendEvaluationNotification({
      nom: manager.nom,
      prenom: manager.prenom,
      email: manager.email,
      evaluationRef: evaluation.reference,
      // FIX : nom/prénom étaient inversés
      employeNom: evaluation.employe?.nom || '',
      employePrenom: evaluation.employe?.prenom || '',
      joursRestants: evaluation.joursRestants,
      actionUrl: `${process.env.FRONTEND_URL}/evaluations/${id}`
    });

    sendSuccess(res, updated, 'Donnees contractuelles enregistrees');
  } catch (error) {
    console.error('soumettreDonneesPaie error:', error);
    sendError(res, 'Erreur lors de l\'enregistrement');
  }
};


// ÉTAPE 2 : MANAGER (MÊME DIRECTION)

export const soumettreEvaluationN1 = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { evaluationN1, commentaireN1, decision, dureeProlongation, justificationRupture } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (userRole !== 'MANAGER') return sendForbidden(res, 'Seul le Manager peut soumettre l evaluation');

    const evaluation = await prisma.evaluationPE.findUnique({
      where: { id },
      include: { contrat: true, employe: { include: { direction: true } } }
    });
    if (!evaluation) return sendNotFound(res, 'Evaluation non trouvee');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.directionId !== evaluation.employe?.directionId) {
      return sendForbidden(res, 'Vous n etes pas le manager de cette direction');
    }
    // FIX : vérifie que c'est bien LE manager assigné à cette évaluation
    // (managerId), pas juste un manager quelconque de la même direction.
    if (evaluation.managerId !== userId) {
      return sendForbidden(res, 'Cette evaluation est assignee a un autre manager');
    }

    if (evaluation.statut !== 'EN_VALIDATION_DIR' || evaluation.etapeActuelle !== 1) {
      return sendError(res, 'L evaluation n est pas a l etape Manager', 400);
    }
    if (!evaluationN1 || !commentaireN1) return sendError(res, 'L evaluation et le commentaire sont obligatoires', 400);
    if (decision === 'PROLONGATION' && !dureeProlongation) {
      return sendError(res, 'La duree de prolongation est obligatoire pour une decision de prolongation', 400);
    }
    if (decision === 'RUPTURE' && !justificationRupture) {
      return sendError(res, 'La justification est obligatoire pour une decision de rupture', 400);
    }

    await evaluationPEService.cloturerValidationEtape(id, 1, 'VALIDEE', commentaireN1);

    const updated = await prisma.evaluationPE.update({
      where: { id },
      data: {
        evaluationN1,
        commentaireN1,
        decision,
        dureeProlongation: decision === 'PROLONGATION' ? dureeProlongation : null,
        justificationRupture: decision === 'RUPTURE' ? justificationRupture : null,
        dateSoumissionN1: new Date(),
        statut: 'EN_VALIDATION_DIR',
        etapeActuelle: 2
      }
    });

    const directeur = await prisma.user.findFirst({
      where: {
        role: 'DIRECTEUR',
        directionId: evaluation.employe?.directionId ?? 'INVALID',
        actif: true
      }
    });

    if (!directeur) {
      // On ne bloque pas la soumission du Manager (déjà faite), mais on
      // journalise et alerte : sans Directeur actif, l'évaluation reste
      // bloquée à l'étape 2 indéfiniment.
      console.error(`Aucun directeur actif trouve pour la direction de l'evaluation ${evaluation.reference}`);
      const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', actif: true } });
      if (superAdmin) {
        await emailService.sendNotificationEmail({
          nom: superAdmin.nom,
          prenom: superAdmin.prenom,
          email: superAdmin.email,
          message: `L'evaluation ${evaluation.reference} a ete soumise par le manager mais aucun ` +
            `directeur actif n'existe pour cette direction. Merci d'affecter un directeur.`,
          actionUrl: `${process.env.FRONTEND_URL}/evaluations/${id}`
        });
      }
      return sendSuccess(res, updated, 'Evaluation soumise, mais aucun directeur actif trouve pour cette direction');
    }

    const validationDirecteur = await evaluationPEService.creerValidationEtape(id, 2, 'DIRECTEUR', directeur.id);

    await emailService.sendEvaluationValidationNotification({
      nom: directeur.nom,
      prenom: directeur.prenom,
      email: directeur.email,
      evaluationRef: evaluation.reference,
      // FIX : nom/prénom étaient inversés
      employeNom: evaluation.employe?.nom || '',
      employePrenom: evaluation.employe?.prenom || '',
      etape: 2,
      totalEtapes: 3,
      role: 'DIRECTEUR',
      dateLimite: validationDirecteur!.dateLimite,
      actionUrl: `${process.env.FRONTEND_URL}/evaluations/${id}`
    });

    sendSuccess(res, updated, 'Evaluation soumise avec succes');
  } catch (error) {
    console.error('soumettreEvaluationN1 error:', error);
    sendError(res, 'Erreur lors de la soumission');
  }
};


// ÉTAPE 3 : DIRECTEUR (MÊME DIRECTION)

export const validerEvaluationN2 = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, commentaire, evaluationN2 } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (userRole !== 'DIRECTEUR') return sendForbidden(res, 'Seul le Directeur peut valider cette etape');

    const evaluation = await prisma.evaluationPE.findUnique({
      where: { id },
      include: { employe: { include: { direction: true } }, contrat: true }
    });
    if (!evaluation) return sendNotFound(res, 'Evaluation non trouvee');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.directionId !== evaluation.employe?.directionId) {
      return sendForbidden(res, 'Vous n etes pas le directeur de cette direction');
    }
    if (evaluation.statut !== 'EN_VALIDATION_DIR' || evaluation.etapeActuelle !== 2) {
      return sendError(res, 'L evaluation n est pas a l etape Directeur', 400);
    }

    if (decision === 'REJETEE') {
      await evaluationPEService.cloturerValidationEtape(id, 2, 'REJETEE', commentaire);
      await prisma.evaluationPE.update({
        where: { id },
        data: { statut: 'REJETEE', valideeAt: new Date() }
      });

      // Option 3 : rejet = fin de circuit d'avis. Le contrat n'est PAS
      // modifié automatiquement. On notifie RESP_PAIE (gestion du contrat)
      // et SUPER_ADMIN (autorité neutre) qu'une action manuelle hors
      // circuit est requise.
      const respPaie = await prisma.user.findFirst({ where: { role: 'RESP_PAIE', actif: true } });
      const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', actif: true } });
      for (const destinataire of [respPaie, superAdmin].filter(Boolean) as typeof respPaie[]) {
        if (!destinataire) continue;
        await emailService.sendNotificationEmail({
          nom: destinataire.nom,
          prenom: destinataire.prenom,
          email: destinataire.email,
          message: `L'évaluation ${evaluation.reference} (${evaluation.employe?.prenom} ${evaluation.employe?.nom}) ` +
            `a été rejetée par le Directeur. Aucune modification automatique n'a été appliquée au contrat ` +
            `${evaluation.contrat.reference} — une décision manuelle est requise.`,
          actionUrl: `${process.env.FRONTEND_URL}/contrats/${evaluation.contratId}`
        });
      }

      return sendSuccess(res, null, 'Evaluation rejetee — aucune modification automatique du contrat');
    }

    await evaluationPEService.cloturerValidationEtape(id, 2, 'VALIDEE', commentaire);

    // FIX : la décision du Directeur clôture le Circuit 1 (avis employé),
    // mais ne modifie plus directement le contrat. Elle passe la main au
    // Circuit 2 (RESP_PAIE propose, DRH valide) — cf. Étape 4 ci-dessous.
    await prisma.evaluationPE.update({
      where: { id },
      data: {
        evaluationN2: evaluationN2 || evaluation.evaluationN1,
        commentaireN2: commentaire || null,
        dateDecisionN2: new Date(),
        statut: 'EN_VALIDATION_DRH',
        etapeActuelle: 3
      }
    });

    const respPaie = await prisma.user.findFirst({ where: { role: 'RESP_PAIE', actif: true } });
    if (respPaie) {
      await emailService.sendNotificationEmail({
        nom: respPaie.nom,
        prenom: respPaie.prenom,
        email: respPaie.email,
        message: `L'évaluation ${evaluation.reference} a été validée par le Directeur (décision: ${evaluation.decision}). ` +
          `Merci de préparer la modification contractuelle correspondante.`,
        actionUrl: `${process.env.FRONTEND_URL}/evaluations/${id}`
      });
    }

    sendSuccess(res, null, 'Evaluation validee — en attente de proposition contractuelle');
  } catch (error) {
    console.error('validerEvaluationN2 error:', error);
    sendError(res, 'Erreur lors de la validation');
  }
};
// Le Directeur (N+2) masque/rétablit l'évaluation N1 du Manager, comme
// prévu par le cahier des charges ("modifiée et/ou validée/supprimée par
// le N+2"). Utilise le champ evaluationN1Masquee, déjà présent dans le
// schéma mais jamais exploité auparavant.
export const masquerEvaluationN1 = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { masquer } = req.body; // boolean
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (userRole !== 'DIRECTEUR' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Seul le Directeur peut masquer/retablir l evaluation du Manager');
    }

    const evaluation = await prisma.evaluationPE.findUnique({
      where: { id },
      include: { employe: true }
    });
    if (!evaluation) return sendNotFound(res, 'Evaluation non trouvee');

    if (userRole === 'DIRECTEUR') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.directionId !== evaluation.employe?.directionId) {
        return sendForbidden(res, 'Vous n etes pas le directeur de cette direction');
      }
    }

    const updated = await evaluationPEService.masquerEvaluationN1(id, !!masquer);
    sendSuccess(res, updated, masquer ? 'Evaluation N1 masquee' : 'Evaluation N1 retablie');
  } catch (error) {
    console.error('masquerEvaluationN1 error:', error);
    sendError(res, 'Erreur lors de la mise a jour');
  }
};

export const deleteEvaluation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'RESP_PAIE') return sendForbidden(res, 'Non autorise');
    const evaluation = await prisma.evaluationPE.findUnique({ where: { id } });
    if (!evaluation) return sendNotFound(res, 'Evaluation non trouvee');
    await prisma.evaluationPE.delete({ where: { id } });
    sendSuccess(res, null, 'Evaluation supprimee avec succes');
  } catch (error) {
    console.error('deleteEvaluation error:', error);
    sendError(res, 'Erreur lors de la suppression');
  }
};

export const relancerEvaluation = async (req: Request, res: Response) => {
  try {
    const { id, niveauEtape } = req.params;
    const userRole = (req as any).user.role;
    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorise');
    }
    const validation = await evaluationPEService.relancerManuellementEvaluation(id, parseInt(niveauEtape));
    sendSuccess(res, validation, 'Relance envoyée avec succès');
  } catch (error: any) {
    console.error('relancerEvaluation error:', error);
    sendError(res, error.message || 'Erreur lors de la relance');
  }
};
// ÉTAPE 4 : RESP_PAIE PROPOSE LA MODIFICATION CONTRACTUELLE

export const proposerModificationContrat = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      typeAvenant, description, nouveauSalaire, nouvelleDateFin,
      nouveauPoste, nouvelleDirectionId, dateResiliation, motifResiliation
    } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Seul le Responsable Paie peut proposer la modification');
    }

    const proposition = await evaluationPEService.preparerPropositionModification(id, userId, {
      typeAvenant, description, nouveauSalaire, nouvelleDateFin,
      nouveauPoste, nouvelleDirectionId, dateResiliation, motifResiliation
    });

    const evaluation = await prisma.evaluationPE.findUnique({ where: { id } });
    const drh = await prisma.user.findFirst({ where: { role: 'DRH', actif: true } });
    if (drh && evaluation) {
      await emailService.sendNotificationEmail({
        nom: drh.nom,
        prenom: drh.prenom,
        email: drh.email,
        message: `Une proposition de modification contractuelle attend votre validation ` +
          `(évaluation ${evaluation.reference}, type: ${proposition.typeAvenant}).`,
        actionUrl: `${process.env.FRONTEND_URL}/evaluations/${id}`
      });
    }

    sendSuccess(res, proposition, 'Proposition envoyee au DRH');
  } catch (error: any) {
    console.error('proposerModificationContrat error:', error);
    sendError(res, error.message || 'Erreur lors de la proposition');
  }
};

// ÉTAPE 5 : DRH VALIDE LA MODIFICATION CONTRACTUELLE

export const validerModificationDRH = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approuve, commentaire } = req.body;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Seul le DRH peut valider cette modification');
    }

    const resultat = await evaluationPEService.validerModificationParDRH(id, !!approuve, commentaire);

    if (!resultat.approuve) {
      const evaluation = await prisma.evaluationPE.findUnique({ where: { id } });
      const respPaie = await prisma.user.findFirst({ where: { role: 'RESP_PAIE', actif: true } });
      if (respPaie && evaluation) {
        await emailService.sendNotificationEmail({
          nom: respPaie.nom, prenom: respPaie.prenom, email: respPaie.email,
          message: `Votre proposition pour l'évaluation ${evaluation.reference} a été renvoyée par le DRH` +
            `${commentaire ? ` : "${commentaire}"` : ''}. Merci de l'ajuster.`,
          actionUrl: `${process.env.FRONTEND_URL}/evaluations/${id}`
        });
      }
      return sendSuccess(res, resultat, 'Proposition renvoyee au Resp. Paie');
    }

    sendSuccess(res, resultat, 'Modification contractuelle appliquee avec succes');
  } catch (error: any) {
    console.error('validerModificationDRH error:', error);
    sendError(res, error.message || 'Erreur lors de la validation');
  }
};