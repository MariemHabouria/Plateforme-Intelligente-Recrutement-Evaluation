import { LayoutDashboard, FileText, Calendar, Star, CheckSquare, Briefcase, Users, FileCheck, Settings, LucideIcon, GitBranch, Cpu, Shield } from 'lucide-react'
import { NAV_CONFIG, ROLES } from '@/lib/data'
import type { Role } from '@/types'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, FileText, Calendar, Star, CheckSquare,
  Briefcase, Users, FileCheck, Settings, GitBranch, Cpu, Shield,
}

interface SidebarProps {
  role: Role
  currentPage: string
  onNavigate: (page: string) => void
}

export function Sidebar({ role, currentPage, onNavigate }: SidebarProps) {
  const r = ROLES[role]
  const nav = NAV_CONFIG[role] || []

  return (
    <aside style={{ width: 248, minWidth: 248, background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 100 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 14px', borderBottom: '1px solid rgba(154,138,80,.15)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>K</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#EDE5CA', letterSpacing: .3 }}>Kilani RH</div>
          <div style={{ fontSize: 10, color: 'var(--sidebar-text)', letterSpacing: 1.2, textTransform: 'uppercase', opacity: .7 }}>Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
        {nav.map((item, idx) => {
          if (item.section) {
            return (
              <div key={idx} style={{ padding: '18px 20px 4px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'rgba(184,168,120,.4)' }}>{item.section}</div>
              </div>
            )
          }
          const Icon = iconMap[item.icon || 'LayoutDashboard']
          const isActive = currentPage === item.id
          const badgeColor = item.badgeColor === 'amber' ? 'var(--amber)' : item.badgeColor === 'gold' ? 'var(--gold)' : 'var(--red)'

          return (
            <div
              key={item.id}
              onClick={() => item.id && onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px 9px 12px',
                margin: '1px 8px',
                borderRadius: 8,
                color: isActive ? '#EDE5CA' : 'var(--sidebar-text)',
                fontSize: 13, fontWeight: isActive ? 500 : 400,
                cursor: 'pointer',
                background: isActive ? 'var(--sidebar-active)' : 'transparent',
                position: 'relative',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {isActive && <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, background: 'var(--gold)', borderRadius: '0 2px 2px 0' }} />}
              {Icon && <Icon size={15} style={{ opacity: isActive ? 1 : .6, flexShrink: 0 }} />}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ background: badgeColor, color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>
                  {item.badge}
                </span>
              )}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: 12, borderTop: '1px solid rgba(154,138,80,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
            {r.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#d6c89a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            <div style={{ fontSize: 10, color: 'var(--sidebar-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: .7 }}>{r.label}</div>
          </div>
          <Settings size={13} style={{ color: 'var(--sidebar-text)', flexShrink: 0, opacity: .5 }} />
        </div>
      </div>
    </aside>
  )
}
