// frontend/src/components/pages/demandes/DemandesPage.tsx

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

// Fonction pour obtenir le libellé du niveau
const getNiveauLabel = (niveau: string): string => {
  const labels: Record<string, string> = {
    'TECHNICIEN': 'Technicien',
    'EMPLOYE': 'Employé',
    'CADRE_DEBUTANT': 'Cadre débutant',
    'CADRE_CONFIRME': 'Cadre confirmé',
    'CADRE_SUPERIEUR': 'Cadre supérieur',
    'STRATEGIQUE': 'Stratégique'
  };
  return labels[niveau] || niveau;
};

// Definition des circuits par niveau de poste
const CIRCUITS_PAR_NIVEAU: Record<string, string[]> = {
  TECHNICIEN:      ['MANAGER', 'DIRECTEUR', 'DRH'],
  EMPLOYE:         ['MANAGER', 'DIRECTEUR', 'DRH'],
  CADRE_DEBUTANT:  ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF'],
  CADRE_CONFIRME:  ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA'],
  CADRE_SUPERIEUR: ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'],
  STRATEGIQUE:     ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG']
};

// Fonction pour obtenir les labels du circuit (exclut le createur)
const getCircuitLabels = (demande: Demande): string[] => {
  const circuitType = demande.circuitType || demande.niveau;
  const circuitComplet = CIRCUITS_PAR_NIVEAU[circuitType as string] || ['DIRECTEUR', 'DRH', 'DAF', 'DGA'];
  const createurRole = demande.createur?.role?.toUpperCase();

  if (!createurRole) return circuitComplet;
  
  // Filtrer pour exclure le createur du circuit
  return circuitComplet.filter((label: string) => label !== createurRole);
};

// Fonction pour obtenir l'etape actuelle
const getCurrentStep = (demande: Demande, circuitLabels: string[]): number => {
  // Cas terminal : validee → toutes les bulles vertes
  if (demande.statut === 'VALIDEE') return circuitLabels.length;
  
  // Cas terminal : rejetee → on affiche jusqu'a l'etape ou ca a bloque
  if (demande.statut === 'REJETEE') {
    const refusee = demande.validations?.find(v => v.decision === 'REFUSEE');
    if (refusee) {
      const acteurRole = refusee.acteur?.role?.toUpperCase();
      const idx = acteurRole ? circuitLabels.indexOf(acteurRole) : -1;
      return idx >= 0 ? idx : 0;
    }
    return 0;
  }

  // Cas normal : trouver la validation EN_ATTENTE
  const validationEnCours = demande.validations?.find(v => v.decision === 'EN_ATTENTE');
  if (!validationEnCours) return 0;

  const acteurRole = validationEnCours.acteur?.role?.toUpperCase();
  if (!acteurRole) return 0;

  const currentIndex = circuitLabels.indexOf(acteurRole);
  return currentIndex >= 0 ? currentIndex : 0;
};

// Fonction pour obtenir le libelle du statut en fonction du validateur en attente
const getStatusLabel = (statut: string, validationEnCours?: { acteur?: { role: string } }): string => {
  if (statut === 'BROUILLON') return 'Brouillon';
  if (statut === 'SOUMISE') return 'Soumise';
  if (statut === 'VALIDEE') return 'Validee';
  if (statut === 'REJETEE') return 'Rejetee';
  if (statut === 'ANNULEE') return 'Annulee';
  
  // Pour EN_VALIDATION_DIR, on regarde le vrai validateur en attente
  if (statut === 'EN_VALIDATION_DIR') {
    if (validationEnCours?.acteur?.role === 'MANAGER') {
      return 'Validation Manager';
    }
    return 'Validation Directeur';
  }
  
  if (statut === 'EN_VALIDATION_DRH') return 'Validation DRH';
  if (statut === 'EN_VALIDATION_DAF') return 'Validation DAF';
  if (statut === 'EN_VALIDATION_DGA') return 'Validation DGA';
  if (statut === 'EN_VALIDATION_DG') return 'Validation DG';
  
  return statut;
};

// Fonction pour obtenir la couleur du badge
const getStatusVariant = (statut: string): string => {
  if (statut === 'VALIDEE') return 'green';
  if (statut === 'REJETEE') return 'red';
  return 'amber';
};

export const DemandesPage = () => {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  // ✅ Ajout du filtre aValider dans le state des filtres
  const [filters, setFilters] = useState({ statut: '', priorite: '', aValider: false });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [demandeToDelete, setDemandeToDelete] = useState<Demande | null>(null);
  const [validationAction, setValidationAction] = useState<'Validee' | 'Refusee' | null>(null);

  useEffect(() => { fetchDemandes(); }, [filters]);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      // ✅ Construire les params dynamiquement pour inclure aValider
      const params: any = { page: 1, limit: 50 };
      if (filters.statut) params.statut = filters.statut;
      if (filters.priorite) params.priorite = filters.priorite;
      if (filters.aValider) params.aValider = true;

      const response = await demandeService.getDemandes(params);
      setDemandes(response.data.demandes);
    } catch (err) {
      setError('Erreur lors du chargement des demandes');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
  
  // Verifie si l'utilisateur connecte peut valider/refuser cette demande
  const canUserValidate = (demande: Demande): boolean => {
    if (!user) return false;
    
    const validatingRoles = ['manager', 'directeur', 'rh', 'daf', 'dga', 'dg', 'superadmin'];
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

  const handleSubmit = async (demande: Demande) => {
    try {
      await demandeService.submitDemande(demande.id);
      setSuccess('Demande soumise avec succes');
      fetchDemandes();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Erreur lors de la soumission');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Fonction pour valider ou refuser (avec disponibilites)
  const handleValidation = async (decision: 'Validee' | 'Refusee', commentaire?: string, disponibilites?: any[]) => {
    if (!selectedDemande) return;
    try {
      await demandeService.validerDemande(selectedDemande.id, decision, commentaire, disponibilites);
      setSuccess(`Demande ${decision === 'Validee' ? 'validee' : 'rejetee'} avec succes`);
      setShowValidationModal(false);
      setValidationAction(null);
      fetchDemandes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la validation');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Ouvrir la modal avec l'action choisie
  const openValidationModal = (demande: Demande, action: 'Validee' | 'Refusee') => {
    setSelectedDemande(demande);
    setValidationAction(action);
    setShowValidationModal(true);
  };

  const handleDelete = async () => {
    if (!demandeToDelete) return;
    try {
      await demandeService.deleteDemande(demandeToDelete.id);
      setSuccess(`Demande ${demandeToDelete.reference} supprimee avec succes`);
      setShowDeleteConfirm(false);
      setDemandeToDelete(null);
      fetchDemandes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
      setTimeout(() => setError(''), 3000);
    }
  };

  // ✅ Déterminer si le rôle courant peut utiliser le filtre "à valider"
  const canUseAValiderFilter = user?.role
    ? ['manager', 'directeur', 'rh', 'daf', 'dga', 'dg', 'superadmin'].includes(user.role)
    : false;

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
              ? 'Gerez vos demandes de recrutement'
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

      {/* BARRE DE FILTRES */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>

        <select
          value={filters.statut}
          onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: filters.statut ? '1.5px solid var(--primary, #2563eb)' : '1px solid var(--border)',
            fontSize: 13,
            color: filters.statut ? 'var(--primary, #2563eb)' : 'inherit',
            background: filters.statut ? 'var(--primary-light, #eff6ff)' : 'var(--bg, #fff)',
            cursor: 'pointer',
            outline: 'none',
            fontWeight: filters.statut ? 500 : 400,
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="BROUILLON">Brouillon</option>
          <option value="EN_VALIDATION_DIR">Validation Directeur / Manager</option>
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
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: filters.priorite ? '1.5px solid var(--primary, #2563eb)' : '1px solid var(--border)',
            fontSize: 13,
            color: filters.priorite ? 'var(--primary, #2563eb)' : 'inherit',
            background: filters.priorite ? 'var(--primary-light, #eff6ff)' : 'var(--bg, #fff)',
            cursor: 'pointer',
            outline: 'none',
            fontWeight: filters.priorite ? 500 : 400,
          }}
        >
          <option value="">Toutes les priorités</option>
          <option value="HAUTE">Haute</option>
          <option value="MOYENNE">Moyenne</option>
          <option value="BASSE">Basse</option>
        </select>

        {canUseAValiderFilter && (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 8,
            border: filters.aValider ? '1.5px solid var(--primary, #2563eb)' : '1px solid var(--border)',
            background: filters.aValider ? 'var(--primary-light, #eff6ff)' : 'var(--bg, #fff)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: filters.aValider ? 500 : 400,
            color: filters.aValider ? 'var(--primary, #2563eb)' : 'inherit',
            userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={filters.aValider}
              onChange={(e) => setFilters({ ...filters, aValider: e.target.checked })}
              style={{ accentColor: 'var(--primary, #2563eb)', width: 14, height: 14, cursor: 'pointer' }}
            />
            Mes demandes à valider
          </label>
        )}

        {(filters.statut || filters.priorite || filters.aValider) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ statut: '', priorite: '', aValider: false })}
          >
            Réinitialiser
          </Button>
        )}

      </div>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Reference</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Poste</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Priorite</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Budget</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Statut</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Circuit</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demandes.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {filters.aValider
                        ? 'Aucune demande en attente de votre validation.'
                        : 'Aucune demande trouvée.'}
                    </td>
                  </tr>
                ) : (
                  demandes.map((demande) => {
                    const validationEnCours = demande.validations?.find(v => v.decision === 'EN_ATTENTE');
                    const statusLabel = getStatusLabel(demande.statut, validationEnCours);
                    const statusVariant = getStatusVariant(demande.statut);
                    const priorite = getPrioriteBadge(demande.priorite);
                    const circuitLabels = getCircuitLabels(demande);
                    const currentStep = getCurrentStep(demande, circuitLabels);
                    const isSubmittable = demande.statut === 'BROUILLON' && demande.createur?.id === user?.id;
                    const isValidable = canUserValidate(demande);
                    const isDeletable = canDelete(demande);

                    return (
                      <tr key={demande.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '16px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{demande.reference}</span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 500 }}>{demande.intitulePoste}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {demande.createur?.prenom} {demande.createur?.nom} • {getNiveauLabel(demande.niveau)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Createur: {demande.createur?.role} | Manager: {demande.manager?.prenom} {demande.manager?.nom}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <Badge variant={priorite.variant as any}>{priorite.label}</Badge>
                        </td>
                        <td style={{ padding: '16px' }}>
                          {demande.budgetMin} - {demande.budgetMax} DT
                        </td>
                        <td style={{ padding: '16px' }}>
                          <Badge variant={statusVariant as any}>{statusLabel}</Badge>
                          {validationEnCours && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                              En attente: {validationEnCours.acteur?.role}
                            </div>
                          )}
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
                                <Button
                                  variant="danger"
                                  size="xs"
                                  onClick={() => openValidationModal(demande, 'Refusee')}
                                  title="Refuser"
                                >
                                  <XCircle size={14} />
                                </Button>
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
                            <Button variant="ghost" size="xs" onClick={() => window.location.href = `/demandes/${demande.id}`} title="Voir details">
                              <Eye size={14} />
                            </Button>
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

      <DemandeFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchDemandes();
          setSuccess('Demande creee avec succes');
          setTimeout(() => setSuccess(''), 3000);
        }}
      />

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
            Etes-vous sur de vouloir supprimer la demande <strong>{demandeToDelete?.reference}</strong> ?
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Cette action est irreversible et supprimera definitivement la demande ainsi que toutes ses donnees associees.
          </p>
        </div>
      </Modal>
    </div>
  );
};