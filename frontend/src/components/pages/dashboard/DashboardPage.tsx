import { STATS, DEMANDES } from '@/lib/data'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '@/components/ui/Card'
import { CircuitSteps } from '@/components/ui/CircuitSteps'
import { Badge } from '@/components/ui/Badge'
import type { Role, StatCard } from '@/types'

function StatCardComp({ stat }: { stat: StatCard }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--shadow-sm)', transition: 'all .18s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLElement).style.transform = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .6 }}>{stat.label}</div>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{stat.icon}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, marginBottom: 6 }}>{stat.value}</div>
      <div style={{ fontSize: 11, color: stat.up === true ? 'var(--green)' : stat.up === false ? 'var(--red)' : 'var(--text-muted)' }}>
        {stat.up === true ? '↑ ' : stat.up === false ? '↓ ' : ''}{stat.delta}
      </div>
    </div>
  )
}

const CIRCUIT_LABELS = ['MGR', 'DIR', 'RH', 'DAF', 'DGA']

export function DashboardPage({ role }: { role: Role }) {
  const stats = STATS[role] || []

  const recentActivity = [
    { icon: '📋', text: 'Demande DEM-2026-018 soumise', sub: "Ingénieur Qualité · Il y a 2h",   color: 'var(--olive-bg)',   tc: 'var(--olive)' },
    { icon: '✅', text: 'Offre OFF-2026-011 publiée',   sub: "LinkedIn + TanitJobs · Il y a 5h", color: 'var(--green-bg)',  tc: 'var(--green)' },
    { icon: '⭐', text: 'Fiche PE — Sami Trabelsi',     sub: 'CDD — J-30 avant fin · Hier',      color: 'var(--amber-bg)', tc: 'var(--amber)' },
    { icon: '🤖', text: 'Matching IA — 18 CV analysés', sub: 'Offre Technicien Maintenance · Hier',color: 'var(--umber-bg)', tc: 'var(--umber)' },
  ]

  return (
    <div className="page-fade">
      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        {stats.map((s, i) => <StatCardComp key={i} stat={s} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Activity */}
        <Card>
          <CardHeader>
            <div><CardTitle>Activité récente</CardTitle><CardSubtitle>Dernières actions sur la plateforme</CardSubtitle></div>
          </CardHeader>
          <CardBody>
            {recentActivity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < recentActivity.length - 1 ? 16 : 0, marginBottom: i < recentActivity.length - 1 ? 16 : 0, borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: a.color, color: a.tc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Circuits */}
        <Card>
          <CardHeader>
            <div><CardTitle>Circuits en cours</CardTitle><CardSubtitle>Validation active</CardSubtitle></div>
          </CardHeader>
          <CardBody>
            {DEMANDES.filter(d => d.statut !== 'Clôturée' && d.statut !== 'Validée').map((d, i, arr) => (
              <div key={d.ref} style={{ marginBottom: i < arr.length - 1 ? 16 : 0, paddingBottom: i < arr.length - 1 ? 16 : 0, borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{d.ref}</span>
                  <Badge variant="gold">{d.poste}</Badge>
                </div>
                <CircuitSteps labels={CIRCUIT_LABELS.slice(0, d.totalEtapes)} currentStep={d.etape} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Étape {d.etape}/{d.totalEtapes} · En attente</div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
