// frontend/src/types/index.ts

export type Role = 'superadmin' | 'manager' | 'directeur' | 'rh' | 'daf' | 'dga' | 'dg' | 'paie' | 'candidat';

// ✅ Enum TypeEntretien aligné avec le backend
export type TypeEntretien = 'RH' | 'TECHNIQUE' | 'DIRECTION';

export interface Direction {
  id: string;
  code: string;
  nom: string;
  actif: boolean;
}

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: Role;
  token?: string;
  mustChangePassword?: boolean;
  dernierConnexion?: string;
  actif?: boolean;
  departement?: string;
  poste?: string;
  telephone?: string;
  directionId?: string;
  direction?: Direction;
}

export interface RoleConfig {
  label: string;
  color: string;
  initials: string;
  name: string;
  sub: string;
}

export interface NavItem {
  id?: string;
  label?: string;
  icon?: string;
  badge?: string;
  badgeColor?: 'red' | 'amber' | 'gold' | 'green';
  section?: string;
}

export interface ValidationEtape {
  id: string;
  demandeId: string;
  niveauEtape: number;
  acteurId: string;
  acteur: User;
  decision: 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'MODIFIEE';
  commentaire?: string;
  dateLimite: string;
  dateDecision?: string;
}

export interface Disponibilite {
  id: string;
  demandeId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
}

// ✅ NOUVEAU : créneau d'interviewer (MANAGER / DIRECTEUR / DRH)
export interface DisponibiliteInterviewer {
  id: string;
  userId: string;
  user: Pick<User, 'id' | 'nom' | 'prenom' | 'role'>;
  demandeId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  reservee: boolean;
  createdAt: string;
}

// ✅ Interface Demande complète (alignée avec l'API)
export interface Demande {
  id: string;
  reference: string;
  intitulePoste: string;
  description?: string;
  justification: string;
  motif: string;
  commentaireMotif?: string;
  personneRemplaceeNom?: string;
  fonctionRemplacee?: string;
  typeContrat: string;
  priorite: 'HAUTE' | 'MOYENNE' | 'BASSE';
  budgetMin?: number;
  budgetMax?: number;
  dateSouhaitee: string;
  statut: string;
  // ✅ Niveau du poste — essentiel pour déterminer le circuit et les types d'entretien
  niveau: 'TECHNICIEN' | 'EMPLOYE' | 'CADRE_DEBUTANT' | 'CADRE_CONFIRME' | 'CADRE_SUPERIEUR' | 'STRATEGIQUE';
  circuitType?: string;
  totalEtapes?: number;
  etapeActuelle: number;
  valideeAt?: string;
  createdAt: string;
  updatedAt: string;
  createurId: string;
  createur: User;
  managerId: string;
  manager: User;
  directionId?: string;
  direction?: Direction;
  validations: ValidationEtape[];
  disponibilites: Disponibilite[];
  disponibilitesInterviewers?: DisponibiliteInterviewer[];
  offre?: OffreEmploi;

  // Champs de compatibilité ancienne interface (à supprimer progressivement)
  ref?: string;
  poste?: string;
  contrat?: string;
  budget?: string;
  date?: string;
  etape?: number;
}

export interface OffreEmploi {
  id: string;
  reference: string;
  intitule: string;
  description?: string;
  profilRecherche?: string;
  competences: string[];
  fourchetteSalariale?: string;
  typeContrat: string;
  statut: string;
  canauxPublication: string[];
  datePublication?: string;
  lienCandidature?: string;
  demandeId?: string;
  demande?: Demande;
  createdAt: string;
  updatedAt: string;
}

export interface Candidature {
  id: string;
  reference: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  cvUrl: string;
  cvTexte?: string;
  scoreGlobal?: number;
  scoreExp?: number;
  competencesDetectees: string[];
  competencesManquantes: string[];
  statut: string;
  consentementRGPD: boolean;
  consentementIA: boolean;
  dateSoumission: string;
  offreId: string;
  offre: OffreEmploi;
  entretiens?: Entretien[];
}

// ✅ Interface Entretien corrigée avec TypeEntretien et DisponibiliteInterviewer
export interface Entretien {
  id: string;
  type: TypeEntretien;          // ✅ 'RH' | 'TECHNIQUE' | 'DIRECTION'
  date: string;
  heure: string;
  lieu: string;
  statut: 'PLANIFIE' | 'REALISE' | 'ANNULE' | 'REPORTE';
  feedback?: string;
  evaluation?: number;
  candidatureId: string;
  candidature?: Candidature;
  interviewerId: string;
  interviewer?: User;
  disponibiliteId?: string;
  disponibilite?: DisponibiliteInterviewer;
}

export interface EvaluationPE {
  id: string;
  employe: string;
  contrat: string;
  dateDebut: string;
  dateFin: string;
  joursRestants: number;
  statut: string;
  etapeActuelle: 'paie' | 'manager' | 'directeur' | 'rh' | 'daf' | 'dga' | 'cloturee';
  decision: string | null;
  decisionManager?: string;
  salaire?: string;
}

export interface Contrat {
  id: string;
  reference: string;
  typeContrat: string;
  salaire: string;
  dateDebut: string;
  dateFin?: string;
  statut: string;
  pdfUrl?: string;
  candidatureId: string;
  candidature?: Candidature;
}

export interface StatCard {
  label: string;
  value: string;
  delta: string;
  up: boolean | null;
  icon: string;
  color: string;
}

export interface PEStep {
  role: string;
  label: string;
  description: string;
}

export const PE_WORKFLOW: PEStep[] = [
  { role: 'paie',      label: 'Resp. Paie',    description: 'Saisie & vérification données contractuelles' },
  { role: 'manager',   label: 'Manager N+1',   description: 'Évaluation comportementale et décision' },
  { role: 'directeur', label: 'Directeur N+2', description: 'Validation avec accès éval. N+1' },
  { role: 'rh',        label: 'DRH',           description: 'Validation RH — éval. N+1 masquée' },
  { role: 'daf',       label: 'DAF',           description: 'Validation financière — éval. N+1 masquée' },
  { role: 'dga',       label: 'DGA',           description: 'Décision finale — éval. N+1 masquée' },
];