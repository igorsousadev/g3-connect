import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompanies } from '../hooks/useCompanies'
import { StatusBadge } from '../components/StatusBadge'
import { FilterCardsToggle } from '../components/FilterCardsToggle'
import { listActiveContractLabelsByCompany, type ActiveContractEntry } from '../services/companyContractorService'

export function CompaniesPage() {
  const navigate = useNavigate()
  const { companies, loading, error } = useCompanies()
  const [activeContracts, setActiveContracts] = useState<Record<string, ActiveContractEntry>>({})
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all')
  const [showFilterCards, setShowFilterCards] = useState(true)
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)

  useEffect(() => {
    listActiveContractLabelsByCompany()
      .then(setActiveContracts)
      .catch(() => {})
  }, [])

  const summary = {
    total:    companies.length,
    active:   companies.filter(c => c.status === 'active').length,
    pending:  companies.filter(c => c.status === 'pending').length,
    inactive: companies.filter(c => c.status === 'inactive').length,
  }

  const filtered = companies.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    const q = search.toLowerCase()
    return (
      c.corporate_name.toLowerCase().includes(q) ||
      (c.trade_name?.toLowerCase().includes(q) ?? false) ||
      c.cnpj.includes(q) ||
      (activeContracts[c.id]?.search.includes(q) ?? false)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p className="page-subtitle">Gerencie as empresas cadastradas</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <FilterCardsToggle visible={showFilterCards} onToggle={() => setShowFilterCards(v => !v)} />
          <button className="btn btn-primary" onClick={() => navigate('/empresas/nova')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova empresa
          </button>
        </div>
      </div>

      {showFilterCards && <div className="cards-grid" style={{ marginBottom: 20 }}>
        {([
          {
            key: 'all' as const, label: 'Todas', value: summary.total, color: 'default',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
          },
          {
            key: 'pending' as const, label: 'Pendentes', value: summary.pending, color: 'amber',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
          },
          {
            key: 'active' as const, label: 'Ativas', value: summary.active, color: 'green',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" /></svg>,
          },
          {
            key: 'inactive' as const, label: 'Inativas', value: summary.inactive, color: 'red',
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

      <div className="toolbar">
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <p>{search ? 'Nenhuma empresa encontrada para essa busca.' : 'Nenhuma empresa cadastrada ainda.'}</p>
            {!search && (
              <button className="btn btn-primary" onClick={() => navigate('/empresas/nova')}>
                Cadastrar primeira empresa
              </button>
            )}
          </div>
        ) : (
          <table className="table table--wide">
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Razão social</th>
                <th>Nome fantasia</th>
                <th>CNPJ</th>
                <th>Responsável</th>
                <th>WhatsApp</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(company => (
                <tr key={company.id}>
                  <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>
                    {activeContracts[company.id]
                      ? activeContracts[company.id].label
                      : <span className="td-muted">Sem contrato</span>}
                  </td>
                  <td className="td-primary">{company.corporate_name}</td>
                  <td className="td-muted">{company.trade_name || '—'}</td>
                  <td className="td-mono">{company.cnpj}</td>
                  <td>{company.responsible_name}</td>
                  <td className="td-muted">{company.whatsapp || '—'}</td>
                  <td><StatusBadge status={company.status} /></td>
                  <td className="td-actions--multi">
                    <button
                      className="btn-icon"
                      title="Ver funcionários"
                      onClick={() => navigate(`/funcionarios?empresa=${company.id}`)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      Funcionários
                    </button>

                    <button
                      className="btn-icon"
                      title="Editar"
                      onClick={() => navigate(`/empresas/${company.id}/editar`)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {filtered.length} empresa{filtered.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
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
