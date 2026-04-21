// frontend/src/lib/data.ts

import type { RoleConfig, NavItem, Demande, OffreEmploi, Candidature, Entretien, EvaluationPE, Contrat, ValidationEtape, StatCard, Role } from '@/types';

// EXPORTER ROLES
export const ROLES: Record<Role, RoleConfig> = {
  superadmin: { label: 'Super Admin',        color: '#9A8A50', initials: 'SA', name: 'Super Admin',     sub: 'Administration systeme' },
  manager:    { label: 'Manager (N+1)',      color: '#5A7A3A', initials: 'MK', name: 'Mohamed Kilani',  sub: 'Manager – Dir. Industrielle' },
  directeur:  { label: 'Directeur (N+2)',   color: '#7A6C3A', initials: 'AK', name: 'Ahmed Kilani',    sub: 'Directeur Industriel' },
  rh:         { label: 'RH / DRH',          color: '#6A7A3A', initials: 'SK', name: 'Sonia Karoui',    sub: 'Responsable RH' },
  daf:        { label: 'DAF',               color: '#C07820', initials: 'RB', name: 'Rami Ben Ali',    sub: 'Dir. Administratif & Financier' },
  dga:        { label: 'DGA',               color: '#7A5A3A', initials: 'NK', name: 'Nabil Kilani',    sub: 'Directeur General Adjoint' },
  dg:         { label: 'DG',                color: '#7A5A3A', initials: 'KK', name: 'Karim Kilani',    sub: 'Directeur General' },
  paie:       { label: 'Resp. Paie',        color: '#9A8A50', initials: 'LM', name: 'Leila Marzouk',   sub: 'Responsable Paie & Admin.' },
  candidat:   { label: 'Candidat (public)', color: '#A04030', initials: 'CA', name: 'Candidat Externe', sub: 'Formulaire public' },
};

export const NAV_CONFIG: Record<string, NavItem[]> = {
  superadmin: [
    { section: 'administration' },
    { id: 'dashboard',      label: 'Tableau de bord',        icon: 'LayoutDashboard' },
    { id: 'utilisateurs',   label: 'Utilisateurs & Roles',   icon: 'Users', badge: '2', badgeColor: 'amber' },
    { id: 'workflows',      label: 'Circuits de validation', icon: 'GitBranch' },
    { id: 'ia_config',      label: 'Configuration IA',       icon: 'Cpu' },
    { section: 'supervision' },
    { id: 'demandes',       label: 'Toutes les demandes',    icon: 'FileText' },
    { id: 'evaluation',     label: 'Evaluations PE',         icon: 'Star', badge: '3', badgeColor: 'amber' },
    { id: 'audit',          label: 'Journal d\'audit',       icon: 'Shield' },
  ],
  manager: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',   icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Mes demandes',       icon: 'FileText',  badge: '2', badgeColor: 'red' },
    { id: 'entretiens', label: 'Mes entretiens',     icon: 'Calendar' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Evaluation PE',      icon: 'Star',      badge: '1', badgeColor: 'amber' },
  ],
  directeur: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',   icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Demandes',          icon: 'FileText',  badge: '3', badgeColor: 'amber' },
    { id: 'entretiens', label: 'Mes entretiens',    icon: 'Calendar' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Evaluations PE',    icon: 'Star',      badge: '2', badgeColor: 'amber' },
  ],
  rh: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',    icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Demandes',            icon: 'FileText',  badge: '3', badgeColor: 'amber' },
    { id: 'offres',     label: 'Offres d\'emploi',     icon: 'Briefcase' },
    { id: 'candidats',  label: 'Candidatures + IA',   icon: 'Users', badge: '12', badgeColor: 'red' },
    { id: 'entretiens', label: 'Entretiens',          icon: 'Calendar' },
    { section: 'gestion_rh' },
    { id: 'evaluation', label: 'Evaluations PE',      icon: 'Star' },
    { id: 'contrats',   label: 'Contractualisation',  icon: 'FileCheck', badge: '3', badgeColor: 'amber' },
  ],
  daf: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',   icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Demandes',          icon: 'FileText',  badge: '2', badgeColor: 'amber' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Evaluations PE',    icon: 'Star',      badge: '1', badgeColor: 'amber' },
  ],
  dga: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',   icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Demandes',       icon: 'FileText',  badge: '1', badgeColor: 'amber' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Evaluations PE',    icon: 'Star',      badge: '1', badgeColor: 'amber' },
  ],
  dg: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',   icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Vue strategique',   icon: 'FileText',  badge: '1', badgeColor: 'amber' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Evaluations PE',    icon: 'Star',      badge: '1', badgeColor: 'amber' },
  ],
  paie: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',    icon: 'LayoutDashboard' },
    { id: 'contrats',   label: 'Contrats',            icon: 'FileCheck', badge: '4', badgeColor: 'amber' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Donnees PE',          icon: 'Star', badge: '3', badgeColor: 'amber' },
  ],
  candidat: [
    { id: 'candidature', label: 'Formulaire candidature', icon: 'FileText' },
  ],
};

// Donnees mock pour les demandes (utilisation pour tests)
export const DEMANDES: Demande[] = [
  { ref: 'DEM-2026-018', poste: 'Ingenieur Qualite',      motif: 'CREATION',    contrat: 'CDI',   priorite: 'HAUTE',   statut: 'En validation DIR', budget: '42000 DT', date: '15/01/2026', etape: 1, totalEtapes: 4 },
  { ref: 'DEM-2026-015', poste: 'Chef Comptable',         motif: 'REMPLACEMENT',contrat: 'CDI',   priorite: 'HAUTE',   statut: 'En validation DAF', budget: '58000 DT', date: '12/01/2026', etape: 3, totalEtapes: 5 },
  { ref: 'DEM-2026-012', poste: 'Technicien Maintenance', motif: 'RENFORCEMENT',contrat: 'CDD',   priorite: 'MOYENNE', statut: 'Validee',           budget: '22000 DT', date: '08/01/2026', etape: 3, totalEtapes: 3 },
  { ref: 'DEM-2026-009', poste: 'Stagiaire RH',           motif: 'CREATION',    contrat: 'STAGE', priorite: 'BASSE',   statut: 'Cloturee',          budget: '4800 DT',  date: '03/01/2026', etape: 3, totalEtapes: 3 },
];

// Donnees mock pour les offres
export const OFFRES_MOCK: OffreEmploi[] = [
  { id: '1', reference: 'OFF-2026-011', intitule: 'Chef de projet IT',      statut: 'PUBLIEE',  datePublication: '10/01/2026', typeContrat: 'CDI', rhId: '1' },
  { id: '2', reference: 'OFF-2026-009', intitule: 'Technicien Maintenance', statut: 'PUBLIEE',  datePublication: '05/01/2026', typeContrat: 'CDD', rhId: '1' },
  { id: '3', reference: 'OFF-2026-007', intitule: 'Ingenieur Qualite',      statut: 'BROUILLON', datePublication: '15/01/2026', typeContrat: 'CDI', rhId: '1' },
  { id: '4', reference: 'OFF-2026-004', intitule: 'Stagiaire Marketing',    statut: 'CLOTUREE', datePublication: '20/12/2025', typeContrat: 'STAGE', rhId: '1' },
];

// Donnees mock pour les candidatures
export const CANDIDATURES: Candidature[] = [
  { id: '1', nom: 'Aymen Bouslama', prenom: 'Aymen', email: 'aymen@example.com', cvUrl: '', offre: OFFRES_MOCK[0], statut: 'PRESELECTIONNEE', scoreGlobal: 87, scoreExp: 91, competencesDetectees: ['React', 'Node.js', 'Agile', 'Docker'], competencesManquantes: [], consentementRGPD: true, consentementIA: true, dateSoumission: '2026-01-10' },
  { id: '2', nom: 'Rim Chaabane',   prenom: 'Rim',   email: 'rim@example.com',   cvUrl: '', offre: OFFRES_MOCK[0], statut: 'NOUVELLE', scoreGlobal: 82, scoreExp: 78, competencesDetectees: ['Vue.js', 'PostgreSQL', 'CI/CD'], competencesManquantes: [], consentementRGPD: true, consentementIA: true, dateSoumission: '2026-01-11' },
  { id: '3', nom: 'Karim Sfaxi',    prenom: 'Karim', email: 'karim@example.com', cvUrl: '', offre: OFFRES_MOCK[1], statut: 'NOUVELLE', scoreGlobal: 74, scoreExp: 82, competencesDetectees: ['Electrique', 'Pneumatique', 'GMAO'], competencesManquantes: [], consentementRGPD: true, consentementIA: true, dateSoumission: '2026-01-12' },
  { id: '4', nom: 'Nour Jlassi',    prenom: 'Nour',  email: 'nour@example.com',  cvUrl: '', offre: OFFRES_MOCK[0], statut: 'REFUSEE', scoreGlobal: 65, scoreExp: 60, competencesDetectees: ['JavaScript', 'HTML/CSS'], competencesManquantes: [], consentementRGPD: true, consentementIA: true, dateSoumission: '2026-01-13' },
  { id: '5', nom: 'Sami Ben Amor',  prenom: 'Sami',  email: 'sami@example.com',  cvUrl: '', offre: OFFRES_MOCK[1], statut: 'PRESELECTIONNEE', scoreGlobal: 79, scoreExp: 85, competencesDetectees: ['Hydraulique', 'GMAO', 'Soudure'], competencesManquantes: [], consentementRGPD: true, consentementIA: true, dateSoumission: '2026-01-14' },
];

// Donnees mock pour les entretiens
export const ENTRETIENS: Entretien[] = [
  { id: '1', candidature: CANDIDATURES[0], type: 'RH', date: '2026-01-20', heure: '10:00', lieu: 'Siege Kilani', statut: 'PLANIFIE', interviewerId: '1' },
  { id: '2', candidature: CANDIDATURES[1], type: 'TECHNIQUE', date: '2026-01-22', heure: '14:30', lieu: 'Salle A3', statut: 'PLANIFIE', interviewerId: '1' },
  { id: '3', candidature: CANDIDATURES[4], type: 'RH', date: '2026-01-23', heure: '09:00', lieu: 'Teams', statut: 'PLANIFIE', interviewerId: '1' },
  { id: '4', candidature: CANDIDATURES[2], type: 'TECHNIQUE', date: '2026-01-25', heure: '11:00', lieu: 'Usine B. Cedria', statut: 'PLANIFIE', interviewerId: '1' },
];

// Donnees mock pour les evaluations PE
export const EVALUATIONS_PE: EvaluationPE[] = [
  {
    id: '1', employeId: '1', managerId: '1', contratId: '1',
    dateDebut: '2025-07-21', dateFin: '2026-02-21', joursRestants: 24,
    etapeActuelle: 1, decision: null, commentaire: null, commentaireManager: null
  },
  {
    id: '2', employeId: '2', managerId: '1', contratId: '2',
    dateDebut: '2025-10-22', dateFin: '2026-04-22', joursRestants: 82,
    etapeActuelle: 2, decision: 'CONFIRMATION', commentaire: null, commentaireManager: 'CONFIRMATION'
  },
  {
    id: '3', employeId: '3', managerId: '1', contratId: '3',
    dateDebut: '2025-09-01', dateFin: '2026-03-01', joursRestants: 32,
    etapeActuelle: 3, decision: 'CONFIRMATION', commentaire: null, commentaireManager: 'CONFIRMATION'
  },
  {
    id: '4', employeId: '4', managerId: '1', contratId: '4',
    dateDebut: '2025-11-01', dateFin: '2026-05-01', joursRestants: 90,
    etapeActuelle: 4, decision: null, commentaire: null, commentaireManager: null
  },
];

// Donnees mock pour les contrats
export const CONTRATS: Contrat[] = [
  { id: '1', reference: 'CTR-2026-001', candidatureId: '1', typeContrat: 'CDI', salaire: '3200 DT', dateDebut: '2026-02-01', statut: 'BROUILLON' },
  { id: '2', reference: 'CTR-2026-002', candidatureId: '2', typeContrat: 'CDD', salaire: '2800 DT', dateDebut: '2026-02-01', statut: 'SIGNE' },
  { id: '3', reference: 'CTR-2026-003', candidatureId: '5', typeContrat: 'CDI', salaire: '1900 DT', dateDebut: '2026-02-15', statut: 'SIGNE' },
  { id: '4', reference: 'CTR-2026-004', candidatureId: '3', typeContrat: 'CDD', salaire: '1650 DT', dateDebut: '2026-03-01', statut: 'BROUILLON' },
];

// Donnees mock pour les validations
export const VALIDATIONS: ValidationEtape[] = [
  { id: '1', demandeId: '1', niveauEtape: 1, acteurId: '1', decision: 'EN_ATTENTE', dateLimite: new Date(), createdAt: new Date() },
  { id: '2', demandeId: '2', niveauEtape: 2, acteurId: '1', decision: 'EN_ATTENTE', dateLimite: new Date(), createdAt: new Date() },
  { id: '3', demandeId: '3', niveauEtape: 1, acteurId: '1', decision: 'VALIDEE', dateLimite: new Date(), dateDecision: new Date(), createdAt: new Date() },
];

// Statistiques par role
export const STATS: Record<Role, StatCard[]> = {
  superadmin: [
    { label: 'Utilisateurs actifs',  value: '28',     delta: '+3 ce mois',        up: true,  icon: 'Users', color: 'var(--gold-pale)' },
    { label: 'Eval. PE en cours',    value: '4',      delta: '2 urgentes J-30',   up: false, icon: 'Star', color: 'var(--amber-bg)' },
    { label: 'Workflows actifs',     value: '6',      delta: 'Tous operationnels', up: null,  icon: 'GitBranch', color: 'var(--olive-bg)' },
    { label: 'Actions audit (24h)',  value: '142',    delta: 'Journalisees',       up: null,  icon: 'Shield', color: 'var(--umber-bg)' },
  ],
  manager: [
    { label: 'Demandes actives',    value: '3',    delta: '+1 ce mois',       up: true,  icon: 'FileText', color: 'var(--olive-bg)' },
    { label: 'Entretiens a venir',  value: '2',    delta: 'Cette semaine',    up: null,  icon: 'Calendar', color: 'var(--umber-bg)' },
    { label: 'Eval. PE en attente', value: '1',    delta: 'J-24 avant fin',   up: false, icon: 'Star', color: 'var(--amber-bg)' },
    { label: 'Candidats evalues',   value: '8',    delta: '+3 ce mois',       up: true,  icon: 'Users', color: 'var(--green-bg)' },
  ],
  directeur: [
    { label: 'A valider (demandes)',value: '3',    delta: 'Urgentes +24h',    up: false, icon: 'FileText', color: 'var(--amber-bg)' },
    { label: 'Eval. PE N+2',        value: '2',    delta: 'Sous ma direction', up: false, icon: 'Star', color: 'var(--amber-bg)' },
    { label: 'Entretiens ce mois',  value: '6',    delta: '2 confirmes',      up: null,  icon: 'Calendar', color: 'var(--olive-bg)' },
    { label: 'Taux validation',     value: '94%',  delta: 'Sur 12 mois',      up: true,  icon: 'Check', color: 'var(--green-bg)' },
  ],
  rh: [
    { label: 'Offres publiees',     value: '7',    delta: '+2 ce mois',       up: true,  icon: 'Briefcase', color: 'var(--olive-bg)' },
    { label: 'Candidatures recues', value: '124',  delta: '+18 cette semaine', up: true,  icon: 'Mail', color: 'var(--green-bg)' },
    { label: 'Entretiens planifies',value: '14',   delta: 'Sur 3 offres',     up: null,  icon: 'Calendar', color: 'var(--umber-bg)' },
    { label: 'Contrats a generer',  value: '3',    delta: 'En attente',       up: false, icon: 'FileCheck', color: 'var(--amber-bg)' },
  ],
  daf: [
    { label: 'Demandes a valider',  value: '2',        delta: 'Urgentes',           up: false, icon: 'Check', color: 'var(--amber-bg)' },
    { label: 'Budget RH consomme',  value: '68%',      delta: 'Sur plan annuel',    up: null,  icon: 'DollarSign', color: 'var(--olive-bg)' },
    { label: 'Cout moyen recrut.',  value: '1840 DT', delta: '-12% vs 2024',       up: true,  icon: 'BarChart', color: 'var(--green-bg)' },
    { label: 'Validations ce mois', value: '11',       delta: '9 validees',         up: null,  icon: 'FileText', color: 'var(--umber-bg)' },
  ],
  dga: [
    { label: 'En attente DGA',      value: '1',    delta: 'Validation finale',  up: false, icon: 'Check', color: 'var(--amber-bg)' },
    { label: 'Recrutements actifs', value: '12',   delta: 'Toutes directions',  up: null,  icon: 'Building', color: 'var(--olive-bg)' },
    { label: 'Delai moyen recrut.', value: '23j',  delta: '-7j vs objectif',    up: true,  icon: 'Clock', color: 'var(--green-bg)' },
    { label: 'Taux confirmation PE',value: '82%',  delta: 'Sur 28 eval.',       up: true,  icon: 'Star', color: 'var(--umber-bg)' },
  ],
  dg: [
    { label: 'Demandes a valider',  value: '1',    delta: 'Validation strategique', up: false, icon: 'Check', color: 'var(--amber-bg)' },
    { label: 'Recrutements en cours', value: '12', delta: 'Toutes directions',  up: null,  icon: 'Building', color: 'var(--olive-bg)' },
    { label: 'Budget RH alloue',    value: '42%',  delta: 'Sur exercice',       up: null,  icon: 'DollarSign', color: 'var(--green-bg)' },
    { label: 'Taux validation PE',  value: '85%',  delta: 'Sur 28 eval.',       up: true,  icon: 'Star', color: 'var(--umber-bg)' },
  ],
  paie: [
    { label: 'Contrats a generer',  value: '4',  delta: 'Candidats confirmes', up: false, icon: 'FileCheck', color: 'var(--amber-bg)' },
    { label: 'Donnees PE a saisir', value: '3',  delta: 'Urgentes J-30',       up: false, icon: 'Star', color: 'var(--amber-bg)' },
    { label: 'Avenants en cours',   value: '2',  delta: 'En traitement',       up: null,  icon: 'RefreshCw', color: 'var(--olive-bg)' },
    { label: 'Contrats signes',     value: '6',  delta: '+2 vs mois prec.',    up: true,  icon: 'Check', color: 'var(--green-bg)' },
  ],
  candidat: [],
};