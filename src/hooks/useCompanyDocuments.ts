import { useEffect, useState } from 'react'
import { listCompanyDocuments } from '../services/companyDocumentService'
import type { CompanyDocumentWithType } from '../types/companyDocument'

export function useCompanyDocuments(companyId: string | undefined) {
  const [documents, setDocuments] = useState<CompanyDocumentWithType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) {
      setDocuments([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    listCompanyDocuments(companyId)
      .then(setDocuments)
      .catch(() => setError('Erro ao carregar documentos da empresa.'))
      .finally(() => setLoading(false))
  }, [companyId])

  return { documents, loading, error, setDocuments }
}
