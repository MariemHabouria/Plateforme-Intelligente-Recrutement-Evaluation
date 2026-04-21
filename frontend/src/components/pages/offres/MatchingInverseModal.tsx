// frontend/src/components/pages/offres/MatchingInverseModal.tsx

import { useState, useEffect } from 'react';
import { Brain, Check, X, Loader2, User, Mail, Phone, Briefcase, Eye } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Badge } from '../../ui/Badge';
import { matchingInverseService, MatchingResult } from '../../../services/matchingInverse.service';
import { CandidatPassifDetailModal } from './CandidatPassifDetailModal';

interface MatchingInverseModalProps {
  open: boolean;
  onClose: () => void;
  offreId: string;
  offreIntitule: string;
  onSuccess: () => void;
}

export function MatchingInverseModal({ open, onClose, offreId, offreIntitule, onSuccess }: MatchingInverseModalProps) {
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState<MatchingResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [executing, setExecuting] = useState(false);
  const [created, setCreated] = useState(false);
  
  // États pour le modal de détail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCandidatureId, setSelectedCandidatureId] = useState<string | null>(null);
  const [selectedCandidatNom, setSelectedCandidatNom] = useState<string>('');

  useEffect(() => {
    if (open && offreId) {
      fetchMatching();
    }
  }, [open, offreId]);

  const fetchMatching = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await matchingInverseService.executerMatching(offreId);
      setMatching(result.matching);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du matching inverse');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === matching.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(matching.map(m => m.candidatureId)));
    }
  };

  const handleCreateCandidatures = async () => {
    if (selectedIds.size === 0) {
      setError('Veuillez sélectionner au moins un candidat');
      return;
    }

    setExecuting(true);
    setError('');
    try {
      await matchingInverseService.creerCandidatures(offreId, Array.from(selectedIds));
      setCreated(true);
      onSuccess();
      setTimeout(() => {
        onClose();
        setCreated(false);
        setSelectedIds(new Set());
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création des candidatures');
    } finally {
      setExecuting(false);
    }
  };

  const openDetailModal = (candidatureId: string, nom: string, prenom: string) => {
    setSelectedCandidatureId(candidatureId);
    setSelectedCandidatNom(`${prenom} ${nom}`);
    setShowDetailModal(true);
  };

  const getScoreColor = (score: number): 'green' | 'gold' | 'amber' => {
    if (score >= 80) return 'green';
    if (score >= 65) return 'gold';
    return 'amber';
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Matching Inverse - Candidats passifs"
        maxWidth={900}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClose}>Fermer</Button>
            {matching.length > 0 && !created && (
              <Button 
                variant="primary" 
                onClick={handleCreateCandidatures} 
                disabled={executing || selectedIds.size === 0}
              >
                {executing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Brain size={14} />}
                {executing ? 'Création...' : `Ajouter ${selectedIds.size} candidat(s)`}
              </Button>
            )}
          </div>
        }
      >
        <div style={{ padding: '8px 0' }}>
          {/* En-tête */}
          <div style={{ marginBottom: 20, padding: 12, background: 'var(--gold-pale)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Brain size={18} style={{ color: 'var(--gold)' }} />
              <strong>Matching Inverse - {offreIntitule}</strong>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {matching.length} candidat(s) passif(s) correspondent à cette offre (score ≥ 60%)
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert variant="red">{error}</Alert>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              <div style={{ marginTop: 16 }}>Analyse des candidatures...</div>
            </div>
          ) : matching.length === 0 ? (
            <Alert variant="gold">
              Aucun candidat passif ne correspond à cette offre pour le moment.
            </Alert>
          ) : (
            <>
              {/* Sélectionner tout */}
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === matching.length}
                    onChange={toggleSelectAll}
                  />
                  <span style={{ fontSize: 13 }}>Sélectionner tout</span>
                </label>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {selectedIds.size} sélectionné(s)
                </div>
              </div>

              {/* Liste des candidats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto' }}>
                {matching.map((candidat) => (
                  <div
                    key={candidat.candidatureId}
                    style={{
                      padding: 12,
                      border: selectedIds.has(candidat.candidatureId) ? '2px solid var(--gold)' : '1px solid var(--border-light)',
                      borderRadius: 8,
                      background: selectedIds.has(candidat.candidatureId) ? 'rgba(172, 107, 46, 0.05)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedIds.has(candidat.candidatureId)}
                        onChange={() => toggleSelect(candidat.candidatureId)}
                        style={{ marginTop: 2 }}
                      />
                      
                      {/* Contenu principal */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{candidat.candidatPrenom} {candidat.candidatNom}</span>
                            <span style={{ marginLeft: 8 }}>
                              <Badge variant={getScoreColor(candidat.score)}>
                                Score: {candidat.score}%
                              </Badge>
                            </span>
                          </div>
                          
                          {/* Bouton Voir profil */}
                          <Button 
                            variant="ghost" 
                            size="xs" 
                            onClick={() => openDetailModal(candidat.candidatureId, candidat.candidatNom, candidat.candidatPrenom)}
                            title="Voir le profil complet"
                          >
                            <Eye size={14} />
                            <span style={{ marginLeft: 4, fontSize: 11 }}>Profil</span>
                          </Button>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={12} /> {candidat.email}
                          </div>
                          {candidat.telephone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Phone size={12} /> {candidat.telephone}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Compétences correspondantes</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {candidat.competencesMatch.slice(0, 5).map(c => (
                              <span key={c} style={{ background: 'var(--olive-bg)', color: 'var(--olive)', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                                {c}
                              </span>
                            ))}
                            {candidat.competencesMatch.length > 5 && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{candidat.competencesMatch.length - 5}</span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Compétences manquantes</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {candidat.competencesManquantes.slice(0, 3).map(c => (
                              <span key={c} style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                                {c}
                              </span>
                            ))}
                            {candidat.competencesManquantes.length > 3 && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{candidat.competencesManquantes.length - 3}</span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {candidat.raison}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal de détail du candidat */}
      {showDetailModal && selectedCandidatureId && (
        <CandidatPassifDetailModal
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCandidatureId(null);
          }}
          candidatureId={selectedCandidatureId}
          candidatNom={selectedCandidatNom}
        />
      )}
    </>
  );
}