import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden } from '../utils/helpers';
import { emailService } from '../services/email.service';
// Mapping statut par rôle
const STATUT_PAR_ROLE: Record<string, string> = {
  DIRECTEUR: 'EN_VALIDATION_DIR',
  DRH: 'EN_VALIDATION_DRH',
  DAF: 'EN_VALIDATION_DAF',
  DGA: 'EN_VALIDATION_DGA',
  DG: 'EN_VALIDATION_DG',
};

const generateReference = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.demandeRecrutement.count({
    where: { reference: { startsWith: `DEM-${year}` } }
  });
  return `DEM-${year}-${String(count + 1).padStart(3, '0')}`;
};

// ============================================
// Déterminer le circuit selon le budget
// ============================================
const determinerCircuitParBudget = async (budget: number) => {
  const circuit = await prisma.circuitConfig.findFirst({
    where: {
      actif: true,
      OR: [
        { seuilMin: { lte: budget }, seuilMax: { gte: budget } },
        { seuilMin: { lte: budget }, seuilMax: null }
      ]
    },
    orderBy: { seuilMin: 'asc' }
  });
  return circuit;
};

// ============================================
// Trouver le validateur selon rôle ET direction
// ============================================
const trouverValidateurParRoleEtDirection = async (role: string, directionId: string | null) => {
  // Rôles transversaux (DRH, DAF, DGA, DG) - pas de direction
  const rolesTransversaux = ['DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'];
  
  if (rolesTransversaux.includes(role)) {
    return await prisma.user.findFirst({
      where: { role: role as any, actif: true }
    });
  }
  
  // Pour DIRECTEUR : chercher celui de la bonne direction
  if (role === 'DIRECTEUR' && directionId) {
    return await prisma.user.findFirst({
      where: { 
        role: 'DIRECTEUR', 
        actif: true,
        directionId: directionId
      }
    });
  }
  
  return null;
};

// ============================================
// CRUD
// ============================================

export const getDemandes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const userDirectionId = (req as any).user.directionId;
    const { page = 1, limit = 10, statut, priorite } = req.query;
    
    const where: any = {};
    
    // Filtrage selon le rôle
    if (userRole === 'MANAGER') {
      where.managerId = userId;
    } else if (userRole === 'DIRECTEUR') {
      // DIRECTEUR voit uniquement les demandes de SA direction
      where.directionId = userDirectionId;
    } else if (['DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'].includes(userRole)) {
      // Rôles transversaux voient tout
    } else {
      where.managerId = userId;
    }
    
    if (statut) where.statut = statut;
    if (priorite) where.priorite = priorite;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [demandes, total] = await Promise.all([
      prisma.demandeRecrutement.findMany({
        where,
        include: {
          manager: { select: { id: true, nom: true, prenom: true, email: true, directionId: true } },
          direction: { select: { id: true, code: true, nom: true } },
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
        manager: { select: { id: true, nom: true, prenom: true, email: true, directionId: true } },
        direction: { select: { id: true, code: true, nom: true } },
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

    // Récupérer le manager avec sa direction
    const manager = await prisma.user.findUnique({
      where: { id: userId },
      include: { direction: true }
    });

    if (!manager?.directionId) {
      return sendError(res, 'Votre compte manager n\'est rattaché à aucune direction. Contactez le Super Admin.', 400);
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
        budgetEstime: Number(budgetEstime),
        dateSouhaitee: new Date(dateSouhaitee),
        statut: 'BROUILLON',
        manager: { connect: { id: userId } },
        direction: { connect: { id: manager.directionId } },
        disponibilites: disponibilites ? {
          create: disponibilites.map((d: any) => ({
            date: new Date(d.date),
            heureDebut: d.heureDebut,
            heureFin: d.heureFin
          }))
        } : undefined
      },
      include: { disponibilites: true, direction: true }
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
      where: { id },
      include: { direction: true }
    });
    
    if (!demande) return sendNotFound(res, 'Demande non trouvée');
    if (demande.managerId !== userId) return sendForbidden(res);
    if (demande.statut !== 'BROUILLON') {
      return sendError(res, 'Seules les demandes au statut Brouillon peuvent être soumises', 400);
    }
    
    // Déterminer le circuit selon le budget
    const circuit = await determinerCircuitParBudget(Number(demande.budgetEstime));
    if (!circuit) return sendError(res, 'Aucun circuit de validation trouvé pour ce budget', 400);
    
    const etapes = circuit.etapes as any[];
    if (etapes.length === 0) return sendError(res, 'Le circuit ne contient aucune étape', 500);
    
    // Mettre à jour la demande avec le circuit
    await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        circuitType: circuit.type,
        totalEtapes: circuit.totalEtapes,
        circuitConfigId: circuit.id
      }
    });
    
    // Première étape : DIRECTEUR de la BONNE direction
    const premiereEtape = etapes[0];
    const premierValidateur = await trouverValidateurParRoleEtDirection(
      premiereEtape.role, 
      demande.directionId
    );
    
    if (!premierValidateur) {
      return sendError(res, `Aucun validateur trouvé pour le rôle ${premiereEtape.role} dans la direction ${demande.direction?.nom || 'inconnue'}`, 500);
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
    
    const nouveauStatut = STATUT_PAR_ROLE[premiereEtape.role] || 'EN_VALIDATION_DIR';
    
    await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        statut: nouveauStatut as any,
        etapeActuelle: 1
      }
    });
    
    console.log(`
📧 [SOUMISSION] Demande soumise par ${(req as any).user.email}
   📄 Demande: ${demande.reference}
   🏢 Direction: ${demande.direction?.nom}
   👤 Validateur: ${premierValidateur.email} (${premiereEtape.role})
   ⏰ Délai: ${circuit.delaiParDefaut}h
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
    const userRole = (req as any).user.role;
    const userDirectionId = (req as any).user.directionId;
    
    // ========== LOGS DE DIAGNOSTIC ==========
    console.log('\n=== 🔍 DIAGNOSTIC VALIDATION ===');
    console.log('📌 User ID:', userId);
    console.log('📌 User Role:', userRole);
    console.log('📌 User DirectionId:', userDirectionId);
    console.log('📌 Demande ID:', id);
    
    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        validations: {
          where: { decision: 'EN_ATTENTE' },
          orderBy: { niveauEtape: 'desc' }
        },
        circuitConfig: true,
        direction: true,
        manager: {
          include: { direction: true }
        }
      }
    });
    
    if (!demande) {
      console.log('❌ Demande non trouvée');
      return sendNotFound(res, 'Demande non trouvée');
    }
    
    console.log('\n📄 INFOS DEMANDE:');
    console.log('   Référence:', demande.reference);
    console.log('   Statut:', demande.statut);
    console.log('   DirectionId:', demande.directionId);
    console.log('   Direction:', demande.direction?.nom);
    console.log('   Manager:', demande.manager?.email);
    console.log('   Manager DirectionId:', demande.manager?.directionId);
    console.log('   Étape actuelle:', demande.etapeActuelle);
    console.log('   Total étapes:', demande.totalEtapes);
    
    console.log('\n📋 VALIDATIONS EN ATTENTE:');
    demande.validations.forEach(v => {
      console.log(`   - Niveau ${v.niveauEtape}: acteurId=${v.acteurId}`);
    });
    
    const validationEnCours = demande.validations[0];
    if (!validationEnCours) {
      console.log('❌ Aucune validation en attente');
      return sendForbidden(res, 'Aucune validation en cours pour cette demande');
    }
    
    console.log('\n✅ Validation en cours trouvée:');
    console.log('   Niveau:', validationEnCours.niveauEtape);
    console.log('   ActeurId attendu:', validationEnCours.acteurId);
    console.log('   ActeurId connecté:', userId);
    console.log('   Match:', validationEnCours.acteurId === userId);
    
    // Récupérer l'acteur attendu pour debug
    const acteurAttendu = await prisma.user.findUnique({
      where: { id: validationEnCours.acteurId },
      select: { id: true, email: true, role: true, directionId: true }
    });
    console.log('\n👤 ACTEUR ATTENDU:');
    console.log('   ID:', acteurAttendu?.id);
    console.log('   Email:', acteurAttendu?.email);
    console.log('   Role:', acteurAttendu?.role);
    console.log('   DirectionId:', acteurAttendu?.directionId);
    
    // Récupérer l'utilisateur connecté pour debug
    const userConnecte = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, directionId: true }
    });
    console.log('\n👤 UTILISATEUR CONNECTÉ:');
    console.log('   ID:', userConnecte?.id);
    console.log('   Email:', userConnecte?.email);
    console.log('   Role:', userConnecte?.role);
    console.log('   DirectionId:', userConnecte?.directionId);
    
    if (validationEnCours.acteurId !== userId) {
      console.log('\n❌ ERREUR: L\'utilisateur connecté n\'est pas le validateur attendu!');
      return sendForbidden(res, 'Vous n\'êtes pas le validateur de cette étape');
    }
    
    // Vérification supplémentaire pour DIRECTEUR : doit être de la bonne direction
    if (userRole === 'DIRECTEUR') {
      console.log('\n🔍 VÉRIFICATION DIRECTION:');
      console.log('   User DirectionId:', userDirectionId);
      console.log('   Demande DirectionId:', demande.directionId);
      console.log('   Match:', userDirectionId === demande.directionId);
      
      if (userDirectionId !== demande.directionId) {
        console.log('❌ ERREUR: Le Directeur n\'est pas de la bonne direction');
        return sendForbidden(res, 'Vous ne pouvez valider que les demandes de votre propre direction');
      }
    }
    
    console.log('✅ Toutes les vérifications passées, validation en cours...\n');
    
    // ... suite du code (inchangé)
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
    
    const prochainValidateur = await trouverValidateurParRoleEtDirection(
      prochaineEtapeConfig.role,
      demande.directionId
    );
    
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
    
    sendSuccess(res, null, 'Étape validée avec succès');
    
  } catch (error) {
    console.error('❌ validerDemande error:', error);
    sendError(res, 'Erreur lors de la validation');
  }
};