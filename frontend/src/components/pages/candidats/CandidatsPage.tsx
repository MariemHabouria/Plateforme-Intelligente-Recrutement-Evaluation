// frontend/src/components/pages/candidats/CandidatsPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Eye, Check, X, Calendar, Users, UserPlus, Sparkles } from 'lucide-react';
import { Card, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { ScoreBar } from '../../ui/ScoreBar';
import { Modal } from '../../ui/Modal';  // ✅ IMPORT MANQUANT
import { PlanifierEntretienModal } from '../entretiens/PlanifierEntretienModal';
import api from '../../../services/api';
import { matchingInverseService } from '../../../services/matchingInverse.service';

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
    demande?: {
      id: string;
      niveau: string;
    };
  } | null;
}

export function CandidatsPage() {
  const navigate = useNavigate();
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'actifs' | 'passifs'>('all');
  const [proposerOffreId, setProposerOffreId] = useState<string | null>(null);
  const [showProposerModal, setShowProposerModal] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [showPlanifierModal, setShowPlanifierModal] = useState(false);
  const [offresDisponibles, setOffresDisponibles] = useState<any[]>([]);

  useEffect(() => {
    fetchCandidatures();
    fetchOffresDisponibles();
  }, []);

  const fetchCandidatures = async () => {
    try {
      setLoading(true);
      const response = await api.get('/candidatures');
      const data = response.data.data;
      const candidats = Array.isArray(data) ? data : (data?.candidatures || []);
      setCandidatures(candidats);
    } catch (err) {
      console.error('Erreur chargement candidatures:', err);
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
      fetchCandidatures();
    } catch (err) {
      console.error('Erreur mise a jour statut:', err);
    }
  };

  const proposerCandidatPourOffre = async (candidatureId: string, offreId: string) => {
    try {
      await matchingInverseService.creerCandidaturesMatching(offreId, [candidatureId]);
      setError('');
      fetchCandidatures();
      alert('Candidat propose avec succes a l offre');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la proposition');
    }
  };

  const getStatutVariant = (statut: string): 'gold' | 'green' | 'red' | 'amber' | 'olive' => {
    const variants: Record<string, any> = {
      'NOUVELLE': 'amber',
      'PRESELECTIONNEE': 'olive',
      'ENTRETIEN': 'gold',
      'EN_COURS': 'gold',
      'ACCEPTEE': 'green',
      'REFUSEE': 'red',
      'ABANDONNEE': 'amber'
    };
    return variants[statut] || 'amber';
  };

  const getStatutLabel = (statut: string): string => {
    const labels: Record<string, string> = {
      'NOUVELLE': 'Nouvelle',
      'PRESELECTIONNEE': 'Pre-selectionnee',
      'ENTRETIEN': 'Entretien',
      'EN_COURS': 'En cours',
      'ACCEPTEE': 'Acceptee',
      'REFUSEE': 'Refusee',
      'ABANDONNEE': 'Abandonnee'
    };
    return labels[statut] || statut;
  };

  const openPlanifierModal = (candidature: Candidature) => {
    setSelectedCandidature(candidature);
    setShowPlanifierModal(true);
  };

  const openProposerModal = (candidature: Candidature) => {
    setSelectedCandidature(candidature);
    setShowProposerModal(true);
  };

  const getFilteredCandidatures = () => {
    if (filterType === 'actifs') {
      return candidatures.filter(c => c.offre !== null && c.offre !== undefined);
    }
    if (filterType === 'passifs') {
      return candidatures.filter(c => c.offre === null || c.offre === undefined);
    }
    return candidatures;
  };

  const filteredCandidatures = getFilteredCandidatures();
  const actifsCount = candidatures.filter(c => c.offre !== null && c.offre !== undefined).length;
  const passifsCount = candidatures.filter(c => c.offre === null || c.offre === undefined).length;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Chargement des candidatures...
      </div>
    );
  }

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Candidatures & IA</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {candidatures.length} candidature(s) au total
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => fetchCandidatures()}>
          <Filter size={13} /> Actualiser
        </Button>
      </div>

      {/* Filtres actifs/passifs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => setFilterType('all')}
          style={{
            padding: '6px 16px',
            borderRadius: 20,
            border: '1px solid var(--border)',
            background: filterType === 'all' ? 'var(--gold)' : 'transparent',
            color: filterType === 'all' ? 'white' : 'var(--text)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500
          }}
        >
          Tous ({candidatures.length})
        </button>
        <button
          onClick={() => setFilterType('actifs')}
          style={{
            padding: '6px 16px',
            borderRadius: 20,
            border: '1px solid var(--border)',
            background: filterType === 'actifs' ? 'var(--green)' : 'transparent',
            color: filterType === 'actifs' ? 'white' : 'var(--text)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500
          }}
        >
          <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
          Actifs ({actifsCount})
        </button>
        <button
          onClick={() => setFilterType('passifs')}
          style={{
            padding: '6px 16px',
            borderRadius: 20,
            border: '1px solid var(--border)',
            background: filterType === 'passifs' ? 'var(--olive)' : 'transparent',
            color: filterType === 'passifs' ? 'white' : 'var(--text)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500
          }}
        >
          <UserPlus size={12} style={{ display: 'inline', marginRight: 4 }} />
          Passifs ({passifsCount})
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="red">{error}</Alert>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <Alert variant="gold">
          <strong>Matching IA :</strong> Les scores sont calcules automatiquement. Les candidats passifs (sans offre) sont disponibles pour le matching inverse.
        </Alert>
      </div>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Candidat</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Offre</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Score global</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Score exp.</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Competences</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Statut</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidatures.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {filterType === 'passifs' 
                        ? 'Aucun candidat passif disponible pour le matching inverse'
                        : filterType === 'actifs'
                        ? 'Aucun candidat actif (ayant postule)'
                        : 'Aucune candidature pour le moment'}
                    </td>
                  </tr>
                ) : (
                  filteredCandidatures.map((c) => {
                    const isPassif = !c.offre || c.offre === null;
                    return (
                      <tr
                        key={c.id}
                        style={{ 
                          borderBottom: '1px solid var(--border-light)', 
                          transition: 'background .15s',
                          background: isPassif ? 'rgba(90, 122, 58, 0.05)' : 'transparent'
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isPassif ? 'rgba(90, 122, 58, 0.05)' : ''}
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
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>
                          {isPassif ? (
                            <div>
                              <Badge variant="olive">Candidature spontanee</Badge>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Disponible pour matching inverse</div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 500 }}>{c.offre?.intitule || '-'}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.offre?.reference || '-'}</div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>
                          {new Date(c.dateSoumission).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: 110 }}>
                          <ScoreBar label="" value={c.scoreGlobal} />
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', marginTop: -2 }}>{c.scoreGlobal}%</div>
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: 100 }}>
                          <ScoreBar label="" value={c.scoreExp} />
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', marginTop: -2 }}>{c.scoreExp}%</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {c.competencesDetectees?.slice(0, 3).map((k) => (
                              <span key={k} style={{ background: 'var(--olive-bg)', color: 'var(--olive)', padding: '2px 7px', borderRadius: 12, fontSize: 10, fontWeight: 500 }}>{k}</span>
                            ))}
                            {c.competencesDetectees?.length > 3 && (
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{c.competencesDetectees.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={getStatutVariant(c.statut)}>
                            {getStatutLabel(c.statut)}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Button 
                              variant="ghost" 
                              size="xs" 
                              onClick={() => navigate(`/candidats/${c.id}`)} 
                              title="Voir details"
                            >
                              <Eye size={12} />
                            </Button>
                            
                            {/* Actions pour candidats ACTIFS */}
                            {!isPassif && (
                              <>
                                {c.statut === 'PRESELECTIONNEE' && (
                                  <Button 
                                    variant="primary" 
                                    size="xs" 
                                    onClick={() => openPlanifierModal(c)} 
                                    title="Planifier entretien"
                                  >
                                    <Calendar size={12} />
                                  </Button>
                                )}
                                {c.statut === 'NOUVELLE' && (
                                  <Button 
                                    variant="success" 
                                    size="xs" 
                                    onClick={() => updateStatut(c.id, 'PRESELECTIONNEE')} 
                                    title="Pre-selectionner"
                                  >
                                    <Check size={12} />
                                  </Button>
                                )}
                                {c.statut !== 'REFUSEE' && c.statut !== 'ACCEPTEE' && c.statut !== 'ENTRETIEN' && (
                                  <Button 
                                    variant="danger" 
                                    size="xs" 
                                    onClick={() => updateStatut(c.id, 'REFUSEE')} 
                                    title="Refuser"
                                  >
                                    <X size={12} />
                                  </Button>
                                )}
                              </>
                            )}
                            
                            {/* Actions pour candidats PASSIFS */}
                            {isPassif && (
                              <Button 
                                variant="primary" 
                                size="xs" 
                                onClick={() => openProposerModal(c)} 
                                title="Proposer a une offre"
                              >
                                <Sparkles size={12} />
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

      {/* Modal de planification d'entretien */}
      {selectedCandidature && selectedCandidature.offre && (
        <PlanifierEntretienModal
          open={showPlanifierModal}
          onClose={() => {
            setShowPlanifierModal(false);
            setSelectedCandidature(null);
          }}
          onSuccess={() => {
            fetchCandidatures();
            setShowPlanifierModal(false);
            setSelectedCandidature(null);
          }}
          candidature={{
            id: selectedCandidature.id,
            nom: selectedCandidature.nom,
            prenom: selectedCandidature.prenom,
            email: selectedCandidature.email,
            telephone: selectedCandidature.telephone,
            offre: selectedCandidature.offre
          }}
          defaultType="TECHNIQUE"  
        />
      )}

      {/* Modal pour proposer un candidat passif a une offre */}
      <Modal
        open={showProposerModal}
        onClose={() => {
          setShowProposerModal(false);
          setSelectedCandidature(null);
          setProposerOffreId(null);
        }}
        title="Proposer le candidat a une offre"
        maxWidth={500}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowProposerModal(false)}>Annuler</Button>
            <Button 
              variant="primary" 
              onClick={() => {
                if (selectedCandidature && proposerOffreId) {
                  proposerCandidatPourOffre(selectedCandidature.id, proposerOffreId);
                  setShowProposerModal(false);
                  setProposerOffreId(null);
                }
              }}
              disabled={!proposerOffreId}
            >
              Proposer
            </Button>
          </div>
        }
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: 16 }}>
            Selectionnez l'offre pour laquelle vous souhaitez proposer <strong>{selectedCandidature?.prenom} {selectedCandidature?.nom}</strong>
          </p>
          <select
            value={proposerOffreId || ''}
            onChange={(e) => setProposerOffreId(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
          >
            <option value="">-- Selectionner une offre --</option>
            {offresDisponibles.map((offre) => (
              <option key={offre.id} value={offre.id}>
                {offre.reference} - {offre.intitule}
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}