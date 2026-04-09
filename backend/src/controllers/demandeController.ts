// backend/src/controllers/demandeController.ts

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

// Ordre hiérarchique des rôles
const ROLE_ORDER = ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'];

// ============================================
// DÉFINITION DES VALIDATEURS NATURELS PAR NIVEAU DE POSTE
// ============================================

const VALIDATEURS_PAR_NIVEAU: Record<string, string[]> = {
  TECHNICIEN: ['MANAGER', 'DIRECTEUR', 'DRH'],
  EMPLOYE: ['MANAGER', 'DIRECTEUR', 'DRH'],
  CADRE_DEBUTANT: ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF'],
  CADRE_CONFIRME: ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA'],
  CADRE_SUPERIEUR: ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'],
  STRATEGIQUE: ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'],
};

// ============================================
// DÉTERMINER LE CIRCUIT SELON LE NIVEAU ET LE CRÉATEUR
// ============================================

const determinerCircuit = (
  niveau: string,
  createurRole: string
): { etapes: any[]; totalEtapes: number } => {
  // Récupérer les validateurs naturels pour ce niveau
  const validateursNaturels = VALIDATEURS_PAR_NIVEAU[niveau] || ['DIRECTEUR', 'DRH'];
  
  console.log(`📋 Validateurs naturels pour niveau ${niveau}: ${validateursNaturels.join(' → ')}`);
  console.log(`👤 Créateur: ${createurRole}`);
  
  // Filtrer pour enlever le créateur s'il est dans la liste
  const validateursFiltres = validateursNaturels.filter(role => role !== createurRole);
  
  console.log(`✅ Circuit final: ${validateursFiltres.join(' → ') || '(aucun - validation directe)'}`);
  
  // Construire les étapes avec niveaux
  const etapes = validateursFiltres.map((role, index) => ({
    niveau: index + 1,
    role: role,
    label: getRoleLabel(role),
    delai: 48
  }));
  
  return {
    etapes,
    totalEtapes: etapes.length
  };
};

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    'MANAGER': 'Manager',
    'DIRECTEUR': 'Directeur',
    'DRH': 'DRH',
    'DAF': 'DAF',
    'DGA': 'DGA',
    'DG': 'DG'
  };
  return labels[role] || role;
};

// ============================================
// TROUVER LE VALIDATEUR
// ============================================
const trouverValidateur = async (role: string, directionId: string | null) => {
  console.log(`🔍 Recherche validateur pour rôle: ${role}, directionId: ${directionId}`);
  
  const rolesTransversaux = ['DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'];

  if (rolesTransversaux.includes(role)) {
    const validateur = await prisma.user.findFirst({
      where: { role: role as any, actif: true }
    });
    console.log(`📌 Validateur transversal trouvé: ${validateur?.email || 'aucun'}`);
    return validateur;
  }

  if (role === 'MANAGER' && directionId) {
    const validateur = await prisma.user.findFirst({
      where: { role: 'MANAGER', actif: true, directionId }
    });
    console.log(`📌 Validateur MANAGER trouvé: ${validateur?.email || 'aucun'}`);
    return validateur;
  }

  if (role === 'DIRECTEUR' && directionId) {
    const validateur = await prisma.user.findFirst({
      where: { role: 'DIRECTEUR', actif: true, directionId }
    });
    console.log(`📌 Validateur DIRECTEUR trouvé: ${validateur?.email || 'aucun'}`);
    return validateur;
  }

  console.log(`❌ Aucun validateur trouvé pour le rôle: ${role}`);
  return null;
};

// ============================================
// CRÉER UN AUDIT LOG
// ============================================
const createAuditLog = async (
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: string,
  anciennesValeurs?: any,
  nouvellesValeurs?: any
) => {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      details: details || null,
      anciennesValeurs: anciennesValeurs ? JSON.stringify(anciennesValeurs) : null,
      nouvellesValeurs: nouvellesValeurs ? JSON.stringify(nouvellesValeurs) : null,
      acteurId: userId
    }
  });
};

// ============================================
// NOTIFIER LE VALIDATEUR
// ============================================
const notifierValidateur = async (
  validateur: any,
  demandeRef: string,
  demandePoste: string,
  etape: number,
  totalEtapes: number,
  role: string,
  dateLimite: Date,
  demandeId: string
) => {
  if (!validateur) return;
  
  await emailService.sendValidationNotification({
    nom: validateur.nom,
    prenom: validateur.prenom,
    email: validateur.email,
    demandeRef,
    demandePoste,
    etape,
    totalEtapes,
    role,
    dateLimite,
    actionUrl: `${process.env.FRONTEND_URL}/validations/${demandeId}`
  });
};

// ============================================
// NOTIFIER LE MANAGER
// ============================================
const notifierManager = async (managerId: string, createurNom: string, demandeRef: string) => {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });

  if (manager) {
    await emailService.sendNotificationEmail({
      nom: manager.nom,
      prenom: manager.prenom,
      email: manager.email,
      message: `${createurNom} a créé une demande de recrutement (${demandeRef}) concernant votre direction.`,
      actionUrl: `${process.env.FRONTEND_URL}/demandes`
    });
  }
};

// ============================================
// VÉRIFIER LES DROITS DU CRÉATEUR SELON LE NIVEAU
// ============================================
const verifierDroitsCreateur = (
  createurRole: string,
  niveau: string
): { valid: boolean; message?: string } => {
  // DAF : uniquement CADRE_SUPERIEUR ou STRATEGIQUE
  if (createurRole === 'DAF') {
    const allowedTypes = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];
    if (!allowedTypes.includes(niveau)) {
      return {
        valid: false,
        message: 'Le DAF ne peut créer que des demandes pour des postes de cadre supérieur ou stratégique'
      };
    }
  }

  // DGA : uniquement CADRE_SUPERIEUR ou STRATEGIQUE
  if (createurRole === 'DGA') {
    const allowedTypes = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];
    if (!allowedTypes.includes(niveau)) {
      return {
        valid: false,
        message: 'Le DGA ne peut créer que des demandes pour des postes de cadre supérieur ou stratégique'
      };
    }
  }

  // DG : uniquement CADRE_SUPERIEUR ou STRATEGIQUE
  if (createurRole === 'DG') {
    const allowedTypes = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];
    if (!allowedTypes.includes(niveau)) {
      return {
        valid: false,
        message: 'Le DG ne peut créer que des demandes pour des postes de cadre supérieur ou stratégique'
      };
    }
  }

  return { valid: true };
};

// ============================================
// GÉNÉRER UNE RÉFÉRENCE UNIQUE
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
    const userDirectionId = (req as any).user.directionId;
    const { page = 1, limit = 10, statut, priorite } = req.query;

    const where: any = {};

    if (userRole === 'MANAGER') {
      where.managerId = userId;
    } else if (userRole === 'DIRECTEUR') {
      where.directionId = userDirectionId;
    } else if (!['DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'].includes(userRole)) {
      where.managerId = userId;
    }

    if (statut) where.statut = statut;
    if (priorite) where.priorite = priorite;

    const skip = (Number(page) - 1) * Number(limit);

    const [demandes, total] = await Promise.all([
      prisma.demandeRecrutement.findMany({
        where,
        include: {
          createur: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
          manager: { select: { id: true, nom: true, prenom: true, email: true } },
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
    console.error('getDemandes error:', error);
    sendError(res, 'Erreur lors de la récupération des demandes');
  }
};

export const getDemandeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        createur: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
        manager: { select: { id: true, nom: true, prenom: true, email: true } },
        direction: { select: { id: true, code: true, nom: true } },
        validations: {
          include: { acteur: { select: { id: true, nom: true, prenom: true, email: true, role: true } } },
          orderBy: { niveauEtape: 'asc' }
        },
        disponibilites: true,
        circuitConfig: true,
        offre: true
      }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvée');

    sendSuccess(res, { demande });

  } catch (error) {
    console.error('getDemandeById error:', error);
    sendError(res, 'Erreur lors de la récupération de la demande');
  }
};

export const createDemande = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const userNom = (req as any).user.nom;
    const userPrenom = (req as any).user.prenom;

    const {
      intitulePoste,
      niveau,
      justification,
      motif,
      commentaireMotif,
      personneRemplaceeNom,
      fonctionRemplacee,
      typeContrat,
      priorite,
      budgetMin,
      budgetMax,
      dateSouhaitee,
      description,
      disponibilites,
      directionId
    } = req.body;

    if (!intitulePoste || !niveau || !justification || !motif || !typeContrat || !priorite || !budgetMin || !budgetMax || !dateSouhaitee) {
      return sendError(res, 'Tous les champs obligatoires doivent être remplis', 400);
    }

    if (Number(budgetMin) >= Number(budgetMax)) {
      return sendError(res, 'Le budget minimum doit être inférieur au budget maximum', 400);
    }

    if (userRole === 'RESP_PAIE') {
      return sendForbidden(res, 'Le responsable Paie ne peut pas créer de demandes de recrutement');
    }

    const createur = await prisma.user.findUnique({
      where: { id: userId },
      include: { direction: true }
    });

    const TRANSVERSAL_ROLES = ['DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'];
    const isTransversal = TRANSVERSAL_ROLES.includes(userRole);

    let targetDirectionId: string | null = null;

    if (isTransversal) {
      if (!directionId) return sendError(res, 'Veuillez sélectionner une direction', 400);
      targetDirectionId = directionId;

      const direction = await prisma.direction.findUnique({ where: { id: directionId, actif: true } });
      if (!direction) return sendError(res, 'Direction non trouvée', 400);
    } else {
      if (!createur?.directionId) {
        return sendError(res, "Votre compte n'est rattaché à aucune direction", 400);
      }
      targetDirectionId = createur.directionId;
    }

    // ✅ Vérifier les droits du créateur selon le niveau
    const droits = verifierDroitsCreateur(userRole, niveau);
    if (!droits.valid) return sendError(res, droits.message!, 403);

    const reference = await generateReference();

    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER', directionId: targetDirectionId, actif: true }
    });

    if (!manager && !isTransversal) {
      return sendError(res, 'Aucun manager trouvé pour cette direction', 400);
    }

    let motifData: any = { motif };
    switch (motif) {
      case 'CREATION':
        motifData.commentaireMotif = commentaireMotif;
        break;
      case 'REMPLACEMENT':
        motifData.personneRemplaceeNom = personneRemplaceeNom;
        motifData.fonctionRemplacee = fonctionRemplacee;
        break;
      case 'RENFORCEMENT':
        motifData.commentaireMotif = commentaireMotif;
        break;
    }

    // ✅ Récupérer le circuit config pour ce niveau
    const circuitConfig = await prisma.circuitConfig.findFirst({
      where: { type: niveau as any, actif: true }
    });

    const demande = await prisma.demandeRecrutement.create({
      data: {
        reference,
        intitulePoste,
        description,
        justification,
        ...motifData,
        typeContrat,
        priorite,
        budgetMin: Number(budgetMin),
        budgetMax: Number(budgetMax),
        dateSouhaitee: new Date(dateSouhaitee),
        statut: 'BROUILLON',
        niveau,
        circuitType: niveau as any,
        totalEtapes: circuitConfig?.totalEtapes || 0,
        createur: { connect: { id: userId } },
        manager: manager ? { connect: { id: manager.id } } : undefined,
        direction: { connect: { id: targetDirectionId! } },
        circuitConfig: circuitConfig ? { connect: { id: circuitConfig.id } } : undefined,
        disponibilites: disponibilites?.length > 0
          ? { create: disponibilites.map((d: any) => ({ date: new Date(d.date), heureDebut: d.heureDebut, heureFin: d.heureFin })) }
          : undefined
      },
      include: { disponibilites: true, direction: true, circuitConfig: true, manager: true }
    });

    await createAuditLog(
      userId, 'CREATE_DEMANDE', 'DemandeRecrutement', demande.id,
      `Création de la demande ${reference} pour le poste ${intitulePoste} (niveau: ${niveau})`
    );

    if (manager && manager.id !== userId && userRole !== 'MANAGER') {
      await notifierManager(manager.id, `${userPrenom} ${userNom}`, reference);
    }

    sendCreated(res, demande, 'Demande créée avec succès');

  } catch (error) {
    console.error('createDemande error:', error);
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
      where: { id },
      include: { createur: true, manager: true }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvée');

    if (demande.createurId !== userId && demande.managerId !== userId && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, "Vous n'êtes pas autorisé à modifier cette demande");
    }

    if (demande.statut !== 'BROUILLON') {
      return sendError(res, 'Seules les demandes au statut Brouillon peuvent être modifiées', 400);
    }

    if (data.budgetMin && data.budgetMax && Number(data.budgetMin) >= Number(data.budgetMax)) {
      return sendError(res, 'Le budget minimum doit être inférieur au budget maximum', 400);
    }

    const anciennesValeurs = {
      intitulePoste: demande.intitulePoste,
      justification: demande.justification,
      budgetMin: demande.budgetMin,
      budgetMax: demande.budgetMax
    };

    const updatedDemande = await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        intitulePoste: data.intitulePoste,
        description: data.description,
        justification: data.justification,
        motif: data.motif,
        typeContrat: data.typeContrat,
        priorite: data.priorite,
        budgetMin: data.budgetMin ? Number(data.budgetMin) : undefined,
        budgetMax: data.budgetMax ? Number(data.budgetMax) : undefined,
        dateSouhaitee: data.dateSouhaitee ? new Date(data.dateSouhaitee) : undefined
      }
    });

    await createAuditLog(
      userId, 'UPDATE_DEMANDE', 'DemandeRecrutement', demande.id,
      `Modification de la demande ${demande.reference}`,
      anciennesValeurs,
      {
        intitulePoste: updatedDemande.intitulePoste,
        justification: updatedDemande.justification,
        budgetMin: updatedDemande.budgetMin,
        budgetMax: updatedDemande.budgetMax
      }
    );

    sendSuccess(res, updatedDemande, 'Demande modifiée avec succès');

  } catch (error) {
    console.error('updateDemande error:', error);
    sendError(res, 'Erreur lors de la modification');
  }
};

export const deleteDemande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: { createur: true, manager: true, validations: true, disponibilites: true }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvée');

    const isCreator = demande.createurId === userId;
    const isSuperAdmin = userRole === 'SUPER_ADMIN';

    if (!isCreator && !isSuperAdmin) {
      return sendForbidden(res, "Vous n'êtes pas autorisé à supprimer cette demande");
    }

    if (demande.statut !== 'BROUILLON') {
      return sendError(res, `Seules les demandes au statut Brouillon peuvent être supprimées. Statut actuel: ${demande.statut}`, 400);
    }

    if (demande.validations?.length > 0) {
      await prisma.validationEtape.deleteMany({ where: { demandeId: id } });
    }

    if (demande.disponibilites?.length > 0) {
      await prisma.disponibilite.deleteMany({ where: { demandeId: id } });
    }

    await createAuditLog(
      userId, 'DELETE_DEMANDE', 'DemandeRecrutement', demande.id,
      `Suppression de la demande ${demande.reference} par ${(req as any).user.email}`
    );

    await prisma.demandeRecrutement.delete({ where: { id } });

    sendSuccess(res, null, 'Demande supprimée avec succès');

  } catch (error) {
    console.error('deleteDemande error:', error);
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
      include: { direction: true, createur: true }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvée');

    if (demande.createurId !== userId && demande.managerId !== userId) {
      return sendForbidden(res, "Vous n'êtes pas autorisé à soumettre cette demande");
    }

    if (demande.statut !== 'BROUILLON') {
      return sendError(res, `Seules les demandes au statut Brouillon peuvent être soumises. Statut actuel: ${demande.statut}`, 400);
    }

    if (!demande.niveau) {
      return sendError(res, 'La demande doit avoir un niveau de poste', 400);
    }

    // ✅ Utiliser le niveau directement
    const { etapes, totalEtapes } = determinerCircuit(
      demande.niveau,
      demande.createur.role
    );

    console.log(`🔧 Circuit déterminé: ${etapes.map((e: any) => e.role).join(' → ') || '(aucune)'}`);

    if (etapes.length === 0) {
      // Validation directe
      await prisma.demandeRecrutement.update({
        where: { id },
        data: {
          statut: 'VALIDEE',
          valideeAt: new Date(),
          etapeActuelle: 0
        }
      });

      await createAuditLog(userId, 'SUBMIT_DEMANDE_DIRECT', 'DemandeRecrutement', demande.id,
        `Validation directe de la demande ${demande.reference}`);

      return sendSuccess(res, null, 'Demande validée automatiquement');
    }

    // Mettre à jour la demande avec les infos du circuit
    await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        totalEtapes: totalEtapes,
        etapeActuelle: 0
      }
    });

    // Créer la première validation
    const premiereEtape = etapes[0];
    const premierValidateur = await trouverValidateur(premiereEtape.role, demande.directionId);

    if (!premierValidateur) {
      return sendError(res, `Aucun validateur trouvé pour le rôle ${premiereEtape.role}`, 500);
    }

    const dateLimite = new Date();
    dateLimite.setHours(dateLimite.getHours() + 48);

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
      data: { statut: nouveauStatut as any }
    });

    await createAuditLog(userId, 'SUBMIT_DEMANDE', 'DemandeRecrutement', demande.id,
      `Soumission de la demande ${demande.reference}`);

    await notifierValidateur(
      premierValidateur,
      demande.reference,
      demande.intitulePoste,
      1,
      totalEtapes,
      premiereEtape.role,
      dateLimite,
      demande.id
    );

    sendSuccess(res, {
      demande: {
        ...demande,
        totalEtapes: totalEtapes,
        prochaineEtape: premiereEtape
      }
    }, 'Demande soumise avec succès');

  } catch (error) {
    console.error('submitDemande error:', error);
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

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        validations: {
          where: { decision: 'EN_ATTENTE' },
          orderBy: { niveauEtape: 'desc' }
        },
        direction: true,
        manager: true,
        createur: true
      }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvée');

    const validationEnCours = demande.validations[0];
    if (!validationEnCours || validationEnCours.acteurId !== userId) {
      return sendForbidden(res, "Vous n'êtes pas le validateur de cette étape");
    }

    // Vérification spécifique pour DIRECTEUR
    if (userRole === 'DIRECTEUR' && userDirectionId !== demande.directionId) {
      return sendForbidden(res, 'Vous ne pouvez valider que les demandes de votre propre direction');
    }

    // Vérification spécifique pour MANAGER
    if (userRole === 'MANAGER' && demande.managerId !== userId) {
      return sendForbidden(res, 'Vous ne pouvez valider que les demandes de votre équipe');
    }

    await prisma.validationEtape.update({
      where: { id: validationEnCours.id },
      data: {
        decision: decision === 'Validee' ? 'VALIDEE' : 'REFUSEE',
        commentaire,
        dateDecision: new Date()
      }
    });

    await createAuditLog(
      userId,
      decision === 'Validee' ? 'VALIDATE_DEMANDE' : 'REJECT_DEMANDE',
      'DemandeRecrutement',
      demande.id,
      `${decision === 'Validee' ? 'Validation' : 'Rejet'} de l'étape ${validationEnCours.niveauEtape} de la demande ${demande.reference}`,
      null,
      { decision, commentaire }
    );

    if (decision === 'Refusee') {
      await prisma.demandeRecrutement.update({
        where: { id },
        data: { statut: 'REJETEE' as any }
      });

      // Notifier le créateur et le manager du refus
      await emailService.sendRejetNotification({
        nom: demande.createur.nom, prenom: demande.createur.prenom,
        email: demande.createur.email, demandeRef: demande.reference,
        poste: demande.intitulePoste, commentaire, role: userRole
      });

      if (demande.manager && demande.manager.id !== demande.createur.id) {
        await emailService.sendRejetNotification({
          nom: demande.manager.nom, prenom: demande.manager.prenom,
          email: demande.manager.email, demandeRef: demande.reference,
          poste: demande.intitulePoste, commentaire, role: userRole
        });
      }

      return sendSuccess(res, null, 'Demande rejetée');
    }

    const nouvellesEtapesValidees = demande.etapeActuelle + 1;

    // Vérifier si c'est la dernière étape
    if (nouvellesEtapesValidees >= (demande.totalEtapes || 0)) {
      console.log('✅ Dernière étape - Validation finale de la demande');
      
      await prisma.demandeRecrutement.update({
        where: { id },
        data: {
          statut: 'VALIDEE' as any,
          valideeAt: new Date(),
          etapeActuelle: nouvellesEtapesValidees
        }
      });

      await createAuditLog(userId, 'VALIDATE_DEMANDE_FINAL', 'DemandeRecrutement', demande.id,
        `Validation finale de la demande ${demande.reference}`);

      // Notifier le DRH qu'il peut créer l'offre
      const drh = await prisma.user.findFirst({ where: { role: 'DRH', actif: true } });
      if (drh) {
        await emailService.sendNotificationEmail({
          nom: drh.nom,
          prenom: drh.prenom,
          email: drh.email,
          message: `La demande ${demande.reference} (${demande.intitulePoste}) a été validée. Vous pouvez maintenant créer l'offre.`,
          actionUrl: `${process.env.FRONTEND_URL}/offres`
        });
      }

      return sendSuccess(res, null, 'Demande validée avec succès');
    }

    // Passer à l'étape suivante
    const { etapes } = determinerCircuit(demande.niveau, demande.createur.role);
    const prochaineEtapeConfig = etapes[nouvellesEtapesValidees];

    if (!prochaineEtapeConfig) {
      return sendError(res, 'Configuration de circuit invalide', 500);
    }

    const prochainValidateur = await trouverValidateur(prochaineEtapeConfig.role, demande.directionId);

    if (!prochainValidateur) {
      return sendError(res, `Aucun validateur trouvé pour le rôle ${prochaineEtapeConfig.role}`, 500);
    }

    const dateLimite = new Date();
    dateLimite.setHours(dateLimite.getHours() + 48);

    await prisma.validationEtape.create({
      data: {
        demandeId: id,
        niveauEtape: nouvellesEtapesValidees + 1,
        acteurId: prochainValidateur.id,
        dateLimite
      }
    });

    const nouveauStatut = STATUT_PAR_ROLE[prochaineEtapeConfig.role] || 'EN_VALIDATION_DIR';

    await prisma.demandeRecrutement.update({
      where: { id },
      data: { 
        statut: nouveauStatut as any, 
        etapeActuelle: nouvellesEtapesValidees 
      }
    });

    await notifierValidateur(
      prochainValidateur,
      demande.reference,
      demande.intitulePoste,
      nouvellesEtapesValidees + 1,
      demande.totalEtapes!,
      prochaineEtapeConfig.role,
      dateLimite,
      demande.id
    );

    sendSuccess(res, null, 'Étape validée avec succès');

  } catch (error) {
    console.error('validerDemande error:', error);
    sendError(res, 'Erreur lors de la validation');
  }
};