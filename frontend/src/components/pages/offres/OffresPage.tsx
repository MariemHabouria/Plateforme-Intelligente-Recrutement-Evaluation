import { Plus, Filter, Eye } from 'lucide-react'
import { OFFRES } from '@/lib/data'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export function OffresPage() {
  const sb = (s: string) => s === 'Publiée' ? 'green' : s === 'Brouillon' ? 'amber' : 'gray'

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Offres d'emploi</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Gestion et publication multi-canaux</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm"><Filter size={13} />Filtrer</Button>
          <Button size="sm"><Plus size={13} />Créer offre (IA)</Button>
        </div>
      </div>

      <Alert variant="gold">🤖 L'IA génère automatiquement la description du poste, le profil recherché et la fourchette salariale à partir des données de la demande.</Alert>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Référence','Poste','Statut','Candidatures','Canaux de publication','Date','Actions'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OFFRES.map(o => (
                  <tr key={o.ref}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{o.ref}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{o.poste}</td>
                    <td style={{ padding: '12px 16px' }}><Badge variant={sb(o.statut) as any}>{o.statut}</Badge></td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}><strong>{o.candidats}</strong> candidat{o.candidats !== 1 ? 's' : ''}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {o.canaux.length > 0 ? o.canaux.map(c => <Badge key={c} variant="gold">{c}</Badge>) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{o.date}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button variant="ghost" size="xs"><Eye size={12} /></Button>
                        {o.statut === 'Brouillon' && <Button variant="success" size="xs">Publier</Button>}
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
