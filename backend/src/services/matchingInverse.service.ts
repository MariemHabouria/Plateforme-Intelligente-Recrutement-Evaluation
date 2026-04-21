// backend/src/services/matchingInverse.service.ts

// ❌ Supprimer cette ligne
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// ✅ Importer l'instance déjà configurée
import prisma from '../config/prisma';

interface OffreInput {
  id: string;
  intitule: string;
  description: string;
  profilRecherche: string;
  competences: string[];
  typeContrat: string;
  demande?: {
    niveau: string;
    direction?: { nom: string };
  };
}

interface CandidatureInput {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  cvTexte: string;
  competencesDetectees: string[];
  scoreExp: number;
  statut: string;
  consentementRGPD: boolean;
  offre?: {
    demande?: {
      direction?: { nom: string };
    };
  };
}

interface MatchingResult {
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

class MatchingInverseService {
  
  /**
   * Extrait les mots-clés d'une offre
   */
  private extraireMotsClesOffre(offre: OffreInput): string[] {
    const texte = `${offre.intitule} ${offre.description} ${offre.profilRecherche} ${offre.competences.join(' ')}`;
    
    const mots = texte
      .toLowerCase()
      .replace(/[éèêë]/g, 'e')
      .replace(/[àâä]/g, 'a')
      .replace(/[ùûü]/g, 'u')
      .replace(/[ôö]/g, 'o')
      .replace(/[ïî]/g, 'i')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/);
    
    const stopWords = ['le', 'la', 'les', 'de', 'des', 'du', 'et', 'ou', 'pour', 'avec', 'sans', 'dans', 'par', 'sur', 'un', 'une', 'est', 'sont'];
    
    return [...new Set(mots)]
      .filter(m => m.length > 2)
      .filter(m => !stopWords.includes(m));
  }
  
  /**
   * Calcule le score de matching entre une candidature et une offre
   */
  private calculerScore(
    offre: OffreInput,
    candidature: CandidatureInput
  ): { score: number; competencesMatch: string[]; competencesManquantes: string[] } {
    
    // 1. Score compétences (70%)
    const competencesOffre = offre.competences.map(c => c.toLowerCase());
    const competencesCandidat = candidature.competencesDetectees.map(c => c.toLowerCase());
    
    const competencesMatch = competencesOffre.filter(c => 
      competencesCandidat.some(cc => cc.includes(c) || c.includes(cc))
    );
    
    const scoreCompetences = competencesOffre.length > 0 
      ? (competencesMatch.length / competencesOffre.length) * 70 
      : 50;
    
    const competencesManquantes = competencesOffre.filter(c => 
      !competencesMatch.includes(c)
    );
    
    // 2. Score expérience (20%)
    let scoreExperience = (candidature.scoreExp || 50) * 0.2;
    
    // 3. Score secteur (10%)
    let scoreSecteur = 0;
    const directionOffre = offre.demande?.direction?.nom?.toLowerCase() || '';
    const directionCandidat = candidature.offre?.demande?.direction?.nom?.toLowerCase() || '';
    
    if (directionOffre && directionCandidat && directionOffre === directionCandidat) {
      scoreSecteur = 10;
    } else if (directionOffre && directionCandidat) {
      scoreSecteur = 5;
    } else {
      scoreSecteur = 3;
    }
    
    const scoreTotal = Math.min(Math.round(scoreCompetences + scoreExperience + scoreSecteur), 100);
    
    return {
      score: scoreTotal,
      competencesMatch,
      competencesManquantes
    };
  }
  
  /**
   * Génère une raison explicative du matching
   */
  private genererRaison(
    offre: OffreInput,
    candidature: CandidatureInput,
    competencesMatch: string[],
    competencesManquantes: string[]
  ): string {
    const raisons = [];
    
    if (competencesMatch.length > 0) {
      raisons.push(`Compétences correspondantes : ${competencesMatch.slice(0, 3).join(', ')}`);
    }
    
    if (competencesManquantes.length > 0) {
      raisons.push(`Compétences à renforcer : ${competencesManquantes.slice(0, 3).join(', ')}`);
    }
    
    if (candidature.scoreExp && candidature.scoreExp > 60) {
      raisons.push(`Expérience pertinente (${candidature.scoreExp}%)`);
    }
    
    raisons.push(`Poste ciblé : ${offre.intitule}`);
    
    return raisons.join(' · ');
  }
  
  /**
   * Exécute le matching inverse pour une nouvelle offre
   */
  async executerMatchingInverse(
    offre: OffreInput,
    candidaturesExistantes: CandidatureInput[]
  ): Promise<MatchingResult[]> {
    
    const results: MatchingResult[] = [];
    
    for (const candidature of candidaturesExistantes) {
      if (!candidature.consentementRGPD) continue;
      if (candidature.statut === 'ACCEPTEE') continue;
      if (candidature.statut === 'MATCHING_INVERSE') continue;
      
      const { score, competencesMatch, competencesManquantes } = this.calculerScore(offre, candidature);
      
      if (score >= 60) {
        results.push({
          candidatureId: candidature.id,
          candidatNom: candidature.nom,
          candidatPrenom: candidature.prenom,
          email: candidature.email,
          telephone: (candidature as any).telephone,
          score,
          competencesMatch,
          competencesManquantes,
          raison: this.genererRaison(offre, candidature, competencesMatch, competencesManquantes)
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }
}

export const matchingInverseService = new MatchingInverseService();