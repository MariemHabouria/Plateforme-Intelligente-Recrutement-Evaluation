

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden } from '../utils/helpers';
import { iaOffreService } from '../services/iaOffre.service';
import { linkedinService } from '../services/linkedin.service';
import { tanitjobsService } from '../services/tanitjobs.service';
import { TypeContrat } from '@prisma/client';
// ============================================
// FONCTION UTILITAIRE
// ============================================

// Fonction pour générer une référence unique
const generateUniqueOffreReference = async (): Promise<string> => {
  const year = new Date().getFullYear();
  let attempt = 0;
  let reference = '';
  let exists = true;
  
  while (exists && attempt < 10) {
    const randomNum = Math.floor(Math.random() * 10000);
    const sequential = await prisma.offreEmploi.count();
    reference = `OFF-${year}-${String(sequential + attempt + 1).padStart(4, '0')}-${randomNum}`;
    
    const existing = await prisma.offreEmploi.findUnique({
      where: { reference }
    });
    exists = !!existing;
    attempt++;
  }
  
  return reference;
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

    if (userRole === 'DRH') {
      where.rhId = userId;
      console.log('Filtre DRH - rhId:', userId);
    } else if (userRole === 'MANAGER') {
      where.demande = { managerId: userId };
      console.log('Filtre MANAGER - managerId:', userId);
    }

    if (statut) {
      where.statut = statut;
      console.log('Filtre statut:', statut);
    }

    console.log('Where clause:', JSON.stringify(where, null, 2));

    const offres = await prisma.offreEmploi.findMany({
      where,
      include: {
        demande: {
          select: { reference: true, intitulePoste: true, manager: { select: { nom: true, prenom: true } } }
        },
        _count: { select: { candidatures: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 ${offres.length} offre(s) trouvée(s)`);
    offres.forEach(o => {
      console.log(`  - ${o.reference}: rhId=${o.rhId}, demandeId=${o.demandeId}`);
    });

    const total = await prisma.offreEmploi.count({ where });

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
    console.error('❌ getOffres error:', error);
    sendError(res, 'Erreur lors de la récupération des offres');
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

    if (!offre) return sendNotFound(res, 'Offre non trouvée');

    sendSuccess(res, { offre });

  } catch (error) {
    console.error('❌ getOffreById error:', error);
    sendError(res, 'Erreur lors de la récupération de l\'offre');
  }
};

// ============================================
// GÉNÉRATION IA (MAISON) + CRÉATION
// ============================================

export const genererOffreAvecIA = async (req: Request, res: Response) => {
  try {
    const { demandeId } = req.body;

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id: demandeId },
      include: { direction: true, typePoste: true, createur: true }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvée');

    const offreGeneree = await iaOffreService.genererOffre({
      intitulePoste: demande.intitulePoste,
      budgetMin: demande.budgetMin?.toNumber() || 0,
      budgetMax: demande.budgetMax?.toNumber() || 0,
      typeContrat: demande.typeContrat,
      directionNom: demande.direction?.nom,
      descriptionDemande: demande.description || undefined,
      justification: demande.justification
    });

    sendSuccess(res, offreGeneree, 'Offre générée avec succès par IA');

  } catch (error) {
    console.error('❌ genererOffreAvecIA error:', error);
    sendError(res, 'Erreur lors de la génération IA');
  }
};

export const createOffre = async (req: Request, res: Response) => {
  try {
    console.log('========== DÉBUT CREATE OFFRE ==========');
    console.log('1. User info:', {
      id: (req as any).user?.id,
      email: (req as any).user?.email,
      role: (req as any).user?.role
    });
    
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
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

    console.log('2. Body reçu:', { demandeId, intitule, typeContrat });

    // Validation
    if (!demandeId) {
      return res.status(400).json({ success: false, message: 'demandeId requis' });
    }
    if (!intitule) {
      return res.status(400).json({ success: false, message: 'intitule requis' });
    }
    if (!typeContrat) {
      return res.status(400).json({ success: false, message: 'typeContrat requis' });
    }

    // Vérifier le rôle
    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: `Seul le DRH peut modifier les offres. Votre rôle: ${userRole}`
      });
    }

    // Vérifier la demande
    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id: demandeId }
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: `Demande ${demandeId} non trouvée`
      });
    }

    if (demande.statut !== 'VALIDEE') {
      return res.status(400).json({
        success: false,
        message: `La demande doit être validée. Statut actuel: ${demande.statut}`
      });
    }

    // Chercher l'offre existante (créée automatiquement à la validation)
    let offre = await prisma.offreEmploi.findFirst({
      where: { demandeId }
    });
if (offre) {
  console.log('📝 Offre existante trouvée, mise à jour:', offre.reference);
  console.log('   - Ancien rhId:', offre.rhId);
  console.log('   - Nouveau rhId:', userId);
  
  offre = await prisma.offreEmploi.update({
    where: { id: offre.id },
    data: {
      intitule,
      description: description || '',
      profilRecherche: profilRecherche || '',
      competences: competences || [],
      fourchetteSalariale: fourchetteSalariale || '',
      typeContrat: typeContrat as TypeContrat,
      canauxPublication: canauxPublication || ['Kilani'],
      rhId: userId  // ← FORCER la mise à jour du rhId
    }
  });

      
      console.log('✅ Offre mise à jour avec succès:', offre.reference);
      
      return res.status(200).json({
        success: true,
        data: offre,
        message: 'Offre mise à jour avec succès'
      });
    } else {
      // CRÉATION d'une nouvelle offre (cas rare)
      const year = new Date().getFullYear();
      const timestamp = Date.now();
      const reference = `OFF-${year}-${timestamp}`;
      
      console.log('📝 Création nouvelle offre:', reference);
      
      offre = await prisma.offreEmploi.create({
        data: {
          reference,
          intitule,
          description: description || '',
          profilRecherche: profilRecherche || '',
          competences: competences || [],
          fourchetteSalariale: fourchetteSalariale || '',
          typeContrat: typeContrat as TypeContrat,
          statut: 'BROUILLON',
          canauxPublication: canauxPublication || ['Kilani'],
          demandeId,
          rhId: userId
        }
      });
      
      console.log('✅ Offre créée avec succès:', offre.reference);
      
      return res.status(201).json({
        success: true,
        data: offre,
        message: 'Offre créée avec succès'
      });
    }

  } catch (error: any) {
    console.error('❌ Erreur détaillée:', error);
    console.error('❌ Code:', error.code);
    console.error('❌ Message:', error.message);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création/mise à jour de l\'offre'
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

    const offre = await prisma.offreEmploi.findUnique({
      where: { id },
      include: { demande: true }
    });

    if (!offre) return sendNotFound(res, 'Offre non trouvée');

    if (offre.statut !== 'BROUILLON') {
      return sendError(res, 'Seules les offres au statut Brouillon peuvent être publiées', 400);
    }

    const resultatsPublication = [];

    if (canaux.includes('LinkedIn')) {
      const result = await linkedinService.publierOffre(offre, {
        description: offre.description,
        profilRecherche: offre.profilRecherche,
        competences: offre.competences
      });
      resultatsPublication.push({ canal: 'LinkedIn', ...result });
    }

    if (canaux.includes('TanitJobs')) {
      const result = await tanitjobsService.publierOffre(offre, {
        description: offre.description,
        competences: offre.competences
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
      publication: resultatsPublication
    }, 'Offre publiée avec succès');

  } catch (error) {
    console.error('❌ publierOffre error:', error);
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

    if (!offre) return sendNotFound(res, 'Offre non trouvée');

    if (offre.rhId !== userId && (req as any).user.role !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorisé');
    }

    if (offre.statut !== 'BROUILLON') {
      return sendError(res, 'Seules les offres au statut Brouillon peuvent être modifiées', 400);
    }

    const offreMaj = await prisma.offreEmploi.update({
      where: { id },
      data: {
        intitule: data.intitule,
        description: data.description,
        profilRecherche: data.profilRecherche,
        competences: data.competences,
        fourchetteSalariale: data.fourchetteSalariale,
        typeContrat: data.typeContrat
      }
    });

    sendSuccess(res, offreMaj, 'Offre modifiée avec succès');

  } catch (error) {
    console.error('❌ updateOffre error:', error);
    sendError(res, 'Erreur lors de la modification');
  }
};

export const deleteOffre = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const offre = await prisma.offreEmploi.findUnique({
      where: { id },
      include: { candidatures: true }
    });

    if (!offre) return sendNotFound(res, 'Offre non trouvée');

    if (offre.rhId !== userId && (req as any).user.role !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorisé');
    }

    if (offre.candidatures.length > 0) {
      return sendError(res, 'Impossible de supprimer une offre qui a des candidatures', 400);
    }

    await prisma.offreEmploi.delete({ where: { id } });

    sendSuccess(res, null, 'Offre supprimée avec succès');

  } catch (error) {
    console.error('❌ deleteOffre error:', error);
    sendError(res, 'Erreur lors de la suppression');
  }
};