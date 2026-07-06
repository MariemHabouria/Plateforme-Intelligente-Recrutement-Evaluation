import { clsx, type ClassValue } from 'clsx'
import type { BadgeVariant } from '../components/ui/Badge'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function getStatusBadge(statut: string): BadgeVariant {
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

export function getPrioriteBadge(p: string): BadgeVariant {
  if (p === 'Haute') return 'red'
  if (p === 'Moyenne') return 'amber'
  return 'umber'
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--green)'
  if (score >= 70) return 'var(--gold)'
  return 'var(--amber)'
}

// ============================================
// AUDIT LOG
// ============================================

const AUDIT_CRITICAL_KEYWORDS = ['SUPPRIME', 'DELETE', 'REJET', 'ECHEC', 'ERREUR', 'ANNULE', 'RUPTURE']
const AUDIT_WARNING_KEYWORDS = ['MODIFIE', 'RELANCE', 'DESACTIVE', 'PROLONGATION']

export function getAuditSeverity(action: string): 'INFO' | 'WARNING' | 'CRITICAL' {
  const upper = action.toUpperCase()
  if (AUDIT_CRITICAL_KEYWORDS.some(k => upper.includes(k))) return 'CRITICAL'
  if (AUDIT_WARNING_KEYWORDS.some(k => upper.includes(k))) return 'WARNING'
  return 'INFO'
}

export function getAuditActionBadge(action: string): BadgeVariant {
  const severity = getAuditSeverity(action)
  if (severity === 'CRITICAL') return 'red'
  if (severity === 'WARNING') return 'amber'
  return 'gold'
}