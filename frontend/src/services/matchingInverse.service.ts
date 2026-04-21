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
  offre: {
    id: string;
    reference: string;
    intitule: string;
  };
  matching: MatchingResult[];
  total: number;
  seuil: number;
}
export interface CandidatDetail {
  candidature: {
    id: string;
    reference: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    cvUrl: string;
    cvTexte: string;
    scoreGlobal: number;
    scoreExp: number;
    competencesDetectees: string[];
    competencesManquantes: string[];
    statut: string;
    dateSoumission: string;
    offre: {
      id: string;
      reference: string;
      intitule: string;
      description: string;
      profilRecherche: string;
      competences: string[];
      typeContrat: string;
      demande: {
        id: string;
        reference: string;
        intitulePoste: string;
        direction: { nom: string };
        createur: { nom: string; prenom: string };
      };
    };
    entretiens: {
      id: string;
      type: string;
      date: string;
      heure: string;
      lieu: string;
      statut: string;
      feedback: string;
      evaluation: number;
      interviewer: { nom: string; prenom: string; role: string };
    }[];
    contrat: {
      id: string;
      reference: string;
      statut: string;
    } | null;
  };
  historiqueCandidatures: {
    id: string;
    reference: string;
    offre: {
      reference: string;
      intitule: string;
      statut: string;
    };
    dateSoumission: string;
    statut: string;
    scoreGlobal: number;
  }[];
}
export const matchingInverseService = {
  /**
   * Exécuter le matching inverse pour une offre
   */
  async executerMatching(offreId: string): Promise<MatchingResponse> {
    const response = await api.post(`/matching-inverse/${offreId}`);
    return response.data.data;
  },

  /**
   * Créer des candidatures à partir des résultats de matching
   */
  async creerCandidatures(offreId: string, candidatureIds: string[]): Promise<any> {
    const response = await api.post(`/matching-inverse/${offreId}/creer`, { candidatureIds });
    return response.data.data;
  },

  /**
   * Récupérer les candidatures matching inverse d'une offre
   */
  async getCandidaturesMatching(offreId: string): Promise<any> {
    const response = await api.get(`/matching-inverse/${offreId}/candidatures`);
    return response.data.data;
  },
  async getCandidatPassifDetail(candidatureId: string): Promise<CandidatDetail> {
  const response = await api.get(`/matching-inverse/candidat/${candidatureId}`);
  return response.data.data;
}
};