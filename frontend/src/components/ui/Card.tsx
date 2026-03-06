import { ReactNode, CSSProperties } from 'react'

const cardStyle: CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...cardStyle, ...style }}>{children}</div>
}

export function CardHeader({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--border-light)', ...style }}>
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{children}</div>
}

export function CardSubtitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{children}</div>
}

export function CardBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ padding: '16px 20px', ...style }}>{children}</div>
}

export function CardFooter({ children }: { children: ReactNode }) {
  return <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)' }}>{children}</div>
}
