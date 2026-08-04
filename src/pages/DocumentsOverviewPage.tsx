import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listDocumentsForOverview } from '../services/employeeDocumentService'
import { listCompanies } from '../services/companyService'
import { DocStatusBadge } from '../components/DocStatusBadge'
import { formatDate, computeDocumentStatus, getDaysUntilExpiry } from '../lib/documentUtils'
import { downloadDocumentFile } from '../lib/documentFileResolver'
import type { DocumentOverviewItem } from '../services/employeeDocumentService'
import type { Company } from '../types/company'
import type { DocumentStatus } from '../types/employeeDocument'

const TABS = [
  { key: 'expiring', label: 'Vencendo' },
  { key: 'expired',  label: 'Vencidos' },
  { key: 'pending',  label: 'Pendentes' },
  { key: 'all',      label: 'Todos' },
]

export function DocumentsOverviewPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab       = searchParams.get('aba')     ?? 'expiring'
  const selectedCompany = searchParams.get('empresa') ?? ''

  const [companies, setCompanies] = useState<Company[]>([])
  const [documents, setDocuments] = useState<DocumentOverviewItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [page,      setPage]      = useState(1)
  const [pageSize,  setPageSize]  = useState(25)

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => {})
  }, [])

  useEffect(() => {
    setPage(1)
    setLoading(true)
    setError(null)
    listDocumentsForOverview(activeTab, selectedCompany || undefined)
      .then(setDocuments)
      .catch(() => setError('Erro ao carregar documentos.'))
      .finally(() => setLoading(false))
  }, [activeTab, selectedCompany])

  function setTab(tab: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('aba', tab)
      return next
    })
  }

  function setCompany(companyId: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (companyId) next.set('empresa', companyId)
      else next.delete('empresa')
      return next
    })
  }

  async function handleDownload(fileUrl: string) {
    try {
      await downloadDocumentFile(fileUrl)
    } catch {
      alert('Erro ao baixar arquivo. Tente novamente.')
    }
  }

  const totalPages = Math.max(1, Math.ceil(documents.length / pageSize))
  const paginated  = documents.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">Visão operacional de documentos e vencimentos</p>
        </div>
      </div>

      <div className="toolbar toolbar--row">
        <div className="tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`tab-btn${activeTab === tab.key ? ' tab-btn--active' : ''}`}
              onClick={() => setTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          className="form-input form-select filter-select"
          value={selectedCompany}
          onChange={e => setCompany(e.target.value)}
        >
          <option value="">Todas as empresas</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.corporate_name}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>Nenhum documento encontrado para este filtro.</p>
          </div>
        ) : (
          <table className="table table--wide">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Documento</th>
                <th>Vencimento</th>
                <th>Prazo</th>
                <th>Status</th>
                <th>Link</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(doc => {
                const status = computeDocumentStatus(doc.expiration_date, doc.status as DocumentStatus)
                const days   = getDaysUntilExpiry(doc.expiration_date)
                return (
                  <tr key={doc.id}>
                    <td className="td-primary">{doc.employees?.full_name ?? '—'}</td>
                    <td className="td-truncate" title={doc.document_types?.name ?? ''}>{doc.document_types?.name ?? '—'}</td>
                    <td>{formatDate(doc.expiration_date)}</td>
                    <td>
                      {days === null
                        ? <span className="td-muted">—</span>
                        : days < 0
                        ? <span className="days-badge days-badge--expired">{Math.abs(days)}d vencido</span>
                        : <span className={`days-badge${days <= 30 ? ' days-badge--expiring' : ''}`}>{days}d restantes</span>}
                    </td>
                    <td><DocStatusBadge status={status} /></td>
                    <td>
                      {doc.external_file_url
                        ? <button type="button" className="link-external link-button" onClick={() => handleDownload(doc.external_file_url!)}>Baixar arquivo</button>
                        : <span className="td-muted">—</span>}
                    </td>
                    <td className="td-actions">
                      <button
                        className="btn-icon"
                        onClick={() => navigate(`/funcionarios/${doc.employee_id}/documentos/${doc.id}/editar`)}
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

      {!loading && documents.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {documents.length} documento{documents.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
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
