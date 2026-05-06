// backend/src/controllers/matchingInverseController.ts

import { Request, Response } from 'express';
import { matchingInverseService } from '../services/matchingInverse.service';
import { sendSuccess, sendError, sendNotFound } from '../utils/helpers';
import prisma from '../config/prisma';

export const matchingInverseController = {
  
  /**
   * Exécuter le matching inverse pour une offre
   */
  async executerMatching(req: Request, res: Response) {
    try {
      const { offreId } = req.params;
      
      const results = await matchingInverseService.executerMatching(offreId);
      
      sendSuccess(res, {
        offreId,
        candidaturesMatch: results
      }, 'Matching inverse exécuté avec succès');
      
    } catch (error: any) {
      console.error('executerMatching error:', error);
      sendError(res, error.message || 'Erreur lors du matching inverse');
    }
  },
  
  /**
   * Créer des candidatures à partir du matching inverse
   */
  async creerCandidaturesMatching(req: Request, res: Response) {
    try {
      const { offreId } = req.params;
      const { candidatureIds } = req.body;
      
      if (!candidatureIds || !Array.isArray(candidatureIds) || candidatureIds.length === 0) {
        return sendError(res, 'Liste de candidatureIds requise', 400);
      }
      
      // Vérifier que l'offre existe
      const offre = await prisma.offreEmploi.findUnique({
        where: { id: offreId }
      });
      
      if (!offre) {
        return sendNotFound(res, 'Offre non trouvée');
      }
      
      // Mettre à jour les candidatures avec l'offre
      const updated = await prisma.$transaction(
        candidatureIds.map(candidatureId =>
          prisma.candidature.update({
            where: { id: candidatureId },
            data: {
              offreId: offreId,
              statut: 'PRESELECTIONNEE'
            }
          })
        )
      );
      
      sendSuccess(res, {
        offreId,
        candidaturesAssociees: updated.length,
        candidatures: updated
      }, `${updated.length} candidature(s) associée(s) à l'offre`);
      
    } catch (error: any) {
      console.error('creerCandidaturesMatching error:', error);
      sendError(res, error.message || 'Erreur lors de l\'association');
    }
  },
  
  /**
   * Récupérer les candidatures matching pour une offre
   */
  async getCandidaturesMatching(req: Request, res: Response) {
    try {
      const { offreId } = req.params;
      
      const results = await matchingInverseService.executerMatching(offreId);
      
      sendSuccess(res, {
        offreId,
        candidaturesMatch: results
      });
      
    } catch (error: any) {
      console.error('getCandidaturesMatching error:', error);
      sendError(res, error.message || 'Erreur lors de la récupération');
    }
  },
  
  /**
   * Récupérer les détails d'un candidat passif
   */
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
                  direction: true
                }
              }
            }
          }
        }
      });
      
      if (!candidature) {
        return sendNotFound(res, 'Candidature non trouvée');
      }
      
      sendSuccess(res, { candidature });
      
    } catch (error: any) {
      console.error('getCandidatPassifDetail error:', error);
      sendError(res, error.message || 'Erreur lors de la récupération');
    }
  }
};