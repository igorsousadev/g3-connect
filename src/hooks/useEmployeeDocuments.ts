import { useEffect, useState } from 'react'
import { listEmployeeDocuments } from '../services/employeeDocumentService'
import type { EmployeeDocument } from '../types/employeeDocument'

export function useEmployeeDocuments(employeeId: string | undefined) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!employeeId) {
      setDocuments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    listEmployeeDocuments(employeeId)
      .then(setDocuments)
      .catch(() => setError('Erro ao carregar documentos.'))
      .finally(() => setLoading(false))
  }, [employeeId])

  return { documents, loading, error, setDocuments }
}
