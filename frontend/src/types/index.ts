// frontend/src/types/index.ts

export type Role = 'superadmin' | 'manager' | 'directeur' | 'rh' | 'daf' | 'dga' | 'dg' | 'paie' | 'candidat'

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

// ✅ AJOUTER CES TYPES
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

export interface Demande {
  id?: string;
  reference?: string;
  ref?: string;           // Pour compatibilité avec les données mock
  poste: string;
  motif: string;
  contrat: string;
  priorite: 'Haute' | 'Moyenne' | 'Basse';
  statut: string;
  budget: string;
  date: string;
  etape: number;
  totalEtapes: number;
  // Champs supplémentaires pour l'API
  intitulePoste?: string;
  justification?: string;
  typeContrat?: string;
  budgetEstime?: number;
  dateSouhaitee?: string;
  description?: string;
  managerId?: string;
  manager?: User;
  directionId?: string;
  direction?: Direction;
  validations?: ValidationEtape[];
  disponibilites?: Disponibilite[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Offre {
  ref: string;
  poste: string;
  statut: 'Publiée' | 'Brouillon' | 'Clôturée';
  candidats: number;
  canaux: string[];
  date: string;
}

export interface Candidature {
  id: string;
  nom: string;
  offre: string;
  type: 'Nouvelle' | 'Base';
  scoreGlobal: number;
  scoreExp: number;
  motsCles: string[];
  statut: string;
}

export interface Entretien {
  id: string;
  candidat: string;
  poste: string;
  type: 'RH' | 'Technique';
  date: string;
  heure: string;
  lieu: string;
  statut: string;
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
  candidat: string;
  poste: string;
  type: string;
  salaire: string;
  dateDebut: string;
  statut: string;
}

export interface ValidationItem {
  ref: string;
  objet: string;
  type: string;
  demandeur: string;
  budget: string;
  priorite: 'Haute' | 'Moyenne';
  depuis: string;
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

export interface ValidationEtape {
  id: string;
  demandeId: string;
  niveauEtape: number;
  acteurId: string;
  acteur?: User;
  decision: string;
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

export const PE_WORKFLOW: PEStep[] = [
  { role: 'paie',      label: 'Resp. Paie',    description: 'Saisie & vérification données contractuelles' },
  { role: 'manager',   label: 'Manager N+1',   description: 'Évaluation comportementale et décision' },
  { role: 'directeur', label: 'Directeur N+2', description: 'Validation avec accès éval. N+1' },
  { role: 'rh',        label: 'DRH',           description: 'Validation RH — éval. N+1 masquée' },
  { role: 'daf',       label: 'DAF',           description: 'Validation financière — éval. N+1 masquée' },
  { role: 'dga',       label: 'DGA',           description: 'Décision finale — éval. N+1 masquée' },
];