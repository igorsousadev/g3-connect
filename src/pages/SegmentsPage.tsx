import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSegments } from '../hooks/useSegments'
import { updateSegment } from '../services/segmentService'
import { StatusBadge } from '../components/StatusBadge'
import { FilterCardsToggle } from '../components/FilterCardsToggle'
import type { SegmentStatus } from '../types/segment'

export function SegmentsPage() {
  const navigate = useNavigate()
  const { segments, loading, error, reload } = useSegments()
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState<'all' | SegmentStatus>('all')
  const [showFilterCards, setShowFilterCards] = useState(true)
  const [page,            setPage]            = useState(1)
  const [pageSize,        setPageSize]        = useState(10)
  const [toggling,        setToggling]        = useState<string | null>(null)

  const summary = {
    total:    segments.length,
    active:   segments.filter(s => s.status === 'active').length,
    inactive: segments.filter(s => s.status === 'inactive').length,
  }

  const filtered = segments.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  async function handleToggleStatus(id: string, current: SegmentStatus) {
    const next: SegmentStatus = current === 'active' ? 'inactive' : 'active'
    setToggling(id)
    try {
      await updateSegment(id, { status: next })
      reload()
    } catch {
      alert('Erro ao alterar status do segmento.')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Segmentos</h1>
          <p className="page-subtitle">Gerencie os segmentos de atuação das empresas prestadoras</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <FilterCardsToggle visible={showFilterCards} onToggle={() => setShowFilterCards(v => !v)} />
          <button className="btn btn-primary" onClick={() => navigate('/segmentos/novo')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo segmento
          </button>
        </div>
      </div>

      {showFilterCards && (
        <div className="cards-grid" style={{ marginBottom: 20 }}>
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
        </div>
      )}

      <div className="toolbar">
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Buscar por nome ou descrição..."
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
              <path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" /><path d="M22 4v16" />
            </svg>
            <p>{search || statusFilter !== 'all' ? 'Nenhum segmento encontrado para essa busca.' : 'Nenhum segmento cadastrado ainda.'}</p>
            {!search && statusFilter === 'all' && (
              <button className="btn btn-primary" onClick={() => navigate('/segmentos/novo')}>
                Cadastrar primeiro segmento
              </button>
            )}
          </div>
        ) : (
          <table className="table table--wide">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(segment => (
                <tr key={segment.id}>
                  <td className="td-primary">{segment.name}</td>
                  <td className="td-muted">{segment.description || '—'}</td>
                  <td><StatusBadge status={segment.status} /></td>
                  <td className="td-actions--multi">
                    <button
                      className="btn-icon"
                      title="Editar"
                      onClick={() => navigate(`/segmentos/${segment.id}/editar`)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      className={`btn-icon${segment.status === 'active' ? ' btn-icon--danger' : ' btn-icon--success'}`}
                      title={segment.status === 'active' ? 'Inativar' : 'Ativar'}
                      disabled={toggling === segment.id}
                      onClick={() => handleToggleStatus(segment.id, segment.status)}
                    >
                      {segment.status === 'active' ? (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
                          </svg>
                          Inativar
                        </>
                      ) : (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
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

      {!loading && filtered.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {filtered.length} segmento{filtered.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
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
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
        </div>
      )}
    </div>
  )
}
