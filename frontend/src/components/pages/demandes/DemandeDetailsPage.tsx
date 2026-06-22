// frontend/src/components/pages/demandes/DemandeDetailsPage.tsx

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, FileText, CheckCircle, XCircle, Clock, AlertCircle, Info, Edit, X, Lock, RefreshCw } from 'lucide-react';
import { demandeService, Demande } from '../../../services/demande.service';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardBody } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { CircuitSteps } from '../../ui/CircuitSteps';
import { ValidationModal } from './ValidationModal';
import { normalizeRole } from '../../../types';

interface DemandeDetailsPageProps {
  id?: string;
}

const getNiveauLabel = (niveau: string): string => {
  const labels: Record<string, string> = {
    'TECHNICIEN': 'Technicien',
    'EMPLOYE': 'Employe',
    'CADRE_DEBUTANT': 'Cadre debutant',
    'CADRE_CONFIRME': 'Cadre confirme',
    'CADRE_SUPERIEUR': 'Cadre superieur',
    'STRATEGIQUE': 'Strategique'
  };
  return labels[niveau] || niveau;
};

export const DemandeDetailsPage = ({ id: propId }: DemandeDetailsPageProps) => {
  const { id: paramId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Utiliser l'ID de la prop OU de l'URL
  const id = propId || paramId;
  
  console.log('>>> id (prop):', propId);
  console.log('>>> id (param):', paramId);
  console.log('>>> id (final):', id);

  const [demande, setDemande] = useState<Demande | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationAction, setValidationAction] = useState<'Validee' | 'Refusee' | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [isAuthorizedValidator, setIsAuthorizedValidator] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  
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
  const [relanceLoading, setRelanceLoading] = useState(false);

  const token = searchParams.get('token');
  const isValidationRoute = window.location.pathname.includes('/validation/');

  // Attendre que le contexte soit charge
  useEffect(() => {
    if (!loading) {
      setPageLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    if (pageLoading) return;
    if (hasFetched) return;
    
    console.log('>>> useEffect - id:', id);
    console.log('>>> useEffect - user:', user);
    console.log('>>> useEffect - isValidationRoute:', isValidationRoute);
    console.log('>>> useEffect - token:', token);

    if (!id) return;

    if (isValidationRoute && token) {
      setHasFetched(true);
      fetchDemandeWithToken();
    } else {
      if (!user) {
        const redirectPath = window.location.pathname + window.location.search;
        navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }
      setHasFetched(true);
      fetchDemande();
    }
  }, [id, token, user, pageLoading, hasFetched]);

  // Reinitialiser hasFetched quand l'ID change
  useEffect(() => {
    setHasFetched(false);
  }, [id]);

  const fetchDemandeWithToken = async () => {
    try {
      setPageLoading(true);
      setError('');
      
      const response = await demandeService.getDemandeWithToken(id!, token!);
      if (response?.data?.demande) {
        setDemande(response.data.demande);
        setTokenValid(true);
        
        if (user) {
          const validationEnCours = response.data.demande.validations?.find((v: any) => v.decision === 'EN_ATTENTE');
          if (validationEnCours && validationEnCours.acteur.id === user.id) {
            setIsAuthorizedValidator(true);
          } else {
            setIsAuthorizedValidator(false);
          }
        } else {
          setIsAuthorizedValidator(false);
        }
      } else {
        setError('Demande non trouvee');
      }
    } catch (err: any) {
      console.error('Erreur API avec token:', err);
      if (err.response?.status === 403) {
        setError('Token de validation invalide ou expire.');
      } else if (err.response?.status === 401) {
        setError('Token de validation manquant.');
      } else {
        setError('Erreur lors du chargement de la demande');
      }
      setTokenValid(false);
      setIsAuthorizedValidator(false);
    } finally {
      setPageLoading(false);
    }
  };

  const fetchDemande = async () => {
    try {
      setPageLoading(true);
      setError('');
      
      const response = await demandeService.getDemandeById(id!);
      if (response?.data?.demande) {
        setDemande(response.data.demande);
        
        const validationEnCours = response.data.demande.validations?.find((v: any) => v.decision === 'EN_ATTENTE');
        if (validationEnCours && user && validationEnCours.acteur.id === user.id) {
          setIsAuthorizedValidator(true);
        } else {
          setIsAuthorizedValidator(false);
        }
      } else {
        setError('Demande non trouvee');
      }
    } catch (err: any) {
      console.error('Erreur API:', err);
      setError('Erreur lors du chargement de la demande');
    } finally {
      setPageLoading(false);
    }
  };

  const canEdit = () => {
    if (!user || !demande) return false;
    return demande.createur?.id === user.id && demande.statut === 'BROUILLON';
  };

  const canValidate = () => {
  if (!user || !demande) return false;
  
  if (!isValidationRoute) return false;
  if (!tokenValid) return false;
  if (!isAuthorizedValidator) return false;
  
  const validatingRoles = ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'];
  const userRoleUpper = user.role.toUpperCase();
  if (!validatingRoles.includes(userRoleUpper)) return false;
  
  if (demande.statut === 'VALIDEE' || demande.statut === 'REJETEE') return false;
  if (demande.statut === 'ANNULEE') return false;  // ← ajout
  if (demande.statut === 'BROUILLON') return false;
  
  const validationEnCours = demande.validations?.find((v: any) => v.decision === 'EN_ATTENTE');
  if (!validationEnCours) return false;
  
  return validationEnCours.acteur.id === user.id;
};

const canRelancer = (): boolean => {
  if (!user || !demande) return false;
  const roleNormalise = normalizeRole(user.role);
  return (roleNormalise === 'DRH' || roleNormalise === 'SUPER_ADMIN') && demande.statut === 'ANNULEE';
};

  const canViewDemande = (): boolean => {
    if (isValidationRoute) {
      if (!tokenValid) return false;
      if (!user) return false;
      if (!isAuthorizedValidator) return false;
      return true;
    }
    return !!user;
  };

  const renderUnauthorizedMessage = () => {
    if (isValidationRoute) {
      if (!tokenValid) {
        return <Alert variant="red">Token de validation invalide ou expire.</Alert>;
      }
      
      if (!user) {
        return (
          <Alert variant="amber">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Lock size={20} />
              <div>
                <strong>Connexion requise</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 14 }}>
                  Veuillez vous connecter pour acceder a cette demande de validation.
                </p>
                <Button 
                  variant="primary" 
                  size="sm" 
                  style={{ marginTop: 8 }}
                  onClick={() => navigate(`/login?redirect=${window.location.pathname}${window.location.search}`)}
                >
                  Se connecter
                </Button>
              </div>
            </div>
          </Alert>
        );
      }
      
      if (user && !isAuthorizedValidator) {
        const validationEnCours = demande?.validations?.find((v: any) => v.decision === 'EN_ATTENTE');
        return (
          <Alert variant="amber">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Lock size={20} />
              <div>
                <strong>Acces non autorise</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 14 }}>
                  Vous n'etes pas le validateur designe pour cette demande. 
                  Seul le validateur ({validationEnCours?.acteur?.role}) peut acceder a cette page de validation.
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  style={{ marginTop: 8 }}
                  onClick={() => navigate('/demandes')}
                >
                  Retour aux demandes
                </Button>
              </div>
            </div>
          </Alert>
        );
      }
    }
    return null;
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
      setEditError('Le budget minimum doit etre inferieur au budget maximum');
      return;
    }
    
    if (!editForm.intitulePoste || !editForm.justification || !editForm.dateSouhaitee) {
      setEditError('Les champs obligatoires doivent etre remplis');
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
      setSuccess('Demande modifiee avec succes');
      setIsEditing(false);
      setHasFetched(false);
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

  const handleValidation = async (decision: 'Validee' | 'Refusee', commentaire?: string, disponibilites?: any[]) => {
    if (!demande) return;
    try {
      await demandeService.validerDemande(demande.id, decision, commentaire, disponibilites,token ?? undefined );
      setSuccess(`Demande ${decision === 'Validee' ? 'validee' : 'rejetee'} avec succes`);
      setShowValidationModal(false);
      setValidationAction(null);
      setHasFetched(false);
      
      if (isValidationRoute && token) {
        fetchDemandeWithToken();
      } else {
        fetchDemande();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la validation');
    }
  };

  const handleRelancer = async () => {
    if (!demande) return;
    setRelanceLoading(true);
    try {
      await demandeService.relancerManuellement(demande.id);
      setSuccess('Demande relancee avec succes');
      setHasFetched(false);
      fetchDemande();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la relance');
    } finally {
      setRelanceLoading(false);
    }
  };

  const goBack = () => {
    navigate('/demandes');
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
      VALIDEE: { variant: 'green', label: 'Validee' },
      REJETEE: { variant: 'red', label: 'Rejetee' },
      ANNULEE: { variant: 'red', label: 'Annulee' },
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
      CREATION: 'Creation de poste',
      REMPLACEMENT: 'Remplacement',
      RENFORCEMENT: "Renforcement d'equipe",
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
      case 'VALIDEE': return 'Validee';
      case 'REFUSEE': return 'Refusee';
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
      CADRE_SUPERIEUR: ['DIRECTEUR', 'DRH', 'DAF', 'DGA'],
      STRATEGIQUE:     ['DIRECTEUR', 'DRH', 'DAF', 'DGA'],
    };
    
    let circuitComplet = circuits[demande.circuitType || 'CADRE_CONFIRME'] || ['DIRECTEUR', 'DRH', 'DAF', 'DGA'];
    const createurRole = demande.createur?.role?.toUpperCase();
    
    if (demande.dgaActif === false) {
      circuitComplet = circuitComplet.map((role: string) => 
        role === 'DGA' ? 'DG' : role
      );
    }
    
    if (!createurRole) return circuitComplet;
    
    return circuitComplet.filter((label: string) => label !== createurRole);
  };

  const getDisplayCurrentStep = () => {
    if (!demande) return 0;
    
    if (demande.statut === 'VALIDEE') return getCircuitLabels().length;
    
    if (demande.statut === 'REJETEE') {
      const refusee = demande.validations?.find((v: any) => v.decision === 'REFUSEE');
      if (refusee) {
        const circuitLabels = getCircuitLabels();
        const idx = circuitLabels.indexOf(refusee.acteur?.role?.toUpperCase() || '');
        return idx >= 0 ? idx : 0;
      }
      return 0;
    }
    
    const validationEnCours = demande.validations?.find((v: any) => v.decision === 'EN_ATTENTE');
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

  if (pageLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Chargement des details de la demande...
      </div>
    );
  }

  if (!canViewDemande()) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
        {renderUnauthorizedMessage()}
        <Button onClick={goBack} style={{ marginTop: 16 }}>
          Retour aux demandes
        </Button>
      </div>
    );
  }

  if (error && !demande) {
    return (
      <div style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <Alert variant="red">{error}</Alert>
        <Button onClick={goBack} style={{ marginTop: 16 }}>
          Retour aux demandes
        </Button>
      </div>
    );
  }

  if (!demande) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert variant="red">Demande non trouvee</Alert>
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
  const isValidable = canValidate();
  const isRelancable = canRelancer();
  const validationEnCours = demande.validations?.find((v: any) => v.decision === 'EN_ATTENTE');
  const budgetText = demande.budgetMin && demande.budgetMax 
    ? `${demande.budgetMin} - ${demande.budgetMax} DT` 
    : 'Non specifie';
  const isEditable = canEdit();

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button variant="ghost" size="xs" onClick={goBack} style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
              {isValidationRoute ? 'Validation' : 'Demande'} {demande.reference}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Badge variant={status.variant as any}>{status.label}</Badge>
              <Badge variant={priorite.variant as any}>{priorite.label}</Badge>
              {token && tokenValid && (
                <Badge variant="green">Token valide</Badge>
              )}
              {isValidationRoute && isAuthorizedValidator && (
                <Badge variant="green">Validateur autorise</Badge>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {isRelancable && (
            <Button variant="primary" size="sm" onClick={handleRelancer} disabled={relanceLoading}>
              <RefreshCw size={14} style={{ marginRight: 6 }} />
              {relanceLoading ? 'Relance...' : 'Relancer la demande'}
            </Button>
          )}
          {isEditable && !isEditing && (
            <Button variant="secondary" size="sm" onClick={openEditForm}>
              <Edit size={14} style={{ marginRight: 6 }} />
              Modifier
            </Button>
          )}
        </div>
      </div>

      {isValidationRoute && token && (
        <div style={{ marginBottom: 20 }}>
          <Alert variant="gold">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={16} />
              <span>
                <strong>Mode validation avec token</strong>
                {tokenValid 
                  ? ' - Token valide' 
                  : ' - Token invalide ou expire'
                }
                {isAuthorizedValidator && ' - Vous etes le validateur designe'}
                {!isAuthorizedValidator && user && ' - Vous n\'etes pas le validateur designe'}
              </span>
            </div>
          </Alert>
        </div>
      )}

      {error && <div style={{ marginBottom: 20 }}><Alert variant="red">{error}</Alert></div>}
      {success && <div style={{ marginBottom: 20 }}><Alert variant="green">{success}</Alert></div>}

      {demande.statut === 'ANNULEE' && (
        <div style={{ marginBottom: 20 }}>
          <Alert variant="amber">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertCircle size={20} />
              <div>
                <strong>Demande annulee automatiquement</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 14 }}>
                  Le delai de validation a ete depasse sans reponse du validateur.
                  {isRelancable
                    ? ' Vous pouvez relancer la demande si le validateur est de nouveau disponible.'
                    : ' Seul le DRH peut relancer cette demande.'}
                </p>
              </div>
            </div>
          </Alert>
        </div>
      )}

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
                  Intitule du poste <span style={{ color: 'red' }}>*</span>
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
                  Date souhaitee <span style={{ color: 'red' }}>*</span>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
            <Card>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <FileText size={18} style={{ color: 'var(--gold)' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Informations generales</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Intitule du poste</div><div style={{ fontWeight: 500 }}>{demande.intitulePoste}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Niveau du poste</div><div>{getNiveauLabel(demande.niveau)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Motif</div><div>{getMotifLabel(demande.motif)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Type de contrat</div><div>{getTypeContratLabel(demande.typeContrat)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Budget mensuel</div><div>{budgetText}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date souhaitee</div><div>{formatDate(demande.dateSouhaitee)}</div></div>
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
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Createur</div><div>{demande.createur?.prenom} {demande.createur?.nom}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{demande.createur?.role} • {demande.createur?.email}</div></div>
                  {demande.manager && demande.manager.id !== demande.createur?.id && (<div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Manager</div><div>{demande.manager.prenom} {demande.manager.nom}</div></div>)}
                  {demande.direction && (<div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Direction</div><div>{demande.direction.nom}</div></div>)}
                  <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date de creation</div><div>{formatDate(demande.createdAt)}</div></div>
                </div>
              </CardBody>
            </Card>
          </div>

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--green)' }} /><span>Validee</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--gold)' }} /><span>En cours</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--white)', border: '1px solid var(--border)' }} /><span>A venir</span></div>
              </div>
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Historique des validations</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Etape</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Validateur</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Decision</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Commentaire</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Date</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12 }}>Delai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demande.validations?.map((validation: any) => {
                      const isEnAttente = validation.decision === 'EN_ATTENTE';
                      const isExpired = isEnAttente && new Date(validation.dateLimite) < new Date();
                      return (
                        <tr key={validation.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '12px 8px', fontSize: 13 }}>
                            <strong>Etape {validation.niveauEtape}</strong>
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

          {isValidable && validationEnCours && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 24 }}>
              <Button variant="danger" size="sm" onClick={() => {
                setValidationAction('Refusee');
                setShowValidationModal(true);
              }}>
                Refuser
              </Button>
              <Button variant="primary" size="sm" onClick={() => {
                setValidationAction('Validee');
                setShowValidationModal(true);
              }}>
                Valider
              </Button>
            </div>
          )}
        </>
      )}

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