import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { RoleSwitcher } from '@/components/layout/RoleSwitcher'
import { DashboardPage } from '@/components/pages/dashboard/DashboardPage'
import { DemandesPage } from '@/components/pages/demandes/DemandesPage'
import { OffresPage } from '@/components/pages/offres/OffresPage'
import { CandidatsPage } from '@/components/pages/candidats/CandidatsPage'
import { EntretiensPage } from '@/components/pages/entretiens/EntretiensPage'
import { EvaluationPage } from '@/components/pages/evaluation/EvaluationPage'
import { ContratsPage } from '@/components/pages/contrats/ContratsPage'
import { ValidationPage } from '@/components/pages/validation/ValidationPage'
import { CandidatFormPage } from '@/components/pages/candidat/CandidatFormPage'
import { SuperAdminPage } from '@/components/pages/superadmin/SuperAdminPage'
import type { Role } from '@/types'

const PAGES_PER_ROLE: Record<Role, string> = {
  superadmin: 'utilisateurs',
  manager:    'dashboard',
  directeur:  'dashboard',
  rh:         'dashboard',
  daf:        'dashboard',
  dga:        'dashboard',
  paie:       'dashboard',
  candidat:   'candidat_form',
}

const SUPERADMIN_PAGES = ['utilisateurs', 'audit', 'workflows', 'ia_config', 'demandes', 'evaluation']

export default function App() {
  const [role, setRole] = useState<Role>('manager')
  const [page, setPage] = useState<string>('dashboard')

  const handleSwitchRole = (r: Role) => {
    setRole(r)
    setPage(PAGES_PER_ROLE[r])
  }

  if (role === 'candidat') {
    return (
      <>
        <CandidatFormPage />
        <RoleSwitcher currentRole={role} onSwitch={handleSwitchRole} />
      </>
    )
  }

  const renderPage = () => {
    if (role === 'superadmin' && SUPERADMIN_PAGES.includes(page)) {
      if (page === 'evaluation') return <EvaluationPage role={role} />
      if (page === 'demandes')   return <DemandesPage role={role} />
      return <SuperAdminPage page={page} />
    }
    switch (page) {
      case 'dashboard':  return <DashboardPage role={role} />
      case 'demandes':   return <DemandesPage role={role} />
      case 'offres':     return <OffresPage />
      case 'candidats':  return <CandidatsPage />
      case 'entretiens': return <EntretiensPage role={role} />
      case 'evaluation': return <EvaluationPage role={role} />
      case 'contrats':   return <ContratsPage />
      case 'validation': return <ValidationPage />
      default:           return <DashboardPage role={role} />
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar role={role} currentPage={page} onNavigate={setPage} />
      <div style={{ marginLeft: 248, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        <Header page={page} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {renderPage()}
        </main>
      </div>
      <RoleSwitcher currentRole={role} onSwitch={handleSwitchRole} />
    </div>
  )
}
