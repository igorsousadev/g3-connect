import { useState, useCallback, useEffect } from 'react'
import { loadSpecialistQueue } from '../services/specialistService'
import type { SpecialistQueueItem } from '../services/specialistService'

export function useSpecialistPanel() {
  const [items, setItems]     = useState<SpecialistQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    loadSpecialistQueue()
      .then(setItems)
      .catch(() => setError('Erro ao carregar fila do especialista.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { items, loading, error, reload: load }
}
