import { useState } from 'react'
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  Star, 
  CheckSquare, 
  Briefcase, 
  Users, 
  FileCheck, 
  Settings, 
  LucideIcon, 
  GitBranch, 
  Cpu, 
  Shield,
  LogOut,
  User
} from 'lucide-react'
import { NAV_CONFIG } from '@/lib/data'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/types'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, 
  FileText, 
  Calendar, 
  Star, 
  CheckSquare,
  Briefcase, 
  Users, 
  FileCheck, 
  Settings, 
  GitBranch, 
  Cpu, 
  Shield,
}

interface SidebarProps {
  role: Role
  currentPage: string
  onNavigate: (page: string) => void
}

export function Sidebar({ role, currentPage, onNavigate }: SidebarProps) {
  const { logout, user } = useAuth() // ← Récupérer l'utilisateur connecté
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  // Normalisation du rôle (SUPER_ADMIN → superadmin)
  let normalizedRole = role?.toLowerCase() as string
  if (normalizedRole === 'super_admin') {
    normalizedRole = 'superadmin'
  }
  
  // Récupérer les items de navigation pour ce rôle
  const nav = NAV_CONFIG[normalizedRole] || []

  const handleLogout = () => {
    logout()
  }

  // Obtenir les initiales de l'utilisateur connecté
  const getUserInitials = () => {
    if (user?.prenom && user?.nom) {
      return (user.prenom[0] + user.nom[0]).toUpperCase()
    }
    return normalizedRole?.slice(0,2).toUpperCase() || 'U'
  }

  // Obtenir le nom complet de l'utilisateur connecté
  const getUserFullName = () => {
    if (user?.prenom && user?.nom) {
      return `${user.prenom} ${user.nom}`
    }
    return normalizedRole || 'Utilisateur'
  }

  // Obtenir le label du rôle pour l'affichage
  const getRoleLabel = () => {
    const roleLabels: Record<string, string> = {
      superadmin: 'Super Admin',
      manager: 'Manager (N+1)',
      directeur: 'Directeur (N+2)',
      rh: 'RH / DRH',
      daf: 'DAF',
      dga: 'DGA / DG',
      paie: 'Responsable Paie',
      candidat: 'Candidat'
    }
    return roleLabels[normalizedRole] || normalizedRole
  }

  return (
    <aside style={{ 
      width: 248, 
      minWidth: 248, 
      background: 'var(--sidebar-bg)', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      position: 'fixed', 
      left: 0, 
      top: 0, 
      zIndex: 100 
    }}>
      {/* ===== LOGO ===== */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 10, 
        padding: '18px 20px 14px', 
        borderBottom: '1px solid rgba(154,138,80,.15)' 
      }}>
        <div style={{ 
          width: 36, 
          height: 36, 
          borderRadius: '50%', 
          background: 'var(--gold)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontWeight: 800, 
          color: '#fff', 
          fontSize: 16 
        }}>
          K
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#EDE5CA', letterSpacing: .3 }}>
            Kilani RH
          </div>
          <div style={{ 
            fontSize: 10, 
            color: 'var(--sidebar-text)', 
            letterSpacing: 1.2, 
            textTransform: 'uppercase', 
            opacity: .7 
          }}>
            Platform
          </div>
        </div>
      </div>

      {/* ===== NAVIGATION ===== */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
        {nav.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--sidebar-text)', textAlign: 'center' }}>
            Aucun menu pour ce rôle
          </div>
        ) : (
          nav.map((item, idx) => {
            // Si c'est une section (titre)
            if (item.section) {
              return (
                <div key={idx} style={{ padding: '18px 20px 4px' }}>
                  <div style={{ 
                    fontSize: 10, 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: 1.2, 
                    color: 'rgba(184,168,120,.4)' 
                  }}>
                    {item.section}
                  </div>
                </div>
              )
            }
            
            // Si c'est un item de menu
            const Icon = item.icon ? iconMap[item.icon] : LayoutDashboard
            const isActive = currentPage === item.id
            const badgeColor = item.badgeColor === 'amber' ? 'var(--amber)' : 
                              item.badgeColor === 'gold' ? 'var(--gold)' : 'var(--red)'

            return (
              <div
                key={item.id}
                onClick={() => item.id && onNavigate(item.id)}
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10,
                  padding: '9px 10px 9px 12px',
                  margin: '1px 8px',
                  borderRadius: 8,
                  color: isActive ? '#EDE5CA' : 'var(--sidebar-text)',
                  fontSize: 13, 
                  fontWeight: isActive ? 500 : 400,
                  cursor: 'pointer',
                  background: isActive ? 'var(--sidebar-active)' : 'transparent',
                  position: 'relative',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { 
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' 
                }}
                onMouseLeave={e => { 
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' 
                }}
              >
                {isActive && (
                  <div style={{ 
                    position: 'absolute', 
                    left: -8, 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    width: 3, 
                    height: 18, 
                    background: 'var(--gold)', 
                    borderRadius: '0 2px 2px 0' 
                  }} />
                )}
                {Icon && <Icon size={15} style={{ opacity: isActive ? 1 : .6, flexShrink: 0 }} />}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{ 
                    background: badgeColor, 
                    color: '#fff', 
                    fontSize: 10, 
                    fontWeight: 600, 
                    padding: '1px 6px', 
                    borderRadius: 10, 
                    minWidth: 18, 
                    textAlign: 'center' 
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
            )
          })
        )}
      </nav>

      {/* ===== FOOTER UTILISATEUR AVEC NOM RÉEL ===== */}
      <div style={{ 
        padding: 12, 
        borderTop: '1px solid rgba(154,138,80,.15)',
        position: 'relative'
      }}>
        {/* Bouton utilisateur - Affiche les données RÉELLES de l'utilisateur connecté */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            padding: '8px 10px', 
            borderRadius: 8,
            cursor: 'pointer',
            background: showUserMenu ? 'var(--sidebar-hover)' : 'transparent'
          }}
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: '50%', 
            background: 'var(--gold)', // Couleur fixe ou basée sur le rôle
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: 12, 
            fontWeight: 600, 
            color: '#fff', 
            flexShrink: 0 
          }}>
            {getUserInitials()} {/* ← Initiales réelles de l'utilisateur */}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 500, 
              color: '#d6c89a', 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {getUserFullName()} {/* ← Nom réel de l'utilisateur */}
            </div>
            <div style={{ 
              fontSize: 10, 
              color: 'var(--sidebar-text)', 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              opacity: .7 
            }}>
              {getRoleLabel()} {/* ← Label du rôle */}
            </div>
          </div>
          <Settings size={13} style={{ color: 'var(--sidebar-text)', opacity: .5 }} />
        </div>

        {/* Menu déroulant utilisateur */}
        {showUserMenu && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 12,
            right: 12,
            background: '#2A2413',
            border: '1px solid rgba(154,138,80,.3)',
            borderRadius: 8,
            marginBottom: 8,
            overflow: 'hidden',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.3)'
          }}>
            <button
              onClick={() => {
                setShowUserMenu(false)
                onNavigate('profile')
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                color: '#d6c89a',
                textAlign: 'left',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: '1px solid rgba(154,138,80,.2)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--sidebar-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <User size={14} />
              Mon profil
            </button>
            <button
  onClick={() => {
    setShowUserMenu(false)
    onNavigate('settings')  // ← AJOUTER CETTE LIGNE
  }}
  style={{
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    color: '#d6c89a',
    textAlign: 'left',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid rgba(154,138,80,.2)',
  }}
  onMouseEnter={e => (e.currentTarget.style.background = 'var(--sidebar-hover)')}
  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
>
  <Settings size={14} />
  Paramètres
</button>
            <button
              onClick={() => {
                setShowUserMenu(false)
                handleLogout()
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                color: '#d6c89a',
                textAlign: 'left',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--sidebar-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOut size={14} />
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}