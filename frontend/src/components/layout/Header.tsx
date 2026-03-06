import { Bell, Search, Settings } from 'lucide-react'

const PAGE_TITLES: Record<string, [string, string | null]> = {
  dashboard:    ['Tableau de bord', "Vue d'ensemble"],
  demandes:     ['Demandes de recrutement', null],
  offres:       ["Offres d'emploi", null],
  candidats:    ['Candidatures & IA', 'Présélection intelligente'],
  entretiens:   ['Entretiens', null],
  evaluation:   ["Évaluation Période d'Essai", 'Processus 2 — 6 étapes'],
  contrats:     ['Contractualisation', null],
  validation:   ['Circuit de validation', 'Approbations en attente'],
  utilisateurs: ['Utilisateurs & Rôles', 'Super Admin'],
  workflows:    ['Workflows', 'Circuits de validation'],
  ia_config:    ['Configuration IA', 'Paramètres du moteur de matching'],
  audit:        ["Journal d'audit", 'Traçabilité complète'],
}

interface HeaderProps { page: string }

export function Header({ page }: HeaderProps) {
  const [title, sub] = PAGE_TITLES[page] || [page, null]
  return (
    <header style={{ height: 60, background: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, position: 'sticky', top: 0, zIndex: 90 }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        {sub && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>· {sub}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', minWidth: 200 }}>
          <Search size={13} color="var(--text-muted)" />
          <input type="text" placeholder="Rechercher…" style={{ border: 'none', background: 'none', fontSize: 13, color: 'var(--text-primary)', outline: 'none', width: '100%', fontFamily: 'inherit' }} />
        </div>
        <button style={{ width: 34, height: 34, borderRadius: 8, background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}>
          <Bell size={16} />
          <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, background: 'var(--red)', borderRadius: '50%', border: '2px solid var(--white)' }} />
        </button>
        <button style={{ width: 34, height: 34, borderRadius: 8, background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
