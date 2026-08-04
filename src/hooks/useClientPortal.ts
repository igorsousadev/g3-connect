import { useState, useEffect, useCallback } from 'react'
import { useClientContext } from '../contexts/ClientContext'
import {
  getClientSummary,
  getClientEmployees,
  getClientEmployeeDocs,
  getClientCompanyDocs,
  getClientPending,
  getClientActivity,
} from '../services/clientPortalService'
import type { ClientSummary, ClientEmployee, ClientDoc, ClientPendingItem } from '../types/clientPortal'
import type { ActivityLog } from '../types/activityLog'

export function useClientDashboard() {
  const { companyId, companyName } = useClientContext()
  const [summary,  setSummary]  = useState<ClientSummary | null>(null)
  const [pending,  setPending]  = useState<ClientPendingItem[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getClientSummary(companyId),
      getClientPending(companyId, companyName),
      getClientActivity(companyId, 10),
    ])
      .then(([s, p, a]) => { setSummary(s); setPending(p); setActivity(a) })
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false))
  }, [companyId, companyName])

  useEffect(() => { load() }, [load])

  return { summary, pending, activity, loading, error, reload: load }
}

export function useClientEmployees() {
  const { companyId } = useClientContext()
  const [employees, setEmployees] = useState<ClientEmployee[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getClientEmployees(companyId)
      .then(setEmployees)
      .catch(() => setError('Erro ao carregar funcionários.'))
      .finally(() => setLoading(false))
  }, [companyId])

  return { employees, loading, error }
}

export function useClientEmployeeDocs(employeeId: string) {
  const { companyId } = useClientContext()
  const [data,    setData]    = useState<{ employee: { full_name: string; role: string | null }; docs: ClientDoc[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getClientEmployeeDocs(employeeId, companyId)
      .then(setData)
      .catch(() => setError('Erro ao carregar documentos.'))
      .finally(() => setLoading(false))
  }, [employeeId, companyId])

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load }
}

export function useClientPending() {
  const { companyId, companyName } = useClientContext()
  const [items,   setItems]   = useState<ClientPendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getClientPending(companyId, companyName)
      .then(setItems)
      .catch(() => setError('Erro ao carregar pendências.'))
      .finally(() => setLoading(false))
  }, [companyId, companyName])

  useEffect(() => { load() }, [load])

  return { items, loading, error, reload: load }
}

export function useClientCompanyDocs() {
  const { companyId } = useClientContext()
  const [docs,    setDocs]    = useState<ClientDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getClientCompanyDocs(companyId)
      .then(setDocs)
      .catch(() => setError('Erro ao carregar documentos da empresa.'))
      .finally(() => setLoading(false))
  }, [companyId])

  useEffect(() => { load() }, [load])

  return { docs, loading, error, reload: load }
}

export function useClientHistory() {
  const { companyId } = useClientContext()
  const [logs,    setLogs]    = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getClientActivity(companyId, 30)
      .then(setLogs)
      .catch(() => setError('Erro ao carregar histórico.'))
      .finally(() => setLoading(false))
  }, [companyId])

  return { logs, loading, error }
}
