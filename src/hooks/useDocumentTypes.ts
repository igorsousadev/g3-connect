import { useEffect, useState } from 'react'
import { listDocumentTypes } from '../services/documentTypeService'
import type { DocumentType } from '../types/documentType'

export function useDocumentTypes() {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listDocumentTypes()
      setDocumentTypes(data)
    } catch {
      setError('Erro ao carregar tipos de documentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { documentTypes, loading, error, reload: load }
}
