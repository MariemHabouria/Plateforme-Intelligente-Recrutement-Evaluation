import { useState, useEffect, useMemo } from 'react';
import { Plus, Check, Eye, Send, Trash2, XCircle, RefreshCw, Search } from 'lucide-react';
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
import { normalizeRole } from '../../../types';

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'DIRECTEUR' | 'DRH' | 'DAF' | 'DGA' | 'DG' | 'RESP_PAIE' | 'EMPLOYE';

// Rôles qui voient toutes les directions (cf. demandeController.getDemandes -> pas de restriction `where`)
const ROLES_TRANSVERSAUX = ['DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'];
// Rôles "admin" au sens fort : vue globale organisation, filtres avancés
const ROLES_FULL_ADMIN = ['DRH', 'SUPER_ADMIN'];

// Ordre d'affichage canonique des statuts — aligné sur l'enum StatutDemande complet du schema.prisma
const STATUT_ORDER = [
  'BROUILLON',
  'SOUMISE',
  'EN_VALIDATION_MANAGER',
  'EN_VALIDATION_DIR',
  'EN_VALIDATION_DRH',
  'EN_VALIDATION_DAF',
  'EN_VALIDATION_DGA',
  'EN_VALIDATION_DG',
  'EN_VALIDATION_CONSEIL',
  'VALIDEE',
  'REJETEE',
  'ANNULEE'
];

const TYPE_CONTRAT_LABELS: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'Stage',
  ALTERNANCE: 'Alternance',
  FREELANCE: 'Freelance'
};

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

const CIRCUITS_PAR_NIVEAU: Record<string, string[]> = {
  TECHNICIEN:      ['MANAGER', 'DIRECTEUR', 'DRH'],
  EMPLOYE:         ['MANAGER', 'DIRECTEUR', 'DRH'],
  CADRE_DEBUTANT:  ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF'],
  CADRE_CONFIRME:  ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA'],
  CADRE_SUPERIEUR: ['DIRECTEUR', 'DRH', 'DAF', 'DGA'],
  STRATEGIQUE:     ['DIRECTEUR', 'DRH', 'DAF', 'DGA']
};

const getCircuitLabels = (demande: Demande): string[] => {
  const circuitType = demande.circuitType || demande.niveau;
  let circuitComplet = CIRCUITS_PAR_NIVEAU[circuitType as string] || ['DIRECTEUR', 'DRH', 'DAF', 'DGA'];
  const createurRole = demande.createur?.role?.toUpperCase();

  if (demande.dgaActif === false) {
    circuitComplet = circuitComplet.map(role =>
      role === 'DGA' ? 'DG' : role
    );
  }

  if (createurRole) {
    circuitComplet = circuitComplet.filter(role => role !== createurRole);
  }

  return circuitComplet;
};

const getCurrentStep = (demande: Demande, circuitLabels: string[]): number => {
  if (demande.statut === 'VALIDEE') return circuitLabels.length;

  if (demande.statut === 'REJETEE') {
    const refusee = demande.validations?.find(v => v.decision === 'REFUSEE');
    if (refusee) {
      const acteurRole = refusee.acteur?.role?.toUpperCase();
      const idx = acteurRole ? circuitLabels.indexOf(acteurRole) : -1;
      return idx >= 0 ? idx : 0;
    }
    return 0;
  }

  const validationEnCours = demande.validations?.find(v => v.decision === 'EN_ATTENTE');
  if (!validationEnCours) return 0;

  const acteurRole = validationEnCours.acteur?.role?.toUpperCase();
  if (!acteurRole) return 0;

  const currentIndex = circuitLabels.indexOf(acteurRole);
  return currentIndex >= 0 ? currentIndex : 0;
};

const getStatusLabel = (statut: string, validationEnCours?: { acteur?: { role: string } }): string => {
  if (statut === 'BROUILLON') return 'Brouillon';
  if (statut === 'SOUMISE') return 'Soumise';
  if (statut === 'EN_VALIDATION_MANAGER') return 'Validation Manager';
  if (statut === 'EN_VALIDATION_CONSEIL') return 'Validation Conseil';
  if (statut === 'VALIDEE') return 'Validee';
  if (statut === 'REJETEE') return 'Rejetee';
  if (statut === 'ANNULEE') return 'Annulee';

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

const getStatusVariant = (statut: string): string => {
  if (statut === 'VALIDEE') return 'green';
  if (statut === 'REJETEE') return 'red';
  if (statut === 'ANNULEE') return 'red';
  return 'amber';
};

export const DemandesPage = () => {
  const { user } = useAuth();

  // rawDemandes = tout ce que le backend renvoie pour ce user/scope (avant filtres locaux)
  const [rawDemandes, setRawDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [demandeToDelete, setDemandeToDelete] = useState<Demande | null>(null);
  const [validationAction, setValidationAction] = useState<'Validee' | 'Refusee' | null>(null);

  const [filters, setFilters] = useState({
    statut: '',
    priorite: '',
    direction: '',
    niveau: '',
    typeContrat: '',
    createur: '',
    aValider: false,
    search: ''
  });

  // Seul "aValider" change le scope de la requête backend (some validations EN_ATTENTE pour moi).
  // Tout le reste est filtré localement -> pas de refetch nécessaire.
  useEffect(() => { fetchDemandes(); }, [filters.aValider]);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 100 };
      if (filters.aValider) params.aValider = true;

      const response = await demandeService.getDemandes(params);
      setRawDemandes(response.data.demandes);
    } catch (err) {
      setError('Erreur lors du chargement des demandes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const userRoleUpper = user?.role ? user.role.toUpperCase() : '';
  const isTransversal = ROLES_TRANSVERSAUX.includes(userRoleUpper);
  const isFullAdmin = ROLES_FULL_ADMIN.includes(userRoleUpper);

  // --- Options dynamiques : calculées à partir de ce que CET utilisateur voit réellement ---
  const availableStatuts = useMemo(() => {
    const counts: Record<string, number> = {};
    rawDemandes.forEach(d => { counts[d.statut] = (counts[d.statut] || 0) + 1; });
    return STATUT_ORDER
      .filter(s => counts[s] > 0)
      .map(s => ({ value: s, label: getStatusLabel(s), count: counts[s] }));
  }, [rawDemandes]);

  const availablePriorites = useMemo(() => {
    const labels: Record<string, string> = { HAUTE: 'Haute', MOYENNE: 'Moyenne', BASSE: 'Basse' };
    const order = ['HAUTE', 'MOYENNE', 'BASSE'];
    const counts: Record<string, number> = {};
    rawDemandes.forEach(d => { counts[d.priorite] = (counts[d.priorite] || 0) + 1; });
    return order
      .filter(p => counts[p] > 0)
      .map(p => ({ value: p, label: labels[p], count: counts[p] }));
  }, [rawDemandes]);

  const availableNiveaux = useMemo(() => {
    const counts: Record<string, number> = {};
    rawDemandes.forEach(d => { if (d.niveau) counts[d.niveau] = (counts[d.niveau] || 0) + 1; });
    return Object.keys(counts)
      .map(n => ({ value: n, label: getNiveauLabel(n), count: counts[n] }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rawDemandes]);

  // Direction : pertinent pour les rôles qui voient plusieurs directions
  const availableDirections = useMemo(() => {
    if (!isTransversal) return [];
    const map = new Map<string, string>();
    rawDemandes.forEach(d => {
      if (d.direction?.id) map.set(d.direction.id, d.direction.nom);
    });
    return Array.from(map, ([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [rawDemandes, isTransversal]);

  // Type de contrat et créateur : utiles seulement en vue globale (DRH / SUPER_ADMIN)
  const availableTypeContrats = useMemo(() => {
    if (!isFullAdmin) return [];
    const counts: Record<string, number> = {};
    rawDemandes.forEach(d => {
      const t = (d as any).typeContrat;
      if (t) counts[t] = (counts[t] || 0) + 1;
    });
    return Object.keys(counts).map(t => ({ value: t, label: TYPE_CONTRAT_LABELS[t] || t, count: counts[t] }));
  }, [rawDemandes, isFullAdmin]);

  const availableCreateurs = useMemo(() => {
    if (!isFullAdmin) return [];
    const map = new Map<string, string>();
    rawDemandes.forEach(d => {
      if (d.createur?.id) map.set(d.createur.id, `${d.createur.prenom} ${d.createur.nom}`);
    });
    return Array.from(map, ([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [rawDemandes, isFullAdmin]);

  // --- Liste affichée : rawDemandes + filtres locaux appliqués ---
  const demandes = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return rawDemandes.filter(d => {
      if (filters.statut && d.statut !== filters.statut) return false;
      if (filters.priorite && d.priorite !== filters.priorite) return false;
      if (filters.direction && d.direction?.id !== filters.direction) return false;
      if (filters.niveau && d.niveau !== filters.niveau) return false;
      if (filters.typeContrat && (d as any).typeContrat !== filters.typeContrat) return false;
      if (filters.createur && d.createur?.id !== filters.createur) return false;
      if (q) {
        const haystack = `${d.reference} ${d.intitulePoste} ${d.createur?.prenom ?? ''} ${d.createur?.nom ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rawDemandes, filters]);

  const hasActiveFilters = !!(
    filters.statut || filters.priorite || filters.direction || filters.niveau ||
    filters.typeContrat || filters.createur || filters.aValider || filters.search
  );

  const resetFilters = () => {
    setFilters({
      statut: '', priorite: '', direction: '', niveau: '',
      typeContrat: '', createur: '', aValider: false, search: ''
    });
  };

  const toggleStatutChip = (value: string) => {
    setFilters(prev => ({ ...prev, statut: prev.statut === value ? '' : value }));
  };

  const getPrioriteBadge = (priorite: string) => {
    const priorityMap: Record<string, { variant: string; label: string }> = {
      HAUTE:   { variant: 'red',   label: 'Haute' },
      MOYENNE: { variant: 'amber', label: 'Moyenne' },
      BASSE:   { variant: 'green', label: 'Basse' }
    };
    return priorityMap[priorite] || { variant: 'gold', label: priorite };
  };

  const canCreate = user?.role !== 'RESP_PAIE';

  const canUserValidate = (demande: Demande): boolean => {
    if (!user) return false;

    const validatingRoles = ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'];
    if (!validatingRoles.includes(userRoleUpper)) return false;

    if (demande.statut === 'VALIDEE' || demande.statut === 'REJETEE') return false;
    if (demande.statut === 'ANNULEE') return false;
    if (demande.statut === 'BROUILLON') return false;

    const validationEnCours = demande.validations?.find(v => v.decision === 'EN_ATTENTE');
    if (!validationEnCours) return false;

    return validationEnCours.acteur.id === user.id;
  };

  const canDelete = (demande: Demande) => {
    const isCreator = demande.createur?.id === user?.id;
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    return (isCreator || isSuperAdmin) && demande.statut === 'BROUILLON';
  };

  const canRelancer = (demande: Demande): boolean => {
    const roleNormalise = normalizeRole(user?.role);
    return (roleNormalise === 'DRH' || roleNormalise === 'SUPER_ADMIN') && demande.statut === 'ANNULEE';
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

  const handleRelancer = async (demande: Demande) => {
    try {
      await demandeService.relancerManuellement(demande.id);
      setSuccess(`Demande ${demande.reference} relancee avec succes`);
      fetchDemandes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la relance');
      setTimeout(() => setError(''), 3000);
    }
  };

  const canUseAValiderFilter = ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'].includes(userRoleUpper);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement des demandes...</div>;
  }

  const selectBaseStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 12px',
    borderRadius: 8,
    border: active ? '1.5px solid var(--primary, #2563eb)' : '1px solid var(--border)',
    fontSize: 13,
    color: active ? 'var(--primary, #2563eb)' : 'inherit',
    background: active ? 'var(--primary-light, #eff6ff)' : 'var(--bg, #fff)',
    cursor: 'pointer',
    outline: 'none',
    fontWeight: active ? 500 : 400,
  });

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Demandes de recrutement</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {user?.role === 'MANAGER'
              ? 'Gerez vos demandes de recrutement'
              : isFullAdmin
                ? 'Vue globale - toutes directions confondues'
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

      {/* Vue globale DRH / SUPER_ADMIN : chips de statut cliquables pour un aperçu instantané */}
      {isFullAdmin && availableStatuts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {availableStatuts.map(s => {
            const active = filters.statut === s.value;
            return (
              <button
                key={s.value}
                onClick={() => toggleStatutChip(s.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 999,
                  border: active ? '1.5px solid var(--primary, #2563eb)' : '1px solid var(--border)',
                  background: active ? 'var(--primary-light, #eff6ff)' : 'var(--bg, #fff)',
                  color: active ? 'var(--primary, #2563eb)' : 'inherit',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer'
                }}
              >
                {s.label}
                <span style={{ opacity: 0.6, fontWeight: 400 }}>{s.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Recherche libre : référence / poste / créateur */}
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Reference, poste, createur..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{
              padding: '8px 12px 8px 32px',
              borderRadius: 8,
              border: filters.search ? '1.5px solid var(--primary, #2563eb)' : '1px solid var(--border)',
              fontSize: 13,
              outline: 'none',
              minWidth: 220,
              background: 'var(--bg, #fff)'
            }}
          />
        </div>

        {/* Statut : options dynamiques, propres à ce que cet utilisateur voit (cachée si déjà pilotée par les chips admin) */}
        {!isFullAdmin && (
          <select
            value={filters.statut}
            onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
            disabled={availableStatuts.length === 0}
            style={selectBaseStyle(!!filters.statut)}
          >
            <option value="">Tous les statuts ({rawDemandes.length})</option>
            {availableStatuts.map(s => (
              <option key={s.value} value={s.value}>{s.label} ({s.count})</option>
            ))}
          </select>
        )}

        {/* Priorite : options dynamiques également */}
        <select
          value={filters.priorite}
          onChange={(e) => setFilters({ ...filters, priorite: e.target.value })}
          disabled={availablePriorites.length === 0}
          style={selectBaseStyle(!!filters.priorite)}
        >
          <option value="">Toutes les priorites</option>
          {availablePriorites.map(p => (
            <option key={p.value} value={p.value}>{p.label} ({p.count})</option>
          ))}
        </select>

        {/* Niveau (CircuitType) : utile pour tout le monde, options dynamiques */}
        {availableNiveaux.length > 1 && (
          <select
            value={filters.niveau}
            onChange={(e) => setFilters({ ...filters, niveau: e.target.value })}
            style={selectBaseStyle(!!filters.niveau)}
          >
            <option value="">Tous les niveaux</option>
            {availableNiveaux.map(n => (
              <option key={n.value} value={n.value}>{n.label} ({n.count})</option>
            ))}
          </select>
        )}

        {/* Direction : uniquement visible pour les rôles transversaux */}
        {isTransversal && availableDirections.length > 1 && (
          <select
            value={filters.direction}
            onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
            style={selectBaseStyle(!!filters.direction)}
          >
            <option value="">Toutes les directions</option>
            {availableDirections.map(d => (
              <option key={d.id} value={d.id}>{d.nom}</option>
            ))}
          </select>
        )}

        {/* Type de contrat : réservé à la vue globale DRH / SUPER_ADMIN */}
        {isFullAdmin && availableTypeContrats.length > 1 && (
          <select
            value={filters.typeContrat}
            onChange={(e) => setFilters({ ...filters, typeContrat: e.target.value })}
            style={selectBaseStyle(!!filters.typeContrat)}
          >
            <option value="">Tous les contrats</option>
            {availableTypeContrats.map(t => (
              <option key={t.value} value={t.value}>{t.label} ({t.count})</option>
            ))}
          </select>
        )}

        {/* Créateur : réservé à la vue globale DRH / SUPER_ADMIN */}
        {isFullAdmin && availableCreateurs.length > 1 && (
          <select
            value={filters.createur}
            onChange={(e) => setFilters({ ...filters, createur: e.target.value })}
            style={selectBaseStyle(!!filters.createur)}
          >
            <option value="">Tous les createurs</option>
            {availableCreateurs.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        )}

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
            Mes demandes a valider
          </label>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Reinitialiser
          </Button>
        )}

        {hasActiveFilters && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {demandes.length} resultat{demandes.length > 1 ? 's' : ''} sur {rawDemandes.length}
          </span>
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
                      {rawDemandes.length === 0
                        ? (filters.aValider
                            ? 'Aucune demande en attente de votre validation.'
                            : 'Aucune demande trouvee.')
                        : 'Aucune demande ne correspond a ces filtres.'}
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
                    const isRelancable = canRelancer(demande);

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
                            {isRelancable && (
                              <Button
                                variant="primary"
                                size="xs"
                                onClick={() => handleRelancer(demande)}
                                title="Relancer la demande"
                              >
                                <RefreshCw size={14} />
                              </Button>
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