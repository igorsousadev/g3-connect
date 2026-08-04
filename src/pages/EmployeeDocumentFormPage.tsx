import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getEmployee } from '../services/employeeService'
import { listActiveDocumentTypes } from '../services/documentTypeService'
import {
  getEmployeeDocument,
  upsertEmployeeDocument,
  updateEmployeeDocument,
  listDocumentFiles,
  addDocumentFile,
} from '../services/employeeDocumentService'
import { uploadFileToDropbox, downloadFileFromDropboxWithOriginalName } from '../services/dropboxService'
import { buildEmployeeDocumentDropboxPath } from '../lib/dropboxPaths'
import { getOriginalFileName } from '../lib/fileNameUtils'
import { logActivity } from '../services/activityLogService'
import type { Employee } from '../types/employee'
import type { DocumentType } from '../types/documentType'
import type { DocumentStatus, WorkflowStatus, EmployeeDocumentInsert, EmployeeDocumentFile } from '../types/employeeDocument'
import { DocStatusBadge, WorkflowStatusBadge } from '../components/DocStatusBadge'

const LEGACY_STATUS_MAP: Record<string, DocumentStatus> = {
  expiring:  'valid',
  rejected:  'invalid',
  submitted: 'pending',
}

const LEGACY_WORKFLOW_MAP: Record<string, WorkflowStatus> = {
  submitted:               'analysis',
  under_review:            'analysis',
  pending_specialist:      'homologation',
  submitted_to_contractor: 'sent',
}

const WF_STEPS: { value: WorkflowStatus; short: string }[] = [
  { value: 'pending_client', short: 'Ag. cliente' },
  { value: 'analysis',       short: 'Análise'     },
  { value: 'homologation',   short: 'Homologação' },
  // [TEMP: etapa "Enviado" desativada — restaurar { value: 'sent', short: 'Enviado' } aqui]
  { value: 'approved',       short: 'Aprovado'    },
]

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

function isDropboxPath(value: string): boolean {
  return value.startsWith('/')
}

function formatDateBR(iso: string): string {
  const p = iso.split('-')
  return `${p[2]}/${p[1]}/${p[0]}`
}

function formatDateTimeBR(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function EmployeeDocumentFormPage() {
  const { id, docId } = useParams<{ id: string; docId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEditing = Boolean(docId)
  const presetTypeId = searchParams.get('tipo') ?? ''

  const [employee,       setEmployee]       = useState<Employee | null>(null)
  const [docTypes,       setDocTypes]       = useState<DocumentType[]>([])
  const [loading,        setLoading]        = useState(true)
  const [saving,       setSaving]      = useState(false)
  const [error,        setError]       = useState<string | null>(null)
  const [saveSuccess,  setSaveSuccess] = useState<string | null>(null)
  const [saveWarning,  setSaveWarning] = useState<string | null>(null)

  const [documentTypeId,  setDocumentTypeId]  = useState('')
  const [status,          setStatus]          = useState<DocumentStatus>('pending')
  const [workflowStatus,  setWorkflowStatus]  = useState<WorkflowStatus>('pending_client')
  const [issueDate,           setIssueDate]           = useState('')
  const [expirationDate,      setExpirationDate]      = useState('')
  const [savedIssueDate,      setSavedIssueDate]      = useState('')
  const [savedExpirationDate, setSavedExpirationDate] = useState('')
  const [externalFileUrl, setExternalFileUrl] = useState('')
  const [dropboxPath,     setDropboxPath]     = useState('')
  const [notes,           setNotes]           = useState('')

  const [documentFiles,   setDocumentFiles]   = useState<EmployeeDocumentFile[]>([])

  const fileInputRef                          = useRef<HTMLInputElement>(null)
  const [selectedFile,  setSelectedFile]      = useState<File | null>(null)
  const [uploading,     setUploading]         = useState(false)
  const [opening,       setOpening]           = useState(false)
  const [uploadError,   setUploadError]       = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess]     = useState(false)
  const [downloadingHistoryId, setDownloadingHistoryId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getEmployee(id),
      listActiveDocumentTypes(),
    ]).then(([emp, types]) => {
      setEmployee(emp)
      setDocTypes(types)

      if (isEditing && docId) {
        return Promise.all([
          getEmployeeDocument(docId),
          listDocumentFiles(docId),
        ]).then(([doc, files]) => {
          setDocumentTypeId(doc.document_type_id)
          setStatus((LEGACY_STATUS_MAP[doc.status] ?? doc.status) as DocumentStatus)
          const rawWf = doc.workflow_status ?? 'pending_client'
          setWorkflowStatus((LEGACY_WORKFLOW_MAP[rawWf] ?? rawWf) as WorkflowStatus)
          setIssueDate(doc.issue_date ?? '')
          setExpirationDate(doc.expiration_date ?? '')
          setSavedIssueDate(doc.issue_date ?? '')
          setSavedExpirationDate(doc.expiration_date ?? '')
          setNotes(doc.notes ?? '')
          setDocumentFiles(files)

          const stored = doc.external_file_url ?? ''
          if (isDropboxPath(stored)) {
            setDropboxPath(stored)
          } else {
            setExternalFileUrl(stored)
          }
        })
      } else if (presetTypeId) {
        if (types.some(dt => dt.id === presetTypeId)) {
          setDocumentTypeId(presetTypeId)
        } else {
          setError('Tipo de documento indisponível para funcionários.')
        }
      }
    })
    .catch(() => setError('Erro ao carregar dados.'))
    .finally(() => setLoading(false))
  }, [id, docId, isEditing, presetTypeId])

  async function handleUpload() {
    setUploadError(null)
    setUploadSuccess(false)

    if (!selectedFile)         { setUploadError('Selecione um arquivo primeiro.'); return }
    if (!id)                   { setUploadError('Funcionário não identificado.'); return }
    if (!documentTypeId)       { setUploadError('Selecione o tipo de documento antes de enviar.'); return }
    if (!employee?.company_id) { setUploadError('Empresa do funcionário não identificada.'); return }

    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      setUploadError('Tipo não permitido. Use PDF, PNG, JPG, JPEG ou WEBP.')
      return
    }

    setUploading(true)
    try {
      const selectedDocType = docTypes.find(dt => dt.id === documentTypeId)
      const path = buildEmployeeDocumentDropboxPath({
        companyId:        employee.company_id,
        employeeId:       id,
        documentTypeSlug: selectedDocType?.name ?? documentTypeId,
        fileName:         selectedFile.name,
        issueDate:        issueDate || null,
      })

      const result = await uploadFileToDropbox({ file: selectedFile, path })

      setDropboxPath(result.dropbox_path)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      if (isEditing && docId) {
        await updateEmployeeDocument(
          docId,
          { external_file_url: result.dropbox_path },
          { actionType: 'updated', description: 'Arquivo anexado', employeeId: id },
        )
        const newFile = await addDocumentFile(docId, {
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

      logActivity({
        entityType: 'employee_document',
        entityId:   docId ?? 'pendente',
        actionType: 'updated',
        description: 'Arquivo do documento anexado',
        metadata:   { employee_id: id },
      }).catch(() => {})

      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 4000)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  async function handleOpenFile() {
    if (!dropboxPath) return
    setOpening(true)
    try {
      await downloadFileFromDropboxWithOriginalName(dropboxPath)
    } catch {
      alert('Erro ao baixar arquivo. Tente novamente.')
    } finally {
      setOpening(false)
    }
  }

  async function handleDownloadHistoryFile(file: EmployeeDocumentFile) {
    setDownloadingHistoryId(file.id)
    try {
      const path = file.file_path ?? file.file_url
      if (isDropboxPath(path)) {
        await downloadFileFromDropboxWithOriginalName(path)
      } else if (path) {
        window.open(path, '_blank', 'noopener noreferrer')
      }
    } catch {
      alert('Erro ao baixar arquivo. Tente novamente.')
    } finally {
      setDownloadingHistoryId(null)
    }
  }

  async function handleQuickAction(newStatus: DocumentStatus, newWorkflow: WorkflowStatus) {
    if (!isEditing || !docId) return
    setSaving(true)
    setError(null)
    setSaveSuccess(null)
    setSaveWarning(null)
    try {
      await updateEmployeeDocument(docId, {
        employee_id:       id!,
        document_type_id:  documentTypeId,
        status:            newStatus,
        workflow_status:   newWorkflow,
        issue_date:        issueDate || null,
        expiration_date:   expirationDate || null,
        external_file_url: dropboxPath || externalFileUrl.trim() || null,
        notes:             notes.trim() || null,
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
      setError(err instanceof Error ? err.message : 'Erro ao salvar documento.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaveSuccess(null)
    setSaveWarning(null)

    if (!documentTypeId) {
      setError('Selecione o tipo de documento.')
      return
    }

    setSaving(true)
    try {
      const payload: EmployeeDocumentInsert = {
        employee_id:       id!,
        document_type_id:  documentTypeId,
        status,
        workflow_status:   workflowStatus,
        issue_date:        issueDate || null,
        expiration_date:   expirationDate || null,
        external_file_url: dropboxPath || externalFileUrl.trim() || null,
        notes:             notes.trim() || null,
      }

      if (isEditing && docId) {
        await updateEmployeeDocument(docId, payload)
        setSavedIssueDate(issueDate)
        setSavedExpirationDate(expirationDate)
        setSaveSuccess('Alterações salvas com sucesso.')
        setTimeout(() => setSaveSuccess(null), 5000)
      } else {
        const newDoc = await upsertEmployeeDocument(payload)
        if (dropboxPath) {
          addDocumentFile(newDoc.id, {
            file_url:  dropboxPath,
            file_name: null,
            file_path: dropboxPath,
          }).catch(() => {})
        }
        navigate(`/funcionarios/${id}/documentos/${newDoc.id}/editar`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar documento.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="page"><div className="table-loading"><div className="spinner" /></div></div>
  }

  const selectedDocTypeName = docTypes.find(dt => dt.id === documentTypeId)?.name ?? ''
  const activeStepIdx       = WF_STEPS.findIndex(s => s.value === workflowStatus)
  const isRejected          = workflowStatus === 'rejected'
  const hasFile             = Boolean(dropboxPath)
  const issueDateLocked      = isEditing && Boolean(savedIssueDate)
  const expirationDateLocked = isEditing && Boolean(savedExpirationDate)
  const blockUpload         = isEditing && hasFile && !isRejected

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(`/funcionarios/${id}/documentos`)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {employee?.full_name ?? 'Documentos'}
        </button>
        <h1 className="page-title">{isEditing ? 'Editar documento' : 'Registrar documento'}</h1>
        {employee && <p className="page-subtitle">{employee.full_name}</p>}
      </div>

      {error       && <div className="alert alert-error">{error}</div>}
      {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}
      {saveWarning && <div className="alert alert-warning">{saveWarning}</div>}

      {/* Hero — contexto do documento (apenas em edição) */}
      {isEditing && selectedDocTypeName && (
        <div className="doc-form-hero">
          <div className="doc-form-hero-left">
            <div className="doc-form-hero-title">{selectedDocTypeName}</div>
            {employee && <div className="doc-form-hero-sub">{employee.full_name}</div>}
          </div>
          <div className="doc-form-hero-right">
            <DocStatusBadge status={status} />
            <WorkflowStatusBadge status={workflowStatus} />
            {expirationDate && (
              <span className="doc-form-hero-expiry">Vence em {formatDateBR(expirationDate)}</span>
            )}
          </div>
        </div>
      )}

      {/* Stepper de etapas operacionais (apenas em edição) */}
      {isEditing && (
        <div className="doc-wf-steps">
          {isRejected ? (
            <div className="doc-wf-rejected-banner">Documento rejeitado — processo encerrado</div>
          ) : (
            WF_STEPS.map((step, i) => (
              <div key={step.value} className="doc-wf-step-wrap">
                <div className={`doc-wf-step${i === activeStepIdx ? ' doc-wf-step--active' : ''}${i < activeStepIdx ? ' doc-wf-step--done' : ''}`}>
                  <div className="doc-wf-step-dot">
                    {i < activeStepIdx && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className="doc-wf-step-label">{step.short}</div>
                </div>
                {i < WF_STEPS.length - 1 && (
                  <div className={`doc-wf-connector${i < activeStepIdx ? ' doc-wf-connector--done' : ''}`} />
                )}
              </div>
            ))
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        <div className="doc-form-two-col">

          {/* Seção 1 — Informações do documento */}
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
                    disabled={isEditing || Boolean(presetTypeId)}
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status documental</label>
                  <div style={{ marginTop: 6 }}>
                    <DocStatusBadge status={status} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Etapa operacional</label>
                  <div style={{ marginTop: 6 }}>
                    <WorkflowStatusBadge status={workflowStatus} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2 — Arquivo */}
          <div className="doc-form-section">
            <div className="doc-form-section-header">
              <span className="doc-form-section-num">2</span>
              <span className="doc-form-section-title">Arquivo do documento</span>
            </div>
            <div className="doc-form-section-body">
              <div className="doc-dropzone">

                {/* Arquivo atual */}
                {dropboxPath ? (
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
                    <button
                      type="button"
                      className="btn-icon btn-icon--success"
                      onClick={handleOpenFile}
                      disabled={opening}
                    >
                      {opening ? 'Baixando...' : 'Baixar'}
                    </button>
                  </div>
                ) : (
                  <div className="doc-dropzone-empty">
                    <div className="doc-dropzone-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 16 12 12 8 16" />
                        <line x1="12" y1="12" x2="12" y2="21" />
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                      </svg>
                    </div>
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
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
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
                        Selecionar arquivo
                      </button>
                      {selectedFile && (
                        <>
                          <span className="upload-file-label">{selectedFile.name}</span>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleUpload}
                            disabled={uploading}
                          >
                            {uploading ? 'Enviando...' : 'Anexar arquivo'}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {uploadSuccess && (
                  <div className="alert alert-success" style={{ marginBottom: 0 }}>
                    Arquivo enviado com sucesso.
                  </div>
                )}
                {uploadError && (
                  <div className="alert alert-error" style={{ marginBottom: 0 }}>
                    {uploadError}
                  </div>
                )}

                <span className="form-hint">Formatos aceitos: PDF, PNG, JPG, JPEG ou WEBP.</span>

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
        <br />
        {/* end doc-form-two-col */}

        {/* Seção 3 — Observações */}
        <div className="doc-form-section">
          <div className="doc-form-section-header">
            <span className="doc-form-section-num">3</span>
            <span className="doc-form-section-title">Observações internas</span>
          </div>
          <div className="doc-form-section-body">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea
                className="form-input form-textarea"
                placeholder="Observações internas sobre este documento..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="form-actions form-actions--row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/funcionarios/${id}/documentos`)}
          >
            Cancelar
          </button>
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
            {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Registrar documento'}
          </button>
        </div>

      </form>
    </div>
  )
}
