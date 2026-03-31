"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.relanceService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
exports.relanceService = {
    /**
     * Vérifier les deadlines et créer les jobs de relance
     */
    async verifierEtCreerRelances() {
        const maintenant = new Date();
        // 1. Créer les jobs de relance pour les validations en attente
        const validationsEnAttente = await prisma_1.default.validationEtape.findMany({
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
            const heuresRetard = Math.floor((maintenant.getTime() - validation.dateLimite.getTime()) / (1000 * 60 * 60));
            let typeRelance = 'premier_rappel';
            if (heuresRetard >= 24) {
                typeRelance = 'second_rappel';
            }
            if (heuresRetard >= 48) {
                typeRelance = 'escalade';
            }
            // SIMULATION EMAIL (à remplacer par n8n plus tard)
            console.log(`
📧 [RAPPEL] ${typeRelance.toUpperCase()} - ${validation.acteur.email}
   Demande: ${validation.demande.reference}
   Poste: ${validation.demande.intitulePoste}
   Créé par: ${validation.demande.manager.prenom} ${validation.demande.manager.nom}
   Retard: ${heuresRetard}h
   Lien: ${process.env.FRONTEND_URL}/validations/${validation.id}
      `);
            // Marquer comme relancée
            await prisma_1.default.validationEtape.update({
                where: { id: validation.id },
                data: { relanceEnvoyee: true }
            });
            // Créer un job pour la prochaine relance (24h)
            const prochaineRelance = new Date();
            prochaineRelance.setHours(prochaineRelance.getHours() + 24);
            await prisma_1.default.relanceJob.create({
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
        const jobs = await prisma_1.default.relanceJob.findMany({
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
                await prisma_1.default.relanceJob.update({
                    where: { id: job.id },
                    data: { executee: true, executeeAt: maintenant }
                });
                continue;
            }
            // SIMULATION EMAIL
            console.log(`
📧 [RAPPEL PLANIFIÉ] ${job.type.toUpperCase()} - ${validation.acteur.email}
   Demande: ${validation.demande.reference}
   Poste: ${validation.demande.intitulePoste}
   Lien: ${process.env.FRONTEND_URL}/validations/${validation.id}
      `);
            await prisma_1.default.relanceJob.update({
                where: { id: job.id },
                data: { executee: true, executeeAt: maintenant }
            });
        }
        return jobs.length;
    }
};
