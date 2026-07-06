import cron from 'node-cron';
import { relanceService } from '../services/relance.service';
import { relanceFiche48hService } from '../services/relanceFiche48h.service';
import { evaluationPEService } from '../services/evaluationPE.service';

export const startRelanceJobs = () => {
  cron.schedule('0 * * * *', async () => {
    console.log(' [CRON] Vérification des deadlines...');
    
    try {
      const count = await relanceService.verifierEtCreerRelances();
      if (count > 0) {
        console.log(`[CRON] ${count} relance(s) créée(s)`);
      }
      
      const executedCount = await relanceService.executerRelancesPlanifiees();
      if (executedCount > 0) {
        console.log(` [CRON] ${executedCount} relance(s) exécutée(s)`);
      }

      const ficheRefuseesCount = await relanceFiche48hService.verifierEtRefuserFichesNonRecues();
      if (ficheRefuseesCount > 0) {
        console.log(` [CRON] ${ficheRefuseesCount} candidature(s) refusee(s) automatiquement (fiche non recue sous 48h)`);
      }

      const evalResult = await evaluationPEService.checkRelanceEvaluations();
      if (evalResult.relances > 0 || evalResult.escalades > 0) {
        console.log(` [CRON] Evaluations PE: ${evalResult.relances} relance(s), ${evalResult.escalades} escalade(s)`);
      }
    } catch (error) {
      console.error(' [CRON] Erreur lors des relances:', error);
    }
  });
  
  console.log(' Job de relance démarré (exécution toutes les heures)');
};