import { useState, useEffect } from 'react';
import { Plus, Check, Eye, Send, Trash2, XCircle } from 'lucide-react';
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

type Role = 'superadmin' | 'manager' | 'directeur' | 'rh' | 'daf' | 'dga' | 'dg' | 'paie' | 'candidat';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [demandeToDelete, setDemandeToDelete] = useState<Demande | null>(null);
  const [validationAction, setValidationAction] = useState<'Validee' | 'Refusee' | null>(null);

  useEffect(() => { fetchDemandes(); }, [filters]);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      const response = await demandeService.getDemandes({
        page: 1, limit: 50,
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
      BROUILLON:             { variant: 'amber', label: 'Brouillon' },
      SOUMISE:               { variant: 'amber', label: 'Soumise' },
      EN_VALIDATION_DIR:     { variant: 'amber', label: 'Validation Directeur' },
      EN_VALIDATION_DRH:     { variant: 'amber', label: 'Validation DRH' },
      EN_VALIDATION_DAF:     { variant: 'amber', label: 'Validation DAF' },
      EN_VALIDATION_DGA:     { variant: 'amber', label: 'Validation DGA' },
      EN_VALIDATION_DG:      { variant: 'amber', label: 'Validation DG' },
      VALIDEE:               { variant: 'green', label: 'Validée' },
      REJETEE:               { variant: 'red',   label: 'Rejetée' },
      ANNULEE:               { variant: 'amber', label: 'Annulée' }
    };
    return statusMap[statut] || { variant: 'gold', label: statut };
  };

  const getPrioriteBadge = (priorite: string) => {
    const priorityMap: Record<string, { variant: string; label: string }> = {
      HAUTE:   { variant: 'red',   label: 'Haute' },
      MOYENNE: { variant: 'amber', label: 'Moyenne' },
      BASSE:   { variant: 'green', label: 'Basse' }
    };
    return priorityMap[priorite] || { variant: 'gold', label: priorite };
  };

  const canCreate = user?.role !== 'paie';
  
  // ✅ Vérifie si l'utilisateur connecté peut valider/refuser cette demande
  const canUserValidate = (demande: Demande): boolean => {
    if (!user) return false;
    
    const validatingRoles = ['directeur', 'rh', 'daf', 'dga', 'dg', 'superadmin'];
    if (!validatingRoles.includes(user.role)) return false;
    
    if (demande.statut === 'VALIDEE' || demande.statut === 'REJETEE') return false;
    if (demande.statut === 'BROUILLON') return false;
    
    const validationEnCours = demande.validations?.find(v => v.decision === 'EN_ATTENTE');
    if (!validationEnCours) return false;
    
    return validationEnCours.acteur.id === user.id;
  };

  const canDelete = (demande: Demande) => {
    const isCreator = demande.createur?.id === user?.id;
    const isSuperAdmin = user?.role === 'superadmin';
    return (isCreator || isSuperAdmin) && demande.statut === 'BROUILLON';
  };

  const getCircuitLabels = (demande: Demande): string[] => {
    const circuitType = demande.typePoste?.circuitType || demande.circuitType;
    
    const circuits: Record<string, string[]> = {
      TECHNICIEN:      ['DIR', 'RH'],
      EMPLOYE:         ['DIR', 'RH'],
      CADRE_DEBUTANT:  ['DIR', 'RH', 'DAF'],
      CADRE_CONFIRME:  ['DIR', 'RH', 'DAF', 'DGA'],
      CADRE_SUPERIEUR: ['DIR', 'RH', 'DAF', 'DGA', 'DG'],
      STRATEGIQUE:     ['DIR', 'RH', 'DAF', 'DGA', 'DG']
    };
    
    const defaultCircuit = ['DIR', 'RH', 'DAF', 'DGA'];
    
    if (!circuitType) return defaultCircuit;
    
    const circuitComplet = circuits[circuitType] || defaultCircuit;
    const createurRole = demande.createur?.role;
    
    if (!createurRole) return circuitComplet;
    
    const roleToBackend: Record<string, string> = {
      'manager': 'MANAGER',
      'directeur': 'DIRECTEUR',
      'rh': 'DRH',
      'daf': 'DAF',
      'dga': 'DGA',
      'dg': 'DG',
      'superadmin': 'SUPER_ADMIN'
    };
    
    const backendRole = roleToBackend[createurRole] || createurRole.toUpperCase();
    const roleToLabel: Record<string, string> = {
      'DIRECTEUR': 'DIR',
      'DRH': 'RH',
      'DAF': 'DAF',
      'DGA': 'DGA',
      'DG': 'DG'
    };
    
    if (backendRole === 'MANAGER' || backendRole === 'SUPER_ADMIN') {
      return circuitComplet;
    }
    
    const createurLabel = roleToLabel[backendRole];
    if (!createurLabel) return circuitComplet;
    
    const createurIndex = circuitComplet.indexOf(createurLabel);
    if (createurIndex === -1) return circuitComplet;
    
    const filteredCircuit = circuitComplet.filter((_, index) => index > createurIndex);
    
    return filteredCircuit.length === 0 ? [] : filteredCircuit;
  };

  const handleSubmit = async (demande: Demande) => {
    try {
      await demandeService.submitDemande(demande.id);
      setSuccess('Demande soumise avec succès');
      fetchDemandes();
    } catch {
      setError('Erreur lors de la soumission');
    }
  };

  // ✅ Fonction unique pour valider ou refuser
  const handleValidation = async (decision: 'Validee' | 'Refusee', commentaire?: string) => {
    if (!selectedDemande) return;
    try {
      await demandeService.validerDemande(selectedDemande.id, decision, commentaire);
      setSuccess(`Demande ${decision === 'Validee' ? 'validée' : 'rejetée'} avec succès`);
      setShowValidationModal(false);
      setValidationAction(null);
      fetchDemandes();
    } catch {
      setError('Erreur lors de la validation');
    }
  };

  // ✅ Ouvrir la modal avec l'action choisie
  const openValidationModal = (demande: Demande, action: 'Validee' | 'Refusee') => {
    setSelectedDemande(demande);
    setValidationAction(action);
    setShowValidationModal(true);
  };

  const handleDelete = async () => {
    if (!demandeToDelete) return;
    try {
      await demandeService.deleteDemande(demandeToDelete.id);
      setSuccess(`Demande ${demandeToDelete.reference} supprimée avec succès`);
      setShowDeleteConfirm(false);
      setDemandeToDelete(null);
      fetchDemandes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement des demandes...</div>;
  }

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Demandes de recrutement</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {user?.role === 'manager'
              ? 'Gérez vos demandes de recrutement'
              : 'Consultez toutes les demandes'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Nouvelle demande
          </Button>
        )}
      </div>

      {error && <div style={{ marginBottom: 20 }}><Alert variant="red">{error}</Alert></div>}
      {success && <div style={{ marginBottom: 20 }}><Alert variant="green">{success}</Alert></div>}

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
          <option value="EN_VALIDATION_DG">Validation DG</option>
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

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Référence</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Poste</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Priorité</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Budget (mensuel)</th>
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
                  const isValidable = canUserValidate(demande);
                  const isDeletable = canDelete(demande);
                  const isRejected = demande.statut === 'REJETEE';

                  return (
                    <tr key={demande.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{demande.reference}</span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 500 }}>{demande.intitulePoste}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {demande.createur?.prenom} {demande.createur?.nom} • {demande.typePoste?.nom}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <Badge variant={priorite.variant as any}>{priorite.label}</Badge>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {demande.budgetMin} - {demande.budgetMax} DT
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
                            <Button variant="primary" size="xs" onClick={() => handleSubmit(demande)} title="Soumettre au circuit">
                              <Send size={14} />
                            </Button>
                          )}
                          {isValidable && (
                            <>
                              {/* ✅ Bouton Refuser */}
                              <Button
                                variant="danger"
                                size="xs"
                                onClick={() => openValidationModal(demande, 'Refusee')}
                                title="Refuser"
                              >
                                <XCircle size={14} />
                              </Button>
                              {/* ✅ Bouton Valider */}
                              <Button
                                variant="success"
                                size="xs"
                                onClick={() => openValidationModal(demande, 'Validee')}
                                title="Valider"
                              >
                                <Check size={14} />
                              </Button>
                            </>
                          )}
                          {isDeletable && (
                            <Button
                              variant="danger"
                              size="xs"
                              onClick={() => { setDemandeToDelete(demande); setShowDeleteConfirm(true); }}
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                          <Button variant="ghost" size="xs" onClick={() => window.location.href = `/demandes/${demande.id}`} title="Voir détails">
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

      <DemandeFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { setShowCreateModal(false); fetchDemandes(); setSuccess('Demande créée avec succès'); }}
      />

      {/* Modal de validation (unique pour Valider et Refuser) */}
      <ValidationModal
        open={showValidationModal}
        demande={selectedDemande}
        onClose={() => setShowValidationModal(false)}
        onValidate={handleValidation}
        defaultAction={validationAction}
      />

      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirmer la suppression"
        maxWidth={400}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Annuler</Button>
            <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
          </div>
        }
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: 8 }}>
            Êtes-vous sûr de vouloir supprimer la demande <strong>{demandeToDelete?.reference}</strong> ?
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Cette action est irréversible et supprimera définitivement la demande ainsi que toutes ses données associées.
          </p>
        </div>
      </Modal>
    </div>
  );
};