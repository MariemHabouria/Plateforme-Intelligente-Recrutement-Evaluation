import axios, { AxiosError } from 'axios';

const IA_URL = process.env.IA_SERVICE_URL || 'http://localhost:8001';
const IA_TIMEOUT        = parseInt(process.env.IA_TIMEOUT_MS         || '30000');
const IA_TIMEOUT_MATCHING = parseInt(process.env.IA_TIMEOUT_MATCHING_MS || '60000');

// ── Types microservice Python (snake_case)

export interface ScoringResult {
  success: boolean;
  candidature_id: string;
  score_global: number;
  score_experience: number;
  recommandation: string;
  competences_detectees: string[];
  competences_manquantes: string[];
  score_competences_pct: number;
  score_formation_pct: number;
  score_semantique_pct: number;
  score_completude_pct: number;
  shap_details: ShapDetail[];
  eligible_matching_inverse: boolean;
  version_modele: string;
  cv_parsed: {
    nom?: string;
    email?: string;
    telephone?: string;
    localisation?: string;
    experience_annees: number;
    competences: string[];
    diplomes: any[];
    langues: any[];
  };
}

export interface ShapDetail {
  critere: string;
  score: number;
  poids: number;
  contribution: number;
  positif: boolean;
  details: string;
}

// Type brut retourné par le microservice Python
interface MatchCandidatRaw {
  candidature_id: string;
  candidat_nom: string;        // "NOM PRENOM" ou seulement nom selon le microservice
  candidat_prenom?: string;    // optionnel selon version microservice
  candidat_email: string;
  candidat_telephone?: string;
  score_global: number;
  score_experience: number;
  competences_detectees: string[];
  competences_manquantes: string[];
  recommandation: string;
  eligible: boolean;
  rang: number;
}

// Type normalisé camelCase utilisé dans toute la stack Node/frontend
export interface MatchCandidat {
  candidatureId: string;
  candidatNom: string;
  candidatPrenom: string;
  email: string;
  telephone?: string;
  score: number;
  scoreExperience: number;
  competencesMatch: string[];
  competencesManquantes: string[];
  recommandation: string;
  eligible: boolean;
  rang: number;
  raison: string;              // texte lisible pour le frontend
}

export interface MatchingInverseResult {
  success: boolean;
  offre_id: string;
  n_candidats_total: number;
  n_shortlist: number;
  shortlist: MatchCandidat[];  // déjà normalisé
}

export interface ParsedCV {
  success: boolean;
  nom?: string;
  email?: string;
  telephone?: string;
  localisation?: string;
  texte_brut?: string;   
  competences: string[];
  soft_skills: string[];
  experience_annees: number;
  diplomes: any[];
  langues: any[];
  certifications: any[];
}

// ── Service

export const iaService = {

  /**
   * Score un CV contre une offre.
   * Retourne un fallback score 0 sans bloquer si le microservice est indisponible.
   */
  async scorerCV(
    cvPath: string,
    offreId: string,
    candidatureId: string
  ): Promise<ScoringResult> {
    try {
      const response = await axios.post<ScoringResult>(
        `${IA_URL}/scoring`,
        { cv_path: cvPath, offre_id: offreId, candidature_id: candidatureId },
        { timeout: IA_TIMEOUT }
      );

      // CORRECTION : signaler explicitement si le microservice indique un échec
      if (!response.data.success) {
        console.warn('[iaService.scorerCV] Microservice a retourné success=false pour', candidatureId);
      }

      return response.data;
    } catch (err) {
      const msg = _extractError(err, 'Erreur scoring IA');
      console.error('[iaService.scorerCV]', msg);
      return _fallbackScoring(candidatureId);
    }
  },

  /**
   * Matching inverse : meilleurs candidats passifs pour une offre.
   * CORRECTION :
   *  - timeout dédié plus long
   *  - normalisation snake_case → camelCase
   *  - gestion d'erreur avec fallback liste vide
   */
  async matchingInverse(
    offreId: string,
    topN: number = 10
  ): Promise<MatchingInverseResult> {
    try {
      const response = await axios.post<{
        success: boolean;
        offre_id: string;
        n_candidats_total: number;
        n_shortlist: number;
        shortlist: MatchCandidatRaw[];
      }>(
        `${IA_URL}/matching-inverse`,
        { offre_id: offreId, top_n: topN },
        { timeout: IA_TIMEOUT_MATCHING }
      );

      const raw = response.data;
      console.log('[matching-inverse RAW]', JSON.stringify(raw).slice(0, 500));

      return {
        success:          raw.success,
        offre_id:         raw.offre_id,
        n_candidats_total: raw.n_candidats_total,
        n_shortlist:       raw.n_shortlist,
        // CORRECTION : normalisation complète ici, une seule fois
        shortlist: (raw.shortlist || []).map(_normalizeMatchCandidat),
      };

    } catch (err) {
      const msg = _extractError(err, 'Erreur matching inverse IA');
      console.error('[iaService.matchingInverse]', msg);
      // Fallback : liste vide — le controller affichera "aucun candidat trouvé"
      return {
        success:           false,
        offre_id:          offreId,
        n_candidats_total: 0,
        n_shortlist:       0,
        shortlist:         [],
      };
    }
  },

  /**
   * Parse un CV PDF et retourne les champs extraits.
   */
  async parseCV(cvPath: string): Promise<ParsedCV> {
    const response = await axios.post<ParsedCV>(
      `${IA_URL}/parse-cv`,
      { cv_path: cvPath },
      { timeout: IA_TIMEOUT }
    );
    return response.data;
  },

  /**
   * Notifie le microservice de recharger la config depuis PostgreSQL.
   */
  async refreshConfig(): Promise<void> {
    try {
      await axios.post(`${IA_URL}/refresh-config`, {}, { timeout: 5000 });
    } catch (err) {
      console.warn('[iaService.refreshConfig] Impossible de rafraîchir la config IA:', err);
    }
  },

  async isHealthy(): Promise<boolean> {
    try {
      const r = await axios.get(`${IA_URL}/health`, { timeout: 3000 });
      return r.data?.status === 'ok';
    } catch {
      return false;
    }
  },
};

// ── Helpers privés────────────────────────

function _extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.detail || err.message || fallback;
  }
  return fallback;
}

function _fallbackScoring(candidatureId: string): ScoringResult {
  return {
    success: false,
    candidature_id: candidatureId,
    score_global: 0,
    score_experience: 0,
    recommandation: 'FAIBLE',
    competences_detectees: [],
    competences_manquantes: [],
    score_competences_pct: 0,
    score_formation_pct: 0,
    score_semantique_pct: 0,
    score_completude_pct: 0,
    shap_details: [],
    eligible_matching_inverse: false,
    version_modele: 'fallback',
    cv_parsed: { competences: [], diplomes: [], langues: [], experience_annees: 0 },
  };
}

/**
 * Normalise un candidat brut Python (snake_case) vers camelCase.
 * CORRECTION : c'est ici que le mapping est centralisé — une seule source de vérité.
 * 
 * Le microservice peut envoyer le nom complet dans candidat_nom ou le séparer.
 * On gère les deux cas.
 */
function _normalizeMatchCandidat(raw: MatchCandidatRaw): MatchCandidat {
  let nom    = (raw.candidat_nom    || '').trim();
  let prenom = (raw.candidat_prenom || '').trim();

  if (!prenom && nom.includes(' ')) {
    const parts = nom.split(/\s+/);
    const dernierMot = parts[parts.length - 1];

    if (dernierMot === dernierMot.toUpperCase() && dernierMot.length > 1) {
      // Format "Prenom NOM" → dernier mot tout en majuscules = nom de famille
      nom    = dernierMot;
      prenom = parts.slice(0, -1).join(' ');
    } else {
      // Format indéterminé → convention premier mot = prénom
      prenom = parts[0];
      nom    = parts.slice(1).join(' ');
    }
  }

  const score = raw.score_global ?? 0;
  return {
    candidatureId:         raw.candidature_id,
    candidatNom:           nom,
    candidatPrenom:        prenom,
    email:                 raw.candidat_email,
    telephone:             raw.candidat_telephone,
    score,
    scoreExperience:       raw.score_experience ?? 0,
    competencesMatch:      raw.competences_detectees    || [],
    competencesManquantes: raw.competences_manquantes   || [],
    recommandation:        raw.recommandation,
    eligible:              raw.eligible,
    rang:                  raw.rang,
    raison: _buildRaison(raw.recommandation, score, raw.competences_detectees?.length ?? 0),
  };
}

function _buildRaison(recommandation: string, score: number, nbCompetences: number): string {
  if (recommandation === 'FORTE')  return `Profil très compatible — ${score}% de correspondance, ${nbCompetences} compétence(s) clé(s) détectée(s)`;
  if (recommandation === 'MOYENNE') return `Profil compatible — ${score}% de correspondance`;
  return `Profil partiel — ${score}% de correspondance`;
}