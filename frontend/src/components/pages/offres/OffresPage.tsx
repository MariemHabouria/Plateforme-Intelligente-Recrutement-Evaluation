// frontend/src/components/pages/offres/OffresPage.tsx

import { useState, useEffect } from 'react';
import { Eye, Send, Trash2, Edit, Sparkles, Filter } from 'lucide-react';
import { offreService, Offre } from '@/services/offre.service';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { OffreFormModal } from './OffreFormModal';
import { OffreDetailModal } from './OffreDetailModal';

export function OffresPage() {
  const [offres, setOffres] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null);
  const [editingOffre, setEditingOffre] = useState<Offre | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('');

  const loadOffres = async () => {
    setLoading(true);
    try {
      const params = filterStatut ? { statut: filterStatut } : {};
      const response = await offreService.getOffres(params);
      setOffres(response.data.offres);
    } catch (error) {
      console.error('Erreur chargement offres:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffres();
  }, [filterStatut]);

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'PUBLIEE': return { variant: 'green', label: 'Publiée' };
      case 'BROUILLON': return { variant: 'amber', label: 'Brouillon' };
      case 'CLOTUREE': return { variant: 'gray', label: 'Clôturée' };
      default: return { variant: 'gray', label: statut };
    }
  };

  const handlePublier = async (offre: Offre) => {
    if (!confirm(`Publier l'offre ${offre.reference} sur LinkedIn et TanitJobs ?`)) return;
    
    try {
      const response = await offreService.publierOffre(offre.id, ['LinkedIn', 'TanitJobs']);
      if (response.success) {
        alert(`✅ Offre publiée avec succès sur ${response.data.publication.map((p: any) => p.canal).join(', ')}`);
        await loadOffres();
      }
    } catch (error: any) {
      console.error('Erreur publication:', error);
      alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleModifier = (offre: Offre) => {
    if (offre.statut !== 'BROUILLON') {
      alert('Seules les offres au statut "Brouillon" peuvent être modifiées');
      return;
    }
    setEditingOffre(offre);
    setShowFormModal(true);
  };

  const handleSupprimer = async (offre: Offre) => {
    if (offre.statut !== 'BROUILLON') {
      alert('Seules les offres au statut "Brouillon" peuvent être supprimées');
      return;
    }
    
    if (!confirm(`Supprimer définitivement l'offre ${offre.reference} ?`)) return;
    
    try {
      await offreService.deleteOffre(offre.id);
      alert('✅ Offre supprimée avec succès');
      await loadOffres();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleVoirDetails = (offre: Offre) => {
    setSelectedOffre(offre);
    setShowDetailModal(true);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>Chargement...</div>;
  }

  return (
    <div className="page-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Offres d'emploi</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Gestion et publication multi-canaux • {offres.length} offre(s)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="PUBLIEE">Publiée</option>
            <option value="CLOTUREE">Clôturée</option>
          </select>
          <Button size="sm" onClick={() => {
            setEditingOffre(null);
            setShowFormModal(true);
          }}>
            <Sparkles size={13} /> Nouvelle offre (IA)
          </Button>
        </div>
      </div>



      {/* Tableau des offres */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600 }}>Référence</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600 }}>Poste</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600 }}>Statut</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600 }}>Candidatures</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600 }}>Canaux</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600 }}>Créée le</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offres.map((offre) => {
                  const badge = getStatutBadge(offre.statut);
                  const isBrouillon = offre.statut === 'BROUILLON';
                  
                  return (
                    <tr key={offre.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{offre.reference}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{offre.intitule}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={badge.variant as any}>{badge.label}</Badge>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        <strong>{offre._count?.candidatures || 0}</strong> candidat(s)
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {offre.canauxPublication?.length > 0 ? (
                            offre.canauxPublication.map((c) => <Badge key={c} variant="gold">{c}</Badge>)
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(offre.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {/* Bouton Voir Détails */}
                          <Button 
                            variant="ghost" 
                            size="xs" 
                            onClick={() => handleVoirDetails(offre)}
                            title="Voir détails"
                          >
                            <Eye size={14} />
                          </Button>
                          
                          {/* Bouton Publier (visible seulement pour brouillon) */}
                          {isBrouillon && (
                            <Button 
                              variant="success" 
                              size="xs" 
                              onClick={() => handlePublier(offre)}
                              title="Publier sur LinkedIn/TanitJobs"
                            >
                              <Send size={12} />
                            </Button>
                          )}
                          
                          {/* Bouton Modifier (visible seulement pour brouillon) */}
                          {isBrouillon && (
                            <Button 
                              variant="secondary" 
                              size="xs" 
                              onClick={() => handleModifier(offre)}
                              title="Modifier l'offre"
                            >
                              <Edit size={12} />
                            </Button>
                          )}
                          
                          {/* Bouton Supprimer (visible seulement pour brouillon) */}
                          {isBrouillon && (
                            <Button 
                              variant="danger" 
                              size="xs" 
                              onClick={() => handleSupprimer(offre)}
                              title="Supprimer l'offre"
                            >
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
        </CardBody>
      </Card>

      {/* Modal Formulaire (Création/Modification) */}
      {showFormModal && (
        <OffreFormModal
          offreExistant={editingOffre}
          onClose={() => {
            setShowFormModal(false);
            setEditingOffre(null);
          }}
          onSuccess={() => {
            setShowFormModal(false);
            setEditingOffre(null);
            loadOffres();
          }}
        />
      )}

      {/* Modal Détails */}
      {showDetailModal && selectedOffre && (
        <OffreDetailModal
          offre={selectedOffre}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOffre(null);
          }}
          onRefresh={loadOffres}
        />
      )}
    </div>
  );
}