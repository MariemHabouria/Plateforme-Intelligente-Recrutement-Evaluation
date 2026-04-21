// frontend/src/components/pages/offres/OffresPage.tsx

import { useState, useEffect } from 'react';
import { Eye, Send, Trash2, Edit, Sparkles, RefreshCw, Brain } from 'lucide-react';
import { offreService, Offre } from '../../../services/offre.service';
import { Card, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { OffreFormModal } from './OffreFormModal';
import { OffreDetailModal } from './OffreDetailModal';
import { MatchingInverseModal } from './MatchingInverseModal';

type BadgeVariant = 'green' | 'amber' | 'red' | 'gold' | 'olive';

export function OffresPage() {
  const [offres, setOffres] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null);
  const [selectedOffreForMatching, setSelectedOffreForMatching] = useState<{ id: string; intitule: string } | null>(null);
  const [editingOffre, setEditingOffre] = useState<Offre | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('');

  const loadOffres = async () => {
    setLoading(true);
    try {
      const params = filterStatut ? { statut: filterStatut } : {};
      const response = await offreService.getOffres(params);
      setOffres(response.data?.offres || response.offres || []);
    } catch (error) {
      console.error('Erreur chargement offres:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffres();
  }, [filterStatut]);

  const getStatutBadge = (statut: string): { variant: BadgeVariant; label: string } => {
    switch (statut) {
      case 'PUBLIEE': return { variant: 'green' as const, label: 'Publiée' };
      case 'BROUILLON': return { variant: 'amber' as const, label: 'Brouillon' };
      case 'CLOTUREE': return { variant: 'olive' as const, label: 'Clôturée' };
      default: return { variant: 'olive' as const, label: statut };
    }
  };

  const handlePublier = async (offre: Offre) => {
    if (!confirm(`Publier l'offre "${offre.intitule}" ?`)) return;
    try {
      const response = await offreService.publierOffre(offre.id);
      alert('Offre publiée avec succès');
      const lien = response.data?.lienCandidature;
      if (lien) {
        navigator.clipboard.writeText(lien);
        alert('Lien de candidature copié dans le presse-papier');
      }
      await loadOffres();
    } catch (error: any) {
      alert(`Erreur : ${error.response?.data?.message || error.message}`);
    }
  };

  const handleModifier = (offre: Offre) => {
    if (offre.statut !== 'BROUILLON') {
      alert('Seules les offres en brouillon peuvent être modifiées');
      return;
    }
    setEditingOffre(offre);
    setShowFormModal(true);
  };

  const handleSupprimer = async (offre: Offre) => {
    if (offre.statut !== 'BROUILLON') {
      alert('Seules les offres en brouillon peuvent être supprimées');
      return;
    }
    if (!confirm(`Supprimer définitivement l'offre "${offre.intitule}" ?`)) return;
    try {
      await offreService.deleteOffre(offre.id);
      alert('Offre supprimée');
      await loadOffres();
    } catch (error: any) {
      alert(`Erreur : ${error.response?.data?.message || error.message}`);
    }
  };

  const handleVoirDetails = (offre: Offre) => {
    setSelectedOffre(offre);
    setShowDetailModal(true);
  };

  const openMatchingInverse = (offre: Offre) => {
    setSelectedOffreForMatching({ id: offre.id, intitule: offre.intitule });
    setShowMatchingModal(true);
  };

  const nbBrouillon = offres.filter(o => o.statut === 'BROUILLON').length;
  const nbPubliee = offres.filter(o => o.statut === 'PUBLIEE').length;

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Offres d'emploi</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {offres.length} offre{offres.length > 1 ? 's' : ''} au total
            {nbBrouillon > 0 && (
              <span style={{ marginLeft: 10 }}>
                · <span style={{ color: '#d97706' }}>{nbBrouillon} brouillon{nbBrouillon > 1 ? 's' : ''}</span>
              </span>
            )}
            {nbPubliee > 0 && (
              <span style={{ marginLeft: 10 }}>
                · <span style={{ color: '#16a34a' }}>{nbPubliee} publiée{nbPubliee > 1 ? 's' : ''}</span>
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="PUBLIEE">Publiée</option>
            <option value="CLOTUREE">Clôturée</option>
          </select>

          <Button variant="ghost" size="sm" onClick={loadOffres} disabled={loading}>
            <RefreshCw size={14} />
          </Button>

          <Button size="sm" onClick={() => { setEditingOffre(null); setShowFormModal(true); }}>
            <Sparkles size={13} />
            Nouvelle offre
          </Button>
        </div>
      </div>

      {/* Tableau */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48, color: 'var(--text-muted)' }}>
              Chargement...
            </div>
          ) : offres.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, color: 'var(--text-muted)', gap: 12 }}>
              <Sparkles size={32} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: 15 }}>Aucune offre trouvée</div>
              <div style={{ fontSize: 13 }}>
                {filterStatut
                  ? `Aucune offre avec le statut "${filterStatut}"`
                  : 'Créez votre première offre ou attendez qu\'une demande soit validée'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Référence</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Poste</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Statut</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Candidatures</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Créée le</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offres.map((offre) => {
                    const badge = getStatutBadge(offre.statut);
                    const isBrouillon = offre.statut === 'BROUILLON';
                    const isPubliee = offre.statut === 'PUBLIEE';

                    return (
                      <tr key={offre.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{offre.reference}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>
                          <div style={{ fontWeight: 500 }}>{offre.intitule}</div>
                          {offre.demande && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              Demande : {offre.demande.reference}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>
                          {offre._count?.candidatures || 0} candidat{(offre._count?.candidatures || 0) > 1 ? 's' : ''}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                          {new Date(offre.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <Button variant="ghost" size="xs" onClick={() => handleVoirDetails(offre)} title="Voir les détails">
                              <Eye size={14} />
                            </Button>
                            
                            {isPubliee && (
                              <Button 
                                variant="secondary" 
                                size="xs" 
                                onClick={() => openMatchingInverse(offre)} 
                                title="Matching inverse - Candidats passifs"
                              >
                                <Brain size={12} />
                              </Button>
                            )}
                            
                            {isBrouillon && (
                              <Button variant="success" size="xs" onClick={() => handlePublier(offre)} title="Publier">
                                <Send size={12} />
                              </Button>
                            )}
                            {isBrouillon && (
                              <Button variant="secondary" size="xs" onClick={() => handleModifier(offre)} title="Modifier">
                                <Edit size={12} />
                              </Button>
                            )}
                            {isBrouillon && (
                              <Button variant="danger" size="xs" onClick={() => handleSupprimer(offre)} title="Supprimer">
                                <Trash2 size={12} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modals */}
      {showFormModal && (
        <OffreFormModal
          offreExistant={editingOffre}
          onClose={() => { setShowFormModal(false); setEditingOffre(null); }}
          onSuccess={() => { setShowFormModal(false); setEditingOffre(null); loadOffres(); }}
        />
      )}

      {showDetailModal && selectedOffre && (
        <OffreDetailModal
          offre={selectedOffre}
          onClose={() => { setShowDetailModal(false); setSelectedOffre(null); }}
          onRefresh={loadOffres}
        />
      )}

      {showMatchingModal && selectedOffreForMatching && (
        <MatchingInverseModal
          open={showMatchingModal}
          onClose={() => {
            setShowMatchingModal(false);
            setSelectedOffreForMatching(null);
          }}
          offreId={selectedOffreForMatching.id}
          offreIntitule={selectedOffreForMatching.intitule}
          onSuccess={() => {
            loadOffres();
          }}
        />
      )}
    </div>
  );
}