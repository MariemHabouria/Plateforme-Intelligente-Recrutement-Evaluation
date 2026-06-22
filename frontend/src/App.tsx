// frontend/src/App.tsx

import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CandidatFormPage } from './components/pages/candidat/CandidatFormPage';
import { FicheRenseignement } from './components/pages/candidat/FicheRenseignement';
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
import { ScoringConfigPage } from './components/pages/superadmin/ScoringConfigPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import type { Role } from './types';
import { OffreCandidatsPage } from './components/pages/offres/OffreCandidatsPage';

const SUPERADMIN_PAGES = ['utilisateurs', 'audit', 'workflows', 'ia_config', 'scoring_config'];

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const getPageFromPath = (path: string): string => {
    if (path.startsWith('/validation/')) return 'validation';
    if (path.startsWith('/demandes/')) return 'demande-details';
    if (path.startsWith('/candidats/')) return 'candidat-details';
    if (path.startsWith('/entretiens/')) return 'entretien-details';
    if (path.startsWith('/offres/') && path.includes('/candidats')) return 'offre-candidats';
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

  const offreCandidatsId = pathname.startsWith('/offres/') && pathname.includes('/candidats')
    ? pathname.split('/')[2]
    : null;
  const currentPage = getPageFromPath(pathname);
  const demandeId = pathname.startsWith('/demandes/') ? pathname.split('/')[2] : null;
  const validationId = pathname.startsWith('/validation/') ? pathname.split('/')[2] : null;
  const candidatId = pathname.startsWith('/candidats/') ? pathname.split('/')[2] : null;
  const entretienId = pathname.startsWith('/entretiens/') ? pathname.split('/')[2] : null;

  useEffect(() => {
    if (!loading && !user) {
      if (!pathname.startsWith('/validation/')) {
        navigate('/login');
      }
    }
  }, [user, loading, navigate, pathname]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Chargement...
      </div>
    );
  }

  if (!user) {
    if (pathname.startsWith('/validation/')) {
      return <DemandeDetailsPage />;
    }
    return null;
  }

  if (user.mustChangePassword) {
    navigate('/change-password');
    return null;
  }

  // Route /validation/:id - sans sidebar
  if (validationId) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflow: 'hidden'
        }}>
          <main style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            backgroundColor: '#f8f9fa'
          }}>
            <DemandeDetailsPage id={validationId} />
          </main>
        </div>
      </div>
    );
  }

  // Route /demandes/:id - avec sidebar
  if (demandeId) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar
          role={user.role as Role}
          currentPage={currentPage}
          onNavigate={(page: string) => navigate(`/${page}`)}
        />
        <div style={{
          marginLeft: 248,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflow: 'hidden'
        }}>
          <Header page={currentPage} />
          <main style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            backgroundColor: '#f8f9fa'
          }}>
            <DemandeDetailsPage id={demandeId} />
          </main>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (offreCandidatsId) return <OffreCandidatsPage offreId={offreCandidatsId} />;
    if (entretienId) return <EntretienDetailPage id={entretienId} />;
    if (candidatId) return <CandidatDetailPage id={candidatId} />;

    if (currentPage === 'profile') return <ProfilePage />;
    if (currentPage === 'settings') return <SettingsPage />;

    const isSuperAdmin = ['SUPER_ADMIN', 'super_admin', 'superadmin'].includes(user.role as string);
    if (isSuperAdmin && SUPERADMIN_PAGES.includes(currentPage)) {
      if (currentPage === 'scoring_config') return <ScoringConfigPage />;
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
      <Sidebar
        role={user.role as Role}
        currentPage={currentPage}
        onNavigate={(page: string) => navigate(`/${page}`)}
      />
      <div style={{
        marginLeft: 248,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflow: 'hidden'
      }}>
        <Header page={currentPage} />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          backgroundColor: '#f8f9fa'
        }}>
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
          <Route path="/fiche-renseignement/:token" element={<FicheRenseignement />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          
          <Route path="/validation/:id" element={<DemandeDetailsPage />} />
          
          <Route path="/*" element={<AuthenticatedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;