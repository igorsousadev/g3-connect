import { useCallback, useEffect, useState } from 'react'
import { loadOperationalItems } from '../services/operationalService'
import type { OperationalItem } from '../types/operational'

export function useOperationalCenter() {
  const [items, setItems]   = useState<OperationalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    loadOperationalItems()
      .then(setItems)
      .catch(() => setError('Erro ao carregar dados operacionais.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { items, setItems, loading, error, refresh: load }
}
