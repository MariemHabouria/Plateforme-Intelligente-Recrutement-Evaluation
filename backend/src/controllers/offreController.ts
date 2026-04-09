// backend/src/controllers/offreController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden } from '../utils/helpers';
import { iaOffreService } from '../services/iaOffre.service';
import { linkedinService } from '../services/linkedin.service';
import { tanitjobsService } from '../services/tanitjobs.service';
import { TypeContrat } from '@prisma/client';
import crypto from 'crypto';

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

const generateLienCandidature = (offreId: string, reference: string): string => {
  const token = crypto
    .createHash('sha256')
    .update(`${offreId}-${Date.now()}-${Math.random()}`)
    .digest('hex')
    .substring(0, 16);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${frontendUrl}/candidature/${token}?ref=${encodeURIComponent(reference)}`;
};

// ============================================
// CRUD OFFRES
// ============================================

export const getOffres = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, statut } = req.query;

    const where: any = {};

    // ✅ AJOUTER CE FILTRE : Uniquement les offres avec une demande associée
    where.demandeId = { not: null };

    if (userRole === 'DRH' || userRole === 'SUPER_ADMIN') {
      console.log('✅ DRH/SuperAdmin - affichage de toutes les offres (avec demande)');
    } else if (userRole === 'MANAGER') {
      where.demande = { managerId: userId };
    } else {
      where.rhId = userId;
    }

    if (statut) {
      where.statut = statut;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [offres, total] = await Promise.all([
      prisma.offreEmploi.findMany({
        where,
        include: {
          demande: {
            select: {
              reference: true,
              intitulePoste: true,
              manager: { select: { nom: true, prenom: true } }
            }
          },
          _count: { select: { candidatures: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.offreEmploi.count({ where })
    ]);

    console.log(`📊 ${offres.length} offre(s) trouvée(s) (uniquement celles avec demande)`);

    sendSuccess(res, {
      offres,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('getOffres error:', error);
    sendError(res, 'Erreur lors de la recuperation des offres');
  }
};

export const getOffreById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const offre = await prisma.offreEmploi.findUnique({
      where: { id },
      include: {
        demande: true,
        candidatures: {
          orderBy: { dateSoumission: 'desc' },
          take: 10
        }
      }
    });

    if (!offre) return sendNotFound(res, 'Offre non trouvee');

    sendSuccess(res, { offre });

  } catch (error) {
    console.error('getOffreById error:', error);
    sendError(res, 'Erreur lors de la recuperation de l offre');
  }
};

export const getOffreParToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const offre = await prisma.offreEmploi.findFirst({
      where: {
        lienCandidature: { contains: token },
        statut: 'PUBLIEE'
      },
      select: {
        id: true,
        reference: true,
        intitule: true,
        description: true,
        profilRecherche: true,
        competences: true,
        fourchetteSalariale: true,
        typeContrat: true
      }
    });

    if (!offre) {
      return res.status(404).json({
        success: false,
        message: 'Offre non trouvee ou non publiee'
      });
    }

    sendSuccess(res, { offre });

  } catch (error) {
    console.error('getOffreParToken error:', error);
    sendError(res, 'Erreur lors de la recuperation de l offre');
  }
};

// ============================================
// DEMANDES SANS OFFRE
// ✅ Retourne UNIQUEMENT les demandes VALIDEES sans offre associée
// ============================================

export const getDemandesSansOffre = async (req: Request, res: Response) => {
  try {
    // ✅ offre: null = seulement les demandes qui n'ont PAS d'offre liée
    const demandes = await prisma.demandeRecrutement.findMany({
      where: {
        statut: 'VALIDEE',
        offre: null
      },
      select: {
        id: true,
        reference: true,
        intitulePoste: true,
        typeContrat: true,
        budgetMin: true,
        budgetMax: true,
        direction: { select: { nom: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 ${demandes.length} demande(s) validée(s) sans offre`);

    sendSuccess(res, { demandes });

  } catch (error) {
    console.error('getDemandesSansOffre error:', error);
    sendError(res, 'Erreur lors de la recuperation des demandes');
  }
};

// ============================================
// GENERATION IA
// ============================================

export const genererOffreAvecIA = async (req: Request, res: Response) => {
  try {
    const { demandeId } = req.body;

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id: demandeId },
      include: { direction: true, createur: true }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvee');

    const offreGeneree = await iaOffreService.genererOffre({
      intitulePoste: demande.intitulePoste,
      budgetMin: demande.budgetMin?.toNumber() || 0,
      budgetMax: demande.budgetMax?.toNumber() || 0,
      typeContrat: demande.typeContrat,
      directionNom: demande.direction?.nom,
      descriptionDemande: demande.description || undefined,
      justification: demande.justification
    });

    // ✅ Retourne juste les données générées, ne crée RIEN en base
    sendSuccess(res, offreGeneree, 'Offre generee avec succes par IA');

  } catch (error) {
    console.error('genererOffreAvecIA error:', error);
    sendError(res, 'Erreur lors de la generation IA');
  }
};

// ============================================
// CREATION OFFRE
// ✅ Crée UNIQUEMENT une nouvelle offre, ne met plus à jour l'existante
// ============================================

export const createOffre = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Utilisateur non authentifie' });
    }

    const {
      demandeId,
      intitule,
      description,
      profilRecherche,
      competences,
      fourchetteSalariale,
      typeContrat,
      canauxPublication
    } = req.body;

    if (!demandeId) return res.status(400).json({ success: false, message: 'demandeId requis' });
    if (!intitule) return res.status(400).json({ success: false, message: 'intitule requis' });
    if (!typeContrat) return res.status(400).json({ success: false, message: 'typeContrat requis' });

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: `Seul le DRH peut gerer les offres. Votre role: ${userRole}`
      });
    }

    const demande = await prisma.demandeRecrutement.findUnique({ where: { id: demandeId } });

    if (!demande) {
      return res.status(404).json({ success: false, message: `Demande ${demandeId} non trouvee` });
    }

    if (demande.statut !== 'VALIDEE') {
      return res.status(400).json({
        success: false,
        message: `La demande doit etre validee. Statut actuel: ${demande.statut}`
      });
    }

    // ✅ Vérifier qu'il n'existe pas déjà une offre pour cette demande
    const offreExistante = await prisma.offreEmploi.findFirst({ where: { demandeId } });
    if (offreExistante) {
      return res.status(400).json({
        success: false,
        message: `Une offre existe déjà pour cette demande (${offreExistante.reference}). Veuillez la modifier depuis le tableau.`
      });
    }

    // ✅ Création d'une nouvelle offre uniquement
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    const reference = `OFF-${year}-${timestamp}`;
    const newId = crypto.randomUUID();
    const lienCandidature = generateLienCandidature(newId, reference);

    const offre = await prisma.offreEmploi.create({
      data: {
        id: newId,
        reference,
        intitule,
        description: description || '',
        profilRecherche: profilRecherche || '',
        competences: competences || [],
        fourchetteSalariale: fourchetteSalariale || '',
        typeContrat: typeContrat as TypeContrat,
        statut: 'BROUILLON',
        canauxPublication: canauxPublication || ['Kilani'],
        rhId: userId,
        lienCandidature,
        demande: { connect: { id: demandeId } }
      }
    });

    console.log(`✅ Offre créée: ${offre.reference}`);

    return res.status(201).json({
      success: true,
      data: offre,
      message: 'Offre creee avec succes'
    });

  } catch (error: any) {
    console.error('createOffre error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la creation de l offre'
    });
  }
};

// ============================================
// PUBLICATION MULTI-CANAUX
// ============================================

export const publierOffre = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { canaux } = req.body;
    const userId = (req as any).user.id;

    let offre = await prisma.offreEmploi.findUnique({
      where: { id },
      include: { demande: true }
    });

    if (!offre) return sendNotFound(res, 'Offre non trouvee');

    if (offre.statut !== 'BROUILLON') {
      return sendError(res, 'Seules les offres au statut Brouillon peuvent etre publiees', 400);
    }

    let lienCandidature = offre.lienCandidature;
    if (!lienCandidature) {
      lienCandidature = generateLienCandidature(offre.id, offre.reference);
      await prisma.offreEmploi.update({ where: { id }, data: { lienCandidature } });
    }

    const resultatsPublication = [];

    if (canaux.includes('LinkedIn')) {
      const result = await linkedinService.publierOffre(offre, {
        description: offre.description,
        profilRecherche: offre.profilRecherche,
        competences: offre.competences,
        lienCandidature
      });
      resultatsPublication.push({ canal: 'LinkedIn', ...result });
    }

    if (canaux.includes('TanitJobs')) {
      const result = await tanitjobsService.publierOffre(offre, {
        description: offre.description,
        competences: offre.competences,
        lienCandidature
      });
      resultatsPublication.push({ canal: 'TanitJobs', ...result });
    }

    const offreMaj = await prisma.offreEmploi.update({
      where: { id },
      data: {
        statut: 'PUBLIEE',
        datePublication: new Date(),
        canauxPublication: canaux
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'PUBLISH_OFFRE',
        entityType: 'OffreEmploi',
        entityId: offre.id,
        details: `Publication de l'offre ${offre.reference} sur: ${canaux.join(', ')}`,
        acteurId: userId
      }
    });

    sendSuccess(res, {
      offre: offreMaj,
      publication: resultatsPublication,
      lienCandidature
    }, 'Offre publiee avec succes');

  } catch (error) {
    console.error('publierOffre error:', error);
    sendError(res, 'Erreur lors de la publication');
  }
};

// ============================================
// MODIFICATION OFFRE
// ============================================

export const updateOffre = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const data = req.body;

    const offre = await prisma.offreEmploi.findUnique({ where: { id } });

    if (!offre) return sendNotFound(res, 'Offre non trouvee');

    if (offre.rhId !== userId && (req as any).user.role !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorise');
    }

    if (offre.statut !== 'BROUILLON') {
      return sendError(res, 'Seules les offres au statut Brouillon peuvent etre modifiees', 400);
    }

    const offreMaj = await prisma.offreEmploi.update({
      where: { id },
      data: {
        intitule: data.intitule,
        description: data.description,
        profilRecherche: data.profilRecherche,
        competences: data.competences,
        fourchetteSalariale: data.fourchetteSalariale,
        typeContrat: data.typeContrat as TypeContrat,
        canauxPublication: data.canauxPublication || ['Kilani']
      }
    });

    sendSuccess(res, offreMaj, 'Offre modifiee avec succes');

  } catch (error) {
    console.error('updateOffre error:', error);
    sendError(res, 'Erreur lors de la modification');
  }
};

// ============================================
// SUPPRESSION OFFRE
// ============================================

export const deleteOffre = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const offre = await prisma.offreEmploi.findUnique({
      where: { id },
      include: { candidatures: true }
    });

    if (!offre) return sendNotFound(res, 'Offre non trouvee');

    if (offre.rhId !== userId && (req as any).user.role !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorise');
    }

    if (offre.candidatures.length > 0) {
      return sendError(res, 'Impossible de supprimer une offre qui a des candidatures', 400);
    }

    await prisma.offreEmploi.delete({ where: { id } });

    sendSuccess(res, null, 'Offre supprimee avec succes');

  } catch (error) {
    console.error('deleteOffre error:', error);
    sendError(res, 'Erreur lors de la suppression');
  }
};