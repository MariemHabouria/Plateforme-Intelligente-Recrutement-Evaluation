export type Role = 'superadmin' | 'manager' | 'directeur' | 'rh' | 'daf' | 'dga' | 'paie' | 'candidat'

export interface RoleConfig {
  label: string
  color: string
  initials: string
  name: string
  sub: string
}

export interface NavItem {
  id?: string
  label?: string
  icon?: string
  badge?: string
  badgeColor?: 'red' | 'amber' | 'gold'
  section?: string
}

export interface Demande {
  ref: string
  poste: string
  motif: string
  contrat: string
  priorite: 'Haute' | 'Moyenne' | 'Basse'
  statut: string
  budget: string
  date: string
  etape: number
  totalEtapes: number
}

export interface Offre {
  ref: string
  poste: string
  statut: 'Publiée' | 'Brouillon' | 'Clôturée'
  candidats: number
  canaux: string[]
  date: string
}

export interface Candidature {
  id: string
  nom: string
  offre: string
  type: 'Nouvelle' | 'Base'
  scoreGlobal: number
  scoreExp: number
  motsCles: string[]
  statut: string
}

export interface Entretien {
  id: string
  candidat: string
  poste: string
  type: 'RH' | 'Technique'
  date: string
  heure: string
  lieu: string
  statut: string
}

export interface EvaluationPE {
  id: string
  employe: string
  contrat: string
  dateDebut: string
  dateFin: string
  joursRestants: number
  statut: string
  etapeActuelle: 'paie' | 'manager' | 'directeur' | 'rh' | 'daf' | 'dga' | 'cloturee'
  decision: string | null
  decisionManager?: string
  salaire?: string
}

export interface Contrat {
  id: string
  candidat: string
  poste: string
  type: string
  salaire: string
  dateDebut: string
  statut: string
}

export interface ValidationItem {
  ref: string
  objet: string
  type: string
  demandeur: string
  budget: string
  priorite: 'Haute' | 'Moyenne'
  depuis: string
}

export interface StatCard {
  label: string
  value: string
  delta: string
  up: boolean | null
  icon: string
  color: string
}

export interface PEStep {
  role: string
  label: string
  description: string
}

export const PE_WORKFLOW: PEStep[] = [
  { role: 'paie',      label: 'Resp. Paie',    description: 'Saisie & vérification données contractuelles' },
  { role: 'manager',   label: 'Manager N+1',   description: 'Évaluation comportementale et décision' },
  { role: 'directeur', label: 'Directeur N+2', description: 'Validation avec accès éval. N+1' },
  { role: 'rh',        label: 'DRH',           description: 'Validation RH — éval. N+1 masquée' },
  { role: 'daf',       label: 'DAF',           description: 'Validation financière — éval. N+1 masquée' },
  { role: 'dga',       label: 'DGA',           description: 'Décision finale — éval. N+1 masquée' },
]
