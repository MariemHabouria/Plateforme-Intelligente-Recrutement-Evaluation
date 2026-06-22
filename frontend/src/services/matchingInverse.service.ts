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
  seuilUtilise?: number;
}

export interface CandidatDetail {
  candidature: {
    id: string;
    reference: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    cvUrl: string;
    cvTexte?: string;
    scoreGlobal: number;
    scoreExp: number;
    competencesDetectees: string[];
    competencesManquantes: string[];
    statut: string;
    dateSoumission: string;
    offre?: {
      id: string;
      reference: string;
      intitule: string;
      demande?: {
        id: string;
        niveau: string;
        direction?: { id: string; nom: string };
        createur?: { id: string; nom: string; prenom: string; role: string };
      };
    } | null;
    entretiens?: {
      id: string;
      type: string;
      date: string;
      heure: string;
      lieu: string;
      statut: string;
      feedback?: string;
      evaluation?: number;
      interviewer: { id: string; nom: string; prenom: string; role: string };
    }[];
  };
  historiqueCandidatures: {
    id: string;
    statut: string;
    dateSoumission: string;
    scoreGlobal: number;
    offre: { id: string; reference: string; intitule: string };
  }[];
}

export const matchingInverseService = {
  async executerMatching(offreId: string): Promise<MatchingResponse> {
    const response = await api.get(`/matching-inverse/${offreId}`);
    return response.data.data;
  },

  async creerCandidaturesMatching(offreId: string, candidatureIds: string[]): Promise<any> {
    const response = await api.post(`/matching-inverse/${offreId}/creer`, { candidatureIds });
    return response.data;
  },

  async getCandidatPassifDetail(candidatureId: string, offreId?: string): Promise<CandidatDetail> {
    const url = offreId
      ? `/matching-inverse/candidat/${candidatureId}?offreId=${offreId}`
      : `/matching-inverse/candidat/${candidatureId}`;
    const response = await api.get(url);
    return response.data.data;
  },
};