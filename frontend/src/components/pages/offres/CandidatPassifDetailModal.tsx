// frontend/src/components/pages/offres/CandidatPassifDetailModal.tsx

import { useState, useEffect } from 'react';
import { X, Download, Mail, Phone, Calendar, Briefcase, FileText, Clock, User, Award, MessageSquare, Eye } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { ScoreBar } from '../../ui/ScoreBar';
import { matchingInverseService, CandidatDetail } from '../../../services/matchingInverse.service';

interface CandidatPassifDetailModalProps {
  open: boolean;
  onClose: () => void;
  candidatureId: string;
  candidatNom: string;
}

export function CandidatPassifDetailModal({ open, onClose, candidatureId, candidatNom }: CandidatPassifDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<CandidatDetail | null>(null);

  useEffect(() => {
    if (open && candidatureId) {
      fetchDetail();
    }
  }, [open, candidatureId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await matchingInverseService.getCandidatPassifDetail(candidatureId);
      setDetail(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: 'green' | 'red' | 'amber' | 'gold' | 'olive'; label: string }> = {
      NOUVELLE: { variant: 'amber', label: 'Nouvelle' },
      PRESELECTIONNEE: { variant: 'olive', label: 'Pre-selectionnee' },
      ENTRETIEN: { variant: 'gold', label: 'Entretien' },
      ACCEPTEE: { variant: 'green', label: 'Acceptee' },
      REFUSEE: { variant: 'red', label: 'Refusee' },
      MATCHING_INVERSE: { variant: 'gold', label: 'Matching inverse' },
    };
    return variants[statut] || { variant: 'amber', label: statut };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ Verifier si le candidat a une offre associee
  const hasOffre = detail?.candidature?.offre !== null && detail?.candidature?.offre !== undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Profil candidat - ${candidatNom}`}
      maxWidth={900}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
          {detail && (
            <Button variant="primary" onClick={() => window.open(detail.candidature.cvUrl, '_blank')}>
              <Download size={14} /> Telecharger CV
            </Button>
          )}
        </div>
      }
    >
      <div style={{ padding: '8px 0', maxHeight: '70vh', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Chargement du profil...</div>
        ) : error ? (
          <Alert variant="red">{error}</Alert>
        ) : !detail ? (
          <Alert variant="red">Candidat non trouve</Alert>
        ) : (
          <>
            {/* En-tete candidat */}
            <div style={{ 
              background: 'var(--surface)', 
              padding: 16, 
              borderRadius: 12, 
              marginBottom: 20,
              border: '1px solid var(--border-light)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'var(--gold)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 600
                }}>
                  {detail.candidature.prenom?.[0]}{detail.candidature.nom?.[0]}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{detail.candidature.prenom} {detail.candidature.nom}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <Badge variant={getStatutBadge(detail.candidature.statut).variant}>
                      {getStatutBadge(detail.candidature.statut).label}
                    </Badge>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Candidature: {detail.candidature.reference}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={14} /> {detail.candidature.email}
                </div>
                {detail.candidature.telephone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={14} /> {detail.candidature.telephone}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> Postule le {formatDate(detail.candidature.dateSoumission)}
                </div>
              </div>
            </div>

            {/* Scores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Score global</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--gold)' }}>{detail.candidature.scoreGlobal}%</div>
                <ScoreBar label="" value={detail.candidature.scoreGlobal} />
              </div>
              <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Score experience</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--olive)' }}>{detail.candidature.scoreExp}%</div>
                <ScoreBar label="" value={detail.candidature.scoreExp} />
              </div>
            </div>

            {/* Competences */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Competences detectees</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {detail.candidature.competencesDetectees.map(c => (
                  <span key={c} style={{ background: 'var(--olive-bg)', color: 'var(--olive)', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* ✅ Offre postulee - avec verification null */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Briefcase size={16} /> {hasOffre ? 'Offre postulee' : 'Candidature spontanee'}
              </div>
              {hasOffre ? (
                <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 500 }}>{detail.candidature.offre?.intitule || '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Ref: {detail.candidature.offre?.reference || '-'} • Direction: {detail.candidature.offre?.demande?.direction?.nom || '-'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Creee par: {detail.candidature.offre?.demande?.createur?.prenom || ''} {detail.candidature.offre?.demande?.createur?.nom || ''}
                  </div>
                </div>
              ) : (
                <div style={{ padding: 12, background: 'rgba(172, 107, 46, 0.1)', borderRadius: 8, border: '1px solid var(--gold)' }}>
                  <div style={{ fontSize: 13, color: 'var(--gold-deep)' }}>
                    Ce candidat a postule en candidature spontanee. Il peut etre propose sur des offres via le matching inverse.
                  </div>
                </div>
              )}
            </div>

            {/* Historique des entretiens */}
            {detail.candidature.entretiens && detail.candidature.entretiens.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={16} /> Entretiens realises
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.candidature.entretiens.map((entretien) => (
                    <div key={entretien.id} style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Badge variant={entretien.type === 'RH' ? 'gold' : entretien.type === 'TECHNIQUE' ? 'olive' : 'green'}>
                          {entretien.type}
                        </Badge>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatDate(entretien.date)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        <strong>Interviewer:</strong> {entretien.interviewer.prenom} {entretien.interviewer.nom} ({entretien.interviewer.role})
                      </div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        <strong>Lieu:</strong> {entretien.lieu}
                      </div>
                      {entretien.feedback && (
                        <div style={{ fontSize: 13, marginTop: 8, padding: 8, background: 'rgba(172,107,46,0.1)', borderRadius: 6 }}>
                          <strong>Feedback:</strong> {entretien.feedback}
                        </div>
                      )}
                      {entretien.evaluation && (
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                          <strong>Evaluation:</strong> {entretien.evaluation}/10
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historique des candidatures */}
            {detail.historiqueCandidatures && detail.historiqueCandidatures.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} /> Historique des candidatures
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.historiqueCandidatures.map((hist) => (
                    <div key={hist.id} style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{hist.offre.intitule}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ref: {hist.offre.reference}</div>
                        </div>
                        <Badge variant={getStatutBadge(hist.statut).variant}>
                          {getStatutBadge(hist.statut).label}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                        Postule le: {formatDate(hist.dateSoumission)} • Score: {hist.scoreGlobal}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CV Texte (extrait) */}
            {detail.candidature.cvTexte && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={16} /> Extrait du CV
                </div>
                <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, fontSize: 13, maxHeight: 150, overflowY: 'auto' }}>
                  {detail.candidature.cvTexte.substring(0, 500)}...
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}