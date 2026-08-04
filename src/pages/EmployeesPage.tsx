import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEmployees } from '../hooks/useEmployees'
import { listCompanies } from '../services/companyService'
import { listActiveRoles } from '../services/roleService'
import { getRequirementCountsByRole } from '../services/roleDocumentRequirementService'
import { StatusBadge } from '../components/StatusBadge'
import { FilterCardsToggle } from '../components/FilterCardsToggle'
import type { Company } from '../types/company'
import type { Role } from '../types/role'

export function EmployeesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [companies, setCompanies] = useState<Company[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [reqCounts, setReqCounts] = useState<Record<string, number>>({})
  const [selectedCompany, setSelectedCompany] = useState(searchParams.get('empresa') ?? '')
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all')
  const [showFilterCards, setShowFilterCards] = useState(true)
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)

  const { employees, loading, error } = useEmployees(selectedCompany || undefined)

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => {})
    listActiveRoles().then(setRoles).catch(() => {})
    getRequirementCountsByRole().then(setReqCounts).catch(() => {})
  }, [])

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c.corporate_name]))
  const roleMap    = Object.fromEntries(roles.map(r => [r.id, r.name]))

  const summary = {
    total:    employees.length,
    active:   employees.filter(e => e.status === 'active').length,
    pending:  employees.filter(e => e.status === 'pending').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
  }

  const filtered = employees.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    const q = search.toLowerCase()
    const roleName = (e.role_id ? (roleMap[e.role_id] ?? '') : (e.role ?? '')).toLowerCase()
    return (
      e.full_name.toLowerCase().includes(q) ||
      e.cpf.includes(q) ||
      roleName.includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  const selectedCompanyName = selectedCompany ? companyMap[selectedCompany] : null

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Funcionários</h1>
          <p className="page-subtitle">
            {selectedCompanyName
              ? `Funcionários de ${selectedCompanyName}`
              : 'Gerencie os funcionários cadastrados'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <FilterCardsToggle visible={showFilterCards} onToggle={() => setShowFilterCards(v => !v)} />
          <button
          className="btn btn-primary"
          onClick={() => navigate(selectedCompany ? `/funcionarios/novo?empresa=${selectedCompany}` : '/funcionarios/novo')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo funcionário
          </button>
        </div>
      </div>

      {showFilterCards && <div className="cards-grid" style={{ marginBottom: 20 }}>
        {([
          {
            key: 'all' as const, label: 'Todos', value: summary.total, color: 'default',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
          },
          {
            key: 'pending' as const, label: 'Pendentes', value: summary.pending, color: 'amber',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
          },
          {
            key: 'active' as const, label: 'Ativos', value: summary.active, color: 'green',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" /></svg>,
          },
          {
            key: 'inactive' as const, label: 'Inativos', value: summary.inactive, color: 'red',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" /></svg>,
          },
        ] as const).map(card => (
          <div
            key={card.key}
            className={`stat-card stat-card--${card.color}${statusFilter === card.key ? ' stat-card--active' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => { setStatusFilter(card.key); setPage(1) }}
          >
            <div className="stat-card-icon">{card.icon}</div>
            <div className="stat-card-body">
              <span className="stat-card-value">{loading ? '...' : card.value}</span>
              <span className="stat-card-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>}

      <div className="toolbar toolbar--row">
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Buscar por nome, CPF ou cargo..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div>
          <select
            className="form-input form-select filter-select"
            value={selectedCompany}
            onChange={e => { setSelectedCompany(e.target.value); setPage(1) }}
          >
            <option value="">Todas as empresas</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.corporate_name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>{search ? 'Nenhum funcionário encontrado para essa busca.' : 'Nenhum funcionário cadastrado ainda.'}</p>
            {!search && (
              <button className="btn btn-primary" onClick={() => navigate('/funcionarios/novo')}>
                Cadastrar primeiro funcionário
              </button>
            )}
          </div>
        ) : (
          <table className="table table--wide">
            <thead>
              <tr>
                <th>Nome completo</th>
                <th>CPF</th>
                <th>Cargo / Função</th>
                <th>Docs exigidos</th>
                <th>Empresa</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(employee => {
                const roleName = employee.role_id
                  ? (roleMap[employee.role_id] ?? '—')
                  : (employee.role ?? '—')
                const docsCount = employee.role_id
                  ? (reqCounts[employee.role_id] ?? 0)
                  : null
                return (
                  <tr key={employee.id}>
                    <td className="td-primary">{employee.full_name}</td>
                    <td className="td-mono">{employee.cpf}</td>
                    <td>{roleName}</td>
                    <td>
                      {docsCount === null
                        ? <span className="td-muted">—</span>
                        : <span className="docs-count">{docsCount} doc{docsCount !== 1 ? 's' : ''}</span>}
                    </td>
                    <td className="td-muted td-truncate">{companyMap[employee.company_id] ?? '—'}</td>
                    <td><StatusBadge status={employee.status} /></td>
                    <td className="td-actions">
                      <button
                        className="btn-icon"
                        onClick={() => navigate(`/funcionarios/${employee.id}/editar`)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {filtered.length} funcionário{filtered.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
          </div>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(1)}          disabled={page === 1}>«</button>
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
            {[5,10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
        </div>
      )}
    </div>
  )
}
