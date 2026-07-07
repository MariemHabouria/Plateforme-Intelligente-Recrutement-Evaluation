// frontend/src/components/pages/evaluation/EvaluationPage.tsx
//
// Circuit complet (5 étapes) :
//   Resp. Paie (saisie, 0) -> Manager N+1 (1) -> Directeur N+2 (2)
//   -> Resp. Paie (proposition contractuelle, 3) -> DRH (validation, 4)
//
// Chemin B : confidentialité N1/N2 simplifiée — seule règle qui subsiste
// est evaluationN1Masquee (cf. cahier des charges "supprimée par le N+2").
// Le DRH n'intervient QUE sur la partie contractuelle (étape 4), jamais
// pour donner un avis sur l'employé — voir preparerPropositionModification
// côté backend qui ne transmet que decision/description factuelle.

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { FormGroup, FormLabel, FormRow, Input, Select, Textarea } from '../../ui/FormField';
import api from '../../../services/api';
import { EvaluationPEDetail, EvaluationN1FormData, normalizeRole } from '../../../types';

const WORKFLOW_STEPS = [
  { order: 0, role: 'RESP_PAIE', label: 'Resp. Paie' },
  { order: 1, role: 'MANAGER', label: 'Manager N+1' },
  { order: 2, role: 'DIRECTEUR', label: 'Directeur N+2' },
  { order: 3, role: 'RESP_PAIE', label: 'Proposition' },
  { order: 4, role: 'DRH', label: 'Validation DRH' },
];

function WorkflowSteps({ etapeActuelle }: { etapeActuelle: number }) {
  const currentIdx = etapeActuelle;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', padding: '4px 0' }}>
      {WORKFLOW_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={`${step.role}-${i}`} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 72 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                background: done ? '#4caf50' : active ? '#ffc107' : '#e0e0e0',
                border: `2px solid ${done ? '#4caf50' : active ? '#ffc107' : '#ccc'}`,
                color: done || active ? '#fff' : '#999',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 9, fontWeight: done ? 600 : active ? 700 : 400, textAlign: 'center' }}>
                {step.label}
              </div>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div style={{ width: 24, height: 2, background: done ? '#4caf50' : '#e0e0e0', margin: '14px 2px 0' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChampConfidentiel({ valeur, roleRequis }: { valeur: string | null | undefined; roleRequis: string }) {
  if (valeur === null || valeur === undefined || valeur === '') {
    return <span style={{ fontStyle: 'italic', color: '#999' }}>Non visible ({roleRequis} requis, ou masquée par le Directeur)</span>;
  }
  return <>{valeur}</>;
}

// ====================== VIEW PAIE — ÉTAPE 0 ======================
function ViewPaie({ evaluation, onRefresh, isReadOnly = false }: {
  evaluation: EvaluationPEDetail; onRefresh: () => void; isReadOnly?: boolean
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    typeContrat: evaluation.contrat.typeContrat,
    dateDebut: evaluation.dateDebut.split('T')[0],
    dateFin: evaluation.dateFin.split('T')[0],
    salaire: evaluation.contrat.salaire,
    poste: evaluation.employe.poste || '',
    observations: ''
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post(`/evaluations/${evaluation.id}/soumettre-paie`, formData);
      onRefresh();
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isReadOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fiche PE — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
          <CardSubtitle>Consultation (données contractuelles)</CardSubtitle>
        </CardHeader>
        <CardBody>
          <Alert variant="green">Evaluation déjà soumise - Consultation uniquement</Alert>
          <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
          <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />
          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
              <div><strong>Type contrat:</strong> {evaluation.contrat.typeContrat}</div>
              <div><strong>Date debut:</strong> {new Date(evaluation.dateDebut).toLocaleDateString('fr-FR')}</div>
              <div><strong>Fin PE:</strong> {new Date(evaluation.dateFin).toLocaleDateString('fr-FR')}</div>
              <div><strong>Salaire:</strong> {evaluation.contrat.salaire} DT</div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiche PE — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
        <CardSubtitle>Étape 1 sur 5 · Saisie des données contractuelles</CardSubtitle>
      </CardHeader>
      <CardBody>
        <Alert variant="gold">Rôle Resp. Paie : saisissez et vérifiez les données contractuelles.</Alert>
        <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
        <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

        <FormRow>
          <FormGroup><FormLabel required>Type de contrat</FormLabel>
            <Select value={formData.typeContrat} onChange={(e) => setFormData({ ...formData, typeContrat: e.target.value })}>
              <option>CDI</option><option>CDD</option><option>Stage</option><option>Alternance</option>
            </Select>
          </FormGroup>
          <FormGroup><FormLabel required>Date de début</FormLabel>
            <Input type="date" value={formData.dateDebut} onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })} />
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup><FormLabel required>Date de fin période d'essai</FormLabel>
            <Input type="date" value={formData.dateFin} onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })} />
          </FormGroup>
          <FormGroup><FormLabel required>Salaire brut mensuel (DT)</FormLabel>
            <Input type="number" value={formData.salaire} onChange={(e) => setFormData({ ...formData, salaire: e.target.value })} />
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup><FormLabel>Poste occupé</FormLabel>
            <Input value={formData.poste} onChange={(e) => setFormData({ ...formData, poste: e.target.value })} />
          </FormGroup>
          <FormGroup><FormLabel>Direction</FormLabel>
            <Input value={evaluation.employe.direction?.nom || '-'} disabled />
          </FormGroup>
        </FormRow>

        <FormGroup><FormLabel>Observations contractuelles</FormLabel>
          <Textarea value={formData.observations} onChange={(e) => setFormData({ ...formData, observations: e.target.value })} />
        </FormGroup>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onClick={handleSubmit} disabled={loading} variant="primary">
            {loading ? 'Enregistrement...' : 'Soumettre au Manager'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ====================== VIEW MANAGER — ÉTAPE 1 ======================
function ViewManager({ evaluation, onRefresh, isReadOnly = false }: {
  evaluation: EvaluationPEDetail; onRefresh: () => void; isReadOnly?: boolean
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EvaluationN1FormData>({
    evaluationN1: evaluation.evaluationN1 || '',
    commentaireN1: evaluation.commentaireN1 || '',
    decision: evaluation.decision || 'CONFIRMATION'
  });

  const handleSubmit = async () => {
    if (!formData.evaluationN1 || !formData.commentaireN1) {
      alert('Veuillez remplir l\'évaluation et le commentaire');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/evaluations/${evaluation.id}/soumettre-n1`, formData);
      onRefresh();
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isReadOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation PE — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
          <CardSubtitle>Consultation - Evaluation déjà soumise</CardSubtitle>
        </CardHeader>
        <CardBody>
          <Alert variant="green">Evaluation soumise le {evaluation.dateSoumissionN1 ? new Date(evaluation.dateSoumissionN1).toLocaleDateString('fr-FR') : '-'}</Alert>
          <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
          <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Ma décision</div>
            <Badge variant="green">{evaluation.decision || 'CONFIRMATION'}</Badge>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Mon évaluation</div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>
              <ChampConfidentiel valeur={evaluation.evaluationN1} roleRequis="Manager" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Mon commentaire</div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>
              <ChampConfidentiel valeur={evaluation.commentaireN1} roleRequis="Manager" />
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Période d'Essai — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
        <CardSubtitle>Étape 2 sur 5 · Evaluation Manager N+1</CardSubtitle>
      </CardHeader>
      <CardBody>
        <Alert variant="amber">Délai de 48h pour soumettre cette évaluation.</Alert>
        <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
        <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Informations employé</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><strong>Direction:</strong> {evaluation.employe.direction?.nom || '-'}</div>
            <div><strong>Poste:</strong> {evaluation.employe.poste || '-'}</div>
            <div><strong>Fin PE:</strong> {new Date(evaluation.dateFin).toLocaleDateString('fr-FR')}</div>
            <div><strong>Salaire:</strong> {evaluation.contrat.salaire} DT</div>
          </div>
        </div>

        <FormGroup>
          <FormLabel required>Décision du Manager (N+1)</FormLabel>
          <Select value={formData.decision} onChange={(e) => setFormData({ ...formData, decision: e.target.value as any })}>
            <option value="CONFIRMATION">Confirmation</option>
            <option value="PROLONGATION">Prolongation</option>
            <option value="RUPTURE">Rupture</option>
            <option value="CHANGEMENT">Changement de situation</option>
          </Select>
        </FormGroup>

        {formData.decision === 'PROLONGATION' && (
          <FormGroup>
            <FormLabel required>Durée de prolongation (mois)</FormLabel>
            <Input type="number" value={(formData as any).dureeProlongation || ''}
              onChange={(e) => setFormData({ ...formData, dureeProlongation: parseInt(e.target.value) } as any)} />
          </FormGroup>
        )}

        {formData.decision === 'RUPTURE' && (
          <FormGroup>
            <FormLabel required>Justification de la rupture</FormLabel>
            <Textarea value={(formData as any).justificationRupture || ''}
              onChange={(e) => setFormData({ ...formData, justificationRupture: e.target.value } as any)} rows={3} />
          </FormGroup>
        )}

        <FormGroup>
          <FormLabel required>Evaluation globale</FormLabel>
          <Textarea value={formData.evaluationN1} onChange={(e) => setFormData({ ...formData, evaluationN1: e.target.value })}
            placeholder="Décrivez les performances, comportements, points forts et axes d'amélioration..." rows={4} />
        </FormGroup>

        <FormGroup>
          <FormLabel required>Commentaire</FormLabel>
          <Textarea value={formData.commentaireN1} onChange={(e) => setFormData({ ...formData, commentaireN1: e.target.value })}
            placeholder="Commentaire obligatoire..." rows={3} />
        </FormGroup>

        <Alert variant="umber">Votre évaluation sera transmise au Directeur N+2.</Alert>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onClick={handleSubmit} disabled={loading} variant="primary">
            {loading ? 'Envoi...' : 'Soumettre au Directeur'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ====================== VIEW DIRECTEUR — ÉTAPE 2 ======================
function ViewDirecteur({ evaluation, onRefresh, isReadOnly = false }: {
  evaluation: EvaluationPEDetail; onRefresh: () => void; isReadOnly?: boolean
}) {
  const [loading, setLoading] = useState(false);
  const [masquageLoading, setMasquageLoading] = useState(false);
  const [formData, setFormData] = useState({ decision: 'VALIDEE', commentaire: '', evaluationN2: '' });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post(`/evaluations/${evaluation.id}/valider-n2`, formData);
      onRefresh();
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMasquage = async () => {
    setMasquageLoading(true);
    try {
      await api.post(`/evaluations/${evaluation.id}/masquer-n1`, { masquer: !evaluation.evaluationN1Masquee });
      onRefresh();
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setMasquageLoading(false);
    }
  };

  if (isReadOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation PE — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
          <CardSubtitle>Consultation - Avis clos</CardSubtitle>
        </CardHeader>
        <CardBody>
          <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
          <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Evaluation Manager N+1</div>
            <Badge variant="green">{evaluation.decision || 'CONFIRMATION'}</Badge>
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <ChampConfidentiel valeur={evaluation.evaluationN1} roleRequis="Directeur" />
            </div>
          </div>

          {evaluation.commentaireN2 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Commentaire Directeur</div>
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>{evaluation.commentaireN2}</div>
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={toggleMasquage} disabled={masquageLoading}>
            {evaluation.evaluationN1Masquee ? 'Rétablir l\'évaluation N1' : 'Masquer l\'évaluation N1'}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Période d'Essai — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
        <CardSubtitle>Étape 3 sur 5 · Validation Directeur N+2</CardSubtitle>
      </CardHeader>
      <CardBody>
        <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
        <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

        <div style={{ background: '#fff3e0', border: '1px solid #ffc107', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Evaluation Manager N+1</div>
          <Badge variant="green">{evaluation.decision || 'CONFIRMATION'}</Badge>
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <ChampConfidentiel valeur={evaluation.evaluationN1} roleRequis="Directeur" />
          </div>
          {evaluation.commentaireN1 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Commentaire: {evaluation.commentaireN1}</div>
          )}
          {evaluation.decision === 'PROLONGATION' && evaluation.dureeProlongation && (
            <div style={{ marginTop: 8, fontSize: 12 }}>Durée de prolongation proposée : {evaluation.dureeProlongation} mois</div>
          )}
          {evaluation.decision === 'RUPTURE' && evaluation.justificationRupture && (
            <div style={{ marginTop: 8, fontSize: 12 }}>Justification de rupture : {evaluation.justificationRupture}</div>
          )}
        </div>

        <FormGroup>
          <FormLabel required>Votre décision (N+2)</FormLabel>
          <Select value={formData.decision} onChange={(e) => setFormData({ ...formData, decision: e.target.value })}>
            <option value="VALIDEE">Valider l'évaluation</option>
            <option value="REJETEE">Rejeter (le contrat n'est pas modifié automatiquement)</option>
          </Select>
        </FormGroup>

        {formData.decision === 'REJETEE' && (
          <Alert variant="amber">
            Le contrat ne sera pas modifié automatiquement. Le Resp. Paie et le SUPER_ADMIN seront notifiés
            pour décider manuellement de la suite (hors circuit).
          </Alert>
        )}

        {formData.decision === 'VALIDEE' && (
          <FormGroup>
            <FormLabel>Votre évaluation complémentaire (optionnel)</FormLabel>
            <Textarea value={formData.evaluationN2} onChange={(e) => setFormData({ ...formData, evaluationN2: e.target.value })}
              placeholder="Votre évaluation complémentaire..." rows={3} />
          </FormGroup>
        )}

        <FormGroup>
          <FormLabel>Commentaire Directeur</FormLabel>
          <Textarea value={formData.commentaire} onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
            placeholder="Votre commentaire..." rows={3} />
        </FormGroup>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 16 }}>
          <Button variant="secondary" size="sm" onClick={toggleMasquage} disabled={masquageLoading}>
            {evaluation.evaluationN1Masquee ? 'Rétablir l\'évaluation N1' : 'Masquer l\'évaluation N1'}
          </Button>
          <Button onClick={handleSubmit} disabled={loading} variant="primary">
            {loading ? 'Validation...' : 'Finaliser mon avis'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ====================== VIEW PROPOSITION (RESP_PAIE) — ÉTAPE 3 ======================
// ====================== VIEW PROPOSITION (RESP_PAIE) — ÉTAPE 3 ======================
function ViewProposition({ evaluation, onRefresh, isReadOnly = false }: {
  evaluation: EvaluationPEDetail; onRefresh: () => void; isReadOnly?: boolean
}) {
  const [loading, setLoading] = useState(false);
  const decision = evaluation.decision; // CONFIRMATION | PROLONGATION | RUPTURE | CHANGEMENT

  const [formData, setFormData] = useState({
    typeAvenant: '',
    description: '',
    nouveauSalaire: '',
    nouvelleDateFin: '',
    // Nouveaux champs, pertinents seulement selon la decision
    nouveauPoste: '',
    nouvelleDirectionId: '',
    dateResiliation: '',
    motifResiliation: ''
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post(`/evaluations/${evaluation.id}/proposer-modification`, {
        typeAvenant: formData.typeAvenant || undefined,
        description: formData.description || undefined,
        nouveauSalaire: decision === 'PROLONGATION' || decision === 'CONFIRMATION' ? (formData.nouveauSalaire || undefined) : undefined,
        nouvelleDateFin: decision === 'PROLONGATION' ? (formData.nouvelleDateFin || undefined) : undefined,
        nouveauPoste: decision === 'CHANGEMENT' ? (formData.nouveauPoste || undefined) : undefined,
        nouvelleDirectionId: decision === 'CHANGEMENT' ? (formData.nouvelleDirectionId || undefined) : undefined,
        dateResiliation: decision === 'RUPTURE' ? (formData.dateResiliation || undefined) : undefined,
        motifResiliation: decision === 'RUPTURE' ? (formData.motifResiliation || undefined) : undefined,
      });
      onRefresh();
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const proposition = evaluation.contrat.donneesContrat?.propositionModification;

  if (isReadOnly) {
    // ... inchangé, juste afficher les nouveaux champs si présents
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proposition contractuelle — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
          <CardSubtitle>En attente de validation DRH</CardSubtitle>
        </CardHeader>
        <CardBody>
          <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
          <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />
          {proposition && (
            <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
              <div><strong>Type d'avenant:</strong> {proposition.typeAvenant}</div>
              <div style={{ marginTop: 8 }}><strong>Description:</strong> {proposition.description}</div>
              {proposition.nouveauSalaire && <div style={{ marginTop: 8 }}><strong>Nouveau salaire:</strong> {proposition.nouveauSalaire}</div>}
              {proposition.nouvelleDateFin && <div style={{ marginTop: 8 }}><strong>Nouvelle fin de PE:</strong> {new Date(proposition.nouvelleDateFin).toLocaleDateString('fr-FR')}</div>}
              {proposition.nouveauPoste && <div style={{ marginTop: 8 }}><strong>Nouveau poste:</strong> {proposition.nouveauPoste}</div>}
              {proposition.dateResiliation && <div style={{ marginTop: 8 }}><strong>Date de résiliation:</strong> {new Date(proposition.dateResiliation).toLocaleDateString('fr-FR')}</div>}
              {proposition.motifResiliation && <div style={{ marginTop: 8 }}><strong>Motif:</strong> {proposition.motifResiliation}</div>}
              <div style={{ marginTop: 8 }}><Badge variant={proposition.statut === 'REJETEE_PAR_DRH' ? 'red' : 'amber'}>{proposition.statut}</Badge></div>
              {proposition.commentaireDRH && <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Commentaire DRH: {proposition.commentaireDRH}</div>}
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposition contractuelle — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
        <CardSubtitle>Étape 4 sur 5 · Préparer la modification du contrat</CardSubtitle>
      </CardHeader>
      <CardBody>
        <Alert variant="gold">
          Décision retenue par le circuit d'avis : <strong>{decision}</strong>.
          Seuls les champs pertinents pour cette décision sont modifiables ici.
        </Alert>
        <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
        <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

        {proposition?.statut === 'REJETEE_PAR_DRH' && (
          <Alert variant="red">
            Le DRH a renvoyé la proposition précédente{proposition.commentaireDRH ? ` : "${proposition.commentaireDRH}"` : ''}. Merci de l'ajuster.
          </Alert>
        )}

        {/* CONFIRMATION : rien à changer structurellement, juste confirmer */}
        {decision === 'CONFIRMATION' && (
          <FormGroup>
            <FormLabel>Ajustement de salaire (optionnel)</FormLabel>
            <Input value={formData.nouveauSalaire} onChange={(e) => setFormData({ ...formData, nouveauSalaire: e.target.value })} placeholder="Laisser vide si aucun changement" />
          </FormGroup>
        )}

        {/* PROLONGATION : la nouvelle fin de PE est obligatoire */}
        {decision === 'PROLONGATION' && (
          <>
            <FormGroup>
              <FormLabel required>Nouvelle date de fin de période d'essai</FormLabel>
              <Input type="date" value={formData.nouvelleDateFin} onChange={(e) => setFormData({ ...formData, nouvelleDateFin: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Ajustement de salaire (optionnel)</FormLabel>
              <Input value={formData.nouveauSalaire} onChange={(e) => setFormData({ ...formData, nouveauSalaire: e.target.value })} />
            </FormGroup>
          </>
        )}

        {/* CHANGEMENT : poste et/ou direction */}
        {decision === 'CHANGEMENT' && (
          <FormRow>
            <FormGroup>
              <FormLabel>Nouveau poste</FormLabel>
              <Input value={formData.nouveauPoste} onChange={(e) => setFormData({ ...formData, nouveauPoste: e.target.value })}
                placeholder={evaluation.employe.poste || ''} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Nouvelle direction (ID)</FormLabel>
              <Input value={formData.nouvelleDirectionId} onChange={(e) => setFormData({ ...formData, nouvelleDirectionId: e.target.value })}
                placeholder="Laisser vide si direction inchangée" />
            </FormGroup>
          </FormRow>
        )}

        {/* RUPTURE : résiliation du contrat, pas un avenant salaire/date */}
        {decision === 'RUPTURE' && (
          <>
            <Alert variant="red">Ceci mettra fin au contrat (statut RESILIE), pas un simple avenant.</Alert>
            <FormGroup>
              <FormLabel required>Date de résiliation</FormLabel>
              <Input type="date" value={formData.dateResiliation} onChange={(e) => setFormData({ ...formData, dateResiliation: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Motif de résiliation</FormLabel>
              <Textarea value={formData.motifResiliation} onChange={(e) => setFormData({ ...formData, motifResiliation: e.target.value })} rows={3} />
            </FormGroup>
          </>
        )}

        <FormGroup>
          <FormLabel>Type d'avenant (laisser vide pour valeur par défaut)</FormLabel>
          <Input value={formData.typeAvenant} onChange={(e) => setFormData({ ...formData, typeAvenant: e.target.value })} />
        </FormGroup>

        <FormGroup>
          <FormLabel>Description (laisser vide pour génération automatique)</FormLabel>
          <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
        </FormGroup>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onClick={handleSubmit} disabled={loading} variant="primary">
            {loading ? 'Envoi...' : 'Envoyer au DRH'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ====================== VIEW DRH — ÉTAPE 4 ======================
function ViewDRH({ evaluation, onRefresh, isReadOnly = false }: {
  evaluation: EvaluationPEDetail; onRefresh: () => void; isReadOnly?: boolean
}) {
  const [loading, setLoading] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  const proposition = evaluation.contrat.donneesContrat?.propositionModification;

  const traiter = async (approuve: boolean) => {
    setLoading(true);
    try {
      await api.post(`/evaluations/${evaluation.id}/valider-modification-drh`, { approuve, commentaire });
      onRefresh();
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isReadOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validation contractuelle — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
           <CardSubtitle>
  {evaluation.statut === 'REJETEE' ? 'Rejetée par le Directeur' :
   evaluation.statut === 'VALIDEE' ? 'Validée' : 'Traitée'}
 </CardSubtitle>
        </CardHeader>
        <CardBody>
          <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation contractuelle — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
        <CardSubtitle>Étape 5 sur 5 · Validation DRH</CardSubtitle>
      </CardHeader>
      <CardBody>
        <Alert variant="umber">
          Vous validez uniquement la partie contractuelle de cette proposition — le contenu de l'évaluation
          de l'employé n'est ni transmis ni requis pour cette étape.
        </Alert>
        <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
        <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

        {proposition && (
          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div><strong>Type d'avenant:</strong> {proposition.typeAvenant}</div>
            <div style={{ marginTop: 8 }}><strong>Description:</strong> {proposition.description}</div>
            {proposition.nouveauSalaire && <div style={{ marginTop: 8 }}><strong>Nouveau salaire:</strong> {proposition.nouveauSalaire}</div>}
            {proposition.nouvelleDateFin && <div style={{ marginTop: 8 }}><strong>Nouvelle date de fin:</strong> {new Date(proposition.nouvelleDateFin).toLocaleDateString('fr-FR')}</div>}
          </div>
        )}

        <FormGroup>
          <FormLabel>Commentaire (optionnel)</FormLabel>
          <Textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3} />
        </FormGroup>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="secondary" onClick={() => traiter(false)} disabled={loading}>
            Renvoyer au Resp. Paie
          </Button>
          <Button variant="primary" onClick={() => traiter(true)} disabled={loading}>
            {loading ? 'Traitement...' : 'Approuver et appliquer'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ====================== VIEW READ ONLY ======================
function ViewReadOnly({ evaluation }: { evaluation: EvaluationPEDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Période d'Essai — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
        <CardSubtitle>Consultation uniquement</CardSubtitle>
      </CardHeader>
      <CardBody>
        <Alert variant="green">
          {evaluation.statut === 'VALIDEE'
            ? `Evaluation finalisée le ${evaluation.valideeAt ? new Date(evaluation.valideeAt).toLocaleDateString('fr-FR') : '-'}`
            : evaluation.statut === 'REJETEE'
            ? 'Evaluation rejetée — aucune modification automatique du contrat'
            : 'Evaluation en cours de traitement'}
        </Alert>
        <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} />
        <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />
        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Décision</div>
          <Badge variant="green">{evaluation.decision || 'En attente'}</Badge>
        </div>
        {evaluation.evaluationN1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Evaluation Manager</div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>{evaluation.evaluationN1}</div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ====================== PAGE PRINCIPALE ======================
export const EvaluationPage = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<EvaluationPEDetail[]>([]);
  const [selectedEval, setSelectedEval] = useState<EvaluationPEDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchEvaluations(); }, []);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/evaluations');
      setEvaluations(response.data.data.evaluations || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const ouvrirEvaluation = async (id: string) => {
    setLoadingDetail(true);
    setError('');
    try {
      const response = await api.get(`/evaluations/${id}`);
      setSelectedEval(response.data.data.evaluation);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement de la fiche');
    } finally {
      setLoadingDetail(false);
    }
  };

  const normalizedRole = normalizeRole(user?.role);

  // FIX : RESP_PAIE intervient désormais à DEUX étapes distinctes (0 et 3).
  const isEditableForRole = (evaluation: EvaluationPEDetail): boolean => {
    if (normalizedRole === 'RESP_PAIE') {
      return (evaluation.statut === 'BROUILLON' && evaluation.etapeActuelle === 0)
        || (evaluation.statut === 'EN_VALIDATION_DRH' && evaluation.etapeActuelle === 3);
    }
    if (normalizedRole === 'MANAGER') return evaluation.statut === 'EN_VALIDATION_DIR' && evaluation.etapeActuelle === 1;
    if (normalizedRole === 'DIRECTEUR') return evaluation.statut === 'EN_VALIDATION_DIR' && evaluation.etapeActuelle === 2;
    if (normalizedRole === 'DRH') return evaluation.statut === 'EN_VALIDATION_DRH' && evaluation.etapeActuelle === 4;
    return false;
  };

  const renderVueDetail = () => {
    if (!selectedEval) return null;
    const isReadOnly = !isEditableForRole(selectedEval);
    const onRefresh = () => { fetchEvaluations(); setSelectedEval(null); };

    if (normalizedRole === 'RESP_PAIE') {
      return selectedEval.etapeActuelle >= 3
        ? <ViewProposition evaluation={selectedEval} onRefresh={onRefresh} isReadOnly={isReadOnly} />
        : <ViewPaie evaluation={selectedEval} onRefresh={onRefresh} isReadOnly={isReadOnly} />;
    }
    if (normalizedRole === 'MANAGER') return <ViewManager evaluation={selectedEval} onRefresh={onRefresh} isReadOnly={isReadOnly} />;
    if (normalizedRole === 'DIRECTEUR') return <ViewDirecteur evaluation={selectedEval} onRefresh={onRefresh} isReadOnly={isReadOnly} />;
    if (normalizedRole === 'DRH') return <ViewDRH evaluation={selectedEval} onRefresh={onRefresh} isReadOnly={isReadOnly} />;
    return <ViewReadOnly evaluation={selectedEval} />;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement des évaluations...</div>;

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Evaluation Période d'Essai</h1>
        <p style={{ color: '#666', marginTop: 4 }}>
          Avis : Resp. Paie → Manager N+1 → Directeur N+2 · Contrat : Resp. Paie → DRH
        </p>
      </div>

      {error && <Alert variant="red">{error}</Alert>}

      <Card style={{ marginBottom: 20 }}>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#f5f5f5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Employé</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Direction</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Poste</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fin PE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Jours restants</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Étape</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Statut</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#666' }}>Aucune évaluation disponible</td></tr>
                ) : (
                  evaluations.map((e) => {
                    const isEditable = isEditableForRole(e);
                     const etapeLabel =
   e.statut === 'REJETEE' ? 'Rejetée (Directeur)' :
   e.statut === 'VALIDEE' ? 'Clôturée' :
   WORKFLOW_STEPS[e.etapeActuelle]?.label || 'Clôturée';
                    return (
                      <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0', background: isEditable ? 'rgba(90,122,58,0.1)' : 'transparent' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={`${e.employe.prenom} ${e.employe.nom}`} size="sm" />
                            <div>{e.employe.prenom} {e.employe.nom}</div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{e.employe.direction?.nom || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>{e.employe.poste || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>{new Date(e.dateFin).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: e.joursRestants < 30 ? '#dc3545' : '#333' }}>{e.joursRestants}j</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: '#c49a2b20', color: '#c49a2b' }}>
                            {etapeLabel}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={e.statut === 'VALIDEE' ? 'green' : e.statut === 'REJETEE' ? 'red' : 'amber'}>
                            {e.statut === 'BROUILLON' ? 'Brouillon' : e.statut === 'EN_VALIDATION_DIR' ? 'Avis en cours' : e.statut === 'EN_VALIDATION_DRH' ? 'Contrat en cours' : e.statut === 'VALIDEE' ? 'Validée' : 'Rejetée'}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Button variant={isEditable ? 'primary' : 'secondary'} size="xs" disabled={loadingDetail} onClick={() => ouvrirEvaluation(e.id)}>
                            <Eye size={12} /> {isEditable ? 'Traiter' : 'Consulter'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {renderVueDetail()}
    </div>
  );
};