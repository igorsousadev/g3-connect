import { useEffect, useState } from 'react'
import { listRoles } from '../services/roleService'
import type { Role } from '../types/role'

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listRoles()
      setRoles(data)
    } catch {
      setError('Erro ao carregar cargos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { roles, loading, error, reload: load }
}
