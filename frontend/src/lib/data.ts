import type { RoleConfig, NavItem, Demande, Offre, Candidature, Entretien, EvaluationPE, Contrat, ValidationItem, StatCard, Role } from '@/types'

// ✅ EXPORTER ROLES
export const ROLES: Record<Role, RoleConfig> = {
  superadmin: { label: 'Super Admin',        color: '#9A8A50', initials: 'SA', name: 'Super Admin',     sub: 'Administration système' },
  manager:    { label: 'Manager (N+1)',      color: '#5A7A3A', initials: 'MK', name: 'Mohamed Kilani',  sub: 'Manager – Dir. Industrielle' },
  directeur:  { label: 'Directeur (N+2)',   color: '#7A6C3A', initials: 'AK', name: 'Ahmed Kilani',    sub: 'Directeur Industriel' },
  rh:         { label: 'RH / DRH',          color: '#6A7A3A', initials: 'SK', name: 'Sonia Karoui',    sub: 'Responsable RH' },
  daf:        { label: 'DAF',               color: '#C07820', initials: 'RB', name: 'Rami Ben Ali',    sub: 'Dir. Administratif & Financier' },
  dga:        { label: 'DGA',               color: '#7A5A3A', initials: 'NK', name: 'Nabil Kilani',    sub: 'Directeur Général Adjoint' },
  dg:         { label: 'DG',                color: '#7A5A3A', initials: 'KK', name: 'Karim Kilani',    sub: 'Directeur Général' },
  paie:       { label: 'Resp. Paie',        color: '#9A8A50', initials: 'LM', name: 'Leila Marzouk',   sub: 'Responsable Paie & Admin.' },
  candidat:   { label: 'Candidat (public)', color: '#A04030', initials: 'CA', name: 'Candidat Externe',sub: 'Formulaire public' },
}

// ✅ EXPORTER NAV_CONFIG
export const NAV_CONFIG: Record<string, NavItem[]> = {
  superadmin: [
    { section: 'administration' },
    { id: 'dashboard',   label: 'Tableau de bord',     icon: 'LayoutDashboard' },
    { id: 'utilisateurs',label: 'Utilisateurs & Rôles', icon: 'Users',          badge: '2', badgeColor: 'amber' },
    { id: 'workflows',   label: 'Workflows PE',         icon: 'GitBranch' },
    { id: 'ia_config',   label: 'Configuration IA',     icon: 'Cpu' },
    { section: 'supervision' },
    { id: 'demandes',    label: 'Toutes les demandes',  icon: 'FileText' },
    { id: 'evaluation',  label: 'Évaluations PE',       icon: 'Star',           badge: '3', badgeColor: 'amber' },
    { id: 'audit',       label: 'Journal d\'audit',     icon: 'Shield' },
  ],
  manager: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',   icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Mes demandes',       icon: 'FileText',  badge: '2', badgeColor: 'red' },
    { id: 'entretiens', label: 'Mes entretiens',     icon: 'Calendar' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Évaluation PE',      icon: 'Star',      badge: '1', badgeColor: 'amber' },
  ],
  directeur: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',   icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Demandes',          icon: 'FileText',  badge: '3', badgeColor: 'amber' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Évaluations PE',    icon: 'Star',      badge: '2', badgeColor: 'amber' },
  ],
  rh: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',    icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Demandes',            icon: 'FileText',  badge: '3', badgeColor: 'amber' },
    { id: 'offres',     label: "Offres d'emploi",     icon: 'Briefcase' },
    { id: 'candidats',  label: 'Candidatures + IA',   icon: 'Users', badge: '12', badgeColor: 'red' },
    { id: 'entretiens', label: 'Entretiens',          icon: 'Calendar' },
    { section: 'gestion_rh' },
    { id: 'evaluation', label: 'Évaluations PE',      icon: 'Star' },
    { id: 'contrats',   label: 'Contractualisation',  icon: 'FileCheck', badge: '3', badgeColor: 'amber' },
  ],
  daf: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',   icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Demandes',          icon: 'FileText',  badge: '2', badgeColor: 'amber' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Évaluations PE',    icon: 'Star',      badge: '1', badgeColor: 'amber' },
  ],
  dga: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',   icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Vue globale',       icon: 'FileText',  badge: '1', badgeColor: 'amber' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Évaluations PE',    icon: 'Star',      badge: '1', badgeColor: 'amber' },
  ],
  dg: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',   icon: 'LayoutDashboard' },
    { id: 'demandes',   label: 'Vue stratégique',   icon: 'FileText',  badge: '1', badgeColor: 'amber' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Évaluations PE',    icon: 'Star',      badge: '1', badgeColor: 'amber' },
  ],
  paie: [
    { section: 'principal' },
    { id: 'dashboard',  label: 'Tableau de bord',    icon: 'LayoutDashboard' },
    { id: 'contrats',   label: 'Contrats',            icon: 'FileCheck', badge: '4', badgeColor: 'amber' },
    { section: 'periode_essai' },
    { id: 'evaluation', label: 'Données PE',          icon: 'Star', badge: '3', badgeColor: 'amber' },
  ],
  candidat: [
    { id: 'candidature', label: 'Formulaire candidature', icon: 'FileText' },
  ],
}
export const DEMANDES: Demande[] = [
  { ref: 'DEM-2026-018', poste: 'Ingénieur Qualité',      motif: 'Création',    contrat: 'CDI',   priorite: 'Haute',   statut: 'En validation DIR', budget: '42 000 DT', date: '15/01/2026', etape: 1, totalEtapes: 4 },
  { ref: 'DEM-2026-015', poste: 'Chef Comptable',         motif: 'Remplacement',contrat: 'CDI',   priorite: 'Haute',   statut: 'En validation DAF', budget: '58 000 DT', date: '12/01/2026', etape: 3, totalEtapes: 5 },
  { ref: 'DEM-2026-012', poste: 'Technicien Maintenance', motif: 'Renforcement',contrat: 'CDD',   priorite: 'Moyenne', statut: 'Validée',           budget: '22 000 DT', date: '08/01/2026', etape: 3, totalEtapes: 3 },
  { ref: 'DEM-2026-009', poste: 'Stagiaire RH',           motif: 'Création',    contrat: 'Stage', priorite: 'Basse',   statut: 'Clôturée',          budget: '4 800 DT',  date: '03/01/2026', etape: 3, totalEtapes: 3 },
]

export const OFFRES: Offre[] = [
  { ref: 'OFF-2026-011', poste: 'Chef de projet IT',      statut: 'Publiée',  candidats: 23, canaux: ['LinkedIn','TanitJobs'], date: '10/01/2026' },
  { ref: 'OFF-2026-009', poste: 'Technicien Maintenance', statut: 'Publiée',  candidats: 41, canaux: ['TanitJobs'],            date: '05/01/2026' },
  { ref: 'OFF-2026-007', poste: 'Ingénieur Qualité',      statut: 'Brouillon',candidats: 0,  canaux: [],                      date: '15/01/2026' },
  { ref: 'OFF-2026-004', poste: 'Stagiaire Marketing',    statut: 'Clôturée', candidats: 67, canaux: ['LinkedIn','TanitJobs'], date: '20/12/2025' },
]

export const CANDIDATURES: Candidature[] = [
  { id: '1', nom: 'Aymen Bouslama', offre: 'Chef de projet IT',      type: 'Nouvelle', scoreGlobal: 87, scoreExp: 91, motsCles: ['React','Node.js','Agile','Docker'],  statut: 'Pré-sél. IA' },
  { id: '2', nom: 'Rim Chaabane',   offre: 'Chef de projet IT',      type: 'Base',     scoreGlobal: 82, scoreExp: 78, motsCles: ['Vue.js','PostgreSQL','CI/CD'],       statut: 'En revue RH' },
  { id: '3', nom: 'Karim Sfaxi',    offre: 'Technicien Maintenance', type: 'Nouvelle', scoreGlobal: 74, scoreExp: 82, motsCles: ['Électrique','Pneumatique','GMAO'],    statut: 'Reçue' },
  { id: '4', nom: 'Nour Jlassi',    offre: 'Chef de projet IT',      type: 'Nouvelle', scoreGlobal: 65, scoreExp: 60, motsCles: ['JavaScript','HTML/CSS'],            statut: 'Reçue' },
  { id: '5', nom: 'Sami Ben Amor',  offre: 'Technicien Maintenance', type: 'Base',     scoreGlobal: 79, scoreExp: 85, motsCles: ['Hydraulique','GMAO','Soudure'],      statut: 'Pré-sél. IA' },
]

export const ENTRETIENS: Entretien[] = [
  { id: '1', candidat: 'Aymen Bouslama', poste: 'Chef de projet IT',      type: 'RH',       date: '20/01/2026', heure: '10:00', lieu: 'Siège Kilani',   statut: 'Confirmé' },
  { id: '2', candidat: 'Rim Chaabane',   poste: 'Chef de projet IT',      type: 'Technique', date: '22/01/2026', heure: '14:30', lieu: 'Salle A3',        statut: 'En attente confirmation' },
  { id: '3', candidat: 'Sami Ben Amor',  poste: 'Technicien Maintenance', type: 'RH',       date: '23/01/2026', heure: '09:00', lieu: 'Teams',           statut: 'Confirmé' },
  { id: '4', candidat: 'Karim Sfaxi',    poste: 'Technicien Maintenance', type: 'Technique', date: '25/01/2026', heure: '11:00', lieu: 'Usine B. Cedria', statut: 'À reprogrammer' },
]

export const EVALUATIONS_PE: EvaluationPE[] = [
  {
    id: '1', employe: 'Sami Trabelsi', contrat: 'CDD', dateDebut: '21/07/2025', dateFin: '21/02/2026',
    joursRestants: 24, etapeActuelle: 'manager',
    statut: 'En évaluation Manager', decision: null, salaire: '2 400 DT',
  },
  {
    id: '2', employe: 'Hana Missaoui', contrat: 'CDI', dateDebut: '22/10/2025', dateFin: '22/04/2026',
    joursRestants: 82, etapeActuelle: 'rh',
    statut: 'En validation DRH', decision: 'Confirmation', decisionManager: 'Confirmation', salaire: '3 100 DT',
  },
  {
    id: '3', employe: 'Zied Guesmi', contrat: 'CDI', dateDebut: '01/09/2025', dateFin: '01/03/2026',
    joursRestants: 32, etapeActuelle: 'daf',
    statut: 'En validation DAF', decision: 'Confirmation', decisionManager: 'Confirmation', salaire: '2 800 DT',
  },
  {
    id: '4', employe: 'Amira Ben Salah', contrat: 'CDD', dateDebut: '01/11/2025', dateFin: '01/05/2026',
    joursRestants: 90, etapeActuelle: 'paie',
    statut: 'En attente données Paie', decision: null, salaire: '1 950 DT',
  },
]

export const CONTRATS: Contrat[] = [
  { id: '1', candidat: 'Aymen Bouslama', poste: 'Chef de projet IT',      type: 'CDI', salaire: '3 200 DT', dateDebut: '01/02/2026', statut: 'À générer' },
  { id: '2', candidat: 'Rim Chaabane',   poste: 'Chef de projet IT',      type: 'CDD', salaire: '2 800 DT', dateDebut: '01/02/2026', statut: 'Envoyé' },
  { id: '3', candidat: 'Sami Ben Amor',  poste: 'Technicien Maintenance', type: 'CDI', salaire: '1 900 DT', dateDebut: '15/02/2026', statut: 'Signé' },
  { id: '4', candidat: 'Karim Sfaxi',    poste: 'Technicien Maintenance', type: 'CDD', salaire: '1 650 DT', dateDebut: '01/03/2026', statut: 'En rédaction' },
]

export const VALIDATIONS: ValidationItem[] = [
  { ref: 'DEM-2026-018', objet: 'Ingénieur Qualité',       type: 'Demande recrutement', demandeur: 'M. Kilani',   budget: '42 000 DT', priorite: 'Haute',   depuis: '2h' },
  { ref: 'DEM-2026-016', objet: 'Responsable Logistique',  type: 'Demande recrutement', demandeur: 'F. Hammami',  budget: '55 000 DT', priorite: 'Haute',   depuis: '18h' },
  { ref: 'PE-2026-003',  objet: 'Éval. PE — H. Missaoui', type: 'Évaluation PE',       demandeur: 'K. Ben Salah',budget: '—',         priorite: 'Moyenne', depuis: '6h' },
]

export const STATS: Record<Role, StatCard[]> = {
  superadmin: [
    { label: 'Utilisateurs actifs',  value: '28',     delta: '+3 ce mois',        up: true,  icon: '👥', color: 'var(--gold-pale)' },
    { label: 'Éval. PE en cours',    value: '4',      delta: '2 urgentes J-30',   up: false, icon: '⭐', color: 'var(--amber-bg)' },
    { label: 'Workflows actifs',     value: '6',      delta: 'Tous opérationnels', up: null,  icon: '⚙️', color: 'var(--olive-bg)' },
    { label: 'Actions audit (24h)',  value: '142',    delta: 'Journalisées',       up: null,  icon: '🛡', color: 'var(--umber-bg)' },
  ],
  manager: [
    { label: 'Demandes actives',    value: '3',    delta: '+1 ce mois',       up: true,  icon: '📋', color: 'var(--olive-bg)' },
    { label: 'Entretiens à venir',  value: '2',    delta: 'Cette semaine',    up: null,  icon: '📅', color: 'var(--umber-bg)' },
    { label: 'Éval. PE en attente', value: '1',    delta: 'J-24 avant fin',   up: false, icon: '⭐', color: 'var(--amber-bg)' },
    { label: 'Candidats évalués',   value: '8',    delta: '+3 ce mois',       up: true,  icon: '👥', color: 'var(--green-bg)' },
  ],
  directeur: [
    { label: 'À valider (demandes)',value: '3',    delta: 'Urgentes +24h',    up: false, icon: '📋', color: 'var(--amber-bg)' },
    { label: 'Éval. PE N+2',        value: '2',    delta: 'Sous ma direction', up: false, icon: '⭐', color: 'var(--amber-bg)' },
    { label: 'Entretiens ce mois',  value: '6',    delta: '2 confirmés',      up: null,  icon: '📅', color: 'var(--olive-bg)' },
    { label: 'Taux validation',     value: '94%',  delta: 'Sur 12 mois',      up: true,  icon: '✅', color: 'var(--green-bg)' },
  ],
  rh: [
    { label: 'Offres publiées',     value: '7',    delta: '+2 ce mois',       up: true,  icon: '📢', color: 'var(--olive-bg)' },
    { label: 'Candidatures reçues', value: '124',  delta: '+18 cette semaine', up: true,  icon: '📬', color: 'var(--green-bg)' },
    { label: 'Entretiens planifiés',value: '14',   delta: 'Sur 3 offres',     up: null,  icon: '📅', color: 'var(--umber-bg)' },
    { label: 'Contrats à générer',  value: '3',    delta: 'En attente',       up: false, icon: '📝', color: 'var(--amber-bg)' },
  ],
  daf: [
    { label: 'Demandes à valider',  value: '2',        delta: 'Urgentes',           up: false, icon: '✅', color: 'var(--amber-bg)' },
    { label: 'Budget RH consommé',  value: '68%',      delta: 'Sur plan annuel',    up: null,  icon: '💰', color: 'var(--olive-bg)' },
    { label: 'Coût moyen recrut.',  value: '1 840 DT', delta: '-12% vs 2024',       up: true,  icon: '📊', color: 'var(--green-bg)' },
    { label: 'Validations ce mois', value: '11',       delta: '9 validées',         up: null,  icon: '📋', color: 'var(--umber-bg)' },
  ],
  dga: [
    { label: 'En attente DGA',      value: '1',    delta: 'Validation finale',  up: false, icon: '✅', color: 'var(--amber-bg)' },
    { label: 'Recrutements actifs', value: '12',   delta: 'Toutes directions',  up: null,  icon: '🏢', color: 'var(--olive-bg)' },
    { label: 'Délai moyen recrut.', value: '23j',  delta: '-7j vs objectif',    up: true,  icon: '⏱', color: 'var(--green-bg)' },
    { label: 'Taux confirmation PE',value: '82%',  delta: 'Sur 28 éval.',       up: true,  icon: '⭐', color: 'var(--umber-bg)' },
  ],
  // ✅ AJOUTER dg ICI
  dg: [
    { label: 'Demandes à valider',  value: '1',    delta: 'Validation stratégique', up: false, icon: '✅', color: 'var(--amber-bg)' },
    { label: 'Recrutements en cours', value: '12', delta: 'Toutes directions',  up: null,  icon: '🏢', color: 'var(--olive-bg)' },
    { label: 'Budget RH alloué',    value: '42%',  delta: 'Sur exercice',       up: null,  icon: '💰', color: 'var(--green-bg)' },
    { label: 'Taux validation PE',  value: '85%',  delta: 'Sur 28 éval.',       up: true,  icon: '⭐', color: 'var(--umber-bg)' },
  ],
  paie: [
    { label: 'Contrats à générer',  value: '4',  delta: 'Candidats confirmés', up: false, icon: '📝', color: 'var(--amber-bg)' },
    { label: 'Données PE à saisir', value: '3',  delta: 'Urgentes J-30',       up: false, icon: '⭐', color: 'var(--amber-bg)' },
    { label: 'Avenants en cours',   value: '2',  delta: 'En traitement',       up: null,  icon: '🔄', color: 'var(--olive-bg)' },
    { label: 'Contrats signés',     value: '6',  delta: '+2 vs mois préc.',    up: true,  icon: '✅', color: 'var(--green-bg)' },
  ],
  candidat: [],
}
