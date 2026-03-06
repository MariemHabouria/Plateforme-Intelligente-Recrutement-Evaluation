import { getScoreColor } from '@/lib/utils'

interface ScoreBarProps {
  label: string
  value: number
  showLabel?: boolean
}

export function ScoreBar({ label, value, showLabel = true }: ScoreBarProps) {
  return (
    <div style={{ marginBottom: 6 }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
          <span>{label}</span><span style={{ fontWeight: 600 }}>{value}%</span>
        </div>
      )}
      <div style={{ height: 5, background: 'var(--surface-alt)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 10, background: getScoreColor(value), transition: 'width .5s ease' }} />
      </div>
    </div>
  )
}
