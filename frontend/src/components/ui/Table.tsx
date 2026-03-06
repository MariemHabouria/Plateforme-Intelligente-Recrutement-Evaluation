import { ReactNode } from 'react'

export function Table({ children }: { children: ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead style={{ borderBottom: '1px solid var(--border)' }}>{children}</thead>
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      style={{ borderBottom: '1px solid var(--border-light)', transition: 'background .15s', cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
    >
      {children}
    </tr>
  )
}

export function Td({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)', ...style }}>{children}</td>
}
