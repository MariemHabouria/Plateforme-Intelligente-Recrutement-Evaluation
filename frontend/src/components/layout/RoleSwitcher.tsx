import { ROLES } from '@/lib/data'
import type { Role } from '@/types'

interface RoleSwitcherProps {
  currentRole: Role
  onSwitch: (role: Role) => void
}

export function RoleSwitcher({ currentRole, onSwitch }: RoleSwitcherProps) {
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--sidebar-bg)', borderRadius: 12, padding: 12, boxShadow: 'var(--shadow-lg)', zIndex: 999, minWidth: 200 }}>
      <div style={{ fontSize: 10, color: 'rgba(168,176,200,.55)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>
        Simuler rôle
      </div>
      {(Object.entries(ROLES) as [Role, typeof ROLES[Role]][]).map(([key, r]) => (
        <button
          key={key}
          onClick={() => onSwitch(key)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '7px 8px',
            borderRadius: 4, background: currentRole === key ? 'var(--sidebar-active)' : 'none',
            color: currentRole === key ? '#fff' : 'var(--sidebar-text)',
            fontSize: 12, textAlign: 'left', border: 'none', cursor: 'pointer',
            transition: 'all .15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { if (currentRole !== key) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
          onMouseLeave={e => { if (currentRole !== key) (e.currentTarget as HTMLElement).style.background = 'none' }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
          {r.label}
        </button>
      ))}
    </div>
  )
}
