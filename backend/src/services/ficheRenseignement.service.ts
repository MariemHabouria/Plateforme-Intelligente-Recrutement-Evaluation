// backend/src/services/ficheRenseignement.service.ts

import prisma from '../config/prisma';
import { emailService } from './email.service';
import { randomBytes } from 'crypto';

export const ficheRenseignementService = {
  
  async envoyerFiche(candidatureId: string, rhId: string) {
    const candidature = await prisma.candidature.findUnique({
      where: { id: candidatureId },
      include: { offre: true }
    });

    if (!candidature) throw new Error('Candidature non trouvée');
    if (candidature.statut !== 'PRESELECTIONNEE') {
      throw new Error('La fiche ne peut être envoyée qu\'à un candidat présélectionné');
    }

    // Générer token unique
    const token = randomBytes(32).toString('hex');
    const ficheUrl = `${process.env.FRONTEND_URL}/fiche-renseignement/${token}`;

    // Mettre à jour
    await prisma.candidature.update({
      where: { id: candidatureId },
      data: {
        ficheRenseignementEnvoyee: true,
        ficheRenseignementEnvoyeeAt: new Date(),
        ficheRenseignementToken: token,
        statut: 'FICHE_ENVOYEE'
      }
    });

    // Envoyer email au candidat
    await emailService.sendFicheRenseignement({
      nom: candidature.nom,
      prenom: candidature.prenom,
      email: candidature.email,
      ficheUrl,
      poste: candidature.offre?.intitule || ''
    });

    return { token, ficheUrl };
  },

  async getFicheByToken(token: string) {
    const candidature = await prisma.candidature.findFirst({
      where: { 
        ficheRenseignementToken: token,
        ficheRenseignementEnvoyee: true,
        ficheRenseignementRecue: false
      },
      include: { offre: true }
    });

    if (!candidature) throw new Error('Fiche invalide ou déjà soumise');
    
    return candidature;
  },

  async soumettreFiche(token: string, data: any) {
    const candidature = await prisma.candidature.findFirst({
      where: { 
        ficheRenseignementToken: token,
        ficheRenseignementEnvoyee: true,
        ficheRenseignementRecue: false
      }
    });

    if (!candidature) throw new Error('Fiche invalide ou déjà soumise');

    const updated = await prisma.candidature.update({
      where: { id: candidature.id },
      data: {
        ficheRenseignementRecue: true,
        ficheRenseignementRecueAt: new Date(),
        ficheRenseignementData: data,
        statut: 'FICHE_RECUE'  // ✅ Prêt pour entretien
      }
    });

    // Notifier DRH
    const drh = await prisma.user.findFirst({ where: { role: 'DRH', actif: true } });
    if (drh) {
      await emailService.sendFicheRecueNotification({
        nom: drh.nom,
        prenom: drh.prenom,
        email: drh.email,
        candidatNom: `${candidature.prenom} ${candidature.nom}`,
        actionUrl: `${process.env.FRONTEND_URL}/candidats/${candidature.id}`
      });
    }

    return updated;
  },

  async peutPlanifierEntretien(candidatureId: string): Promise<boolean> {
    const candidature = await prisma.candidature.findUnique({
      where: { id: candidatureId }
    });
    return candidature?.statut === 'FICHE_RECUE';
  }
};