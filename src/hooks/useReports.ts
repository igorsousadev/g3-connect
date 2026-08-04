import { useState, useCallback, useEffect } from 'react'
import { loadReportData } from '../services/reportsService'
import { listActivitiesGlobal } from '../services/activityLogService'
import type { ReportData } from '../services/reportsService'
import type { ActivityLog } from '../types/activityLog'

export function useReports() {
  const [data,    setData]    = useState<ReportData | null>(null)
  const [logs,    setLogs]    = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      loadReportData(),
      listActivitiesGlobal({ limit: 100 }),
    ])
      .then(([reportData, activityLogs]) => {
        setData(reportData)
        setLogs(activityLogs)
      })
      .catch(() => setError('Erro ao carregar relatórios.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { data, logs, loading, error, reload: load }
}
