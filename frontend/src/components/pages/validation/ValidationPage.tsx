import { Eye, Check, X } from 'lucide-react'
import { VALIDATIONS } from '@/lib/data'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export function ValidationPage() {
  return (
    <div className="page-fade">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Circuit de validation</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Approbations en attente de votre décision</div>
      </div>

      <Alert variant="amber">⏰ <strong>Délai max : 48h par étape.</strong> Au-delà, une relance automatique est envoyée à l'acteur concerné.</Alert>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Référence','Objet','Type','Demandeur','Budget','Priorité','En attente depuis','Actions'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VALIDATIONS.map(v => {
                  const isLate = parseInt(v.depuis) >= 18
                  return (
                    <tr key={v.ref}
                      style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{v.ref}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{v.objet}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={v.type.includes('PE') ? 'gold' : 'olive'}>{v.type}</Badge>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{v.demandeur}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{v.budget}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={v.priorite === 'Haute' ? 'red' : 'amber'}>{v.priorite}</Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: isLate ? 'var(--red)' : 'var(--text-muted)' }}>
                          {isLate ? '⚠ ' : ''}{v.depuis}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button variant="ghost" size="xs"><Eye size={12} />Voir</Button>
                          <Button variant="success" size="xs"><Check size={12} />Valider</Button>
                          <Button variant="danger" size="xs"><X size={12} />Refuser</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
