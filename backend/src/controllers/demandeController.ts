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

// Ordre hiérarchique des rôles (MANAGER n'est pas une étape du circuit)
const ROLE_ORDER = ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'];

const generateReference = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.demandeRecrutement.count({
    where: { reference: { startsWith: `DEM-${year}` } }
  });
  return `DEM-${year}-${String(count + 1).padStart(3, '0')}`;
};

// ============================================
// DÉTERMINER LE CIRCUIT SELON LE TYPE DE POSTE
// ============================================
const determinerCircuitParTypePoste = async (typePosteId: string) => {
  const typePoste = await prisma.typePoste.findUnique({
    where: { id: typePosteId }
  });

  if (!typePoste) return null;

  const circuit = await prisma.circuitConfig.findFirst({
    where: { actif: true, type: typePoste.circuitType }
  });

  return circuit;
};

// ============================================
// DÉTERMINER LES ÉTAPES APRÈS LE CRÉATEUR
// ============================================
const determinerEtapesApresCreateur = (
  createurRole: string,
  etapesOriginales: any[]
): any[] => {
  const createurIndex = ROLE_ORDER.indexOf(createurRole);

  if (createurIndex === -1) return etapesOriginales;

  // Garder uniquement les étapes dont le rôle est STRICTEMENT après le créateur
  return etapesOriginales.filter(etape => {
    const etapeIndex = ROLE_ORDER.indexOf(etape.role);
    return etapeIndex > createurIndex;
  });
};

// ============================================
// TROUVER LE VALIDATEUR
// ============================================
const trouverValidateur = async (role: string, directionId: string | null) => {
  const rolesTransversaux = ['DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'];

  if (rolesTransversaux.includes(role)) {
    return await prisma.user.findFirst({
      where: { role: role as any, actif: true }
    });
  }

  if (role === 'DIRECTEUR' && directionId) {
    return await prisma.user.findFirst({
      where: { role: 'DIRECTEUR', actif: true, directionId }
    });
  }

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
// VÉRIFIER LES DROITS DU CRÉATEUR
// ============================================
const verifierDroitsCreateur = (
  createurRole: string,
  circuitType: string
): { valid: boolean; message?: string } => {
  // DAF : uniquement CADRE_SUPERIEUR ou STRATEGIQUE
  if (createurRole === 'DAF') {
    const allowedTypes = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];
    if (!allowedTypes.includes(circuitType)) {
      return {
        valid: false,
        message: 'Le DAF ne peut créer que des demandes pour des postes de cadre supérieur ou stratégique'
      };
    }
  }

  // DGA : uniquement CADRE_SUPERIEUR ou STRATEGIQUE
  if (createurRole === 'DGA') {
    const allowedTypes = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];
    if (!allowedTypes.includes(circuitType)) {
      return {
        valid: false,
        message: 'Le DGA ne peut créer que des demandes pour des postes de cadre supérieur ou stratégique'
      };
    }
  }

  // DG : uniquement CADRE_SUPERIEUR ou STRATEGIQUE
  if (createurRole === 'DG') {
    const allowedTypes = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];
    if (!allowedTypes.includes(circuitType)) {
      return {
        valid: false,
        message: 'Le DG ne peut créer que des demandes pour des postes de cadre supérieur ou stratégique'
      };
    }
  }

  return { valid: true };
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
          typePoste: { select: { id: true, nom: true, circuitType: true } },
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
        createur: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
        manager: { select: { id: true, nom: true, prenom: true, email: true } },
        direction: { select: { id: true, code: true, nom: true } },
        typePoste: { select: { id: true, nom: true, circuitType: true } },
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
    console.error('❌ getDemandeById error:', error);
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
      intitulePoste, typePosteId, justification, motif, commentaireMotif,
      personneRemplaceeNom, fonctionRemplacee, typeContrat, priorite,
      budgetMin, budgetMax, dateSouhaitee, description, disponibilites, directionId
    } = req.body;

    if (!intitulePoste || !typePosteId || !justification || !motif || !typeContrat || !priorite || !budgetMin || !budgetMax || !dateSouhaitee) {
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

    const typePoste = await prisma.typePoste.findFirst({
      where: { id: typePosteId, directionId: targetDirectionId, actif: true }
    });

    if (!typePoste) return sendError(res, 'Type de poste non valide pour cette direction', 400);

    const droits = verifierDroitsCreateur(userRole, typePoste.circuitType);
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
        createur: { connect: { id: userId } },
        manager: manager ? { connect: { id: manager.id } } : undefined,
        direction: { connect: { id: targetDirectionId! } },
        typePoste: { connect: { id: typePosteId } },
        disponibilites: disponibilites?.length > 0
          ? { create: disponibilites.map((d: any) => ({ date: new Date(d.date), heureDebut: d.heureDebut, heureFin: d.heureFin })) }
          : undefined
      },
      include: { disponibilites: true, direction: true, typePoste: true, manager: true }
    });

    await createAuditLog(
      userId, 'CREATE_DEMANDE', 'DemandeRecrutement', demande.id,
      `Création de la demande ${reference} pour le poste ${intitulePoste} (direction: ${targetDirectionId})`
    );

    if (manager && manager.id !== userId && userRole !== 'MANAGER') {
      await notifierManager(manager.id, `${userPrenom} ${userNom}`, reference);
    }

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
      include: { direction: true, typePoste: true, createur: true }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvée');

    if (demande.createurId !== userId && demande.managerId !== userId) {
      return sendForbidden(res, "Vous n'êtes pas autorisé à soumettre cette demande");
    }

    if (demande.statut !== 'BROUILLON') {
      return sendError(res, `Seules les demandes au statut Brouillon peuvent être soumises. Statut actuel: ${demande.statut}`, 400);
    }

    if (!demande.typePosteId) {
      return sendError(res, 'La demande doit avoir un type de poste', 400);
    }

    const circuit = await determinerCircuitParTypePoste(demande.typePosteId);
    if (!circuit) {
      return sendError(res, 'Aucun circuit de validation trouvé pour ce type de poste', 400);
    }

    const etapesOriginales = circuit.etapes as any[];
    const etapes = determinerEtapesApresCreateur(demande.createur.role, etapesOriginales);

    console.log(`🔧 Créateur: ${demande.createur.role} → Étapes: ${etapes.map((e: any) => e.role).join(' → ') || '(aucune)'}`);

    if (etapes.length === 0) {
      await prisma.demandeRecrutement.update({
        where: { id },
        data: {
          statut: 'VALIDEE',
          valideeAt: new Date(),
          circuitType: circuit.type,
          totalEtapes: 0,
          circuitConfigId: circuit.id,
          etapeActuelle: 0
        }
      });

      await createAuditLog(userId, 'SUBMIT_DEMANDE_DIRECT', 'DemandeRecrutement', demande.id,
        `Validation directe de la demande ${demande.reference}`);

      return sendSuccess(res, null, 'Demande validée automatiquement');
    }

    await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        circuitType: circuit.type,
        totalEtapes: etapes.length,
        circuitConfigId: circuit.id,
        etapeActuelle: 0
      }
    });

    const premiereEtape = etapes[0];
    const premierValidateur = await trouverValidateur(premiereEtape.role, demande.directionId);

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

    const nouveauStatut = STATUT_PAR_ROLE[premiereEtape.role] || 'EN_VALIDATION_DIR';

    await prisma.demandeRecrutement.update({
      where: { id },
      data: { statut: nouveauStatut as any }
    });

    await createAuditLog(userId, 'SUBMIT_DEMANDE', 'DemandeRecrutement', demande.id,
      `Soumission de la demande ${demande.reference}`);

    await emailService.sendValidationNotification({
      nom: premierValidateur.nom,
      prenom: premierValidateur.prenom,
      email: premierValidateur.email,
      demandeRef: demande.reference,
      demandePoste: demande.intitulePoste,
      etape: 1,
      totalEtapes: etapes.length,
      role: premiereEtape.role,
      dateLimite,
      actionUrl: `${process.env.FRONTEND_URL}/validations/${demande.id}`
    });

    sendSuccess(res, {
      demande: {
        ...demande,
        circuitType: circuit.type,
        totalEtapes: etapes.length,
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

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        validations: {
          where: { decision: 'EN_ATTENTE' },
          orderBy: { niveauEtape: 'desc' }
        },
        circuitConfig: true,
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

    if (userRole === 'DIRECTEUR' && userDirectionId !== demande.directionId) {
      return sendForbidden(res, 'Vous ne pouvez valider que les demandes de votre propre direction');
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

    if (nouvellesEtapesValidees === demande.totalEtapes) {
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
          offre: { connect: { id: offre.id } },
          etapeActuelle: nouvellesEtapesValidees
        }
      });

      await createAuditLog(userId, 'VALIDATE_DEMANDE_FINAL', 'DemandeRecrutement', demande.id,
        `Validation finale de la demande ${demande.reference}, offre ${offre.reference} générée`);

      const notifPayload = {
        demandeRef: demande.reference, offreRef: offre.reference,
        poste: demande.intitulePoste,
        actionUrl: `${process.env.FRONTEND_URL}/offres/${offre.id}`
      };

      await emailService.sendOffreGenereeNotification({ ...notifPayload, nom: demande.createur.nom, prenom: demande.createur.prenom, email: demande.createur.email });

      if (demande.manager && demande.manager.id !== demande.createur.id) {
        await emailService.sendOffreGenereeNotification({ ...notifPayload, nom: demande.manager.nom, prenom: demande.manager.prenom, email: demande.manager.email });
      }

      return sendSuccess(res, { offre }, 'Demande validée, offre générée');
    }

    const etapesOriginales = demande.circuitConfig?.etapes as any[] || [];
    const etapesFiltrees = determinerEtapesApresCreateur(demande.createur.role, etapesOriginales);

    const prochaineEtapeConfig = etapesFiltrees[nouvellesEtapesValidees];

    if (!prochaineEtapeConfig) {
      return sendError(res, 'Configuration de circuit invalide', 500);
    }

    const prochainValidateur = await trouverValidateur(prochaineEtapeConfig.role, demande.directionId);

    if (!prochainValidateur) {
      return sendError(res, `Aucun validateur trouvé pour le rôle ${prochaineEtapeConfig.role}`, 500);
    }

    const dateLimite = new Date();
    dateLimite.setHours(dateLimite.getHours() + (demande.circuitConfig?.delaiParDefaut || 48));

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
      data: { statut: nouveauStatut as any, etapeActuelle: nouvellesEtapesValidees }
    });

    await emailService.sendValidationNotification({
      nom: prochainValidateur.nom,
      prenom: prochainValidateur.prenom,
      email: prochainValidateur.email,
      demandeRef: demande.reference,
      demandePoste: demande.intitulePoste,
      etape: nouvellesEtapesValidees + 1,
      totalEtapes: demande.totalEtapes!,
      role: prochaineEtapeConfig.role,
      dateLimite,
      actionUrl: `${process.env.FRONTEND_URL}/validations/${demande.id}`
    });

    sendSuccess(res, null, 'Étape validée avec succès');

  } catch (error) {
    console.error('❌ validerDemande error:', error);
    sendError(res, 'Erreur lors de la validation');
  }
};