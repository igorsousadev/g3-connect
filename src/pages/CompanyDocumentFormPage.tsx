import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCompany } from '../services/companyService'
import {
  getCompanyDocument,
  listCompanyDocumentTypes,
  updateCompanyDocument,
  upsertCompanyDocument,
  listCompanyDocumentFiles,
  addCompanyDocumentFile,
} from '../services/companyDocumentService'
import { uploadFileToDropbox } from '../services/dropboxService'
import { buildCompanyDocumentDropboxPath } from '../lib/dropboxPaths'
import { downloadDocumentFile } from '../lib/documentFileResolver'
import { getOriginalFileName } from '../lib/fileNameUtils'
import type { Company } from '../types/company'
import type { DocumentType } from '../types/documentType'
import { type DocumentStatus, type WorkflowStatus } from '../types/employeeDocument'
import type { CompanyDocumentFile } from '../types/companyDocument'
import { DocStatusBadge, WorkflowStatusBadge } from '../components/DocStatusBadge'

const ALLOWED_MIME_TYPES = ['application/pdf']

function isDropboxPath(value: string): boolean {
  return value.startsWith('/')
}

function formatDateTimeBR(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function CompanyDocumentFormPage() {
  const { companyId, documentId } = useParams<{ companyId: string; documentId: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(documentId)

  const [company, setCompany] = useState<Company | null>(null)
  const [docTypes, setDocTypes] = useState<DocumentType[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [saveSuccess,  setSaveSuccess]  = useState<string | null>(null)
  const [saveWarning,  setSaveWarning]  = useState<string | null>(null)

  const [documentTypeId, setDocumentTypeId] = useState('')
  const [status, setStatus] = useState<DocumentStatus>('pending')
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('pending_client')
  const [issueDate, setIssueDate] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [savedIssueDate, setSavedIssueDate] = useState('')
  const [savedExpirationDate, setSavedExpirationDate] = useState('')
  const [externalFileUrl, setExternalFileUrl] = useState('')
  const [dropboxPath, setDropboxPath] = useState('')
  const [notes, setNotes] = useState('')

  const [documentFiles, setDocumentFiles] = useState<CompanyDocumentFile[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [downloadingHistoryId, setDownloadingHistoryId] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) return
    Promise.all([
      getCompany(companyId),
      listCompanyDocumentTypes(),
    ])
      .then(([companyData, types]) => {
        setCompany(companyData)
        setDocTypes(types)

        if (isEditing && documentId) {
          return Promise.all([
            getCompanyDocument(documentId),
            listCompanyDocumentFiles(documentId),
          ]).then(([doc, files]) => {
            setDocumentTypeId(doc.document_type_id)
            setStatus(doc.status)
            setWorkflowStatus(doc.workflow_status)
            setIssueDate(doc.issue_date ?? '')
            setExpirationDate(doc.expiration_date ?? '')
            setSavedIssueDate(doc.issue_date ?? '')
            setSavedExpirationDate(doc.expiration_date ?? '')
            setNotes(doc.notes ?? '')
            setDocumentFiles(files)

            const stored = doc.external_file_url ?? ''
            if (isDropboxPath(stored)) setDropboxPath(stored)
            else setExternalFileUrl(stored)
          })
        }
      })
      .catch(() => setError('Erro ao carregar dados do documento.'))
      .finally(() => setLoading(false))
  }, [companyId, documentId, isEditing])

  async function handleUpload() {
    setUploadError(null)
    setUploadSuccess(false)

    if (!selectedFile)   { setUploadError('Selecione um arquivo primeiro.'); return }
    if (!companyId)      { setUploadError('Empresa não identificada.'); return }
    if (!documentTypeId) { setUploadError('Selecione o tipo de documento antes de enviar.'); return }

    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      setUploadError('Tipo não permitido. Use PDF.')
      return
    }

    setUploading(true)
    try {
      const selectedDocType = docTypes.find(dt => dt.id === documentTypeId)
      const path = buildCompanyDocumentDropboxPath({
        companyId,
        documentTypeSlug: selectedDocType?.name ?? documentTypeId,
        fileName: selectedFile.name,
        issueDate: issueDate || null,
      })

      const result = await uploadFileToDropbox({ file: selectedFile, path })
      setDropboxPath(result.dropbox_path)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      if (isEditing && documentId) {
        await updateCompanyDocument(documentId, { external_file_url: result.dropbox_path })
        const newFile = await addCompanyDocumentFile(documentId, {
          file_url:  result.dropbox_path,
          file_name: selectedFile.name,
          file_path: result.dropbox_path,
        })
        setDocumentFiles(prev => [newFile, ...prev.map(f => ({ ...f, is_current: false }))])
        // Novo arquivo = datas do documento anterior não se aplicam mais
        setIssueDate('')
        setExpirationDate('')
        setSavedIssueDate('')
        setSavedExpirationDate('')
      }

      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 4000)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  async function handleOpenFile() {
    const value = dropboxPath || externalFileUrl
    if (!value) return
    setOpening(true)
    try {
      await downloadDocumentFile(value)
    } catch {
      alert('Erro ao baixar arquivo. Tente novamente.')
    } finally {
      setOpening(false)
    }
  }

  async function handleDownloadHistoryFile(file: CompanyDocumentFile) {
    setDownloadingHistoryId(file.id)
    try {
      const path = file.file_path ?? file.file_url
      await downloadDocumentFile(path)
    } catch {
      alert('Erro ao baixar arquivo. Tente novamente.')
    } finally {
      setDownloadingHistoryId(null)
    }
  }

  async function handleQuickAction(newStatus: DocumentStatus, newWorkflow: WorkflowStatus) {
    if (!isEditing || !documentId) return
    setSaving(true)
    setError(null)
    setSaveSuccess(null)
    setSaveWarning(null)
    try {
      await updateCompanyDocument(documentId, {
        status: newStatus,
        workflow_status: newWorkflow,
        issue_date: issueDate || null,
        expiration_date: expirationDate || null,
        external_file_url: dropboxPath || externalFileUrl.trim() || null,
        notes: notes.trim() || null,
      }, {
        actionType: newStatus === 'valid' ? 'approved' : 'rejected',
        companyId,
        prevWorkflowStatus: workflowStatus,
      })
      setStatus(newStatus)
      setWorkflowStatus(newWorkflow)
      setSavedIssueDate(issueDate)
      setSavedExpirationDate(expirationDate)
      if (newWorkflow === 'rejected') {
        setSaveWarning('Documento invalidado.')
        setTimeout(() => setSaveWarning(null), 5000)
      } else {
        setSaveSuccess('Documento validado com sucesso.')
        setTimeout(() => setSaveSuccess(null), 5000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar documento da empresa.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaveSuccess(null)
    setSaveWarning(null)

    if (!companyId) return
    if (!documentTypeId) {
      setError('Selecione o tipo de documento.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        company_id: companyId,
        document_type_id: documentTypeId,
        status,
        workflow_status: workflowStatus,
        issue_date: issueDate || null,
        expiration_date: expirationDate || null,
        external_file_url: dropboxPath || externalFileUrl.trim() || null,
        notes: notes.trim() || null,
      }

      if (isEditing && documentId) {
        await updateCompanyDocument(documentId, payload)
        setSavedIssueDate(issueDate)
        setSavedExpirationDate(expirationDate)
        setSaveSuccess('Alterações salvas com sucesso.')
        setTimeout(() => setSaveSuccess(null), 5000)
      } else {
        const newDoc = await upsertCompanyDocument(payload)
        if (dropboxPath) {
          addCompanyDocumentFile(newDoc.id, {
            file_url:  dropboxPath,
            file_name: null,
            file_path: dropboxPath,
          }).catch(() => {})
        }
        navigate(`/empresas/${companyId}/documentos/${newDoc.id}/editar`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar documento da empresa.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="page"><div className="table-loading"><div className="spinner" /></div></div>
  }

  const selectedDocTypeName = docTypes.find(dt => dt.id === documentTypeId)?.name ?? ''
  const isRejected           = workflowStatus === 'rejected'
  const hasFile              = Boolean(dropboxPath || externalFileUrl)
  const issueDateLocked      = isEditing && Boolean(savedIssueDate)
  const expirationDateLocked = isEditing && Boolean(savedExpirationDate)
  const blockUpload          = isEditing && hasFile && !isRejected

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(`/empresas/${companyId}/editar`)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {company?.trade_name || company?.corporate_name || 'Empresa'}
        </button>
        <h1 className="page-title">{isEditing ? 'Editar documento da empresa' : 'Adicionar documento da empresa'}</h1>
        {company && <p className="page-subtitle">{company.corporate_name}</p>}
      </div>

      {error       && <div className="alert alert-error">{error}</div>}
      {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}
      {saveWarning && <div className="alert alert-warning">{saveWarning}</div>}

      {isEditing && selectedDocTypeName && (
        <div className="doc-form-hero">
          <div className="doc-form-hero-left">
            <div className="doc-form-hero-title">{selectedDocTypeName}</div>
            <div className="doc-form-hero-sub">{company?.corporate_name}</div>
          </div>
          <div className="doc-form-hero-right">
            <DocStatusBadge status={status} />
            <WorkflowStatusBadge status={workflowStatus} />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="doc-form-two-col">
          <div className="doc-form-section">
            <div className="doc-form-section-header">
              <span className="doc-form-section-num">1</span>
              <span className="doc-form-section-title">Informações do documento</span>
            </div>
            <div className="doc-form-section-body">
              <div className="form-grid">
                <div className="form-group form-group--span2">
                  <label className="form-label">Tipo de documento <span className="form-required">*</span></label>
                  <select
                    className="form-input form-select"
                    value={documentTypeId}
                    onChange={e => setDocumentTypeId(e.target.value)}
                    disabled={isEditing}
                    required
                  >
                    <option value="">Selecione o tipo de documento</option>
                    {docTypes.map(dt => (
                      <option key={dt.id} value={dt.id}>{dt.name}</option>
                    ))}
                  </select>
                  {isEditing && (
                    <span className="form-hint">Tipo de documento bloqueado após o registro.</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Status documental</label>
                  <div style={{ marginTop: 6 }}>
                    <DocStatusBadge status={status} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Etapa operacional</label>
                  <div style={{ marginTop: 6 }}>
                    <WorkflowStatusBadge status={workflowStatus} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Data de emissão</label>
                  <input
                    type="date"
                    className="form-input"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    disabled={issueDateLocked}
                  />
                  {issueDateLocked && (
                    <span className="form-hint">Data já informada e bloqueada para edição.</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Data de vencimento</label>
                  <input
                    type="date"
                    className="form-input"
                    value={expirationDate}
                    onChange={e => setExpirationDate(e.target.value)}
                    disabled={expirationDateLocked}
                  />
                  {expirationDateLocked && (
                    <span className="form-hint">Data já informada e bloqueada para edição.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="doc-form-section">
            <div className="doc-form-section-header">
              <span className="doc-form-section-num">2</span>
              <span className="doc-form-section-title">Arquivo PDF</span>
            </div>
            <div className="doc-form-section-body">
              <div className="doc-dropzone">

                {/* Arquivo atual */}
                {hasFile ? (
                  <div className="doc-dropzone-file">
                    <div className="doc-dropzone-file-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="doc-dropzone-file-info">
                      <span className="doc-dropzone-file-name">Arquivo mais recente</span>
                      <span className="doc-dropzone-file-meta">Clique em "Baixar" para baixar</span>
                    </div>
                    <button type="button" className="btn-icon btn-icon--success" onClick={handleOpenFile} disabled={opening}>
                      {opening ? 'Baixando...' : 'Baixar'}
                    </button>
                  </div>
                ) : (
                  <div className="doc-dropzone-empty">
                    <p className="doc-dropzone-text">Nenhum arquivo enviado ainda</p>
                  </div>
                )}

                {/* Aviso quando arquivo bloqueado (não rejeitado) */}
                {blockUpload && (
                  <div className="doc-file-locked-hint">
                    Documento já anexado. Para enviar um novo arquivo, o documento precisa estar rejeitado.
                  </div>
                )}

                {/* Aviso quando rejeitado com arquivo */}
                {isRejected && hasFile && (
                  <div className="doc-file-rejected-hint">
                    Documento rejeitado: envie um novo arquivo abaixo. O arquivo anterior será mantido no histórico.
                  </div>
                )}

                {/* Área de upload — visível quando não há arquivo, ou quando rejeitado */}
                {!blockUpload && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      style={{ display: 'none' }}
                      onChange={e => {
                        setSelectedFile(e.target.files?.[0] ?? null)
                        setUploadError(null)
                        setUploadSuccess(false)
                      }}
                    />
                    <div className="doc-dropzone-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        Selecionar PDF
                      </button>
                      {selectedFile && (
                        <>
                          <span className="upload-file-label">{selectedFile.name}</span>
                          <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                            {uploading ? 'Enviando...' : 'Anexar PDF'}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {uploadSuccess && <div className="alert alert-success" style={{ marginBottom: 0 }}>Arquivo enviado com sucesso.</div>}
                {uploadError && <div className="alert alert-error" style={{ marginBottom: 0 }}>{uploadError}</div>}

                <span className="form-hint">Formato aceito: PDF.</span>

                {/* Histórico de arquivos */}
                {isEditing && documentFiles.length > 0 && (
                  <div className="doc-file-history">
                    <div className="doc-file-history-title">Histórico de anexos</div>
                    <div className="doc-file-history-list">
                      {documentFiles.map(file => {
                        const path = file.file_path ?? file.file_url
                        const displayName = getOriginalFileName(file.file_name ?? path)
                        return (
                          <div key={file.id} className="doc-file-history-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span className="doc-file-history-name" title={displayName}>{displayName}</span>
                            <span className="doc-file-history-date">{formatDateTimeBR(file.uploaded_at)}</span>
                            {file.is_current && (
                              <span className="doc-file-history-badge">atual</span>
                            )}
                            <button
                              type="button"
                              className="btn-icon btn-icon--ghost"
                              onClick={() => handleDownloadHistoryFile(file)}
                              disabled={downloadingHistoryId === file.id}
                            >
                              {downloadingHistoryId === file.id ? '...' : 'Baixar'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="doc-form-section" style={{ marginTop: 16 }}>
          <div className="doc-form-section-header">
            <span className="doc-form-section-num">3</span>
            <span className="doc-form-section-title">Observações internas</span>
          </div>
          <div className="doc-form-section-body">
            <textarea className="form-input form-textarea" rows={4} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="form-actions form-actions--row">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/empresas/${companyId}/editar`)}>Cancelar</button>
          {isEditing && (
            <>
              <button
                type="button"
                className="btn btn-danger"
                disabled={saving}
                onClick={() => handleQuickAction('invalid', 'rejected')}
              >
                Invalidar
              </button>
              <button
                type="button"
                className="btn btn-success"
                disabled={saving}
                onClick={() => handleQuickAction('valid', 'homologation')}
              >
                Validar
              </button>
            </>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Adicionar documento'}
          </button>
        </div>
      </form>
    </div>
  )
}
