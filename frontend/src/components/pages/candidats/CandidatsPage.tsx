import { Filter, Eye, Check, X } from 'lucide-react'
import { CANDIDATURES } from '@/lib/data'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { ScoreBar } from '@/components/ui/ScoreBar'

export function CandidatsPage() {
  const getStatutVariant = (s: string) => {
    if (s === 'Pré-sél. IA') return 'umber'
    if (s === 'En revue RH') return 'olive'
    return 'gray'
  }

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Candidatures & IA</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Présélection intelligente — nouvelles candidatures + base de CV</div>
        </div>
        <Button variant="secondary" size="sm"><Filter size={13} />Filtrer par offre</Button>
      </div>

      <Alert variant="gold">
        🤖 <strong>Matching IA actif :</strong> Chaque nouvelle offre publiée déclenche automatiquement un matching sur toute la base de candidatures. Score SHAP explicable disponible pour chaque profil.
      </Alert>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Candidat','Offre','Source','Score global','Score exp.','Mots-clés matchés','Statut','Actions'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CANDIDATURES.map(c => (
                  <tr key={c.id}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={c.nom} size="sm" />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nom}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{c.offre}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={c.type === 'Base' ? 'gold' : 'olive'}>
                        {c.type === 'Base' ? '📦 Base' : '🆕 Nouvelle'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: 110 }}>
                      <ScoreBar label="" value={c.scoreGlobal} />
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', marginTop: -2 }}>{c.scoreGlobal}%</div>
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: 100 }}>
                      <ScoreBar label="" value={c.scoreExp} />
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', marginTop: -2 }}>{c.scoreExp}%</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {c.motsCles.map(k => (
                          <span key={k} style={{ background: 'var(--olive-bg)', color: 'var(--olive)', padding: '2px 7px', borderRadius: 12, fontSize: 10, fontWeight: 500 }}>{k}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}><Badge variant={getStatutVariant(c.statut) as any}>{c.statut}</Badge></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button variant="ghost" size="xs"><Eye size={12} /></Button>
                        <Button variant="success" size="xs"><Check size={12} /></Button>
                        <Button variant="danger" size="xs"><X size={12} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
