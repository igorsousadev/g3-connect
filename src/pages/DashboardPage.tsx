import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { countActiveCompanies } from '../services/companyService'
import { countActiveEmployees } from '../services/employeeService'
import { countActiveRoles } from '../services/roleService'
import { countActiveDocumentTypes } from '../services/documentTypeService'
import { getDocumentCounts } from '../services/employeeDocumentService'
import { useActivityLogs } from '../hooks/useActivityLogs'
import { useOperationalCenter } from '../hooks/useOperationalCenter'
import { ActivityTimeline } from '../components/ActivityTimeline'

export function DashboardPage() {
  const [companiesCount,      setCompaniesCount]      = useState<number | null>(null)
  const [employeesCount,      setEmployeesCount]      = useState<number | null>(null)
  const [rolesCount,          setRolesCount]          = useState<number | null>(null)
  const [registeredDocsCount, setRegisteredDocsCount] = useState<number | null>(null)
  const [expiringCount,       setExpiringCount]       = useState<number | null>(null)
  const [expiredCount,        setExpiredCount]        = useState<number | null>(null)

  useEffect(() => {
    countActiveCompanies().then(setCompaniesCount).catch(() => setCompaniesCount(0))
    countActiveEmployees().then(setEmployeesCount).catch(() => setEmployeesCount(0))
    countActiveRoles().then(setRolesCount).catch(() => setRolesCount(0))
    countActiveDocumentTypes().then(setRegisteredDocsCount).catch(() => setRegisteredDocsCount(0))
    getDocumentCounts()
      .then(c => {
        setExpiringCount(c.expiring)
        setExpiredCount(c.expired)
      })
      .catch(() => {
        setExpiringCount(0)
        setExpiredCount(0)
      })
  }, [])

  const { logs: recentLogs, loading: loadingLogs } = useActivityLogs({ limit: 8 })
  const { items: operationalItems, loading: loadingOperational, error: operationalError } = useOperationalCenter()

  const operationalSummary = useMemo(() => ({
    total:          operationalItems.length,
    pendingClient:  operationalItems.filter(i => i.workflowStatus === 'pending_client' || i.isMissing).length,
    analysis:       operationalItems.filter(i => i.workflowStatus === 'analysis').length,
    homologation:   operationalItems.filter(i => i.workflowStatus === 'homologation').length,
    sent:           operationalItems.filter(i => i.workflowStatus === 'sent').length,
    approved:       operationalItems.filter(i => i.workflowStatus === 'approved').length,
    rejected:       operationalItems.filter(i => i.workflowStatus === 'rejected').length,
  }), [operationalItems])

  const fmt = (v: number | null) => v === null ? '...' : String(v)
  const fmtOperational = (v: number) => loadingOperational ? '...' : String(v)

  const generalCards = [
    {
      label: 'Empresas monitoradas',
      value: fmt(companiesCount),
      color: 'blue',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    },
    {
      label: 'Funcionários monitorados',
      value: fmt(employeesCount),
      color: 'indigo',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    },
    {
      label: 'Cargos ativos',
      value: fmt(rolesCount),
      color: 'violet',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
    },
    {
      label: 'Documentos cadastrados',
      value: fmt(registeredDocsCount),
      color: 'teal',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="9 12 12 15 15 12" /></svg>,
    },
  ]

  const operationalCards = [
    {
      label: 'Todos',
      value: fmtOperational(operationalSummary.total),
      color: 'default',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
    },
    {
      label: 'Aguardando cliente',
      value: fmtOperational(operationalSummary.pendingClient),
      color: 'amber',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    },
    {
      label: 'Análise',
      value: fmtOperational(operationalSummary.analysis),
      color: 'blue',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    },
    {
      label: 'Homologação',
      value: fmtOperational(operationalSummary.homologation),
      color: 'orange',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    },
    // [TEMP: card "Enviado" desativado — restaurar objeto { label: 'Enviado', ... } aqui]
    {
      label: 'Aprovado',
      value: fmtOperational(operationalSummary.approved),
      color: 'green',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    },
    {
      label: 'Rejeitado',
      value: fmtOperational(operationalSummary.rejected),
      color: 'red',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
    },
    {
      label: 'Documentos vencendo em 30 dias',
      value: fmt(expiringCount),
      color: 'amber',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    },
    {
      label: 'Documentos vencidos',
      value: fmt(expiredCount),
      color: 'red',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral da operação</p>
      </div>

      <div className="cards-grid">
        {generalCards.map(card => (
          <div key={card.label} className={`stat-card stat-card--${card.color}`}>
            <div className="stat-card-icon">{card.icon}</div>
            <div className="stat-card-body">
              <span className="stat-card-value">{card.value}</span>
              <span className="stat-card-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {operationalError && <div className="alert alert-error">{operationalError}</div>}

      <div className="cards-grid" style={{ marginTop: 20 }}>
        {operationalCards.map(card => (
          <div key={card.label} className={`stat-card stat-card--${card.color}`}>
            <div className="stat-card-icon">{card.icon}</div>
            <div className="stat-card-body">
              <span className="stat-card-value">{card.value}</span>
              <span className="stat-card-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="history-section">
        <div className="history-section-header">
          <h2 className="history-section-title">Atividade recente</h2>
          <Link to="/historico" className="link-external">Ver histórico completo →</Link>
        </div>
        <div className="form-card">
          <ActivityTimeline
            logs={recentLogs}
            loading={loadingLogs}
            compact
            emptyMessage="Nenhuma atividade registrada ainda. Comece cadastrando empresas e funcionários."
          />
        </div>
      </section>
    </div>
  )
}
