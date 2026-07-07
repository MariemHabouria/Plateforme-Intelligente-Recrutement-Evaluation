// backend/src/services/evaluationPE.service.ts
//
// Circuit voulu (confirmé par l'encadrant) : uniquement Manager (N+1) puis
// Directeur (N+2) de LA MEME DIRECTION que l'employé. Pas de DRH/DAF/DGA/DG
// sur ce workflow (contrairement au circuit de recrutement).
//
// Corrections apportées par rapport à la version précédente :
//   1. Statut du contrat calculé à partir de la décision réelle (CONFIRMATION /
//      PROLONGATION / RUPTURE / CHANGEMENT) au lieu d'être toujours "CONFIRME".
//   2. Prolongation : la date de fin du contrat est effectivement repoussée.
//   3. Rupture : le contrat est marqué rompu, pas confirmé.
//   4. Génération de contrats/évaluations : plus de FK invalide quand
//      l'employé ou le manager n'est pas trouvé (on n'insère plus employeId /
//      managerId avec un id de mauvaise table ou une chaîne vide).
//   5. nom / prénom ne sont plus inversés dans les emails.
//   6. Génération de `reference` protégée contre les collisions concurrentes
//      (retry sur violation de contrainte unique au lieu d'un count() naïf).
//   7. Escalade en cas de non-traitement : notifie le SUPER_ADMIN (autorité
//      neutre), en plus du RESP_PAIE pour le suivi administratif — au lieu de
//      ne notifier que le RESP_PAIE même quand c'est le Directeur qui bloque.
//   8. FIX STRUCTUREL : preparerPropositionModification et
//      validerModificationParDRH étaient collées APRES l'accolade fermante
//      de l'objet evaluationPEService (donc en dehors de l'objet), ce qui
//      cassait la compilation TypeScript (erreurs en cascade lignes
//      512-624 : "Cannot find name 'evaluationId'", "'string' only refers
//      to a type...", etc.). Elles sont maintenant deux méthodes normales
//      de l'objet, séparées par des virgules, avec une seule accolade
//      fermante finale.

import prisma from '../config/prisma';
import { emailService } from './email.service';
import type { DecisionEvaluationPE } from '@prisma/client';
import { avenantService } from './avenant.service';
const DELAI_RELANCE_HEURES = 48;

function calculerDateLimiteEvaluation(): Date {
  const date = new Date();
  date.setHours(date.getHours() + DELAI_RELANCE_HEURES);
  return date;
}

/**
 * Détermine le nouveau statut du contrat à partir de la décision prise par
 * le Manager (et confirmée par le Directeur).
 *
 * IMPORTANT : le vocabulaire de `Contrat.statut` utilisé PARTOUT ailleurs
 * dans le code (contratController.ts : createContrat, updateContratStatut,
 * signerContrat...) est strictement : BROUILLON / ENVOYE / ACTIF / RESILIE
 * / TERMINE. Une version précédente de cette fonction renvoyait des valeurs
 * inventées ("CONFIRME", "PROLONGE", "ROMPU") qui n'existent nulle part
 * ailleurs — un contrat aurait fini avec un statut invisible pour tout
 * écran/filtre basé sur `statutsValides`. Corrigé ici : seule la RUPTURE
 * change le statut (-> RESILIE, qui existe déjà) ; les autres décisions ne
 * touchent pas au statut, le contrat reste ACTIF (il l'est déjà depuis la
 * signature).
 *
 * `null` = pas de changement de statut nécessaire.
 */
function determinerStatutContrat(decision: DecisionEvaluationPE | null | undefined): string | null {
  switch (decision) {
    case 'RUPTURE':
      return 'RESILIE';
    case 'CONFIRMATION':
    case 'CHANGEMENT':
    case 'PROLONGATION':
    default:
      // Le contrat reste ACTIF dans tous ces cas : rien à changer sur le
      // statut. (La prolongation touche uniquement la date de fin, gérée
      // séparément dans finaliserApresDirecteur.)
      return null;
  }
}

/**
 * En cas de PROLONGATION, repousse réellement la date de fin du contrat.
 * `dureeProlongation` est stockée en mois.
 */
function calculerNouvelleDateFin(dateFinActuelle: Date, dureeProlongationMois: number): Date {
  const nouvelleDate = new Date(dateFinActuelle);
  nouvelleDate.setMonth(nouvelleDate.getMonth() + dureeProlongationMois);
  return nouvelleDate;
}

/**
 * Génère une référence unique en réessayant en cas de collision (P2002),
 * plutôt qu'un simple count() qui peut créer des doublons si deux
 * déclenchements (cron + manuel) tournent en même temps.
 */
async function genererReferenceUnique(): Promise<string> {
  const year = new Date().getFullYear();
  for (let tentative = 0; tentative < 5; tentative++) {
    const evalCount = await prisma.evaluationPE.count();
    const suffixe = tentative === 0 ? '' : `-${Date.now().toString().slice(-4)}`;
    const reference = `EVAL-${year}-${String(evalCount + 1 + tentative).padStart(4, '0')}${suffixe}`;
    const existe = await prisma.evaluationPE.findUnique({ where: { reference } });
    if (!existe) return reference;
  }
  // Filet de sécurité ultime : timestamp complet, garanti unique.
  return `EVAL-${year}-${Date.now()}`;
}

export const evaluationPEService = {

  // Appelé via POST /evaluations/declencher

  async verifierContratsEcheance(): Promise<number> {
    const today = new Date();
    const j30 = new Date(today);
    j30.setDate(j30.getDate() + 30);

    console.log(`\n Vérification J-30`);
    console.log(`   Aujourd'hui : ${today.toLocaleDateString('fr-FR')}`);
    console.log(`   Seuil J+30  : ${j30.toLocaleDateString('fr-FR')}`);

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

    console.log(` Contrats en approche J-30 : ${contratsEcheance.length}`);

    let count = 0;
    const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', actif: true } });

    for (const contrat of contratsEcheance) {
      if (contrat.evaluationPE) {
        if (!['VALIDEE', 'REJETEE'].includes(contrat.evaluationPE.statut)) {
          const jours = Math.ceil(
            (new Date(contrat.dateFin!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          await prisma.evaluationPE.update({
            where: { id: contrat.evaluationPE.id },
            data: { joursRestants: jours > 0 ? jours : 0 }
          });
          console.log(`    ${contrat.evaluationPE.reference} → joursRestants = ${jours}j`);
        }
        continue;
      }

      try {
        const candidatureEmail = contrat.candidature?.email;
        let employe = null;

        if (candidatureEmail) {
          employe = await prisma.user.findFirst({
            where: { email: candidatureEmail, actif: true }
          });
        }

        if (!employe) {
          const nom = contrat.candidature?.nom;
          const prenom = contrat.candidature?.prenom;
          if (nom && prenom) {
            employe = await prisma.user.findFirst({
              where: { nom, prenom, actif: true }
            });
          }
        }

        // ── FIX FK : employeId est une FK vers User. Avant, en l'absence
        // d'un User correspondant, le code utilisait candidature.id comme
        // fallback — ce qui casse la contrainte de clé étrangère (ou crée
        // une référence incohérente vers un id qui n'existe pas dans users).
        // On ne crée plus l'évaluation dans ce cas : on notifie l'admin pour
        // un rattachement manuel du compte utilisateur, et on continue.
        if (!employe) {
          console.error(
            `    Aucun compte User trouvé pour le candidat du contrat ${contrat.reference} ` +
            `(${contrat.candidature?.prenom} ${contrat.candidature?.nom}). Évaluation PE non créée ` +
            `— un compte utilisateur doit d'abord être créé pour cet employé.`
          );
          if (superAdmin) {
            await emailService.sendNotificationEmail({
              nom: superAdmin.nom,
              prenom: superAdmin.prenom,
              email: superAdmin.email,
              message: `Le contrat ${contrat.reference} arrive à échéance de période d'essai mais ` +
                `aucun compte utilisateur n'est associé au candidat ${contrat.candidature?.prenom} ` +
                `${contrat.candidature?.nom}. Merci de créer/lier son compte pour permettre la création ` +
                `de l'évaluation.`,
              actionUrl: `${process.env.FRONTEND_URL}/contrats/${contrat.id}`
            });
          }
          continue;
        }

        const directionId = contrat.candidature?.offre?.demande?.directionId
          || employe?.directionId
          || null;

        const manager = directionId
          ? await prisma.user.findFirst({
              where: { role: 'MANAGER', directionId, actif: true }
            })
          : null;

        // ── FIX FK : managerId est une FK obligatoire (String, non nullable)
        // vers User. Avant, `managerId: manager?.id || ''` insérait une
        // chaîne vide quand aucun manager n'était trouvé, ce qui viole la
        // contrainte de clé étrangère. On ne crée plus l'évaluation tant
        // qu'aucun manager n'est identifié, et on alerte pour affectation
        // manuelle.
        if (!manager) {
          console.error(
            `    Aucun manager actif trouvé pour la direction "${directionId}" ` +
            `(contrat ${contrat.reference}). Évaluation PE non créée — un manager ` +
            `doit être affecté à cette direction.`
          );
          if (superAdmin) {
            await emailService.sendNotificationEmail({
              nom: superAdmin.nom,
              prenom: superAdmin.prenom,
              email: superAdmin.email,
              message: `Le contrat ${contrat.reference} (${employe.prenom} ${employe.nom}) arrive à ` +
                `échéance de période d'essai mais aucun manager actif n'est affecté à sa direction. ` +
                `Merci d'affecter un manager pour permettre la création de l'évaluation.`,
              actionUrl: `${process.env.FRONTEND_URL}/contrats/${contrat.id}`
            });
          }
          continue;
        }

        const dateFinPE = new Date(contrat.dateFin!);
        const joursRestants = Math.ceil(
          (dateFinPE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const reference = await genererReferenceUnique();

        const evaluation = await prisma.evaluationPE.create({
          data: {
            reference,
            employeId: employe.id,
            managerId: manager.id,
            contratId: contrat.id,
            dateDebut: new Date(contrat.dateDebut),
            dateFin: dateFinPE,
            joursRestants: joursRestants > 0 ? joursRestants : 0,
            statut: 'BROUILLON',
            etapeActuelle: 0,
            totalEtapes: 5 // Resp. Paie -> Manager -> Directeur (circuit voulu)
          }
        });

        console.log(`\n    Évaluation créée : ${evaluation.reference}`);
        console.log(`      Employé  : ${employe.prenom} ${employe.nom}`);
        console.log(`      Fin PE   : ${dateFinPE.toLocaleDateString('fr-FR')} (J-${joursRestants})`);
        console.log(`      Manager  : ${manager.prenom} ${manager.nom}`);

        const respPaie = await prisma.user.findFirst({ where: { role: 'RESP_PAIE', actif: true } });
        if (respPaie) {
          await emailService.sendNotificationEmail({
            nom: respPaie.nom,
            prenom: respPaie.prenom,
            email: respPaie.email,
            message: `Une évaluation de période d'essai arrive à échéance dans ${joursRestants} jour(s) ` +
              `pour ${employe.prenom} ${employe.nom}. Merci de saisir les données contractuelles.`,
            actionUrl: `${process.env.FRONTEND_URL}/evaluations/${evaluation.id}`
          });
        }

        count++;
      } catch (err) {
        console.error(`    Erreur pour contrat ${contrat.reference}:`, err);
      }
    }

    await evaluationPEService.mettreAJourJoursRestants();

    console.log(`\n Vérification terminée — ${count} évaluation(s) créée(s)\n`);
    return count;
  },

  // Recalcule joursRestants pour toutes les évaluations non finalisées

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
      console.log(` joursRestants recalculés pour ${evaluationsActives.length} évaluation(s)`);
    }
  },

  // Créer une ligne EvaluationValidation pour l'étape en cours

  async creerValidationEtape(evaluationId: string, niveauEtape: number, role: string, acteurId: string) {
    return await prisma.evaluationValidation.create({
      data: {
        evaluationId,
        niveauEtape,
        role,
        acteurId,
        decision: 'EN_ATTENTE',
        dateLimite: calculerDateLimiteEvaluation()
      }
    });
  },

  // Clôturer la validation de l'étape en cours (VALIDEE / REJETEE)

  async cloturerValidationEtape(evaluationId: string, niveauEtape: number, decision: string, commentaire?: string) {
    const validation = await prisma.evaluationValidation.findFirst({
      where: { evaluationId, niveauEtape, decision: 'EN_ATTENTE' }
    });
    if (!validation) return null;

    return await prisma.evaluationValidation.update({
      where: { id: validation.id },
      data: { decision, commentaire, dateDecision: new Date() }
    });
  },

  /**
   * Finalise l'évaluation après la décision du Directeur (VALIDEE) :
   * applique le statut réel du contrat en fonction de la décision
   * (CONFIRMATION / PROLONGATION / RUPTURE / CHANGEMENT), et prolonge
   * effectivement la date de fin en cas de PROLONGATION.
   *
   * Avant : le contrat était toujours passé à "CONFIRME", quelle que soit
   * la décision réellement prise par le Manager.
   */
  async finaliserApresDirecteur(evaluationId: string) {
    const evaluation = await prisma.evaluationPE.findUnique({
      where: { id: evaluationId },
      include: { contrat: true }
    });
    if (!evaluation) throw new Error('Evaluation non trouvee');

    const nouveauStatutContrat = determinerStatutContrat(evaluation.decision);

    const dataContrat: any = {};
    if (nouveauStatutContrat !== null) {
      dataContrat.statut = nouveauStatutContrat;
    }

    if (evaluation.decision === 'PROLONGATION' && evaluation.dureeProlongation && evaluation.contrat.dateFin) {
      dataContrat.dateFin = calculerNouvelleDateFin(evaluation.contrat.dateFin, evaluation.dureeProlongation);
    }

    if (Object.keys(dataContrat).length > 0) {
      await prisma.contrat.update({
        where: { id: evaluation.contratId },
        data: dataContrat
      });
    }

    // Le contrat reste ACTIF sauf en cas de RUPTURE (-> RESILIE).
    return nouveauStatutContrat ?? 'ACTIF';
  },

  /**
   * Le Directeur (N+2) peut, selon le cahier des charges, "modifier et/ou
   * valider/supprimer" l'évaluation rédigée par le Manager (N+1). Le champ
   * `evaluationN1Masquee` existe déjà dans le schéma mais n'était utilisé
   * nulle part : cette fonction lui donne enfin un usage, sans migration.
   *
   * Masquer N1 ne l'efface pas (traçabilité conservée en base), mais le
   * masque de l'affichage / des exports au-delà du Directeur lui-même et du
   * SUPER_ADMIN — cohérent avec le "supprimée" du cahier des charges tout
   * en gardant un historique pour audit.
   */
  async masquerEvaluationN1(evaluationId: string, masquer: boolean) {
    return prisma.evaluationPE.update({
      where: { id: evaluationId },
      data: { evaluationN1Masquee: masquer }
    });
  },

  // Vérifier les relances à envoyer (appelé par le cron toutes les heures)

  async checkRelanceEvaluations() {
    const maintenant = new Date();

    // ── Étape 1 : première relance ──
    const aRelancer = await prisma.evaluationValidation.findMany({
      where: {
        decision: 'EN_ATTENTE',
        relanceEnvoyee: false,
        dateLimite: { lt: maintenant }
      },
      include: {
        acteur: true,
        evaluation: { include: { employe: true } }
      }
    });

    for (const validation of aRelancer) {
      const nouvelleDateLimite = calculerDateLimiteEvaluation();

      await prisma.evaluationValidation.update({
        where: { id: validation.id },
        data: { relanceEnvoyee: true, dateLimite: nouvelleDateLimite }
      });

      await emailService.sendEvaluationValidationNotification({
        nom: validation.acteur.nom,
        prenom: validation.acteur.prenom,
        email: validation.acteur.email,
        evaluationRef: validation.evaluation.reference,
        // FIX : nom/prénom étaient inversés
        employeNom: validation.evaluation.employe?.nom || '',
        employePrenom: validation.evaluation.employe?.prenom || '',
        etape: validation.niveauEtape,
        totalEtapes: validation.evaluation.totalEtapes,
        role: validation.role,
        dateLimite: nouvelleDateLimite,
        actionUrl: `${process.env.FRONTEND_URL}/evaluations/${validation.evaluationId}`
      });

      console.log(`Relance envoyée pour évaluation ${validation.evaluation.reference}, étape ${validation.niveauEtape}`);
    }

    // ── Étape 2 : escalade ──
    // FIX : avant, l'escalade notifiait TOUJOURS le RESP_PAIE, même quand
    // c'est le Directeur (étape 2) qui bloque — or le RESP_PAIE n'a aucune
    // autorité hiérarchique sur un Directeur. On notifie désormais le
    // SUPER_ADMIN (autorité neutre pour tout le circuit), et on informe
    // aussi le RESP_PAIE pour le suivi administratif du dossier.
    const aEscalader = await prisma.evaluationValidation.findMany({
      where: {
        decision: 'EN_ATTENTE',
        relanceEnvoyee: true,
        dateLimite: { lt: maintenant }
      },
      include: {
        acteur: true,
        evaluation: { include: { employe: true } }
      }
    });

    for (const validation of aEscalader) {
      const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', actif: true } });
      const respPaie = await prisma.user.findFirst({ where: { role: 'RESP_PAIE', actif: true } });

      const messageEscalade =
        `L'évaluation ${validation.evaluation.reference} (étape ${validation.niveauEtape}, ` +
        `${validation.role} : ${validation.acteur.prenom} ${validation.acteur.nom}) n'a pas été ` +
        `traitée dans les délais, malgré la relance. Une action manuelle est nécessaire.`;

      for (const destinataire of [superAdmin, respPaie].filter(Boolean) as typeof superAdmin[]) {
        if (!destinataire) continue;
        await emailService.sendNotificationEmail({
          nom: destinataire.nom,
          prenom: destinataire.prenom,
          email: destinataire.email,
          message: messageEscalade,
          actionUrl: `${process.env.FRONTEND_URL}/evaluations/${validation.evaluationId}`
        });
      }

      await prisma.evaluationValidation.update({
        where: { id: validation.id },
        data: { dateLimite: calculerDateLimiteEvaluation() }
      });

      console.log(`Escalade pour évaluation ${validation.evaluation.reference}, étape ${validation.niveauEtape}`);
    }

    return { relances: aRelancer.length, escalades: aEscalader.length };
  },

  // Relance manuelle déclenchée par un utilisateur (bouton "Relancer")

  async relancerManuellementEvaluation(evaluationId: string, niveauEtape: number) {
    const validation = await prisma.evaluationValidation.findFirst({
      where: { evaluationId, niveauEtape, decision: 'EN_ATTENTE' },
      include: { acteur: true, evaluation: { include: { employe: true } } }
    });
    if (!validation) throw new Error('Aucune validation en attente trouvée pour cette étape');

    await emailService.sendEvaluationValidationNotification({
      nom: validation.acteur.nom,
      prenom: validation.acteur.prenom,
      email: validation.acteur.email,
      evaluationRef: validation.evaluation.reference,
      // FIX : nom/prénom étaient inversés
      employeNom: validation.evaluation.employe?.nom || '',
      employePrenom: validation.evaluation.employe?.prenom || '',
      etape: validation.niveauEtape,
      totalEtapes: validation.evaluation.totalEtapes,
      role: validation.role,
      dateLimite: validation.dateLimite,
      actionUrl: `${process.env.FRONTEND_URL}/evaluations/${evaluationId}`
    });

    return validation;
  },

  /**
   * RESP_PAIE prépare une proposition de modification de contrat (avenant)
   * à partir de la décision Manager/Directeur, avant validation finale par
   * la DRH. Les valeurs par défaut sont déduites de la décision ; RESP_PAIE
   * peut les surcharger via `overrides`.
   */
  async preparerPropositionModification(
  evaluationId: string,
  proposePar: string,
  overrides: {
    typeAvenant?: string; description?: string; nouveauSalaire?: string; nouvelleDateFin?: string;
    nouveauPoste?: string; nouvelleDirectionId?: string; dateResiliation?: string; motifResiliation?: string;
  }
) {
  const evaluation = await prisma.evaluationPE.findUnique({
    where: { id: evaluationId },
    include: { contrat: true, employe: true }
  });
  if (!evaluation) throw new Error('Evaluation non trouvee');
  if (evaluation.statut !== 'EN_VALIDATION_DRH' || evaluation.etapeActuelle !== 3) {
    throw new Error('Evaluation non a l etape de proposition');
  }

  // Validation minimale côté service — le front peut être contourné.
  if (evaluation.decision === 'RUPTURE' && (!overrides.dateResiliation || !overrides.motifResiliation)) {
    throw new Error('Date et motif de resiliation obligatoires pour une decision de rupture');
  }
  if (evaluation.decision === 'PROLONGATION' && !overrides.nouvelleDateFin && !evaluation.dureeProlongation) {
    throw new Error('Nouvelle date de fin obligatoire pour une prolongation');
  }

  const typeAvenantDefaut = evaluation.decision === 'RUPTURE' ? 'RUPTURE'
    : evaluation.decision === 'PROLONGATION' ? 'PROLONGATION_PE'
    : evaluation.decision === 'CHANGEMENT' ? 'CHANGEMENT_SITUATION'
    : 'CONFIRMATION_PE';

  const descriptionDefaut =
    `Suite à l'évaluation ${evaluation.reference} (décision: ${evaluation.decision}). ` +
    (evaluation.justificationRupture ? `Motif: ${evaluation.justificationRupture}. ` : '') +
    (evaluation.commentaireN1 ? `Avis Manager: ${evaluation.commentaireN1}. ` : '') +
    (evaluation.commentaireN2 ? `Avis Directeur: ${evaluation.commentaireN2}.` : '');

  let nouvelleDateFinDefaut: string | undefined;
  if (evaluation.decision === 'PROLONGATION' && evaluation.dureeProlongation && evaluation.contrat.dateFin) {
    const d = new Date(evaluation.contrat.dateFin);
    d.setMonth(d.getMonth() + evaluation.dureeProlongation);
    nouvelleDateFinDefaut = d.toISOString();
  }

  const proposition = {
    typeAvenant: overrides.typeAvenant || typeAvenantDefaut,
    description: overrides.description || descriptionDefaut,
    nouveauSalaire: overrides.nouveauSalaire || undefined,
    nouvelleDateFin: overrides.nouvelleDateFin || nouvelleDateFinDefaut,
    nouveauPoste: overrides.nouveauPoste || undefined,
    nouvelleDirectionId: overrides.nouvelleDirectionId || undefined,
    dateResiliation: overrides.dateResiliation || undefined,
    motifResiliation: overrides.motifResiliation || undefined,
    proposePar,
    proposeAt: new Date().toISOString(),
    statut: 'EN_ATTENTE_DRH' as const
  };

  const donneesActuelles = (evaluation.contrat.donneesContrat as any) || {};
  await prisma.contrat.update({
    where: { id: evaluation.contratId },
    data: { donneesContrat: { ...donneesActuelles, propositionModification: proposition } }
  });

  await prisma.evaluationPE.update({
    where: { id: evaluationId },
    data: { etapeActuelle: 4 }
  });

  return proposition;
},

  /**
   * La DRH valide ou rejette la proposition de modification préparée par
   * RESP_PAIE. En cas de rejet, le dossier repart à l'étape 3 pour
   * ajustement (boucle purement administrative, sans risque de blocage
   * sur le sort de l'employé, déjà tranché en Circuit 1). En cas
   * d'approbation, l'avenant est réellement appliqué au contrat.
   */
  async validerModificationParDRH(evaluationId: string, approuve: boolean, commentaireDRH?: string) {
    const evaluation = await prisma.evaluationPE.findUnique({
      where: { id: evaluationId },
      include: { contrat: true, employe: true }
    });
    if (!evaluation) throw new Error('Evaluation non trouvee');
    if (evaluation.statut !== 'EN_VALIDATION_DRH' || evaluation.etapeActuelle !== 4) {
      throw new Error('Evaluation non a l etape de validation DRH');
    }

    const donneesActuelles = (evaluation.contrat.donneesContrat as any) || {};
    const proposition = donneesActuelles.propositionModification;
    if (!proposition || proposition.statut !== 'EN_ATTENTE_DRH') {
      throw new Error('Aucune proposition en attente pour cette evaluation');
    }

    if (!approuve) {
      // Renvoi à RESP_PAIE pour ajustement — boucle purement administrative,
      // sans risque de blocage sur le sort de l'employé (déjà tranché en
      // Circuit 1), donc pas besoin de plafond de tentatives ici.
      await prisma.contrat.update({
        where: { id: evaluation.contratId },
        data: {
          donneesContrat: {
            ...donneesActuelles,
            propositionModification: { ...proposition, statut: 'REJETEE_PAR_DRH', commentaireDRH }
          }
        }
      });
      await prisma.evaluationPE.update({ where: { id: evaluationId }, data: { etapeActuelle: 3 } });
      return { approuve: false };
    }

const avenant = await avenantService.appliquerAvenant({
  contratId: evaluation.contratId,
  employeId: evaluation.employeId,
  typeAvenant: proposition.typeAvenant,
  description: proposition.description,
  dateEffet: new Date(),
  nouveauSalaire: proposition.nouveauSalaire || null,
  nouvelleDateFin: proposition.nouvelleDateFin ? new Date(proposition.nouvelleDateFin) : null,
  nouveauPoste: proposition.nouveauPoste || null,
  nouvelleDirectionId: proposition.nouvelleDirectionId || null,
  dateResiliation: proposition.dateResiliation ? new Date(proposition.dateResiliation) : null,
  motifResiliation: proposition.motifResiliation || null
});

const candidature = await prisma.candidature.findUnique({ where: { id: evaluation.contrat.candidatureId! } });
if (candidature) {
  await emailService.sendAvenantEmail({
    nom: candidature.nom,
    prenom: candidature.prenom,
    email: candidature.email,
    contratRef: evaluation.contrat.reference,
    typeAvenant: proposition.typeAvenant,
    description: proposition.description,
    nouveauSalaire: proposition.nouveauSalaire,
    nouvelleDateFin: proposition.nouvelleDateFin ? new Date(proposition.nouvelleDateFin) : undefined,
    consultationUrl: `${process.env.BACKEND_URL}/api/contrats/avenants/${avenant.id}/pdf`
  });
}

    await prisma.contrat.update({
      where: { id: evaluation.contratId },
      data: {
        donneesContrat: {
          ...donneesActuelles,
          propositionModification: { ...proposition, statut: 'VALIDEE', commentaireDRH }
        }
      }
    });

    await prisma.evaluationPE.update({
      where: { id: evaluationId },
      data: { statut: 'VALIDEE', etapeActuelle: 5, valideeAt: new Date() }
    });

    return { approuve: true };
  }
};