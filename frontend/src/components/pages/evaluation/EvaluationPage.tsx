// frontend/src/components/pages/evaluation/EvaluationPage.tsx
//
// Corrections apportées :
//   1. Au clic sur une ligne, on va chercher la fiche via GET /evaluations/:id
//      (getEvaluationById, filtrée côté serveur) plutôt que de réutiliser
//      l'objet déjà présent dans la liste. Défense en profondeur : même si
//      la confidentialité venait à être cassée à nouveau sur un des deux
//      endpoints, l'autre continue de protéger l'affichage détaillé.
//   2. Les affichages de evaluationN1 / commentaireN1 / evaluationN2 /
//      commentaireN2 gèrent maintenant proprement le cas "null" (donnée
//      masquée par la confidentialité) au lieu d'afficher "null" ou une
//      chaîne vide silencieuse.

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
  { order: 3, role: 'cloturee', label: 'Cloturee' }
];

function WorkflowSteps({ etapeActuelle, totalEtapes }: { etapeActuelle: number; totalEtapes: number }) {
  const steps = WORKFLOW_STEPS.filter(s => s.role !== 'cloturee');
  const currentIdx = etapeActuelle;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', padding: '4px 0' }}>
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.role} style={{ display: 'flex', alignItems: 'flex-start' }}>
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
            {i < steps.length - 1 && (
              <div style={{ width: 24, height: 2, background: done ? '#4caf50' : '#e0e0e0', margin: '14px 2px 0' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Petit helper d'affichage : évite d'afficher "null" ou un champ vide sans
// explication quand une donnée est masquée par la confidentialité.
function ChampConfidentiel({ valeur, roleRequis }: { valeur: string | null | undefined; roleRequis: string }) {
  if (valeur === null || valeur === undefined || valeur === '') {
    return <span style={{ fontStyle: 'italic', color: '#999' }}>Non visible avec votre rôle ({roleRequis} requis)</span>;
  }
  return <>{valeur}</>;
}

// ====================== VIEW PAIE ======================
function ViewPaie({ evaluation, onRefresh, isReadOnly = false }: {
  evaluation: EvaluationPEDetail;
  onRefresh: () => void;
  isReadOnly?: boolean
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
          <CardSubtitle>Consultation (donnees contractuelles)</CardSubtitle>
        </CardHeader>
        <CardBody>
          <Alert variant="green">Evaluation deja soumise - Consultation uniquement</Alert>
          <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} totalEtapes={3} />
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
        <CardSubtitle>Etape 1 sur 3 · Saisie des donnees contractuelles</CardSubtitle>
      </CardHeader>
      <CardBody>
        <Alert variant="gold">Role Resp. Paie : Saisissez et verifiez les donnees contractuelles.</Alert>
        <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} totalEtapes={3} />
        <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

        <FormRow>
          <FormGroup><FormLabel required>Type de contrat</FormLabel>
            <Select value={formData.typeContrat} onChange={(e) => setFormData({ ...formData, typeContrat: e.target.value })}>
              <option>CDI</option><option>CDD</option><option>Stage</option><option>Alternance</option>
            </Select>
          </FormGroup>
          <FormGroup><FormLabel required>Date de debut</FormLabel>
            <Input type="date" value={formData.dateDebut} onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })} />
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup><FormLabel required>Date de fin periode d'essai</FormLabel>
            <Input type="date" value={formData.dateFin} onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })} />
          </FormGroup>
          <FormGroup><FormLabel required>Salaire brut mensuel (DT)</FormLabel>
            <Input type="number" value={formData.salaire} onChange={(e) => setFormData({ ...formData, salaire: e.target.value })} />
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup><FormLabel>Poste occupe</FormLabel>
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

// ====================== VIEW MANAGER ======================
function ViewManager({ evaluation, onRefresh, isReadOnly = false }: {
  evaluation: EvaluationPEDetail;
  onRefresh: () => void;
  isReadOnly?: boolean
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EvaluationN1FormData>({
    evaluationN1: evaluation.evaluationN1 || '',
    commentaireN1: evaluation.commentaireN1 || '',
    decision: evaluation.decision || 'CONFIRMATION'
  });

  const handleSubmit = async () => {
    if (!formData.evaluationN1 || !formData.commentaireN1) {
      alert('Veuillez remplir l\'evaluation et le commentaire');
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
          <CardSubtitle>Consultation - Evaluation deja soumise</CardSubtitle>
        </CardHeader>
        <CardBody>
          <Alert variant="green">Evaluation soumise le {evaluation.dateSoumissionN1 ? new Date(evaluation.dateSoumissionN1).toLocaleDateString('fr-FR') : '-'}</Alert>
          <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} totalEtapes={3} />
          <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Ma decision</div>
            <Badge variant="green">{evaluation.decision || 'CONFIRMATION'}</Badge>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Mon evaluation</div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>
              <ChampConfidentiel valeur={evaluation.evaluationN1} roleRequis="Manager assigné / Directeur" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Mon commentaire</div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>
              <ChampConfidentiel valeur={evaluation.commentaireN1} roleRequis="Manager assigné / Directeur" />
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Periode d'Essai — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
        <CardSubtitle>Etape 2 sur 3 · Evaluation Manager N+1</CardSubtitle>
      </CardHeader>
      <CardBody>
        <Alert variant="amber">Delai de 48h pour soumettre cette evaluation.</Alert>
        <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} totalEtapes={3} />
        <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Informations employe</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><strong>Direction:</strong> {evaluation.employe.direction?.nom || '-'}</div>
            <div><strong>Poste:</strong> {evaluation.employe.poste || '-'}</div>
            <div><strong>Fin PE:</strong> {new Date(evaluation.dateFin).toLocaleDateString('fr-FR')}</div>
            <div><strong>Salaire:</strong> {evaluation.contrat.salaire} DT</div>
          </div>
        </div>

        <FormGroup>
          <FormLabel required>Decision du Manager (N+1)</FormLabel>
          <Select value={formData.decision} onChange={(e) => setFormData({ ...formData, decision: e.target.value as any })}>
            <option value="CONFIRMATION">Confirmation</option>
            <option value="PROLONGATION">Prolongation</option>
            <option value="RUPTURE">Rupture</option>
            <option value="CHANGEMENT">Changement de situation</option>
          </Select>
        </FormGroup>

        {formData.decision === 'PROLONGATION' && (
          <FormGroup>
            <FormLabel required>Duree de prolongation (mois)</FormLabel>
            <Input
              type="number"
              value={(formData as any).dureeProlongation || ''}
              onChange={(e) => setFormData({ ...formData, dureeProlongation: parseInt(e.target.value) } as any)}
            />
          </FormGroup>
        )}

        {formData.decision === 'RUPTURE' && (
          <FormGroup>
            <FormLabel required>Justification de la rupture</FormLabel>
            <Textarea
              value={(formData as any).justificationRupture || ''}
              onChange={(e) => setFormData({ ...formData, justificationRupture: e.target.value } as any)}
              rows={3}
            />
          </FormGroup>
        )}

        <FormGroup>
          <FormLabel required>Evaluation globale</FormLabel>
          <Textarea
            value={formData.evaluationN1}
            onChange={(e) => setFormData({ ...formData, evaluationN1: e.target.value })}
            placeholder="Decrivez les performances, comportements, points forts et axes d'amelioration..."
            rows={4}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel required>Commentaire</FormLabel>
          <Textarea
            value={formData.commentaireN1}
            onChange={(e) => setFormData({ ...formData, commentaireN1: e.target.value })}
            placeholder="Commentaire obligatoire..."
            rows={3}
          />
        </FormGroup>

        <Alert variant="umber">Votre evaluation sera visible uniquement par le Directeur N+2.</Alert>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onClick={handleSubmit} disabled={loading} variant="primary">
            {loading ? 'Envoi...' : 'Soumettre au Directeur'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ====================== VIEW DIRECTEUR ======================
function ViewDirecteur({ evaluation, onRefresh, isReadOnly = false }: {
  evaluation: EvaluationPEDetail;
  onRefresh: () => void;
  isReadOnly?: boolean
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    decision: 'VALIDEE',
    commentaire: '',
    evaluationN2: ''
  });

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

  if (isReadOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation PE — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
          <CardSubtitle>Consultation - Evaluation finalisee</CardSubtitle>
        </CardHeader>
        <CardBody>
          <Alert variant="green">Evaluation finalisee le {evaluation.valideeAt ? new Date(evaluation.valideeAt).toLocaleDateString('fr-FR') : '-'}</Alert>
          <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} totalEtapes={3} />
          <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Evaluation Manager N+1</div>
            <Badge variant="green">{evaluation.decision || 'CONFIRMATION'}</Badge>
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <ChampConfidentiel valeur={evaluation.evaluationN1} roleRequis="Directeur" />
            </div>
            {evaluation.commentaireN1 !== null && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                Commentaire: <ChampConfidentiel valeur={evaluation.commentaireN1} roleRequis="Directeur" />
              </div>
            )}
          </div>

          {evaluation.evaluationN2 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Ma decision complementaire</div>
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>{evaluation.evaluationN2}</div>
            </div>
          )}

          {evaluation.commentaireN2 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Mon commentaire</div>
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>{evaluation.commentaireN2}</div>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Periode d'Essai — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
        <CardSubtitle>Etape 3 sur 3 · Validation Directeur N+2</CardSubtitle>
      </CardHeader>
      <CardBody>
        <Alert variant="umber">Vue Directeur N+2 : Vous seul avez acces a l'evaluation du Manager.</Alert>
        <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} totalEtapes={3} />
        <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Informations employe</div>
          <div><strong>Direction:</strong> {evaluation.employe.direction?.nom || '-'}</div>
          <div><strong>Poste:</strong> {evaluation.employe.poste || '-'}</div>
          <div><strong>Fin PE:</strong> {new Date(evaluation.dateFin).toLocaleDateString('fr-FR')}</div>
        </div>

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
            <div style={{ marginTop: 8, fontSize: 12 }}>Duree de prolongation proposee : {evaluation.dureeProlongation} mois</div>
          )}
          {evaluation.decision === 'RUPTURE' && evaluation.justificationRupture && (
            <div style={{ marginTop: 8, fontSize: 12 }}>Justification de rupture : {evaluation.justificationRupture}</div>
          )}
        </div>

        <FormGroup>
          <FormLabel required>Votre decision (N+2)</FormLabel>
          <Select value={formData.decision} onChange={(e) => setFormData({ ...formData, decision: e.target.value })}>
            <option value="VALIDEE">Valider l'evaluation (applique la decision du Manager)</option>
            <option value="REJETEE">Rejeter l'evaluation</option>
          </Select>
        </FormGroup>

        {formData.decision === 'VALIDEE' && (
          <FormGroup>
            <FormLabel>Votre evaluation complementaire (optionnel)</FormLabel>
            <Textarea
              value={formData.evaluationN2}
              onChange={(e) => setFormData({ ...formData, evaluationN2: e.target.value })}
              placeholder="Votre evaluation complementaire..."
              rows={3}
            />
          </FormGroup>
        )}

        <FormGroup>
          <FormLabel>Commentaire Directeur</FormLabel>
          <Textarea
            value={formData.commentaire}
            onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
            placeholder="Votre commentaire confidentiel..."
            rows={3}
          />
        </FormGroup>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onClick={handleSubmit} disabled={loading} variant="primary">
            {loading ? 'Validation...' : 'Finaliser l\'evaluation'}
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
        <CardTitle>Evaluation Periode d'Essai — {evaluation.employe.prenom} {evaluation.employe.nom}</CardTitle>
        <CardSubtitle>Consultation uniquement</CardSubtitle>
      </CardHeader>
      <CardBody>
        <Alert variant="green">
          {evaluation.statut === 'VALIDEE'
            ? `Evaluation finalisee le ${evaluation.valideeAt ? new Date(evaluation.valideeAt).toLocaleDateString('fr-FR') : '-'}`
            : 'Evaluation en cours de traitement'}
        </Alert>
        <WorkflowSteps etapeActuelle={evaluation.etapeActuelle} totalEtapes={3} />
        <div style={{ height: 1, background: '#e0e0e0', margin: '16px 0' }} />

        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Decision finale</div>
          <Badge variant="green">{evaluation.decision || 'En attente'}</Badge>
        </div>

        {/* Par confidentialité, evaluationN1/N2 arrivent déjà à null pour ce
            rôle si non autorisé — on ne les affiche donc que si présents. */}
        {evaluation.evaluationN1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Evaluation Manager</div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>{evaluation.evaluationN1}</div>
          </div>
        )}

        {evaluation.evaluationN2 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Evaluation Directeur</div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>{evaluation.evaluationN2}</div>
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
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEvaluations();
  }, []);

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

  // FIX : on va chercher la fiche détaillée filtrée côté serveur plutôt que
  // de réutiliser l'objet de la liste (défense en profondeur pour la
  // confidentialité N1/N2).
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

  const isEditableForRole = (evaluation: EvaluationPEDetail): boolean => {
    if (normalizedRole === 'RESP_PAIE') return evaluation.statut === 'BROUILLON';
    if (normalizedRole === 'MANAGER') return evaluation.statut === 'EN_VALIDATION_DIR' && evaluation.etapeActuelle === 1;
    if (normalizedRole === 'DIRECTEUR') return evaluation.statut === 'EN_VALIDATION_DIR' && evaluation.etapeActuelle === 2;
    return false;
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement des evaluations...</div>;
  }

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Evaluation Periode d'Essai</h1>
        <p style={{ color: '#666', marginTop: 4 }}>Workflow: Resp. Paie → Manager N+1 → Directeur N+2 (meme direction)</p>
      </div>

      {error && <Alert variant="red">{error}</Alert>}
      {success && <Alert variant="green">{success}</Alert>}

      <Card style={{ marginBottom: 20 }}>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#f5f5f5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Employe</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Direction</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Poste</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fin PE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Jours restants</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Etape</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Statut</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#666' }}>Aucune evaluation disponible</td>
                  </tr>
                ) : (
                  evaluations.map((e) => {
                    const isEditable = isEditableForRole(e);
                    let etapeLabel = '';
                    let etapeColor = '#999';
                    if (e.etapeActuelle === 0) { etapeLabel = 'Saisie Paie'; etapeColor = '#c07820'; }
                    else if (e.etapeActuelle === 1) { etapeLabel = 'Manager'; etapeColor = '#c49a2b'; }
                    else if (e.etapeActuelle === 2) { etapeLabel = 'Directeur'; etapeColor = '#c49a2b'; }
                    else if (e.etapeActuelle === 3) { etapeLabel = 'Cloturee'; etapeColor = '#5a7a3a'; }

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
                          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: etapeColor + '20', color: etapeColor }}>
                            {etapeLabel}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={e.statut === 'VALIDEE' ? 'green' : e.statut === 'REJETEE' ? 'red' : 'amber'}>
                            {e.statut === 'BROUILLON' ? 'Brouillon' : e.statut === 'EN_VALIDATION_DIR' ? 'En cours' : e.statut === 'VALIDEE' ? 'Validee' : 'Rejetee'}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Button
                            variant={isEditable ? 'primary' : 'secondary'}
                            size="xs"
                            disabled={loadingDetail}
                            onClick={() => ouvrirEvaluation(e.id)}
                          >
                            <Eye size={12} /> {isEditable ? (normalizedRole === 'RESP_PAIE' ? 'Saisir' : 'Traiter') : 'Consulter'}
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

      {selectedEval && (
        <>
          {normalizedRole === 'RESP_PAIE' && (
            <ViewPaie
              evaluation={selectedEval}
              onRefresh={() => { fetchEvaluations(); setSelectedEval(null); }}
              isReadOnly={!isEditableForRole(selectedEval)}
            />
          )}
          {normalizedRole === 'MANAGER' && (
            <ViewManager
              evaluation={selectedEval}
              onRefresh={() => { fetchEvaluations(); setSelectedEval(null); }}
              isReadOnly={!isEditableForRole(selectedEval)}
            />
          )}
          {normalizedRole === 'DIRECTEUR' && (
            <ViewDirecteur
              evaluation={selectedEval}
              onRefresh={() => { fetchEvaluations(); setSelectedEval(null); }}
              isReadOnly={!isEditableForRole(selectedEval)}
            />
          )}
          {!['RESP_PAIE', 'MANAGER', 'DIRECTEUR'].includes(normalizedRole) && (
            <ViewReadOnly evaluation={selectedEval} />
          )}
        </>
      )}
    </div>
  );
};