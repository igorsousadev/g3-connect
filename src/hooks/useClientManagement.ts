import { useCallback, useEffect, useState } from 'react'
import { loadClientManagementData } from '../services/clientBillingService'
import type { ClientManagementRow } from '../services/clientBillingService'

export function useClientManagement() {
  const [rows, setRows]       = useState<ClientManagementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    loadClientManagementData()
      .then(setRows)
      .catch(() => setError('Erro ao carregar dados de clientes.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { rows, setRows, loading, error, refresh: load }
}
