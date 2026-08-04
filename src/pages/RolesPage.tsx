import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoles } from '../hooks/useRoles'
import { updateRole } from '../services/roleService'
import { FilterCardsToggle } from '../components/FilterCardsToggle'

export function RolesPage() {
  const navigate = useNavigate()
  const { roles, loading, error, reload } = useRoles()
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showFilterCards, setShowFilterCards] = useState(true)
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)

  async function handleToggle(id: string, current: boolean) {
    try {
      await updateRole(id, { is_active: !current })
      reload()
    } catch {
      // erro silencioso — o sistema continua funcionando
    }
  }

  const summary = {
    total:    roles.length,
    active:   roles.filter(r =>  r.is_active).length,
    inactive: roles.filter(r => !r.is_active).length,
  }

  const filtered = statusFilter === 'all'
    ? roles
    : roles.filter(r => statusFilter === 'active' ? r.is_active : !r.is_active)

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Cargos / Funções</h1>
          <p className="page-subtitle">Gerencie os cargos disponíveis para funcionários</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <FilterCardsToggle visible={showFilterCards} onToggle={() => setShowFilterCards(v => !v)} />
          <button className="btn btn-primary" onClick={() => navigate('/cargos/novo')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo cargo
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showFilterCards && <div className="cards-grid" style={{ marginBottom: 20 }}>
        {([
          {
            key: 'all' as const, label: 'Todos', value: summary.total, color: 'default',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
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

      <div className="table-container">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            <p>{roles.length === 0 ? 'Nenhum cargo cadastrado ainda.' : 'Nenhum cargo encontrado para o filtro selecionado.'}</p>
            {roles.length === 0 && (
              <button className="btn btn-primary" onClick={() => navigate('/cargos/novo')}>Cadastrar primeiro cargo</button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(role => (
                <tr key={role.id}>
                  <td className="td-primary">{role.name}</td>
                  <td className="td-muted">{role.description || '—'}</td>
                  <td>
                    <span className={`badge ${role.is_active ? 'badge--active' : 'badge--inactive'}`}>
                      {role.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="td-actions--multi">
                    <button className="btn-icon" onClick={() => navigate(`/cargos/${role.id}/editar`)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      className={`btn-icon ${role.is_active ? 'btn-icon--danger' : 'btn-icon--success'}`}
                      onClick={() => handleToggle(role.id, role.is_active)}
                    >
                      {role.is_active ? (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
                          </svg>
                          Desativar
                        </>
                      ) : (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                          </svg>
                          Ativar
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && roles.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {roles.length} cargo{roles.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
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
