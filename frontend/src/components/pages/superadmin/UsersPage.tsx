import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Mail, RefreshCw, 
  Search, Filter, XCircle, CheckCircle, Clock
} from 'lucide-react';
import { userService, User } from '../../../services/user.service';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { Modal } from '../../ui/Modal';
import { Input, FormGroup, FormLabel, FormRow, Select } from '../../ui/FormField';
import { Card, CardBody } from '../../ui/Card';

// Configuration des rôles
const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: '#1E1A0E' },
  { value: 'MANAGER', label: 'Manager (N+1)', color: '#5A7A3A' },
  { value: 'DIRECTEUR', label: 'Directeur (N+2)', color: '#7A6C3A' },
  { value: 'DRH', label: 'DRH', color: '#6A7A3A' },
  { value: 'DAF', label: 'DAF', color: '#C07820' },
  { value: 'DGA', label: 'DGA', color: '#7A5A3A' },
  { value: 'DG', label: 'DG', color: '#7A5A3A' },
  { value: 'RESP_PAIE', label: 'Responsable Paie', color: '#9A8A50' },
];

export const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states (SANS PASSWORD)
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    role: 'MANAGER',
    departement: '',
    poste: '',
    telephone: ''
  });

  // Charger les utilisateurs
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Gestion du formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Créer un utilisateur (SANS PASSWORD)
  const handleCreateUser = async () => {
    // Validation - PAS DE VÉRIFICATION DE PASSWORD
    if (!formData.email || !formData.nom || !formData.prenom || !formData.role) {
      setError('Email, nom, prénom et rôle sont requis');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      // Le mot de passe est généré côté backend, on n'envoie que les autres champs
      const newUser = await userService.createUser(formData);
      setUsers(prev => [newUser, ...prev]);
      setSuccess('Utilisateur créé avec succès. Consultez la console backend pour les identifiants.');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  // Mettre à jour un utilisateur
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      setError('');
      
      const updatedUser = await userService.updateUser(selectedUser.id, formData);
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
      setSuccess('Utilisateur mis à jour avec succès');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  // Activer/Désactiver
  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { actif } = await userService.toggleUserStatus(userId);
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, actif } : u
      ));
      setSuccess(`Utilisateur ${actif ? 'activé' : 'désactivé'} avec succès`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du changement de statut');
    }
  };

  // Renvoyer l'invitation
  const handleResendInvite = async (userId: string) => {
    try {
      await userService.resendInvite(userId);
      setSuccess('Invitation renvoyée. Consultez la console backend.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du renvoi');
    }
  };

  // Réinitialiser mot de passe
  const handleResetPassword = async (userId: string) => {
    try {
      await userService.resetPassword(userId);
      setSuccess('Mot de passe réinitialisé. Consultez la console backend.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    }
  };

  // Supprimer utilisateur
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess('Utilisateur supprimé avec succès');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // Ouvrir modal de création
  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    resetForm();
    setShowModal(true);
  };

  // Ouvrir modal d'édition
  const openEditModal = (user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      departement: user.departement || '',
      poste: user.poste || '',
      telephone: user.telephone || ''
    });
    setShowModal(true);
  };

  // Réinitialiser formulaire
  const resetForm = () => {
    setFormData({
      email: '',
      nom: '',
      prenom: '',
      role: 'MANAGER',
      departement: '',
      poste: '',
      telephone: ''
    });
    setError('');
  };

  // Obtenir les infos de statut
  const getStatusInfo = (user: User) => {
    if (!user.actif) {
      return { label: 'Inactif', variant: 'red', icon: XCircle };
    }
    if (!user.dernierConnexion) {
      return { label: 'En attente', variant: 'amber', icon: Clock };
    }
    return { label: 'Actif', variant: 'green', icon: CheckCircle };
  };

  // Obtenir la couleur du rôle
  const getRoleColor = (roleValue: string) => {
    const option = ROLE_OPTIONS.find(opt => opt.value === roleValue);
    return option?.color || '#999';
  };

  // Obtenir le label du rôle
  const getRoleLabel = (roleValue: string) => {
    const option = ROLE_OPTIONS.find(opt => opt.value === roleValue);
    return option?.label || roleValue;
  };

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => 
    user.nom.toLowerCase().includes(search.toLowerCase()) ||
    user.prenom.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.role.toLowerCase().includes(search.toLowerCase())
  );

  // Fonctions pour fermer les alertes
  const clearError = () => setError('');
  const clearSuccess = () => setSuccess('');

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px' 
      }}>
        Chargement des utilisateurs...
      </div>
    );
  }

  return (
    <div className="page-fade">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between', 
        marginBottom: 20 
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Utilisateurs & Rôles</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Gestion des accès et affectation des rôles • {users.length} utilisateur(s)
          </div>
        </div>
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={13} /> Nouvel utilisateur
        </Button>
      </div>

      {/* Alertes - Sans style et sans onClose */}
      <div style={{ marginBottom: 20 }}>
        <Alert variant="gold">
          🔑 Super Admin uniquement : le mot de passe est généré automatiquement et affiché dans la console backend.
        </Alert>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <Alert variant="red">
            {error}
          </Alert>
        </div>
      )}
      
      {success && (
        <div style={{ marginBottom: 20 }}>
          <Alert variant="green">
            {success}
          </Alert>
        </div>
      )}

      {/* Barre de recherche */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '0 12px'
        }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, email ou rôle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              padding: '12px',
              outline: 'none',
              fontSize: 14
            }}
          />
          <Filter size={18} color="var(--text-muted)" />
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Utilisateur</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Email</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Rôle</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Département</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Statut</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const roleColor = getRoleColor(user.role);
                  const status = getStatusInfo(user);
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr key={user.id}
                      style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--gold-wash)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar 
                            name={`${user.prenom} ${user.nom}`} 
                            size="sm" 
                            color={roleColor} 
                          />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>
                            {user.prenom} {user.nom}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        {user.email}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: roleColor, flexShrink: 0 }} />
                          <span style={{ fontSize: 12 }}>{getRoleLabel(user.role)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {user.departement || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <StatusIcon size={14} color={`var(--${status.variant})`} />
                          <span style={{ fontSize: 12, color: `var(--${status.variant})` }}>
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button 
                            variant="ghost" 
                            size="xs"
                            onClick={() => openEditModal(user)}
                            title="Modifier"
                          >
                            <Edit size={14} />
                          </Button>
                          
                          {/* Bouton renvoyer invitation (visible seulement pour "En attente") */}
                          {!user.dernierConnexion && user.actif && (
                            <Button 
                              variant="ghost" 
                              size="xs"
                              onClick={() => handleResendInvite(user.id)}
                              title="Renvoyer l'invitation"
                            >
                              <Mail size={14} />
                            </Button>
                          )}
                          
                          {/* Bouton réinitialiser mot de passe */}
                          <Button 
                            variant="ghost" 
                            size="xs"
                            onClick={() => handleResetPassword(user.id)}
                            title="Réinitialiser mot de passe"
                          >
                            <RefreshCw size={14} />
                          </Button>
                          
                          {/* Bouton activer/désactiver */}
                          <Button 
                            variant="ghost" 
                            size="xs"
                            onClick={() => handleToggleStatus(user.id, user.actif)}
                            title={user.actif ? 'Désactiver' : 'Activer'}
                          >
                            {user.actif ? '🔴' : '🟢'}
                          </Button>
                          
                          {/* Bouton supprimer (pas pour soi-même) */}
                          {user.id !== currentUser?.id && (
                            <Button 
                              variant="danger" 
                              size="xs"
                              onClick={() => handleDeleteUser(user.id)}
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Aucun utilisateur trouvé
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Modal Création/Édition - SANS CHAMP MOT DE PASSE */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Nouvel utilisateur' : 'Modifier utilisateur'}
        maxWidth={600}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button 
              variant="primary" 
              onClick={modalMode === 'create' ? handleCreateUser : handleUpdateUser}
              disabled={submitting}
            >
              {submitting ? 'En cours...' : (modalMode === 'create' ? 'Créer' : 'Mettre à jour')}
            </Button>
          </div>
        }
      >
        <div style={{ padding: '8px 0' }}>
          {/* Identité */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Prénom <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                name="prenom"
                value={formData.prenom}
                onChange={handleInputChange}
                placeholder="Prénom"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Nom <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                name="nom"
                value={formData.nom}
                onChange={handleInputChange}
                placeholder="Nom"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Email <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="email@kilani.tn"
              disabled={modalMode === 'edit'}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: '1px solid var(--border)', 
                borderRadius: 6,
                backgroundColor: modalMode === 'edit' ? '#f5f5f5' : 'white'
              }}
            />
          </div>

          {/* LE CHAMP MOT DE PASSE A ÉTÉ SUPPRIMÉ ICI */}

          {/* Rôle */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Rôle <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            >
              {ROLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Département et Poste */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Département
              </label>
              <input
                name="departement"
                value={formData.departement}
                onChange={handleInputChange}
                placeholder="ex: Direction Industrielle"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Poste
              </label>
              <input
                name="poste"
                value={formData.poste}
                onChange={handleInputChange}
                placeholder="ex: Chef de service"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </div>
          </div>

          {/* Téléphone */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Téléphone
            </label>
            <input
              name="telephone"
              value={formData.telephone}
              onChange={handleInputChange}
              placeholder="+216 XX XXX XXX"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
          </div>

          {/* Message informatif pour la création */}
          {modalMode === 'create' && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--gold-pale)', borderRadius: 6, border: '1px solid var(--gold-light)' }}>
              <span style={{ fontSize: 12, color: 'var(--gold-deep)' }}>
                ℹ️ Le mot de passe sera généré automatiquement et affiché dans la console backend.
              </span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};