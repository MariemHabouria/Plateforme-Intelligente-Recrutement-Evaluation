// Rôles des utilisateurs
export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    MANAGER: 'MANAGER',
    DIRECTEUR: 'DIRECTEUR',
    DRH: 'DRH',
    DAF: 'DAF',
    DGA: 'DGA',
    DG: 'DG',
    RESP_PAIE: 'RESP_PAIE',
    CANDIDAT: 'CANDIDAT'
} as const;

// Statuts des demandes
export const STATUT_DEMANDE = {
    BROUILLON: 'BROUILLON',
    SOUMISE: 'SOUMISE',
    EN_VALIDATION: 'EN_VALIDATION',
    VALIDEE: 'VALIDEE',
    REJETEE: 'REJETEE',
    ANNULEE: 'ANNULEE'
} as const;

// Types de contrats
export const TYPE_CONTRAT = {
    CDI: 'CDI',
    CDD: 'CDD',
    STAGE: 'STAGE',
    ALTERNANCE: 'ALTERNANCE',
    FREELANCE: 'FREELANCE'
} as const;

// Priorités
export const PRIORITE = {
    BASSE: 'BASSE',
    MOYENNE: 'MOYENNE',
    HAUTE: 'HAUTE',
    CRITIQUE: 'CRITIQUE'
} as const;

// Motifs de demande
export const MOTIF_DEMANDE = {
    CREATION: 'CREATION',
    REMPLACEMENT: 'REMPLACEMENT',
    NOUVEAU_POSTE: 'NOUVEAU_POSTE',
    EXPANSION: 'EXPANSION'
} as const;

// Seuils pour les circuits de validation (en DT)
export const SEUILS_BUDGET = {
  TECHNICIEN: 18000,      // < 18 000 DT/an
  EMPLOYE: 24000,         // < 24 000 DT/an
  CADRE_DEBUTANT: 30000,  // < 30 000 DT/an
  CADRE_CONFIRME: 48000,  // < 48 000 DT/an
  CADRE_SUPERIEUR: 84000, // < 84 000 DT/an
} as const;


// Niveaux de validation
export const NIVEAUX_VALIDATION = {
    MANAGER: 1,
    DIRECTEUR: 2,
    DRH: 3,
    DAF: 4,
    DGA: 5,
    DG: 6
} as const;
export const CIRCUITS_PAR_DEFAUT = {
  TECHNICIEN: {
    type: 'TECHNICIEN',
    nom: 'Technicien / Ouvrier',
    description: 'Pour les postes techniques et ouvriers',
    seuilMin: 0,
    seuilMax: SEUILS_BUDGET.TECHNICIEN,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 }
    ],
    totalEtapes: 3,
    delaiParDefaut: 48
  },
  EMPLOYE: {
    type: 'EMPLOYE',
    nom: 'Employé / Agent',
    description: 'Pour les postes administratifs',
    seuilMin: SEUILS_BUDGET.TECHNICIEN,
    seuilMax: SEUILS_BUDGET.EMPLOYE,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 }
    ],
    totalEtapes: 3,
    delaiParDefaut: 48
  },
  CADRE_DEBUTANT: {
    type: 'CADRE_DEBUTANT',
    nom: 'Cadre débutant',
    description: 'Cadres juniors (ingénieur junior, chef de projet junior)',
    seuilMin: SEUILS_BUDGET.EMPLOYE,
    seuilMax: SEUILS_BUDGET.CADRE_DEBUTANT,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 }
    ],
    totalEtapes: 4,
    delaiParDefaut: 48
  },
  CADRE_CONFIRME: {
    type: 'CADRE_CONFIRME',
    nom: 'Cadre confirmé',
    description: 'Cadres seniors (ingénieur senior, chef de projet)',
    seuilMin: SEUILS_BUDGET.CADRE_DEBUTANT,
    seuilMax: SEUILS_BUDGET.CADRE_CONFIRME,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
      { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 }
    ],
    totalEtapes: 5,
    delaiParDefaut: 48
  },
  CADRE_SUPERIEUR: {
    type: 'CADRE_SUPERIEUR',
    nom: 'Cadre supérieur',
    description: 'Directeurs de département',
    seuilMin: SEUILS_BUDGET.CADRE_CONFIRME,
    seuilMax: SEUILS_BUDGET.CADRE_SUPERIEUR,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
      { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 },
      { niveau: 5, role: 'DG', label: 'DG', delai: 48 }
    ],
    totalEtapes: 6,
    delaiParDefaut: 48
  },
  STRATEGIQUE: {
    type: 'STRATEGIQUE',
    nom: 'Poste stratégique',
    description: 'Postes de direction et stratégiques',
    seuilMin: SEUILS_BUDGET.CADRE_SUPERIEUR,
    seuilMax: null,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
      { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 },
      { niveau: 5, role: 'DG', label: 'DG', delai: 48 },
      { niveau: 6, role: 'CONSEIL', label: 'Conseil d\'administration', delai: 72 }
    ],
    totalEtapes: 7,
    delaiParDefaut: 48
  }
} as const;

export const STATUT_PAR_ROLE: Record<string, string> = {
  'DIRECTEUR': 'EN_VALIDATION_DIR',
  'DRH': 'EN_VALIDATION_DRH',
  'DAF': 'EN_VALIDATION_DAF',
  'DGA': 'EN_VALIDATION_DGA',
  'DG': 'EN_VALIDATION_DG',
  'CONSEIL': 'EN_VALIDATION_CONSEIL'
};
export const HTTP = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
} as const;