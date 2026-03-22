import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './components/pages/dashboard/DashboardPage';
import { DemandesPage } from './components/pages/demandes/DemandesPage';
import { OffresPage } from './components/pages/offres/OffresPage';
import { CandidatsPage } from './components/pages/candidats/CandidatsPage';
import { EntretiensPage } from './components/pages/entretiens/EntretiensPage';
import { EvaluationPage } from './components/pages/evaluation/EvaluationPage';
import { ContratsPage } from './components/pages/contrats/ContratsPage';
import { ValidationPage } from './components/pages/validation/ValidationPage';
import { CandidatFormPage } from './components/pages/candidat/CandidatFormPage';
import { SuperAdminPage } from './components/pages/superadmin/SuperAdminPage';
import { LoginPage } from './components/pages/auth/LoginPage';
import { ChangePasswordPage } from './components/pages/auth/ChangePasswordPage';
import { ProfilePage } from './components/pages/profile/ProfilePage';
import { SettingsPage } from './components/pages/settings/SettingsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import type { Role } from './types';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Mettre à jour le path quand l'URL change
  useEffect(() => {
    const handlePathChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  // Gestionnaire de navigation
  const handleNavigate = (page: string) => {
    window.history.pushState({}, '', `/${page}`);
    setCurrentPath(`/${page}`);
  };

  // Pages publiques
  if (currentPath === '/candidature') {
    return <CandidatFormPage />;
  }

  if (currentPath === '/change-password') {
    return <ChangePasswordPage />;
  }

  if (currentPath === '/profile') {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar 
          role={user?.role as Role} 
          currentPage="profile" 
          onNavigate={handleNavigate} 
        />
        <div style={{ 
          marginLeft: 248, 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: '100vh', 
          overflow: 'hidden' 
        }}>
          <Header page="profile" />
          <main style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: 24,
            backgroundColor: '#f8f9fa'
          }}>
            <ProfilePage />
          </main>
        </div>
      </div>
    );
  }

  if (currentPath === '/settings') {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar 
          role={user?.role as Role} 
          currentPage="settings" 
          onNavigate={handleNavigate} 
        />
        <div style={{ 
          marginLeft: 248, 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: '100vh', 
          overflow: 'hidden' 
        }}>
          <Header page="settings" />
          <main style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: 24,
            backgroundColor: '#f8f9fa'
          }}>
            <SettingsPage />
          </main>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'var(--gold)'
      }}>
        Chargement...
      </div>
    );
  }

  // Non connecté
  if (!user) {
    return <LoginPage />;
  }

  // Vérifier changement de mot de passe
  if (user.mustChangePassword && currentPath !== '/change-password') {
    window.location.href = '/change-password';
    return null;
  }

  // Rendu des pages protégées
  const renderPage = () => {
    const role = user.role as Role;
    const page = currentPath.replace('/', '') || 'dashboard';

    // Super Admin pages
    if (role === 'superadmin' && ['utilisateurs', 'audit', 'workflows', 'ia_config'].includes(page)) {
      return <SuperAdminPage page={page} />;
    }

    // Pages standards
    switch (page) {
      case 'dashboard':
        return <DashboardPage role={role} />;
      case 'demandes':
        return <DemandesPage role={role} />;
      case 'offres':
        return <OffresPage />;
      case 'candidats':
        return <CandidatsPage />;
      case 'entretiens':
        return <EntretiensPage role={role} />;
      case 'evaluation':
        return <EvaluationPage role={role} />;
      case 'contrats':
        return <ContratsPage />;
      case 'validation':
        return <ValidationPage />;
      default:
        // Rediriger vers dashboard si page inconnue
        if (page !== 'profile' && page !== 'settings') {
          window.location.href = '/dashboard';
        }
        return <DashboardPage role={role} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar 
        role={user.role as Role} 
        currentPage={currentPath.replace('/', '') || 'dashboard'} 
        onNavigate={handleNavigate} 
      />
      <div style={{ 
        marginLeft: 248, 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '100vh', 
        overflow: 'hidden' 
      }}>
        <Header page={currentPath.replace('/', '') || 'dashboard'} />
        <main style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: 24,
          backgroundColor: '#f8f9fa'
        }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;