import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { Modal } from '../../ui/Modal';
import { Input, FormGroup, FormLabel, FormRow, Select } from '../../ui/FormField';
import { userService, User } from '../../../services/user.service';
import { useAuth } from '../../../contexts/AuthContext';
import { dashboardService, DashboardStats } from '../../../services/dashboard.service';
import { Download, Search, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { auditService, AuditLogEntry, AuditFilters, AuditStats } from '../../../services/audit.service';
import { getAuditActionBadge } from '../../../lib/utils';

import { CircuitConfigPage } from './CircuitConfigPage';
import api from '../../../services/api';

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: '#1E1A0E', hasDirection: false },
  { value: 'MANAGER', label: 'Manager (N+1)', color: '#5A7A3A', hasDirection: true },
  { value: 'DIRECTEUR', label: 'Directeur (N+2)', color: '#7A6C3A', hasDirection: true },
  { value: 'DRH', label: 'DRH', color: '#6A7A3A', hasDirection: false },
  { value: 'DAF', label: 'DAF', color: '#C07820', hasDirection: false },
  { value: 'DGA', label: 'DGA', color: '#7A5A3A', hasDirection: false },
  { value: 'DG', label: 'DG', color: '#7A5A3A', hasDirection: false },
  { value: 'RESP_PAIE', label: 'Responsable Paie', color: '#9A8A50', hasDirection: false },
];

interface Direction {
  id: string;
  code: string;
  nom: string;
}

export function SuperAdminPage({ page }: { page: string }) {
  if (page === 'dashboard') return <DashboardPage />;
  if (page === 'audit') return <AuditPage />;
  if (page === 'utilisateurs') return <UtilisateursPage />;
  if (page === 'workflows') return <CircuitConfigPage />;
  if (page === 'ia_config') return <IAConfigPage />;
  return <DashboardPage />;
}

// Dashboard
function DashboardPage() {
  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord</h1>
        <p style={{ color: 'var(--text-muted)' }}>Bienvenue sur la plateforme RH Kilani</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
        {[
          { label: 'Utilisateurs actifs', value: '28', delta: '+3', icon: '👥' },
          { label: 'Demandes en cours', value: '12', delta: '+2', icon: '📋' },
          { label: 'Offres publiées', value: '7', delta: '+1', icon: '📢' },
          { label: 'Candidatures', value: '124', delta: '+18', icon: '📬' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stat.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>{stat.delta} ce mois</div>
                </div>
                <div style={{ fontSize: 32 }}>{stat.icon}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardSubtitle>Dernières actions sur la plateforme</CardSubtitle>
        </CardHeader>
        <CardBody>
          {[
            { time: 'Il y a 2h', user: 'M. Kilani', action: 'Demande soumise', detail: 'DEM-2026-018' },
            { time: 'Il y a 5h', user: 'S. Karoui', action: 'Offre publiée', detail: 'OFF-2026-011' },
            { time: 'Hier', user: 'A. Kilani', action: 'Validation', detail: 'DEM-2026-015' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderBottom: i < 2 ? '1px solid var(--border-light)' : 'none'
            }}>
              <div style={{ width: 80, fontSize: 12, color: 'var(--text-muted)' }}>{item.time}</div>
              <div style={{ fontWeight: 500 }}>{item.user}</div>
              <div style={{ color: 'var(--text-muted)' }}>•</div>
              <div>{item.action}</div>
              <div style={{ color: 'var(--text-muted)' }}>{item.detail}</div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

// UtilisateursPage
function UtilisateursPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    role: 'MANAGER',
    directionId: '',
    telephone: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchDirections();
  }, []);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setError('');
    setTimeout(() => setSuccess(''), 4000);
  };

  const showError = (message: string) => {
    setError(message);
    setSuccess('');
    setTimeout(() => setError(''), 5000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      showError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchDirections = async () => {
    try {
      const response = await api.get('/directions');
      setDirections(response.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'role' ? value.toUpperCase() : value,
      ...(name === 'role' && { directionId: '' })
    }));
  };

  const requiresDirection = () => {
    const role = ROLE_OPTIONS.find(r => r.value === formData.role.toUpperCase());
    return role?.hasDirection || false;
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.nom || !formData.prenom || !formData.role) {
      showError('Email, nom, prénom et rôle sont requis');
      return;
    }
    if (requiresDirection() && !formData.directionId) {
      showError('Veuillez sélectionner une direction pour ce rôle');
      return;
    }

    try {
      setSubmitting(true);
      const newUser = await userService.createUser({
        email: formData.email,
        nom: formData.nom,
        prenom: formData.prenom,
        role: formData.role,
        directionId: formData.directionId,
        telephone: formData.telephone
      });
      setUsers(prev => [newUser, ...prev]);
      showSuccess('Utilisateur créé avec succès.');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    if (requiresDirection() && !formData.directionId) {
      showError('Veuillez sélectionner une direction pour ce rôle');
      return;
    }

    try {
      setSubmitting(true);
      const updatedUser = await userService.updateUser(selectedUser.id, {
        nom: formData.nom,
        prenom: formData.prenom,
        role: formData.role,
        directionId: formData.directionId,
        telephone: formData.telephone
      });
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
      showSuccess('Utilisateur mis à jour avec succès');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      const { actif } = await userService.toggleUserStatus(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, actif } : u));
      showSuccess(`Utilisateur ${actif ? 'activé' : 'désactivé'} avec succès`);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors du changement de statut');
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      await userService.resetPassword(userId);
      showSuccess('Mot de passe réinitialisé avec succès.');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showSuccess('Utilisateur supprimé avec succès');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role.toUpperCase(),
      directionId: user.directionId || '',
      telephone: user.telephone || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      nom: '',
      prenom: '',
      role: 'MANAGER',
      directionId: '',
      telephone: ''
    });
    setError('');
  };

  const getRoleColor = (roleValue: string) => {
    const option = ROLE_OPTIONS.find(opt => opt.value === roleValue);
    return option?.color || '#999';
  };

  const getRoleLabel = (roleValue: string) => {
    const option = ROLE_OPTIONS.find(opt => opt.value === roleValue);
    return option?.label || roleValue;
  };

  const getDirectionName = (directionId: string) => {
    const direction = directions.find(d => d.id === directionId);
    return direction?.nom || '-';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>;
  }

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Utilisateurs & Rôles</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{users.length} utilisateur(s)</p>
        </div>
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={13} /> Ajouter utilisateur
        </Button>
      </div>

      {error && <Alert variant="red">{error}</Alert>}
      {success && <Alert variant="green">{success}</Alert>}

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Utilisateur</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Rôle</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Direction</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Statut</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleColor = getRoleColor(user.role);
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={`${user.prenom} ${user.nom}`} size="sm" color={roleColor} />
                          <span>{user.prenom} {user.nom}</span>
                        </div>
                       </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant="gold">{getRoleLabel(user.role)}</Badge>
                       </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        {user.directionId ? getDirectionName(user.directionId) : '-'}
                       </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>{user.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={user.actif ? 'green' : 'red'}>
                          {user.actif ? 'Actif' : 'Inactif'}
                        </Badge>
                       </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button variant="ghost" size="xs" onClick={() => openEditModal(user)}>Modifier</Button>
                          <Button variant="ghost" size="xs" onClick={() => handleResetPassword(user.id)}>🔑</Button>
                          <Button variant="ghost" size="xs" onClick={() => handleToggleStatus(user.id)}>
                            {user.actif ? '🔴' : '🟢'}
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button variant="danger" size="xs" onClick={() => handleDeleteUser(user.id)}>🗑️</Button>
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

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={modalMode === 'create' ? 'Nouvel utilisateur' : 'Modifier utilisateur'}
        maxWidth={600}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <Button variant="primary" onClick={modalMode === 'create' ? handleCreateUser : handleUpdateUser} disabled={submitting}>
              {submitting ? 'En cours...' : (modalMode === 'create' ? 'Créer' : 'Mettre à jour')}
            </Button>
          </div>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <FormRow>
            <FormGroup>
              <FormLabel required>Prénom</FormLabel>
              <Input name="prenom" value={formData.prenom} onChange={handleInputChange} />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Nom</FormLabel>
              <Input name="nom" value={formData.nom} onChange={handleInputChange} />
            </FormGroup>
          </FormRow>

          <FormGroup>
            <FormLabel required>Email</FormLabel>
            <Input name="email" type="email" value={formData.email} onChange={handleInputChange} disabled={modalMode === 'edit'} />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Rôle</FormLabel>
            <Select name="role" value={formData.role} onChange={handleInputChange}>
              {ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Select>
          </FormGroup>

          {requiresDirection() && (
            <FormGroup>
              <FormLabel required>Direction</FormLabel>
              <Select name="directionId" value={formData.directionId} onChange={handleInputChange}>
                <option value="">Sélectionner une direction</option>
                {directions.map(dir => <option key={dir.id} value={dir.id}>{dir.nom}</option>)}
              </Select>
            </FormGroup>
          )}

          <FormGroup>
            <FormLabel>Téléphone</FormLabel>
            <Input name="telephone" value={formData.telephone} onChange={handleInputChange} placeholder="+216 XX XXX XXX" />
          </FormGroup>

          {modalMode === 'create' && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--gold-pale)', borderRadius: 6, fontSize: 12 }}>
              ℹ️ Le mot de passe sera généré automatiquement
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// AuditPage
function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState<AuditFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchLogs(); }, [filters, pagination.page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { logs: data, pagination: pag } = await auditService.getLogs({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      setLogs(data);
      setPagination(pag);
    } catch (err) {
      setError("Erreur lors du chargement du journal d'audit");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await auditService.getStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const applyFilters = (patch: Partial<AuditFilters>) => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setFilters(prev => ({ ...prev, ...patch }));
  };

  const resetFilters = () => {
    setSearchInput('');
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await auditService.exportCsv(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Journal d'audit</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{pagination.total} événement(s) enregistré(s)</p>
        </div>
        <Button size="sm" onClick={handleExport} disabled={exporting}>
          <Download size={13} /> {exporting ? 'Export...' : 'Exporter CSV'}
        </Button>
      </div>

      {error && <Alert variant="red">{error}</Alert>}

      {/* KPI cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total événements</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aujourd'hui</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.todayCount}</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Utilisateurs actifs</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.distinctActeurs}</div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardHeader>
              <CardTitle>Activité (30 derniers jours)</CardTitle>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.byDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4a90d9" name="Événements" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top actions</CardTitle>
            </CardHeader>
            <CardBody>
              {stats.byAction.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span>{a.action}</span>
                  <Badge variant={getAuditActionBadge(a.action)}>{a.count}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card style={{ marginBottom: 20 }}>
        <CardBody>
          <FormRow>
            <FormGroup>
              <FormLabel>Recherche</FormLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search: searchInput })}
                  placeholder="Action, détail, ID..."
                />
                <Button variant="secondary" size="sm" onClick={() => applyFilters({ search: searchInput })}>
                  <Search size={13} />
                </Button>
              </div>
            </FormGroup>
            <FormGroup>
              <FormLabel>Type d'entité</FormLabel>
              <Select
                value={filters.entityType || ''}
                onChange={(e) => applyFilters({ entityType: e.target.value || undefined })}
              >
                <option value="">Tous</option>
                {stats?.byEntityType.map(e => (
                  <option key={e.entityType} value={e.entityType}>{e.entityType}</option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <FormLabel>Du</FormLabel>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => applyFilters({ dateFrom: e.target.value || undefined })}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Au</FormLabel>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => applyFilters({ dateTo: e.target.value || undefined })}
              />
            </FormGroup>
          </FormRow>
          <Button variant="ghost" size="xs" onClick={resetFilters}>
            <RotateCcw size={12} /> Réinitialiser
          </Button>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Acteur</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Action</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Entité</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Détail</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Chargement...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      Aucun résultat
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDate(log.createdAt)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {log.acteur ? `${log.acteur.prenom} ${log.acteur.nom}` : 'Système'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={getAuditActionBadge(log.action)}>{log.action}</Badge>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>{log.entityType}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{log.details || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Button variant="ghost" size="xs" onClick={() => setSelectedLog(log)}>
                          Détails
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16 }}>
              <Button
                variant="ghost"
                size="xs"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Précédent
              </Button>
              <span style={{ fontSize: 13 }}>
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="xs"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Suivant
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal détail avec diff avant/après */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Détail de l'événement"
        maxWidth={600}
      >
        {selectedLog && (
          <div style={{ padding: '8px 0' }}>
            <p><strong>Action :</strong> {selectedLog.action}</p>
            <p><strong>Entité :</strong> {selectedLog.entityType} ({selectedLog.entityId})</p>
            <p><strong>Acteur :</strong> {selectedLog.acteur ? `${selectedLog.acteur.prenom} ${selectedLog.acteur.nom}` : 'Système'}</p>
            <p><strong>Date :</strong> {formatDate(selectedLog.createdAt)}</p>
            {selectedLog.ipAdresse && <p><strong>IP :</strong> {selectedLog.ipAdresse}</p>}
            {selectedLog.details && <p><strong>Détail :</strong> {selectedLog.details}</p>}

            {(selectedLog.anciennesValeurs || selectedLog.nouvellesValeurs) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--red)' }}>Avant</div>
                  <pre style={{ background: '#fdf2f2', padding: 10, borderRadius: 6, fontSize: 11, overflow: 'auto', maxHeight: 250 }}>
                    {JSON.stringify(selectedLog.anciennesValeurs || {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--green)' }}>Après</div>
                  <pre style={{ background: '#f0f9f0', padding: 10, borderRadius: 6, fontSize: 11, overflow: 'auto', maxHeight: 250 }}>
                    {JSON.stringify(selectedLog.nouvellesValeurs || {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// IAConfigPage
function IAConfigPage() {
  return (
    <div className="page-fade">
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Configuration IA</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {[
          { title: 'Seuil présélection IA', value: '70%', desc: 'Score minimum pour pré-sélection' },
          { title: 'Poids expérience', value: '40%', desc: 'Pondération de l\'expérience' },
          { title: 'Poids compétences', value: '35%', desc: 'Pondération des compétences' },
          { title: 'Poids formation', value: '25%', desc: 'Pondération de la formation' },
        ].map((c, i) => (
          <Card key={i}>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{c.title}</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--gold)' }}>{c.value}</span>
              </div>
              <div style={{ height: 6, background: '#eee', borderRadius: 10, margin: '12px 0' }}>
                <div style={{ width: c.value, height: '100%', background: 'var(--gold)', borderRadius: 10 }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.desc}</p>
              <Button variant="secondary" size="xs" style={{ marginTop: 10 }}>Modifier</Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}