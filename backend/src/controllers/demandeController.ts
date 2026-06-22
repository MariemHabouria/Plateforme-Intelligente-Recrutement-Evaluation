import { triggerCircuitRecrutement, triggerDecisionCircuit } from '../services/n8nService';
import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden } from '../utils/helpers';

// Mapping statut par role
const STATUT_PAR_ROLE: Record<string, string> = {
  DIRECTEUR: 'EN_VALIDATION_DIR',
  DRH: 'EN_VALIDATION_DRH',
  DAF: 'EN_VALIDATION_DAF',
  DGA: 'EN_VALIDATION_DGA',
  DG: 'EN_VALIDATION_DG',
};

const ROLE_ORDER = ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'];

const VALIDATEURS_PAR_NIVEAU: Record<string, string[]> = {
  TECHNICIEN:      ['MANAGER', 'DIRECTEUR', 'DRH'],
  EMPLOYE:         ['MANAGER', 'DIRECTEUR', 'DRH'],
  CADRE_DEBUTANT:  ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF'],
  CADRE_CONFIRME:  ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA'],
  CADRE_SUPERIEUR: ['DIRECTEUR', 'DRH', 'DAF', 'DGA'],
  STRATEGIQUE:     ['DIRECTEUR', 'DRH', 'DAF', 'DGA'],
};

const NIVEAUX_AVEC_DIRECTION = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];

const determinerInterviewers = (niveau: string) => {
  return {
    rh: true,
    technique: 'MANAGER',
    direction: NIVEAUX_AVEC_DIRECTION.includes(niveau) ? 'DIRECTEUR' : null
  };
};

// ============================================
// CALCULER LA DATE LIMITE (48h en prod, configurable en test)
// ============================================
const calculerDateLimite = (): Date => {
  const delaiMinutesTest = parseInt(process.env.DELAI_RELANCE_MINUTES || '0');
  const dateLimite = new Date();
  if (delaiMinutesTest > 0) {
    dateLimite.setMinutes(dateLimite.getMinutes() + delaiMinutesTest);
  } else {
    dateLimite.setHours(dateLimite.getHours() + 48);
  }
  return dateLimite;
};

// ============================================
// DETERMINER LE CIRCUIT
// ============================================
const determinerCircuit = async (
  niveau: string,
  createurRole: string
): Promise<{ etapes: any[]; totalEtapes: number; totalEtapesComplet: number }> => {
  let validateursNaturels = VALIDATEURS_PAR_NIVEAU[niveau] || ['DIRECTEUR', 'DRH'];

  const dgaActif = await prisma.user.findFirst({
    where: { role: 'DGA', actif: true }
  });

  console.log(`DGA actif: ${dgaActif ? 'oui' : 'non -> DG prend le relais'}`);

  if (!dgaActif) {
    validateursNaturels = validateursNaturels.map(role => 
      role === 'DGA' ? 'DG' : role
    );
  }

  const totalEtapesComplet = validateursNaturels.length;

  const validateursFiltres = validateursNaturels.filter(role => role !== createurRole);

  console.log(`Circuit final: ${validateursFiltres.join(' -> ') || '(aucun - validation directe)'}`);
  console.log(`Total etapes complet: ${totalEtapesComplet}`);

  const etapes = validateursFiltres.map((role, index) => ({
    niveau: index + 1,
    role,
    label: getRoleLabel(role),
    delai: 48
  }));

  return { 
    etapes, 
    totalEtapes: etapes.length,
    totalEtapesComplet
  };
};

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    'MANAGER': 'Manager', 'DIRECTEUR': 'Directeur', 'DRH': 'DRH',
    'DAF': 'DAF', 'DGA': 'DGA', 'DG': 'DG'
  };
  return labels[role] || role;
};

// ============================================
// TROUVER LE VALIDATEUR
// ============================================
const trouverValidateur = async (role: string, directionId: string | null) => {
  console.log(`Recherche validateur pour role: ${role}, directionId: ${directionId}`);

  const rolesTransversaux = ['DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'];

  if (rolesTransversaux.includes(role)) {
    const validateur = await prisma.user.findFirst({
      where: { role: role as any, actif: true }
    });
    console.log(`Validateur transversal trouve: ${validateur?.email || 'aucun'}`);
    return validateur;
  }

  if (role === 'MANAGER' && directionId) {
    const validateur = await prisma.user.findFirst({
      where: { role: 'MANAGER', actif: true, directionId }
    });
    console.log(`Validateur MANAGER trouve: ${validateur?.email || 'aucun'}`);
    return validateur;
  }

  if (role === 'DIRECTEUR' && directionId) {
    const validateur = await prisma.user.findFirst({
      where: { role: 'DIRECTEUR', actif: true, directionId }
    });
    console.log(`Validateur DIRECTEUR trouve: ${validateur?.email || 'aucun'}`);
    return validateur;
  }

  console.log(`Aucun validateur trouve pour le role: ${role}`);
  return null;
};

// ============================================
// AUDIT LOG
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

const notifierManager = async (managerId: string, createurNom: string, demandeRef: string) => {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (manager) {
    console.log(`[n8n] Manager notification would be sent to: ${manager.email}`);
  }
};

// ============================================
// VERIFIER LES DROITS DU CREATEUR
// ============================================
const verifierDroitsCreateur = (
  createurRole: string,
  niveau: string
): { valid: boolean; message?: string } => {
  if (['DAF', 'DGA', 'DG'].includes(createurRole)) {
    const allowedTypes = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];
    if (!allowedTypes.includes(niveau)) {
      return {
        valid: false,
        message: `Le ${createurRole} ne peut creer que des demandes pour des postes de cadre superieur ou strategique`
      };
    }
  }
  return { valid: true };
};

// ============================================
// REFERENCE UNIQUE
// ============================================
const generateReference = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.demandeRecrutement.count({
    where: { reference: { startsWith: `DEM-${year}` } }
  });
  return `DEM-${year}-${String(count + 1).padStart(3, '0')}`;
};

// ============================================
// GET DEMANDES
// ============================================
export const getDemandes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const userDirectionId = (req as any).user.directionId;
    const { page = 1, limit = 10, statut, priorite, aValider } = req.query;

    const where: any = {};

    if (aValider === 'true') {
      const rolesValidateurs = ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'];
      if (rolesValidateurs.includes(userRole)) {
        where.validations = {
          some: { acteurId: userId, decision: 'EN_ATTENTE' }
        };
      }
    } else {
      if (userRole === 'MANAGER') {
        where.managerId = userId;
      } else if (userRole === 'DIRECTEUR') {
        where.directionId = userDirectionId;
      } else if (!['DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'].includes(userRole)) {
        where.managerId = userId;
      }
    }

    if (statut) where.statut = statut;
    if (priorite) where.priorite = priorite;

    const skip = (Number(page) - 1) * Number(limit);

    const dgaActif = await prisma.user.findFirst({
      where: { role: 'DGA', actif: true }
    });

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

    const demandesAvecDga = demandes.map(d => ({
      ...d,
      dgaActif: !!dgaActif
    }));

    sendSuccess(res, {
      demandes: demandesAvecDga,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('getDemandes error:', error);
    sendError(res, 'Erreur lors de la recuperation des demandes');
  }
};

// ============================================
// GET DEMANDE BY ID
// ============================================
export const getDemandeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const dgaActif = await prisma.user.findFirst({
      where: { role: 'DGA', actif: true }
    });

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
        offre: true,
        disponibilitesInterviewers: {
          include: {
            user: { select: { id: true, nom: true, prenom: true, role: true } }
          },
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvee');

    const demandeAvecDga = {
      ...demande,
      dgaActif: !!dgaActif
    };

    sendSuccess(res, { demande: demandeAvecDga });

  } catch (error) {
    console.error('getDemandeById error:', error);
    sendError(res, 'Erreur lors de la recuperation de la demande');
  }
};

// ============================================
// CREATE DEMANDE
// ============================================
export const createDemande = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const userNom = (req as any).user.nom;
    const userPrenom = (req as any).user.prenom;

    const {
      intitulePoste, niveau, justification, motif, commentaireMotif,
      personneRemplaceeNom, fonctionRemplacee, typeContrat, priorite,
      budgetMin, budgetMax, dateSouhaitee, description, disponibilites, directionId
    } = req.body;

    if (!intitulePoste || !niveau || !justification || !motif || !typeContrat || !priorite || !budgetMin || !budgetMax || !dateSouhaitee) {
      return sendError(res, 'Tous les champs obligatoires doivent etre remplis', 400);
    }

    if (Number(budgetMin) >= Number(budgetMax)) {
      return sendError(res, 'Le budget minimum doit etre inferieur au budget maximum', 400);
    }

    if (userRole === 'RESP_PAIE') {
      return sendForbidden(res, 'Le responsable Paie ne peut pas creer de demandes de recrutement');
    }

    const createur = await prisma.user.findUnique({
      where: { id: userId },
      include: { direction: true }
    });

    const TRANSVERSAL_ROLES = ['DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'];
    const isTransversal = TRANSVERSAL_ROLES.includes(userRole);

    let targetDirectionId: string | null = null;

    if (isTransversal) {
      if (!directionId) return sendError(res, 'Veuillez selectionner une direction', 400);
      targetDirectionId = directionId;
      const direction = await prisma.direction.findUnique({ where: { id: directionId, actif: true } });
      if (!direction) return sendError(res, 'Direction non trouvee', 400);
    } else {
      if (!createur?.directionId) {
        return sendError(res, "Votre compte n'est rattache a aucune direction", 400);
      }
      targetDirectionId = createur.directionId;
    }

    const droits = verifierDroitsCreateur(userRole, niveau);
    if (!droits.valid) return sendError(res, droits.message!, 403);

    const reference = await generateReference();

    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER', directionId: targetDirectionId, actif: true }
    });

    if (!manager && !isTransversal) {
      return sendError(res, 'Aucun manager trouve pour cette direction', 400);
    }

    let motifData: any = { motif };
    switch (motif) {
      case 'CREATION':    motifData.commentaireMotif = commentaireMotif; break;
      case 'REMPLACEMENT': motifData.personneRemplaceeNom = personneRemplaceeNom; motifData.fonctionRemplacee = fonctionRemplacee; break;
      case 'RENFORCEMENT': motifData.commentaireMotif = commentaireMotif; break;
    }

    const circuitConfig = await prisma.circuitConfig.findFirst({
      where: { type: niveau as any, actif: true }
    });

    const demande = await prisma.demandeRecrutement.create({
      data: {
        reference, intitulePoste, description, justification, ...motifData,
        typeContrat, priorite,
        budgetMin: Number(budgetMin), budgetMax: Number(budgetMax),
        dateSouhaitee: new Date(dateSouhaitee),
        statut: 'BROUILLON', niveau, circuitType: niveau as any,
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

    await createAuditLog(userId, 'CREATE_DEMANDE', 'DemandeRecrutement', demande.id,
      `Creation de la demande ${reference} pour le poste ${intitulePoste} (niveau: ${niveau})`);

    if (manager && manager.id !== userId && userRole !== 'MANAGER') {
      await notifierManager(manager.id, `${userPrenom} ${userNom}`, reference);
    }

    sendCreated(res, demande, 'Demande creee avec succes');

  } catch (error) {
    console.error('createDemande error:', error);
    sendError(res, 'Erreur lors de la creation de la demande');
  }
};

// ============================================
// UPDATE DEMANDE
// ============================================
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

    if (!demande) return sendNotFound(res, 'Demande non trouvee');

    if (demande.createurId !== userId && demande.managerId !== userId && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, "Vous n'etes pas autorise a modifier cette demande");
    }

    if (demande.statut !== 'BROUILLON') {
      return sendError(res, 'Seules les demandes au statut Brouillon peuvent etre modifiees', 400);
    }

    if (data.budgetMin && data.budgetMax && Number(data.budgetMin) >= Number(data.budgetMax)) {
      return sendError(res, 'Le budget minimum doit etre inferieur au budget maximum', 400);
    }

    const anciennesValeurs = {
      intitulePoste: demande.intitulePoste, justification: demande.justification,
      budgetMin: demande.budgetMin, budgetMax: demande.budgetMax
    };

    const updatedDemande = await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        intitulePoste: data.intitulePoste, description: data.description,
        justification: data.justification, motif: data.motif,
        typeContrat: data.typeContrat, priorite: data.priorite,
        budgetMin: data.budgetMin ? Number(data.budgetMin) : undefined,
        budgetMax: data.budgetMax ? Number(data.budgetMax) : undefined,
        dateSouhaitee: data.dateSouhaitee ? new Date(data.dateSouhaitee) : undefined
      }
    });

    await createAuditLog(userId, 'UPDATE_DEMANDE', 'DemandeRecrutement', demande.id,
      `Modification de la demande ${demande.reference}`, anciennesValeurs,
      { intitulePoste: updatedDemande.intitulePoste, justification: updatedDemande.justification,
        budgetMin: updatedDemande.budgetMin, budgetMax: updatedDemande.budgetMax });

    sendSuccess(res, updatedDemande, 'Demande modifiee avec succes');

  } catch (error) {
    console.error('updateDemande error:', error);
    sendError(res, 'Erreur lors de la modification');
  }
};

// ============================================
// DELETE DEMANDE
// ============================================
export const deleteDemande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: { createur: true, manager: true, validations: true, disponibilites: true }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvee');

    if (demande.createurId !== userId && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, "Vous n'etes pas autorise a supprimer cette demande");
    }

    if (demande.statut !== 'BROUILLON') {
      return sendError(res, `Seules les demandes au statut Brouillon peuvent etre supprimees. Statut actuel: ${demande.statut}`, 400);
    }

    if (demande.validations?.length > 0) {
      await prisma.validationEtape.deleteMany({ where: { demandeId: id } });
    }
    if (demande.disponibilites?.length > 0) {
      await prisma.disponibilite.deleteMany({ where: { demandeId: id } });
    }

    await createAuditLog(userId, 'DELETE_DEMANDE', 'DemandeRecrutement', demande.id,
      `Suppression de la demande ${demande.reference} par ${(req as any).user.email}`);

    await prisma.demandeRecrutement.delete({ where: { id } });

    sendSuccess(res, null, 'Demande supprimee avec succes');

  } catch (error) {
    console.error('deleteDemande error:', error);
    sendError(res, 'Erreur lors de la suppression');
  }
};

// ============================================
// SUBMIT DEMANDE
// ============================================
export const submitDemande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: { direction: true, createur: true }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvee');

    if (demande.createurId !== userId && demande.managerId !== userId) {
      return sendForbidden(res, "Vous n'etes pas autorise a soumettre cette demande");
    }

    if (demande.statut !== 'BROUILLON') {
      return sendError(res, `Seules les demandes au statut Brouillon peuvent etre soumises. Statut actuel: ${demande.statut}`, 400);
    }

    if (!demande.niveau) {
      return sendError(res, 'La demande doit avoir un niveau de poste', 400);
    }

    const { etapes, totalEtapes, totalEtapesComplet } = await determinerCircuit(demande.niveau, demande.createur.role);
    const rolesCircuit = etapes.map((e: any) => e.role);

    console.log(`Circuit: ${rolesCircuit.join(' -> ') || '(aucune)'}`);
    console.log(`Total etapes (avec filtrage): ${totalEtapes}`);
    console.log(`Total etapes complet: ${totalEtapesComplet}`);

    const interviewers = determinerInterviewers(demande.niveau);

    if (!rolesCircuit.includes('MANAGER')) {
      const manager = await prisma.user.findFirst({
        where: { role: 'MANAGER', directionId: demande.directionId || undefined, actif: true }
      });
      if (manager) console.log(`[n8n] Availability request would be sent to MANAGER: ${manager.email}`);
    }

    if (interviewers.direction === 'DIRECTEUR' && !rolesCircuit.includes('DIRECTEUR')) {
      const directeur = await prisma.user.findFirst({
        where: { role: 'DIRECTEUR', directionId: demande.directionId || undefined, actif: true }
      });
      if (directeur) console.log(`[n8n] Availability request would be sent to DIRECTEUR: ${directeur.email}`);
    }

    if (etapes.length === 0) {
      await prisma.demandeRecrutement.update({
        where: { id },
        data: { statut: 'VALIDEE', valideeAt: new Date(), etapeActuelle: 0, totalEtapes: 0 }
      });
      await createAuditLog(userId, 'SUBMIT_DEMANDE_DIRECT', 'DemandeRecrutement', demande.id,
        `Validation directe de la demande ${demande.reference}`);
      return sendSuccess(res, null, 'Demande validee automatiquement');
    }

    await prisma.demandeRecrutement.update({
      where: { id },
      data: { 
        totalEtapes: totalEtapesComplet,
        etapeActuelle: 0 
      }
    });

    const premiereEtape = etapes[0];
    const premierValidateur = await trouverValidateur(premiereEtape.role, demande.directionId);

    if (!premierValidateur) {
      return sendError(res, `Aucun validateur trouve pour le role ${premiereEtape.role}`, 500);
    }

    const dateLimite = calculerDateLimite();

    await prisma.validationEtape.create({
      data: { demandeId: id, niveauEtape: 1, acteurId: premierValidateur.id, dateLimite }
    });

    const nouveauStatut = STATUT_PAR_ROLE[premiereEtape.role] || 'EN_VALIDATION_DIR';

    await prisma.demandeRecrutement.update({
      where: { id },
      data: { statut: nouveauStatut as any }
    });

    await createAuditLog(userId, 'SUBMIT_DEMANDE', 'DemandeRecrutement', demande.id,
      `Soumission de la demande ${demande.reference}`);

    sendSuccess(res, {
      demande: { ...demande, totalEtapes: totalEtapesComplet, prochaineEtape: premiereEtape }
    }, 'Demande soumise avec succes');

    triggerCircuitRecrutement(
      id, demande.niveau, 1, false, premiereEtape.role, totalEtapesComplet
    ).catch(console.error);

  } catch (error) {
    console.error('submitDemande error:', error);
    sendError(res, 'Erreur lors de la soumission');
  }
};

// ============================================
// VALIDER DEMANDE
// ============================================
export const validerDemande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, commentaire, disponibilites } = req.body;
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

    if (!demande) return sendNotFound(res, 'Demande non trouvee');
        if (demande.statut === 'ANNULEE') {
      return sendError(res, 'Cette demande a ete annulee. Le DRH doit la relancer avant toute nouvelle validation.', 400);
    }

    const validationEnCours = demande.validations[0];
    if (!validationEnCours || validationEnCours.acteurId !== userId) {
      return sendForbidden(res, "Vous n'etes pas le validateur de cette etape");
    }

    if ((userRole === 'MANAGER' || userRole === 'DIRECTEUR') &&
        Array.isArray(disponibilites) && disponibilites.length > 0) {
      await Promise.all(
        disponibilites.map((d: any) =>
          prisma.disponibiliteInterviewer.create({
            data: {
              userId, demandeId: id,
              date: new Date(d.date), heureDebut: d.heureDebut, heureFin: d.heureFin,
              reservee: false
            }
          })
        )
      );
      console.log(`${userRole} a ajoute ${disponibilites.length} disponibilite(s) lors de sa validation`);
    }

    if (userRole === 'DIRECTEUR' && userDirectionId !== demande.directionId) {
      return sendForbidden(res, 'Vous ne pouvez valider que les demandes de votre propre direction');
    }

    if (userRole === 'MANAGER' && demande.managerId !== userId) {
      return sendForbidden(res, 'Vous ne pouvez valider que les demandes de votre equipe');
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
      'DemandeRecrutement', demande.id,
      `${decision === 'Validee' ? 'Validation' : 'Rejet'} de l'etape ${validationEnCours.niveauEtape} de la demande ${demande.reference}`,
      null, { decision, commentaire }
    );

    if (decision === 'Refusee') {
      await prisma.demandeRecrutement.update({
        where: { id },
        data: { statut: 'REJETEE' as any }
      });

      triggerDecisionCircuit({
        demandeId: id, decision: 'REJETEE', niveauPoste: demande.niveau,
        etape: validationEnCours.niveauEtape, totalEtapes: demande.totalEtapes || 0,
        isLast: false, roleValidateur: userRole
      }).catch(console.error);

      return sendSuccess(res, null, 'Demande rejetee');
    }

    const nouvellesEtapesValidees = validationEnCours.niveauEtape;

    if (nouvellesEtapesValidees >= (demande.totalEtapes || 0)) {
      console.log('Derniere etape - Validation finale de la demande');

      await prisma.demandeRecrutement.update({
        where: { id },
        data: { statut: 'VALIDEE' as any, valideeAt: new Date(), etapeActuelle: nouvellesEtapesValidees }
      });

      await createAuditLog(userId, 'VALIDATE_DEMANDE_FINAL', 'DemandeRecrutement', demande.id,
        `Validation finale de la demande ${demande.reference}`);

      triggerDecisionCircuit({
        demandeId: id, decision: 'VALIDEE', niveauPoste: demande.niveau,
        etape: nouvellesEtapesValidees, totalEtapes: demande.totalEtapes || 0,
        isLast: true, roleValidateur: userRole
      }).catch(console.error);

      return sendSuccess(res, null, 'Demande validee avec succes');
    }

    const { etapes } = await determinerCircuit(demande.niveau, demande.createur.role);
    const prochaineEtapeConfig = etapes[nouvellesEtapesValidees];

    console.log(`Etape validee: ${nouvellesEtapesValidees}`);
    console.log(`Circuit complet: ${etapes.map((e: any) => e.role).join(' -> ')}`);
    console.log(`Prochaine etape: ${prochaineEtapeConfig?.role}`);

    if (!prochaineEtapeConfig) {
      return sendError(res, 'Configuration de circuit invalide', 500);
    }

    const prochainValidateur = await trouverValidateur(prochaineEtapeConfig.role, demande.directionId);

    if (!prochainValidateur) {
      return sendError(res, `Aucun validateur trouve pour le role ${prochaineEtapeConfig.role}`, 500);
    }

    const dateLimite = calculerDateLimite();

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

    triggerCircuitRecrutement(
      id, demande.niveau, nouvellesEtapesValidees + 1, false,
      prochaineEtapeConfig.role, demande.totalEtapes || 0
    ).catch(console.error);

    sendSuccess(res, null, 'Etape validee avec succes');

  } catch (error) {
    console.error('validerDemande error:', error);
    sendError(res, 'Erreur lors de la validation');
  }
};

// ============================================
// ENDPOINTS N8N INTERNES
// ============================================
export const getDemandeForN8n = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.N8N_INTERNAL_TOKEN}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        createur: { select: { id: true, nom: true, prenom: true, email: true } }
      }
    });

    if (!demande) return res.status(404).json({ success: false, message: 'Demande not found' });

    res.json({ success: true, data: demande });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateDemandeStatutN8n = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.N8N_INTERNAL_TOKEN}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { statut, niveauRejet } = req.body;

    const demande = await prisma.demandeRecrutement.update({
      where: { id },
      data: {
        statut: statut as any,
        ...(niveauRejet && { etapeActuelle: niveauRejet })
      }
    });

    res.json({ success: true, data: demande });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// CHECK RELANCE (appele par n8n)
// ============================================
export const checkRelance = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.N8N_INTERNAL_TOKEN}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { isSecondCheck } = req.body; // true = 2eme verification (apres le rappel)

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        validations: {
          where: { decision: 'EN_ATTENTE' },
          orderBy: { niveauEtape: 'desc' }
        },
        createur: { select: { nom: true, prenom: true, email: true } },
        direction: { select: { nom: true } }
      }
    });

    if (!demande) return res.status(404).json({ success: false, message: 'Demande not found' });

    const validationEnCours = demande.validations[0];

    // Deja traitee (validee ou rejetee) -> rien a faire
    if (!validationEnCours) {
      return res.json({ success: true, action: 'NONE' });
    }

    const now = new Date();
    const delaiDepasse = validationEnCours.dateLimite && validationEnCours.dateLimite < now;

    console.log('=== DEBUG CHECK-RELANCE ===');
    console.log('DELAI_RELANCE_MINUTES env:', process.env.DELAI_RELANCE_MINUTES);
    console.log('isSecondCheck reçu:', isSecondCheck);
    console.log('dateLimite en DB:', validationEnCours.dateLimite);
    console.log('now:', now);
    console.log('delaiDepasse:', delaiDepasse);
    console.log('===========================');

    if (!delaiDepasse) {
      return res.json({ success: true, action: 'NONE' });
    }

    // Recuperer le validateur bloquant
    const validateurBloquant = await prisma.user.findUnique({
      where: { id: validationEnCours.acteurId },
      select: { nom: true, prenom: true, email: true, role: true }
    });

    // -- 1ere verification : pas encore d'annulation, juste un rappel --
    if (!isSecondCheck) {
      const nouvelleDateLimite = calculerDateLimite();

      await prisma.validationEtape.update({
        where: { id: validationEnCours.id },
        data: { dateLimite: nouvelleDateLimite, relanceEnvoyee: true }
      });

      await createAuditLog(
        validationEnCours.acteurId,
        'RAPPEL_VALIDATION_ENVOYE',
        'DemandeRecrutement',
        demande.id,
        `Rappel envoye a ${validateurBloquant?.role} - etape ${validationEnCours.niveauEtape}`
      );

      return res.json({
        success: true,
        action: 'RAPPEL',
        validateurBloquant: {
          email: validateurBloquant?.email ?? '',
          nom: `${validateurBloquant?.prenom ?? ''} ${validateurBloquant?.nom ?? ''}`.trim(),
          role: validateurBloquant?.role ?? 'N/A'
        },
        demande: {
          id: demande.id,
          reference: demande.reference,
          intitulePoste: demande.intitulePoste,
          direction: demande.direction?.nom ?? 'N/A',
          etape: validationEnCours.niveauEtape,
          totalEtapes: demande.totalEtapes
        }
      });
    }

    // -- 2eme verification : toujours pas traite -> annulation --
    const drh = await prisma.user.findFirst({
      where: { role: 'DRH', actif: true },
      select: { email: true, nom: true, prenom: true }
    });

    await prisma.demandeRecrutement.update({
      where: { id },
      data: { statut: 'ANNULEE' }
    });

    await createAuditLog(
      validationEnCours.acteurId,
      'DEMANDE_ANNULEE_TIMEOUT',
      'DemandeRecrutement',
      demande.id,
      `Demande ${demande.reference} annulee automatiquement - ${validateurBloquant?.role} n'a pas repondu apres rappel`
    );

    return res.json({
      success: true,
      action: 'TIMEOUT',
      createur: {
        email: demande.createur.email,
        nom: demande.createur.nom,
        prenom: demande.createur.prenom
      },
      drh: drh ?? null,
      demande: {
        id: demande.id,
        reference: demande.reference,
        intitulePoste: demande.intitulePoste,
        direction: demande.direction?.nom ?? 'N/A',
        etape: validationEnCours.niveauEtape,
        totalEtapes: demande.totalEtapes
      },
      validateurBloquant: {
        role: validateurBloquant?.role ?? 'N/A',
        nom: `${validateurBloquant?.prenom ?? ''} ${validateurBloquant?.nom ?? ''}`.trim()
      }
    });

  } catch (error) {
    console.error('checkRelance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// RELANCER MANUELLEMENT (DRH)
// ============================================
export const relancerManuellement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Seul le DRH peut relancer une demande annulee');
    }

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        createur: true,
        direction: true,
        validations: {
          orderBy: { niveauEtape: 'desc' },
          take: 1,
          include: {
            acteur: { select: { id: true, nom: true, prenom: true, role: true } }
          }
        }
      }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvee');

    if (demande.statut !== 'ANNULEE') {
      return sendError(res, 'Seules les demandes annulees peuvent etre relancees', 400);
    }

    const derniereValidation = demande.validations[0];
    if (!derniereValidation) {
      return sendError(res, 'Aucune etape de validation trouvee', 500);
    }

    const etapeBloquee = derniereValidation.niveauEtape;

    const validateur = await prisma.user.findUnique({
      where: { id: derniereValidation.acteurId }
    });

    if (!validateur) {
      return sendError(res, 'Validateur introuvable', 500);
    }

    const dateLimite = calculerDateLimite();

    await prisma.validationEtape.create({
      data: {
        demandeId: id,
        niveauEtape: etapeBloquee,
        acteurId: validateur.id,
        dateLimite
      }
    });

    const nouveauStatut = STATUT_PAR_ROLE[validateur.role] || 'EN_VALIDATION_DIR';

    await prisma.demandeRecrutement.update({
      where: { id },
      data: { statut: nouveauStatut as any }
    });

    await createAuditLog(
      userId,
      'RELANCE_MANUELLE_DRH',
      'DemandeRecrutement',
      demande.id,
      `Relance manuelle par le DRH - etape ${etapeBloquee} - validateur: ${validateur.role}`
    );

    triggerCircuitRecrutement(
      id,
      demande.niveau,
      etapeBloquee,
      true,
      validateur.role,
      demande.totalEtapes || 0
    ).catch(console.error);

    sendSuccess(res, null, 'Demande relancee avec succes');

  } catch (error) {
    console.error('relancerManuellement error:', error);
    sendError(res, 'Erreur lors de la relance');
  }
};