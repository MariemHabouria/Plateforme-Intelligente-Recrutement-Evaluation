"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP = exports.STATUT_PAR_ROLE = exports.CIRCUITS_PAR_DEFAUT = exports.NIVEAUX_VALIDATION = exports.SEUILS_BUDGET = exports.MOTIF_DEMANDE = exports.PRIORITE = exports.TYPE_CONTRAT = exports.STATUT_DEMANDE = exports.ROLES = void 0;
// Rôles des utilisateurs
exports.ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    MANAGER: 'MANAGER',
    DIRECTEUR: 'DIRECTEUR',
    DRH: 'DRH',
    DAF: 'DAF',
    DGA: 'DGA',
    DG: 'DG',
    RESP_PAIE: 'RESP_PAIE',
    CANDIDAT: 'CANDIDAT'
};
// Statuts des demandes
exports.STATUT_DEMANDE = {
    BROUILLON: 'BROUILLON',
    SOUMISE: 'SOUMISE',
    EN_VALIDATION: 'EN_VALIDATION',
    VALIDEE: 'VALIDEE',
    REJETEE: 'REJETEE',
    ANNULEE: 'ANNULEE'
};
// Types de contrats
exports.TYPE_CONTRAT = {
    CDI: 'CDI',
    CDD: 'CDD',
    STAGE: 'STAGE',
    ALTERNANCE: 'ALTERNANCE',
    FREELANCE: 'FREELANCE'
};
// Priorités
exports.PRIORITE = {
    BASSE: 'BASSE',
    MOYENNE: 'MOYENNE',
    HAUTE: 'HAUTE',
    CRITIQUE: 'CRITIQUE'
};
// Motifs de demande
exports.MOTIF_DEMANDE = {
    CREATION: 'CREATION',
    REMPLACEMENT: 'REMPLACEMENT',
    NOUVEAU_POSTE: 'NOUVEAU_POSTE',
    EXPANSION: 'EXPANSION'
};
// Seuils pour les circuits de validation (en DT)
exports.SEUILS_BUDGET = {
    TECHNICIEN: 18000, // < 18 000 DT/an
    EMPLOYE: 24000, // < 24 000 DT/an
    CADRE_DEBUTANT: 30000, // < 30 000 DT/an
    CADRE_CONFIRME: 48000, // < 48 000 DT/an
    CADRE_SUPERIEUR: 84000, // < 84 000 DT/an
};
// Niveaux de validation
exports.NIVEAUX_VALIDATION = {
    MANAGER: 1,
    DIRECTEUR: 2,
    DRH: 3,
    DAF: 4,
    DGA: 5,
    DG: 6
};
exports.CIRCUITS_PAR_DEFAUT = {
    TECHNICIEN: {
        type: 'TECHNICIEN',
        nom: 'Technicien / Ouvrier',
        description: 'Pour les postes techniques et ouvriers',
        seuilMin: 0,
        seuilMax: exports.SEUILS_BUDGET.TECHNICIEN,
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
        seuilMin: exports.SEUILS_BUDGET.TECHNICIEN,
        seuilMax: exports.SEUILS_BUDGET.EMPLOYE,
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
        seuilMin: exports.SEUILS_BUDGET.EMPLOYE,
        seuilMax: exports.SEUILS_BUDGET.CADRE_DEBUTANT,
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
        seuilMin: exports.SEUILS_BUDGET.CADRE_DEBUTANT,
        seuilMax: exports.SEUILS_BUDGET.CADRE_CONFIRME,
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
        seuilMin: exports.SEUILS_BUDGET.CADRE_CONFIRME,
        seuilMax: exports.SEUILS_BUDGET.CADRE_SUPERIEUR,
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
        seuilMin: exports.SEUILS_BUDGET.CADRE_SUPERIEUR,
        seuilMax: null,
        etapes: [
            { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
            { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
            { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
            { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 },
            { niveau: 5, role: 'DG', label: 'DG', delai: 48 }
        ],
        totalEtapes: 6,
        delaiParDefaut: 48
    }
};
exports.STATUT_PAR_ROLE = {
    'DIRECTEUR': 'EN_VALIDATION_DIR',
    'DRH': 'EN_VALIDATION_DRH',
    'DAF': 'EN_VALIDATION_DAF',
    'DGA': 'EN_VALIDATION_DGA',
    'DG': 'EN_VALIDATION_DG',
    'CONSEIL': 'EN_VALIDATION_CONSEIL'
};
exports.HTTP = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
};
