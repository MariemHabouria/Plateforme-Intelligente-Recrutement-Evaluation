import prisma from '../config/prisma';
import { triggerCircuitRecrutement } from './n8nService';

export const relanceService = {
  /**
   * Vérifier les deadlines et créer les jobs de relance
   */
  async verifierEtCreerRelances() {
    const maintenant = new Date();

    // 1. Créer les jobs de relance pour les validations en attente
    const validationsEnAttente = await prisma.validationEtape.findMany({
      where: {
        decision: 'EN_ATTENTE',
        relanceEnvoyee: false,
        dateLimite: { lt: maintenant }
      },
      include: {
        demande: {
          include: { manager: true }
        },
        acteur: true
      }
    });

    for (const validation of validationsEnAttente) {
      const heuresRetard = Math.floor(
        (maintenant.getTime() - validation.dateLimite.getTime()) / (1000 * 60 * 60)
      );

      let typeRelance = 'premier_rappel';
      if (heuresRetard >= 24) {
        typeRelance = 'second_rappel';
      }
      if (heuresRetard >= 48) {
        typeRelance = 'escalade';
      }

      // ── Envoi réel du rappel via n8n (étape en cours = niveauEtape) ──
      try {
        await triggerCircuitRecrutement(
          validation.demande.id,
          validation.demande.niveau,
          validation.niveauEtape,
          true // isRelance
        );
        console.log(
          `📧 [RAPPEL] ${typeRelance.toUpperCase()} envoyé via n8n — ${validation.acteur.email} ` +
          `(demande ${validation.demande.reference}, retard ${heuresRetard}h)`
        );
      } catch (error) {
        console.error(
          `❌ [RAPPEL] Échec envoi n8n pour validation ${validation.id} (demande ${validation.demande.reference}):`,
          error
        );
        // On continue malgré l'échec réseau : on marque relanceEnvoyee=true
        // quand même pour ne pas spammer à chaque passage du cron. Si tu
        // préfères réessayer automatiquement au prochain cycle, retire le
        // bloc try/catch et laisse l'erreur remonter (le job ne sera pas
        // marqué et sera retenté à la prochaine exécution).
      }

      // Marquer comme relancée
      await prisma.validationEtape.update({
        where: { id: validation.id },
        data: { relanceEnvoyee: true }
      });

      // Créer un job pour la prochaine relance (24h)
      const prochaineRelance = new Date();
      prochaineRelance.setHours(prochaineRelance.getHours() + 24);

      await prisma.relanceJob.create({
        data: {
          validationEtapeId: validation.id,
          type: heuresRetard >= 24 ? 'escalade' : 'relance_24h',
          datePrevue: prochaineRelance
        }
      });
    }

    return validationsEnAttente.length;
  },

  /**
   * Exécuter les jobs de relance planifiés
   */
  async executerRelancesPlanifiees() {
    const maintenant = new Date();

    const jobs = await prisma.relanceJob.findMany({
      where: {
        executee: false,
        datePrevue: { lte: maintenant }
      },
      include: {
        validationEtape: {
          include: {
            demande: { include: { manager: true } },
            acteur: true
          }
        }
      }
    });

    for (const job of jobs) {
      const validation = job.validationEtape;

      if (!validation || validation.decision !== 'EN_ATTENTE') {
        await prisma.relanceJob.update({
          where: { id: job.id },
          data: { executee: true, executeeAt: maintenant }
        });
        continue;
      }

      // ── Envoi réel du rappel planifié (escalade / relance_24h) via n8n ──
      try {
        await triggerCircuitRecrutement(
          validation.demande.id,
          validation.demande.niveau,
          validation.niveauEtape,
          true // isRelance
        );
        console.log(
          `📧 [RAPPEL PLANIFIÉ] ${job.type.toUpperCase()} envoyé via n8n — ${validation.acteur.email} ` +
          `(demande ${validation.demande.reference})`
        );
      } catch (error) {
        console.error(
          `❌ [RAPPEL PLANIFIÉ] Échec envoi n8n pour job ${job.id} (demande ${validation.demande.reference}):`,
          error
        );
      }

      await prisma.relanceJob.update({
        where: { id: job.id },
        data: { executee: true, executeeAt: maintenant }
      });
    }

    return jobs.length;
  }
};