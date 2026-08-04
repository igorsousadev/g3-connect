import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMessageTemplates } from '../hooks/useMessageTemplates'
import { toggleTemplateActive, deleteMessageTemplate } from '../services/messageTemplateService'
import { CATEGORY_LABELS } from '../lib/templateUtils'
import { FilterCardsToggle } from '../components/FilterCardsToggle'

export function MessageTemplatesPage() {
  const navigate = useNavigate()
  const { templates, loading, error, reload } = useMessageTemplates()
  const [toggling,     setToggling]     = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showFilterCards, setShowFilterCards] = useState(true)
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)

  async function handleToggle(id: string, current: boolean) {
    setToggling(id)
    try {
      await toggleTemplateActive(id, !current)
      reload()
    } catch {
      alert('Erro ao alterar status do template.')
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover template "${name}"?`)) return
    try {
      await deleteMessageTemplate(id)
      reload()
    } catch {
      alert('Erro ao remover template.')
    }
  }

  const summary = {
    total:    templates.length,
    active:   templates.filter(t =>  t.is_active).length,
    inactive: templates.filter(t => !t.is_active).length,
  }

  const filtered = statusFilter === 'all'
    ? templates
    : templates.filter(t => statusFilter === 'active' ? t.is_active : !t.is_active)

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Templates WhatsApp</h1>
          <p className="page-subtitle">Gerencie os templates de mensagem</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <FilterCardsToggle visible={showFilterCards} onToggle={() => setShowFilterCards(v => !v)} />
          <button className="btn btn-primary" onClick={() => navigate('/templates-whatsapp/novo')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo template
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
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>{templates.length === 0 ? 'Nenhum template cadastrado ainda.' : 'Nenhum template encontrado para o filtro selecionado.'}</p>
            {templates.length === 0 && (
              <button className="btn btn-primary" onClick={() => navigate('/templates-whatsapp/novo')}>
                Criar primeiro template
              </button>
            )}
          </div>
        ) : (
          <table className="table table--wide">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Conteúdo</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(tpl => (
                <tr key={tpl.id}>
                  <td className="td-primary">{tpl.name}</td>
                  <td className="td-muted">{CATEGORY_LABELS[tpl.category] ?? tpl.category}</td>
                  <td>
                    <span className={`badge ${tpl.is_active ? 'badge--active' : 'badge--inactive'}`}>
                      {tpl.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <span className="tpl-content-preview" title={tpl.content}>
                      {tpl.content.length > 80 ? `${tpl.content.substring(0, 80)}…` : tpl.content}
                    </span>
                  </td>
                  <td>
                    <div className="td-actions--multi">
                      <button
                        className="btn-icon"
                        onClick={() => navigate(`/templates-whatsapp/${tpl.id}/editar`)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleToggle(tpl.id, tpl.is_active)}
                        disabled={toggling === tpl.id}
                      >
                        {tpl.is_active ? (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                            Desativar
                          </>
                        ) : (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Ativar
                          </>
                        )}
                      </button>
                      <button
                        className="btn-icon btn-icon--danger"
                        onClick={() => handleDelete(tpl.id, tpl.name)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                        Remover
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
            {filtered.length} template{filtered.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
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
