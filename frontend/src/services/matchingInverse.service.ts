// frontend/src/services/matchingInverse.service.ts

import api from './api';

export interface MatchingResult {
  candidatureId: string;
  candidatNom: string;
  candidatPrenom: string;
  email: string;
  telephone?: string;
  score: number;
  competencesMatch: string[];
  competencesManquantes: string[];
  raison: string;
}

export interface MatchingResponse {
  offreId: string;
  candidaturesMatch: MatchingResult[];
}

export const matchingInverseService = {
  async executerMatching(offreId: string): Promise<MatchingResponse> {
    const response = await api.post(`/matching-inverse/${offreId}`);
    return response.data.data;
  },

  async creerCandidaturesMatching(offreId: string, candidatureIds: string[]): Promise<any> {
    const response = await api.post(`/matching-inverse/${offreId}/creer`, { candidatureIds });
    return response.data;
  },

  async getCandidaturesMatching(offreId: string): Promise<MatchingResponse> {
    const response = await api.get(`/matching-inverse/${offreId}/candidatures`);
    return response.data.data;
  },

  async getCandidatPassifDetail(candidatureId: string): Promise<any> {
    const response = await api.get(`/matching-inverse/candidat/${candidatureId}`);
    return response.data.data;
  }
};