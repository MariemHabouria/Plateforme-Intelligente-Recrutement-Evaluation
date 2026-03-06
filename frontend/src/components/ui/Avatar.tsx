interface AvatarProps {
  name: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 26, md: 32, lg: 42 }
const fontSizes = { sm: 10, md: 12, lg: 15 }

export function Avatar({ name, color = 'var(--gold)', size = 'md' }: AvatarProps) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const s = sizes[size]
  return (
    <div style={{ width: s, height: s, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSizes[size], fontWeight: 600, color: '#fff', flexShrink: 0 }}>
      {initials}
    </div>
  )
}
