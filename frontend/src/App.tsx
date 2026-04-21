// frontend/src/App.tsx

import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CandidatFormPage } from './components/pages/candidat/CandidatFormPage';
import { LoginPage } from './components/pages/auth/LoginPage';
import { ChangePasswordPage } from './components/pages/auth/ChangePasswordPage';
import { DashboardPage } from './components/pages/dashboard/DashboardPage';
import { DemandesPage } from './components/pages/demandes/DemandesPage';
import { DemandeDetailsPage } from './components/pages/demandes/DemandeDetailsPage';
import { OffresPage } from './components/pages/offres/OffresPage';
import { CandidatsPage } from './components/pages/candidats/CandidatsPage';
import { CandidatDetailPage } from './components/pages/candidats/CandidatDetailPage';
import { EntretiensPage } from './components/pages/entretiens/EntretiensPage';
import { EntretienDetailPage } from './components/pages/entretiens/EntretienDetailPage';
import { EvaluationPage } from './components/pages/evaluation/EvaluationPage';
import { ContratsPage } from './components/pages/contrats/ContratsPage';
import { SuperAdminPage } from './components/pages/superadmin/SuperAdminPage';
import { ProfilePage } from './components/pages/profile/ProfilePage';
import { SettingsPage } from './components/pages/settings/SettingsPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
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

const SUPERADMIN_PAGES = ['utilisateurs', 'audit', 'workflows', 'ia_config'];

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const getPageFromPath = (path: string): string => {
    if (path.startsWith('/demandes/')) return 'demande-details';
    if (path.startsWith('/candidats/')) return 'candidat-details';
    if (path.startsWith('/entretiens/')) return 'entretien-details';
    if (path === '/profile') return 'profile';
    if (path === '/settings') return 'settings';
    if (path === '/offres') return 'offres';
    if (path === '/candidats') return 'candidats';
    if (path === '/entretiens') return 'entretiens';
    if (path === '/evaluation') return 'evaluation';
    if (path === '/contrats') return 'contrats';
    if (path.startsWith('/superadmin/')) return path.split('/')[2] || 'utilisateurs';
    return path.slice(1) || 'dashboard';
  };

  const currentPage = getPageFromPath(pathname);
  const demandeId = pathname.startsWith('/demandes/') ? pathname.split('/')[2] : null;
  const candidatId = pathname.startsWith('/candidats/') ? pathname.split('/')[2] : null;
  const entretienId = pathname.startsWith('/entretiens/') ? pathname.split('/')[2] : null;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Chargement...</div>;
  }

  if (!user) return null;

  if (user.mustChangePassword) {
    navigate('/change-password');
    return null;
  }

  const renderContent = () => {
    // ✅ Passer l'id directement en prop pour éviter le problème useParams
    if (entretienId) {
      return <EntretienDetailPage id={entretienId} />;
    }
    if (candidatId) {
  return <CandidatDetailPage id={candidatId} />;
}
    if (demandeId) {
      return <DemandeDetailsPage id={demandeId} />;
    }
    if (currentPage === 'profile') return <ProfilePage />;
    if (currentPage === 'settings') return <SettingsPage />;

    const role = user.role as Role;

    if (role === 'superadmin' && SUPERADMIN_PAGES.includes(currentPage)) {
      return <SuperAdminPage page={currentPage} />;
    }

    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'demandes': return <DemandesPage />;
      case 'offres': return <OffresPage />;
      case 'candidats': return <CandidatsPage />;
      case 'entretiens': return <EntretiensPage />;
      case 'evaluation': return <EvaluationPage />;
      case 'contrats': return <ContratsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar role={user.role as Role} currentPage={currentPage} onNavigate={(page: string) => {
        navigate(`/${page}`);
      }} />
      <div style={{ marginLeft: 248, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        <Header page={currentPage} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, backgroundColor: '#f8f9fa' }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/candidature/:token" element={<CandidatFormPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/*" element={<AuthenticatedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;