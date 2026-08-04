import { useEffect, useState } from 'react'
import { listSegments } from '../services/segmentService'
import type { Segment } from '../types/segment'

export function useSegments() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listSegments()
      setSegments(data)
    } catch {
      setError('Erro ao carregar segmentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { segments, loading, error, reload: load }
}
