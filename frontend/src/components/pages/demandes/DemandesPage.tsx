import { useState } from 'react'
import { Plus, Filter, Eye } from 'lucide-react'
import { DEMANDES } from '@/lib/data'
import { getStatusBadge, getPrioriteBadge } from '@/lib/utils'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FormGroup, FormLabel, FormRow, Input, Select, Textarea } from '@/components/ui/FormField'
import type { Role } from '@/types'

export function DemandesPage({ role }: { role: Role }) {
  const [showModal, setShowModal] = useState(false)
  const canCreate = ['manager', 'rh'].includes(role)

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Demandes de recrutement</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Suivi du circuit de validation</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm"><Filter size={13} />Filtrer</Button>
          {canCreate && <Button size="sm" onClick={() => setShowModal(true)}><Plus size={13} />Nouvelle demande</Button>}
        </div>
      </div>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Référence','Poste','Motif','Contrat','Budget','Priorité','Statut','Date',''].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMANDES.map(d => (
                  <tr key={d.ref}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{d.ref}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{d.poste}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{d.motif}</td>
                    <td style={{ padding: '12px 16px' }}><Badge variant="gold">{d.contrat}</Badge></td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{d.budget}</td>
                    <td style={{ padding: '12px 16px' }}><Badge variant={getPrioriteBadge(d.priorite) as any}>{d.priorite}</Badge></td>
                    <td style={{ padding: '12px 16px' }}><Badge variant={getStatusBadge(d.statut) as any}>{d.statut}</Badge></td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{d.date}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Button variant="ghost" size="xs"><Eye size={12} />Voir</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvelle demande de recrutement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Enregistrer brouillon</Button>
            <Button onClick={() => setShowModal(false)}>Soumettre au circuit</Button>
          </>
        }
      >
        <FormRow>
          <FormGroup><FormLabel required>Intitulé du poste</FormLabel><Input placeholder="Ex : Ingénieur Qualité" /></FormGroup>
          <FormGroup><FormLabel required>Motif</FormLabel><Select><option>Création</option><option>Remplacement</option><option>Renforcement</option></Select></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup><FormLabel required>Type contrat</FormLabel><Select><option>CDI</option><option>CDD</option><option>Stage</option><option>Alternance</option></Select></FormGroup>
          <FormGroup><FormLabel required>Priorité</FormLabel><Select><option>Haute</option><option>Moyenne</option><option>Basse</option></Select></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup><FormLabel required>Budget estimé (DT)</FormLabel><Input type="number" placeholder="35000" /></FormGroup>
          <FormGroup><FormLabel required>Date prise de poste souhaitée</FormLabel><Input type="date" /></FormGroup>
        </FormRow>
        <FormGroup><FormLabel>Justification du besoin</FormLabel><Textarea placeholder="Décrivez le contexte et la nécessité du recrutement…" /></FormGroup>
        <FormGroup><FormLabel>Disponibilités entretien technique</FormLabel><Input placeholder="Ex : Lun 10h–12h, Mer 14h–17h…" /></FormGroup>
      </Modal>
    </div>
  )
}
