import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './components/pages/dashboard/DashboardPage';
import { DemandesPage } from './components/pages/demandes/DemandesPage';
import { DemandeDetailsPage } from './components/pages/demandes/DemandeDetailsPage';
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
  superadmin: 'dashboard',
  manager: 'dashboard',
  directeur: 'dashboard',
  rh: 'dashboard',
  daf: 'dashboard',
  dga: 'dashboard',
  dg: 'dashboard',
  paie: 'contrats',
  candidat: 'candidature',
};

const SUPERADMIN_PAGES = ['utilisateurs', 'audit', 'workflows', 'ia_config', 'type_postes'];

const getDemandeIdFromPath = (): string | null => {
  const match = window.location.pathname.match(/^\/demandes\/([^/]+)$/);
  return match ? match[1] : null;
};

const getInitialPage = (): string => {
  const path = window.location.pathname;
  if (path === '/candidature') return 'candidature';
  if (path === '/change-password') return 'change-password';
  if (path === '/profile') return 'profile';
  if (path === '/settings') return 'settings';
  if (getDemandeIdFromPath()) return 'demande-details';
  return 'login';
};

const navigateTo = (path: string, setPage: (p: string) => void, pageName: string) => {
  window.history.pushState({}, '', path);
  setPage(pageName);
};

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<string>(getInitialPage);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/candidature') return setPage('candidature');
      if (path === '/change-password') return setPage('change-password');
      if (path === '/profile') return setPage('profile');
      if (path === '/settings') return setPage('settings');
      if (getDemandeIdFromPath()) return setPage('demande-details');
      if (user) {
        setPage(PAGES_PER_ROLE[user.role as Role] || 'dashboard');
      } else {
        setPage('login');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  useEffect(() => {
    const path = window.location.pathname;

    if (
      path === '/candidature' ||
      path === '/change-password' ||
      path === '/profile' ||
      path === '/settings' ||
      getDemandeIdFromPath()
    ) {
      return;
    }

    if (user) {
      if (user.mustChangePassword) {
        window.location.href = '/change-password';
        return;
      }
      setPage(PAGES_PER_ROLE[user.role as Role] || 'dashboard');
    } else if (!loading) {
      setPage('login');
    }
  }, [user, loading]);

  // Pages publiques (sans sidebar)
  if (page === 'candidature') return <CandidatFormPage />;
  if (page === 'change-password') return <ChangePasswordPage />;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Chargement...
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (user.mustChangePassword) {
    window.location.href = '/change-password';
    return null;
  }

  // Navigation
  const handleNavigate = (newPage: string) => {
    navigateTo(`/${newPage}`, setPage, newPage);
  };

  const renderPageContent = () => {
    if (page === 'demande-details') {
      const demandeId = getDemandeIdFromPath();
      if (!demandeId) {
        navigateTo('/demandes', setPage, 'demandes');
        return null;
      }
      return <DemandeDetailsPage id={demandeId} />;
    }

    // ✅ Profile et Settings sont maintenant dans le layout avec sidebar
    if (page === 'profile') return <ProfilePage />;
    if (page === 'settings') return <SettingsPage />;

    const role = user.role as Role;

    if (role === 'superadmin' && SUPERADMIN_PAGES.includes(page)) {
      return <SuperAdminPage page={page} />;
    }

    switch (page) {
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
      <Sidebar role={user.role as Role} currentPage={page} onNavigate={handleNavigate} />
      <div style={{ marginLeft: 248, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        <Header page={page} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, backgroundColor: '#f8f9fa' }}>
          {renderPageContent()}
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