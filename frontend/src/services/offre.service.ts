
import api from './api';

export interface Offre {
  id: string;
  reference: string;
  intitule: string;
  description?: string;
  profilRecherche?: string;
  competences: string[];
  fourchetteSalariale?: string;
  typeContrat: string;
  statut: 'BROUILLON' | 'PUBLIEE' | 'CLOTUREE';
  canauxPublication: string[];
  datePublication?: string;
  createdAt: string;
  demandeId?: string;
  demande?: any;
  _count?: { candidatures: number };
}

export const offreService = {
  // Récupérer toutes les offres
  getOffres: async (params?: { page?: number; limit?: number; statut?: string }) => {
    const response = await api.get('/offres', { params });
    return response.data;
  },

  // Récupérer une offre par ID
  getOffreById: async (id: string) => {
    const response = await api.get(`/offres/${id}`);
    return response.data;
  },

  // Générer offre avec IA (maison)
  genererAvecIA: async (demandeId: string) => {
    const response = await api.post('/offres/generer-ia', { demandeId });
    return response.data;
  },

  // Créer offre
  createOffre: async (data: any) => {
    const response = await api.post('/offres', data);
    return response.data;
  },

  // Modifier offre
  updateOffre: async (id: string, data: any) => {
    const response = await api.put(`/offres/${id}`, data);
    return response.data;
  },

  // Publier offre (multi-canaux)
  publierOffre: async (id: string, canaux: string[]) => {
    const response = await api.post(`/offres/${id}/publier`, { canaux });
    return response.data;
  },

  // Supprimer offre
  deleteOffre: async (id: string) => {
    const response = await api.delete(`/offres/${id}`);
    return response.data;
  }
};