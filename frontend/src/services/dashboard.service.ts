// frontend/src/services/dashboard.service.ts

import api from './api';

export interface DashboardStats {
  kpis: {
    delaiMoyenRecrutement: number;
    tauxTransformation: number;
    coutMoyenRecrutement: number;
    tauxSatisfaction: number;
    tauxValidationDemandes: number;
    delaiMoyenValidation: number;
  };
  demandes: {
    total: number;
    enCours: number;
    validees: number;
    rejetees: number;
    tauxValidation: number;
    parNiveau: Record<string, number>;
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
    entretien: number;
    acceptees: number;
    refusees: number;
    tauxAcceptation: number;
    parOffre: { offreId: string; intitule: string; count: number }[];
  };
  entretiens: {
    total: number;
    planifies: number;
    realises: number;
    aVenir: number;
    tauxRealisation: number;
    moyenneEvaluation: number;
    parType: { type: string; count: number }[];
  };
  activiteRecente: {
    demandes: { reference: string; intitulePoste: string; statut: string; date: string; createur?: string }[];
    candidatures: { reference: string; nom: string; prenom: string; date: string; offre: string }[];
    offres: { reference: string; intitule: string; statut: string; date: string }[];
    entretiens: { type: string; candidat: string; date: string; statut: string }[];
  };
  tendances: {
    mois: string[];
    demandes: number[];
    offres: number[];
    candidatures: number[];
    embauches: number[];
  };
}

class DashboardService {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get('/dashboard/stats');
    return response.data.data;
  }
}

export const dashboardService = new DashboardService();