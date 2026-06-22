// backend/src/services/evaluationPE.service.ts
// ✅ CORRECTIONS :
//   1. verifierContratsEcheance : filtre J-30 correct (dateFin entre aujourd'hui et J+30)
//   2. employeId : cherche le vrai User via email de la candidature
//   3. joursRestants : calculé depuis dateFin (fin PE), pas dateDebut
//   4. Emails logués en console (intégration n8n prévue)

import prisma from '../config/prisma';

export const evaluationPEService = {

  // ============================================
  // Appelé via POST /evaluations/declencher (manuellement ou webhook n8n)
  // ============================================
  async verifierContratsEcheance(): Promise<number> {
    const today = new Date();
    const j30 = new Date(today);
    j30.setDate(j30.getDate() + 30);

    console.log(`\n🔍 Vérification J-30`);
    console.log(`   Aujourd'hui : ${today.toLocaleDateString('fr-FR')}`);
    console.log(`   Seuil J+30  : ${j30.toLocaleDateString('fr-FR')}`);

    // ✅ Contrats ACTIF dont dateFin (fin PE) est entre aujourd'hui et J+30
    const contratsEcheance = await prisma.contrat.findMany({
      where: {
        statut: 'ACTIF',
        dateFin: {
          gte: today,
          lte: j30
        }
      },
      include: {
        candidature: {
          include: {
            offre: {
              include: {
                demande: { include: { direction: true } }
              }
            }
          }
        },
        evaluationPE: true
      }
    });

    console.log(`📋 Contrats en approche J-30 : ${contratsEcheance.length}`);

    let count = 0;

    for (const contrat of contratsEcheance) {
      // ✅ Évaluation déjà existante → juste mettre à jour joursRestants
      if (contrat.evaluationPE) {
        if (!['VALIDEE', 'REJETEE'].includes(contrat.evaluationPE.statut)) {
          const jours = Math.ceil(
            (new Date(contrat.dateFin!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          await prisma.evaluationPE.update({
            where: { id: contrat.evaluationPE.id },
            data: { joursRestants: jours > 0 ? jours : 0 }
          });
          console.log(`   🔄 ${contrat.evaluationPE.reference} → joursRestants = ${jours}j`);
        }
        continue;
      }

      // ✅ Créer l'évaluation manquante
      try {
        // Chercher le User via email de la candidature
        const candidatureEmail = contrat.candidature?.email;
        let employe = null;

        if (candidatureEmail) {
          employe = await prisma.user.findFirst({
            where: { email: candidatureEmail, actif: true }
          });
        }

        // Fallback nom/prénom si pas de user avec cet email
        if (!employe) {
          const nom = contrat.candidature?.nom;
          const prenom = contrat.candidature?.prenom;
          if (nom && prenom) {
            employe = await prisma.user.findFirst({
              where: { nom, prenom, actif: true }
            });
          }
        }

        const directionId = contrat.candidature?.offre?.demande?.directionId
          || employe?.directionId
          || null;

        const manager = directionId
          ? await prisma.user.findFirst({
              where: { role: 'MANAGER', directionId, actif: true }
            })
          : null;

        const dateFinPE = new Date(contrat.dateFin!);
        const joursRestants = Math.ceil(
          (dateFinPE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const year = new Date().getFullYear();
        const evalCount = await prisma.evaluationPE.count();
        const reference = `EVAL-${year}-${String(evalCount + 1).padStart(4, '0')}`;

        const evaluation = await prisma.evaluationPE.create({
          data: {
            reference,
            employeId: employe?.id || contrat.candidature!.id,
            managerId: manager?.id || '',
            contratId: contrat.id,
            dateDebut: new Date(contrat.dateDebut),
            dateFin: dateFinPE,
            joursRestants: joursRestants > 0 ? joursRestants : 0,
            statut: 'BROUILLON',
            etapeActuelle: 0,
            totalEtapes: 3
          }
        });

        console.log(`\n   ✅ Évaluation créée : ${evaluation.reference}`);
        console.log(`      Employé  : ${contrat.candidature?.prenom} ${contrat.candidature?.nom}`);
        console.log(`      Fin PE   : ${dateFinPE.toLocaleDateString('fr-FR')} (J-${joursRestants})`);
        console.log(`      Manager  : ${manager ? `${manager.prenom} ${manager.nom}` : 'Non trouvé'}`);

        // ✅ Email simulé en console — n8n webhook prendra le relais
        const respPaie = await prisma.user.findFirst({ where: { role: 'RESP_PAIE', actif: true } });
        if (respPaie) {
          console.log(`\n   📧 [EMAIL → RESP_PAIE] ${respPaie.email}`);
          console.log(`      Sujet : ⚠️ J-${joursRestants} — Évaluation PE à traiter`);
          console.log(`      Corps : ${contrat.candidature?.prenom} ${contrat.candidature?.nom} — fin PE le ${dateFinPE.toLocaleDateString('fr-FR')}`);
          console.log(`      URL   : ${process.env.FRONTEND_URL}/evaluations/${evaluation.id}`);
        }

        count++;
      } catch (err) {
        console.error(`   ❌ Erreur pour contrat ${contrat.reference}:`, err);
      }
    }

    // Recalcule joursRestants pour toutes les évaluations encore actives
    await evaluationPEService.mettreAJourJoursRestants();

    console.log(`\n✅ Vérification terminée — ${count} évaluation(s) créée(s)\n`);
    return count;
  },

  // ============================================
  // Recalcule joursRestants pour toutes les évaluations non finalisées
  // ============================================
  async mettreAJourJoursRestants(): Promise<void> {
    const today = new Date();

    const evaluationsActives = await prisma.evaluationPE.findMany({
      where: { statut: { notIn: ['VALIDEE', 'REJETEE'] } }
    });

    for (const eval_ of evaluationsActives) {
      const jours = Math.ceil(
        (new Date(eval_.dateFin).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      await prisma.evaluationPE.update({
        where: { id: eval_.id },
        data: { joursRestants: jours }
      });
    }

    if (evaluationsActives.length > 0) {
      console.log(`🔄 joursRestants recalculés pour ${evaluationsActives.length} évaluation(s)`);
    }
  }
};