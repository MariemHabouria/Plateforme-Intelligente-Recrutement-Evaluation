import api from './api';

export interface Demande {
  id: string;
  reference: string;
  intitulePoste: string;
  description?: string;
  justification: string;
  motif: 'CREATION' | 'REMPLACEMENT' | 'RENFORCEMENT' | 'NOUVEAU_POSTE' | 'EXPANSION';
  typeContrat: 'CDI' | 'CDD' | 'STAGE' | 'ALTERNANCE' | 'FREELANCE';
  priorite: 'HAUTE' | 'MOYENNE' | 'BASSE';
  budgetEstime: number;
  dateSouhaitee: string;
  statut: string;
  etapeActuelle: number;
  totalEtapes?: number;
  circuitType?: string;
  managerId: string;
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
  justification: string;
  motif: string;
  typeContrat: string;
  priorite: string;
  budgetEstime: number;
  dateSouhaitee: string;
  description?: string;
  disponibilites?: { date: string; heureDebut: string; heureFin: string }[];
}

export const demandeService = {
  // Récupérer toutes les demandes
  async getDemandes(params?: { page?: number; limit?: number; statut?: string; priorite?: string }) {
    const response = await api.get('/demandes', { params });
    return response.data;
  },

  // Récupérer une demande par ID
  async getDemandeById(id: string) {
    const response = await api.get(`/demandes/${id}`);
    return response.data;
  },

  // Créer une demande
  async createDemande(data: CreateDemandeData) {
    const response = await api.post('/demandes', data);
    return response.data;
  },

  // Modifier une demande
  async updateDemande(id: string, data: Partial<CreateDemandeData>) {
    const response = await api.patch(`/demandes/${id}`, data);
    return response.data;
  },

  // Supprimer une demande
  async deleteDemande(id: string) {
    const response = await api.delete(`/demandes/${id}`);
    return response.data;
  },

  // Soumettre une demande au circuit
  async submitDemande(id: string) {
    const response = await api.post(`/demandes/${id}/submit`);
    return response.data;
  },

  // Valider une étape
  async validerDemande(id: string, decision: 'Validee' | 'Refusee', commentaire?: string) {
    const response = await api.post(`/demandes/${id}/valider`, { decision, commentaire });
    return response.data;
  }
};