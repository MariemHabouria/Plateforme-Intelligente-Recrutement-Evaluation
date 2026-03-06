import { Plus, Eye, Check, X } from 'lucide-react'
import { ENTRETIENS } from '@/lib/data'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import type { Role } from '@/types'

export function EntretiensPage({ role }: { role: Role }) {
  const sb = (s: string) => s === 'Confirmé' ? 'green' : s === 'En attente confirmation' ? 'amber' : 'red'

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Entretiens</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>RH et techniques planifiés</div>
        </div>
        {role === 'rh' && <Button size="sm"><Plus size={13} />Planifier entretien</Button>}
      </div>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Candidat','Poste','Type','Date','Heure','Lieu','Statut','Actions'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ENTRETIENS.map(e => (
                  <tr key={e.id}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
                    onMouseEnter={el => (el.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                    onMouseLeave={el => (el.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={e.candidat} size="sm" />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{e.candidat}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{e.poste}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={e.type === 'RH' ? 'olive' : 'umber'}>{e.type}</Badge>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{e.date}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{e.heure}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{e.lieu}</td>
                    <td style={{ padding: '12px 16px' }}><Badge variant={sb(e.statut) as any}>{e.statut}</Badge></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {e.statut === 'En attente confirmation' && role === 'manager'
                          ? <><Button variant="success" size="xs"><Check size={12} />Confirmer</Button><Button variant="danger" size="xs"><X size={12} /></Button></>
                          : <Button variant="ghost" size="xs"><Eye size={12} /></Button>}
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
