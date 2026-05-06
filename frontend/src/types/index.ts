// frontend/src/types/index.ts

export type Role = 
  | 'SUPER_ADMIN'
  | 'MANAGER'
  | 'DIRECTEUR'
  | 'DRH'
  | 'DAF'
  | 'DGA'
  | 'DG'
  | 'RESP_PAIE'
  | 'EMPLOYE'
  | 'candidat';
export const normalizeRole = (role: string | undefined): string => {
  if (!role) return '';
  const roleMap: Record<string, string> = {
    'paie': 'RESP_PAIE',
    'manager': 'MANAGER',
    'directeur': 'DIRECTEUR',
    'rh': 'DRH',
    'superadmin': 'SUPER_ADMIN'
  };
  return roleMap[role] || role;
};

// Enum TypeEntretien aligne avec le backend
export type TypeEntretien = 'RH' | 'TECHNIQUE' | 'DIRECTION';

// ============================================
// MODELE DIRECTION
// ============================================
export interface Direction {
  id: string;
  code: string;
  nom: string;
  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// MODELE USER
// ============================================
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
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// CONFIGURATION
// ============================================
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

// ============================================
// VALIDATION ETAPE (pour demandes)
// ============================================
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
  createdAt?: string;
}

// ============================================
// DISPONIBILITES
// ============================================
export interface Disponibilite {
  id: string;
  demandeId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
}

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

// ============================================
// DEMANDE RECRUTEMENT
// ============================================
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
}

// ============================================
// OFFRE EMPLOI
// ============================================
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
  datePublication?: string;
  lienCandidature?: string;
  demandeId?: string;
  demande?: Demande;
  rhId: string;
  candidatures?: Candidature[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CANDIDATURE
// ============================================
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
  offreId?: string;
  offre?: OffreEmploi;
  entretiens?: Entretien[];
  contrat?: Contrat;
}

// ============================================
// ENTRETIEN
// ============================================
export interface Entretien {
  id: string;
  type: TypeEntretien;
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

// ============================================
// CONTRAT
// ============================================
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
  evaluationPE?: EvaluationPEDetail;
  avenants?: Avenant[];
}

export interface Avenant {
  id: string;
  typeAvenant: string;
  date: string;
  description: string;
  contratId: string;
}

// ============================================
// EVALUATION PE (PROCESSUS 2)
// ============================================
export type DecisionEvaluationPE = 'CONFIRMATION' | 'PROLONGATION' | 'RUPTURE' | 'CHANGEMENT';

export type StatutEvaluationPE = 
  | 'BROUILLON'
  | 'EN_VALIDATION_DIR'
  | 'EN_VALIDATION_DRH'
  | 'EN_VALIDATION_DAF'
  | 'EN_VALIDATION_DGA'
  | 'EN_VALIDATION_DG'
  | 'VALIDEE'
  | 'REJETEE';

export interface EvaluationPEDetail {
  id: string;
  reference: string;
  employeId: string;
  employe: User;
  managerId: string;
  manager: User;
  contratId: string;
  contrat: Contrat;
  dateDebut: string;
  dateFin: string;
  dateEvaluation: string;
  joursRestants: number;
  decision?: DecisionEvaluationPE;
  dureeProlongation?: number;
  justificationRupture?: string;
  evaluationN1?: string;
  commentaireN1?: string;
  dateSoumissionN1?: string;
  evaluationN2?: string;
  commentaireN2?: string;
  dateDecisionN2?: string;
  evaluationN1Masquee: boolean;
  statut: StatutEvaluationPE;
  etapeActuelle: number;
  totalEtapes: number;
  createdAt: string;
  updatedAt: string;
  valideeAt?: string;
  validations: EvaluationValidation[];
}

export interface EvaluationValidation {
  id: string;
  evaluationId: string;
  niveauEtape: number;
  role: string;
  acteurId: string;
  acteur: User;
  decision: string;
  commentaire?: string;
  dateLimite: string;
  dateDecision?: string;
  relanceEnvoyee: boolean;
  createdAt: string;
}

// ============================================
// WORKFLOW STEPS
// ============================================
export interface PEStep {
  role: string;
  label: string;
  description: string;
  order: number;
}

export const PE_WORKFLOW: PEStep[] = [
  { role: 'paie', label: 'Resp. Paie', description: 'Saisie & verification donnees contractuelles', order: 0 },
  { role: 'manager', label: 'Manager N+1', description: 'Evaluation comportementale et decision', order: 1 },
  { role: 'directeur', label: 'Directeur N+2', description: 'Validation avec acces eval. N+1', order: 2 },
  { role: 'rh', label: 'DRH', description: 'Validation RH — eval. N+1 masquee', order: 3 },
  { role: 'daf', label: 'DAF', description: 'Validation financiere — eval. N+1 masquee', order: 4 },
  { role: 'dga', label: 'DGA/DG', description: 'Decision finale — eval. N+1 masquee', order: 5 },
  { role: 'cloturee', label: 'Cloturee', description: 'Evaluation finalisee', order: 6 }
];

// ============================================
// FORMULAIRES EVALUATION PE
// ============================================
export interface EvaluationN1FormData {
  evaluationN1: string;
  commentaireN1: string;
  decision: DecisionEvaluationPE;
  dureeProlongation?: number;
  justificationRupture?: string;
}

export interface EvaluationN2FormData {
  decision: 'VALIDEE' | 'MODIFIEE' | 'REJETEE';
  commentaire?: string;
  evaluationN2?: string;
}

export interface EvaluationValidationFormData {
  decision: 'Validee' | 'Refusee';
  commentaire?: string;
}

// ============================================
// STATISTIQUES
// ============================================
export interface StatCard {
  label: string;
  value: string;
  delta: string;
  up: boolean | null;
  icon: string;
  color: string;
}

// ============================================
// DONNEES MOCK (pour developpement)
// ============================================
export interface EvaluationPEMock extends EvaluationPEDetail {
  decisionManager?: string;
  salaire?: string;
}

// Compatibilité ancienne interface (à deprecier)
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