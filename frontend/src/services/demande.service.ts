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

  validations?: Validation[];
  disponibilites?: Disponibilite[];
  createdAt: string;
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

export interface Disponibilite {
  id: string;
  date: string;
  heureDebut: string;
  heureFin: string;
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
  directionId?: string;  // Pour les rôles transversaux
  disponibilites?: { date: string; heureDebut: string; heureFin: string }[];
}

// ✅ Fonction utilitaire pour obtenir le libellé du niveau
export const getNiveauLabel = (niveau: string): string => {
  const labels: Record<string, string> = {
    'TECHNICIEN': 'Technicien / Ouvrier',
    'EMPLOYE': 'Employé / Agent',
    'CADRE_DEBUTANT': ' Cadre débutant',
    'CADRE_CONFIRME': ' Cadre confirmé',
    'CADRE_SUPERIEUR': ' Cadre supérieur',
    'STRATEGIQUE': 'Poste stratégique'
  };
  return labels[niveau] || niveau;
};

// ✅ Fonction utilitaire pour obtenir la couleur du niveau
export const getNiveauColor = (niveau: string): string => {
  const colors: Record<string, string> = {
    'TECHNICIEN': '#4a90d9',
    'EMPLOYE': '#4a90d9',
    'CADRE_DEBUTANT': '#2ecc71',
    'CADRE_CONFIRME': '#f39c12',
    'CADRE_SUPERIEUR': '#e74c3c',
    'STRATEGIQUE': '#9b59b6'
  };
  return colors[niveau] || '#666';
};

// ✅ Fonction utilitaire pour obtenir les étapes du circuit
export const getCircuitLabelsForNiveau = (niveau: string): string[] => {
  const circuits: Record<string, string[]> = {
    'TECHNICIEN': ['DIR', 'RH'],
    'EMPLOYE': ['DIR', 'RH'],
    'CADRE_DEBUTANT': ['DIR', 'RH', 'DAF'],
    'CADRE_CONFIRME': ['DIR', 'RH', 'DAF', 'DGA'],
    'CADRE_SUPERIEUR': ['DIR', 'RH', 'DAF', 'DGA', 'DG'],
    'STRATEGIQUE': ['DIR', 'RH', 'DAF', 'DGA', 'DG']
  };
  return circuits[niveau] || ['DIR', 'RH', 'DAF', 'DGA'];
};

// ✅ Fonction utilitaire pour obtenir la description du circuit
export const getCircuitDescription = (niveau: string): string => {
  const descriptions: Record<string, string> = {
    'TECHNICIEN': 'Validation par Directeur → RH',
    'EMPLOYE': 'Validation par Directeur → RH',
    'CADRE_DEBUTANT': 'Validation par Directeur → RH → DAF',
    'CADRE_CONFIRME': 'Validation par Directeur → RH → DAF → DGA',
    'CADRE_SUPERIEUR': 'Validation par Directeur → RH → DAF → DGA → DG',
    'STRATEGIQUE': 'Validation complète (toutes les directions)'
  };
  return descriptions[niveau] || 'Validation standard';
};

export const demandeService = {
  async getDemandes(params?: { page?: number; limit?: number; statut?: string; priorite?: string }) {
    const response = await api.get('/demandes', { params });
    return response.data;
  },

  async getDemandeById(id: string) {
    const response = await api.get(`/demandes/${id}`);
    return response.data;
  },

  // ✅ createDemande mise à jour avec niveau
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

  async validerDemande(id: string, decision: 'Validee' | 'Refusee', commentaire?: string) {
    const response = await api.post(`/demandes/${id}/valider`, { decision, commentaire });
    return response.data;
  }
};