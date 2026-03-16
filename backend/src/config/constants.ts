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
    TECHNICIEN: 30000,
    CADRE_MOYEN: 50000,
    CADRE_SUPERIEUR: 100000
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