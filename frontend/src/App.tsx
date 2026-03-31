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
import { CandidatFormPage } from './components/pages/candidat/CandidatFormPage';
import { SuperAdminPage } from './components/pages/superadmin/SuperAdminPage';
import { LoginPage } from './components/pages/auth/LoginPage';
import { ChangePasswordPage } from './components/pages/auth/ChangePasswordPage';
import { ProfilePage } from './components/pages/profile/ProfilePage';
import { SettingsPage } from './components/pages/settings/SettingsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import type { Role } from './types';

const PAGES_PER_ROLE: Record<Role, string> = {
  superadmin: 'utilisateurs',
  manager: 'dashboard',
  directeur: 'dashboard',
  rh: 'dashboard',
  daf: 'dashboard',
  dga: 'dashboard',
  dg: 'dashboard',  
  paie: 'contrats',
  candidat: 'candidature',
};

const SUPERADMIN_PAGES = ['utilisateurs', 'audit', 'workflows', 'ia_config'];

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<string>(() => {
    const currentPath = window.location.pathname;
    if (currentPath === '/candidature') return 'candidature';
    if (currentPath === '/change-password') return 'change-password';
    if (currentPath === '/profile') return 'profile';
    if (currentPath === '/settings') return 'settings';
    return 'login';
  });

  useEffect(() => {
    const currentPath = window.location.pathname;
    
    if (currentPath === '/candidature') {
      setPage('candidature');
      return;
    }
    
    if (currentPath === '/change-password') {
      setPage('change-password');
      return;
    }

    if (currentPath === '/profile') {
      setPage('profile');
      return;
    }

    if (currentPath === '/settings') {
      setPage('settings');
      return;
    }

    if (user) {
      if (user.mustChangePassword && currentPath !== '/change-password') {
        window.location.href = '/change-password';
        return;
      }
      setPage(PAGES_PER_ROLE[user.role as Role] || 'dashboard');
    } else {
      setPage('login');
    }
  }, [user]);

  if (page === 'candidature') return <CandidatFormPage />;
  if (page === 'change-password') return <ChangePasswordPage />;
  if (page === 'profile') return <ProfilePage />;
  if (page === 'settings') return <SettingsPage />;
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Chargement...</div>;
  if (!user) return <LoginPage />;
  if (user.mustChangePassword) {
    window.location.href = '/change-password';
    return null;
  }

  const renderPage = () => {
    const role = user.role as Role;
    const currentPage = page;

    // Super Admin pages
    if (role === 'superadmin' && SUPERADMIN_PAGES.includes(currentPage)) {
      return <SuperAdminPage page={currentPage} />;
    }

    // Pages standards
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'demandes':
        return <DemandesPage />;
      case 'offres':
        return <OffresPage />;
      case 'candidats':
        return <CandidatsPage />;
      case 'entretiens':
        return <EntretiensPage />;
      case 'evaluation':
        return <EvaluationPage />;
      case 'contrats':
        return <ContratsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar role={user.role as Role} currentPage={page} onNavigate={setPage} />
      <div style={{ marginLeft: 248, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        <Header page={page} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, backgroundColor: '#f8f9fa' }}>
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