import { ButtonHTMLAttributes, CSSProperties } from 'react'

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type BtnSize = 'default' | 'sm' | 'xs' | 'icon'

const base: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  borderRadius: 8, fontFamily: 'inherit', fontWeight: 500,
  transition: 'all 0.18s ease', cursor: 'pointer', border: 'none',
  whiteSpace: 'nowrap',
}

const variantStyles: Record<BtnVariant, CSSProperties> = {
  primary:   { background: 'var(--gold)',       color: '#fff' },
  secondary: { background: 'var(--white)',      color: 'var(--text-primary)', border: '1px solid var(--border)' },
  ghost:     { background: 'none',              color: 'var(--text-secondary)' },
  danger:    { background: 'var(--red-bg)',     color: 'var(--red-text)' },
  success:   { background: 'var(--green-bg)',   color: 'var(--green-text)' },
}

const sizeStyles: Record<BtnSize, CSSProperties> = {
  default: { padding: '8px 16px', fontSize: 13 },
  sm:      { padding: '6px 12px', fontSize: 12 },
  xs:      { padding: '3px 8px',  fontSize: 11, borderRadius: 4 },
  icon:    { padding: 8,          fontSize: 13 },
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
}

export function Button({ variant = 'primary', size = 'default', style, children, ...props }: ButtonProps) {
  return (
    <button style={{ ...base, ...variantStyles[variant], ...sizeStyles[size], ...style }} {...props}>
      {children}
    </button>
  )
}
