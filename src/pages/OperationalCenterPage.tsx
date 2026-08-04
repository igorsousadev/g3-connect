import { useMemo, useState, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOperationalCenter } from '../hooks/useOperationalCenter'
import { listActivitiesForEntity } from '../services/activityLogService'
import { WhatsAppModal } from '../components/WhatsAppModal'
import { WorkflowStatusBadge } from '../components/DocStatusBadge'
import { FilterCardsToggle } from '../components/FilterCardsToggle'
import { downloadDocumentFile } from '../lib/documentFileResolver'
import type { OperationalItem } from '../types/operational'
import type { ActivityLog } from '../types/activityLog'

// ─── Constants ──────────────────────────────────────────────
const LS_KEY = 'op_center_filters'
const COL_COUNT = 12

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  expired: { label: 'Vencido',     className: 'doc-badge doc-badge--expired'  },
  invalid: { label: 'Inválido',    className: 'doc-badge doc-badge--invalid'  },
  pending: { label: 'Pendente',    className: 'doc-badge doc-badge--pending'  },
  missing: { label: 'Não enviado', className: 'doc-badge doc-badge--missing'  },
  valid:   { label: 'Válido',      className: 'doc-badge doc-badge--valid'    },
}

const STATUS_PRIORITY: Record<string, number> = {
  expired: 0, invalid: 1, pending: 2, missing: 3, valid: 4,
}

// ─── Helpers ─────────────────────────────────────────────────
function rowClass(status: string): string {
  if (status === 'expired') return 'tr--expired'
  if (status === 'invalid') return 'tr--rejected'
  return ''
}

function formatActivityDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

function loadSavedFilters(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

type DueFilter = '' | 'expired' | 'expiring'
type OriginFilter = '' | 'employee' | 'company'

function getItemKey(item: OperationalItem): string {
  return `${item.source}-${item.docId ?? item.employeeId}-${item.documentTypeId}`
}

function getEditPath(item: OperationalItem): string | null {
  if (!item.docId) return null
  if (item.source === 'company') {
    return `/empresas/${item.companyId}/documentos/${item.docId}/editar`
  }
  return `/funcionarios/${item.employeeId}/documentos/${item.docId}/editar`
}

// ─── Main page ───────────────────────────────────────────────
export function OperationalCenterPage() {
  const navigate = useNavigate()
  const { items, loading, error, refresh } = useOperationalCenter()

  const VALID_WORKFLOW = new Set(['', 'pending_client', 'analysis', 'homologation', 'sent', 'approved', 'rejected'])

  // Filter state — initialized from localStorage (sanitiza valores antigos salvos)
  const [search,         setSearch]         = useState(() => loadSavedFilters().search        ?? '')
  const [filterCompany,  setFilterCompany]  = useState(() => loadSavedFilters().filterCompany ?? '')
  const [filterRole,     setFilterRole]     = useState(() => loadSavedFilters().filterRole    ?? '')
  const [filterWorkflow, setFilterWorkflow] = useState(() => {
    const v = loadSavedFilters().filterWorkflow ?? ''
    return VALID_WORKFLOW.has(v) ? v : ''
  })
  const [filterDue, setFilterDue] = useState<DueFilter>(() => {
    const v = loadSavedFilters().filterDue
    return v === 'expired' || v === 'expiring' ? v : ''
  })
  const [filterSource, setFilterSource] = useState<OriginFilter>(() => {
    const v = loadSavedFilters().filterSource
    return v === 'employee' || v === 'company' ? v : ''
  })
  const [filterContractor, setFilterContractor] = useState(() => loadSavedFilters().filterContractor ?? '')
  const [showFilterCards, setShowFilterCards] = useState(true)

  const [whatsappItem,     setWhatsappItem]     = useState<OperationalItem | null>(null)
  const [page,             setPage]             = useState(1)
  const [pageSize,         setPageSize]         = useState(10)
  const [openingKey,       setOpeningKey]       = useState<string | null>(null)

  // Expanded row
  const [expandedKey,     setExpandedKey]     = useState<string | null>(null)
  const [expandedLogs,    setExpandedLogs]    = useState<ActivityLog[] | null>(null)
  const [expandedLoading, setExpandedLoading] = useState(false)

  // Persist filters to localStorage on change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ search, filterContractor, filterCompany, filterRole, filterWorkflow, filterDue, filterSource }))
  }, [search, filterContractor, filterCompany, filterRole, filterWorkflow, filterDue, filterSource])

  // Select options derived from data
  const companyOptions = useMemo(() => {
    const seen = new Map<string, string>()
    items.forEach(i => { if (i.companyId && !seen.has(i.companyId)) seen.set(i.companyId, i.companyName) })
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const roleOptions = useMemo(() => {
    const seen = new Map<string, string>()
    items.forEach(i => { if (i.roleId && !seen.has(i.roleId)) seen.set(i.roleId, i.roleName ?? '') })
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const contractorOptions = useMemo(() => {
    const seen = new Map<string, string>()
    items.forEach(i => {
      if (i.contractorId && !seen.has(i.contractorId))
        seen.set(i.contractorId, i.contractorTradeName || i.contractorCode || i.contractorId)
    })
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])


  // Contagem por etapa — usada pelos cards de filtro
  const wfSummary = useMemo(() => ({
    total:          items.length,
    pending_client: items.filter(i => i.workflowStatus === 'pending_client' || i.isMissing).length,
    analysis:       items.filter(i => i.workflowStatus === 'analysis').length,
    homologation:   items.filter(i => i.workflowStatus === 'homologation').length,
    sent:           items.filter(i => i.workflowStatus === 'sent').length,
    approved:       items.filter(i => i.workflowStatus === 'approved').length,
    rejected:       items.filter(i => i.workflowStatus === 'rejected').length,
    expired:        items.filter(i => !i.isMissing && i.daysUntilExpiry !== null && i.daysUntilExpiry < 0).length,
    expiring:       items.filter(i => !i.isMissing && i.daysUntilExpiry !== null && i.daysUntilExpiry >= 0 && i.daysUntilExpiry <= 30).length,
  }), [items])

  const fmt = (v: number) => loading ? '...' : String(v)

  function toggleWorkflowFilter(value: string) {
    setFilterDue('')
    setFilterWorkflow(filterWorkflow === value ? '' : value)
  }

  function toggleDueFilter(value: DueFilter) {
    setFilterWorkflow('')
    setFilterDue(filterDue === value ? '' : value)
  }

  // Filtered + sorted list
  const filtered = useMemo(() => {
    setPage(1)
    const q = search.toLowerCase()
    return items
      .filter(item => {
        if (filterContractor && item.contractorId !== filterContractor) return false
        if (filterSource && item.source !== filterSource) return false
        if (filterCompany && item.companyId !== filterCompany) return false
        if (filterRole    && item.roleId    !== filterRole)    return false
        if (filterWorkflow) {
          if (filterWorkflow === 'pending_client') {
            if (item.workflowStatus !== 'pending_client' && !item.isMissing) return false
          } else {
            if (item.workflowStatus !== filterWorkflow) return false
          }
        }
        if (filterDue === 'expired') {
          if (item.isMissing || item.daysUntilExpiry === null || item.daysUntilExpiry >= 0) return false
        }
        if (filterDue === 'expiring') {
          if (item.isMissing || item.daysUntilExpiry === null || item.daysUntilExpiry < 0 || item.daysUntilExpiry > 30) return false
        }
        if (q) {
          const sourceLabel = item.source === 'company' ? 'Empresa Documento da empresa' : 'Funcionário'
          const haystack = [sourceLabel, item.employeeName, item.companyName, item.employeeCpf, item.documentTypeName, item.contractSearch ?? '']
            .join(' ').toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status] ?? 9
        const pb = STATUS_PRIORITY[b.status] ?? 9
        if (pa !== pb) return pa - pb
        if (a.daysUntilExpiry !== null && b.daysUntilExpiry !== null)
          return a.daysUntilExpiry - b.daysUntilExpiry
        return a.employeeName.localeCompare(b.employeeName)
      })
  }, [items, search, filterContractor, filterCompany, filterRole, filterWorkflow, filterDue, filterSource])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated   = filtered.slice((page - 1) * pageSize, page * pageSize)
  const expandedItem = expandedKey
    ? paginated.find(i => getItemKey(i) === expandedKey) ?? null
    : null

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as Element).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      if (e.key === 'Escape') {
        setExpandedKey(null)
        setExpandedLogs(null)
        return
      }
      if (!expandedItem) return

      if (e.key === 'w' || e.key === 'W') {
        const phone = expandedItem.employeePhone ?? expandedItem.companyWhatsapp
        if (phone) setWhatsappItem(expandedItem)
      }
      if ((e.key === 'e' || e.key === 'E') && expandedItem.docId) {
        const editPath = getEditPath(expandedItem)
        if (editPath) navigate(editPath)
      }
      if (e.key === 'v' || e.key === 'V') {
        if (expandedItem.source === 'company') {
          navigate(`/empresas/${expandedItem.companyId}/editar`)
        } else {
          navigate(`/funcionarios/${expandedItem.employeeId}/documentos`)
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [expandedKey, expandedItem, navigate])

  async function toggleExpand(item: OperationalItem) {
    const key = getItemKey(item)
    if (expandedKey === key) {
      setExpandedKey(null)
      setExpandedLogs(null)
      return
    }
    setExpandedKey(key)
    setExpandedLogs(null)
    if (!item.docId) {
      setExpandedLogs([])
      return
    }
    setExpandedLoading(true)
    try {
      const logs = await listActivitiesForEntity(
        item.source === 'company' ? 'company_document' : 'employee_document',
        item.docId,
        5,
      )
      setExpandedLogs(logs)
    } catch {
      setExpandedLogs([])
    } finally {
      setExpandedLoading(false)
    }
  }

  async function handleOpenFile(item: OperationalItem) {
    if (!item.externalFileUrl) {
      alert('Este documento não possui arquivo anexado.')
      return
    }

    const key = getItemKey(item)
    setOpeningKey(key)
    try {
      await downloadDocumentFile(item.externalFileUrl)
    } catch {
      alert('Erro ao baixar arquivo. Tente novamente.')
    } finally {
      setOpeningKey(null)
    }
  }

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Central Operacional</h1>
          <p className="page-subtitle">Pendências, vencimentos e ações prioritárias</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <FilterCardsToggle visible={showFilterCards} onToggle={() => setShowFilterCards(v => !v)} />
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Cards de etapa operacional — clique para filtrar */}
      {showFilterCards && <div style={{ marginBottom: 20 }}>
        <div className="cards-grid">
          <div className={`stat-card stat-card--default${filterWorkflow === '' && filterDue === '' ? ' stat-card--active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => { setFilterWorkflow(''); setFilterDue('') }}>
            <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></div>
            <div className="stat-card-body"><span className="stat-card-value">{fmt(wfSummary.total)}</span><span className="stat-card-label">Todos</span></div>
          </div>
          <div className={`stat-card stat-card--amber${filterWorkflow === 'pending_client' ? ' stat-card--active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleWorkflowFilter('pending_client')}>
            <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
            <div className="stat-card-body"><span className="stat-card-value">{fmt(wfSummary.pending_client)}</span><span className="stat-card-label">Aguardando cliente</span></div>
          </div>
          <div className={`stat-card stat-card--blue${filterWorkflow === 'analysis' ? ' stat-card--active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleWorkflowFilter('analysis')}>
            <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg></div>
            <div className="stat-card-body"><span className="stat-card-value">{fmt(wfSummary.analysis)}</span><span className="stat-card-label">Análise</span></div>
          </div>
          <div className={`stat-card stat-card--orange${filterWorkflow === 'homologation' ? ' stat-card--active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleWorkflowFilter('homologation')}>
            <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
            <div className="stat-card-body"><span className="stat-card-value">{fmt(wfSummary.homologation)}</span><span className="stat-card-label">Homologação</span></div>
          </div>
          {/* [TEMP: card "Enviado" desativado — restaurar bloco stat-card--indigo aqui] */}
          <div className={`stat-card stat-card--green${filterWorkflow === 'approved' ? ' stat-card--active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleWorkflowFilter('approved')}>
            <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
            <div className="stat-card-body"><span className="stat-card-value">{fmt(wfSummary.approved)}</span><span className="stat-card-label">Aprovado</span></div>
          </div>
          <div className={`stat-card stat-card--red${filterWorkflow === 'rejected' ? ' stat-card--active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleWorkflowFilter('rejected')}>
            <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></div>
            <div className="stat-card-body"><span className="stat-card-value">{fmt(wfSummary.rejected)}</span><span className="stat-card-label">Rejeitado</span></div>
          </div>
          <div className={`stat-card stat-card--red${filterDue === 'expired' ? ' stat-card--active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleDueFilter('expired')}>
            <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div>
            <div className="stat-card-body"><span className="stat-card-value">{fmt(wfSummary.expired)}</span><span className="stat-card-label">Documentos vencidos</span></div>
          </div>
          <div className={`stat-card stat-card--amber${filterDue === 'expiring' ? ' stat-card--active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleDueFilter('expiring')}>
            <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
            <div className="stat-card-body"><span className="stat-card-value">{fmt(wfSummary.expiring)}</span><span className="stat-card-label">Vencendo em 30 dias</span></div>
          </div>
        </div>
      </div>}

      {/* Toolbar de busca e filtros */}
      <div className="toolbar toolbar--row">
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Buscar por nome, CPF, empresa, documento, contrato ou contratante..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <select className="form-input form-select filter-select" value={filterContractor} onChange={e => setFilterContractor(e.target.value)}>
            <option value="">Todas as contratantes</option>
            {contractorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <div>
          <select className="form-input form-select filter-select" value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
            <option value="">Todas as empresas</option>
            {companyOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <div>
          <select className="form-input form-select filter-select" value={filterSource} onChange={e => setFilterSource(e.target.value as OriginFilter)}>
            <option value="">Todas as origens</option>
            <option value="employee">Funcionários</option>
            <option value="company">Empresas</option>
          </select>
        </div>
        <div>
          <select className="form-input form-select filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Todos os cargos</option>
            {roleOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
      </div>

      {/* Operational table */}
      <div className="table-container table-container--op">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p>Nenhuma pendência encontrada.</p>
            {(search || filterContractor || filterCompany || filterRole || filterWorkflow || filterDue || filterSource) && (
              <button className="btn btn-secondary" onClick={() => {
                setSearch(''); setFilterContractor(''); setFilterCompany(''); setFilterRole(''); setFilterWorkflow(''); setFilterDue(''); setFilterSource('');
              }}>
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <table className="table op-table">
            <thead>
              <tr>
                <th>Origem</th>
                <th>Contrato</th>
                <th>Empresa</th>
                <th>Funcionário</th>
                <th>Documento</th>
                <th>Status</th>
                <th>Vencimento</th>
                <th>Anexo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((item, idx) => {
                const key         = getItemKey(item)
                const isExpanded  = expandedKey === key
                const waPhone     = item.employeePhone ?? item.companyWhatsapp
                const days    = item.daysUntilExpiry
                const rClass  = rowClass(item.status)
                const editPath    = getEditPath(item)

                return (
                  <Fragment key={`frag-${key}-${idx}`}>
                    <tr
                      className={['tr-expand-trigger', rClass, isExpanded ? 'tr--active' : ''].filter(Boolean).join(' ')}
                      onClick={() => toggleExpand(item)}
                      title="Clique para ver histórico"
                    >
                      <td>
                        <span className={`badge ${item.source === 'company' ? 'badge--pending' : 'badge--active'}`}>
                          {item.source === 'company' ? 'Empresa' : 'Funcionário'}
                        </span>
                      </td>
                      <td className={item.contractLabel ? 'td-contract' : 'td-muted'}>
                        {item.contractLabel ?? 'Sem contrato'}
                      </td>
                      <td className="td-muted td-company">{item.companyName}</td>
                      <td>
                        <div className="td-primary">{item.employeeName}</div>
                        {item.roleName && <div className="td-muted">{item.roleName ?? '—'}</div>}
                      </td>
                      <td>{item.documentTypeName}</td>
                      <td>
                        {item.workflowStatus
                          ? <WorkflowStatusBadge status={item.workflowStatus} />
                          : <span className="td-muted">—</span>}
                      </td>
                      <td>
                        {days === null
                          ? <span className="td-muted">—</span>
                          : days < 0
                          ? <span className="days-badge days-badge--expired">{Math.abs(days)}d vencido</span>
                          : <span className={`days-badge${days <= 30 ? ' days-badge--expiring' : ''}`}>{days}d</span>}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {item.externalFileUrl
                          ? (
                            <button
                              className="btn-icon"
                              title="Baixar arquivo"
                              onClick={() => handleOpenFile(item)}
                              disabled={openingKey === key}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              {openingKey === key ? 'Baixando...' : 'Baixar'}
                            </button>
                          )
                          : <span className="td-muted">—</span>}
                      </td>
                      <td className="td-actions" onClick={e => e.stopPropagation()}>
                        <div className="op-actions">
                          {waPhone && (
                            <button
                              className="btn-icon btn-icon--whatsapp"
                              title={`WhatsApp — ${item.employeeName} (W)`}
                              onClick={() => setWhatsappItem(item)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                              </svg>
                              WhatsApp
                            </button>
                          )}
                          {editPath
                            ? (
                              <button
                                className="btn-icon"
                                title="Editar documento (E)"
                                onClick={() => navigate(editPath)}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Editar
                              </button>
                            )
                            : (
                              <button
                                className="btn-icon btn-icon--success"
                                title="Registrar documento"
                                onClick={() => navigate(`/funcionarios/${item.employeeId}/documentos/novo?tipo=${item.documentTypeId}`)}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Registrar
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="tr-expanded">
                        <td colSpan={COL_COUNT}>
                          <div className="expand-panel">
                            <div className="expand-panel-header">
                              <span className="expand-panel-title">
                                {item.employeeName} — {item.documentTypeName}
                              </span>
                              <span className="expand-shortcuts">Esc fechar · W WhatsApp · E editar · V ver docs</span>
                            </div>
                            {expandedLoading ? (
                              <div className="expand-loading">
                                <div className="spinner" style={{ width: 14, height: 14 }} />
                                Carregando histórico...
                              </div>
                            ) : !expandedLogs || expandedLogs.length === 0 ? (
                              <p className="expand-empty">
                                {item.isMissing ? 'Documento ainda não registrado no sistema.' : 'Nenhuma movimentação registrada.'}
                              </p>
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
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
          </div>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(1)}          disabled={page === 1}>«</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(totalPages)}  disabled={page === totalPages}>»</button>
          </div>
          <select
            className="form-input form-select"
            style={{ width: 'auto' }}
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
          >
            {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
        </div>
      )}

      {whatsappItem && (
        <WhatsAppModal
          phone={whatsappItem.employeePhone ?? whatsappItem.companyWhatsapp}
          recipients={{
            person: {
              label: whatsappItem.source === 'company' ? 'Pessoa / responsável' : 'Pessoa / funcionário',
              phone: whatsappItem.employeePhone,
            },
            company: {
              label: 'Empresa',
              phone: whatsappItem.companyWhatsapp,
            },
          }}
          title={`WhatsApp — ${whatsappItem.employeeName}`}
          context={{
            empresa:     whatsappItem.companyName,
            funcionario: whatsappItem.employeeName,
            documento:   whatsappItem.documentTypeName,
            responsavel: whatsappItem.companyName,
            dias:        whatsappItem.daysUntilExpiry !== null
              ? Math.abs(whatsappItem.daysUntilExpiry).toString()
              : undefined,
            status: STATUS_CONFIG[whatsappItem.status]?.label ?? whatsappItem.status,
          }}
          logContext={whatsappItem.docId
            ? {
              entityType: whatsappItem.source === 'company' ? 'company_document' : 'employee_document',
              entityId: whatsappItem.docId,
              employeeId: whatsappItem.source === 'employee' ? whatsappItem.employeeId : undefined,
            }
            : { entityType: 'employee', entityId: whatsappItem.employeeId }
          }
          onClose={() => setWhatsappItem(null)}
        />
      )}
    </div>
  )
}
