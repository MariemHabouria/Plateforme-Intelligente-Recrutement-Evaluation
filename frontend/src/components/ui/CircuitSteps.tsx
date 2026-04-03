interface CircuitStepsProps {
  labels: string[];
  currentStep: number; // Nombre d'étapes déjà validées (0 = aucune)
}

export function CircuitSteps({ labels, currentStep }: CircuitStepsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {labels.map((label, i) => {
        // i = index dans le tableau (0, 1, 2, ...)
        // Une étape est complétée si son index < currentStep
        const isCompleted = i < currentStep;
        // Une étape est en cours si son index === currentStep (et qu'il reste des étapes)
        const isCurrent = i === currentStep && currentStep < labels.length;
        
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                background: isCompleted ? 'var(--green)' : isCurrent ? 'var(--gold)' : 'var(--white)',
                border: `2px solid ${isCompleted ? 'var(--green)' : isCurrent ? 'var(--gold)' : 'var(--border)'}`,
                color: (isCompleted || isCurrent) ? '#fff' : 'var(--text-muted)',
              }}>
                {isCompleted ? '✓' : label.slice(0, 3)}
              </div>
              <div style={{
                fontSize: 9,
                color: isCompleted ? 'var(--green)' : isCurrent ? 'var(--gold)' : 'var(--text-muted)',
                textAlign: 'center',
                maxWidth: 40
              }}>
                {label}
              </div>
            </div>
            {i < labels.length - 1 && (
              <div style={{
                width: 20, height: 2,
                background: isCompleted ? 'var(--green)' : 'var(--border-light)',
                margin: '0 2px', marginBottom: 14
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}