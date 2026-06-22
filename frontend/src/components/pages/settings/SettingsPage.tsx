import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardBody } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Input, FormGroup, FormLabel } from '../../ui/FormField';
import { Modal } from '../../ui/Modal';
import { userService } from '../../../services/user.service';
import { User, Settings, Bell, Key, Mail, Smartphone, Save } from 'lucide-react';

// Retiré : 'appearance' tab
type SettingsTab = 'profile' | 'account' | 'notifications';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Profil
  const [profileData, setProfileData] = useState({
    nom:         user?.nom         || '',
    prenom:      user?.prenom      || '',
    telephone:   user?.telephone   || '',
    poste:       user?.poste       || ''

  });

  // Notifications (localStorage)
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications');
      return saved ? JSON.parse(saved) : {
        emailNewDemande: true,
        emailValidation: true,
        emailNewCandidat: false,
        emailRappel: true
      };
    } catch {
      return { emailNewDemande: true, emailValidation: true, emailNewCandidat: false, emailRappel: true };
    }
  });

  // Helper : affiche un message et l'efface après 3s
  const showMessage = (setter: (v: string) => void, msg: string) => {
    setter(msg);
    setTimeout(() => setter(''), 3000);
  };

  // ===== PROFIL =====
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!profileData.nom.trim() || !profileData.prenom.trim()) {
      setError('Le nom et le prénom sont obligatoires');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await userService.updateOwnProfile(profileData);

      // Sync localStorage + sidebar
      const freshUser = await userService.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(freshUser));
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: freshUser }));

      // Mettre à jour le state local
      setProfileData({
        nom:       updatedUser.nom,
        prenom:    updatedUser.prenom,
        telephone: updatedUser.telephone || '',
        poste:     updatedUser.poste     || ''
      });

      showMessage(setSuccess, 'Profil mis à jour avec succès !');
    } catch (err: any) {
      showMessage(setError, err.response?.data?.message || '❌ Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  // ===== MOT DE PASSE =====
  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Tous les champs sont requis');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      await userService.changePassword({ currentPassword, newPassword });
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMessage(setSuccess, 'Mot de passe changé avec succès !');
    } catch (err: any) {
      //  L'erreur reste visible dans le modal tant qu'il est ouvert
      setError(err.response?.data?.message || '❌ Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError(''); // Nettoyer l'erreur à la fermeture
  };

  // ===== NOTIFICATIONS =====
  const handleSaveNotifications = () => {
    try {
      localStorage.setItem('notifications', JSON.stringify(notifications));
      showMessage(setSuccess, ' Préférences de notifications enregistrées !');
    } catch {
      showMessage(setError, ' Impossible de sauvegarder les préférences');
    }
  };

  const tabs = [
    { id: 'profile',       label: 'Profil',        icon: User     },
    { id: 'account',       label: 'Compte',         icon: Settings },
    { id: 'notifications', label: 'Notifications',  icon: Bell     },
  ] as const;

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Paramètres</h1>
        <p style={{ color: 'var(--text-muted)' }}>Gérez vos préférences et informations personnelles</p>
      </div>

      {/* Alert sans prop style — wrapper div à la place */}
      {error   && <div style={{ marginBottom: 20 }}><Alert variant="red">{error}</Alert></div>}
      {success && <div style={{ marginBottom: 20 }}><Alert variant="green">{success}</Alert></div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                background: 'transparent', border: 'none',
                borderBottom: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                color: isActive ? 'var(--gold)' : 'var(--text-muted)',
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardBody>
          {/* ===== PROFIL ===== */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Informations personnelles</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <FormGroup>
                  <FormLabel>Prénom</FormLabel>
                  <Input
                    value={profileData.prenom}
                    onChange={(e) => setProfileData({ ...profileData, prenom: e.target.value })}
                    placeholder="Votre prénom"
                  />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Nom</FormLabel>
                  <Input
                    value={profileData.nom}
                    onChange={(e) => setProfileData({ ...profileData, nom: e.target.value })}
                    placeholder="Votre nom"
                  />
                </FormGroup>
              </div>

              <FormGroup>
                <FormLabel>Email</FormLabel>
                {/*  Email en lecture seule, pas de onChange */}
                <Input value={user?.email || ''} disabled style={{ background: '#f5f5f5' }} />
                <small style={{ color: 'var(--text-muted)' }}>L'email ne peut pas être modifié</small>
              </FormGroup>

              <FormGroup>
                <FormLabel>Téléphone</FormLabel>
                <Input
                  value={profileData.telephone}
                  onChange={(e) => setProfileData({ ...profileData, telephone: e.target.value })}
                  placeholder="+216 XX XXX XXX"
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Poste</FormLabel>
                <Input
                  value={profileData.poste}
                  onChange={(e) => setProfileData({ ...profileData, poste: e.target.value })}
                  placeholder="ex: Chef de service"
                />
              </FormGroup>

              <Button type="submit" variant="primary" disabled={loading}>
                <Save size={16} style={{ marginRight: 8 }} />
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </form>
          )}

          {/* ===== COMPTE ===== */}
          {activeTab === 'account' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Sécurité du compte</h3>

              {/* Mot de passe */}
              <div style={{ marginBottom: 16, padding: 16, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Key size={16} color="var(--gold)" /> Mot de passe
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Modifiez votre mot de passe de connexion
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setShowPasswordModal(true)}>
                    Changer
                  </Button>
                </div>
              </div>

              {/* Email — lecture seule */}
              <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Mail size={16} color="var(--gold)" /> Email
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>{user?.email}</div>
                  </div>
                  <Button variant="secondary" size="sm" disabled>Vérifié</Button>
                </div>
              </div>
            </div>
          )}

          {/* ===== NOTIFICATIONS ===== */}
          {activeTab === 'notifications' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Notifications email</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {([
                  { key: 'emailNewDemande',  label: 'Nouvelles demandes de recrutement' },
                  { key: 'emailValidation',  label: 'Validations en attente' },
                  { key: 'emailNewCandidat', label: 'Nouvelles candidatures' },
                  { key: 'emailRappel',      label: 'Rappels (évaluations, contrats)' },
                ] as const).map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notifications[key]}
                      onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                      style={{ accentColor: 'var(--gold)' }}
                    />
                    <span style={{ fontSize: 13 }}>{label}</span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 24 }}>
                <Button variant="primary" onClick={handleSaveNotifications}>
                  <Save size={16} style={{ marginRight: 8 }} />
                  Enregistrer les préférences
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ===== MODAL MOT DE PASSE ===== */}
      <Modal
        open={showPasswordModal}
        onClose={handleClosePasswordModal}
        title="Changer le mot de passe"
        maxWidth={500}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={handleClosePasswordModal}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleChangePassword} disabled={loading}>
              {loading ? 'Changement...' : 'Changer'}
            </Button>
          </div>
        }
      >
        <div style={{ padding: '16px 0' }}>
          {/*  Erreur affichée DANS le modal pour le changement de mot de passe */}
          {error && showPasswordModal && (
            <div style={{ marginBottom: 16 }}><Alert variant="red">{error}</Alert></div>
          )}

          <FormGroup>
            <FormLabel>Mot de passe actuel</FormLabel>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="Entrez votre mot de passe actuel"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Nouveau mot de passe</FormLabel>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Minimum 8 caractères"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Confirmer</FormLabel>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Confirmez votre nouveau mot de passe"
            />
          </FormGroup>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, background: 'var(--surface)', padding: 8, borderRadius: 4 }}>
            Le mot de passe doit contenir au moins 8 caractères avec majuscule, minuscule, chiffre et symbole.
          </div>
        </div>
      </Modal>
    </div>
  );
};