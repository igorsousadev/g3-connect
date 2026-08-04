import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocumentTypes } from '../hooks/useDocumentTypes'
import { updateDocumentType } from '../services/documentTypeService'
import { DOCUMENT_CATEGORIES } from '../types/documentType'
import { FilterCardsToggle } from '../components/FilterCardsToggle'

type SummaryFilter = 'total' | 'role' | 'company' | 'active' | 'inactive'

export function DocumentTypesPage() {
  const navigate = useNavigate()
  const { documentTypes, loading, error, reload } = useDocumentTypes()
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('total')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showFilterCards, setShowFilterCards] = useState(true)
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  async function handleToggle(id: string, current: boolean) {
    try {
      await updateDocumentType(id, { is_active: !current })
      reload()
    } catch {
      // continua funcionando
    }
  }

  function handleSummaryFilter(value: SummaryFilter) {
    setSummaryFilter(value)
    setPage(1)
  }

  const summary = {
    total:    documentTypes.length,
    role:     documentTypes.filter(dt => !dt.is_company_required && dt.is_required).length,
    company:  documentTypes.filter(dt => dt.is_company_required).length,
    active:   documentTypes.filter(dt => dt.is_active).length,
    inactive: documentTypes.filter(dt => !dt.is_active).length,
  }

  const summaryCards = [
    {
      key: 'total' as const,
      label: 'Total',
      value: summary.total,
      color: 'default',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
    },
    {
      key: 'role' as const,
      label: 'Obrigatórios para cargos',
      value: summary.role,
      color: 'blue',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
    },
    {
      key: 'company' as const,
      label: 'Obrigatórios para empresa',
      value: summary.company,
      color: 'teal',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    },
    {
      key: 'active' as const,
      label: 'Ativos',
      value: summary.active,
      color: 'green',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    },
    {
      key: 'inactive' as const,
      label: 'Inativos',
      value: summary.inactive,
      color: 'red',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" /></svg>,
    },
  ]

  const normalizedSearch = search.trim().toLowerCase()
  const filtered = documentTypes
    .filter(dt => {
      if (summaryFilter === 'role' && (dt.is_company_required || !dt.is_required)) return false
      if (summaryFilter === 'company' && !dt.is_company_required) return false
      if (summaryFilter === 'active' && !dt.is_active) return false
      if (summaryFilter === 'inactive' && dt.is_active) return false
      return true
    })
    .filter(dt => !categoryFilter || dt.category === categoryFilter)
    .filter(dt => {
      if (!normalizedSearch) return true
      const haystack = [dt.name, dt.description ?? ''].join(' ').toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Tipos de Documentos</h1>
          <p className="page-subtitle">Gerencie os tipos de documentos do sistema</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <FilterCardsToggle visible={showFilterCards} onToggle={() => setShowFilterCards(v => !v)} />
          <button className="btn btn-primary" onClick={() => navigate('/cadastro-documentos/novo')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo tipo
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showFilterCards && <div className="cards-grid" style={{ marginBottom: 20 }}>
        {summaryCards.map(card => (
          <div
            key={card.key}
            className={`stat-card stat-card--${card.color}${summaryFilter === card.key ? ' stat-card--active' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => handleSummaryFilter(card.key)}
          >
            <div className="stat-card-icon">{card.icon}</div>
            <div className="stat-card-body">
              <span className="stat-card-value">{loading ? '...' : card.value}</span>
              <span className="stat-card-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>}

      <div className="toolbar toolbar--row" style={{ marginBottom: 12 }}>
        <div className="search-wrapper">
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="form-input search-input"
            placeholder="Buscar por nome ou descrição"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div>
          <select
            className="form-input form-select filter-select"
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
          >
            <option value="">Todas as categorias</option>
            {DOCUMENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>Nenhum tipo de documento cadastrado ainda.</p>
            <button className="btn btn-primary" onClick={() => navigate('/cadastro-documentos/novo')}>Cadastrar primeiro tipo</button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Validade padrão</th>
                <th>Obrigatório para empresa</th>
                <th>Obrigatório para cargos</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(dt => (
                <tr key={dt.id}>
                  <td>
                    <div className="td-primary">{dt.name}</div>
                    {dt.description && <div className="td-muted" style={{ fontSize: 12, marginTop: 2 }}>{dt.description}</div>}
                  </td>
                  <td className="td-muted">{dt.category ?? '—'}</td>
                  <td className="td-muted">
                    {dt.default_validity_days ? `${dt.default_validity_days} dias` : '—'}
                  </td>
                  <td>
                    {dt.is_company_required
                      ? <span className="badge badge--active">Sim</span>
                      : <span className="badge badge--inactive">Não</span>}
                  </td>
                  <td>
                    {dt.is_required
                      ? <span className="badge badge--active">Sim</span>
                      : <span className="badge badge--inactive">Não</span>}
                  </td>
                  <td>
                    <span className={`badge ${dt.is_active ? 'badge--active' : 'badge--inactive'}`}>
                      {dt.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="td-actions">
                    <div className="td-actions--multi">
                      <button className="btn-icon" onClick={() => navigate(`/cadastro-documentos/${dt.id}/editar`)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        className={`btn-icon ${dt.is_active ? 'btn-icon--danger' : 'btn-icon--success'}`}
                        onClick={() => handleToggle(dt.id, dt.is_active)}
                      >
                        {dt.is_active ? (
                          <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" /></svg>Desativar</>
                        ) : (
                          <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>Ativar</>
                        )}
                      </button>
                    </div>
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
            {filtered.length} tipo{filtered.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
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
