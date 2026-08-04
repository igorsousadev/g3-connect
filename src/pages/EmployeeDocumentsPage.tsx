import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getEmployee } from '../services/employeeService'
import { listRequirementsByRole } from '../services/roleDocumentRequirementService'
import { deleteEmployeeDocument } from '../services/employeeDocumentService'
import { useEmployeeDocuments } from '../hooks/useEmployeeDocuments'
import { useEmployeeActivityLogs } from '../hooks/useActivityLogs'
import { DocStatusBadge, WorkflowStatusBadge } from '../components/DocStatusBadge'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { formatDate, computeDocumentStatus } from '../lib/documentUtils'
import { downloadDocumentFile } from '../lib/documentFileResolver'
import type { Employee } from '../types/employee'
import type { RequirementWithDocumentType } from '../types/roleDocumentRequirement'
import type { DocumentStatus, EmployeeDocument, WorkflowStatus } from '../types/employeeDocument'

const LEGACY_STATUS: Record<string, DocumentStatus> = {
  expiring: 'valid', rejected: 'invalid', submitted: 'pending',
}
const LEGACY_WORKFLOW: Record<string, WorkflowStatus> = {
  submitted: 'analysis', under_review: 'analysis',
  pending_specialist: 'homologation', submitted_to_contractor: 'sent',
}

function mapStatus(s: string): DocumentStatus {
  return (LEGACY_STATUS[s] ?? s) as DocumentStatus
}
function mapWorkflow(w: string | null | undefined): WorkflowStatus | null {
  if (!w) return null
  return (LEGACY_WORKFLOW[w] ?? w) as WorkflowStatus
}

export function EmployeeDocumentsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [requirements, setRequirements] = useState<RequirementWithDocumentType[]>([])
  const [loadingEmployee, setLoadingEmployee] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { documents, loading: loadingDocs, error, setDocuments } = useEmployeeDocuments(id)
  const { logs, loading: loadingLogs } = useEmployeeActivityLogs(id)

  useEffect(() => {
    if (!id) return
    getEmployee(id)
      .then(emp => {
        setEmployee(emp)
        if (emp.role_id) {
          return listRequirementsByRole(emp.role_id)
        }
        return []
      })
      .then(setRequirements)
      .catch(() => {})
      .finally(() => setLoadingEmployee(false))
  }, [id])

  const docMap = Object.fromEntries(documents.map(d => [d.document_type_id, d]))

  async function handleDelete(doc: EmployeeDocument) {
    if (!confirm('Remover este documento?')) return
    setDeleting(doc.id)
    try {
      await deleteEmployeeDocument(doc.id)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
    } catch {
      alert('Erro ao remover documento.')
    } finally {
      setDeleting(null)
    }
  }

  async function handleDownload(fileUrl: string) {
    try {
      await downloadDocumentFile(fileUrl)
    } catch {
      alert('Erro ao baixar arquivo. Tente novamente.')
    }
  }

  if (loadingEmployee) {
    return <div className="page"><div className="table-loading"><div className="spinner" /></div></div>
  }

  if (!employee) {
    return <div className="page"><div className="alert alert-error">Funcionário não encontrado.</div></div>
  }

  const uncoveredDocs = requirements.filter(r => !docMap[r.document_type_id])
  const extraDocs = documents.filter(d => !requirements.some(r => r.document_type_id === d.document_type_id))

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <button className="btn-back" onClick={() => navigate('/funcionarios')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Funcionários
          </button>
          <h1 className="page-title">{employee.full_name}</h1>
          <p className="page-subtitle">Gestão de documentos</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/funcionarios/${id}/documentos/novo`)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar documento
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {requirements.length > 0 && (
        <section className="doc-section">
          <h2 className="doc-section-title">Checklist do cargo</h2>
          {loadingDocs ? (
            <div className="table-loading"><div className="spinner" /></div>
          ) : (
            <div className="table-container">
              <table className="table table--wide">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Validade padrão</th>
                    <th>Emissão</th>
                    <th>Vencimento</th>
                    <th>Situação</th>
                    <th>Etapa</th>
                    <th>Link</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map(req => {
                    const doc = docMap[req.document_type_id]
                    const status = doc
                      ? computeDocumentStatus(doc.expiration_date, mapStatus(doc.status))
                      : 'pending'
                    const wf = mapWorkflow(doc?.workflow_status)
                    return (
                      <tr key={req.document_type_id}>
                        <td className="td-primary td-truncate" title={req.document_types.name}>{req.document_types.name}</td>
                        <td className="td-muted">
                          {req.document_types.default_validity_days
                            ? `${req.document_types.default_validity_days} dias`
                            : '—'}
                        </td>
                        <td>{doc ? formatDate(doc.issue_date) : <span className="td-muted">—</span>}</td>
                        <td>{doc ? formatDate(doc.expiration_date) : <span className="td-muted">—</span>}</td>
                        <td><DocStatusBadge status={status} /></td>
                        <td>
                          {wf
                            ? <WorkflowStatusBadge status={wf} />
                            : <span className="td-muted">—</span>}
                        </td>
                        <td>
                          {doc?.external_file_url
                            ? <button type="button" className="link-external link-button" onClick={() => handleDownload(doc.external_file_url!)}>Baixar arquivo</button>
                            : <span className="td-muted">—</span>}
                        </td>
                        <td className="td-actions">
                          <button
                            className="btn-icon"
                            onClick={() => navigate(
                              doc
                                ? `/funcionarios/${id}/documentos/${doc.id}/editar`
                                : `/funcionarios/${id}/documentos/novo?tipo=${req.document_type_id}`
                            )}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            {doc ? 'Editar' : 'Registrar'}
                          </button>
                          {doc && (
                            <button
                              className="btn-icon btn-icon--danger"
                              disabled={deleting === doc.id}
                              onClick={() => handleDelete(doc)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                              </svg>
                              Remover
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {(extraDocs.length > 0 || requirements.length === 0) && (
        <section className="doc-section">
          <h2 className="doc-section-title">
            {requirements.length === 0 ? 'Documentos registrados' : 'Documentos adicionais'}
          </h2>
          {loadingDocs ? (
            <div className="table-loading"><div className="spinner" /></div>
          ) : extraDocs.length === 0 && requirements.length > 0 ? null : (
            <div className="table-container">
              <table className="table table--wide">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Emissão</th>
                    <th>Vencimento</th>
                    <th>Situação</th>
                    <th>Etapa</th>
                    <th>Link</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(requirements.length === 0 ? documents : extraDocs).map(doc => {
                    const status = computeDocumentStatus(doc.expiration_date, mapStatus(doc.status))
                    const wf = mapWorkflow(doc.workflow_status)
                    return (
                      <tr key={doc.id}>
                        <td className="td-primary td-muted">ID: {doc.document_type_id.slice(0, 8)}</td>
                        <td>{formatDate(doc.issue_date)}</td>
                        <td>{formatDate(doc.expiration_date)}</td>
                        <td><DocStatusBadge status={status} /></td>
                        <td>
                          {wf
                            ? <WorkflowStatusBadge status={wf} />
                            : <span className="td-muted">—</span>}
                        </td>
                        <td>
                          {doc.external_file_url
                            ? <button type="button" className="link-external link-button" onClick={() => handleDownload(doc.external_file_url!)}>Baixar arquivo</button>
                            : <span className="td-muted">—</span>}
                        </td>
                        <td className="td-actions">
                          <button
                            className="btn-icon"
                            onClick={() => navigate(`/funcionarios/${id}/documentos/${doc.id}/editar`)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            className="btn-icon btn-icon--danger"
                            disabled={deleting === doc.id}
                            onClick={() => handleDelete(doc)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                            Remover
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {requirements.length === 0 && !loadingDocs && documents.length === 0 && (
            <div className="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p>Nenhum documento registrado ainda.</p>
              <button className="btn btn-primary" onClick={() => navigate(`/funcionarios/${id}/documentos/novo`)}>
                Registrar primeiro documento
              </button>
            </div>
          )}
        </section>
      )}

      {uncoveredDocs.length > 0 && (
        <div className="alert alert-warning">
          {uncoveredDocs.length} documento{uncoveredDocs.length !== 1 ? 's' : ''} pendente{uncoveredDocs.length !== 1 ? 's' : ''} do checklist do cargo.
        </div>
      )}

      <section className="history-section">
        <div className="history-section-header">
          <h2 className="history-section-title">Histórico operacional</h2>
        </div>
        <div className="form-card">
          <ActivityTimeline
            logs={logs}
            loading={loadingLogs}
            compact
            emptyMessage="Nenhuma atividade registrada para este funcionário."
          />
        </div>
      </section>
    </div>
  )
}
