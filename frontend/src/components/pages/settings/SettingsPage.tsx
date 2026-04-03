import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardBody } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Input, FormGroup, FormLabel } from '../../ui/FormField';
import { Modal } from '../../ui/Modal';
import { userService } from '../../../services/user.service';
import { User, Settings, Bell, Shield, Moon, Sun, Key, Mail, Smartphone, Save } from 'lucide-react';

type SettingsTab = 'profile' | 'account' | 'notifications' | 'appearance';

export const SettingsPage = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Profil state
  const [profileData, setProfileData] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    telephone: user?.telephone || '',
    departement: user?.departement || '',
    poste: user?.poste || ''
  });

  // Date du dernier changement (simulée pour l'instant)
  const [lastPasswordChange] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1); // Hier
    return date;
  });

  const formatPasswordDate = () => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastPasswordChange.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "aujourd'hui";
    if (diffDays === 1) return "hier";
    return `il y a ${diffDays} jours`;
  };

  // Notifications state (sauvegardé dans localStorage)
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : {
      emailNewDemande: true,
      emailValidation: true,
      emailNewCandidat: false,
      emailRappel: true
    };
  });

  // Apparence state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system'
  );

  // Appliquer le thème
  useEffect(() => {
    const applyTheme = (t: string) => {
      const root = document.documentElement;
      if (t === 'dark') {
        root.style.setProperty('--bg-primary', '#1E1A0E');
        root.style.setProperty('--text-primary', '#EDE5CA');
        root.style.setProperty('--surface', '#2A2413');
      } else if (t === 'light') {
        root.style.setProperty('--bg-primary', '#f8f9fa');
        root.style.setProperty('--text-primary', '#1E1A0E');
        root.style.setProperty('--surface', '#ffffff');
      }
    };
    
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ===== PROFIL =====
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updatedUser = await userService.updateOwnProfile(profileData);
      
      // Mettre à jour le state local avec les nouvelles données
      setProfileData({
        nom: updatedUser.nom,
        prenom: updatedUser.prenom,
        telephone: updatedUser.telephone || '',
        departement: updatedUser.departement || '',
        poste: updatedUser.poste || ''
      });
      
      // Récupérer l'utilisateur mis à jour
      const freshUser = await userService.getCurrentUser();
      
      // Mettre à jour le localStorage
      localStorage.setItem('user', JSON.stringify(freshUser));
      
      // Déclencher un événement personnalisé pour la Sidebar
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: freshUser }));
      
      // Afficher le message de succès
      setSuccess('✅ Profil mis à jour avec succès !');
      
      // Le message disparaîtra après 3 secondes
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err: any) {
      setError(err.response?.data?.message || '❌ Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  // ===== SÉCURITÉ =====
  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('Tous les champs sont requis');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);

    try {
      await userService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setSuccess('✅ Mot de passe changé avec succès !');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err: any) {
      setError(err.response?.data?.message || '❌ Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // ===== NOTIFICATIONS =====
  const handleSaveNotifications = () => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
    setSuccess('✅ Préférences de notifications enregistrées !');
    
    setTimeout(() => {
      setSuccess('');
    }, 3000);
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'account', label: 'Compte', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Apparence', icon: Sun },
  ];

  return (
    <div className="page-fade">
      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          Paramètres
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Gérez vos préférences et informations personnelles
        </p>
      </div>

      {/* Messages - Maintenant ils restent sans rediriger */}
      {error && (
        <Alert variant="red" style={{ marginBottom: 20 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="green" style={{ marginBottom: 20 }}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                color: isActive ? 'var(--gold)' : 'var(--text-muted)',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenu des onglets - Le reste du code inchangé */}
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
                    onChange={(e) => setProfileData({...profileData, prenom: e.target.value})}
                    placeholder="Votre prénom"
                  />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Nom</FormLabel>
                  <Input
                    value={profileData.nom}
                    onChange={(e) => setProfileData({...profileData, nom: e.target.value})}
                    placeholder="Votre nom"
                  />
                </FormGroup>
              </div>

              <FormGroup>
                <FormLabel>Téléphone</FormLabel>
                <Input
                  value={profileData.telephone}
                  onChange={(e) => setProfileData({...profileData, telephone: e.target.value})}
                  placeholder="+216 XX XXX XXX"
                />
              </FormGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <FormGroup>
                  <FormLabel>Département</FormLabel>
                  <Input
                    value={profileData.departement}
                    onChange={(e) => setProfileData({...profileData, departement: e.target.value})}
                    placeholder="ex: Direction Industrielle"
                  />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Poste</FormLabel>
                  <Input
                    value={profileData.poste}
                    onChange={(e) => setProfileData({...profileData, poste: e.target.value})}
                    placeholder="ex: Chef de service"
                  />
                </FormGroup>
              </div>

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
              <div style={{ marginBottom: 24, padding: 16, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Key size={16} color="var(--gold)" /> Mot de passe
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Dernière modification : {formatPasswordDate()}
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Changer
                  </Button>
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 24, padding: 16, background: 'var(--surface)', borderRadius: 8 }}>
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

              {/* 2FA */}
              <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Smartphone size={16} color="var(--gold)" /> Double authentification (2FA)
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Protégez votre compte avec une vérification en deux étapes
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" disabled>Bientôt</Button>
                </div>
              </div>
            </div>
          )}

          {/* ===== NOTIFICATIONS ===== */}
          {activeTab === 'notifications' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Notifications email</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifications.emailNewDemande}
                    onChange={(e) => setNotifications({...notifications, emailNewDemande: e.target.checked})}
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span style={{ fontSize: 13 }}>Nouvelles demandes de recrutement</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifications.emailValidation}
                    onChange={(e) => setNotifications({...notifications, emailValidation: e.target.checked})}
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span style={{ fontSize: 13 }}>Validations en attente</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifications.emailNewCandidat}
                    onChange={(e) => setNotifications({...notifications, emailNewCandidat: e.target.checked})}
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span style={{ fontSize: 13 }}>Nouvelles candidatures</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifications.emailRappel}
                    onChange={(e) => setNotifications({...notifications, emailRappel: e.target.checked})}
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span style={{ fontSize: 13 }}>Rappels (évaluations, contrats)</span>
                </label>
              </div>

              <div style={{ marginTop: 24 }}>
                <Button variant="primary" onClick={handleSaveNotifications}>
                  <Save size={16} style={{ marginRight: 8 }} />
                  Enregistrer les préférences
                </Button>
              </div>
            </div>
          )}

          {/* ===== APPARENCE ===== */}
          {activeTab === 'appearance' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Thème</h3>
              
              <div style={{ display: 'flex', gap: 16 }}>
                <button
                  onClick={() => setTheme('light')}
                  style={{
                    flex: 1,
                    padding: 16,
                    background: theme === 'light' ? 'var(--gold-pale)' : 'transparent',
                    border: `2px solid ${theme === 'light' ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  <Sun size={24} color={theme === 'light' ? 'var(--gold)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: 13, fontWeight: theme === 'light' ? 600 : 400 }}>
                    Clair
                  </span>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  style={{
                    flex: 1,
                    padding: 16,
                    background: theme === 'dark' ? 'var(--gold-pale)' : 'transparent',
                    border: `2px solid ${theme === 'dark' ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  <Moon size={24} color={theme === 'dark' ? 'var(--gold)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: 13, fontWeight: theme === 'dark' ? 600 : 400 }}>
                    Sombre
                  </span>
                </button>

                <button
                  onClick={() => setTheme('system')}
                  style={{
                    flex: 1,
                    padding: 16,
                    background: theme === 'system' ? 'var(--gold-pale)' : 'transparent',
                    border: `2px solid ${theme === 'system' ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  <Settings size={24} color={theme === 'system' ? 'var(--gold)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: 13, fontWeight: theme === 'system' ? 600 : 400 }}>
                    Système
                  </span>
                </button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ===== MODAL CHANGEMENT MOT DE PASSE ===== */}
      <Modal
        open={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }}
        title="Changer le mot de passe"
        maxWidth={500}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowPasswordModal(false)}>
              Annuler
            </Button>
            <Button 
              variant="primary" 
              onClick={handleChangePassword} 
              disabled={loading}
            >
              {loading ? 'Changement...' : 'Changer'}
            </Button>
          </div>
        }
      >
        <div style={{ padding: '16px 0' }}>
          <FormGroup>
            <FormLabel>Mot de passe actuel</FormLabel>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
              placeholder="Entrez votre mot de passe actuel"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Nouveau mot de passe</FormLabel>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
              placeholder="Minimum 8 caractères"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Confirmer</FormLabel>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
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