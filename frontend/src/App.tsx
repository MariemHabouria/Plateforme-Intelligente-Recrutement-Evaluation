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
    const path = window.location.pathname;
    if (path === '/candidature') return 'candidature';
    if (path === '/change-password') return 'change-password';
    return 'login';
  });

  useEffect(() => {
    const path = window.location.pathname;
    
    if (path === '/candidature') {
      setPage('candidature');
      return;
    }
    
    if (path === '/change-password') {
      setPage('change-password');
      return;
    }

    if (user) {
      if (user.mustChangePassword && path !== '/change-password') {
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
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Chargement...</div>;
  if (!user) return <LoginPage />;
  if (user.mustChangePassword) {
    window.location.href = '/change-password';
    return null;
  }

  const renderPage = () => {
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