import { useState } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import { useClientEmployeeDocs } from '../../hooks/useClientPortal'
import { DocStatusBadge } from '../../components/DocStatusBadge'
import { ClientDocumentUploadButton } from '../../components/client/ClientDocumentUploadButton'
import { formatDate, canClientUploadDoc, clientUploadBlockReason } from '../../lib/documentUtils'
import type { DocumentStatus } from '../../types/employeeDocument'

export function ClientEmployeeDocsPage() {
  const { id = '' } = useParams()
  const { data, loading, error, reload } = useClientEmployeeDocs(id)

  const [successBanner, setSuccessBanner] = useState(false)

  function handleUploadSuccess() {
    setSuccessBanner(false)
    setSuccessBanner(true)
    reload()
  }

  if (loading) return <div className="client-page"><div className="spinner" /></div>

  if (error || !data) {
    return (
      <div className="client-page">
        <NavLink to="/portal/funcionarios" className="client-back-link">← Funcionários</NavLink>
        <p className="error-message">{error ?? 'Funcionário não encontrado.'}</p>
      </div>
    )
  }

  const { employee, docs } = data

  return (
    <div className="client-page">
      <div className="client-page-header">
        <NavLink to="/portal/funcionarios" className="client-back-link">← Funcionários</NavLink>
        <h1 className="client-page-title">{employee.full_name}</h1>
        <p className="client-page-subtitle">{employee.role ?? 'Cargo não informado'}</p>
      </div>

      {successBanner && (
        <div className="client-upload-banner client-upload-banner--success">
          Documento enviado com sucesso. Ele está em análise pela equipe.
        </div>
      )}

      {docs.length === 0 ? (
        <div className="client-empty-page">Nenhum documento cadastrado para este funcionário.</div>
      ) : (
        <div className="client-docs-list">
          {docs.map((doc, i) => {
            const canUpload   = canClientUploadDoc(doc.id, doc.status, doc.workflowStatus, doc.daysUntilExpiry)
            const blockReason = canUpload ? null : clientUploadBlockReason(doc.id, doc.workflowStatus)
            const hasFile     = !!doc.externalFileUrl

            return (
              <div key={doc.id ?? i} className="client-doc-card">
                <div className="client-doc-card-header">
                  <span className="client-doc-card-name">{doc.documentTypeName}</span>
                  <DocStatusBadge status={doc.status as DocumentStatus} />
                </div>
                <div className="client-doc-card-details">
                  {doc.issueDate && (
                    <div className="client-doc-detail">
                      <span className="client-doc-detail-label">Emissão</span>
                      <span>{formatDate(doc.issueDate)}</span>
                    </div>
                  )}
                  {doc.expirationDate && (
                    <div className="client-doc-detail">
                      <span className="client-doc-detail-label">Validade</span>
                      <span className={doc.daysUntilExpiry !== null && doc.daysUntilExpiry <= 30 ? 'client-doc-expiring' : ''}>
                        {formatDate(doc.expirationDate)}
                        {doc.daysUntilExpiry !== null && doc.daysUntilExpiry >= 0 && doc.daysUntilExpiry <= 30 && (
                          <span className="client-doc-days"> ({doc.daysUntilExpiry} dia{doc.daysUntilExpiry !== 1 ? 's' : ''})</span>
                        )}
                        {doc.daysUntilExpiry !== null && doc.daysUntilExpiry < 0 && (
                          <span className="client-doc-days client-doc-days--expired">
                            {' '}(vencido há {Math.abs(doc.daysUntilExpiry)} dia{Math.abs(doc.daysUntilExpiry) !== 1 ? 's' : ''})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {doc.notes && (
                    <div className="client-doc-detail client-doc-detail--notes">
                      <span className="client-doc-detail-label">Observações</span>
                      <span>{doc.notes}</span>
                    </div>
                  )}
                </div>

                {canUpload && (
                  <div className="client-doc-upload-row">
                    <ClientDocumentUploadButton
                      employeeId={id}
                      documentId={doc.id}
                      documentName={doc.documentTypeName}
                      workflowStatus={doc.workflowStatus}
                      issueDate={doc.issueDate}
                      hasFile={hasFile}
                      label="Anexar documento"
                      onSuccess={handleUploadSuccess}
                    />
                  </div>
                )}
                {blockReason && (
                  <p className="client-doc-blocked-info">{blockReason}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
