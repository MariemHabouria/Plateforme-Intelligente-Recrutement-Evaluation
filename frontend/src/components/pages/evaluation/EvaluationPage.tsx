import { useAuth } from '../../../contexts/AuthContext';
import { Eye, Check, X } from 'lucide-react'
import { EVALUATIONS_PE } from '@/lib/data'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { FormGroup, FormLabel, FormRow, Input, Select, Textarea } from '@/components/ui/FormField'
import { PE_WORKFLOW } from '@/types'
import type { EvaluationPE } from '@/types'

// ── Workflow steps visualizer ──────────────────────────────
function WorkflowSteps({ etapeActuelle }: { etapeActuelle: string }) {
  const steps = PE_WORKFLOW
  const currentIdx = steps.findIndex(s => s.role === etapeActuelle)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', padding: '4px 0' }}>
      {steps.map((step, i) => {
        const done    = i < currentIdx
        const active  = i === currentIdx
        const waiting = i > currentIdx
        return (
          <div key={step.role} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 72 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                background: done ? 'var(--green)' : active ? 'var(--gold)' : 'var(--surface-alt)',
                border: `2px solid ${done ? 'var(--green)' : active ? 'var(--gold)' : 'var(--border)'}`,
                color: done || active ? '#fff' : 'var(--text-muted)',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 9, fontWeight: done ? 600 : active ? 700 : 400, color: done ? 'var(--green-text)' : active ? 'var(--gold-deep)' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>
                {step.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 24, height: 2, background: done ? 'var(--green)' : 'var(--border)', margin: '14px 2px 0', flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Table listing all PE evaluations ──────────────────────
function PETable({ evals, role }: { evals: EvaluationPE[], role: string }) {
  // Filter by what's relevant to each role
  const filtered = evals.filter(e => {
    if (role === 'superadmin') return true
    if (role === 'paie')      return e.etapeActuelle === 'paie' || e.etapeActuelle === 'cloturee'
    if (role === 'manager')   return e.etapeActuelle === 'manager' || e.etapeActuelle === 'paie'
    if (role === 'directeur') return ['directeur','rh','daf','dga','cloturee'].includes(e.etapeActuelle)
    if (role === 'rh')        return ['rh','daf','dga','cloturee'].includes(e.etapeActuelle)
    if (role === 'daf')       return ['daf','dga','cloturee'].includes(e.etapeActuelle)
    if (role === 'dga')       return ['dga','cloturee'].includes(e.etapeActuelle)
    return false
  })

  const sb = (s: string) => {
    if (s.includes('Manager') || s.includes('attente')) return 'amber'
    if (s.includes('DRH') || s.includes('DIR') || s.includes('valid') || s.includes('DAF') || s.includes('DGA')) return 'gold'
    if (s === 'Clôturée') return 'umber'
    return 'amber'
  }
  const decB = (d: string | null) => {
    if (!d) return 'umber'
    if (d === 'Confirmation') return 'green'
    if (d === 'Rupture') return 'red'
    return 'amber'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Employé','Contrat','Début','Fin PE','J. restants','Étape actuelle','Statut','Décision','Actions'].map(h => (
              <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map(e => (
            <tr key={e.id}
              style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
              onMouseEnter={el => (el.currentTarget as HTMLElement).style.background = 'var(--gold-wash)'}
              onMouseLeave={el => (el.currentTarget as HTMLElement).style.background = ''}
            >
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={e.employe} size="sm" color="var(--umber)" />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{e.employe}</span>
                </div>
              </td>
              <td style={{ padding: '12px 16px' }}><Badge variant="gold">{e.contrat}</Badge></td>
              <td style={{ padding: '12px 16px', fontSize: 13 }}>{e.dateDebut}</td>
              <td style={{ padding: '12px 16px', fontSize: 13 }}>{e.dateFin}</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: e.joursRestants < 30 ? 'var(--red)' : e.joursRestants < 60 ? 'var(--amber)' : 'var(--text-primary)' }}>{e.joursRestants}j</span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 11 }}>
                  {PE_WORKFLOW.find(s => s.role === e.etapeActuelle)?.label ?? 'Clôturée'}
                </div>
              </td>
              <td style={{ padding: '12px 16px' }}><Badge variant={sb(e.statut) as any}>{e.statut}</Badge></td>
              <td style={{ padding: '12px 16px' }}>
                {e.decision
                  ? <Badge variant={decB(e.decision) as any}>{e.decision}</Badge>
                  : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <Button variant="ghost" size="xs"><Eye size={12} />Ouvrir</Button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={9} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucune évaluation PE à traiter pour votre rôle.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  VUES SPÉCIFIQUES PAR ACTEUR
// ══════════════════════════════════════════════════════════

function ViewPaie({ ev }: { ev: EvaluationPE }) {
  return (
    <Card>
      <CardHeader>
        <div><CardTitle>Fiche PE — {ev.employe}</CardTitle><CardSubtitle>Étape 1 sur 6 · Saisie des données contractuelles</CardSubtitle></div>
        <Badge variant="amber">En attente Paie</Badge>
      </CardHeader>
      <CardBody>
        <Alert variant="gold">
          📋 <strong>Rôle Resp. Paie :</strong> Saisissez et vérifiez les données contractuelles ci-dessous. Elles seront <strong>en lecture seule</strong> pour tous les autres acteurs après soumission.
        </Alert>
        <WorkflowSteps etapeActuelle="paie" />
        <div style={{ height: 1, background: 'var(--border-light)', margin: '16px 0' }} />
        <FormRow>
          <FormGroup><FormLabel required>Type de contrat</FormLabel>
            <Select defaultValue="CDD"><option>CDI</option><option>CDD</option><option>Stage</option></Select>
          </FormGroup>
          <FormGroup><FormLabel required>Date de début</FormLabel><Input type="date" defaultValue="2025-11-01" /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup><FormLabel required>Date de fin période d'essai</FormLabel><Input type="date" defaultValue="2026-05-01" /></FormGroup>
          <FormGroup><FormLabel required>Salaire brut mensuel (DT)</FormLabel><Input type="number" defaultValue="1950" /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup><FormLabel>Poste occupé</FormLabel><Input defaultValue="Technicien Qualité" /></FormGroup>
          <FormGroup><FormLabel>Service / Direction</FormLabel><Input defaultValue="Direction Industrielle" /></FormGroup>
        </FormRow>
        <FormGroup><FormLabel>Observations contractuelles</FormLabel><Textarea placeholder="Clauses particulières, avantages, primes…" /></FormGroup>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary">Enregistrer brouillon</Button>
          <Button>Soumettre au Manager (N+1) →</Button>
        </div>
      </CardBody>
    </Card>
  )
}

function ViewManager({ ev }: { ev: EvaluationPE }) {
  return (
    <Card>
      <CardHeader>
        <div><CardTitle>Fiche PE — {ev.employe}</CardTitle><CardSubtitle>Étape 2 sur 6 · Évaluation comportementale</CardSubtitle></div>
        <Badge variant="amber">En attente Manager</Badge>
      </CardHeader>
      <CardBody>
        <Alert variant="amber">
          ⏳ <strong>Délai de 48h</strong> pour soumettre cette évaluation. Données contractuelles en lecture seule.
        </Alert>
        <WorkflowSteps etapeActuelle="manager" />
        <div style={{ height: 1, background: 'var(--border-light)', margin: '16px 0' }} />
        {/* Read-only contractual data */}
        <div style={{ background: 'var(--gold-wash)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', marginBottom: 10 }}>Données contractuelles (lecture seule)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['Contrat','CDD'],['Début','21/07/2025'],['Fin PE','21/02/2026'],['Salaire','2 400 DT']].map(([l,v]) => (
              <div key={l}><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div></div>
            ))}
          </div>
        </div>
        <FormGroup>
          <FormLabel required>Décision du Manager (N+1)</FormLabel>
          <Select><option value="">-- Choisir --</option><option>Confirmation</option><option>Prolongation</option><option>Rupture</option><option>Changement de situation</option></Select>
        </FormGroup>
        <FormGroup>
          <FormLabel required>Évaluation globale</FormLabel>
          <Select><option value="">-- Niveau de performance --</option><option>Excellent</option><option>Satisfaisant</option><option>Insuffisant</option></Select>
        </FormGroup>
        <FormGroup>
          <FormLabel required>Commentaire (obligatoire dans tous les cas)</FormLabel>
          <Textarea placeholder="Décrivez les performances, comportements, points forts et axes d'amélioration observés pendant la période d'essai…" />
        </FormGroup>
        <Alert variant="umber">
          🔒 Votre évaluation sera <strong>visible uniquement par le Directeur N+2</strong>. Elle sera masquée pour DRH, DAF et DGA afin de garantir l'indépendance des validations suivantes.
        </Alert>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary">Enregistrer brouillon</Button>
          <Button>Soumettre au Directeur (N+2) →</Button>
        </div>
      </CardBody>
    </Card>
  )
}

function ViewDirecteur({ ev }: { ev: EvaluationPE }) {
  return (
    <Card>
      <CardHeader>
        <div><CardTitle>Fiche PE — {ev.employe}</CardTitle><CardSubtitle>Étape 3 sur 6 · Validation Directeur N+2</CardSubtitle></div>
        <Badge variant="gold">En validation Directeur</Badge>
      </CardHeader>
      <CardBody>
        <Alert variant="umber">
          👁 <strong>Vue Directeur N+2 :</strong> Vous seul avez accès à l'évaluation du Manager. Après votre validation, elle sera <strong>définitivement masquée</strong> pour les étapes suivantes (DRH, DAF, DGA).
        </Alert>
        <WorkflowSteps etapeActuelle="directeur" />
        <div style={{ height: 1, background: 'var(--border-light)', margin: '16px 0' }} />
        {/* Eval N+1 visible only here */}
        <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--amber-text)', marginBottom: 8 }}>⭐ Évaluation Manager N+1 (masquée après cette étape)</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Décision N+1</div><Badge variant="green">{ev.decisionManager ?? 'Confirmation'}</Badge></div>
            <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Performance</div><Badge variant="olive">Satisfaisant</Badge></div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
            "L'employé a démontré une bonne maîtrise technique et un fort engagement. Quelques difficultés de communication en équipe à améliorer. Recommande la confirmation."
          </div>
        </div>
        <FormGroup>
          <FormLabel required>Votre décision (N+2)</FormLabel>
          <Select><option value="">-- Choisir --</option><option>Confirme la décision N+1</option><option>Modifie la décision</option><option>Demande complément d'info</option></Select>
        </FormGroup>
        <FormGroup>
          <FormLabel>Commentaire Directeur</FormLabel>
          <Textarea placeholder="Votre commentaire — confidentiel, ne sera pas transmis aux étapes suivantes…" />
        </FormGroup>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="danger"><X size={13} />Refuser</Button>
          <Button variant="secondary">Demander complément</Button>
          <Button><Check size={13} />Valider → DRH</Button>
        </div>
      </CardBody>
    </Card>
  )
}

function ViewRH({ ev }: { ev: EvaluationPE }) {
  return (
    <Card>
      <CardHeader>
        <div><CardTitle>Fiche PE — {ev.employe}</CardTitle><CardSubtitle>Étape 4 sur 6 · Validation DRH</CardSubtitle></div>
        <Badge variant="gold">En validation DRH</Badge>
      </CardHeader>
      <CardBody>
        <Alert variant="umber">
          🔒 <strong>Masquage N+1 actif :</strong> L'évaluation du Manager est masquée pour garantir l'indépendance de votre validation. Vous ne voyez que les données contractuelles et la décision globale.
        </Alert>
        <WorkflowSteps etapeActuelle="rh" />
        <div style={{ height: 1, background: 'var(--border-light)', margin: '16px 0' }} />
        <div style={{ background: 'var(--gold-wash)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', marginBottom: 10 }}>Données consolidées (éval. N+1 masquée)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['Contrat',ev.contrat],['Début',ev.dateDebut],['Fin PE',ev.dateFin],['Salaire',ev.salaire ?? '—']].map(([l,v]) => (
              <div key={l}><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div></div>
            ))}
          </div>
        </div>
        <FormGroup>
          <FormLabel required>Décision RH</FormLabel>
          <Select><option value="">-- Choisir --</option><option>Valide</option><option>Réserves</option><option>Refus</option></Select>
        </FormGroup>
        <FormGroup><FormLabel>Commentaire DRH</FormLabel><Textarea placeholder="Observations RH indépendantes…" /></FormGroup>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="danger"><X size={13} />Refuser</Button>
          <Button><Check size={13} />Valider → DAF</Button>
        </div>
      </CardBody>
    </Card>
  )
}

function ViewDAF({ ev }: { ev: EvaluationPE }) {
  return (
    <Card>
      <CardHeader>
        <div><CardTitle>Fiche PE — {ev.employe}</CardTitle><CardSubtitle>Étape 5 sur 6 · Validation DAF</CardSubtitle></div>
        <Badge variant="gold">En validation DAF</Badge>
      </CardHeader>
      <CardBody>
        <Alert variant="umber">🔒 L'évaluation Manager est masquée. Vous validez l'aspect financier : type de contrat, salaire et impact budgétaire.</Alert>
        <WorkflowSteps etapeActuelle="daf" />
        <div style={{ height: 1, background: 'var(--border-light)', margin: '16px 0' }} />
        <div style={{ background: 'var(--gold-wash)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[['Type contrat',ev.contrat],['Salaire brut',ev.salaire ?? '—'],['Impact annuel','~'+(parseInt((ev.salaire ?? '0').replace(/\D/g,''))*12).toLocaleString()+' DT']].map(([l,v]) => (
              <div key={l} style={{ padding: 12, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <FormGroup><FormLabel required>Avis financier</FormLabel>
          <Select><option value="">-- Choisir --</option><option>Favorable</option><option>Favorable avec réserve</option><option>Défavorable</option></Select>
        </FormGroup>
        <FormGroup><FormLabel>Commentaire DAF</FormLabel><Textarea placeholder="Impact budgétaire, conformité masse salariale…" /></FormGroup>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="danger"><X size={13} />Refuser</Button>
          <Button><Check size={13} />Valider → DGA</Button>
        </div>
      </CardBody>
    </Card>
  )
}

function ViewDGA({ ev }: { ev: EvaluationPE }) {
  return (
    <Card>
      <CardHeader>
        <div><CardTitle>Fiche PE — {ev.employe}</CardTitle><CardSubtitle>Étape 6 sur 6 · Décision finale DGA</CardSubtitle></div>
        <Badge variant="amber">Décision finale</Badge>
      </CardHeader>
      <CardBody>
        <Alert variant="umber">🔒 Évaluation Manager masquée. Vous prenez la décision finale sur la base des validations DRH et DAF.</Alert>
        <WorkflowSteps etapeActuelle="dga" />
        <div style={{ height: 1, background: 'var(--border-light)', margin: '16px 0' }} />
        {/* Avis des étapes précédentes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[['Avis DRH','Valide','green'],['Avis DAF','Favorable','green']].map(([l,v,c]) => (
            <div key={l} style={{ padding: 14, background: 'var(--gold-wash)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{l}</div>
              <Badge variant={c as any}>{v}</Badge>
            </div>
          ))}
        </div>
        <FormGroup><FormLabel required>Décision finale DGA</FormLabel>
          <Select><option value="">-- Choisir --</option><option>Confirmation définitive</option><option>Prolongation</option><option>Rupture</option></Select>
        </FormGroup>
        <FormGroup><FormLabel required>Commentaire final (obligatoire)</FormLabel><Textarea placeholder="Décision argumentée…" /></FormGroup>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="danger"><X size={13} />Rupture</Button>
          <Button><Check size={13} />Confirmer définitivement ✓</Button>
        </div>
      </CardBody>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════
export const EvaluationPage = () => {
  const { user } = useAuth();
  const role = user?.role as string;

  // Pick the evaluation that matches the current role's step
  const myEval = EVALUATIONS_PE.find(e => e.etapeActuelle === role)
  const alertPerRole: Record<string, { v: any; msg: string }> = {
    superadmin: { v: 'gold',   msg: 'Vue Super Admin : toutes les évaluations en cours. Aucun masquage appliqué.' },
    paie:       { v: 'gold',   msg: 'Étape 1 : Saisissez les données contractuelles avant de soumettre au Manager.' },
    manager:    { v: 'amber',  msg: 'Étape 2 : Votre évaluation sera visible uniquement par le Directeur N+2. Délai 48h.' },
    directeur:  { v: 'umber',  msg: 'Étape 3 : Vous seul voyez l\'évaluation N+1. Elle sera masquée après validation.' },
    rh:         { v: 'umber',  msg: 'Étape 4 : Évaluation Manager masquée. Validez de manière indépendante.' },
    daf:        { v: 'umber',  msg: 'Étape 5 : Validation financière. Évaluation Manager masquée.' },
    dga:        { v: 'umber',  msg: 'Étape 6 (finale) : Évaluation Manager masquée. Décision définitive.' },
  }
  const info = alertPerRole[role]

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Évaluation Période d'Essai</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Processus 2 — Workflow en 6 étapes · Déclenchement automatique J-30
        </div>
      </div>

      {info && <Alert variant={info.v}>{info.msg}</Alert>}

      {/* Overview table */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <div><CardTitle>Évaluations en cours</CardTitle><CardSubtitle>Filtrées selon votre rôle et étape</CardSubtitle></div>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <PETable evals={EVALUATIONS_PE} role={role} />
        </CardBody>
      </Card>

      {/* Role-specific active fiche */}
      {role === 'paie'      && myEval && <ViewPaie      ev={myEval} />}
      {role === 'manager'   && myEval && <ViewManager   ev={myEval} />}
      {role === 'directeur' && myEval && <ViewDirecteur ev={myEval} />}
      {role === 'rh'        && myEval && <ViewRH        ev={myEval} />}
      {role === 'daf'       && myEval && <ViewDAF       ev={myEval} />}
      {role === 'dga'       && myEval && <ViewDGA       ev={myEval} />}
    </div>
  )
}