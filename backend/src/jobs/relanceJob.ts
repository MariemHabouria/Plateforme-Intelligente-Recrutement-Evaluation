import cron from 'node-cron';
import { relanceService } from '../services/relance.service';

/**
 * Job cron qui s'exécute toutes les heures pour vérifier les deadlines
 */
export const startRelanceJobs = () => {
  // Toutes les heures
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 [CRON] Vérification des deadlines...');
    
    try {
      const count = await relanceService.verifierEtCreerRelances();
      if (count > 0) {
        console.log(`📧 [CRON] ${count} relance(s) créée(s)`);
      }
      
      const executedCount = await relanceService.executerRelancesPlanifiees();
      if (executedCount > 0) {
        console.log(`📧 [CRON] ${executedCount} relance(s) exécutée(s)`);
      }
    } catch (error) {
      console.error('❌ [CRON] Erreur lors des relances:', error);
    }
  });
  
  console.log('✅ Job de relance démarré (exécution toutes les heures)');
};