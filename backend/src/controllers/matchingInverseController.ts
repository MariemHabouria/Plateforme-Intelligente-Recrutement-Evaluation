// backend/src/controllers/matchingInverseController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError, sendNotFound } from '../utils/helpers';
import { matchingInverseService } from '../services/matchingInverse.service';

/**
 * Execute le matching inverse pour une offre specifique
 * POST /api/matching-inverse/:offreId
 */
export const executerMatchingInverse = async (req: Request, res: Response) => {
  try {
    const { offreId } = req.params;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Non autorise', 403);
    }

    const offre = await prisma.offreEmploi.findUnique({
      where: { id: offreId },
      include: {
        demande: {
          include: { direction: true }
        }
      }
    });

    if (!offre) {
      return sendError(res, 'Offre non trouvee', 404);
    }

    const candidatures = await prisma.candidature.findMany({
      where: {
        consentementIA: true,
        offreId: null,
        statut: { notIn: ['ACCEPTEE'] }
      },
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

    if (candidatures.length === 0) {
      return sendSuccess(res, { 
        matching: [],
        message: 'Aucun candidat passif disponible pour le matching inverse'
      });
    }

    const matchingResults = await matchingInverseService.executerMatchingInverse(
      {
        id: offre.id,
        intitule: offre.intitule,
        description: offre.description || '',
        profilRecherche: offre.profilRecherche || '',
        competences: offre.competences || [],
        typeContrat: offre.typeContrat,
        demande: offre.demande ? {
          niveau: offre.demande.niveau,
          direction: offre.demande.direction
        } : undefined
      },
      candidatures.map(c => ({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        email: c.email,
        cvTexte: c.cvTexte || '',
        competencesDetectees: c.competencesDetectees,
        scoreExp: c.scoreExp || 0,
        statut: c.statut,
        consentementRGPD: c.consentementRGPD,  // ✅ AJOUTER
        consentementIA: c.consentementIA,
        offre: c.offre ? {
          demande: c.offre.demande ? {
            direction: c.offre.demande.direction
          } : undefined
        } : undefined
      }))
    );

    sendSuccess(res, {
      offre: {
        id: offre.id,
        reference: offre.reference,
        intitule: offre.intitule
      },
      matching: matchingResults,
      total: matchingResults.length,
      seuil: 60
    });

  } catch (error) {
    console.error('executerMatchingInverse error:', error);
    sendError(res, 'Erreur lors du matching inverse');
  }
};

/**
 * Cree automatiquement des candidatures pour les resultats de matching
 * POST /api/matching-inverse/:offreId/creer
 */
export const creerCandidaturesMatching = async (req: Request, res: Response) => {
  try {
    const { offreId } = req.params;
    const { candidatureIds } = req.body;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Non autorise', 403);
    }

    if (!candidatureIds || !Array.isArray(candidatureIds) || candidatureIds.length === 0) {
      return sendError(res, 'Aucune candidature selectionnee', 400);
    }

    const offre = await prisma.offreEmploi.findUnique({
      where: { id: offreId }
    });

    if (!offre) {
      return sendError(res, 'Offre non trouvee', 404);
    }

    const createdCandidatures = [];

    for (const candidatureId of candidatureIds) {
      const ancienneCandidature = await prisma.candidature.findUnique({
        where: { id: candidatureId }
      });

      if (!ancienneCandidature) continue;

      const existeDeja = await prisma.candidature.findFirst({
        where: {
          email: ancienneCandidature.email,
          offreId: offreId
        }
      });

      if (existeDeja) continue;

      const year = new Date().getFullYear();
      const count = await prisma.candidature.count({
        where: { reference: { startsWith: `CAND-${year}` } }
      });
      const reference = `CAND-${year}-${String(count + 1).padStart(4, '0')}`;

      const nouvelleCandidature = await prisma.candidature.create({
        data: {
          reference,
          nom: ancienneCandidature.nom,
          prenom: ancienneCandidature.prenom,
          email: ancienneCandidature.email,
          telephone: ancienneCandidature.telephone,
          cvUrl: ancienneCandidature.cvUrl,
          cvTexte: ancienneCandidature.cvTexte,
          scoreGlobal: ancienneCandidature.scoreGlobal,
          scoreExp: ancienneCandidature.scoreExp,
          competencesDetectees: ancienneCandidature.competencesDetectees,
          competencesManquantes: ancienneCandidature.competencesManquantes,
          statut: 'NOUVELLE',
          consentementRGPD: ancienneCandidature.consentementRGPD,
          consentementIA: ancienneCandidature.consentementIA,
          offreId: offreId
        }
      });

      createdCandidatures.push(nouvelleCandidature);
    }

    sendSuccess(res, {
      count: createdCandidatures.length,
      candidatures: createdCandidatures
    }, `${createdCandidatures.length} candidature(s) creee(s) par matching inverse`);

  } catch (error) {
    console.error('creerCandidaturesMatching error:', error);
    sendError(res, 'Erreur lors de la creation des candidatures');
  }
};

/**
 * Recupere les candidatures matching inverse pour une offre
 * GET /api/matching-inverse/:offreId/candidatures
 */
export const getCandidaturesMatchingInverse = async (req: Request, res: Response) => {
  try {
    const { offreId } = req.params;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Non autorise', 403);
    }

    const candidatures = await prisma.candidature.findMany({
      where: {
        offreId,
        statut: 'NOUVELLE'
      },
      orderBy: { dateSoumission: 'desc' },
      include: {
        offre: {
          select: {
            id: true,
            reference: true,
            intitule: true
          }
        }
      }
    });

    sendSuccess(res, { candidatures });

  } catch (error) {
    console.error('getCandidaturesMatchingInverse error:', error);
    sendError(res, 'Erreur lors de la recuperation');
  }
};

/**
 * Recupere le detail d'un candidat passif
 * GET /api/matching-inverse/candidats/:candidatureId
 */
export const getCandidatPassifDetail = async (req: Request, res: Response) => {
  try {
    const { candidatureId } = req.params;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Non autorise', 403);
    }

    const candidature = await prisma.candidature.findUnique({
      where: { id: candidatureId },
      include: {
        offre: {
          include: {
            demande: {
              include: {
                direction: true,
                createur: true
              }
            }
          }
        },
        entretiens: {
          include: {
            interviewer: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                role: true
              }
            }
          },
          orderBy: { date: 'desc' }
        },
        contrat: true
      }
    });

    if (!candidature) {
      return sendNotFound(res, 'Candidature non trouvee');
    }

    const historiqueCandidatures = await prisma.candidature.findMany({
      where: {
        email: candidature.email,
        id: { not: candidatureId }
      },
      include: {
        offre: {
          select: {
            id: true,
            reference: true,
            intitule: true,
            statut: true
          }
        }
      },
      orderBy: { dateSoumission: 'desc' }
    });

    sendSuccess(res, {
      candidature,
      historiqueCandidatures
    });

  } catch (error) {
    console.error('getCandidatPassifDetail error:', error);
    sendError(res, 'Erreur lors de la recuperation du detail');
  }
};

/**
 * Recupere tous les candidats passifs (sans offre)
 * GET /api/matching-inverse/candidats-passifs
 */
export const getCandidatsPassifs = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Non autorise', 403);
    }

    const candidats = await prisma.candidature.findMany({
      where: {
        offreId: null,
        consentementIA: true
      },
      orderBy: { scoreGlobal: 'desc' },
      include: {
        offre: {
          select: {
            id: true,
            reference: true,
            intitule: true
          }
        }
      }
    });

    sendSuccess(res, {
      candidats,
      total: candidats.length
    });

  } catch (error) {
    console.error('getCandidatsPassifs error:', error);
    sendError(res, 'Erreur lors de la recuperation des candidats passifs');
  }
};