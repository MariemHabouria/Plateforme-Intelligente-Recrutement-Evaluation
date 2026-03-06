import { CSSProperties } from 'react'

type BadgeVariant = 'green' | 'amber' | 'red' | 'olive' | 'umber' | 'gold'

const styles: Record<BadgeVariant, CSSProperties> = {
  green:  { background: 'var(--green-bg)',  color: 'var(--green-text)' },
  amber:  { background: 'var(--amber-bg)',  color: 'var(--amber-text)' },
  red:    { background: 'var(--red-bg)',    color: 'var(--red-text)' },
  olive:  { background: 'var(--olive-bg)',  color: 'var(--olive-text)' },
  umber:  { background: 'var(--umber-bg)',  color: 'var(--umber-text)' },
  gold:   { background: 'var(--gold-pale)', color: 'var(--gold-deep)' },
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'olive', children }: BadgeProps) {
  return (
    <span style={{
      ...styles[variant],
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}
