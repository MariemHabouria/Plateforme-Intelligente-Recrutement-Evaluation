import { useState } from 'react'
import type { Role } from '@/types'

export function useRole(initial: Role = 'manager') {
  const [role, setRole] = useState<Role>(initial)
  return { role, setRole }
}
