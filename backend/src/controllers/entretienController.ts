// backend/src/controllers/entretienController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden } from '../utils/helpers';
import { emailService } from '../services/email.service';

// ============================================
// NIVEAUX AUTORISANT L'ENTRETIEN DIRECTION
// ============================================
const NIVEAUX_AVEC_DIRECTION = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];

// ============================================
// HELPER : trouver le bon interviewer selon le type
// ============================================
const resolveInterviewer = async (
  type: 'RH' | 'TECHNIQUE' | 'DIRECTION',
  userId: string,
  directionId: string | null
): Promise<{ id: string; nom: string; prenom: string; email: string } | null> => {
  if (type === 'RH') {
    const drh = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nom: true, prenom: true, email: true }
    });
    return drh;
  }

  if (type === 'TECHNIQUE') {
    if (!directionId) return null;
    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER', directionId, actif: true },
      select: { id: true, nom: true, prenom: true, email: true }
    });
    return manager;
  }

  if (type === 'DIRECTION') {
    if (!directionId) return null;
    const directeur = await prisma.user.findFirst({
      where: { role: 'DIRECTEUR', directionId, actif: true },
      select: { id: true, nom: true, prenom: true, email: true }
    });
    return directeur;
  }

  return null;
};

// ============================================
// CREER UN ENTRETIEN
// ============================================
export const createEntretien = async (req: Request, res: Response) => {
  try {
    const { candidatureId, type, date, heure, lieu, disponibiliteId } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Seul le DRH peut planifier des entretiens');
    }

    if (!candidatureId || !type || !lieu) {
      return sendError(res, 'Candidature, type et lieu sont requis', 400);
    }

    const typesValides = ['RH', 'TECHNIQUE', 'DIRECTION'];
    if (!typesValides.includes(type)) {
      return sendError(res, 'Type invalide. Valeurs: RH, TECHNIQUE, DIRECTION', 400);
    }

    const candidature = await prisma.candidature.findUnique({
      where: { id: candidatureId },
      include: {
        offre: {
          include: {
            demande: {
              include: { direction: true }
            }
          }
        }
      }
    });

    if (!candidature) return sendNotFound(res, 'Candidature non trouvee');

    const demande = candidature.offre?.demande;
    const directionId = demande?.directionId || null;
    const niveauPoste = demande?.niveau;

    if (type === 'DIRECTION') {
      if (!niveauPoste || !NIVEAUX_AVEC_DIRECTION.includes(niveauPoste)) {
        return sendError(
          res,
          `L'entretien Direction est reserve aux postes Cadre superieur et Strategique. Niveau actuel : ${niveauPoste}`,
          400
        );
      }
    }

    const interviewer = await resolveInterviewer(type, userId, directionId);
    if (!interviewer) {
      return sendError(
        res,
        `Aucun ${type === 'TECHNIQUE' ? 'manager' : type === 'DIRECTION' ? 'directeur' : 'DRH'} trouve pour cette direction`,
        404
      );
    }

    let finalDate: Date;
    let finalHeure: string;
    let resolvedDisponibiliteId: string | null = null;

    if (type === 'RH') {
      if (!date || !heure) {
        return sendError(res, 'Date et heure requises pour l\'entretien RH', 400);
      }
      finalDate = new Date(date);
      finalHeure = heure;
    } else {
      if (!disponibiliteId) {
        return sendError(res, `Un creneau de disponibilite est requis pour l'entretien ${type}`, 400);
      }

      const dispo = await prisma.disponibiliteInterviewer.findUnique({
        where: { id: disponibiliteId },
        include: { user: { select: { id: true, role: true } } }
      });

      if (!dispo) return sendNotFound(res, 'Creneau de disponibilite introuvable');
      if (dispo.reservee) return sendError(res, 'Ce creneau est deja reserve', 409);
      if (dispo.demandeId !== demande?.id) {
        return sendError(res, 'Ce creneau n\'appartient pas a la demande liee', 400);
      }

      const roleAttendu = type === 'TECHNIQUE' ? 'MANAGER' : 'DIRECTEUR';
      if (dispo.user.role !== roleAttendu) {
        return sendError(
          res,
          `Le creneau selectionne appartient a un ${dispo.user.role}, attendu : ${roleAttendu}`,
          400
        );
      }

      finalDate = dispo.date;
      finalHeure = dispo.heureDebut;
      resolvedDisponibiliteId = disponibiliteId;

      await prisma.disponibiliteInterviewer.update({
        where: { id: disponibiliteId },
        data: { reservee: true }
      });
    }

    const entretien = await prisma.entretien.create({
      data: {
        type: type as any,
        date: finalDate,
        heure: finalHeure,
        lieu,
        statut: 'PLANIFIE',
        candidatureId,
        interviewerId: interviewer.id,
        disponibiliteId: resolvedDisponibiliteId
      },
      include: {
        candidature: { include: { offre: { select: { id: true, reference: true, intitule: true } } } },
        interviewer: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
        disponibilite: true
      }
    });

    await emailService.sendEntretienNotification({
      nom: interviewer.nom,
      prenom: interviewer.prenom,
      email: interviewer.email,
      candidatNom: `${candidature.prenom} ${candidature.nom}`,
      poste: candidature.offre?.intitule || '',
      type,
      date: finalDate,
      heure: finalHeure,
      lieu,
      actionUrl: `${process.env.FRONTEND_URL}/entretiens/${entretien.id}`
    });

    sendCreated(res, entretien, 'Entretien planifie avec succes');

  } catch (error) {
    console.error('createEntretien error:', error);
    sendError(res, 'Erreur lors de la planification de l\'entretien');
  }
};

// ============================================
// RECUPERER LES DISPONIBILITES INTERVIEWERS PAR DEMANDE
// ============================================
export const getDisponibilitesParDemande = async (req: Request, res: Response) => {
  try {
    const { demandeId } = req.params;
    const { type } = req.query;

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id: demandeId },
      select: { id: true, niveau: true, directionId: true }
    });

    if (!demande) return sendNotFound(res, 'Demande non trouvee');

    let roleFiltre: string | undefined;
    if (type === 'TECHNIQUE') roleFiltre = 'MANAGER';
    else if (type === 'DIRECTION') roleFiltre = 'DIRECTEUR';

    const disponibilites = await prisma.disponibiliteInterviewer.findMany({
      where: {
        demandeId,
        reservee: false,
        ...(roleFiltre ? { user: { role: roleFiltre as any } } : {})
      },
      include: {
        user: { select: { id: true, nom: true, prenom: true, role: true } }
      },
      orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }]
    });

    sendSuccess(res, { disponibilites, niveauPoste: demande.niveau });

  } catch (error) {
    console.error('getDisponibilitesParDemande error:', error);
    sendError(res, 'Erreur lors de la recuperation des disponibilites');
  }
};

// ============================================
// AJOUTER UNE DISPONIBILITE INTERVIEWER
// ============================================
export const addDisponibiliteInterviewer = async (req: Request, res: Response) => {
  try {
    const { demandeId, disponibilites } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const rolesAutorises = ['MANAGER', 'DIRECTEUR', 'DRH', 'SUPER_ADMIN'];
    if (!rolesAutorises.includes(userRole)) {
      return sendForbidden(res, 'Non autorise a saisir des disponibilites');
    }

    if (!demandeId || !Array.isArray(disponibilites) || disponibilites.length === 0) {
      return sendError(res, 'demandeId et au moins une disponibilite sont requis', 400);
    }

    const demande = await prisma.demandeRecrutement.findUnique({ where: { id: demandeId } });
    if (!demande) return sendNotFound(res, 'Demande non trouvee');

    for (const d of disponibilites) {
      if (!d.date || !d.heureDebut || !d.heureFin) {
        return sendError(res, 'Chaque creneau doit avoir une date, heureDebut et heureFin', 400);
      }
      if (d.heureDebut >= d.heureFin) {
        return sendError(res, `Le creneau ${d.date} : heureDebut doit etre avant heureFin`, 400);
      }
    }

    const created = await prisma.$transaction(
      disponibilites.map((d: any) =>
        prisma.disponibiliteInterviewer.create({
          data: {
            userId,
            demandeId,
            date: new Date(d.date),
            heureDebut: d.heureDebut,
            heureFin: d.heureFin
          }
        })
      )
    );

    sendCreated(res, { count: created.length, disponibilites: created }, 'Disponibilites enregistrees');

  } catch (error) {
    console.error('addDisponibiliteInterviewer error:', error);
    sendError(res, 'Erreur lors de l\'enregistrement des disponibilites');
  }
};

// ============================================
// METTRE A JOUR LE FEEDBACK (par l'interviewer)
// ============================================
// ✅ Controle: l'avis ne peut etre donne qu'a partir de la date de l'entretien
export const updateFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { feedback, evaluation, statut } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const rolesAutorises = ['MANAGER', 'DIRECTEUR', 'DRH', 'SUPER_ADMIN'];
    if (!rolesAutorises.includes(userRole)) {
      return sendForbidden(res, 'Non autorise');
    }

    const entretien = await prisma.entretien.findUnique({ 
      where: { id },
      include: { candidature: true }
    });
    
    if (!entretien) return sendNotFound(res, 'Entretien non trouve');

    if (entretien.interviewerId !== userId && userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Vous n etes pas l interviewer assigne a cet entretien');
    }

    // ✅ VERIFICATION 1: La date de l'entretien doit etre passee ou aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateEntretien = new Date(entretien.date);
    dateEntretien.setHours(0, 0, 0, 0);

    if (dateEntretien > today) {
      return sendError(
        res, 
        `Vous ne pouvez donner votre avis qu a partir du ${entretien.date.toLocaleDateString('fr-FR')} (date de l entretien)`,
        400
      );
    }

    // ✅ VERIFICATION 2: L'entretien n'a pas deja un feedback
    if (entretien.feedback && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Un avis a deja ete donne pour cet entretien', 400);
    }

    // ✅ VERIFICATION 3: Feedback obligatoire si on donne un avis
    if (feedback !== undefined && (!feedback || feedback.trim() === '')) {
      return sendError(res, 'Le feedback est obligatoire', 400);
    }

    if (evaluation !== undefined && (evaluation < 0 || evaluation > 10)) {
      return sendError(res, 'L evaluation doit etre comprise entre 0 et 10', 400);
    }

    const statutsValides = ['PLANIFIE', 'REALISE', 'ANNULE', 'REPORTE'];
    if (statut && !statutsValides.includes(statut)) {
      return sendError(res, `Statut invalide. Valeurs : ${statutsValides.join(', ')}`, 400);
    }

    const updated = await prisma.entretien.update({
      where: { id },
      data: {
        feedback: feedback || undefined,
        evaluation: evaluation !== undefined ? parseInt(evaluation) : undefined,
        statut: statut || undefined
      },
      include: {
        interviewer: { select: { id: true, nom: true, prenom: true, role: true } },
        candidature: { include: { offre: { select: { intitule: true } } } }
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'DONNER_AVIS_ENTRETIEN',
        entityType: 'Entretien',
        entityId: id,
        details: `Avis donne pour l entretien du ${entretien.date.toLocaleDateString()}`,
        acteurId: userId
      }
    });

    sendSuccess(res, updated, 'Feedback enregistre');

  } catch (error) {
    console.error('updateFeedback error:', error);
    sendError(res, 'Erreur lors de l enregistrement du feedback');
  }
};

// ============================================
// RECUPERER TOUS LES ENTRETIENS
// ============================================
export const getEntretiens = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    let where: any = {};

    if (userRole === 'MANAGER') {
      where = { type: 'TECHNIQUE', interviewerId: userId };
    } else if (userRole === 'DIRECTEUR') {
      where = { type: 'DIRECTION', interviewerId: userId };
    } else if (userRole === 'DRH') {
      where = { type: 'RH', interviewerId: userId };
    } else if (userRole === 'SUPER_ADMIN') {
      where = {};
    } else {
      return sendSuccess(res, { entretiens: [] });
    }

    const entretiens = await prisma.entretien.findMany({
      where,
      include: {
        candidature: {
          include: {
            offre: {
              select: { id: true, reference: true, intitule: true }
            }
          }
        },
        interviewer: {
          select: { id: true, nom: true, prenom: true, email: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    // ✅ Ajouter l'information si l'avis peut etre donne
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const entretiensAvecInfo = entretiens.map(e => ({
      ...e,
      peutDonnerAvis: e.feedback === null && new Date(e.date) <= today,
      dateAvisPossible: new Date(e.date).toLocaleDateString('fr-FR')
    }));

    sendSuccess(res, { entretiens: entretiensAvecInfo });

  } catch (error) {
    console.error('getEntretiens error:', error);
    sendError(res, 'Erreur lors de la recuperation des entretiens');
  }
};

// ============================================
// RECUPERER UN ENTRETIEN PAR ID
// ============================================
export const getEntretienById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entretien = await prisma.entretien.findUnique({
      where: { id },
      include: {
        candidature: {
          include: {
            offre: {
              select: {
                id: true,
                reference: true,
                intitule: true,
                description: true,
                profilRecherche: true,
                competences: true,
                typeContrat: true,
              }
            }
          }
        },
        interviewer: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
        disponibilite: {
          include: { user: { select: { id: true, nom: true, prenom: true, role: true } } }
        }
      }
    });

    if (!entretien) return sendNotFound(res, 'Entretien non trouve');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateEntretien = new Date(entretien.date);
    dateEntretien.setHours(0, 0, 0, 0);

    const peutDonnerAvis = entretien.feedback === null && dateEntretien <= today;

    sendSuccess(res, { 
      entretien,
      peutDonnerAvis,
      dateAvisPossible: entretien.date.toLocaleDateString('fr-FR')
    });

  } catch (error) {
    console.error('getEntretienById error:', error);
    sendError(res, 'Erreur lors de la recuperation de l entretien');
  }
};

// ============================================
// RECUPERER LES ENTRETIENS D'UNE CANDIDATURE
// ============================================
export const getEntretiensByCandidature = async (req: Request, res: Response) => {
  try {
    const { candidatureId } = req.params;

    const entretiens = await prisma.entretien.findMany({
      where: { candidatureId },
      include: {
        interviewer: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
        disponibilite: true
      },
      orderBy: { date: 'asc' }
    });

    sendSuccess(res, { entretiens });

  } catch (error) {
    console.error('getEntretiensByCandidature error:', error);
    sendError(res, 'Erreur lors de la recuperation des entretiens');
  }
};

// ============================================
// METTRE A JOUR UN ENTRETIEN (DRH uniquement)
// ============================================
export const updateEntretien = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, heure, lieu } = req.body;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorise');
    }

    const entretien = await prisma.entretien.findUnique({ where: { id } });
    if (!entretien) return sendNotFound(res, 'Entretien non trouve');

    const updated = await prisma.entretien.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        heure: heure || undefined,
        lieu: lieu || undefined
      },
      include: { candidature: true, interviewer: true }
    });

    sendSuccess(res, updated, 'Entretien mis a jour');

  } catch (error) {
    console.error('updateEntretien error:', error);
    sendError(res, 'Erreur lors de la mise a jour');
  }
};

// ============================================
// METTRE A JOUR LE STATUT D'UN ENTRETIEN
// ============================================
export const updateEntretienStatut = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsValides = ['PLANIFIE', 'REALISE', 'ANNULE', 'REPORTE'];
    if (!statutsValides.includes(statut)) {
      return sendError(res, `Statut invalide. Valeurs : ${statutsValides.join(', ')}`, 400);
    }

    const entretien = await prisma.entretien.update({
      where: { id },
      data: { statut }
    });

    sendSuccess(res, entretien, `Statut mis a jour : ${statut}`);

  } catch (error) {
    console.error('updateEntretienStatut error:', error);
    sendError(res, 'Erreur lors de la mise a jour du statut');
  }
};

// ============================================
// SUPPRIMER UN ENTRETIEN
// ============================================
export const deleteEntretien = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorise');
    }

    const entretien = await prisma.entretien.findUnique({ where: { id } });
    if (!entretien) return sendNotFound(res, 'Entretien non trouve');

    if (entretien.disponibiliteId) {
      await prisma.disponibiliteInterviewer.update({
        where: { id: entretien.disponibiliteId },
        data: { reservee: false }
      });
    }

    await prisma.entretien.delete({ where: { id } });

    sendSuccess(res, null, 'Entretien supprime');

  } catch (error) {
    console.error('deleteEntretien error:', error);
    sendError(res, 'Erreur lors de la suppression');
  }
};