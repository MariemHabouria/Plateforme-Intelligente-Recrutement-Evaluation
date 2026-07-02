// backend/src/controllers/evaluationPEController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError, sendNotFound, sendForbidden } from '../utils/helpers';
import { emailService } from '../services/email.service';
import { evaluationPEService } from '../services/evaluationPE.service';

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
    const evaluations = await prisma.evaluationPE.findMany({
      where: {},
      include: {
        employe: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            poste: true,
            directionId: true,
            direction: true
          }
        },
        manager: {
          select: { id: true, nom: true, prenom: true, email: true, role: true, directionId: true }
        },
        contrat: true,
        validations: {
          include: {
            acteur: {
              select: { id: true, nom: true, prenom: true, role: true, directionId: true }
            }
          },
          orderBy: { niveauEtape: 'asc' }
        }
      },
      orderBy: { joursRestants: 'asc' },
    });

    sendSuccess(res, { evaluations });
  } catch (error) {
    console.error('getEvaluations error:', error);
    sendError(res, 'Erreur lors de la recuperation des evaluations');
  }
};

export const getEvaluationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

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

    const peutVoirN1 = userRole === 'MANAGER' || userRole === 'DIRECTEUR';
    sendSuccess(res, { evaluation, peutVoirN1, evaluationN1: peutVoirN1 ? evaluation.evaluationN1 : null });
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

    const updated = await prisma.evaluationPE.update({
      where: { id },
      data: {
        statut: 'EN_VALIDATION_DIR',
        etapeActuelle: 1,
        managerId: manager?.id || evaluation.managerId
      }
    });

    if (manager) {
      await emailService.sendEvaluationNotification({
        nom: manager.nom,
        prenom: manager.prenom,
        email: manager.email,
        evaluationRef: evaluation.reference,
        employeNom: evaluation.employe?.prenom || '',
        employePrenom: evaluation.employe?.nom || '',
        joursRestants: evaluation.joursRestants,
        actionUrl: `${process.env.FRONTEND_URL}/evaluations/${id}`
      });
    }

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

    //  Vérification statut + étape combinés pour distinguer l'état manager de l'état directeur
    if (evaluation.statut !== 'EN_VALIDATION_DIR' || evaluation.etapeActuelle !== 1) {
      return sendError(res, 'L evaluation n est pas a l etape Manager', 400);
    }
    if (!evaluationN1 || !commentaireN1) return sendError(res, 'L evaluation et le commentaire sont obligatoires', 400);

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
        etapeActuelle: 2   //  On passe à l'étape directeur
      }
    });

    const directeur = await prisma.user.findFirst({
      where: {
        role: 'DIRECTEUR',
        directionId: evaluation.employe?.directionId ?? 'INVALID',
        actif: true
      }
    });

    if (directeur) {
      await emailService.sendEvaluationValidationNotification({
        nom: directeur.nom,
        prenom: directeur.prenom,
        email: directeur.email,
        evaluationRef: evaluation.reference,
        employeNom: evaluation.employe?.prenom || '',
        employePrenom: evaluation.employe?.nom || '',
        etape: 2,
        totalEtapes: 3,
        role: 'DIRECTEUR',
        dateLimite: new Date(),
        actionUrl: `${process.env.FRONTEND_URL}/evaluations/${id}`
      });
    }

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

    //  Vérification statut + étape combinés pour n'accepter que l'état directeur
    if (evaluation.statut !== 'EN_VALIDATION_DIR' || evaluation.etapeActuelle !== 2) {
      return sendError(res, 'L evaluation n est pas a l etape Directeur', 400);
    }

    if (decision === 'REJETEE') {
      //  etapeActuelle et valideeAt mis à jour même en cas de rejet
      await prisma.evaluationPE.update({
        where: { id },
        data: { statut: 'REJETEE', etapeActuelle: 3, valideeAt: new Date() }
      });
      return sendSuccess(res, null, 'Evaluation rejetee');
    }

    //  commentaireN2 correctement sauvegardé
    await prisma.evaluationPE.update({
      where: { id },
      data: {
        evaluationN2: evaluationN2 || evaluation.evaluationN1,
        commentaireN2: commentaire || null,
        statut: 'VALIDEE',
        etapeActuelle: 3,
        valideeAt: new Date()
      }
    });

    await prisma.contrat.update({
      where: { id: evaluation.contratId },
      data: { statut: 'CONFIRME' }
    });

    sendSuccess(res, null, 'Evaluation finalisee avec succes');
  } catch (error) {
    console.error('validerEvaluationN2 error:', error);
    sendError(res, 'Erreur lors de la validation');
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