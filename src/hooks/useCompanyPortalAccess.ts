import { useCallback, useEffect, useState } from 'react'
import { listPortalAccesses } from '../services/companyPortalAccessService'
import type { CompanyPortalAccess } from '../types/companyPortalAccess'

export function useCompanyPortalAccess(companyId: string | undefined) {
  const [accesses, setAccesses] = useState<CompanyPortalAccess[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(() => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    listPortalAccesses(companyId)
      .then(setAccesses)
      .catch(() => setError('Erro ao carregar acessos de portais.'))
      .finally(() => setLoading(false))
  }, [companyId])

  useEffect(() => { load() }, [load])

  return { accesses, setAccesses, loading, error, reload: load }
}
