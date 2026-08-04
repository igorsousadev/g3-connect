import { Fragment, useEffect, useState, useMemo } from 'react'
import { useSpecialistPanel } from '../hooks/useSpecialistPanel'
import { changeDocumentStatus } from '../services/specialistService'
import { listActivitiesForEntity } from '../services/activityLogService'
import type { SpecialistNextAction } from '../services/specialistService'
import { WorkflowStatusBadge } from '../components/DocStatusBadge'
import { FilterCardsToggle } from '../components/FilterCardsToggle'
import { formatDate } from '../lib/documentUtils'
import { downloadDocumentFile } from '../lib/documentFileResolver'
import type { SpecialistQueueItem } from '../services/specialistService'
import type { ActivityLog } from '../types/activityLog'

type ActionTarget = { item: SpecialistQueueItem; next: SpecialistNextAction }

function formatActivityDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atras`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atras`
  return `${Math.floor(hrs / 24)}d atras`
}

export function SpecialistPanelPage() {
  const { items, loading, error, reload } = useSpecialistPanel()
  const [workflowFilter, setWorkflowFilter] = useState('all')
  const [sourceFilter,   setSourceFilter]   = useState('all')
  const [showFilterCards, setShowFilterCards] = useState(true)
  const [contractorFilter, setContractorFilter] = useState('all')
  const [companyFilter,    setCompanyFilter]    = useState('all')
  const [docTypeFilter,    setDocTypeFilter]    = useState('all')
  const [search,           setSearch]           = useState('')

  const [page,         setPage]           = useState(1)
  const [pageSize,     setPageSize]       = useState(10)

  const [actionTarget, setActionTarget]   = useState<ActionTarget | null>(null)
  const [observation,  setObservation]    = useState('')
  const [saving,       setSaving]         = useState(false)
  const [saveError,    setSaveError]      = useState<string | null>(null)
  const [openingId,    setOpeningId]      = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<ActivityLog[] | null>(null)
  const [expandedLoading, setExpandedLoading] = useState(false)

  const contractors = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach(i => {
      if (i.contractorId && i.contractorTradeName)
        map.set(i.contractorId, i.contractorTradeName)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const companies = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach(i => {
      const id   = i.employees?.company_id ?? ''
      const name = i.employees?.companies?.corporate_name ?? id
      if (id) map.set(id, name)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const docTypes = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach(i => {
      if (i.document_type_id) map.set(i.document_type_id, i.document_types?.name ?? i.document_type_id)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const filtered = useMemo(() => {
    setPage(1)
    const q = search.toLowerCase()
    return items.filter(i => {
      if (
        workflowFilter !== 'all' &&
        workflowFilter === 'rejected' &&
        i.workflow_status !== 'rejected' &&
        i.status !== 'invalid'
      ) return false

      if (
        workflowFilter !== 'all' &&
        workflowFilter !== 'rejected' &&
        i.workflow_status !== workflowFilter
      ) return false
      if (contractorFilter !== 'all' && i.contractorId !== contractorFilter) return false
      if (sourceFilter !== 'all' && i.source !== sourceFilter) return false
      if (companyFilter !== 'all' && (i.employees?.company_id ?? '') !== companyFilter) return false
      if (docTypeFilter !== 'all' && i.document_type_id !== docTypeFilter) return false
      if (q) {
        const name     = (i.employees?.full_name ?? '').toLowerCase()
        const docType  = (i.document_types?.name ?? '').toLowerCase()
        const company  = (i.employees?.companies?.corporate_name ?? '').toLowerCase()
        const source   = i.source === 'company' ? 'empresa documento da empresa' : 'funcionário'
        const contract = (i.contractSearch ?? '').toLowerCase()
        if (!name.includes(q) && !docType.includes(q) && !company.includes(q) && !source.includes(q) && !contract.includes(q)) return false
      }
      return true
    })
  }, [items, workflowFilter, contractorFilter, sourceFilter, companyFilter, docTypeFilter, search])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated   = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as Element).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      if (e.key === 'Escape') {
        setExpandedKey(null)
        setExpandedLogs(null)
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  async function toggleExpand(item: SpecialistQueueItem) {
    const key = `${item.source}-${item.id}`
    if (expandedKey === key) {
      setExpandedKey(null)
      setExpandedLogs(null)
      return
    }

    setExpandedKey(key)
    setExpandedLogs(null)
    setExpandedLoading(true)
    try {
      const logs = await listActivitiesForEntity(
        item.source === 'company' ? 'company_document' : 'employee_document',
        item.id,
        5,
      )
      setExpandedLogs(logs)
    } catch {
      setExpandedLogs([])
    } finally {
      setExpandedLoading(false)
    }
  }

  const counts = useMemo(() => {
    const homologation = items.filter(i => i.workflow_status === 'homologation').length
    const sent         = items.filter(i => i.workflow_status === 'sent').length
    const rejected     = items.filter(i => i.workflow_status === 'rejected' || i.status === 'invalid').length
    const approved = items.filter(i => i.workflow_status === 'approved' || i.status === 'valid').length
    return {
      total: items.length,
      homologation,
      sent,
      rejected,
      approved,
    }
  }, [items])

  async function handleOpenFile(item: SpecialistQueueItem) {
    if (!item.external_file_url) {
      alert('Este documento não possui arquivo anexado.')
      return
    }
    setOpeningId(item.id)
    try {
      await downloadDocumentFile(item.external_file_url)
    } catch {
      alert('Erro ao baixar arquivo. Tente novamente.')
    } finally {
      setOpeningId(null)
    }
  }

  function openAction(item: SpecialistQueueItem, next: SpecialistNextAction) {
    setActionTarget({ item, next })
    setObservation('')
    setSaveError(null)
  }

  function cancelAction() {
    setActionTarget(null)
    setObservation('')
    setSaveError(null)
  }

  async function confirmAction() {
    if (!actionTarget) return
    setSaving(true)
    setSaveError(null)
    try {
      await changeDocumentStatus(actionTarget.item, actionTarget.next, observation)
      setActionTarget(null)
      setObservation('')
      reload()
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const ACTION_BUTTON_LABEL: Record<SpecialistNextAction, string> = {
    sent:     'Confirmar envio à contratante',
    approved: 'Confirmar aprovação',
    rejected: 'Confirmar rejeição',
  }

  if (loading) {
    return <div className="page"><div className="table-loading"><div className="spinner" /></div></div>
  }

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Painel do Especialista</h1>
          <p className="page-subtitle">Documentos aguardando análise ou homologação</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <FilterCardsToggle visible={showFilterCards} onToggle={() => setShowFilterCards(v => !v)} />
          <button className="btn btn-secondary" onClick={reload} disabled={loading}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {showFilterCards && <div className="cards-grid" style={{ marginBottom: 24 }}>
        <div
          className={`stat-card stat-card--default${workflowFilter === 'all' ? ' stat-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="Clique para ver todos"
          onClick={() => setWorkflowFilter('all')}
        >
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{counts.total}</span>
            <span className="stat-card-label">Todos</span>
          </div>
        </div>
        <div
          className={`stat-card stat-card--orange${workflowFilter === 'homologation' ? ' stat-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="Clique para filtrar: homologação"
          onClick={() => setWorkflowFilter(workflowFilter === 'homologation' ? 'all' : 'homologation')}
        >
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{counts.homologation}</span>
            <span className="stat-card-label">Homologação</span>
          </div>
        </div>
        {/* [TEMP: card "Enviados" desativado — restaurar bloco stat-card--indigo aqui] */}
        <div
          className={`stat-card stat-card--green${workflowFilter === 'approved' ? ' stat-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="Clique para filtrar: aprovados"
          onClick={() => setWorkflowFilter(workflowFilter === 'approved' ? 'all' : 'approved')}
        >
          <div className="stat-card-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>

          <div className="stat-card-body">
            <span className="stat-card-value">{counts.approved}</span>
            <span className="stat-card-label">Aprovados</span>
          </div>
        </div>
        <div
          className={`stat-card stat-card--red${workflowFilter === 'rejected' ? ' stat-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="Clique para filtrar: rejeitados"
          onClick={() => setWorkflowFilter(workflowFilter === 'rejected' ? 'all' : 'rejected')}
        >
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{counts.rejected}</span>
            <span className="stat-card-label">Rejeitados</span>
          </div>
        </div>
      </div>}

      <div className="toolbar toolbar--row">
        <div className="search-wrapper">
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </span>
          <input
            className="form-input search-input"
            placeholder="Buscar funcionário, empresa, contrato ou contratante..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <select
            className="form-input form-select filter-select"
            value={contractorFilter}
            onChange={e => setContractorFilter(e.target.value)}
          >
            <option value="all">Todas as contratantes</option>
            {contractors.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            className="form-input form-select filter-select"
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
          >
            <option value="all">Todas as origens</option>
            <option value="employee">Funcionários</option>
            <option value="company">Empresas</option>
          </select>
        </div>
        <div>
          <select
            className="form-input form-select filter-select"
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
          >
            <option value="all">Todas as empresas</option>
            {companies.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            className="form-input form-select filter-select"
            value={docTypeFilter}
            onChange={e => setDocTypeFilter(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            {docTypes.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>
        
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="table-container">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            <p>Nenhum documento na fila do especialista.</p>
          </div>
        ) : (
          <table className="table table--wide">
            <thead>
              <tr>
                <th>Origem</th>
                <th>Contrato</th>
                <th>Empresa</th>
                <th>Funcionário</th>
                <th>Documento</th>
                <th>Status</th>
                <th>Vencimento</th>
                <th>Arquivo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(item => {
                const isActive = actionTarget?.item.id === item.id
                const itemKey = `${item.source}-${item.id}`
                const isExpanded = expandedKey === itemKey
                return (
                  <Fragment key={`${item.source}-${item.id}`}>
                    <tr
                      key={item.id}
                      className={['tr-expand-trigger', isActive ? 'tr--action-active' : '', isExpanded ? 'tr--active' : ''].filter(Boolean).join(' ')}
                      onClick={() => toggleExpand(item)}
                      title="Clique para ver historico"
                    >
                      <td>
                        <span className={`badge ${item.source === 'company' ? 'badge--pending' : 'badge--active'}`}>
                          {item.source === 'company' ? 'Empresa' : 'Funcionário'}
                        </span>
                      </td>
                      <td className={item.contractLabel ? 'td-contract' : 'td-muted'}>
                        {item.contractLabel ?? 'Sem contrato'}
                      </td>
                      <td className="td-company">{item.employees?.companies?.corporate_name ?? '—'}</td>
                      <td className="td-primary">
                        {item.employees?.full_name ?? '—'}
                        {item.employees?.roles?.name && (
                          <div className="td-muted" style={{ fontWeight: 400, fontSize: 12 }}>{item.employees.roles.name}</div>
                        )}
                      </td>
                      <td className="td-truncate" title={item.document_types?.name ?? ''}>{item.document_types?.name ?? '—'}</td>
                      <td>
                        <div style={{ marginTop: 4 }}>
                          <WorkflowStatusBadge status={item.workflow_status} />
                        </div>
                      </td>
                      <td>{formatDate(item.expiration_date)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        {item.external_file_url ? (
                          <button
                            className="btn-icon"
                            title="Baixar arquivo"
                            onClick={() => handleOpenFile(item)}
                            disabled={openingId === item.id}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                            {openingId === item.id ? 'Baixando...' : 'Baixar'}
                          </button>
                        ) : (
                          <span className="td-muted">—</span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="op-actions">
                          {/* [TEMP: botão "Enviar à contratante" desativado — restaurar bloco btn-icon--submit aqui] */}
                          <button
                            className="btn-icon btn-icon--approve"
                            onClick={() => openAction(item, 'approved')}
                            title="Aprovar documento"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            Aprovar
                          </button>
                          <button
                            className="btn-icon btn-icon--reject"
                            onClick={() => openAction(item, 'rejected')}
                            title="Rejeitar documento"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            Rejeitar
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="tr-expanded">
                        <td colSpan={10}>
                          <div className="expand-panel">
                            <div className="expand-panel-header">
                              <span className="expand-panel-title">
                                {item.employees?.full_name ?? 'Documento da empresa'} - {item.document_types?.name ?? 'Documento'}
                              </span>
                              <span className="expand-shortcuts">Esc fechar</span>
                            </div>
                            {expandedLoading ? (
                              <div className="expand-loading">
                                <div className="spinner" style={{ width: 14, height: 14 }} />
                                Carregando historico...
                              </div>
                            ) : !expandedLogs || expandedLogs.length === 0 ? (
                              <p className="expand-empty">Nenhuma movimentacao registrada.</p>
                            ) : (
                              <div className="expand-log-list">
                                {expandedLogs.map(log => (
                                  <div key={log.id} className="expand-log-item">
                                    <span className="expand-log-date">{formatActivityDate(log.created_at)}</span>
                                    <span className="expand-log-desc">{log.description}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {isActive && (
                      <tr key={`${item.id}-action`} className="tr--inline-action">
                        <td colSpan={10}>
                          <div className="sp-inline-action">
                            <span className="sp-inline-label">
                              {actionTarget.next === 'approved' && 'Aprovar documento'}
                              {actionTarget.next === 'rejected' && 'Rejeitar documento'}
                              {/* [TEMP: label "Enviar à contratante" desativada] */}
                              {' — '}
                              <strong>{item.document_types?.name}</strong>
                              {' / '}
                              {item.employees?.full_name}
                            </span>
                            {saveError && <span className="sp-inline-error">{saveError}</span>}
                            <div className="sp-inline-row">
                              <textarea
                                className="sp-obs-textarea"
                                placeholder="Observação do especialista (opcional)..."
                                value={observation}
                                onChange={e => setObservation(e.target.value)}
                                rows={2}
                                autoFocus
                              />
                              <div className="sp-inline-btns">
                                <button
                                  className={`btn ${actionTarget.next === 'rejected' ? 'btn-danger' : actionTarget.next === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={confirmAction}
                                  disabled={saving}
                                >
                                  {saving ? 'Salvando...' : ACTION_BUTTON_LABEL[actionTarget.next]}
                                </button>
                                <button className="btn btn-secondary" onClick={cancelAction} disabled={saving}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="pagination-bar">
        <div className="pagination-info">
          {filtered.length} documento{filtered.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
        </div>
        <div className="pagination-controls">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(1)}         disabled={page === 1}>«</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
        >
          {[5, 10, 25, 50, 100].map(n => (
            <option key={n} value={n}>{n} por página</option>
          ))}
        </select>
      </div>
    </div>
  )
}
