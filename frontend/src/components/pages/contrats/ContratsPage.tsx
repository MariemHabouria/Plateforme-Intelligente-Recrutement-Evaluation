import { Plus, Eye, Download, Edit } from 'lucide-react'
import { CONTRATS } from '@/lib/data'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

export function ContratsPage() {
  const sb = (s: string) => {
    if (s === 'À générer') return 'amber'
    if (s === 'Envoyé') return 'gold'
    if (s === 'Signé') return 'green'
    if (s === 'Refusé') return 'red'
    return 'gray'
  }

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Contractualisation</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Génération et suivi des contrats et avenants</div>
        </div>
        <Button size="sm"><Plus size={13} />Générer contrat</Button>
      </div>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Candidat','Poste','Type','Salaire brut','Date début','Statut','Actions'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CONTRATS.map(c => (
                  <tr key={c.id}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={c.candidat} size="sm" />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{c.candidat}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.poste}</td>
                    <td style={{ padding: '12px 16px' }}><Badge variant="gold">{c.type}</Badge></td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{c.salaire}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.dateDebut}</td>
                    <td style={{ padding: '12px 16px' }}><Badge variant={sb(c.statut) as any}>{c.statut}</Badge></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {c.statut === 'À générer'
                          ? <Button size="xs"><Edit size={11} />Générer</Button>
                          : <><Button variant="ghost" size="xs"><Eye size={12} /></Button><Button variant="secondary" size="xs"><Download size={11} /></Button></>
                        }
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
