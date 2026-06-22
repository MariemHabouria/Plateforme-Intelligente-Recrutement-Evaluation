// frontend/src/services/dashboard.service.ts

import api from './api';

export interface DashboardStats {
  // Informations utilisateur
  user: {
    id: string;
    nom: string;
    prenom: string;
    role: string;
    directionId: string | null;
  };
  
  // KPIs (communs + spécifiques par rôle)
  kpis: {
    // KPIs communs
    delaiMoyenRecrutement: number;
    tauxTransformation: number;
    budgetTotalEngage: number;
    moyenneEvaluation: number;
    validationsEnAttente: number;
    evaluationsAPreparer: number;
    
    // KPIs SUPER_ADMIN
    utilisateursActifs?: number;
    utilisateursTotal?: number;
    directionsActives?: number;
    tauxOccupation?: number;
    
    // KPIs MANAGER
    monEquipe?: number;
    entretiensASaisir?: number;
    mesEvaluations?: number;
    mesContratsActifs?: number;
    
    // KPIS DIRECTEUR
    directionsSousResponsabilite?: number;
    demandesDirection?: number;
    recrutementsDirection?: number;
    budgetDirection?: number;
    
    // KPIs DRH
    offresPubliees?: number;
    candidaturesNouvelles?: number;
    entretiensASuivre?: number;
    tauxRemplissage?: number;
    
    // KPIs DAF
    budgetTotal?: number;
    demandesBudget?: number;
    coutMoyenParRecrutement?: number;
    economieBudgetaire?: number;
    
    // KPIs DGA
    demandesStrategiques?: number;
    validationsEnCours?: number;
    impactRH?: number;
    
    // KPIs DG
    visionGlobale?: number;
    validationFinale?: number;
    recrutementsAnnee?: number;
    performanceGlobale?: number;
    
    // KPIs RESP_PAIE
    contratsAPreparer?: number;
    evaluationsASaisir?: number;
    contratsActifs?: number;
    periodesEssai?: number;
  };
  
  // Compteurs principaux
  counters: {
    demandes: {
      total: number;
      enCours: number;
      validees: number;
      rejetees: number;
      annulees: number;
      tauxValidation: number;
      parNiveau: Record<string, number>;
      parStatut: Record<string, number>;
    };
    offres: {
      total: number;
      publiees: number;
      brouillons: number;
      cloturees: number;
      tauxPublication: number;
    };
    candidatures: {
      total: number;
      nouvelles: number;
      preselectionnees: number;
      ficheEnvoyee: number;
      ficheRecue: number;
      entretien: number;
      acceptees: number;
      refusees: number;
      tauxAcceptation: number;
      parOffre: any[];
    };
    entretiens: {
      total: number;
      planifies: number;
      realises: number;
      annules: number;
      reportes: number;
      aVenir: number;
      tauxRealisation: number;
      moyenneEvaluation: number;
      parType: Array<{ type: string; count: number }>;
    };
    contrats: {
      total: number;
      brouillons: number;
      envoyes: number;
      actifs: number;
      resilies: number;
      termines: number;
    };
    evaluations: {
      total: number;
      brouillons: number;
      enCours: number;
      validees: number;
      rejetees: number;
      aRendre: number;
      depassees: number;
    };
  };
  
  // Activité récente
  activiteRecente: {
    demandes: Array<{
      id: string;
      reference: string;
      intitulePoste: string;
      statut: string;
      date: string;
      createur?: string;
      direction?: string;
    }>;
    candidatures: Array<{
      id: string;
      reference: string;
      nom: string;
      prenom: string;
      statut: string;
      date: string;
      offre: string;
      offreRef?: string;
    }>;
    entretiens: Array<{
      id: string;
      type: string;
      date: string;
      heure: string;
      statut: string;
      candidat: string;
      interviewer: string;
    }>;
    contrats: Array<{
      id: string;
      reference: string;
      type: string;
      statut: string;
      dateDebut: string;
      employe: string;
    }>;
  };
  
  // Logs d'audit
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string | null;
    acteur: string;
    createdAt: string;
  }>;
  
  // Tendances graphiques
  tendances: {
    mois: string[];
    demandes: number[];
    offres: number[];
    candidatures: number[];
    embauches: number[];
  };
  
  // Alertes
  alertes: Array<{
    type: 'danger' | 'warning' | 'info';
    message: string;
    lien: string;
  }>;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get('/dashboard/stats');
    return response.data.data;
  }
};