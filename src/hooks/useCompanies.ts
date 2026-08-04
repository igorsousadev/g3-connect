import { useEffect, useState } from 'react'
import { listCompanies } from '../services/companyService'
import type { Company } from '../types/company'

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listCompanies()
      setCompanies(data)
    } catch {
      setError('Erro ao carregar empresas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { companies, loading, error, reload: load }
}
