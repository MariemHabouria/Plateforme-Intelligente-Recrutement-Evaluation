interface ScoringInput {
  cvTexte: string;
  offreDescription: string;
  offreProfilRecherche: string;
  offreCompetences: string[];
}

interface ScoringOutput {
  scoreGlobal: number;
  scoreExp: number;
  competencesDetectees: string[];
  competencesManquantes: string[];
}

// Compétences techniques prédéfinies
const COMPETENCES_TECHNIQUES = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js',
  'Java', 'Spring', 'C#', '.NET', 'PHP', 'Laravel', 'Symfony',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Git',
  'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'Pandas',
  'SEO', 'Google Analytics', 'CRM', 'Salesforce', 'SAP'
];

// Compétences soft
const COMPETENCES_SOFT = [
  'Leadership', 'Communication', 'Travail en équipe', 'Autonomie',
  'Résolution de problèmes', 'Gestion de projet', 'Adaptabilité',
  'Négociation', 'Créativité', 'Rigueur', 'Organisation'
];

export const scoringService = {
  async calculerScore(input: ScoringInput): Promise<ScoringOutput> {
    const { cvTexte, offreDescription, offreProfilRecherche, offreCompetences } = input;
    
    const cvLower = cvTexte.toLowerCase();
    
    // 1. Détection des compétences
    const competencesDetectees: string[] = [];
    const competencesManquantes: string[] = [];
    
    for (const competence of offreCompetences) {
      const competenceLower = competence.toLowerCase();
      if (cvLower.includes(competenceLower)) {
        competencesDetectees.push(competence);
      } else {
        competencesManquantes.push(competence);
      }
    }
    
    // Ajouter les compétences techniques supplémentaires détectées
    for (const tech of COMPETENCES_TECHNIQUES) {
      if (cvLower.includes(tech.toLowerCase()) && !competencesDetectees.includes(tech)) {
        competencesDetectees.push(tech);
      }
    }
    
    // 2. Calcul du score de compétences (70% du score total)
    const totalCompetences = offreCompetences.length;
    const competencesTrouvees = totalCompetences - competencesManquantes.length;
    const scoreCompetences = totalCompetences > 0 ? (competencesTrouvees / totalCompetences) * 70 : 50;
    
    // 3. Calcul du score d'expérience (30% du score total)
    // Détection des mots-clés d'expérience
    const motsExperience = [
      { mots: ['ans', 'années', 'years'], poids: 20 },
      { mots: ['senior', 'confirmé', 'expert'], poids: 15 },
      { mots: ['lead', 'manager', 'responsable'], poids: 10 },
      { mots: ['diplôme', 'master', 'ingénieur', 'bac+5'], poids: 5 },
      { mots: ['certification', 'certifié'], poids: 5 }
    ];
    
    let scoreExp = 0;
    for (const item of motsExperience) {
      for (const mot of item.mots) {
        if (cvLower.includes(mot.toLowerCase())) {
          scoreExp += item.poids;
          break;
        }
      }
    }
    scoreExp = Math.min(scoreExp, 30); // Max 30 points
    
    // 4. Score global
    let scoreGlobal = scoreCompetences + scoreExp;
    scoreGlobal = Math.min(Math.round(scoreGlobal), 100);
    
    return {
      scoreGlobal,
      scoreExp: Math.round(scoreExp),
      competencesDetectees: [...new Set(competencesDetectees)], // Supprimer les doublons
      competencesManquantes
    };
  }
};