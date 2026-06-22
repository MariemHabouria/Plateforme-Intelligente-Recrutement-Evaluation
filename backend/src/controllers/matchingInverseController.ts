import { Request, Response } from 'express';
import { matchingInverseService } from '../services/matchingInverse.service';
import { sendSuccess, sendError, sendNotFound } from '../utils/helpers';
import prisma from '../config/prisma';

export const matchingInverseController = {

  async executerMatching(req: Request, res: Response) {
  try {
    const { offreId } = req.params;

    const offre = await prisma.offreEmploi.findUnique({ where: { id: offreId } });
    if (!offre) return sendNotFound(res, 'Offre non trouvée');

    const results = await matchingInverseService.executerMatching(offreId);

    // Exclure par email (pas par id) — un candidat peut avoir plusieurs candidatures
    const candidaturesExistantes = await prisma.candidature.findMany({
      where: { offreId },
      select: { email: true },
    });
    const emailsExclus = new Set(candidaturesExistantes.map(c => c.email));

    const resultsFiltres = results.filter(r => !emailsExclus.has(r.email));

    return sendSuccess(
      res,
      { offreId, candidaturesMatch: resultsFiltres },
      'Matching inverse exécuté avec succès'
    );
  } catch (error: any) {
    console.error('executerMatching error:', error);
    sendError(res, error.message || 'Erreur lors du matching inverse');
  }
},

  async creerCandidaturesMatching(req: Request, res: Response) {
    try {
      const { offreId } = req.params;
      const { candidatureIds } = req.body;

      if (!Array.isArray(candidatureIds) || candidatureIds.length === 0) {
        return sendError(res, 'Liste de candidatureIds requise', 400);
      }

      const offre = await prisma.offreEmploi.findUnique({ where: { id: offreId } });
      if (!offre) return sendNotFound(res, 'Offre non trouvée');

      const count = await matchingInverseService.creerCandidaturesMatching(offreId, candidatureIds);

      return sendSuccess(res, {
        offreId,
        candidaturesAssociees: count,
      }, `${count} candidature(s) associée(s) à l'offre`);

    } catch (error: any) {
      console.error('creerCandidaturesMatching error:', error);
      sendError(res, error.message || 'Erreur lors de l\'association');
    }
  },

  async getCandidatPassifDetail(req: Request, res: Response) {
    try {
      const { candidatureId } = req.params;

      const candidature = await prisma.candidature.findUnique({
        where: { id: candidatureId },
        include: {
          offre: {
            include: {
              demande: {
                include: {
                  direction: true,
                  createur: {
                    select: { id: true, nom: true, prenom: true, role: true },
                  },
                },
              },
            },
          },
          entretiens: {
            include: {
              interviewer: {
                select: { id: true, nom: true, prenom: true, role: true },
              },
            },
            orderBy: { date: 'desc' },
          },
        },
      });

      if (!candidature) return sendNotFound(res, 'Candidature non trouvée');

      const historiqueCandidatures = await prisma.candidature.findMany({
        where: {
          email: candidature.email,
          id: { not: candidatureId },
        },
        include: {
          offre: {
            select: { id: true, reference: true, intitule: true },
          },
        },
        orderBy: { dateSoumission: 'desc' },
        take: 10,
      });

      return sendSuccess(res, {
        candidature,
        historiqueCandidatures,
      });

    } catch (error: any) {
      console.error('getCandidatPassifDetail error:', error);
      sendError(res, error.message || 'Erreur lors de la récupération');
    }
  },
};