// frontend/src/components/pages/candidats/CandidatsPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Eye, Check, X, Calendar, Users, UserPlus, Sparkles, FileText, Send, Clock } from 'lucide-react';
import { Card, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { ScoreBar } from '../../ui/ScoreBar';
import { Modal } from '../../ui/Modal';
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
  ficheRenseignementEnvoyee?: boolean;
  ficheRenseignementRecue?: boolean;
  ficheRenseignementRecueAt?: string;
  ficheRenseignementData?: any;
}

type BadgeVariant = 'gold' | 'green' | 'red' | 'amber' | 'olive';

export function CandidatsPage() {
  const navigate = useNavigate();
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [filteredCandidatures, setFilteredCandidatures] = useState<Candidature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'actifs' | 'passifs'>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [proposerOffreId, setProposerOffreId] = useState<string | null>(null);
  const [showProposerModal, setShowProposerModal] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [offresDisponibles, setOffresDisponibles] = useState<any[]>([]);
  const [showFicheModal, setShowFicheModal] = useState(false);
  const [ficheData, setFicheData] = useState<any>(null);
  const [currentCandidat, setCurrentCandidat] = useState<Candidature | null>(null);

  useEffect(() => {
    fetchCandidatures();
    fetchOffresDisponibles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filterType, filterStatut, candidatures]);

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

  const applyFilters = () => {
    let result = [...candidatures];

    // Filtre par type (actifs/passifs)
    if (filterType === 'actifs') {
      result = result.filter(c => c.offre !== null && c.offre !== undefined);
    } else if (filterType === 'passifs') {
      result = result.filter(c => c.offre === null || c.offre === undefined);
    }

    // Filtre par statut
    if (filterStatut !== 'all') {
      result = result.filter(c => c.statut === filterStatut);
    }

    setFilteredCandidatures(result);
  };

  const updateStatut = async (id: string, newStatut: string) => {
    try {
      await api.patch(`/candidatures/${id}/statut`, { statut: newStatut });
      await fetchCandidatures();
    } catch (err) {
      console.error('Erreur mise a jour statut:', err);
    }
  };

  const envoyerFicheRenseignement = async (candidatureId: string) => {
    try {
      await api.post(`/candidatures/${candidatureId}/envoyer-fiche`);
      alert('Fiche de renseignement envoyee avec succes au candidat');
      await fetchCandidatures();
    } catch (err: any) {
      console.error('Erreur envoi fiche:', err);
      alert(err.response?.data?.message || 'Erreur lors de l\'envoi de la fiche');
    }
  };

  const voirFicheRenseignement = async (candidature: Candidature) => {
    try {
      setCurrentCandidat(candidature);
      const response = await api.get(`/candidatures/${candidature.id}`);
      const data = response.data.data.candidature;
      
      if (data.ficheRenseignementData) {
        setFicheData(data.ficheRenseignementData);
      } else {
        setFicheData(null);
        alert('Aucune fiche de renseignement disponible pour ce candidat');
      }
      setShowFicheModal(true);
    } catch (err: any) {
      console.error('Erreur chargement fiche:', err);
      alert('Erreur lors du chargement de la fiche');
    }
  };

  const proposerCandidatPourOffre = async (candidatureId: string, offreId: string) => {
    try {
      await matchingInverseService.creerCandidaturesMatching(offreId, [candidatureId]);
      setError('');
      await fetchCandidatures();
      alert('Candidat propose avec succes a l\'offre');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la proposition');
    }
  };

  const getStatutVariant = (statut: string): BadgeVariant => {
  const variants: Record<string, BadgeVariant> = {
    'NOUVELLE': 'amber',
    'PRESELECTIONNEE': 'olive',
    'FICHE_ENVOYEE': 'amber',
    'FICHE_RECUE': 'green',
    'ENTRETIEN': 'gold',
    'ACCEPTEE': 'green',
    'REFUSEE': 'red'
  };
  return variants[statut] || 'amber';
};

  const getStatutLabel = (statut: string): string => {
  const labels: Record<string, string> = {
    'NOUVELLE': 'Nouvelle',
    'PRESELECTIONNEE': 'Pre-selectionnee',
    'FICHE_ENVOYEE': 'Fiche envoyee',
    'FICHE_RECUE': 'Fiche recue',
    'ENTRETIEN': 'Entretien',
    'ACCEPTEE': 'Acceptee',
    'REFUSEE': 'Refusee'
  };
  return labels[statut] || statut;
};

  const openProposerModal = (candidature: Candidature) => {
    setSelectedCandidature(candidature);
    setShowProposerModal(true);
  };

  const actifsCount = candidatures.filter(c => c.offre !== null && c.offre !== undefined).length;
  const passifsCount = candidatures.filter(c => c.offre === null || c.offre === undefined).length;

  const statutOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'NOUVELLE', label: 'Nouvelle' },
  { value: 'PRESELECTIONNEE', label: 'Pre-selectionnee' },
  { value: 'FICHE_ENVOYEE', label: 'Fiche envoyee' },
  { value: 'FICHE_RECUE', label: 'Fiche recue' },
  { value: 'ENTRETIEN', label: 'Entretien' },
  { value: 'ACCEPTEE', label: 'Acceptee' },
  { value: 'REFUSEE', label: 'Refusee' }
];

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
          <div style={{ fontSize: 18, fontWeight: 600 }}>Candidatures</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {candidatures.length} candidature(s) au total
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => fetchCandidatures()}>
          <Filter size={13} /> Actualiser
        </Button>
      </div>

      {/* Filtres */}
      <div style={{ marginBottom: 20 }}>
        {/* Filtre type (actifs/passifs) */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
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

        {/* Filtre statut */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Statut:</span>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid var(--border)',
              fontSize: 12,
              background: 'white',
              cursor: 'pointer'
            }}
          >
            {statutOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {filterStatut !== 'all' && (
            <button
              onClick={() => setFilterStatut('all')}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: 'none',
                background: 'var(--surface)',
                fontSize: 11,
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="red">{error}</Alert>
        </div>
      )}



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
                    const isFicheRecue = c.statut === 'FICHE_RECUE';
                    const isFicheEnvoyee = c.statut === 'FICHE_ENVOYEE';
                    const isPreselectionnee = c.statut === 'PRESELECTIONNEE';
                    
                    return (
                      <tr
                        key={c.id}
                        style={{ 
                          borderBottom: '1px solid var(--border-light)', 
                          transition: 'background .15s',
                          background: isPassif ? 'rgba(90, 122, 58, 0.05)' : 
                                    isFicheRecue ? 'rgba(90, 122, 58, 0.1)' : 'transparent'
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 
                          isPassif ? 'rgba(90, 122, 58, 0.05)' : 
                          isFicheRecue ? 'rgba(90, 122, 58, 0.1)' : ''}
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
                          {isFicheEnvoyee && !c.ficheRenseignementRecue && (
                            <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 4 }}>
                              <Clock size={10} style={{ display: 'inline' }} /> En attente reponse
                            </div>
                          )}
                          {isFicheRecue && (
                            <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 4 }}>
                              Formulaire recu
                            </div>
                          )}
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
                            
                            {!isPassif && (
                              <>
                                {c.statut === 'NOUVELLE' && (
                                  <Button 
                                    variant="success" 
                                    size="xs" 
                                    onClick={() => updateStatut(c.id, 'PRESELECTIONNEE')} 
                                    title="Pre-selectionner"
                                  >
                                    <Check size={12} /> Pre-sel.
                                  </Button>
                                )}
                                
                                {isPreselectionnee && (
                                  <Button 
                                    variant="primary" 
                                    size="xs" 
                                    onClick={() => envoyerFicheRenseignement(c.id)} 
                                    title="Envoyer fiche de renseignement"
                                  >
                                    <Send size={12} /> Envoyer fiche
                                  </Button>
                                )}
                                
                                {isFicheEnvoyee && (
                                  <Button 
                                    variant="secondary" 
                                    size="xs" 
                                    onClick={() => voirFicheRenseignement(c)} 
                                    title="Voir la fiche remplie"
                                    disabled={!c.ficheRenseignementRecue}
                                  >
                                    <FileText size={12} /> Voir fiche
                                  </Button>
                                )}
                                
                                {isFicheRecue && (
                                  <Button 
                                    variant="secondary" 
                                    size="xs" 
                                    onClick={() => voirFicheRenseignement(c)} 
                                    title="Voir la fiche remplie"
                                  >
                                    <FileText size={12} /> Voir fiche
                                  </Button>
                                )}
                                
                                {c.statut !== 'REFUSEE' && c.statut !== 'ACCEPTEE' && c.statut !== 'ENTRETIEN' && 
                                 c.statut !== 'FICHE_ENVOYEE' && c.statut !== 'FICHE_RECUE' && (
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
                            
                            {isPassif && (
                              <Button 
                                variant="primary" 
                                size="xs" 
                                onClick={() => openProposerModal(c)} 
                                title="Proposer a une offre"
                              >
                                <Sparkles size={12} /> Proposer
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

      {/* Modal pour afficher la fiche de renseignement */}
      <Modal
        open={showFicheModal}
        onClose={() => {
          setShowFicheModal(false);
          setFicheData(null);
          setCurrentCandidat(null);
        }}
        title={`Fiche de renseignement - ${currentCandidat?.prenom} ${currentCandidat?.nom}`}
        maxWidth={800}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowFicheModal(false)}>Fermer</Button>
          </div>
        }
      >
        {ficheData ? (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                Informations personnelles
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div><strong>Date naissance:</strong> {ficheData.dateNaissance || '-'}</div>
                <div><strong>Lieu naissance:</strong> {ficheData.lieuNaissance || '-'}</div>
                <div><strong>Nationalite:</strong> {ficheData.nationalite || '-'}</div>
                <div><strong>Situation familiale:</strong> {ficheData.situationFamiliale || '-'}</div>
                <div><strong>Civilite:</strong> {ficheData.civilite || '-'}</div>
                <div><strong>Adresse:</strong> {ficheData.adresse || '-'}</div>
                <div><strong>Ville:</strong> {ficheData.ville || '-'}</div>
                <div><strong>Telephone:</strong> {ficheData.telephone || ficheData.mobile || '-'}</div>
                <div><strong>Email:</strong> {ficheData.email || '-'}</div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                Situation professionnelle
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div><strong>Employeur actuel:</strong> {ficheData.employeurActuel || '-'}</div>
                <div><strong>Poste actuel:</strong> {ficheData.posteActuel || '-'}</div>
                <div><strong>Anciennete:</strong> {ficheData.anciennete || '-'}</div>
                <div><strong>Disponibilite:</strong> {ficheData.disponibilite || '-'}</div>
                <div><strong>Salaire souhaite:</strong> {ficheData.salaireSouhaite || '-'}</div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                Formation & Competences
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div><strong>Niveau etudes:</strong> {ficheData.niveauEtudes || '-'}</div>
                <div><strong>Diplomes:</strong> {ficheData.diplomes || '-'}</div>
                <div><strong>Langues:</strong> {
                  ficheData.langues && typeof ficheData.langues === 'object'
                    ? Object.entries(ficheData.langues)
                        .filter(([key, value]) => value && key !== 'autres')
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ')
                    : ficheData.langues || '-'
                }</div>
                <div><strong>Permis:</strong> {ficheData.permis || '-'}</div>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
              <p style={{ fontSize: 12, fontStyle: 'italic', margin: 0 }}>
                Le candidat certifie la sincerite des renseignements fournis.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p>Aucune donnee de fiche disponible</p>
          </div>
        )}
      </Modal>
    </div>
  );
}