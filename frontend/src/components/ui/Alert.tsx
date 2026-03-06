import { ReactNode, CSSProperties } from 'react'

type AlertVariant = 'gold' | 'amber' | 'green' | 'red' | 'umber'

const styles: Record<AlertVariant, CSSProperties> = {
  gold:   { background: 'var(--gold-subtle)',  color: 'var(--gold-deep)',   borderLeft: '3px solid var(--gold)' },
  amber:  { background: 'var(--amber-bg)',     color: 'var(--amber-text)',  borderLeft: '3px solid var(--amber)' },
  green:  { background: 'var(--green-bg)',     color: 'var(--green-text)',  borderLeft: '3px solid var(--green)' },
  red:    { background: 'var(--red-bg)',       color: 'var(--red-text)',    borderLeft: '3px solid var(--red)' },
  umber:  { background: 'var(--umber-bg)',     color: 'var(--umber-text)',  borderLeft: '3px solid var(--umber)' },
}

export function Alert({ variant = 'gold', children }: { variant?: AlertVariant; children: ReactNode }) {
  return (
    <div style={{ ...styles[variant], padding: '12px 16px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
      {children}
    </div>
  )
}
