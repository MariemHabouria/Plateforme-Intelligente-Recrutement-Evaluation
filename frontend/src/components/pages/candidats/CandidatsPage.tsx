// frontend/src/components/pages/candidats/CandidatsPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Check, X, Users, Sparkles, FileText, Send, Clock, RefreshCw, LayoutList } from 'lucide-react';
import { Card, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { ScoreBar } from '../../ui/ScoreBar';
import { Modal } from '../../ui/Modal';
import api from '../../../services/api';
import { matchingInverseService } from '../../../services/matchingInverse.service';
import { CandidatPassifDetailModal } from '../offres/CandidatPassifDetailModal';

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
  offre?: {
    id: string;
    reference: string;
    intitule: string;
    demande?: { id: string; niveau: string };
  } | null;
  ficheRenseignementEnvoyee?: boolean;
  ficheRenseignementRecue?: boolean;
  ficheRenseignementData?: any;
}

// MATCHING_INVERSE est un statut, pas un type structurel
type Tab = 'actifs' | 'matching' | 'tous';
type BadgeVariant = 'gold' | 'green' | 'red' | 'amber' | 'olive';

export function CandidatsPage() {
  const navigate = useNavigate();
  const [candidatures, setCandidatures]           = useState<Candidature[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState('');
  const [activeTab, setActiveTab]                 = useState<Tab>('actifs');
  const [filterStatut, setFilterStatut]           = useState('all');
  const [proposerOffreId, setProposerOffreId]     = useState<string | null>(null);
  const [showProposerModal, setShowProposerModal] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [offresDisponibles, setOffresDisponibles] = useState<any[]>([]);
  const [showFicheModal, setShowFicheModal]       = useState(false);
  const [ficheData, setFicheData]                 = useState<any>(null);
  const [currentCandidat, setCurrentCandidat]     = useState<Candidature | null>(null);
  const [showDetailModal, setShowDetailModal]     = useState(false);
  const [detailId, setDetailId]                   = useState<string | null>(null);
  const [detailNom, setDetailNom]                 = useState('');

  useEffect(() => { fetchCandidatures(); fetchOffresDisponibles(); }, []);

  const fetchCandidatures = async () => {
    try {
      setLoading(true);
      const response = await api.get('/candidatures');
      const data = response.data.data;
      setCandidatures(Array.isArray(data) ? data : (data?.candidatures || []));
    } catch (err) {
      setError('Erreur lors du chargement des candidatures');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffresDisponibles = async () => {
    try {
      const response = await api.get('/offres?statut=PUBLIEE');
      setOffresDisponibles(response.data.data.offres || []);
    } catch (err) {
      console.error('Erreur chargement offres:', err);
    }
  };

  const updateStatut = async (id: string, newStatut: string) => {
    try {
      await api.patch(`/candidatures/${id}/statut`, { statut: newStatut });
      await fetchCandidatures();
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
    }
  };

  const envoyerFicheRenseignement = async (candidatureId: string) => {
    try {
      await api.post(`/candidatures/${candidatureId}/envoyer-fiche`);
      alert('Fiche envoyée avec succès');
      await fetchCandidatures();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l\'envoi de la fiche');
    }
  };

  const voirFicheRenseignement = async (candidature: Candidature) => {
    try {
      setCurrentCandidat(candidature);
      const response = await api.get(`/candidatures/${candidature.id}`);
      const data = response.data.data.candidature;
      setFicheData(data.ficheRenseignementData || null);
      setShowFicheModal(true);
    } catch (err) {
      alert('Erreur lors du chargement de la fiche');
    }
  };

  const proposerCandidatPourOffre = async (candidatureId: string, offreId: string) => {
    try {
      await matchingInverseService.creerCandidaturesMatching(offreId, [candidatureId]);
      await fetchCandidatures();
      setShowProposerModal(false);
      setProposerOffreId(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la proposition');
    }
  };

  const ouvrirDetail = (c: Candidature) => {
    setDetailId(c.id);
    setDetailNom(`${c.prenom} ${c.nom}`);
    setShowDetailModal(true);
  };

  const getStatutVariant = (statut: string): BadgeVariant => {
    const v: Record<string, BadgeVariant> = {
      NOUVELLE: 'amber', PRESELECTIONNEE: 'olive', FICHE_ENVOYEE: 'amber',
      FICHE_RECUE: 'green', ENTRETIEN: 'gold', ACCEPTEE: 'green', REFUSEE: 'red',
      MATCHING_INVERSE: 'gold',
    };
    return v[statut] || 'amber';
  };

  const getStatutLabel = (statut: string) => ({
    NOUVELLE:         'Nouvelle',
    PRESELECTIONNEE:  'Pré-sélectionnée',
    FICHE_ENVOYEE:    'Fiche envoyée',
    FICHE_RECUE:      'Fiche reçue',
    ENTRETIEN:        'Entretien',
    ACCEPTEE:         'Acceptée',
    REFUSEE:          'Refusée',
    MATCHING_INVERSE: 'Via matching',
  }[statut] || statut);

  // ── Segmentation : MATCHING_INVERSE est un statut, pas une absence d'offre ──
  // Actifs  = toutes les candidatures postulées normalement (hors matching inverse)
  // Matching = candidatures créées via le matching inverse (nouvelle candidature sur offre différente)
  const actifs   = candidatures.filter(c => c.statut !== 'MATCHING_INVERSE');
  const matching = candidatures.filter(c => c.statut === 'MATCHING_INVERSE');

  // Ranking actifs par score (toutes offres confondues)
  const rankMap: Record<string, number> = {};
  [...actifs].sort((a, b) => b.scoreGlobal - a.scoreGlobal).forEach((c, i) => { rankMap[c.id] = i + 1; });

  const getRangStyle = (rang: number) => {
    if (rang === 1) return { background: '#fbbf24', color: 'white' };
    if (rang === 2) return { background: '#9ca3af', color: 'white' };
    if (rang === 3) return { background: '#d97706', color: 'white' };
    return { background: 'var(--surface)', color: 'var(--text-muted)' };
  };

  const actifsFiltered = actifs
    .filter(c => filterStatut === 'all' || c.statut === filterStatut)
    .sort((a, b) => (rankMap[a.id] ?? 999) - (rankMap[b.id] ?? 999));

  const statutOptions = [
    { value: 'all',             label: 'Tous les statuts' },
    { value: 'NOUVELLE',        label: 'Nouvelle' },
    { value: 'PRESELECTIONNEE', label: 'Pré-sélectionnée' },
    { value: 'FICHE_ENVOYEE',   label: 'Fiche envoyée' },
    { value: 'FICHE_RECUE',     label: 'Fiche reçue' },
    { value: 'ENTRETIEN',       label: 'Entretien' },
    { value: 'ACCEPTEE',        label: 'Acceptée' },
    { value: 'REFUSEE',         label: 'Refusée' },
  ];

  const TAB_STYLE = (active: boolean, color = 'var(--gold)') => ({
    padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, transition: 'all .15s',
    background: active ? color : 'transparent',
    color: active ? 'white' : 'var(--text)',
    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
  });

  // ── Composant de ligne candidat (réutilisé dans les deux tableaux) ──────────
  const CandidatRow = ({ c, showRang = false, showOffre = false, showProposer = false }: {
    c: Candidature;
    showRang?: boolean;
    showOffre?: boolean;
    showProposer?: boolean;
  }) => {
    const rang              = rankMap[c.id] ?? null;
    const isFicheEnvoyee    = c.statut === 'FICHE_ENVOYEE';
    const isFicheRecue      = c.statut === 'FICHE_RECUE';
    const isPreselectionnee = c.statut === 'PRESELECTIONNEE';
    const isMatching        = c.statut === 'MATCHING_INVERSE';

    return (
      <tr
        style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
      >
        {/* Rang (onglet actifs uniquement) */}
        {showRang && (
          <td style={{ padding: '12px 16px', width: 52 }}>
            {rang !== null ? (
              <div style={{
                width: 28, height: 28, borderRadius: '50%', margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, border: '1px solid var(--border-light)',
                ...getRangStyle(rang),
              }}>{rang}</div>
            ) : <span style={{ color: 'var(--text-muted)', fontSize: 12, paddingLeft: 8 }}>—</span>}
          </td>
        )}

        {/* Candidat */}
        <td style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={`${c.prenom} ${c.nom}`} size="sm" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.prenom} {c.nom}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
              {c.telephone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.telephone}</div>}
            </div>
          </div>
        </td>

        {/* Offre */}
        {showOffre && (
          <td style={{ padding: '12px 16px', fontSize: 12, maxWidth: 200 }}>
            {c.offre ? (
              <>
                <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.offre.intitule}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.offre.reference}</div>
              </>
            ) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
          </td>
        )}

        {/* Score global */}
        <td style={{ padding: '12px 16px', minWidth: 100 }}>
          {c.scoreGlobal > 0 ? (
            <>
              <ScoreBar label="" value={c.scoreGlobal} />
              <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'right', marginTop: -2 }}>{c.scoreGlobal}%</div>
            </>
          ) : <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
        </td>

        {/* Score exp */}
        <td style={{ padding: '12px 16px', minWidth: 90 }}>
          {c.scoreExp > 0 ? (
            <>
              <ScoreBar label="" value={c.scoreExp} />
              <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'right', marginTop: -2 }}>{c.scoreExp}%</div>
            </>
          ) : <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
        </td>

        {/* Statut */}
        <td style={{ padding: '12px 16px' }}>
          <Badge variant={getStatutVariant(c.statut)}>{getStatutLabel(c.statut)}</Badge>
          {isFicheEnvoyee && !c.ficheRenseignementRecue && (
            <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 4 }}>
              <Clock size={10} style={{ display: 'inline' }} /> En attente
            </div>
          )}
          {isFicheRecue && (
            <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 4 }}>Reçue ✓</div>
          )}
        </td>

        {/* Actions */}
        <td style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="xs" onClick={() => navigate(`/candidats/${c.id}`)} title="Voir détails">
              <Eye size={12} />
            </Button>

            {/* Pré-sélectionner (NOUVELLE ou MATCHING_INVERSE entrant) */}
            {(c.statut === 'NOUVELLE' || isMatching) && (
              <Button variant="success" size="xs" onClick={() => updateStatut(c.id, 'PRESELECTIONNEE')} title="Pré-sélectionner">
                <Check size={12} />
              </Button>
            )}

            {/* Envoyer fiche */}
            {isPreselectionnee && (
              <Button variant="primary" size="xs" onClick={() => envoyerFicheRenseignement(c.id)} title="Envoyer fiche">
                <Send size={12} />
              </Button>
            )}

            {/* Voir fiche */}
            {(isFicheEnvoyee || isFicheRecue) && (
              <Button variant="secondary" size="xs" onClick={() => voirFicheRenseignement(c)} title="Voir fiche" disabled={!c.ficheRenseignementRecue}>
                <FileText size={12} />
              </Button>
            )}

            {/* Proposer sur une autre offre */}
            {showProposer && (
              <Button variant="primary" size="xs"
                onClick={() => { setSelectedCandidature(c); setShowProposerModal(true); }}
                title="Proposer à une autre offre">
                <Sparkles size={12} />
              </Button>
            )}

            {/* Refuser */}
            {!['REFUSEE', 'ACCEPTEE', 'ENTRETIEN', 'FICHE_ENVOYEE', 'FICHE_RECUE'].includes(c.statut) && (
              <Button variant="danger" size="xs" onClick={() => updateStatut(c.id, 'REFUSEE')} title="Refuser">
                <X size={12} />
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;

  return (
    <div className="page-fade">

      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Candidatures</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>{actifs.length}</span> actives ·{' '}
            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{matching.length}</span> via matching ·{' '}
            {candidatures.length} au total
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchCandidatures}>
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>

      {/* ── Onglets ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--surface)', padding: 6, borderRadius: 24, width: 'fit-content' }}>
        <button style={TAB_STYLE(activeTab === 'actifs', '#16a34a')} onClick={() => { setActiveTab('actifs'); setFilterStatut('all'); }}>
          <Users size={13} style={{ display: 'inline', marginRight: 6 }} />
          Candidatures actives ({actifs.length})
        </button>
        <button style={TAB_STYLE(activeTab === 'matching', '#d97706')} onClick={() => setActiveTab('matching')}>
          <Sparkles size={13} style={{ display: 'inline', marginRight: 6 }} />
          Via matching ({matching.length})
        </button>
        <button style={TAB_STYLE(activeTab === 'tous', '#6b7280')} onClick={() => setActiveTab('tous')}>
          <LayoutList size={13} style={{ display: 'inline', marginRight: 6 }} />
          Tout voir ({candidatures.length})
        </button>
      </div>

      {error && <div style={{ marginBottom: 16 }}><Alert variant="red">{error}</Alert></div>}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ONGLET ACTIFS                                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'actifs' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Statut :</span>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)', fontSize: 12, background: 'white', cursor: 'pointer' }}>
              {statutOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {filterStatut !== 'all' && (
              <button onClick={() => setFilterStatut('all')}
                style={{ padding: '4px 10px', borderRadius: 20, border: 'none', background: 'var(--surface)', fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)' }}>
                Effacer
              </button>
            )}
          </div>

          <Card>
            <CardBody style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                      {['Rang', 'Candidat', 'Offre', 'Score', 'Exp.', 'Statut', 'Actions'].map(h => (
                        <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actifsFiltered.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Aucune candidature active</td></tr>
                    ) : actifsFiltered.map(c => (
                      <CandidatRow key={c.id} c={c} showRang showOffre showProposer />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ONGLET MATCHING INVERSE                                   */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'matching' && (
        <>
          <div style={{ marginBottom: 16, padding: 12, background: 'rgba(217,119,6,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--gold)' }}>
            <Sparkles size={14} style={{ display: 'inline', marginRight: 6 }} />
            Ces candidats ont été détectés par le matching inverse à partir d'une autre candidature et positionnés sur une offre par le RH. Ils suivent le même circuit de traitement que les candidatures classiques.
          </div>

          <Card>
            <CardBody style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                      {['Candidat', 'Offre cible', 'Score', 'Exp.', 'Statut', 'Actions'].map(h => (
                        <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matching.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        Aucune candidature créée par matching inverse
                      </td></tr>
                    ) : matching.map(c => (
                      <CandidatRow key={c.id} c={c} showOffre />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ONGLET TOUS                                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'tous' && (
        <Card>
          <CardBody style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    {['Candidat', 'Type', 'Offre', 'Score', 'Exp.', 'Statut', 'Actions'].map(h => (
                      <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidatures.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Aucune candidature</td></tr>
                  ) : candidatures.map(c => {
                    const isMatching = c.statut === 'MATCHING_INVERSE';
                    return (
                      <tr key={c.id}
                        style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={`${c.prenom} ${c.nom}`} size="sm" />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.prenom} {c.nom}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={isMatching ? 'gold' : 'green'}>
                            {isMatching ? 'Via matching' : 'Classique'}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, maxWidth: 180 }}>
                          {c.offre ? (
                            <>
                              <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.offre.intitule}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.offre.reference}</div>
                            </>
                          ) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: 100 }}>
                          {c.scoreGlobal > 0 ? (
                            <>
                              <ScoreBar label="" value={c.scoreGlobal} />
                              <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'right', marginTop: -2 }}>{c.scoreGlobal}%</div>
                            </>
                          ) : <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: 90 }}>
                          {c.scoreExp > 0 ? (
                            <>
                              <ScoreBar label="" value={c.scoreExp} />
                              <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'right', marginTop: -2 }}>{c.scoreExp}%</div>
                            </>
                          ) : <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={getStatutVariant(c.statut)}>{getStatutLabel(c.statut)}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Button variant="ghost" size="xs" onClick={() => navigate(`/candidats/${c.id}`)}>
                            <Eye size={12} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Modal proposer à une offre ───────────────────────────── */}
      <Modal
        open={showProposerModal}
        onClose={() => { setShowProposerModal(false); setSelectedCandidature(null); setProposerOffreId(null); }}
        title={`Proposer ${selectedCandidature?.prenom} ${selectedCandidature?.nom} à une offre`}
        maxWidth={500}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowProposerModal(false)}>Annuler</Button>
            <Button variant="primary" disabled={!proposerOffreId}
              onClick={() => { if (selectedCandidature && proposerOffreId) proposerCandidatPourOffre(selectedCandidature.id, proposerOffreId); }}>
              <Sparkles size={13} /> Proposer
            </Button>
          </div>
        }
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            Sélectionnez l'offre sur laquelle vous souhaitez positionner ce candidat.
          </p>
          <select value={proposerOffreId || ''} onChange={e => setProposerOffreId(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
            <option value="">-- Sélectionner une offre --</option>
            {offresDisponibles
              .filter(o => o.id !== selectedCandidature?.offre?.id)
              .map(offre => (
                <option key={offre.id} value={offre.id}>{offre.reference} — {offre.intitule}</option>
              ))}
          </select>
        </div>
      </Modal>

      {/* ── Modal détail candidat (matching) ─────────────────────── */}
      {showDetailModal && detailId && (
        <CandidatPassifDetailModal
          open={showDetailModal}
          onClose={() => { setShowDetailModal(false); setDetailId(null); }}
          candidatureId={detailId}
          candidatNom={detailNom}
        />
      )}

      {/* ── Modal fiche de renseignement ─────────────────────────── */}
      <Modal
        open={showFicheModal}
        onClose={() => { setShowFicheModal(false); setFicheData(null); setCurrentCandidat(null); }}
        title={`Fiche de renseignement — ${currentCandidat?.prenom} ${currentCandidat?.nom}`}
        maxWidth={800}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setShowFicheModal(false)}>Fermer</Button></div>}
      >
        {ficheData ? (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: 16 }}>
            {[
              { title: 'Informations personnelles', fields: [
                ['Date naissance', ficheData.dateNaissance], ['Lieu naissance', ficheData.lieuNaissance],
                ['Nationalité', ficheData.nationalite], ['Situation familiale', ficheData.situationFamiliale],
                ['Civilité', ficheData.civilite], ['Adresse', ficheData.adresse],
                ['Ville', ficheData.ville], ['Téléphone', ficheData.telephone || ficheData.mobile],
                ['Email', ficheData.email],
              ]},
              { title: 'Situation professionnelle', fields: [
                ['Employeur actuel', ficheData.employeurActuel], ['Poste actuel', ficheData.posteActuel],
                ['Ancienneté', ficheData.anciennete], ['Disponibilité', ficheData.disponibilite],
                ['Salaire souhaité', ficheData.salaireSouhaite],
              ]},
              { title: 'Formation & Compétences', fields: [
                ['Niveau études', ficheData.niveauEtudes], ['Diplômes', ficheData.diplomes],
                ['Permis', ficheData.permis],
              ]},
            ].map(section => (
              <div key={section.title} style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  {section.title}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {section.fields.map(([label, value]) => (
                    <div key={label as string}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
                      <div style={{ fontSize: 13, marginTop: 2 }}>{(value as string) || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune fiche disponible</div>
        )}
      </Modal>
    </div>
  );
}