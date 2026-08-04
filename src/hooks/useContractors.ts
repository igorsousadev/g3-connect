import { useEffect, useState } from 'react'
import { listContractors } from '../services/contractorService'
import type { Contractor } from '../types/contractor'

export function useContractors() {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listContractors()
      setContractors(data)
    } catch {
      setError('Erro ao carregar contratantes. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { contractors, loading, error, reload: load }
}
