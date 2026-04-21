// frontend/src/components/pages/demandes/DemandeDetailsPage.tsx

import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, FileText, CheckCircle, XCircle, Clock, AlertCircle, Info, Edit, X } from 'lucide-react';
import { demandeService } from '../../../services/demande.service';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { CircuitSteps } from '../../ui/CircuitSteps';
import { ValidationModal } from './ValidationModal';

interface Props {
  id: string;
}

// ✅ Fonction pour obtenir le libellé du niveau
const getNiveauLabel = (niveau: string): string => {
  const labels: Record<string, string> = {
    'TECHNICIEN': ' Technicien',
    'EMPLOYE': ' Employé',
    'CADRE_DEBUTANT': ' Cadre débutant',
    'CADRE_CONFIRME': ' Cadre confirmé',
    'CADRE_SUPERIEUR': ' Cadre supérieur',
    'STRATEGIQUE': ' Stratégique'
  };
  return labels[niveau] || niveau;
};

interface DemandeDetail {
  id: string;
  reference: string;
  intitulePoste: string;
  niveau: string;
  description?: string;
  justification: string;
  motif: string;
  typeContrat: string;
  priorite: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetEstime?: number;
  dateSouhaitee: string;
  statut: string;
  etapeActuelle: number;
  totalEtapes?: number;
  circuitType?: string;
  createur?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: string;
  };
  manager?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
  direction?: {
    id: string;
    code: string;
    nom: string;
  };
  validations?: {
    id: string;
    niveauEtape: number;
    acteur: {
      id: string;
      nom: string;
      prenom: string;
      email: string;
      role: string;
    };
    decision: string;
    commentaire?: string;
    dateLimite: string;
    dateDecision?: string;
  }[];
  disponibilites?: {
    id: string;
    date: string;
    heureDebut: string;
    heureFin: string;
  }[];
  disponibilitesInterviewers?: {
    id: string;
    userId: string;
    user?: {
      id: string;
      nom: string;
      prenom: string;
      role: string;
    };
    date: string;
    heureDebut: string;
    heureFin: string;
    reservee: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

const buildMockDemande = (id: string): DemandeDetail => ({
  id,
  reference: 'DEM-2026-001',
  intitulePoste: 'Développeur Full Stack',
  niveau: 'CADRE_CONFIRME',
  description: "Développement d'applications web avec React et Node.js",
  justification: "Besoin de renforcer l'équipe technique pour le nouveau projet",
  motif: 'RENFORCEMENT',
  typeContrat: 'CDI',
  priorite: 'HAUTE',
  budgetMin: 3500,
  budgetMax: 4500,
  dateSouhaitee: new Date().toISOString(),
  statut: 'EN_VALIDATION_DIR',
  etapeActuelle: 1,
  totalEtapes: 4,
  circuitType: 'CADRE_CONFIRME',
  createur: {
    id: '1',
    nom: 'Ben Ali',
    prenom: 'Mohamed',
    email: 'manager@kilani.tn',
    role: 'MANAGER'
  },
  manager: {
    id: '1',
    nom: 'Ben Ali',
    prenom: 'Mohamed',
    email: 'manager@kilani.tn',
  },
  direction: {
    id: '1',
    code: 'DIR_SI',
    nom: "Direction Systèmes d'Information",
  },
  validations: [
    {
      id: '1',
      niveauEtape: 1,
      acteur: {
        id: '2',
        nom: 'Kilani',
        prenom: 'Ahmed',
        email: 'directeur@kilani.tn',
        role: 'DIRECTEUR',
      },
      decision: 'EN_ATTENTE',
      dateLimite: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    },
  ],
  disponibilites: [],
  disponibilitesInterviewers: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const DemandeDetailsPage = ({ id }: Props) => {
  const { user } = useAuth();

  const [demande, setDemande] = useState<DemandeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedValidation, setSelectedValidation] = useState<{ id: string; etape: number } | null>(null);
  const [validationAction, setValidationAction] = useState<'Validee' | 'Refusee' | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    intitulePoste: '',
    description: '',
    justification: '',
    budgetMin: '',
    budgetMax: '',
    dateSouhaitee: ''
  });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchDemande();
  }, [id]);

  const fetchDemande = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await demandeService.getDemandeById(id);
      if (response?.data?.demande) {
        setDemande(response.data.demande);
      } else {
        setDemande(buildMockDemande(id));
      }
    } catch (err: any) {
      console.error('❌ Erreur API:', err);
      setDemande(buildMockDemande(id));
    } finally {
      setLoading(false);
    }
  };

  const canEdit = () => {
    if (!user || !demande) return false;
    return demande.createur?.id === user.id && demande.statut === 'BROUILLON';
  };

  // ✅ Fonction pour vérifier si l'utilisateur peut valider la demande
  const canValidate = () => {
    if (!user || !demande) return false;
    
    const validatingRoles = ['directeur', 'rh', 'daf', 'dga', 'dg', 'superadmin'];
    if (!validatingRoles.includes(user.role)) return false;
    
    if (demande.statut === 'VALIDEE' || demande.statut === 'REJETEE') return false;
    if (demande.statut === 'BROUILLON') return false;
    
    const validationEnCours = demande.validations?.find(v => v.decision === 'EN_ATTENTE');
    if (!validationEnCours) return false;
    
    return validationEnCours.acteur.id === user.id;
  };

  const openEditForm = () => {
    if (demande) {
      setEditForm({
        intitulePoste: demande.intitulePoste,
        description: demande.description || '',
        justification: demande.justification,
        budgetMin: demande.budgetMin?.toString() || '',
        budgetMax: demande.budgetMax?.toString() || '',
        dateSouhaitee: demande.dateSouhaitee.split('T')[0]
      });
      setIsEditing(true);
      setEditError('');
    }
  };

  const handleSaveEdit = async () => {
    if (!demande) return;
    
    const minNum = parseFloat(editForm.budgetMin);
    const maxNum = parseFloat(editForm.budgetMax);
    
    if (minNum >= maxNum) {
      setEditError('Le budget minimum doit être inférieur au budget maximum');
      return;
    }
    
    if (!editForm.intitulePoste || !editForm.justification || !editForm.dateSouhaitee) {
      setEditError('Les champs obligatoires doivent être remplis');
      return;
    }
    
    setEditLoading(true);
    try {
      await demandeService.updateDemande(demande.id, {
        intitulePoste: editForm.intitulePoste,
        description: editForm.description,
        justification: editForm.justification,
        budgetMin: minNum,
        budgetMax: maxNum,
        dateSouhaitee: editForm.dateSouhaitee
      });
      setSuccess('Demande modifiée avec succès');
      setIsEditing(false);
      fetchDemande();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setEditLoading(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditError('');
  };

  const handleValidation = async (decision: 'Validee' | 'Refusee', commentaire?: string) => {
    if (!selectedValidation) return;
    try {
      await demandeService.validerDemande(selectedValidation.id, decision, commentaire);
      setSuccess(`Demande ${decision === 'Validee' ? 'validée' : 'rejetée'} avec succès`);
      setShowValidationModal(false);
      setValidationAction(null);
      fetchDemande();
    } catch (err) {
      setError('Erreur lors de la validation');
    }
  };

  const goBack = () => {
    window.location.href = '/demandes';
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
      VALIDEE: { variant: 'green', label: 'Validée' },
      REJETEE: { variant: 'red', label: 'Rejetée' },
    };
    return statusMap[statut] || { variant: 'gold', label: statut };
  };

  const getPrioriteBadge = (priorite: string) => {
    const priorityMap: Record<string, { variant: string; label: string }> = {
      HAUTE: { variant: 'red', label: 'Haute' },
      MOYENNE: { variant: 'amber', label: 'Moyenne' },
      BASSE: { variant: 'green', label: 'Basse' },
    };
    return priorityMap[priorite] || { variant: 'gold', label: priorite };
  };

  const getMotifLabel = (motif: string) => {
    const motifMap: Record<string, string> = {
      CREATION: 'Création de poste',
      REMPLACEMENT: 'Remplacement',
      RENFORCEMENT: "Renforcement d'équipe",
      NOUVEAU_POSTE: 'Nouveau poste',
      EXPANSION: 'Expansion',
    };
    return motifMap[motif] || motif;
  };

  const getTypeContratLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      CDI: 'CDI',
      CDD: 'CDD',
      STAGE: 'Stage',
      ALTERNANCE: 'Alternance',
      FREELANCE: 'Freelance',
    };
    return typeMap[type] || type;
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'VALIDEE': return <CheckCircle size={16} style={{ color: 'var(--green)' }} />;
      case 'REFUSEE': return <XCircle size={16} style={{ color: 'var(--red)' }} />;
      default: return <Clock size={16} style={{ color: 'var(--amber)' }} />;
    }
  };

  const getDecisionLabel = (decision: string) => {
    switch (decision) {
      case 'VALIDEE': return 'Validée';
      case 'REFUSEE': return 'Refusée';
      default: return 'En attente';
    }
  };

  const getCircuitLabels = () => {
    if (!demande) return [];
    const circuits: Record<string, string[]> = {
      TECHNICIEN:      ['MANAGER', 'DIRECTEUR', 'DRH'],
      EMPLOYE:         ['MANAGER', 'DIRECTEUR', 'DRH'],
      CADRE_DEBUTANT:  ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF'],
      CADRE_CONFIRME:  ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA'],
      CADRE_SUPERIEUR: ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'],
      STRATEGIQUE:     ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'],
    };
    
    const circuitComplet = circuits[demande.circuitType || 'CADRE_CONFIRME'] || ['DIRECTEUR', 'DRH', 'DAF', 'DGA'];
    const createurRole = demande.createur?.role?.toUpperCase();
    
    if (!createurRole) return circuitComplet;
    
    // Filtrer pour exclure le créateur
    return circuitComplet.filter(label => label !== createurRole);
  };

  const getDisplayCurrentStep = () => {
    if (!demande) return 0;
    
    // Si validée → toutes les étapes
    if (demande.statut === 'VALIDEE') return getCircuitLabels().length;
    
    // Si rejetée → étape où ça a bloqué
    if (demande.statut === 'REJETEE') {
      const refusee = demande.validations?.find(v => v.decision === 'REFUSEE');
      if (refusee) {
        const circuitLabels = getCircuitLabels();
        const idx = circuitLabels.indexOf(refusee.acteur?.role?.toUpperCase() || '');
        return idx >= 0 ? idx : 0;
      }
      return 0;
    }
    
    // Sinon → étape en cours
    const validationEnCours = demande.validations?.find(v => v.decision === 'EN_ATTENTE');
    if (validationEnCours) {
      const circuitLabels = getCircuitLabels();
      const idx = circuitLabels.indexOf(validationEnCours.acteur?.role?.toUpperCase() || '');
      return idx >= 0 ? idx : 0;
    }
    
    return 0;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('fr-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const showCreatorReminder = demande && demande.createur && demande.manager && demande.createur.id !== demande.manager.id;
  const isCreatorSkipped = demande && demande.createur && ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'].includes(demande.createur.role);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Chargement des détails de la demande...
      </div>
    );
  }

  if (!demande) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert variant="red">Demande non trouvée</Alert>
        <Button onClick={goBack} style={{ marginTop: 16 }}>
          Retour aux demandes
        </Button>
      </div>
    );
  }

  const status = getStatusBadge(demande.statut);
  const priorite = getPrioriteBadge(demande.priorite);
  const circuitLabels = getCircuitLabels();
  const displayCurrentStep = getDisplayCurrentStep();
  const isValidable = canValidate(); // ✅ Maintenant la fonction existe
  const validationEnCours = demande.validations?.find(v => v.decision === 'EN_ATTENTE');
  const budgetText = demande.budgetMin && demande.budgetMax 
    ? `${demande.budgetMin} - ${demande.budgetMax} DT` 
    : demande.budgetEstime ? `${demande.budgetEstime} DT` : 'Non spécifié';
  const isEditable = canEdit();

  return (
    <div className="page-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button variant="ghost" size="xs" onClick={goBack} style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
              Demande {demande.reference}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Badge variant={status.variant as any}>{status.label}</Badge>
              <Badge variant={priorite.variant as any}>{priorite.label}</Badge>
            </div>
          </div>
        </div>
        {isEditable && !isEditing && (
          <Button variant="secondary" size="sm" onClick={openEditForm}>
            <Edit size={14} style={{ marginRight: 6 }} />
            Modifier
          </Button>
        )}
      </div>

      {/* REMINDER */}
      {showCreatorReminder && (
        <div style={{ marginBottom: 20 }}>
          <Alert variant="gold">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={16} />
              <span>
                <strong>Demande créée par {demande.createur?.prenom} {demande.createur?.nom} ({demande.createur?.role})</strong>
                {isCreatorSkipped && (
                  <span style={{ marginLeft: 8 }}>
                    • Le rôle <strong>{demande.createur?.role}</strong> ne participe pas à la validation de cette demande
                  </span>
                )}
              </span>
            </div>
          </Alert>
        </div>
      )}

      {/* Alertes */}
      {error && <div style={{ marginBottom: 20 }}><Alert variant="red">{error}</Alert></div>}
      {success && <div style={{ marginBottom: 20 }}><Alert variant="green">{success}</Alert></div>}

      {/* Formulaire d'édition - reste identique */}
      {isEditing ? (
        <Card style={{ marginBottom: 24 }}>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Modifier la demande</h3>
              <Button variant="ghost" size="xs" onClick={cancelEdit}>
                <X size={16} />
              </Button>
            </div>
            
            {editError && <div style={{ marginBottom: 16 }}><Alert variant="red">{editError}</Alert></div>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Intitulé du poste <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editForm.intitulePoste}
                  onChange={(e) => setEditForm({ ...editForm, intitulePoste: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Budget mensuel (DT) <span style={{ color: 'red' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <input type="number" placeholder="Min" value={editForm.budgetMin} onChange={(e) => setEditForm({ ...editForm, budgetMin: e.target.value })} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }} />
                  <input type="number" placeholder="Max" value={editForm.budgetMax} onChange={(e) => setEditForm({ ...editForm, budgetMax: e.target.value })} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }} />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Date souhaitée <span style={{ color: 'red' }}>*</span>
                </label>
                <input type="date" value={editForm.dateSouhaitee} onChange={(e) => setEditForm({ ...editForm, dateSouhaitee: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }} />
              </div>
              
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Justification <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea value={editForm.justification} onChange={(e) => setEditForm({ ...editForm, justification: e.target.value })} rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }} />
              </div>
              
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Description du poste
                </label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }} />
              </div>
              
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <Button variant="ghost" onClick={cancelEdit}>Annuler</Button>
                <Button variant="primary" onClick={handleSaveEdit} disabled={editLoading}>
                  {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Grille d'informations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
            <Card>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <FileText size={18} style={{ color: 'var(--gold)' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Informations générales</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Intitulé du poste</div><div style={{ fontWeight: 500 }}>{demande.intitulePoste}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Niveau du poste</div><div>{getNiveauLabel(demande.niveau)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Motif</div><div>{getMotifLabel(demande.motif)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Type de contrat</div><div>{getTypeContratLabel(demande.typeContrat)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Budget mensuel</div><div>{budgetText}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date souhaitée</div><div>{formatDate(demande.dateSouhaitee)}</div></div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <User size={18} style={{ color: 'var(--gold)' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Responsable</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Créateur</div><div>{demande.createur?.prenom} {demande.createur?.nom}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{demande.createur?.role} • {demande.createur?.email}</div></div>
                  {demande.manager && demande.manager.id !== demande.createur?.id && (<div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Manager</div><div>{demande.manager.prenom} {demande.manager.nom}</div></div>)}
                  {demande.direction && (<div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Direction</div><div>{demande.direction.nom}</div></div>)}
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date de création</div><div>{formatDate(demande.createdAt)}</div></div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Description et justification */}
          <Card style={{ marginBottom: 24 }}>
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <FileText size={18} style={{ color: 'var(--gold)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Description et justification</h3>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Justification</div>
                <div style={{ background: 'var(--surface)', padding: 12, borderRadius: 8 }}>{demande.justification}</div>
              </div>
              {demande.description && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Description du poste</div>
                  <div style={{ background: 'var(--surface)', padding: 12, borderRadius: 8 }}>{demande.description}</div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Circuit de validation */}
          <Card style={{ marginBottom: 24 }}>
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Clock size={18} style={{ color: 'var(--gold)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Circuit de validation</h3>
              </div>
              <div style={{ marginBottom: 24, overflowX: 'auto' }}>
                <CircuitSteps labels={circuitLabels} currentStep={displayCurrentStep} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 11, color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--green)' }} /><span>Validée</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--gold)' }} /><span>En cours</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--white)', border: '1px solid var(--border)' }} /><span>À venir</span></div>
              </div>
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Historique des validations</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Étape</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Validateur</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Décision</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Commentaire</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Date</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Délai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demande.validations?.map((validation) => {
                      const isEnAttente = validation.decision === 'EN_ATTENTE';
                      const isExpired = isEnAttente && new Date(validation.dateLimite) < new Date();
                      return (
                        <tr key={validation.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '12px 8px', fontSize: 13 }}>
                            <strong>Étape {validation.niveauEtape}</strong>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{circuitLabels[validation.niveauEtape - 1] || `Niveau ${validation.niveauEtape}`}</div>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: 13 }}>
                            <div>{validation.acteur.prenom} {validation.acteur.nom}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{validation.acteur.role}</div>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {getDecisionIcon(validation.decision)}
                              <span style={{ color: validation.decision === 'VALIDEE' ? 'var(--green)' : validation.decision === 'REFUSEE' ? 'var(--red)' : 'var(--amber)' }}>
                                {getDecisionLabel(validation.decision)}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text-muted)' }}>{validation.commentaire || '-'}</td>
                          <td style={{ padding: '12px 8px', fontSize: 12 }}>{validation.dateDecision ? formatDate(validation.dateDecision) : '-'}</td>
                          <td style={{ padding: '12px 8px', fontSize: 12 }}>
                            {isEnAttente ? (
                              <span style={{ color: isExpired ? 'var(--red)' : 'var(--amber)' }}>
                                {formatDate(validation.dateLimite)}
                                {isExpired && <AlertCircle size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                              </span>
                            ) : (formatDate(validation.dateLimite))}
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Disponibilités techniques (créées par le créateur) */}
          {demande.disponibilites && demande.disponibilites.length > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Calendar size={18} style={{ color: 'var(--gold)' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Disponibilités pour entretiens techniques</h3>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {demande.disponibilites.map((dispo) => (
                    <div key={dispo.id} style={{ background: 'var(--surface)', padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                      <span style={{ fontWeight: 500 }}>{new Date(dispo.date).toLocaleDateString('fr-TN')}</span>
                      <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
                      <span>{dispo.heureDebut} - {dispo.heureFin}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Disponibilités des interviewers (MANAGER/DIRECTEUR) */}
          {demande.disponibilitesInterviewers && demande.disponibilitesInterviewers.length > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <CardHeader>
                <CardTitle>Disponibilités des interviewers</CardTitle>
                <CardSubtitle>Créneaux saisis par le manager et le directeur pour les entretiens</CardSubtitle>
              </CardHeader>
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {demande.disponibilitesInterviewers.map((dispo) => (
                    <div
                      key={dispo.id}
                      style={{
                        padding: 12,
                        border: `1px solid ${dispo.reservee ? 'var(--green)' : 'var(--border-light)'}`,
                        borderRadius: 8,
                        background: dispo.reservee ? 'rgba(90,122,58,0.05)' : 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Badge variant={dispo.user?.role === 'MANAGER' ? 'olive' : 'gold'}>
                            {dispo.user?.role === 'MANAGER' ? ' Manager' : ' Directeur'}
                          </Badge>
                          <span style={{ marginLeft: 12, fontWeight: 500 }}>
                            {dispo.user?.prenom} {dispo.user?.nom}
                          </span>
                        </div>
                        {dispo.reservee && <Badge variant="green">✅ Réservé</Badge>}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 13 }}>
                        <Calendar size={14} style={{ display: 'inline', marginRight: 6 }} />
                        {new Date(dispo.date).toLocaleDateString('fr-FR')}
                        <span style={{ marginLeft: 16 }}>
                          <Clock size={14} style={{ display: 'inline', marginRight: 6 }} />
                          {dispo.heureDebut} - {dispo.heureFin}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Boutons de validation */}
          {isValidable && validationEnCours && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 24 }}>
              <Button variant="danger" size="sm" onClick={() => {
                setSelectedValidation({ id: demande.id, etape: validationEnCours.niveauEtape });
                setValidationAction('Refusee');
                setShowValidationModal(true);
              }}>
                Refuser
              </Button>
              <Button variant="primary" size="sm" onClick={() => {
                setSelectedValidation({ id: demande.id, etape: validationEnCours.niveauEtape });
                setValidationAction('Validee');
                setShowValidationModal(true);
              }}>
                Valider
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal de validation */}
      <ValidationModal
        open={showValidationModal}
        demande={demande as any}
        onClose={() => setShowValidationModal(false)}
        onValidate={handleValidation}
        defaultAction={validationAction}
      />
    </div>
  );
};