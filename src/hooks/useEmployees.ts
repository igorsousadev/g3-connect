import { useEffect, useState } from 'react'
import { listEmployees } from '../services/employeeService'
import type { Employee } from '../types/employee'

export function useEmployees(companyId?: string) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listEmployees(companyId)
      setEmployees(data)
    } catch {
      setError('Erro ao carregar funcionários. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [companyId])

  return { employees, loading, error, reload: load }
}
