// backend/src/services/evaluationPE.service.ts

import prisma from '../config/prisma';
import { emailService } from './email.service';

export const evaluationPEService = {
  verifierContratsEcheance: async () => {
    console.log('🔍 Vérification des contrats pour évaluations PE...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dateLimite = new Date(today);
    dateLimite.setDate(today.getDate() + 30);
    
    console.log(`Période: du ${today.toLocaleDateString()} au ${dateLimite.toLocaleDateString()}`);
    
    // Récupérer les contrats avec dateFin dans les 30 jours
    const contrats = await prisma.contrat.findMany({
      where: {
        dateFin: { 
          gte: today, 
          lte: dateLimite 
        },
        statut: 'ACTIF',
        evaluationPE: null
      },
      include: {
        candidature: {
          include: {
            offre: {
              include: {
                demande: { 
                  include: { direction: true } 
                }
              }
            }
          }
        }
      }
    });
    
    console.log(`📊 Contrats trouvés: ${contrats.length}`);
    
    if (contrats.length === 0) {
      console.log('⚠️ Aucun contrat à traiter');
      return 0;
    }
    
    let evaluationsCrees = 0;
    
    for (const contrat of contrats) {
      try {
        // Vérifications de sécurité
        if (!contrat.candidature) {
          console.log(`⚠️ Contrat ${contrat.reference}: pas de candidature associée`);
          continue;
        }
        
        if (!contrat.candidature.offre) {
          console.log(`⚠️ Contrat ${contrat.reference}: pas d'offre associée`);
          continue;
        }
        
        if (!contrat.candidature.offre.demande) {
          console.log(`⚠️ Contrat ${contrat.reference}: pas de demande associée`);
          continue;
        }
        
        const directionId = contrat.candidature.offre.demande.directionId;
        
        if (!directionId) {
          console.log(`⚠️ Contrat ${contrat.reference}: pas de direction associée`);
          continue;
        }
        
        // Calculer les jours restants
        const joursRestants = Math.ceil(
          (contrat.dateFin!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Trouver le manager de la même direction
        const manager = await prisma.user.findFirst({
          where: {
            role: 'MANAGER',
            directionId: directionId,
            actif: true
          }
        });
        
        if (!manager) {
          console.log(`⚠️ Contrat ${contrat.reference}: aucun manager trouvé pour la direction ${directionId}`);
          continue;
        }
        
        // Générer une référence unique
        const year = new Date().getFullYear();
        const count = await prisma.evaluationPE.count();
        const reference = `EVAL-${year}-${String(count + 1).padStart(4, '0')}`;
        
        // Créer l'évaluation
        const evaluation = await prisma.evaluationPE.create({
          data: {
            reference,
            employeId: contrat.candidature.id,
            managerId: manager.id,
            contratId: contrat.id,
            dateDebut: contrat.dateDebut,
            dateFin: contrat.dateFin!,
            joursRestants: joursRestants > 0 ? joursRestants : 0,
            statut: 'BROUILLON',
            etapeActuelle: 0,
            totalEtapes: 3  // ✅ Changé de 5 à 3 (Paie → Manager → Directeur)
          }
        });
        
        evaluationsCrees++;
        console.log(`✅ Évaluation créée: ${evaluation.reference} pour ${contrat.candidature.prenom} ${contrat.candidature.nom}`);
        
        // Notifier le manager
        if (manager) {
          await emailService.sendEvaluationNotification({
            nom: manager.nom,
            prenom: manager.prenom,
            email: manager.email,
            evaluationRef: evaluation.reference,
            employeNom: contrat.candidature.nom,
            employePrenom: contrat.candidature.prenom,
            joursRestants,
            actionUrl: `${process.env.FRONTEND_URL}/evaluations/${evaluation.id}`
          });
          console.log(`📧 Email envoyé au manager: ${manager.email}`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur pour contrat ${contrat.reference}:`, error);
      }
    }
    
    console.log(`✨ ${evaluationsCrees} évaluation(s) PE créée(s)`);
    return evaluationsCrees;
  },
  
  calculerJoursRestants: (dateFin: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((dateFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  },
  
  peutVoirEvaluationN1: (userRole: string, etapeActuelle: number, evaluationN1Masquee: boolean): boolean => {
    // Manager et Directeur peuvent toujours voir l'évaluation N1
    if (userRole === 'MANAGER' || userRole === 'DIRECTEUR') {
      return true;
    }
    // Les autres rôles ne voient l'évaluation N1 que si elle n'est pas masquée
    return !evaluationN1Masquee;
  }
};