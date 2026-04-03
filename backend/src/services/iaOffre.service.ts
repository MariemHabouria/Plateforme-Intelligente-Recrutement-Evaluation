
interface OffreGenerationInput {
  intitulePoste: string;
  budgetMin: number;
  budgetMax: number;
  typeContrat: string;
  directionNom?: string;
  descriptionDemande?: string;
  justification?: string;
}

interface OffreGenerationOutput {
  description: string;
  profilRecherche: string;
  competences: string[];
  fourchetteSalariale: string;
  suggestionsCanaux: Array<{ canal: string; score: number; raison: string }>;
}

// Base de connaissances interne (Tunisie 2025)
const BASE_COMPETENCES: Record<string, string[]> = {
  // Tech
  'Développeur': ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Git'],
  'DevOps': ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Linux', 'Terraform'],
  'Data Scientist': ['Python', 'SQL', 'Machine Learning', 'Pandas', 'TensorFlow', 'Statistics'],
  
  // Commercial
  'Commercial': ['Négociation', 'Prospection', 'CRM', 'Relation client', 'Reporting'],
  'Marketing': ['SEO/SEM', 'Google Analytics', 'Content Strategy', 'Social Media', 'Email Marketing'],
  
  // Finance
  'Comptable': ['Comptabilité générale', 'Déclarations fiscales', 'Excel', 'SAGE', 'Audit'],
  'DAF': ['Gestion budgétaire', 'Trésorerie', 'Analyse financière', 'Reporting', 'IFRS'],
  
  // RH
  'RH': ['Recrutement', 'Gestion des talents', 'Paie', 'Droit social', 'SIRH'],
  'DRH': ['Stratégie RH', 'Conduite du changement', 'GPEC', 'Relations sociales'],
  
  // Générique
  'Manager': ['Leadership', 'Gestion d\'équipe', 'Planification', 'Prise de décision'],
  'Directeur': ['Vision stratégique', 'Pilotage', 'Gestion de budget', 'Négociation']
};

const CANAUX_AVEC_SCORES = [
  { nom: 'LinkedIn', scoreBase: 95, description: 'Réseau professionnel #1 en Tunisie' },
  { nom: 'TanitJobs', scoreBase: 88, description: 'Leader recrutement Tunisie' },
  { nom: 'Emploi.tn', scoreBase: 75, description: 'Portail généraliste' },
  { nom: 'Keejob', scoreBase: 70, description: 'Bon pour profils juniors' },
  { nom: 'Facebook Jobs', scoreBase: 60, description: 'Accessibilité large' }
];

// Modèle de génération de texte (template-based + règles métier)
export class IaOffreService {
  
  /**
   * Génère une offre complète à partir de la demande
   */
  async genererOffre(input: OffreGenerationInput): Promise<OffreGenerationOutput> {
    const description = this.genererDescription(input);
    const profilRecherche = this.genererProfilRecherche(input);
    const competences = this.genererCompetences(input);
    const fourchetteSalariale = this.genererFourchetteSalariale(input);
    const suggestionsCanaux = this.genererSuggestionsCanaux(input);

    return {
      description,
      profilRecherche,
      competences,
      fourchetteSalariale,
      suggestionsCanaux
    };
  }

  /**
   * Génération description (template + contexte métier)
   */
  private genererDescription(input: OffreGenerationInput): string {
    const { intitulePoste, directionNom, descriptionDemande, justification } = input;
    
    const sections = [];
    
    // 1. Introduction
    sections.push(`## 🎯 Mission principale

${descriptionDemande || `Le/La ${intitulePoste} aura pour mission principale de contribuer activement au développement et à la performance de ${directionNom ? `la direction ${directionNom}` : 'l\'entreprise'} Kilani.`}

${justification ? `**Contexte du recrutement :** ${justification}` : ''}

---

## 📋 Responsabilités

### Responsabilités principales
- Piloter et coordonner les activités liées au poste
- Assurer la qualité et la conformité des livrables
- Collaborer avec les équipes internes et externes
- Proposer des améliorations continues

### Indicateurs de performance
- Taux de réalisation des objectifs (>90%)
- Satisfaction des parties prenantes
- Délais de livraison respectés

---

## 📅 Organisation du travail
- **Type de contrat :** ${this.traduireTypeContrat(input.typeContrat)}
- **Lieu :** Tunis ou télétravail partiel possible
- **Rythme :** Temps plein`);

    return sections.join('\n');
  }

  /**
   * Génération profil recherché
   */
  private genererProfilRecherche(input: OffreGenerationInput): string {
    const { intitulePoste, budgetMin, budgetMax } = input;
    
    // Déterminer niveau d'expérience selon budget
    let experienceRequise = "3 à 5 ans";
    let niveauEtudes = "Bac+5 (Master/Ingénieur)";
    
    if (budgetMin < 1800) {
      experienceRequise = "1 à 3 ans";
      niveauEtudes = "Bac+3 minimum";
    } else if (budgetMin > 4000) {
      experienceRequise = "8 à 12 ans";
      niveauEtudes = "Bac+5 minimum, MBA apprécié";
    } else if (budgetMin > 2500) {
      experienceRequise = "5 à 8 ans";
    }
    
    return `## 🎓 Formation
- **Niveau requis :** ${niveauEtudes}
- **Domaine :** ${this.determinerDomaineFormation(intitulePoste)}

## 💼 Expérience
- **Expérience requise :** ${experienceRequise}
- **Expérience similaire souhaitée :** Poste équivalent dans le secteur d'activité

## 🌟 Qualités personnelles
- Rigoureux(se) et organisé(e)
- Bonne capacité d'adaptation
- Esprit d'équipe et collaboration
- Proactivité et autonomie
- Excellentes compétences communication

## 🎯 Langues
- **Français :** Courant (écrit et parlé) - Obligatoire
- **Anglais :** Technique/Business - Très souhaitable
- **Arabe :** Courant - Un plus`;
  }

  /**
   * Génération compétences (détection intelligente)
   */
  private genererCompetences(input: OffreGenerationInput): string[] {
    const { intitulePoste } = input;
    
    // Compétences de base selon l'intitulé
    const competences = new Set<string>();
    
    // Ajouter compétences spécifiques selon le poste
    for (const [key, skills] of Object.entries(BASE_COMPETENCES)) {
      if (intitulePoste.toLowerCase().includes(key.toLowerCase())) {
        skills.forEach(s => competences.add(s));
      }
    }
    
    // Compétences transversales toujours présentes
    competences.add('Travail en équipe');
    competences.add('Communication');
    competences.add('Résolution de problèmes');
    competences.add('Gestion du temps');
    
    return Array.from(competences).slice(0, 8);
  }

  /**
   * Génération fourchette salariale (basée marché Tunisien 2025)
   */
  private genererFourchetteSalariale(input: OffreGenerationInput): string {
    const { budgetMin, budgetMax, intitulePoste } = input;
    
    let reference = "Cadre";
    if (intitulePoste.toLowerCase().includes('technicien')) reference = "Technicien";
    if (intitulePoste.toLowerCase().includes('directeur')) reference = "Cadre supérieur";
    if (intitulePoste.toLowerCase().includes('manager')) reference = "Management";
    
    return `${budgetMin.toLocaleString()} - ${budgetMax.toLocaleString()} TND mensuel (${reference})
    
**Avantages :**
- Mutuelle complémentaire
- Tickets restaurant
- Primes sur objectifs (jusqu'à 2 mois)
- Formation continue
- Évolution possible vers cadre supérieur`;
  }

  /**
   * Suggestions de canaux de publication avec scores
   */
  private genererSuggestionsCanaux(input: OffreGenerationInput): Array<{ canal: string; score: number; raison: string }> {
  const { intitulePoste, budgetMax } = input;
  
  let suggestions = [...CANAUX_AVEC_SCORES];
  
  // Ajustement selon type de poste
  if (intitulePoste.toLowerCase().includes('technicien') || budgetMax < 2500) {
    suggestions = suggestions.map(c => ({
      ...c,
      scoreBase: c.nom === 'TanitJobs' ? c.scoreBase + 5 : 
                 c.nom === 'LinkedIn' ? c.scoreBase - 10 : c.scoreBase
    }));
  }
  
  // Postes cadres supérieurs → LinkedIn prioritaire
  if (budgetMax > 5000) {
    suggestions = suggestions.map(c => ({
      ...c,
      scoreBase: c.nom === 'LinkedIn' ? Math.min(100, c.scoreBase + 10) : c.scoreBase
    }));
  }
  
  return suggestions
    .sort((a, b) => b.scoreBase - a.scoreBase)
    .slice(0, 4)
    .map(c => ({
      canal: c.nom,
      score: c.scoreBase,  // ← CORRECTION : utiliser scoreBase
      raison: c.description
    }));
}
  private traduireTypeContrat(type: string): string {
    const mapping: Record<string, string> = {
      'CDI': 'CDI (Contrat à Durée Indéterminée)',
      'CDD': 'CDD (Contrat à Durée Déterminée)',
      'STAGE': 'Stage conventionné',
      'ALTERNANCE': 'Contrat d\'alternance',
      'FREELANCE': 'Freelance / Prestation'
    };
    return mapping[type] || type;
  }

  private determinerDomaineFormation(intitule: string): string {
    const mapping: Record<string, string> = {
      'Développeur': 'Informatique / Génie Logiciel',
      'DevOps': 'Informatique / Cloud Computing',
      'Data': 'Mathématiques / Statistiques / Data Science',
      'Commercial': 'Commerce / Marketing',
      'Comptable': 'Comptabilité / Finance',
      'RH': 'Ressources Humaines / Psychologie du travail',
      'Marketing': 'Marketing / Digital',
      'Directeur': 'Management / École de commerce / Ingénieur'
    };
    
    for (const [key, domaine] of Object.entries(mapping)) {
      if (intitule.toLowerCase().includes(key.toLowerCase())) {
        return domaine;
      }
    }
    
    return 'Pertinent au poste visé';
  }
}

export const iaOffreService = new IaOffreService();