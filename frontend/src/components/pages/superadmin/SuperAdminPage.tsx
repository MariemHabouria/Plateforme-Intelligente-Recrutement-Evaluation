import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input, FormGroup, FormLabel, FormRow, Select } from '@/components/ui/FormField';
import { userService, User } from '@/services/user.service';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/data';
import type { Role } from '@/types';

// Données mockées pour audit (à remplacer par API plus tard)
const AUDIT_LOG = [
  { time: '14:32', user: 'S. Karoui',  action: 'Candidature acceptée',          detail: 'Aymen Bouslama — Chef projet IT' },
  { time: '13:18', user: 'M. Kilani',  action: 'Demande soumise au circuit',    detail: 'DEM-2026-018 — Ingénieur Qualité' },
  { time: '12:05', user: 'L. Marzouk', action: 'Données PE saisies',            detail: 'Amira Ben Salah — CDD' },
  { time: '11:40', user: 'A. Kilani',  action: 'Évaluation PE validée',         detail: 'Hana Missaoui — Confirmation' },
  { time: '10:22', user: 'R. Ben Ali', action: 'Demande refusée (budget)',       detail: 'DEM-2026-014 — Budget dépassé' },
];

// Configuration des rôles (doit correspondre au backend)
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

export function SuperAdminPage({ page }: { page: string }) {
  if (page === 'audit') return <AuditPage />;
  if (page === 'utilisateurs') return <UtilisateursPage />;
  if (page === 'workflows') return <WorkflowsPage />;
  if (page === 'ia_config') return <IAConfigPage />;
  return <UtilisateursPage />;
}

function UtilisateursPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async () => {
    // Validation - PAS DE VÉRIFICATION DE PASSWORD
    if (!formData.email || !formData.nom || !formData.prenom || !formData.role) {
      setError('Email, nom, prénom et rôle sont requis');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
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

  const handleResetPassword = async (userId: string) => {
    try {
      await userService.resetPassword(userId);
      setSuccess('Mot de passe réinitialisé. Consultez la console backend.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    }
  };

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
      role: user.role,
      departement: user.departement || '',
      poste: user.poste || '',
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
      departement: '',
      poste: '',
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <Plus size={13} /> Ajouter utilisateur
        </Button>
      </div>

      {/* Alertes */}
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

      {/* Tableau des utilisateurs */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Utilisateur</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Rôle</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Email</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Statut</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Dernière activité</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleColor = getRoleColor(user.role);
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
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: roleColor, flexShrink: 0 }} />
                          <span style={{ fontSize: 12 }}>{getRoleLabel(user.role)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {user.email}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={user.actif ? 'green' : 'red'}>
                          {user.actif ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDate(user.dernierConnexion)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button 
                            variant="ghost" 
                            size="xs"
                            onClick={() => openEditModal(user)}
                          >
                            <Edit size={11} /> Rôle
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="xs"
                            onClick={() => handleResetPassword(user.id)}
                            title="Réinitialiser mot de passe"
                          >
                            🔑
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="xs"
                            onClick={() => handleToggleStatus(user.id, user.actif)}
                            title={user.actif ? 'Désactiver' : 'Activer'}
                          >
                            {user.actif ? '🔴' : '🟢'}
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button 
                              variant="danger" 
                              size="xs"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 size={11} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {users.length === 0 && (
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
          <FormRow>
            <FormGroup>
              <FormLabel required>Prénom</FormLabel>
              <Input
                name="prenom"
                value={formData.prenom}
                onChange={handleInputChange}
                placeholder="Prénom"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Nom</FormLabel>
              <Input
                name="nom"
                value={formData.nom}
                onChange={handleInputChange}
                placeholder="Nom"
              />
            </FormGroup>
          </FormRow>

          {/* Email */}
          <FormGroup>
            <FormLabel required>Email</FormLabel>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="email@kilani.tn"
              disabled={modalMode === 'edit'}
            />
          </FormGroup>

          {/* LE CHAMP MOT DE PASSE A ÉTÉ SUPPRIMÉ */}

          {/* Rôle */}
          <FormGroup>
            <FormLabel required>Rôle</FormLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
            >
              {ROLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormGroup>

          {/* Département et Poste */}
          <FormRow>
            <FormGroup>
              <FormLabel>Département</FormLabel>
              <Input
                name="departement"
                value={formData.departement}
                onChange={handleInputChange}
                placeholder="ex: Direction Industrielle"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Poste</FormLabel>
              <Input
                name="poste"
                value={formData.poste}
                onChange={handleInputChange}
                placeholder="ex: Chef de service"
              />
            </FormGroup>
          </FormRow>

          {/* Téléphone */}
          <FormGroup>
            <FormLabel>Téléphone</FormLabel>
            <Input
              name="telephone"
              value={formData.telephone}
              onChange={handleInputChange}
              placeholder="+216 XX XXX XXX"
            />
          </FormGroup>

          {/* Message informatif pour la création */}
          {modalMode === 'create' && (
            <Alert variant="gold" style={{ marginTop: 16 }}>
              ℹ️ Le mot de passe sera généré automatiquement et affiché dans la console backend.
            </Alert>
          )}
        </div>
      </Modal>
    </div>
  );
}

// AuditPage, WorkflowsPage, IAConfigPage restent identiques
function AuditPage() {
  return (
    <div className="page-fade">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Journal d'audit</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Toutes les actions tracées en temps réel
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activité du jour</CardTitle>
          <CardSubtitle>{new Date().toLocaleDateString('fr-FR')}</CardSubtitle>
        </CardHeader>
        <CardBody>
          {AUDIT_LOG.map((l, i) => (
            <div key={i} style={{ 
              display: 'flex', 
              gap: 14, 
              alignItems: 'flex-start', 
              paddingBottom: i < AUDIT_LOG.length - 1 ? 16 : 0, 
              marginBottom: i < AUDIT_LOG.length - 1 ? 16 : 0, 
              borderBottom: i < AUDIT_LOG.length - 1 ? '1px solid var(--border-light)' : 'none' 
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 40, paddingTop: 2 }}>
                {l.time}
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{l.action}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {l.user} · {l.detail}
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function WorkflowsPage() {
  const wf = [
    { name: 'Recrutement standard (4 étapes)',  etapes: ['Manager','Directeur','RH','DAF'], actif: true },
    { name: 'Recrutement DGA (5 étapes)', etapes: ['Manager','Directeur','RH','DAF','DGA'], actif: true },
    { name: 'Évaluation PE (6 étapes)', etapes: ['Paie','Manager','Directeur','DRH','DAF','DGA'], actif: true },
    { name: 'Stage / Alternance (2 étapes)', etapes: ['RH','Manager'], actif: false },
  ];
  
  return (
    <div className="page-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Workflows PE & Recrutement</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Configuration des circuits de validation
          </div>
        </div>
        <Button size="sm"><Plus size={13} />Nouveau workflow</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {wf.map((w, i) => (
          <Card key={i}>
            <CardBody style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Badge variant={w.actif ? 'green' : 'red'}>
                  {w.actif ? 'Actif' : 'Inactif'}
                </Badge>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {w.etapes.map((e, j) => (
                      <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ 
                          background: 'var(--gold-pale)', 
                          color: 'var(--gold-deep)', 
                          padding: '2px 8px', 
                          borderRadius: 4, 
                          fontSize: 11, 
                          fontWeight: 500 
                        }}>
                          {e}
                        </span>
                        {j < w.etapes.length - 1 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="secondary" size="sm"><Edit size={12} />Modifier</Button>
                <Button variant="ghost" size="sm"><Eye size={12} /></Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function IAConfigPage() {
  return (
    <div className="page-fade">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Configuration IA</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Paramètres du moteur de matching et scoring
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { title: 'Seuil présélection IA', value: '70%', desc: 'Score minimum pour pré-sélection automatique', color: 'var(--gold)' },
          { title: 'Poids expérience', value: '40%', desc: 'Pondération du score d\'expérience', color: 'var(--green)' },
          { title: 'Poids compétences', value: '35%', desc: 'Pondération des mots-clés techniques', color: 'var(--olive)' },
          { title: 'Poids formation', value: '25%', desc: 'Pondération du niveau de formation', color: 'var(--umber)' },
        ].map((c, i) => (
          <Card key={i}>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.title}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
              <div style={{ 
                height: 6, 
                background: 'var(--surface-alt)', 
                borderRadius: 10, 
                overflow: 'hidden', 
                marginBottom: 8 
              }}>
                <div style={{ 
                  width: c.value, 
                  height: '100%', 
                  background: c.color, 
                  borderRadius: 10, 
                  transition: 'width .5s' 
                }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.desc}</div>
              <Button variant="secondary" size="xs" style={{ marginTop: 10 }}>
                <Edit size={11} />Modifier
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}