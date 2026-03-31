import { useState, useEffect } from 'react';
import { Plus, Check, X, Eye, Send } from 'lucide-react';
import { demandeService, Demande } from '../../../services/demande.service';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardBody } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { Modal } from '../../ui/Modal';
import { CircuitSteps } from '../../ui/CircuitSteps';
import { DemandeFormModal } from './DemandeFormModal';
import { ValidationModal } from './ValidationModal';

export const DemandesPage = () => {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  const [filters, setFilters] = useState({ statut: '', priorite: '' });

  useEffect(() => {
    fetchDemandes();
  }, [filters]);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      const response = await demandeService.getDemandes({
        page: 1,
        limit: 50,
        statut: filters.statut || undefined,
        priorite: filters.priorite || undefined
      });
      setDemandes(response.data.demandes);
    } catch (err) {
      setError('Erreur lors du chargement des demandes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    const statusMap: Record<string, { variant: string; label: string }> = {
      BROUILLON: { variant: 'amber', label: 'Brouillon' },
      SOUMISE: { variant: 'amber', label: 'Soumise' },
      EN_VALIDATION_DIR: { variant: 'amber', label: 'Validation Directeur' },
      EN_VALIDATION_DRH: { variant: 'amber', label: 'Validation DRH' },
      EN_VALIDATION_DAF: { variant: 'amber', label: 'Validation DAF' },
      EN_VALIDATION_DGA: { variant: 'amber', label: 'Validation DGA' },
      EN_VALIDATION_DG: { variant: 'amber', label: 'Validation DG' },
      EN_VALIDATION_CONSEIL: { variant: 'amber', label: 'Validation CA' },
      VALIDEE: { variant: 'green', label: 'Validée' },
      REJETEE: { variant: 'red', label: 'Rejetée' },
      ANNULEE: { variant: 'umber', label: 'Annulée' }
    };
    return statusMap[statut] || { variant: 'gold', label: statut };
  };

  const getPrioriteBadge = (priorite: string) => {
    const priorityMap: Record<string, { variant: string; label: string }> = {
      HAUTE: { variant: 'red', label: 'Haute' },
      MOYENNE: { variant: 'amber', label: 'Moyenne' },
      BASSE: { variant: 'green', label: 'Basse' }
    };
    return priorityMap[priorite] || { variant: 'gold', label: priorite };
  };

  const canCreate = user?.role === 'manager' || user?.role === 'superadmin';
  const canValidate = ['directeur', 'rh', 'daf', 'dga', 'dg', 'superadmin'].includes(user?.role || '');
  
  // Pour la visualisation du circuit (étapes adaptées au type de poste)
  const getCircuitLabels = (demande: Demande) => {
    // Étapes de base selon le type de circuit
    const circuits: Record<string, string[]> = {
      TECHNICIEN: ['MGR', 'DIR', 'RH'],
      EMPLOYE: ['MGR', 'DIR', 'RH'],
      CADRE_DEBUTANT: ['MGR', 'DIR', 'RH', 'DAF'],
      CADRE_CONFIRME: ['MGR', 'DIR', 'RH', 'DAF', 'DGA'],
      CADRE_SUPERIEUR: ['MGR', 'DIR', 'RH', 'DAF', 'DGA', 'DG'],
      STRATEGIQUE: ['MGR', 'DIR', 'RH', 'DAF', 'DGA', 'DG', 'CA']
    };
    return circuits[demande.circuitType || 'CADRE_CONFIRME'] || ['MGR', 'DIR', 'RH', 'DAF', 'DGA'];
  };

  const handleSubmit = async (demande: Demande) => {
    try {
      await demandeService.submitDemande(demande.id);
      setSuccess('Demande soumise avec succès');
      fetchDemandes();
    } catch (err) {
      setError('Erreur lors de la soumission');
    }
  };

  const handleValidation = async (decision: 'Validee' | 'Refusee', commentaire?: string) => {
    if (!selectedDemande) return;
    try {
      await demandeService.validerDemande(selectedDemande.id, decision, commentaire);
      setSuccess(`Demande ${decision === 'Validee' ? 'validée' : 'rejetée'} avec succès`);
      setShowValidationModal(false);
      fetchDemandes();
    } catch (err) {
      setError('Erreur lors de la validation');
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement des demandes...</div>;
  }

  return (
    <div className="page-fade">
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Demandes de recrutement</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {user?.role === 'manager' ? 'Gérez vos demandes de recrutement' : 'Consultez toutes les demandes'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Nouvelle demande
          </Button>
        )}
      </div>

      {/* Alertes */}
      {error && (
        <div style={{ marginBottom: 20 }}>
          <Alert variant="red">{error}</Alert>
        </div>
      )}
      {success && (
        <div style={{ marginBottom: 20 }}>
          <Alert variant="green">{success}</Alert>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <select
          value={filters.statut}
          onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
        >
          <option value="">Tous les statuts</option>
          <option value="BROUILLON">Brouillon</option>
          <option value="EN_VALIDATION_DIR">Validation Directeur</option>
          <option value="EN_VALIDATION_DRH">Validation DRH</option>
          <option value="EN_VALIDATION_DAF">Validation DAF</option>
          <option value="EN_VALIDATION_DGA">Validation DGA</option>
          <option value="VALIDEE">Validée</option>
          <option value="REJETEE">Rejetée</option>
        </select>

        <select
          value={filters.priorite}
          onChange={(e) => setFilters({ ...filters, priorite: e.target.value })}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
        >
          <option value="">Toutes priorités</option>
          <option value="HAUTE">Haute</option>
          <option value="MOYENNE">Moyenne</option>
          <option value="BASSE">Basse</option>
        </select>

        <Button variant="secondary" size="sm" onClick={() => setFilters({ statut: '', priorite: '' })}>
          Réinitialiser
        </Button>
      </div>

      {/* Tableau des demandes */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Référence</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Poste</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Priorité</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Budget</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Statut</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Circuit</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Actions</th>
                 </tr>
              </thead>
              <tbody>
                {demandes.map((demande) => {
                  const status = getStatusBadge(demande.statut);
                  const priorite = getPrioriteBadge(demande.priorite);
                  const circuitLabels = getCircuitLabels(demande);
                  const currentStep = demande.etapeActuelle;
                  const isSubmittable = demande.statut === 'BROUILLON';
                  const isValidable = canValidate && demande.statut !== 'VALIDEE' && demande.statut !== 'REJETEE' && demande.statut !== 'BROUILLON';
                  
                  return (
                    <tr key={demande.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{demande.reference}</span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{demande.intitulePoste}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {demande.manager?.prenom} {demande.manager?.nom}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <Badge variant={priorite.variant as any}>{priorite.label}</Badge>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(demande.budgetEstime)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <Badge variant={status.variant as any}>{status.label}</Badge>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <CircuitSteps labels={circuitLabels} currentStep={currentStep} />
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {isSubmittable && (
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => handleSubmit(demande)}
                              title="Soumettre au circuit"
                            >
                              <Send size={14} />
                            </Button>
                          )}
                          {isValidable && (
                            <Button
                              variant="success"
                              size="xs"
                              onClick={() => {
                                setSelectedDemande(demande);
                                setShowValidationModal(true);
                              }}
                              title="Valider"
                            >
                              <Check size={14} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => window.open(`/demandes/${demande.id}`, '_blank')}
                            title="Voir détails"
                          >
                            <Eye size={14} />
                          </Button>
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

      {/* Modal de création */}
      <DemandeFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchDemandes();
          setSuccess('Demande créée avec succès');
        }}
      />

      {/* Modal de validation */}
      <ValidationModal
        open={showValidationModal}
        demande={selectedDemande}
        onClose={() => setShowValidationModal(false)}
        onValidate={handleValidation}
      />
    </div>
  );
};