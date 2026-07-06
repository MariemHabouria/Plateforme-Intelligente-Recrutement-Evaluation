// frontend/src/services/entretien.service.ts

import api from './api';
import type { Entretien, TypeEntretien, DisponibiliteInterviewer } from '@/types';


// TYPES DE PARAMÈTRES / RÉPONSES


export interface EntretienAvecInfo extends Entretien {
  peutDonnerAvis: boolean;
  dateAvisPossible: string;
}

export interface GetEntretiensParams {
  vueGlobale?: boolean;      // DRH uniquement : true = voir tous les types, false = seulement ses entretiens RH
  type?: TypeEntretien;
  statut?: 'PLANIFIE' | 'REALISE' | 'ANNULE' | 'REPORTE';
  dateDebut?: string;        // format YYYY-MM-DD
  dateFin?: string;
  recherche?: string;        // nom/prénom candidat
  offreId?: string;
  interviewerId?: string;
}

export interface OffreFiltre {
  id: string;
  reference: string;
  intitule: string;
}

export interface CreateEntretienPayload {
  candidatureId: string;
  type: TypeEntretien;
  lieu: string;
}

export interface UpdateEntretienPayload {
  date?: string;
  heure?: string;
  lieu?: string;
}

export interface UpdateFeedbackPayload {
  feedback?: string;
  evaluation?: number;
  statut?: 'PLANIFIE' | 'REALISE' | 'ANNULE' | 'REPORTE';
}

export interface AddDisponibilitePayload {
  demandeId: string;
  disponibilites: Array<{ date: string; heureDebut: string; heureFin: string }>;
}


// SERVICE


export const entretienService = {
  /**
   * Liste des entretiens avec filtres. Le SUPER_ADMIN voit toujours tout (vision globale).
   */
  async getEntretiens(params?: GetEntretiensParams): Promise<EntretienAvecInfo[]> {
    const response = await api.get('/entretiens', { params });
    return response.data.data.entretiens;
  },

  async getEntretienById(id: string): Promise<{ entretien: Entretien; peutDonnerAvis: boolean; dateAvisPossible: string }> {
    const response = await api.get(`/entretiens/${id}`);
    return response.data.data;
  },

  async getEntretiensByCandidature(candidatureId: string): Promise<Entretien[]> {
    const response = await api.get(`/entretiens/candidature/${candidatureId}`);
    return response.data.data.entretiens;
  },

  /**
   * Déclenche l'envoi du lien de self-scheduling au candidat (DRH/SUPER_ADMIN).
   */
  async createEntretien(payload: CreateEntretienPayload): Promise<{ lienEnvoye: boolean }> {
    const response = await api.post('/entretiens', payload);
    return response.data.data;
  },

  async updateEntretien(id: string, payload: UpdateEntretienPayload): Promise<Entretien> {
    const response = await api.put(`/entretiens/${id}`, payload);
    return response.data.data;
  },

  async updateEntretienStatut(id: string, statut: 'PLANIFIE' | 'REALISE' | 'ANNULE' | 'REPORTE'): Promise<Entretien> {
    const response = await api.patch(`/entretiens/${id}/statut`, { statut });
    return response.data.data;
  },

  async updateFeedback(id: string, payload: UpdateFeedbackPayload): Promise<Entretien> {
    const response = await api.patch(`/entretiens/${id}/feedback`, payload);
    return response.data.data;
  },

  async deleteEntretien(id: string): Promise<void> {
    await api.delete(`/entretiens/${id}`);
  },

  // ── Disponibilités ──

  async getMesDisponibilites(demandeId?: string): Promise<DisponibiliteInterviewer[]> {
    const response = await api.get('/entretiens/mes-disponibilites', { params: demandeId ? { demandeId } : {} });
    return response.data.data.disponibilites;
  },

  async getDisponibilitesParDemande(demandeId: string, type?: TypeEntretien): Promise<{ disponibilites: DisponibiliteInterviewer[]; niveauPoste: string }> {
    const response = await api.get(`/entretiens/disponibilites/${demandeId}`, { params: type ? { type } : {} });
    return response.data.data;
  },

  async addDisponibilite(payload: AddDisponibilitePayload): Promise<DisponibiliteInterviewer[]> {
    const response = await api.post('/entretiens/disponibilites', payload);
    return response.data.data.disponibilites;
  },

  async deleteDisponibilite(id: string): Promise<void> {
    await api.delete(`/entretiens/disponibilites/${id}`);
  },

  // ── Listes de référence ──

  async getOffresPourFiltre(): Promise<OffreFiltre[]> {
    const response = await api.get('/entretiens/offres-filtre');
    return response.data.data.offres;
  },

  async getStatuts(): Promise<string[]> {
    const response = await api.get('/entretiens/statuts');
    return response.data.statuts;
  },

  async getTypes(): Promise<Array<{ value: TypeEntretien; label: string; description: string }>> {
    const response = await api.get('/entretiens/types');
    return response.data.types;
  }
};