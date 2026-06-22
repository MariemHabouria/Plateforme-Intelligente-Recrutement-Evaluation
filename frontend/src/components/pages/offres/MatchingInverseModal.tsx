import React, { useState, useEffect } from 'react';
import { Brain, Loader2, Mail, Phone, Eye } from 'lucide-react';
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
  const [loading, setLoading]                       = useState(false);
  const [matching, setMatching]                     = useState<MatchingResult[]>([]);
  const [selectedIds, setSelectedIds]               = useState<Set<string>>(new Set());
  const [error, setError]                           = useState('');
  const [executing, setExecuting]                   = useState(false);
  const [created, setCreated]                       = useState(false);
  const [seuilUtilise, setSeuilUtilise]             = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal]       = useState(false);
  const [selectedCandidatureId, setSelectedCandidatureId] = useState<string | null>(null);
  const [selectedCandidatNom, setSelectedCandidatNom]     = useState('');
  const [selectedScore, setSelectedScore]           = useState<number>(0);

  useEffect(() => {
    if (open && offreId) fetchMatching();
  }, [open, offreId]);

  const fetchMatching = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await matchingInverseService.executerMatching(offreId);
      setMatching(result.candidaturesMatch || []);
      if (result.seuilUtilise !== undefined) setSeuilUtilise(result.seuilUtilise);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du matching inverse');
      setMatching([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === matching.length && matching.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(matching.map(m => m.candidatureId)));
  };

  const handleCreateCandidatures = async () => {
    if (selectedIds.size === 0) { setError('Veuillez selectionner au moins un candidat'); return; }
    setExecuting(true);
    setError('');
    try {
      await matchingInverseService.creerCandidaturesMatching(offreId, Array.from(selectedIds));
      setCreated(true);
      onSuccess();
      setTimeout(() => { onClose(); setCreated(false); setSelectedIds(new Set()); }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la creation des candidatures');
    } finally {
      setExecuting(false);
    }
  };

  // ← passe aussi le score du matching inverse
  const openDetailModal = (candidatureId: string, nom: string, prenom: string, score: number) => {
    setSelectedCandidatureId(candidatureId);
    setSelectedCandidatNom(`${prenom} ${nom}`);
    setSelectedScore(score);
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
              <Button variant="primary" onClick={handleCreateCandidatures} disabled={executing || selectedIds.size === 0}>
                {executing
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creation...</>
                  : <><Brain size={14} /> {`Ajouter ${selectedIds.size} candidat(s)`}</>
                }
              </Button>
            )}
          </div>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 20, padding: 12, background: 'rgba(172, 107, 46, 0.1)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Brain size={18} style={{ color: 'var(--gold)' }} />
              <strong>Matching Inverse - {offreIntitule}</strong>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {matching.length} candidat(s) passif(s) correspondent a cette offre
              {seuilUtilise !== null && <span style={{ marginLeft: 4 }}>(score &gt;= {seuilUtilise}%)</span>}
            </div>
          </div>

          {error && <div style={{ marginBottom: 16 }}><Alert variant="red">{error}</Alert></div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              <div style={{ marginTop: 16 }}>Analyse des candidatures...</div>
            </div>
          ) : matching.length === 0 ? (
            <div style={{ marginBottom: 16 }}>
              <Alert variant="gold">
                Aucun candidat passif ne correspond a cette offre pour le moment.
                {seuilUtilise !== null && <span> (seuil actuel : {seuilUtilise}%)</span>}
              </Alert>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === matching.length && matching.length > 0}
                    onChange={toggleSelectAll}
                  />
                  <span style={{ fontSize: 13 }}>Selectionner tout</span>
                </label>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedIds.size} selectionne(s)</div>
              </div>

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
                      <input
                        type="checkbox"
                        checked={selectedIds.has(candidat.candidatureId)}
                        onChange={() => toggleSelect(candidat.candidatureId)}
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{candidat.candidatPrenom} {candidat.candidatNom}</span>
                            <span style={{ marginLeft: 8 }}>
                              <Badge variant={getScoreColor(candidat.score)}>Score vs offre: {candidat.score}%</Badge>
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => openDetailModal(candidat.candidatureId, candidat.candidatNom, candidat.candidatPrenom, candidat.score)}
                            title="Voir le profil complet"
                          >
                            <><Eye size={14} /><span style={{ marginLeft: 4, fontSize: 11 }}>Profil</span></>
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
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Competences correspondantes</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(candidat.competencesMatch || []).slice(0, 5).map((c: string, idx: number) => (
                              <span key={`${candidat.candidatureId}-comp-${idx}`} style={{ background: 'var(--olive-bg)', color: 'var(--olive)', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{c}</span>
                            ))}
                            {candidat.competencesMatch && candidat.competencesMatch.length > 5 && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{candidat.competencesMatch.length - 5}</span>
                            )}
                          </div>
                        </div>

                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Competences manquantes</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(candidat.competencesManquantes || []).slice(0, 3).map((c: string, idx: number) => (
                              <span key={`${candidat.candidatureId}-missing-${idx}`} style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{c}</span>
                            ))}
                            {candidat.competencesManquantes && candidat.competencesManquantes.length > 3 && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{candidat.competencesManquantes.length - 3}</span>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{candidat.raison}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {showDetailModal && selectedCandidatureId && (
        <CandidatPassifDetailModal
          open={showDetailModal}
          onClose={() => { setShowDetailModal(false); setSelectedCandidatureId(null); }}
          candidatureId={selectedCandidatureId}
          candidatNom={selectedCandidatNom}
          offreId={offreId}
          scoreOverride={selectedScore}
        />
      )}
    </>
  );
}