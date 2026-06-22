// frontend/src/components/pages/offres/OffreCandidatsPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Check, X, Send, FileText, Clock, RefreshCw, Users, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { ScoreBar } from '../../ui/ScoreBar';
import { Modal } from '../../ui/Modal';
import api from '../../../services/api';

interface Candidature {
  id: string;
  reference: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  scoreGlobal: number;
  scoreExp: number;
  competencesDetectees: string[];
  competencesManquantes: string[];
  statut: string;
  dateSoumission: string;
  ficheRenseignementRecue?: boolean;
  ficheRenseignementEnvoyee?: boolean;
}

interface Offre {
  id: string;
  reference: string;
  intitule: string;
  statut: string;
}

interface ClassificationResult {
  total: number;
  seuils: {
    entretien: number;
    preselection: number;
    nouvelle: number;
    plancher: number;
  };
  resume: {
    ENTRETIEN: number;
    PRESELECTIONNEE: number;
    NOUVELLE: number;
    REFUSEE: number;
  };
}

type BadgeVariant = 'gold' | 'green' | 'red' | 'amber' | 'olive';

interface OffreCandidatsPageProps {
  offreId: string;
}

export function OffreCandidatsPage({ offreId }: OffreCandidatsPageProps) {
  const navigate = useNavigate();
  const [offre, setOffre]                       = useState<Offre | null>(null);
  const [candidatures, setCandidatures]         = useState<Candidature[]>([]);
  const [rankMap, setRankMap]                   = useState<Record<string, number>>({});
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState('');
  const [filterStatut, setFilterStatut]         = useState('all');
  const [classifying, setClassifying]           = useState(false);
  const [classifResult, setClassifResult]       = useState<ClassificationResult | null>(null);
  const [showClassifModal, setShowClassifModal] = useState(false);

  useEffect(() => { fetchData(); }, [offreId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [offreRes, candRes] = await Promise.all([
        api.get(`/offres/${offreId}`),
        api.get(`/candidatures?offreId=${offreId}`),
      ]);
      setOffre(offreRes.data.data);
      const data  = candRes.data.data;
      const cands: Candidature[] = Array.isArray(data) ? data : (data?.candidatures || []);
      setCandidatures(cands);

      // Calcul du rang par score décroissant (toutes candidatures confondues)
      const sorted = [...cands].sort((a, b) => b.scoreGlobal - a.scoreGlobal);
      const map: Record<string, number> = {};
      sorted.forEach((c, i) => { map[c.id] = i + 1; });
      setRankMap(map);
    } catch (err: any) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (id: string, newStatut: string) => {
    try {
      await api.patch(`/candidatures/${id}/statut`, { statut: newStatut });
      await fetchData();
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
    }
  };

  const envoyerFiche = async (id: string) => {
    try {
      await api.post(`/candidatures/${id}/envoyer-fiche`);
      alert('Fiche envoyée avec succès');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur envoi fiche');
    }
  };

  const handleClassifierAuto = async () => {
    setClassifying(true);
    setError('');
    try {
      const res = await api.post(`/candidatures/offre/${offreId}/classifier`);
      setClassifResult(res.data.data);
      setShowClassifModal(true);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la classification');
    } finally {
      setClassifying(false);
    }
  };

  const getStatutVariant = (statut: string): BadgeVariant => {
    const variants: Record<string, BadgeVariant> = {
      'NOUVELLE':        'amber',
      'PRESELECTIONNEE': 'olive',
      'FICHE_ENVOYEE':   'amber',
      'FICHE_RECUE':     'green',
      'ENTRETIEN':       'gold',
      'ACCEPTEE':        'green',
      'REFUSEE':         'red',
    };
    return variants[statut] || 'amber';
  };

  const getStatutLabel = (statut: string): string => {
    const labels: Record<string, string> = {
      'NOUVELLE':        'Nouvelle',
      'PRESELECTIONNEE': 'Pré-sélectionnée',
      'FICHE_ENVOYEE':   'Fiche envoyée',
      'FICHE_RECUE':     'Fiche reçue',
      'ENTRETIEN':       'Entretien',
      'ACCEPTEE':        'Acceptée',
      'REFUSEE':         'Refusée',
    };
    return labels[statut] || statut;
  };

  const getRangStyle = (rang: number) => {
    if (rang === 1) return { background: '#fbbf24', color: 'white' };
    if (rang === 2) return { background: '#9ca3af', color: 'white' };
    if (rang === 3) return { background: '#d97706', color: 'white' };
    return { background: 'var(--surface)', color: 'var(--text-muted)' };
  };

  // Filtrage + tri par rang
  const filtered = [...candidatures]
    .filter(c => filterStatut === 'all' || c.statut === filterStatut)
    .sort((a, b) => (rankMap[a.id] ?? 999) - (rankMap[b.id] ?? 999));

  const statutOptions = [
    { value: 'all',             label: `Tous (${candidatures.length})` },
    { value: 'NOUVELLE',        label: `Nouvelle (${candidatures.filter(c => c.statut === 'NOUVELLE').length})` },
    { value: 'PRESELECTIONNEE', label: `Pré-sélectionnée (${candidatures.filter(c => c.statut === 'PRESELECTIONNEE').length})` },
    { value: 'ENTRETIEN',       label: `Entretien (${candidatures.filter(c => c.statut === 'ENTRETIEN').length})` },
    { value: 'FICHE_ENVOYEE',   label: `Fiche envoyée (${candidatures.filter(c => c.statut === 'FICHE_ENVOYEE').length})` },
    { value: 'FICHE_RECUE',     label: `Fiche reçue (${candidatures.filter(c => c.statut === 'FICHE_RECUE').length})` },
    { value: 'ACCEPTEE',        label: `Acceptée (${candidatures.filter(c => c.statut === 'ACCEPTEE').length})` },
    { value: 'REFUSEE',         label: `Refusée (${candidatures.filter(c => c.statut === 'REFUSEE').length})` },
  ];

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;

  return (
    <div className="page-fade">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/offres')}>
            <ArrowLeft size={14} /> Retour
          </Button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{offre?.intitule || 'Candidats'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              <span style={{ fontFamily: 'monospace' }}>{offre?.reference}</span>
              {' · '}
              <Users size={12} style={{ display: 'inline', marginRight: 3 }} />
              {candidatures.length} candidature(s)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw size={14} />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleClassifierAuto}
            disabled={classifying || candidatures.length === 0}
            title="Classification automatique S3 (percentile dynamique)"
          >
            {classifying
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Classification...</>
              : <><Sparkles size={13} /> Classifier automatiquement</>
            }
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="red">{error}</Alert>
        </div>
      )}

      {/* Filtre statut */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Statut :</span>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)', fontSize: 12, background: 'white', cursor: 'pointer' }}
        >
          {statutOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {filterStatut !== 'all' && (
          <button
            onClick={() => setFilterStatut('all')}
            style={{ padding: '4px 10px', borderRadius: 20, border: 'none', background: 'var(--surface)', fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            Effacer
          </button>
        )}
      </div>

      {/* Tableau */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Rang', 'Candidat', 'Date', 'Score global', 'Score exp.', 'Compétences', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Aucune candidature trouvée
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => {
                    const rang             = rankMap[c.id] ?? '—';
                    const isPreselectionnee = c.statut === 'PRESELECTIONNEE';
                    const isFicheEnvoyee    = c.statut === 'FICHE_ENVOYEE';
                    const isFicheRecue      = c.statut === 'FICHE_RECUE';

                    return (
                      <tr
                        key={c.id}
                        style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                      >
                        {/* Rang */}
                        <td style={{ padding: '12px 16px', textAlign: 'center', width: 56 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 12, margin: '0 auto',
                            border: '1px solid var(--border-light)',
                            ...getRangStyle(typeof rang === 'number' ? rang : 999),
                          }}>
                            {rang}
                          </div>
                        </td>

                        {/* Candidat */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={`${c.prenom} ${c.nom}`} size="sm" />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.prenom} {c.nom}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(c.dateSoumission).toLocaleDateString('fr-FR')}
                        </td>

                        {/* Score global */}
                        <td style={{ padding: '12px 16px', minWidth: 110 }}>
                          <ScoreBar label="" value={c.scoreGlobal} />
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', marginTop: -2 }}>
                            {c.scoreGlobal}%
                          </div>
                        </td>

                        {/* Score exp */}
                        <td style={{ padding: '12px 16px', minWidth: 100 }}>
                          <ScoreBar label="" value={c.scoreExp} />
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', marginTop: -2 }}>
                            {c.scoreExp}%
                          </div>
                        </td>

                        {/* Compétences */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {c.competencesDetectees?.slice(0, 3).map(k => (
                              <span key={k} style={{ background: 'var(--olive-bg)', color: 'var(--olive)', padding: '2px 7px', borderRadius: 12, fontSize: 10, fontWeight: 500 }}>
                                {k}
                              </span>
                            ))}
                            {c.competencesDetectees?.length > 3 && (
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                +{c.competencesDetectees.length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Statut */}
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={getStatutVariant(c.statut)}>
                            {getStatutLabel(c.statut)}
                          </Badge>
                          {isFicheEnvoyee && !c.ficheRenseignementRecue && (
                            <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 4 }}>
                              <Clock size={10} style={{ display: 'inline' }} /> En attente
                            </div>
                          )}
                          {isFicheRecue && (
                            <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 4 }}>
                              Formulaire reçu
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Button variant="ghost" size="xs" onClick={() => navigate(`/candidats/${c.id}`)} title="Voir détails">
                              <Eye size={12} />
                            </Button>

                            {c.statut === 'NOUVELLE' && (
                              <Button variant="success" size="xs" onClick={() => updateStatut(c.id, 'PRESELECTIONNEE')} title="Pré-sélectionner">
                                <Check size={12} />
                              </Button>
                            )}

                            {isPreselectionnee && (
                              <Button variant="primary" size="xs" onClick={() => envoyerFiche(c.id)} title="Envoyer fiche">
                                <Send size={12} />
                              </Button>
                            )}

                            {(isFicheEnvoyee || isFicheRecue) && (
                              <Button variant="secondary" size="xs" onClick={() => navigate(`/candidats/${c.id}`)} title="Voir fiche" disabled={!c.ficheRenseignementRecue}>
                                <FileText size={12} />
                              </Button>
                            )}

                            {!['REFUSEE', 'ACCEPTEE', 'ENTRETIEN', 'FICHE_ENVOYEE', 'FICHE_RECUE'].includes(c.statut) && (
                              <Button variant="danger" size="xs" onClick={() => updateStatut(c.id, 'REFUSEE')} title="Refuser">
                                <X size={12} />
                              </Button>
                            )}
                          </div>
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

      {/* Modal résultat classification */}
      <Modal
        open={showClassifModal}
        onClose={() => setShowClassifModal(false)}
        title="Classification automatique — Résultats"
        maxWidth={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={() => setShowClassifModal(false)}>Fermer</Button>
          </div>
        }
      >
        {classifResult && (
          <div style={{ padding: '8px 0' }}>
            {/* Résumé */}
            <div style={{ marginBottom: 20, padding: 12, background: 'rgba(172,107,46,0.08)', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                <Sparkles size={14} style={{ display: 'inline', marginRight: 6, color: 'var(--gold)' }} />
                {classifResult.total} candidature(s) classifiées — Stratégie S3 (Percentile)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Seuils calculés dynamiquement sur la distribution du pool
              </div>
            </div>

            {/* Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Entretien',        count: classifResult.resume.ENTRETIEN,       color: '#16a34a' },
                { label: 'Pré-sélectionnée', count: classifResult.resume.PRESELECTIONNEE, color: '#2563eb' },
                { label: 'Nouvelle',          count: classifResult.resume.NOUVELLE,        color: '#d97706' },
                { label: 'Refusée',           count: classifResult.resume.REFUSEE,         color: '#dc2626' },
              ].map(item => (
                <div key={item.label} style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${item.color}22`, background: `${item.color}0d` }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.count}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Seuils utilisés */}
            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>
                SEUILS CALCULÉS SUR CE POOL
              </div>
              {[
                { label: 'Entretien (85e percentile)',      value: classifResult.seuils.entretien },
                { label: 'Pré-sélection (60e percentile)', value: classifResult.seuils.preselection },
                { label: 'Nouvelle (35e percentile)',       value: classifResult.seuils.nouvelle },
                { label: 'Plancher absolu',                 value: classifResult.seuils.plancher },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span>{s.label}</span>
                  <span style={{ fontWeight: 600 }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}