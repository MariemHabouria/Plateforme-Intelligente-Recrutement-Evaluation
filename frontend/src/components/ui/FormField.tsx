import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, color: 'var(--text-primary)',
  background: 'var(--white)', outline: 'none',
  fontFamily: 'inherit', transition: 'border-color .18s',
}

export function FormGroup({ children }: { children: ReactNode }) {
  return <div style={{ marginBottom: 16 }}>{children}</div>
}

export function FormLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
      {children}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
    </label>
  )
}

export function FormRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>
}

type InputProps = InputHTMLAttributes<HTMLInputElement>
export function Input(props: InputProps) {
  return (
    <input
      style={inputStyle}
      onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--gold)'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(168,147,90,.12)' }}
      onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.boxShadow = 'none' }}
      {...props}
    />
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>
export function Select({ children, ...props }: SelectProps) {
  return (
    <select
      style={{ ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239299AA' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32 }}
      onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--gold)' }}
      onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)' }}
      {...props}
    >
      {children}
    </select>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>
export function Textarea(props: TextareaProps) {
  return (
    <textarea
      style={{ ...inputStyle, minHeight: 88, resize: 'vertical' }}
      onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--gold)' }}
      onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)' }}
      {...props}
    />
  )
}
