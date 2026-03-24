// backend/src/controllers/demandeController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { circuitConfigService } from '../services/circuitConfig.service';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden } from '../utils/helpers';
import { STATUT_PAR_ROLE } from '../config/constants';

// ============================================
// UTILITAIRES
// ============================================

const generateReference = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.demandeRecrutement.count({
    where: { reference: { startsWith: `DEM-${year}` } }
  });
  return `DEM-${year}-${String(count + 1).padStart(3, '0')}`;
};

// ============================================
// CRUD DEMANDES
// ============================================

export const getDemandes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { page = 1, limit = 10, statut, priorite } = req.query;
    
    const where: any = {};
    
    if (userRole === 'MANAGER') {
      where.managerId = userId;
    }
    if (statut) where.statut = statut;
    if (priorite) where.priorite = priorite;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [demandes, total] = await Promise.all([
      prisma.demandeRecrutement.findMany({
        where,
        include: {
          manager: { select: { id: true, nom: true, prenom: true, email: true } },
          validations: {
            include: { acteur: { select: { id: true, nom: true, prenom: true, role: true } } },
            orderBy: { niveauEtape: 'asc' }
          },
          disponibilites: true,
          circuitConfig: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.demandeRecrutement.count({ where })
    ]);
    
    sendSuccess(res, {
      demandes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ getDemandes error:', error);
    sendError(res, 'Erreur lors de la récupération des demandes');
  }
};

export const getDemandeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, nom: true, prenom: true, email: true } },
        validations: {
          include: { acteur: { select: { id: true, nom: true, prenom: true, role: true } } },
          orderBy: { niveauEtape: 'asc' }
        },
        disponibilites: true,
        circuitConfig: true,
        offre: true
      }
    });
    
    if (!demande) {
      return sendNotFound(res, 'Demande non trouvée');
    }
    
    sendSuccess(res, { demande });
    
  } catch (error) {
    console.error('❌ getDemandeById error:', error);
    sendError(res, 'Erreur lors de la récupération de la demande');
  }
};

export const createDemande = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { 
      intitulePoste, justification, motif, typeContrat, 
      priorite, budgetEstime, dateSouhaitee, description, 
      disponibilites 
    } = req.body;
    
    if (!intitulePoste || !justification || !motif || !typeContrat || !priorite || !budgetEstime || !dateSouhaitee) {
      return sendError(res, 'Tous les champs obligatoires doivent être remplis', 400);
    }
    
    const reference = await generateReference();
    
    const demande = await prisma.demandeRecrutement.create({
      data: {
        reference,
        intitulePoste,
        description,
        justification,
        motif,
        typeContrat,
        priorite,
        budgetEstime: Number(budgetEstime), // ← Convertir en nombre
        dateSouhaitee: new Date(dateSouhaitee),
        statut: 'BROUILLON',
        managerId: userId,
        disponibilites: disponibilites ? {
          create: disponibilites.map((d: any) => ({
            date: new Date(d.date),
            heureDebut: d.heureDebut,
            heureFin: d.heureFin
          }))
        } : undefined
      },
      include: { disponibilites: true }
    });
    
    sendCreated(res, demande, 'Demande créée avec succès');
    
  } catch (error) {
    console.error('❌ createDemande error:', error);
    sendError(res, 'Erreur lors de la création de la demande');
  }
};

export const updateDemande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const data = req.body;
    
    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id }
    });
    
    if (!demande) return sendNotFound(res, 'Demande non trouvée');
    if (demande.managerId !== userId && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Vous n\'êtes pas autorisé à modifier cette demande');
    }
    if (demande.statut !== 'BROUILLON') {
      return sendError(res, 'Seules les demandes au statut Brouillon peuvent être modifiées', 400);
    }
    
    const updatedDemande = await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        intitulePoste: data.intitulePoste,
        description: data.description,
        justification: data.justification,
        motif: data.motif,
        typeContrat: data.typeContrat,
        priorite: data.priorite,
        budgetEstime: data.budgetEstime ? Number(data.budgetEstime) : undefined,
        dateSouhaitee: data.dateSouhaitee ? new Date(data.dateSouhaitee) : undefined
      }
    });
    
    sendSuccess(res, updatedDemande, 'Demande modifiée avec succès');
    
  } catch (error) {
    console.error('❌ updateDemande error:', error);
    sendError(res, 'Erreur lors de la modification');
  }
};

export const deleteDemande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id }
    });
    
    if (!demande) return sendNotFound(res, 'Demande non trouvée');
    if (demande.managerId !== userId && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Vous n\'êtes pas autorisé à supprimer cette demande');
    }
    if (demande.statut !== 'BROUILLON') {
      return sendError(res, 'Seules les demandes au statut Brouillon peuvent être supprimées', 400);
    }
    
    await prisma.demandeRecrutement.delete({ where: { id } });
    sendSuccess(res, null, 'Demande supprimée avec succès');
    
  } catch (error) {
    console.error('❌ deleteDemande error:', error);
    sendError(res, 'Erreur lors de la suppression');
  }
};

// ============================================
// CIRCUIT DE VALIDATION
// ============================================

export const submitDemande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id }
    });
    
    if (!demande) return sendNotFound(res, 'Demande non trouvée');
    if (demande.managerId !== userId) return sendForbidden(res);
    if (demande.statut !== 'BROUILLON') {
      return sendError(res, 'Seules les demandes au statut Brouillon peuvent être soumises', 400);
    }
    
    const circuit = await circuitConfigService.determinerCircuitParBudget(Number(demande.budgetEstime));
    if (!circuit) return sendError(res, 'Aucun circuit de validation trouvé', 400);
    
    await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        circuitType: circuit.type,
        totalEtapes: circuit.totalEtapes,
        circuitConfigId: circuit.id
      }
    });
    
    const etapes = circuit.etapes as any[];
    if (etapes.length === 0) return sendError(res, 'Le circuit ne contient aucune étape', 500);
    
    const premiereEtape = etapes[0];
    const premierValidateur = await prisma.user.findFirst({
      where: { role: premiereEtape.role, actif: true }
    });
    
    if (!premierValidateur) {
      return sendError(res, `Aucun validateur trouvé pour le rôle ${premiereEtape.role}`, 500);
    }
    
    const dateLimite = new Date();
    dateLimite.setHours(dateLimite.getHours() + (circuit.delaiParDefaut || 48));
    
    await prisma.validationEtape.create({
      data: {
        demandeId: id,
        niveauEtape: 1,
        acteurId: premierValidateur.id,
        dateLimite
      }
    });
    
    // ✅ Correction: utiliser les valeurs de l'enum
    const nouveauStatut = STATUT_PAR_ROLE[premiereEtape.role] || 'EN_VALIDATION_DIR';
    
    await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        statut: nouveauStatut as any, // ← Cast en any pour l'enum
        etapeActuelle: 1
      }
    });
    
    console.log(`
📧 [VALIDATION] Demande soumise - ${premierValidateur.email}
   Demande: ${demande.reference}
   Poste: ${demande.intitulePoste}
   Budget: ${demande.budgetEstime} DT
   Délai: ${circuit.delaiParDefaut}h
    `);
    
    sendSuccess(res, {
      demande: {
        ...demande,
        circuitType: circuit.type,
        totalEtapes: circuit.totalEtapes,
        prochaineEtape: premiereEtape
      }
    }, 'Demande soumise avec succès');
    
  } catch (error) {
    console.error('❌ submitDemande error:', error);
    sendError(res, 'Erreur lors de la soumission');
  }
};

export const validerDemande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, commentaire } = req.body;
    const userId = (req as any).user.id;
    
    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        validations: {
          where: { decision: 'EN_ATTENTE' },
          orderBy: { niveauEtape: 'desc' }
        },
        circuitConfig: true
      }
    });
    
    if (!demande) return sendNotFound(res, 'Demande non trouvée');
    
    const validationEnCours = demande.validations[0];
    if (!validationEnCours || validationEnCours.acteurId !== userId) {
      return sendForbidden(res, 'Vous n\'êtes pas le validateur de cette étape');
    }
    
    await prisma.validationEtape.update({
      where: { id: validationEnCours.id },
      data: {
        decision: decision === 'Validee' ? 'VALIDEE' : 'REFUSEE',
        commentaire,
        dateDecision: new Date()
      }
    });
    
    if (decision === 'Refusee') {
      await prisma.demandeRecrutement.update({
        where: { id },
        data: { statut: 'REJETEE' as any }
      });
      return sendSuccess(res, null, 'Demande rejetée');
    }
    
    // Vérifier si dernière étape
    if (demande.etapeActuelle === demande.totalEtapes) {
      // Générer l'offre
      const offre = await prisma.offreEmploi.create({
        data: {
          reference: `OFF-${new Date().getFullYear()}-${String(await prisma.offreEmploi.count() + 1).padStart(3, '0')}`,
          intitule: demande.intitulePoste,
          typeContrat: demande.typeContrat,
          statut: 'BROUILLON',
          rhId: userId,
          demandeId: demande.id
        }
      });
      
      // ✅ Correction: utiliser 'offre' au lieu de 'offreId'
      await prisma.demandeRecrutement.update({
        where: { id },
        data: {
          statut: 'VALIDEE' as any,
          valideeAt: new Date(),
          offre: { connect: { id: offre.id } }
        }
      });
      
      return sendSuccess(res, { offre }, 'Demande validée, offre générée');
    }
    
    // Étape suivante
    const etapes = demande.circuitConfig?.etapes as any[] || [];
    const prochaineEtapeConfig = etapes.find((e: any) => e.niveau === demande.etapeActuelle + 1);
    
    if (!prochaineEtapeConfig) {
      return sendError(res, 'Configuration de circuit invalide', 500);
    }
    
    const prochainValidateur = await prisma.user.findFirst({
      where: { role: prochaineEtapeConfig.role, actif: true }
    });
    
    if (!prochainValidateur) {
      return sendError(res, `Aucun validateur trouvé pour le rôle ${prochaineEtapeConfig.role}`, 500);
    }
    
    const dateLimite = new Date();
    dateLimite.setHours(dateLimite.getHours() + (demande.circuitConfig?.delaiParDefaut || 48));
    
    await prisma.validationEtape.create({
      data: {
        demandeId: id,
        niveauEtape: demande.etapeActuelle + 1,
        acteurId: prochainValidateur.id,
        dateLimite
      }
    });
    
    const nouveauStatut = STATUT_PAR_ROLE[prochaineEtapeConfig.role] || 'EN_VALIDATION_DIR';
    
    await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        statut: nouveauStatut as any,
        etapeActuelle: demande.etapeActuelle + 1
      }
    });
    
    console.log(`
📧 [VALIDATION] Étape ${demande.etapeActuelle + 1}/${demande.totalEtapes} validée
   Prochain validateur: ${prochainValidateur.email}
   Demande: ${demande.reference}
    `);
    
    sendSuccess(res, null, 'Étape validée avec succès');
    
  } catch (error) {
    console.error('❌ validerDemande error:', error);
    sendError(res, 'Erreur lors de la validation');
  }
};