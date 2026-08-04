import { useState, useCallback, useEffect } from 'react'
import { listAllTemplates } from '../services/messageTemplateService'
import type { MessageTemplate } from '../types/messageTemplate'

export function useMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    listAllTemplates()
      .then(setTemplates)
      .catch(() => setError('Erro ao carregar templates.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { templates, loading, error, reload: load }
}
