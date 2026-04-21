// frontend/src/services/demande.service.ts

import api from './api';

export interface Demande {
  id: string;
  reference: string;
  intitulePoste: string;
  niveau: string;
  description?: string;
  justification: string;
  motif: string;
  typeContrat: string;
  priorite: string;
  budgetMin?: number;
  budgetMax?: number;
  dateSouhaitee: string;
  statut: string;
  etapeActuelle: number;
  totalEtapes?: number;
  circuitType?: string;
  createur?: { id: string; nom: string; prenom: string; email: string; role: string };
  manager?: { id: string; nom: string; prenom: string; email: string };
  direction?: { id: string; code: string; nom: string };
  validations?: Validation[];
  disponibilites?: Disponibilite[];
  disponibilitesInterviewers?: DisponibiliteInterviewer[];
  createdAt: string;
}

export interface Disponibilite {
  id: string;
  date: string;
  heureDebut: string;
  heureFin: string;
}

export interface DisponibiliteInterviewer {
  id: string;
  userId: string;
  demandeId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  reservee: boolean;
  createdAt: string;
  user?: {
    id: string;
    nom: string;
    prenom: string;
    role: string;
  };
}

export interface Validation {
  id: string;
  niveauEtape: number;
  acteur: { id: string; nom: string; prenom: string; role: string };
  decision: 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE';
  commentaire?: string;
  dateLimite: string;
  dateDecision?: string;
}

export interface CreateDemandeData {
  intitulePoste: string;
  niveau: string;
  justification: string;
  motif: string;
  commentaireMotif?: string;
  personneRemplaceeNom?: string;
  fonctionRemplacee?: string;
  typeContrat: string;
  priorite: string;
  budgetMin: number;
  budgetMax: number;
  dateSouhaitee: string;
  description?: string;
  directionId?: string;
  disponibilites?: { date: string; heureDebut: string; heureFin: string }[];
}

// ✅ Exporter l'objet demandeService (pas la classe)
export const demandeService = {
  async getDemandes(params?: { page?: number; limit?: number; statut?: string; priorite?: string }) {
  const response = await api.get('/demandes', { 
    params: {
      ...params,
      _t: Date.now()  // ← Ajouter pour bypass cache
    }
  });
  return response.data;
},

  async getDemandeById(id: string) {
    const response = await api.get(`/demandes/${id}`);
    return response.data;
  },

  async createDemande(data: CreateDemandeData) {
    const response = await api.post('/demandes', data);
    return response.data;
  },

  async updateDemande(id: string, data: Partial<CreateDemandeData>) {
    const response = await api.patch(`/demandes/${id}`, data);
    return response.data;
  },

  async deleteDemande(id: string) {
    const response = await api.delete(`/demandes/${id}`);
    return response.data;
  },

  async submitDemande(id: string) {
    const response = await api.post(`/demandes/${id}/submit`);
    return response.data;
  },

  validerDemande: async (id: string, decision: 'Validee' | 'Refusee', commentaire?: string, disponibilites?: any[]) => {
    const response = await api.patch(`/demandes/${id}/valider`, {
      decision,
      commentaire,
      disponibilites  // ✅ Ajout des disponibilités
    });
    return response.data;
  },
};