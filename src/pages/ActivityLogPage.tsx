import { useMemo, useState } from 'react'
import { useActivityLogs } from '../hooks/useActivityLogs'
import { ActivityTimeline } from '../components/ActivityTimeline'

const ENTITY_OPTIONS = [
  { value: 'company',           label: 'Empresas'          },
  { value: 'employee',          label: 'Funcionários'      },
  { value: 'employee_document', label: 'Documentos'        },
  { value: 'checklist',         label: 'Checklist'         },
  { value: 'role',              label: 'Cargos'            },
  { value: 'user_profile',      label: 'Usuários'          },
  { value: 'system_profile',    label: 'Perfis do sistema' },
]

const ACTION_OPTIONS = [
  { value: 'created',        label: 'Criados'         },
  { value: 'updated',        label: 'Atualizados'     },
  { value: 'approved',       label: 'Aprovados'       },
  { value: 'rejected',       label: 'Rejeitados'      },
  { value: 'status_changed', label: 'Status alterado' },
  { value: 'note_added',     label: 'Observações'     },
  { value: 'deleted',        label: 'Removidos'       },
]

export function ActivityLogPage() {
  const [entityType, setEntityType] = useState('')
  const [actionType, setActionType] = useState('')
  const [search, setSearch]         = useState('')
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { logs, loading, error, refresh } = useActivityLogs({
    entityType: entityType || undefined,
    actionType: actionType || undefined,
    limit: 200,
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(log => log.description.toLowerCase().includes(q))
  }, [logs, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Histórico Operacional</h1>
          <p className="page-subtitle">Timeline de ações realizadas no sistema</p>
        </div>
        <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Atualizar
        </button>
      </div>

      <div className="toolbar toolbar--row">
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Buscar na descrição..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div>
          <select
            className="form-input form-select filter-select"
            value={entityType}
            onChange={e => { setEntityType(e.target.value); setPage(1) }}
          >
            <option value="">Todas as entidades</option>
            {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <select
            className="form-input form-select filter-select"
            value={actionType}
            onChange={e => { setActionType(e.target.value); setPage(1) }}
          >
            <option value="">Todas as ações</option>
            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-card">
        <ActivityTimeline
          logs={paginated}
          loading={loading}
          emptyMessage="Nenhuma atividade registrada. As ações realizadas no sistema aparecerão aqui."
        />
      </div>

      {!loading && filtered.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
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
            {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
        </div>
      )}
    </div>
  )
}
