interface CircuitStepsProps {
  labels: string[]
  currentStep: number // 0-indexed, steps < currentStep are done
}

export function CircuitSteps({ labels, currentStep }: CircuitStepsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {labels.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              background: i < currentStep ? 'var(--green)' : i === currentStep ? 'var(--gold)' : 'var(--white)',
              border: `2px solid ${i < currentStep ? 'var(--green)' : i === currentStep ? 'var(--gold)' : 'var(--border)'}`,
              color: i <= currentStep ? '#fff' : 'var(--text-muted)',
            }}>
              {i < currentStep ? '✓' : label.slice(0, 3)}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 40 }}>{label}</div>
          </div>
          {i < labels.length - 1 && (
            <div style={{ width: 20, height: 2, background: i < currentStep ? 'var(--green)' : 'var(--border-light)', margin: '0 2px', marginBottom: 14 }} />
          )}
        </div>
      ))}
    </div>
  )
}
