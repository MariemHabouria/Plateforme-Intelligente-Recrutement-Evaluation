// backend/src/controllers/entretienController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden } from '../utils/helpers';
import { emailService } from '../services/email.service';
import { generateSchedulingToken } from '../utils/publicSchedulingToken';

const NIVEAUX_AVEC_DIRECTION = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];

// ============================================
// CREER UN ENTRETIEN
//
// RH (type): comportement inchangé — le RH fixe date/heure lui-même,
//   l'entretien est créé directement.
//
// TECHNIQUE / DIRECTION: le RH ne choisit plus le créneau à la place du
//   candidat. On envoie au candidat un lien de self-scheduling (token
//   signé, sans compte requis) vers les créneaux du manager/directeur.
//   L'Entretien n'est créé QUE lorsque le candidat a réellement choisi
//   son créneau (voir publicEntretienController + entretienScheduling.service).
// ============================================
const ROLE_PAR_TYPE: Record<'RH' | 'TECHNIQUE' | 'DIRECTION', string> = {
  RH: 'DRH', TECHNIQUE: 'MANAGER', DIRECTION: 'DIRECTEUR'
};

export const createEntretien = async (req: Request, res: Response) => {
  try {
    const { candidatureId, type, lieu } = req.body; // plus de date/heure en entree
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
      include: { offre: { include: { demande: { include: { direction: true } } } } }
    });
    if (!candidature) return sendNotFound(res, 'Candidature non trouvee');

    const demande = candidature.offre?.demande;
    const niveauPoste = demande?.niveau;

    if (type === 'DIRECTION' && (!niveauPoste || !NIVEAUX_AVEC_DIRECTION.includes(niveauPoste))) {
      return sendError(res, `L'entretien Direction est reserve aux postes Cadre superieur et Strategique. Niveau actuel : ${niveauPoste}`, 400);
    }

    // ── Chemin unique pour RH / TECHNIQUE / DIRECTION : self-scheduling ──
    const roleRequis = ROLE_PAR_TYPE[type as 'RH' | 'TECHNIQUE' | 'DIRECTION'];
    const creneauxDispo = await prisma.disponibiliteInterviewer.count({
      where: { demandeId: demande?.id, reservee: false, user: { role: roleRequis as any } }
    });

    if (creneauxDispo === 0) {
      const roleLabel = roleRequis === 'DRH' ? 'RH' : roleRequis === 'MANAGER' ? 'manager' : 'directeur';
      return sendError(
        res,
        `Aucun creneau disponible pour le ${roleLabel}. Il doit d'abord saisir ses disponibilites.`,
        400
      );
    }

    const token = generateSchedulingToken(candidatureId, type as 'RH' | 'TECHNIQUE' | 'DIRECTION', lieu);
    const lienPlanification = `${process.env.FRONTEND_URL}/planifier-entretien/${token}`;

    await emailService.sendLienPlanificationCandidatEmail({
      nomCandidat: candidature.nom,
      prenomCandidat: candidature.prenom,
      emailCandidat: candidature.email,
      poste: candidature.offre?.intitule || '',
      type: type as 'RH' | 'TECHNIQUE' | 'DIRECTION',
      lienPlanification
    });

    await prisma.auditLog.create({
      data: {
        action: 'LIEN_PLANIFICATION_ENVOYE',
        entityType: 'Candidature',
        entityId: candidatureId,
        details: `Lien de self-scheduling envoye au candidat pour entretien ${type}`,
        acteurId: userId
      }
    });

    return sendSuccess(res, { lienEnvoye: true }, 'Lien de planification envoye au candidat');

  } catch (error) {
    console.error('createEntretien error:', error);
    sendError(res, 'Erreur lors de la planification de l\'entretien');
  }
};


// RECUPERER LES DISPONIBILITES PAR DEMANDE (usage interne RH, inchangé)

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
      include: { user: { select: { id: true, nom: true, prenom: true, role: true } } },
      orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }]
    });

    sendSuccess(res, { disponibilites, niveauPoste: demande.niveau });

  } catch (error) {
    console.error('getDisponibilitesParDemande error:', error);
    sendError(res, 'Erreur lors de la recuperation des disponibilites');
  }
};


// AJOUTER UNE DISPONIBILITE (inchangé)

export const addDisponibiliteInterviewer = async (req: Request, res: Response) => {
  try {
    const { demandeId, disponibilites } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const rolesAutorises = ['MANAGER', 'DIRECTEUR', 'DRH', 'SUPER_ADMIN'];
    if (!rolesAutorises.includes(userRole)) return sendForbidden(res, 'Non autorise a saisir des disponibilites');

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
          data: { userId, demandeId, date: new Date(d.date), heureDebut: d.heureDebut, heureFin: d.heureFin }
        })
      )
    );

    sendCreated(res, { count: created.length, disponibilites: created }, 'Disponibilites enregistrees');

  } catch (error) {
    console.error('addDisponibiliteInterviewer error:', error);
    sendError(res, 'Erreur lors de l\'enregistrement des disponibilites');
  }
};


// METTRE A JOUR LE FEEDBACK 

export const updateFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { feedback, evaluation, statut } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const rolesAutorises = ['MANAGER', 'DIRECTEUR', 'DRH', 'SUPER_ADMIN'];
    if (!rolesAutorises.includes(userRole)) return sendForbidden(res, 'Non autorise');

    const entretien = await prisma.entretien.findUnique({
      where: { id },
      include: {
        candidature: { include: { offre: { select: { intitule: true } } } }
      }
    });
    if (!entretien) return sendNotFound(res, 'Entretien non trouve');

    if (entretien.interviewerId !== userId && userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Vous n etes pas l interviewer assigne a cet entretien');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateEntretien = new Date(entretien.date);
    dateEntretien.setHours(0, 0, 0, 0);

    if (dateEntretien > today) {
      return sendError(res, `Vous ne pouvez donner votre avis qu a partir du ${entretien.date.toLocaleDateString('fr-FR')}`, 400);
    }

    if (entretien.feedback && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Un avis a deja ete donne pour cet entretien', 400);
    }

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

    if (userRole !== 'DRH' && evaluation !== undefined) {
      const drh = await prisma.user.findFirst({
        where: { role: 'DRH', actif: true },
        select: { id: true, nom: true, prenom: true, email: true }
      });
      if (drh) {
        await emailService.sendFeedbackDisponibleEmail({
          nom: drh.nom,
          prenom: drh.prenom,
          email: drh.email,
          candidatNom: `${entretien.candidature.prenom} ${entretien.candidature.nom}`,
          poste: entretien.candidature.offre?.intitule || '',
          typeEntretien: entretien.type,
          evaluation: parseInt(evaluation),
          actionUrl: `${process.env.FRONTEND_URL}/entretiens/${id}`
        });
      }
    }

    sendSuccess(res, updated, 'Feedback enregistre');

  } catch (error) {
    console.error('updateFeedback error:', error);
    sendError(res, 'Erreur lors de l enregistrement du feedback');
  }
};

// ============================================
// RECUPERER TOUS LES ENTRETIENS
//
// FIX : le DRH pilote l'ensemble du process de recrutement (c'est lui qui
// planifie tous les types d'entretien), il doit avoir une vue globale et
// pas seulement sur les entretiens RH où il est lui-même l'interviewer.
// Manager/Directeur restent restreints à ce qui les concerne : c'est
// correct pour eux (ils ne pilotent pas le process).
// ============================================
export const getEntretiens = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { vueGlobale, type, statut, dateDebut, dateFin, recherche, offreId, interviewerId } = req.query;

    let roleWhere: any = {};
    if (userRole === 'MANAGER') roleWhere = { type: 'TECHNIQUE', interviewerId: userId };
    else if (userRole === 'DIRECTEUR') roleWhere = { type: 'DIRECTION', interviewerId: userId };
    else if (userRole === 'DRH') {
      roleWhere = vueGlobale === 'false' ? { type: 'RH', interviewerId: userId } : {};
    } else if (userRole === 'SUPER_ADMIN') {
      roleWhere = {};
    } else {
      return sendSuccess(res, { entretiens: [] });
    }

    const filtresWhere: any = {};
    if (type) filtresWhere.type = type;
    if (statut) filtresWhere.statut = statut;
    if (interviewerId) filtresWhere.interviewerId = interviewerId;

    if (offreId || recherche) {
      filtresWhere.candidature = {};
      if (offreId) filtresWhere.candidature.offreId = offreId as string;
      if (recherche) {
        filtresWhere.candidature.OR = [
          { nom: { contains: recherche as string, mode: 'insensitive' } },
          { prenom: { contains: recherche as string, mode: 'insensitive' } }
        ];
      }
    }

    if (dateDebut || dateFin) {
      filtresWhere.date = {};
      if (dateDebut) filtresWhere.date.gte = new Date(dateDebut as string);
      if (dateFin) {
        const finJour = new Date(dateFin as string);
        finJour.setHours(23, 59, 59, 999);
        filtresWhere.date.lte = finJour;
      }
    }

    const entretiens = await prisma.entretien.findMany({
      where: { AND: [roleWhere, filtresWhere] },
      include: {
        candidature: { include: { offre: { select: { id: true, reference: true, intitule: true } } } },
        interviewer: { select: { id: true, nom: true, prenom: true, email: true, role: true } }
      },
      orderBy: { date: 'asc' }
    });

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


export const getEntretienById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entretien = await prisma.entretien.findUnique({
      where: { id },
      include: {
        candidature: {
          include: {
            offre: { select: { id: true, reference: true, intitule: true, description: true, profilRecherche: true, competences: true, typeContrat: true } }
          }
        },
        interviewer: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
        disponibilite: { include: { user: { select: { id: true, nom: true, prenom: true, role: true } } } }
      }
    });

    if (!entretien) return sendNotFound(res, 'Entretien non trouve');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateEntretien = new Date(entretien.date);
    dateEntretien.setHours(0, 0, 0, 0);

    sendSuccess(res, {
      entretien,
      peutDonnerAvis: entretien.feedback === null && dateEntretien <= today,
      dateAvisPossible: entretien.date.toLocaleDateString('fr-FR')
    });

  } catch (error) {
    console.error('getEntretienById error:', error);
    sendError(res, 'Erreur lors de la recuperation de l entretien');
  }
};

// RECUPERER LES ENTRETIENS D'UNE CANDIDATURE 

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


// METTRE A JOUR UN ENTRETIEN (DRH) 

export const updateEntretien = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, heure, lieu } = req.body;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') return sendForbidden(res, 'Non autorise');

    const entretien = await prisma.entretien.findUnique({
      where: { id },
      include: {
        candidature: { include: { offre: { select: { intitule: true } } } },
        interviewer: { select: { id: true, nom: true, prenom: true, email: true } }
      }
    });
    if (!entretien) return sendNotFound(res, 'Entretien non trouve');

    const ancienneDate = entretien.date;
    const nouvelleDateFinal = date ? new Date(date) : entretien.date;
    const nouvelleHeureFinal = heure || entretien.heure;
    const nouveauLieuFinal = lieu || entretien.lieu;

    const updated = await prisma.entretien.update({
      where: { id },
      data: { date: nouvelleDateFinal, heure: nouvelleHeureFinal, lieu: nouveauLieuFinal },
      include: { candidature: true, interviewer: true }
    });

    const poste = entretien.candidature?.offre?.intitule || '';

    if (entretien.interviewer) {
      await emailService.sendEntretienModifieInterviewerEmail({
        nom: entretien.interviewer.nom,
        prenom: entretien.interviewer.prenom,
        email: entretien.interviewer.email,
        poste,
        type: entretien.type,
        ancienneDate,
        nouvelleDate: nouvelleDateFinal,
        nouvelleHeure: nouvelleHeureFinal,
        nouveauLieu: nouveauLieuFinal,
        actionUrl: `${process.env.FRONTEND_URL}/entretiens/${id}`
      });
    }

    if (entretien.candidature) {
      await emailService.sendEntretienModifieCandidatEmail({
        nomCandidat: entretien.candidature.nom,
        prenomCandidat: entretien.candidature.prenom,
        emailCandidat: entretien.candidature.email,
        poste,
        type: entretien.type,
        ancienneDate,
        nouvelleDate: nouvelleDateFinal,
        nouvelleHeure: nouvelleHeureFinal,
        nouveauLieu: nouveauLieuFinal
      });
    }

    sendSuccess(res, updated, 'Entretien mis a jour');

  } catch (error) {
    console.error('updateEntretien error:', error);
    sendError(res, 'Erreur lors de la mise a jour');
  }
};

// METTRE A JOUR LE STATUT 

export const updateEntretienStatut = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsValides = ['PLANIFIE', 'REALISE', 'ANNULE', 'REPORTE'];
    if (!statutsValides.includes(statut)) {
      return sendError(res, `Statut invalide. Valeurs : ${statutsValides.join(', ')}`, 400);
    }

    const entretien = await prisma.entretien.update({ where: { id }, data: { statut } });
    sendSuccess(res, entretien, `Statut mis a jour : ${statut}`);

  } catch (error) {
    console.error('updateEntretienStatut error:', error);
    sendError(res, 'Erreur lors de la mise a jour du statut');
  }
};

// SUPPRIMER UN ENTRETIEN 
export const deleteEntretien = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') return sendForbidden(res, 'Non autorise');

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

// RECUPERER MES DISPONIBILITES 
export const getMesDisponibilites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { demandeId } = req.query;

    const disponibilites = await prisma.disponibiliteInterviewer.findMany({
      where: {
        userId,
        ...(demandeId ? { demandeId: demandeId as string } : {})
      },
      orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }]
    });

    sendSuccess(res, { disponibilites });
  } catch (error) {
    console.error('getMesDisponibilites error:', error);
    sendError(res, 'Erreur lors de la recuperation de vos disponibilites');
  }
};


// SUPPRIMER UNE DISPONIBILITE (uniquement si non reservee, et proprietaire)

export const deleteDisponibiliteInterviewer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const dispo = await prisma.disponibiliteInterviewer.findUnique({ where: { id } });
    if (!dispo) return sendNotFound(res, 'Disponibilite non trouvee');

    if (dispo.userId !== userId && userRole !== 'SUPER_ADMIN') {
      return sendForbidden(res, 'Non autorise a supprimer cette disponibilite');
    }
    if (dispo.reservee) {
      return sendError(res, 'Ce creneau est deja reserve par un candidat, il ne peut pas etre supprime', 400);
    }

    await prisma.disponibiliteInterviewer.delete({ where: { id } });
    sendSuccess(res, null, 'Disponibilite supprimee');
  } catch (error) {
    console.error('deleteDisponibiliteInterviewer error:', error);
    sendError(res, 'Erreur lors de la suppression');
  }
};
// entretienController.ts ou offreController.ts selon ton organisation
export const getOffresPourFiltre = async (req: Request, res: Response) => {
  try {
    const offres = await prisma.offreEmploi.findMany({
      where: { statut: 'PUBLIEE' },
      select: { id: true, reference: true, intitule: true },
      orderBy: { intitule: 'asc' }
    });
    sendSuccess(res, { offres });
  } catch (error) {
    console.error('getOffresPourFiltre error:', error);
    sendError(res, 'Erreur lors de la recuperation des offres');
  }
};