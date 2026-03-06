import { Plus, Edit, Trash2, Shield, Eye } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { ROLES } from '@/lib/data'
import type { Role } from '@/types'

const USERS = [
  { name: 'Mohamed Kilani',  role: 'manager',   email: 'm.kilani@kilani.com',    status: 'Actif',  last: 'Il y a 2h' },
  { name: 'Ahmed Kilani',    role: 'directeur', email: 'a.kilani@kilani.com',    status: 'Actif',  last: 'Il y a 4h' },
  { name: 'Sonia Karoui',    role: 'rh',        email: 's.karoui@kilani.com',    status: 'Actif',  last: 'Il y a 30min' },
  { name: 'Rami Ben Ali',    role: 'daf',       email: 'r.benali@kilani.com',    status: 'Actif',  last: 'Hier' },
  { name: 'Nabil Kilani',    role: 'dga',       email: 'n.kilani@kilani.com',    status: 'Actif',  last: 'Il y a 3j' },
  { name: 'Leila Marzouk',   role: 'paie',      email: 'l.marzouk@kilani.com',   status: 'Actif',  last: 'Il y a 1h' },
  { name: 'Farid Hammami',   role: 'manager',   email: 'f.hammami@kilani.com',   status: 'Inactif',last: 'Il y a 7j' },
  { name: 'Karim Ben Salah', role: 'manager',   email: 'k.bensalah@kilani.com',  status: 'Actif',  last: 'Il y a 5h' },
]

const AUDIT_LOG = [
  { time: '14:32', user: 'S. Karoui',  action: 'Candidature acceptée',          detail: 'Aymen Bouslama — Chef projet IT' },
  { time: '13:18', user: 'M. Kilani',  action: 'Demande soumise au circuit',    detail: 'DEM-2026-018 — Ingénieur Qualité' },
  { time: '12:05', user: 'L. Marzouk', action: 'Données PE saisies',            detail: 'Amira Ben Salah — CDD' },
  { time: '11:40', user: 'A. Kilani',  action: 'Évaluation PE validée',         detail: 'Hana Missaoui — Confirmation' },
  { time: '10:22', user: 'R. Ben Ali', action: 'Demande refusée (budget)',       detail: 'DEM-2026-014 — Budget dépassé' },
]

export function SuperAdminPage({ page }: { page: string }) {
  if (page === 'audit') return <AuditPage />
  if (page === 'utilisateurs') return <UtilisateursPage />
  if (page === 'workflows') return <WorkflowsPage />
  if (page === 'ia_config') return <IAConfigPage />
  return <UtilisateursPage />
}

function UtilisateursPage() {
  return (
    <div className="page-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Utilisateurs & Rôles</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Gestion des accès et affectation des rôles</div>
        </div>
        <Button size="sm"><Plus size={13} />Ajouter utilisateur</Button>
      </div>
      <Alert variant="gold">🔑 Super Admin uniquement : attribuez, modifiez ou révoquez les rôles de chaque utilisateur. Les changements prennent effet immédiatement.</Alert>
      <Card>
        <CardBody style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Utilisateur','Rôle','Email','Statut','Dernière activité','Actions'].map(h => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {USERS.map((u, i) => {
                const r = ROLES[u.role as Role]
                return (
                  <tr key={i}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--gold-wash)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={u.name} size="sm" color={r.color} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12 }}>{r.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={u.status === 'Actif' ? 'green' : 'umber'}>{u.status}</Badge>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{u.last}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button variant="ghost" size="xs"><Edit size={11} />Rôle</Button>
                        <Button variant="danger" size="xs"><Trash2 size={11} /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  )
}

function AuditPage() {
  return (
    <div className="page-fade">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Journal d'audit</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Toutes les actions tracées en temps réel</div>
      </div>
      <Card>
        <CardHeader><CardTitle>Activité du jour</CardTitle><CardSubtitle>01/03/2026</CardSubtitle></CardHeader>
        <CardBody>
          {AUDIT_LOG.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: i < AUDIT_LOG.length - 1 ? 16 : 0, marginBottom: i < AUDIT_LOG.length - 1 ? 16 : 0, borderBottom: i < AUDIT_LOG.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 40, paddingTop: 2 }}>{l.time}</div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{l.action}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{l.user} · {l.detail}</div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}

function WorkflowsPage() {
  const wf = [
    { name: 'Recrutement standard (4 étapes)',  etapes: ['Manager','Directeur','RH','DAF'],            actif: true },
    { name: 'Recrutement DGA (5 étapes)',        etapes: ['Manager','Directeur','RH','DAF','DGA'],      actif: true },
    { name: 'Évaluation PE (6 étapes)',          etapes: ['Paie','Manager','Directeur','DRH','DAF','DGA'], actif: true },
    { name: 'Stage / Alternance (2 étapes)',     etapes: ['RH','Manager'],                              actif: false },
  ]
  return (
    <div className="page-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div><div style={{ fontSize: 18, fontWeight: 600 }}>Workflows PE & Recrutement</div><div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Configuration des circuits de validation</div></div>
        <Button size="sm"><Plus size={13} />Nouveau workflow</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {wf.map((w, i) => (
          <Card key={i}>
            <CardBody style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Badge variant={w.actif ? 'green' : 'umber'}>{w.actif ? 'Actif' : 'Inactif'}</Badge>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {w.etapes.map((e, j) => (
                      <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{e}</span>
                        {j < w.etapes.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="secondary" size="sm"><Edit size={12} />Modifier</Button>
                <Button variant="ghost" size="sm"><Eye size={12} /></Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

function IAConfigPage() {
  return (
    <div className="page-fade">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Configuration IA</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Paramètres du moteur de matching et scoring</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { title: 'Seuil présélection IA', value: '70%', desc: 'Score minimum pour pré-sélection automatique', color: 'var(--gold)' },
          { title: 'Poids expérience', value: '40%', desc: 'Pondération du score d\'expérience dans le score global', color: 'var(--green)' },
          { title: 'Poids compétences', value: '35%', desc: 'Pondération des mots-clés techniques', color: 'var(--olive)' },
          { title: 'Poids formation', value: '25%', desc: 'Pondération du niveau et domaine de formation', color: 'var(--umber)' },
        ].map((c, i) => (
          <Card key={i}>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.title}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
              <div style={{ height: 6, background: 'var(--surface-alt)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: c.value, height: '100%', background: c.color, borderRadius: 10, transition: 'width .5s' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.desc}</div>
              <Button variant="secondary" size="xs" style={{ marginTop: 10 }}><Edit size={11} />Modifier</Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
