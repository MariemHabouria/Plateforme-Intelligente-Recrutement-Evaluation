"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRelanceJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const relance_service_1 = require("../services/relance.service");
/**
 * Job cron qui s'exécute toutes les heures pour vérifier les deadlines
 */
const startRelanceJobs = () => {
    // Toutes les heures
    node_cron_1.default.schedule('0 * * * *', async () => {
        console.log('🔄 [CRON] Vérification des deadlines...');
        try {
            const count = await relance_service_1.relanceService.verifierEtCreerRelances();
            if (count > 0) {
                console.log(`📧 [CRON] ${count} relance(s) créée(s)`);
            }
            const executedCount = await relance_service_1.relanceService.executerRelancesPlanifiees();
            if (executedCount > 0) {
                console.log(`📧 [CRON] ${executedCount} relance(s) exécutée(s)`);
            }
        }
        catch (error) {
            console.error('❌ [CRON] Erreur lors des relances:', error);
        }
    });
    console.log('✅ Job de relance démarré (exécution toutes les heures)');
};
exports.startRelanceJobs = startRelanceJobs;
