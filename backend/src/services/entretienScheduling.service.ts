// backend/src/services/entretienScheduling.service.ts
//
// Logique partagée de réservation d'un créneau TECHNIQUE/DIRECTION.
// Utilisée par :
//  - publicEntretienController (self-scheduling candidat, sans auth)
//  - entretienController (si le RH veut, en interne, forcer un créneau)
//
// Centralise aussi le fix de la race condition sur `reservee` (update
// atomique conditionnel au lieu d'un check-then-write).

import prisma from '../config/prisma';
import { emailService } from './email.service';


interface ReservationResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  entretien?: any;
}
const ROLE_PAR_TYPE: Record<'RH' | 'TECHNIQUE' | 'DIRECTION', string> = {
  RH: 'DRH', TECHNIQUE: 'MANAGER', DIRECTION: 'DIRECTEUR'
};

export async function getCreneauxDisponibles(candidatureId: string, type: 'RH' | 'TECHNIQUE' | 'DIRECTION') {
  const candidature = await prisma.candidature.findUnique({
    where: { id: candidatureId },
    include: { offre: { include: { demande: true } } }
  });

  const demande = candidature?.offre?.demande;
  if (!demande) return { candidature: null, demande: null, creneaux: [] };

  const roleFiltre = ROLE_PAR_TYPE[type];

  const creneaux = await prisma.disponibiliteInterviewer.findMany({
    where: {
      demandeId: demande.id,
      reservee: false,
      user: { role: roleFiltre as any }
    },
    include: { user: { select: { id: true, nom: true, prenom: true, role: true } } },
    orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }]
  });

  return { candidature, demande, creneaux };
}

export async function reserverCreneauEtCreerEntretien(
  candidatureId: string,
  type: 'RH' | 'TECHNIQUE' | 'DIRECTION',
  disponibiliteId: string,
  lieu: string
): Promise<ReservationResult> {
  const dispo = await prisma.disponibiliteInterviewer.findUnique({
    where: { id: disponibiliteId },
    include: { user: { select: { id: true, nom: true, prenom: true, email: true, role: true } } }
  });

  if (!dispo) return { success: false, error: 'Creneau introuvable', statusCode: 404 };
  if (dispo.reservee) return { success: false, error: 'Ce creneau vient d\'etre reserve', statusCode: 409 };

  const ROLE_PAR_TYPE: Record<'RH' | 'TECHNIQUE' | 'DIRECTION', string> = {
    RH: 'DRH', TECHNIQUE: 'MANAGER', DIRECTION: 'DIRECTEUR'
  };
  const roleAttendu = ROLE_PAR_TYPE[type];
  if (dispo.user.role !== roleAttendu) {
    return { success: false, error: `Creneau invalide pour ce type d'entretien`, statusCode: 400 };
  }

  const candidature = await prisma.candidature.findUnique({
    where: { id: candidatureId },
    include: { offre: { select: { id: true, intitule: true, demande: { select: { id: true } } } } }
  });
  if (!candidature) return { success: false, error: 'Candidature introuvable', statusCode: 404 };
  if (dispo.demandeId !== candidature.offre?.demande?.id) {
    return { success: false, error: 'Creneau non lie a cette candidature', statusCode: 400 };
  }

  const updateResult = await prisma.disponibiliteInterviewer.updateMany({
    where: { id: disponibiliteId, reservee: false },
    data: { reservee: true }
  });

  if (updateResult.count === 0) {
    return { success: false, error: 'Ce creneau vient d\'etre reserve', statusCode: 409 };
  }

  try {
    const entretien = await prisma.entretien.create({
      data: {
        type: type as any,
        date: dispo.date,
        heure: dispo.heureDebut,
        lieu,
        statut: 'PLANIFIE',
        candidatureId,
        interviewerId: dispo.user.id,
        disponibiliteId
      },
      include: {
        candidature: { include: { offre: { select: { id: true, reference: true, intitule: true } } } },
        interviewer: { select: { id: true, nom: true, prenom: true, email: true, role: true } }
      }
    });

    await prisma.candidature.update({
      where: { id: candidatureId },
      data: { statut: 'ENTRETIEN' }
    });

    await prisma.auditLog.create({
      data: {
        action: 'CANDIDAT_RESERVE_CRENEAU',
        entityType: 'Entretien',
        entityId: entretien.id,
        details: `Le candidat a choisi son creneau ${type} — entretien ${entretien.id}`,
        acteurId: dispo.user.id
      }
    });

    const interviewerRoleLabel: Record<string, string> = {
      DRH: 'Responsable RH', MANAGER: 'Manager technique', DIRECTEUR: 'Directeur'
    };

    await emailService.sendEntretienNotification({
      nom: dispo.user.nom,
      prenom: dispo.user.prenom,
      email: dispo.user.email,
      candidatNom: `${candidature.prenom} ${candidature.nom}`,
      poste: candidature.offre?.intitule || '',
      type,
      date: dispo.date,
      heure: dispo.heureDebut,
      lieu,
      actionUrl: `${process.env.FRONTEND_URL}/entretiens/${entretien.id}`
    });

    const drh = await prisma.user.findFirst({ where: { role: 'DRH', actif: true } });
    if (drh && drh.id !== dispo.user.id) {
      await emailService.sendNotificationEmail({
        nom: drh.nom,
        prenom: drh.prenom,
        email: drh.email,
        message: `${candidature.prenom} ${candidature.nom} a choisi son creneau d'entretien ${type} : ${dispo.date.toLocaleDateString('fr-FR')} a ${dispo.heureDebut} avec ${dispo.user.prenom} ${dispo.user.nom}.`,
        actionUrl: `${process.env.FRONTEND_URL}/entretiens/${entretien.id}`
      });
    }

    return { success: true, entretien };

  } catch (error) {
    await prisma.disponibiliteInterviewer.update({
      where: { id: disponibiliteId },
      data: { reservee: false }
    });
    console.error('reserverCreneauEtCreerEntretien error:', error);
    return { success: false, error: 'Erreur lors de la creation de l\'entretien', statusCode: 500 };
  }
}