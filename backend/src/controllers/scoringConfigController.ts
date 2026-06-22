// backend/src/controllers/scoringConfigController.ts
// Gestion des poids de scoring par le SUPER_ADMIN
// Routes : GET /api/admin/scoring-config
//          PUT /api/admin/scoring-config

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/helpers';
import { iaService } from '../services/ia.service';

// ── Valeurs par défaut ────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  poidsCompetences: 0.35,
  poidsExperience:  0.25,
  poidsFormation:   0.20,
  poidsSemantique:  0.12,
  poidsCompletude:  0.08,
  seuilMatching:    70,
};

// ── Validation ────────────────────────────────────────────────────────────────

function validatePoids(body: any): { valid: boolean; message?: string } {
  const {
    poidsCompetences, poidsExperience, poidsFormation,
    poidsSemantique, poidsCompletude
  } = body;

  const fields = [poidsCompetences, poidsExperience, poidsFormation, poidsSemantique, poidsCompletude];

  for (const f of fields) {
    if (typeof f !== 'number' || f < 0 || f > 1) {
      return { valid: false, message: 'Chaque poids doit être un nombre entre 0 et 1' };
    }
  }

  const total = fields.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 1.0) > 0.001) {
    return {
      valid: false,
      message: `La somme des poids doit être égale à 1.0 (actuellement: ${total.toFixed(3)})`
    };
  }

  const { seuilMatching } = body;
  if (typeof seuilMatching !== 'number' || seuilMatching < 0 || seuilMatching > 100) {
    return { valid: false, message: 'Le seuil de matching doit être entre 0 et 100' };
  }

  return { valid: true };
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/scoring-config
 * Retourne la configuration actuelle des poids.
 * Accessible : SUPER_ADMIN uniquement
 */
export const getScoringConfig = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    if (userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Accès réservé au Super Admin', 403);
    }

    // Chercher la config la plus récente en BDD
    let config = await (prisma as any).scoringConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    // Si aucune config en BDD, créer la config par défaut
    if (!config) {
      config = await (prisma as any).scoringConfig.create({
        data: {
          ...DEFAULT_CONFIG,
          updatedBy: (req as any).user?.id,
        }
      });
    }

    return sendSuccess(res, {
      config: {
        id:               config.id,
        poidsCompetences: config.poidsCompetences,
        poidsExperience:  config.poidsExperience,
        poidsFormation:   config.poidsFormation,
        poidsSemantique:  config.poidsSemantique,
        poidsCompletude:  config.poidsCompletude,
        seuilMatching:    config.seuilMatching,
        updatedAt:        config.updatedAt,
        // Info utile pour l'UI
        somme:            Number((
          config.poidsCompetences + config.poidsExperience +
          config.poidsFormation   + config.poidsSemantique +
          config.poidsCompletude
        ).toFixed(3)),
      }
    });

  } catch (error) {
    console.error('getScoringConfig error:', error);
    return sendError(res, 'Erreur lors de la récupération de la configuration');
  }
};

/**
 * PUT /api/admin/scoring-config
 * Modifie les poids et le seuil de matching.
 * Accessible : SUPER_ADMIN uniquement
 * Valide que sum(poids) = 1.0 avant de sauvegarder.
 * Notifie le microservice IA de recharger sa config.
 */
export const updateScoringConfig = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    if (userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Accès réservé au Super Admin', 403);
    }

    const {
      poidsCompetences, poidsExperience, poidsFormation,
      poidsSemantique, poidsCompletude, seuilMatching
    } = req.body;

    // Validation
    const validation = validatePoids(req.body);
    if (!validation.valid) {
      return sendError(res, validation.message!, 400);
    }

    // Upsert : créer ou mettre à jour
    const existing = await (prisma as any).scoringConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    let config;
    if (existing) {
      config = await (prisma as any).scoringConfig.update({
        where: { id: existing.id },
        data: {
          poidsCompetences,
          poidsExperience,
          poidsFormation,
          poidsSemantique,
          poidsCompletude,
          seuilMatching,
          updatedBy: (req as any).user?.id,
        }
      });
    } else {
      config = await (prisma as any).scoringConfig.create({
        data: {
          poidsCompetences,
          poidsExperience,
          poidsFormation,
          poidsSemantique,
          poidsCompletude,
          seuilMatching,
          updatedBy: (req as any).user?.id,
        }
      });
    }

    // Notifier le microservice IA de recharger sa config (non bloquant)
    await iaService.refreshConfig();

    return sendSuccess(res, {
      config: {
        id:               config.id,
        poidsCompetences: config.poidsCompetences,
        poidsExperience:  config.poidsExperience,
        poidsFormation:   config.poidsFormation,
        poidsSemantique:  config.poidsSemantique,
        poidsCompletude:  config.poidsCompletude,
        seuilMatching:    config.seuilMatching,
        updatedAt:        config.updatedAt,
      }
    }, 'Configuration de scoring mise à jour avec succès');

  } catch (error) {
    console.error('updateScoringConfig error:', error);
    return sendError(res, 'Erreur lors de la mise à jour de la configuration');
  }
};