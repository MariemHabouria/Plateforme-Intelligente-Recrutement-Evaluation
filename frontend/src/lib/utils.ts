import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// No blue anywhere — use olive instead
export function getStatusBadge(statut: string): string {
  if (statut.includes('En validation') || statut.includes('en attente') || statut.includes('attente')) return 'amber'
  if (statut === 'Validée' || statut === 'Confirmé' || statut === 'Signé' || statut === 'Confirmation') return 'green'
  if (statut === 'Clôturée' || statut === 'En rédaction') return 'umber'
  if (statut === 'Rejetée' || statut === 'Refusé' || statut === 'À reprogrammer' || statut === 'Rupture') return 'red'
  if (statut === 'Publiée' || statut === 'Pré-sél. IA') return 'olive'
  if (statut === 'Brouillon' || statut === 'En attente confirmation') return 'amber'
  if (statut === 'À générer') return 'amber'
  if (statut === 'Envoyé') return 'gold'
  if (statut === 'En revue RH') return 'umber'
  return 'olive'
}

export function getPrioriteBadge(p: string): string {
  if (p === 'Haute') return 'red'
  if (p === 'Moyenne') return 'amber'
  return 'umber'
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--green)'
  if (score >= 70) return 'var(--gold)'
  return 'var(--amber)'
}
