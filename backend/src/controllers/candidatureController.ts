// backend/src/controllers/candidatureController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/helpers';
import { scoringService } from '../services/scoring.service';

// Générer une référence unique
const generateReference = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.candidature.count({
    where: { reference: { startsWith: `CAND-${year}` } }
  });
  return `CAND-${year}-${String(count + 1).padStart(4, '0')}`;
};

// ============================================
// SOUMETTRE UNE CANDIDATURE (public)
// ============================================
export const soumettreCandidature = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const {
      nom,
      prenom,
      email,
      telephone,
      cvUrl,
      cvTexte,
      consentementRGPD,
      consentementIA
    } = req.body;

    if (!nom || !prenom || !email || !cvUrl) {
      return sendError(res, 'Nom, prenom, email et CV sont obligatoires', 400);
    }

    if (!consentementRGPD) {
      return sendError(res, 'Le consentement RGPD est obligatoire', 400);
    }

    const offre = await prisma.offreEmploi.findFirst({
      where: {
        lienCandidature: { contains: token },
        statut: 'PUBLIEE'
      },
      include: { demande: true }
    });

    if (!offre) {
      return sendNotFound(res, 'Offre non trouvee ou non publiee');
    }

    const candidatureExistante = await prisma.candidature.findFirst({
      where: { email, offreId: offre.id }
    });

    if (candidatureExistante) {
      return sendError(res, 'Vous avez deja postule a cette offre', 400);
    }

    const scoring = await scoringService.calculerScore({
      cvTexte: cvTexte || '',
      offreDescription: offre.description || '',
      offreProfilRecherche: offre.profilRecherche || '',
      offreCompetences: offre.competences || []
    });

    const reference = await generateReference();

    const candidature = await prisma.candidature.create({
      data: {
        reference,
        nom,
        prenom,
        email,
        telephone,
        cvUrl,
        cvTexte: cvTexte || '',
        scoreGlobal: scoring.scoreGlobal,
        scoreExp: scoring.scoreExp,
        competencesDetectees: scoring.competencesDetectees,
        competencesManquantes: scoring.competencesManquantes,
        statut: 'NOUVELLE',
        consentementRGPD,
        consentementIA: consentementIA || false,
        offreId: offre.id
      }
    });

    sendCreated(res, {
      candidature: {
        id: candidature.id,
        reference: candidature.reference,
        statut: candidature.statut,
        scoreGlobal: candidature.scoreGlobal
      }
    }, 'Candidature envoyee avec succes');

  } catch (error) {
    console.error('soumettreCandidature error:', error);
    sendError(res, 'Erreur lors de la soumission de la candidature');
  }
};

// ============================================
// RECUPERER TOUTES LES CANDIDATURES
// ============================================
export const getCandidatures = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const { page = 1, limit = 100, statut, offreId, type } = req.query;

    const where: any = {};

    if (statut) where.statut = statut;
    
    if (type === 'actifs') {
      where.offreId = { not: null };
    } else if (type === 'passifs') {
      where.offreId = null;
    } else if (offreId) {
      where.offreId = offreId;
    }

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN' && userRole !== 'MANAGER') {
      return sendError(res, 'Non autorise', 403);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [candidatures, total] = await Promise.all([
      prisma.candidature.findMany({
        where,
        include: {
          offre: {
            select: {
              id: true,
              reference: true,
              intitule: true,
              demande: {
                select: {
                  id: true,
                  niveau: true
                }
              }
            }
          }
        },
        orderBy: { dateSoumission: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.candidature.count({ where })
    ]);

    const actifsCount = await prisma.candidature.count({
      where: { offreId: { not: null } }
    });
    const passifsCount = await prisma.candidature.count({
      where: { offreId: null }
    });

    sendSuccess(res, {
      candidatures,
      stats: {
        total,
        actifs: actifsCount,
        passifs: passifsCount
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('getCandidatures error:', error);
    sendError(res, 'Erreur lors de la recuperation des candidatures');
  }
};

// ============================================
// RECUPERER UNE CANDIDATURE PAR ID
// ============================================
export const getCandidatureById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 'ID manquant', 400);
    }

    const candidature = await prisma.candidature.findUnique({
      where: { id },
      include: {
        offre: {
          include: {
            demande: {
              select: {
                id: true,
                niveau: true
              }
            }
          }
        },
        entretiens: {
          include: {
            interviewer: {
              select: { id: true, nom: true, prenom: true, role: true }
            }
          },
          orderBy: { date: 'asc' }
        },
        contrat: true
      }
    });

    if (!candidature) {
      return sendNotFound(res, 'Candidature non trouvee');
    }

    return sendSuccess(res, { candidature });

  } catch (error) {
    console.error('getCandidatureById error:', error);
    return sendError(res, 'Erreur lors de la recuperation de la candidature');
  }
};

// ============================================
// CHANGER LE STATUT D'UNE CANDIDATURE
// ============================================
export const updateCandidatureStatut = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsValides = ['NOUVELLE', 'PRESELECTIONNEE', 'ENTRETIEN', 'ACCEPTEE', 'REFUSEE'];
    if (!statutsValides.includes(statut)) {
      return sendError(res, 'Statut invalide', 400);
    }

    const candidature = await prisma.candidature.update({
      where: { id },
      data: { statut }
    });

    sendSuccess(res, candidature, `Statut mis a jour : ${statut}`);

  } catch (error) {
    console.error('updateCandidatureStatut error:', error);
    sendError(res, 'Erreur lors de la mise a jour du statut');
  }
};

// ============================================
// SUPPRIMER UNE CANDIDATURE
// ============================================
export const deleteCandidature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.candidature.delete({ where: { id } });

    sendSuccess(res, null, 'Candidature supprimee avec succes');

  } catch (error) {
    console.error('deleteCandidature error:', error);
    sendError(res, 'Erreur lors de la suppression');
  }
};