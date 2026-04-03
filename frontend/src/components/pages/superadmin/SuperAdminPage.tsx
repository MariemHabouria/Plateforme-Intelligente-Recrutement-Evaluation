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
import { TypePosteConfigPage } from './TypePosteConfigPage';
import { CircuitConfigPage } from './CircuitConfigPage';
import api from '../../../services/api';

interface TypePoste {
  id: string;
  code: string;
  nom: string;
  description?: string;
  circuitType: string;
  directionId: string;
}

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
  if (page === 'type_postes') return <TypePosteConfigPage />;
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
  const [typePostes, setTypePostes] = useState<TypePoste[]>([]);
  const [filteredTypePostes, setFilteredTypePostes] = useState<TypePoste[]>([]);
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
    typePosteId: '',
    telephone: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchDirections();
    fetchTypePostes();
  }, []);

  useEffect(() => {
    if (formData.directionId) {
      const filtered = typePostes.filter(tp => tp.directionId === formData.directionId);
      setFilteredTypePostes(filtered);
      if (!filtered.find(tp => tp.id === formData.typePosteId)) {
        setFormData(prev => ({ ...prev, typePosteId: '' }));
      }
    } else {
      setFilteredTypePostes([]);
    }
  }, [formData.directionId, typePostes]);

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

  const fetchTypePostes = async () => {
    try {
      const response = await api.get('/type-postes');
      setTypePostes(response.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'role' ? value.toUpperCase() : value,
      ...(name === 'role' && { directionId: '', typePosteId: '' })
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
        typePosteId: formData.typePosteId || undefined,
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
        typePosteId: formData.typePosteId || undefined,
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
      typePosteId: (user as any).typePosteId || '',
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
      typePosteId: '',
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

  const getTypePosteNom = (typePosteId: string) => {
    const typePoste = typePostes.find(tp => tp.id === typePosteId);
    return typePoste?.nom || '-';
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
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Poste</th>
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
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        {getTypePosteNom((user as any).typePosteId)}
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
            <FormLabel>Poste</FormLabel>
            <Select name="typePosteId" value={formData.typePosteId} onChange={handleInputChange} disabled={requiresDirection() && !formData.directionId}>
              <option value="">Sélectionner un poste</option>
              {filteredTypePostes.map(tp => <option key={tp.id} value={tp.id}>{tp.nom}</option>)}
            </Select>
          </FormGroup>

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
  const auditLog = [
    { time: '14:32', user: 'S. Karoui', action: 'Candidature acceptée', detail: 'Aymen Bouslama' },
    { time: '13:18', user: 'M. Kilani', action: 'Demande soumise', detail: 'DEM-2026-018' },
    { time: '12:05', user: 'L. Marzouk', action: 'Données PE saisies', detail: 'Amira Ben Salah' },
  ];

  return (
    <div className="page-fade">
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Journal d'audit</h2>
      <Card>
        <CardBody>
          {auditLog.map((log, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i < auditLog.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.time}</span>
                <span style={{ fontWeight: 500 }}>{log.user}</span>
                <span>•</span>
                <span>{log.action}</span>
                <span style={{ color: 'var(--text-muted)' }}>{log.detail}</span>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
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