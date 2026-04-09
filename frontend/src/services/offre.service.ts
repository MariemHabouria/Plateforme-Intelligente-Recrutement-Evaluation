// frontend/src/services/offre.service.ts

import api from './api';

export interface Offre {
  id: string;
  reference: string;
  intitule: string;
  description: string;
  profilRecherche: string;
  competences: string[];
  fourchetteSalariale: string;
  typeContrat: string;
  statut: 'BROUILLON' | 'PUBLIEE' | 'CLOTUREE';
  canauxPublication: string[];
  lienCandidature?: string;
  rhId?: string;
  demandeId?: string;
  datePublication?: string;
  createdAt: string;
  updatedAt: string;
  demande?: {
    reference: string;
    intitulePoste: string;
    manager?: { nom: string; prenom: string };
  };
  _count?: {
    candidatures: number;
  };
}

export interface DemandeLight {
  id: string;
  reference: string;
  intitulePoste: string;
  typeContrat: string;
  budgetMin?: number;
  budgetMax?: number;
  direction?: { nom: string };
}

export interface CreateOffreDto {
  demandeId: string;
  intitule: string;
  description?: string;
  profilRecherche?: string;
  competences?: string[];
  fourchetteSalariale?: string;
  typeContrat: string;
  canauxPublication?: string[];
}

class OffreService {
  // --------------------------------------------------------
  // OFFRES
  // --------------------------------------------------------

 async getOffres(params?: { statut?: string; page?: number; limit?: number }) {
  const response = await api.get('/offres', { params });
  return response.data; // response.data = { success, data: { offres, pagination } }
}


  async getOffreById(id: string) {
    const response = await api.get(`/offres/${id}`);
    return response.data;
  }

  async createOffre(data: CreateOffreDto) {
    const response = await api.post('/offres', data);
    return response.data;
  }

  async updateOffre(id: string, data: Partial<CreateOffreDto>) {
    const response = await api.put(`/offres/${id}`, data);
    return response.data;
  }

  async deleteOffre(id: string) {
    const response = await api.delete(`/offres/${id}`);
    return response.data;
  }

  async publierOffre(id: string, canaux: string[]) {
    const response = await api.post(`/offres/${id}/publier`, { canaux });
    return response.data;
  }

  async genererAvecIA(demandeId: string) {
    const response = await api.post('/offres/generer-ia', { demandeId });
    return response.data;
  }

  // --------------------------------------------------------
  // DEMANDES SANS OFFRE
  // Retourne uniquement les demandes VALIDÉE sans offre associée
  // Utiliser dans OffreFormModal à la place de demandeService.getDemandes
  // --------------------------------------------------------

  async getDemandesSansOffre(): Promise<{ data: { demandes: DemandeLight[] }; success: boolean }> {
    const response = await api.get('/offres/demandes-sans-offre');
    return response.data;
  }
}

export const offreService = new OffreService();