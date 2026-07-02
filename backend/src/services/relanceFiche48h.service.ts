import prisma from '../config/prisma';
import { emailService } from './email.service';

/**
 * Vérifie les candidatures dont la fiche de renseignement a été envoyée
 * il y a plus de 48h sans réponse, et les refuse automatiquement.
 * Le RH garde la possibilité de rattraper manuellement via updateCandidatureStatut.
 *
 * Indépendant du circuit de validation des demandes (relanceService) :
 * ici on ne touche qu'à Candidature + AuditLog, pas à ValidationEtape/RelanceJob.
 */
export const relanceFiche48hService = {
  async verifierEtRefuserFichesNonRecues(): Promise<number> {
    const limite = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const candidatures = await prisma.candidature.findMany({
      where: {
        statut: 'FICHE_ENVOYEE',
        ficheRenseignementRecue: false,
        ficheRenseignementEnvoyeeAt: { lt: limite }
      },
      include: { offre: { select: { intitule: true } } }
    });

    if (candidatures.length === 0) return 0;

    const drh = await prisma.user.findFirst({ where: { role: 'DRH', actif: true } });

    for (const c of candidatures) {
      await prisma.candidature.update({ where: { id: c.id }, data: { statut: 'REFUSEE' } });

      await prisma.auditLog.create({
        data: {
          action: 'REFUS_AUTO_48H_FICHE_NON_RECUE',
          entityType: 'Candidature',
          entityId: c.id,
          details: `Fiche non recue 48h apres envoi (${c.ficheRenseignementEnvoyeeAt?.toISOString()}) — refus automatique`,
          acteurId: drh?.id || c.id
        }
      });

      if (drh) {
        await emailService.sendNotificationEmail({
          nom: drh.nom,
          prenom: drh.prenom,
          email: drh.email,
          message: `${c.prenom} ${c.nom} n'a pas renvoye sa fiche de renseignement 48h apres l'envoi (poste : ${c.offre?.intitule || ''}). Statut passe automatiquement a REFUSEE — vous pouvez le modifier manuellement.`,
          actionUrl: `${process.env.FRONTEND_URL}/candidats/${c.id}`
        });
      }
    }

    return candidatures.length;
  }
};