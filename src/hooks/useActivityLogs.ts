import { useCallback, useEffect, useState } from 'react'
import { listActivitiesGlobal, listActivitiesForEmployee, listActivitiesForCompany } from '../services/activityLogService'
import type { ActivityLog } from '../types/activityLog'

interface GlobalOptions {
  entityType?: string
  actionType?: string
  limit?: number
}

export function useActivityLogs(options: GlobalOptions = {}) {
  const [logs, setLogs]       = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const { entityType, actionType, limit } = options

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    listActivitiesGlobal({ entityType, actionType, limit })
      .then(setLogs)
      .catch(() => setError('Erro ao carregar histórico.'))
      .finally(() => setLoading(false))
  }, [entityType, actionType, limit])

  useEffect(() => { load() }, [load])

  return { logs, loading, error, refresh: load }
}

export function useEmployeeActivityLogs(employeeId: string | undefined) {
  const [logs, setLogs]       = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!employeeId) { setLoading(false); return }
    setLoading(true)
    listActivitiesForEmployee(employeeId)
      .then(setLogs)
      .catch(() => setError('Erro ao carregar histórico.'))
      .finally(() => setLoading(false))
  }, [employeeId])

  return { logs, loading, error }
}

export function useCompanyActivityLogs(companyId: string | undefined) {
  const [logs, setLogs]       = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)
    listActivitiesForCompany(companyId)
      .then(setLogs)
      .catch(() => setError('Erro ao carregar histórico.'))
      .finally(() => setLoading(false))
  }, [companyId])

  return { logs, loading, error }
}
