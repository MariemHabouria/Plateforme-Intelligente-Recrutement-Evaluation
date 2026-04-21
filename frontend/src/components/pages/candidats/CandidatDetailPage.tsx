// frontend/src/components/pages/candidats/CandidatDetailPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Mail, Phone, Calendar, Briefcase, Check, X, FileText } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { ScoreBar } from '../../ui/ScoreBar';
import api from '../../../services/api';
import { PlanifierEntretienModal } from '../entretiens/PlanifierEntretienModal';

type TypeEntretien = 'RH' | 'TECHNIQUE' | 'DIRECTION';

const NIVEAUX_AVEC_DIRECTION = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];

interface Props {
  id: string;
}

interface CandidatureDetail {
  id: string;
  reference: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  cvUrl: string;
  cvTexte?: string;
  scoreGlobal: number;
  scoreExp: number;
  competencesDetectees: string[];
  competencesManquantes: string[];
  statut: string;
  dateSoumission: string;
  offre: {
    id: string;
    reference: string;
    intitule: string;
    description: string;
    profilRecherche: string;
    competences: string[];
    typeContrat: string;
    demande?: {
      id: string;
      niveau: string;
    };
  };
  entretiens?: {
    id: string;
    type: string;
    date: string;
    heure: string;
    lieu: string;
    statut: string;
    feedback?: string;
    evaluation?: number;
  }[];
  contrat?: {
    id: string;
    reference: string;
    statut: string;
  };
}

export function CandidatDetailPage({ id }: Props) {
  const navigate = useNavigate();
  const [candidature, setCandidature] = useState<CandidatureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showPlanifierModal, setShowPlanifierModal] = useState(false);
  const [planifierType, setPlanifierType] = useState<TypeEntretien>('RH');

  useEffect(() => {
    if (id) fetchCandidature();
  }, [id]);

  const fetchCandidature = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/candidatures/${id}`);
      setCandidature(response.data.data.candidature);
    } catch (err: any) {
      console.error('Erreur:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Candidature non trouvée');
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (newStatut: string) => {
    if (!candidature) return;
    setUpdating(true);
    try {
      await api.patch(`/candidatures/${candidature.id}/statut`, { statut: newStatut });
      await fetchCandidature();
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
    } finally {
      setUpdating(false);
    }
  };

  const openPlanifierModal = (type: TypeEntretien) => {
    setPlanifierType(type);
    setShowPlanifierModal(true);
  };

  const getStatutVariant = (statut: string): 'gold' | 'green' | 'red' | 'amber' | 'olive' => {
    const variants: Record<string, any> = {
      NOUVELLE: 'amber',
      PRESELECTIONNEE: 'olive',
      ENTRETIEN: 'gold',
      ACCEPTEE: 'green',
      REFUSEE: 'red',
    };
    return variants[statut] || 'amber';
  };

  const getStatutLabel = (statut: string): string => {
    const labels: Record<string, string> = {
      NOUVELLE: 'Nouvelle',
      PRESELECTIONNEE: 'Pré-sélectionnée',
      ENTRETIEN: 'Entretien',
      ACCEPTEE: 'Acceptée',
      REFUSEE: 'Refusée',
    };
    return labels[statut] || statut;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const hasEntretien = (type: string): boolean => {
    return candidature?.entretiens?.some(e => e.type === type) || false;
  };

  const niveauPoste = candidature?.offre?.demande?.niveau || '';

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement de la candidature...</div>;
  }

  if (error || !candidature) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert variant="red">{error || 'Candidature non trouvée'}</Alert>
        <Button onClick={() => navigate('/candidats')} style={{ marginTop: 16 }}>
          Retour aux candidatures
        </Button>
      </div>
    );
  }

  return (
    <div className="page-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button variant="ghost" size="xs" onClick={() => navigate('/candidats')} style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
              Candidature {candidature.reference}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Badge variant={getStatutVariant(candidature.statut)}>
                {getStatutLabel(candidature.statut)}
              </Badge>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Soumise le {formatDate(candidature.dateSoumission)}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={() => window.open(candidature.cvUrl, '_blank')}>
            <Download size={14} /> Télécharger CV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => (window.location.href = `mailto:${candidature.email}`)}
          >
            <Mail size={14} /> Contacter
          </Button>
        </div>
      </div>

      {/* Actions rapides */}
      {candidature.statut === 'NOUVELLE' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <Button variant="success" onClick={() => updateStatut('PRESELECTIONNEE')} disabled={updating}>
            <Check size={14} /> Présélectionner
          </Button>
          <Button variant="danger" onClick={() => updateStatut('REFUSEE')} disabled={updating}>
            <X size={14} /> Refuser
          </Button>
        </div>
      )}

      {candidature.statut === 'PRESELECTIONNEE' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {!hasEntretien('RH') && (
            <Button variant="primary" onClick={() => openPlanifierModal('RH')}>
              <Calendar size={14} /> Planifier entretien RH
            </Button>
          )}
          {hasEntretien('RH') && !hasEntretien('TECHNIQUE') && (
            <Button variant="primary" onClick={() => openPlanifierModal('TECHNIQUE')}>
              <Calendar size={14} /> Planifier entretien technique
            </Button>
          )}
          {NIVEAUX_AVEC_DIRECTION.includes(niveauPoste) &&
            hasEntretien('TECHNIQUE') && !hasEntretien('DIRECTION') && (
              <Button variant="primary" onClick={() => openPlanifierModal('DIRECTION')}>
                <Calendar size={14} /> Planifier entretien direction
              </Button>
            )}
          {hasEntretien('RH') && hasEntretien('TECHNIQUE') &&
            (!NIVEAUX_AVEC_DIRECTION.includes(niveauPoste) || hasEntretien('DIRECTION')) && (
              <Button variant="success" onClick={() => updateStatut('ACCEPTEE')}>
                <Check size={14} /> Accepter la candidature
              </Button>
            )}
          <Button variant="danger" onClick={() => updateStatut('REFUSEE')}>
            <X size={14} /> Refuser
          </Button>
        </div>
      )}

      {/* Grille infos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Avatar name={`${candidature.prenom} ${candidature.nom}`} size="md" />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{candidature.prenom} {candidature.nom}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Candidat</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13 }}>{candidature.email}</span>
              </div>
              {candidature.telephone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 13 }}>{candidature.telephone}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13 }}>CV: {candidature.cvUrl?.split('/').pop()}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Briefcase size={18} style={{ color: 'var(--gold)' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Offre postulée</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Intitulé</div>
                <div style={{ fontWeight: 500 }}>{candidature.offre.intitule}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Référence</div>
                <div>{candidature.offre.reference}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Type de contrat</div>
                <Badge variant="gold">{candidature.offre.typeContrat}</Badge>
              </div>
              {niveauPoste && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Niveau du poste</div>
                  <Badge variant="olive">{niveauPoste.replace('_', ' ')}</Badge>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Scores IA */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <CardTitle>Analyse IA - Matching candidature</CardTitle>
          <CardSubtitle>Score calculé automatiquement à partir du CV</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Score global</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--gold)' }}>{candidature.scoreGlobal}%</div>
              <ScoreBar label="" value={candidature.scoreGlobal} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Score expérience</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--olive)' }}>{candidature.scoreExp}%</div>
              <ScoreBar label="" value={candidature.scoreExp} />
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Compétences détectées</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {candidature.competencesDetectees.map((c) => (
                <span key={c} style={{ background: 'var(--olive-bg)', color: 'var(--olive)', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Compétences manquantes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {candidature.competencesManquantes.map((c) => (
                <span key={c} style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Description offre */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <CardTitle>Description de l'offre</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5 }}>
            {candidature.offre.description || 'Aucune description disponible'}
          </div>
          {candidature.offre.profilRecherche && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Profil recherché</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{candidature.offre.profilRecherche}</div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Entretiens existants */}
      {candidature.entretiens && candidature.entretiens.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Entretiens planifiés</CardTitle>
          </CardHeader>
          <CardBody>
            {candidature.entretiens.map((e) => (
              <div key={e.id} style={{ padding: 12, borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>
                    <Badge variant="gold" style={{ marginRight: 8 }}>{e.type}</Badge>
                    {new Date(e.date).toLocaleDateString('fr-FR')} à {e.heure}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Lieu: {e.lieu}
                  </div>
                  {e.feedback && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Feedback: {e.feedback}
                    </div>
                  )}
                </div>
                <Badge variant={e.statut === 'REALISE' ? 'green' : 'amber'}>{e.statut}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Contrat */}
      {candidature.contrat && (
        <Card>
          <CardHeader>
            <CardTitle>Contrat</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{candidature.contrat.reference}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Statut: {candidature.contrat.statut}</div>
              </div>
              <Button variant="secondary" size="sm">Voir le contrat</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal de planification */}
      {showPlanifierModal && (
        <PlanifierEntretienModal
          open={showPlanifierModal}
          onClose={() => setShowPlanifierModal(false)}
          onSuccess={() => {
            setShowPlanifierModal(false);
            fetchCandidature();
          }}
          defaultType={planifierType}
          candidature={{
            id: candidature.id,
            nom: candidature.nom,
            prenom: candidature.prenom,
            email: candidature.email,
            telephone: candidature.telephone,
            offre: {
              id: candidature.offre.id,
              intitule: candidature.offre.intitule,
              demande: candidature.offre.demande || { id: '', niveau: '' }
            }
          }}
        />
      )}
    </div>
  );
}