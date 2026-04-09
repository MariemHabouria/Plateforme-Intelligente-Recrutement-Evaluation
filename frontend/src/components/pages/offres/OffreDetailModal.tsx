// frontend/src/components/pages/offres/OffreDetailModal.tsx

import { useState } from 'react';
import { Copy, Check, Send } from 'lucide-react';
import { Offre } from '@/services/offre.service';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface OffreDetailModalProps {
  offre: Offre;
  onClose: () => void;
  onRefresh: () => void;
}

export function OffreDetailModal({ offre, onRefresh, onClose }: OffreDetailModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handlePublier = async () => {
    if (!confirm(`Publier l'offre "${offre.intitule}" sur LinkedIn et TanitJobs ?`)) return;
    setPublishing(true);
    try {
      const { offreService } = await import('@/services/offre.service');
      await offreService.publierOffre(offre.id, ['LinkedIn', 'TanitJobs']);
      alert('Offre publiée avec succès');
      onRefresh();
      onClose();
    } catch (error: any) {
      alert(`Erreur : ${error.response?.data?.message || error.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLien = () => {
    if (offre.lienCandidature) {
      navigator.clipboard.writeText(offre.lienCandidature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatutBadge = () => {
    switch (offre.statut) {
      case 'PUBLIEE': return { variant: 'green' as const, label: 'Publiée' };
      case 'BROUILLON': return { variant: 'amber' as const, label: 'Brouillon' };
      default: return { variant: 'gray' as const, label: offre.statut };
    }
  };

  const badge = getStatutBadge();

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: 16,
          maxWidth: 700, width: '90%', maxHeight: '90vh', overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: 20, borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{offre.intitule}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'monospace' }}>{offre.reference}</span>
              <span>·</span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: 'var(--text-muted)' }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Infos générales */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24,
            background: 'var(--surface)', padding: 16, borderRadius: 12
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TYPE DE CONTRAT</div>
              <div style={{ fontWeight: 500 }}>{offre.typeContrat}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>DATE DE CRÉATION</div>
              <div style={{ fontWeight: 500 }}>{new Date(offre.createdAt).toLocaleDateString('fr-FR')}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CANDIDATURES</div>
              <div style={{ fontWeight: 500 }}>{offre._count?.candidatures || 0} candidat(s)</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CANAUX</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                {offre.canauxPublication?.length > 0
                  ? offre.canauxPublication.map(c => <Badge key={c} variant="gold">{c}</Badge>)
                  : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Non définis</span>
                }
              </div>
            </div>
          </div>

          {/* Lien de candidature */}
          {offre.lienCandidature && (
            <div style={{ marginBottom: 20, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 12, color: '#166534', marginBottom: 8, fontWeight: 500 }}>
                🔗 Lien public de candidature
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ flex: 1, fontSize: 12, wordBreak: 'break-all', color: '#166534' }}>
                  {offre.lienCandidature}
                </code>
                <Button size="sm" onClick={handleCopyLien}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copié !' : 'Copier'}
                </Button>
              </div>
            </div>
          )}

          {/* Description */}
          {offre.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Description du poste</div>
              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', background: 'var(--surface)', padding: 12, borderRadius: 8, lineHeight: 1.6 }}>
                {offre.description}
              </div>
            </div>
          )}

          {/* Profil recherché */}
          {offre.profilRecherche && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Profil recherché</div>
              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', background: 'var(--surface)', padding: 12, borderRadius: 8, lineHeight: 1.6 }}>
                {offre.profilRecherche}
              </div>
            </div>
          )}

          {/* Compétences */}
          {offre.competences && offre.competences.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Compétences requises</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {offre.competences.map(comp => (
                  <span key={comp} style={{ background: 'var(--gold-light)', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fourchette salariale */}
          {offre.fourchetteSalariale && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Fourchette salariale</div>
              <div style={{ fontSize: 13, background: 'var(--surface)', padding: 12, borderRadius: 8 }}>
                {offre.fourchetteSalariale}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <Button variant="secondary" onClick={onClose}>Fermer</Button>
            {offre.statut === 'BROUILLON' && (
              <Button onClick={handlePublier} disabled={publishing}>
                <Send size={14} />
                {publishing ? 'Publication...' : 'Publier'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}