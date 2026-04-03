// frontend/src/components/pages/offres/OffreDetailModal.tsx

import { useState } from 'react';
import { X, Globe, Linkedin, Briefcase, Calendar, Users, FileText, Send } from 'lucide-react';
import { Offre } from '@/services/offre.service';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface OffreDetailModalProps {
  offre: Offre;
  onClose: () => void;
  onRefresh: () => void;
}

export function OffreDetailModal({ offre, onClose, onRefresh }: OffreDetailModalProps) {
  const [publishing, setPublishing] = useState(false);

  const handlePublier = async () => {
    if (!confirm(`Publier l'offre ${offre.reference} sur LinkedIn et TanitJobs ?`)) return;
    
    setPublishing(true);
    try {
      const { offreService } = await import('@/services/offre.service');
      const response = await offreService.publierOffre(offre.id, ['LinkedIn', 'TanitJobs']);
      if (response.success) {
        alert(`✅ Offre publiée avec succès`);
        onRefresh();
        onClose();
      }
    } catch (error: any) {
      alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'PUBLIEE': return { variant: 'green', label: 'Publiée' };
      case 'BROUILLON': return { variant: 'amber', label: 'Brouillon' };
      default: return { variant: 'gray', label: statut };
    }
  };

  const badge = getStatutBadge(offre.statut);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{offre.intitule}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {offre.reference} • <Badge variant={badge.variant as any}>{badge.label}</Badge>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: 20 }}>
          {/* Info générale */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24, background: 'var(--surface)', padding: 16, borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TYPE DE CONTRAT</div>
              <div style={{ fontWeight: 500 }}>{offre.typeContrat}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>DATE DE CRÉATION</div>
              <div style={{ fontWeight: 500 }}>{new Date(offre.createdAt).toLocaleDateString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CANDIDATURES</div>
              <div style={{ fontWeight: 500 }}>{offre._count?.candidatures || 0} candidat(s)</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CANAUX DE PUBLICATION</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {offre.canauxPublication?.map(c => <Badge key={c} variant="gold">{c}</Badge>)}
              </div>
            </div>
          </div>

          {/* Description */}
          {offre.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📋 Description du poste</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: 'var(--surface)', padding: 12, borderRadius: 8 }}>
                {offre.description}
              </div>
            </div>
          )}

          {/* Profil recherché */}
          {offre.profilRecherche && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🎯 Profil recherché</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: 'var(--surface)', padding: 12, borderRadius: 8 }}>
                {offre.profilRecherche}
              </div>
            </div>
          )}

          {/* Compétences */}
          {offre.competences && offre.competences.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>⚙️ Compétences requises</div>
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
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>💰 Fourchette salariale</div>
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
                {publishing ? 'Publication...' : 'Publier sur LinkedIn/TanitJobs'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}