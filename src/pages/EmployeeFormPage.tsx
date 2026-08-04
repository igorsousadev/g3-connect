import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createEmployee, getEmployee, updateEmployee } from '../services/employeeService'
import { listCompanies } from '../services/companyService'
import { listActiveRoles } from '../services/roleService'
import { listRequirementsByRole } from '../services/roleDocumentRequirementService'
import { deleteEmployeeDocument, updateEmployeeDocument } from '../services/employeeDocumentService'
import { downloadDocumentFile } from '../lib/documentFileResolver'
import { useEmployeeDocuments } from '../hooks/useEmployeeDocuments'
import { useEmployeeActivityLogs } from '../hooks/useActivityLogs'
import { DocStatusBadge, WorkflowStatusBadge } from '../components/DocStatusBadge'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { formatDate, computeDocumentStatus } from '../lib/documentUtils'
import { validateCPF, isBlank } from '../lib/validation'
import type { EmployeeInsert, EmployeeStatus } from '../types/employee'
import type { Company } from '../types/company'
import type { Role } from '../types/role'
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

function formatCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}

const emptyForm: EmployeeInsert = {
  company_id: '',
  full_name: '',
  cpf: '',
  role_id: '',
  phone: null,
  status: 'pending',
  notes: null,
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function EmployeeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isEditing = Boolean(id)

  const [form, setForm] = useState<EmployeeInsert>({
    ...emptyForm,
    company_id: searchParams.get('empresa') ?? '',
  })
  const [companies, setCompanies]       = useState<Company[]>([])
  const [roles, setRoles]               = useState<Role[]>([])
  const [requirements, setRequirements] = useState<RequirementWithDocumentType[]>([])
  const [loading, setLoading]           = useState(false)
  const [fetching, setFetching]         = useState(isEditing)
  const [error, setError]               = useState('')
  const [saveSuccess, setSaveSuccess]   = useState(false)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [quickActing,  setQuickActing]  = useState<string | null>(null)
  const [openingDocId, setOpeningDocId] = useState<string | null>(null)

  const [openBlocks, setOpenBlocks] = useState({ data: false, docs: false, history: false })

  const { documents, loading: loadingDocs, error: docsError, setDocuments } =
    useEmployeeDocuments(isEditing ? id : undefined)
  const { logs, loading: loadingLogs } = useEmployeeActivityLogs(isEditing ? id : undefined)

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => {})
    listActiveRoles().then(setRoles).catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    getEmployee(id)
      .then(data => {
        setForm({
          company_id: data.company_id,
          full_name:  data.full_name,
          cpf:        data.cpf,
          role_id:    data.role_id ?? '',
          phone:      data.phone,
          status:     data.status,
          notes:      data.notes,
        })
        if (data.role_id) return listRequirementsByRole(data.role_id)
        return [] as RequirementWithDocumentType[]
      })
      .then(setRequirements)
      .catch(() => setError('Erro ao carregar funcionário.'))
      .finally(() => setFetching(false))
  }, [id])

  function set(field: keyof EmployeeInsert, value: string | null) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleBlock(block: 'data' | 'docs' | 'history') {
    setOpenBlocks(prev => ({ ...prev, [block]: !prev[block] }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaveSuccess(false)

    const full_name = form.full_name.trim()
    const cpf       = form.cpf.trim()
    const phone     = (form.phone ?? '').trim()
    const notes     = (form.notes ?? '').trim()

    if (isBlank(form.company_id)) { setError('Selecione uma empresa.'); return }
    if (isBlank(form.role_id))    { setError('Selecione um cargo/função.'); return }
    if (isBlank(full_name))       { setError('Nome completo é obrigatório.'); return }
    if (isBlank(cpf))             { setError('CPF é obrigatório.'); return }
    if (!validateCPF(cpf))        { setError('CPF inválido. Verifique os dígitos informados.'); return }

    const payload: EmployeeInsert = {
      company_id: form.company_id,
      role_id:    form.role_id,
      full_name,
      cpf,
      phone:  phone || null,
      status: form.status,
      notes:  notes || null,
    }

    setLoading(true)
    try {
      if (isEditing && id) {
        await updateEmployee(id, payload)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        const created = await createEmployee(payload)
        navigate(`/funcionarios/${created.id}/editar`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar funcionário. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleViewFile(doc: EmployeeDocument) {
    setOpeningDocId(doc.id)
    try {
      if (!doc.external_file_url) {
        alert('Nenhum arquivo anexado a este documento.')
        return
      }
      await downloadDocumentFile(doc.external_file_url)
    } catch {
      alert('Erro ao baixar arquivo. Tente novamente.')
    } finally {
      setOpeningDocId(null)
    }
  }

  async function handleQuickAction(doc: EmployeeDocument, newStatus: DocumentStatus, newWorkflow: WorkflowStatus) {
    setQuickActing(doc.id)
    try {
      await updateEmployeeDocument(doc.id, { status: newStatus, workflow_status: newWorkflow })
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: newStatus, workflow_status: newWorkflow } : d))
    } catch {
      alert('Erro ao atualizar documento.')
    } finally {
      setQuickActing(null)
    }
  }

  async function handleDeleteDoc(doc: EmployeeDocument) {
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

  const backPath = form.company_id
    ? `/funcionarios?empresa=${form.company_id}`
    : '/funcionarios'

  if (fetching) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="spinner" /> Carregando...
      </div>
    )
  }

  const docMap        = Object.fromEntries(documents.map(d => [d.document_type_id, d]))
  const uncoveredDocs = requirements.filter(r => !docMap[r.document_type_id])
  const extraDocs     = documents.filter(d => !requirements.some(r => r.document_type_id === d.document_type_id))

  return (
    <div className="page page--wide">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(backPath)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Funcionários
        </button>
        <h1 className="page-title" style={{ marginTop: 8 }}>
          {isEditing && form.full_name ? form.full_name : isEditing ? 'Editar funcionário' : 'Novo funcionário'}
        </h1>
        {isEditing && <p className="page-subtitle">Gestão do funcionário</p>}
      </div>

      {/* Bloco 1 — Dados do funcionário */}
      <div className="block-card">
        <div
          className={`block-card-header${openBlocks.data ? ' block-card-header--open' : ''}`}
          onClick={() => toggleBlock('data')}
          role="button"
          aria-expanded={openBlocks.data}
        >
          <div className="block-card-title">
            <span className="block-card-num">1</span>
            Dados do funcionário
          </div>
          <ChevronIcon open={openBlocks.data} />
        </div>

        {openBlocks.data && (
          <div className="block-card-body">
            <form onSubmit={handleSubmit}>
              {error       && <div className="alert alert-error">{error}</div>}
              {saveSuccess && <div className="alert alert-success">Funcionário salvo com sucesso.</div>}

              <div className="form-grid">
                <div className="form-group form-group--span2">
                  <label className="form-label" htmlFor="company_id">Empresa <span className="form-required">*</span></label>
                  <select
                    id="company_id"
                    className="form-input form-select"
                    value={form.company_id}
                    onChange={e => set('company_id', e.target.value)}
                    disabled={isEditing}
                    required
                  >
                    <option value="">Selecione uma empresa</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.corporate_name}</option>
                    ))}
                  </select>
                  {isEditing && (
                    <span className="form-hint">Campo bloqueado após o cadastro do funcionário.</span>
                  )}
                </div>

                <div className="form-group form-group--span2">
                  <label className="form-label" htmlFor="full_name">Nome completo <span className="form-required">*</span></label>
                  <input
                    id="full_name"
                    type="text"
                    className="form-input"
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    disabled={isEditing}
                    required
                  />
                  {isEditing && (
                    <span className="form-hint">Campo bloqueado após o cadastro do funcionário.</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cpf">CPF <span className="form-required">*</span></label>
                  <input
                    id="cpf"
                    type="text"
                    className="form-input"
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={e => set('cpf', formatCPF(e.target.value))}
                    disabled={isEditing}
                    required
                  />
                  {isEditing && (
                    <span className="form-hint">Campo bloqueado após o cadastro do funcionário.</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="role_id">Cargo / Função <span className="form-required">*</span></label>
                  <select
                    id="role_id"
                    className="form-input form-select"
                    value={form.role_id}
                    onChange={e => set('role_id', e.target.value)}
                    disabled={isEditing}
                    required
                  >
                    <option value="">Selecione um cargo</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  {isEditing && (
                    <span className="form-hint">Campo bloqueado após o cadastro do funcionário.</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Telefone</label>
                  <input
                    id="phone"
                    type="text"
                    className="form-input"
                    placeholder="(00) 00000-0000"
                    value={form.phone ?? ''}
                    onChange={e => set('phone', formatPhone(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="status">Status <span className="form-required">*</span></label>
                  <select
                    id="status"
                    className="form-input form-select"
                    value={form.status}
                    onChange={e => set('status', e.target.value as EmployeeStatus)}
                    required
                  >
                    <option value="active">Ativo</option>
                    <option value="pending">Pendente</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>

                <div className="form-group form-group--span2">
                  <label className="form-label" htmlFor="notes">Observações</label>
                  <textarea
                    id="notes"
                    className="form-input form-textarea"
                    value={form.notes ?? ''}
                    onChange={e => set('notes', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions form-actions--row">
                <button type="button" className="btn btn-secondary" onClick={() => navigate(backPath)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar funcionário'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Blocos 2 e 3 — somente no modo de edição */}
      {isEditing && (
        <>
          {/* Bloco 2 — Checklist e documentos */}
          <div className="block-card">
            <div
              className={`block-card-header${openBlocks.docs ? ' block-card-header--open' : ''}`}
              onClick={() => toggleBlock('docs')}
              role="button"
              aria-expanded={openBlocks.docs}
            >
              <div className="block-card-title">
                <span className="block-card-num">2</span>
                Checklist e documentos do cargo
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="btn btn-primary"
                  style={{ height: 32, padding: '0 14px', fontSize: 13 }}
                  onClick={e => {
                    e.stopPropagation()
                    navigate(`/funcionarios/${id}/documentos/novo`)
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Adicionar documento
                </button>
                <ChevronIcon open={openBlocks.docs} />
              </div>
            </div>

            {openBlocks.docs && (
              <div className="block-card-body">
                {docsError && <div className="alert alert-error">{docsError}</div>}

                {uncoveredDocs.length > 0 && (
                  <div className="alert alert-warning">
                    {uncoveredDocs.length} documento{uncoveredDocs.length !== 1 ? 's' : ''} pendente{uncoveredDocs.length !== 1 ? 's' : ''} do checklist do cargo.
                  </div>
                )}

                {requirements.length > 0 && (
                  <div className="doc-section">
                    <h3 className="doc-section-title">Checklist do cargo</h3>
                    {loadingDocs ? (
                      <div className="table-loading"><div className="spinner" /></div>
                    ) : (
                      <div className="table-container">
                        <table className="table table--wide">
                          <thead>
                            <tr>
                              <th>Documento</th>
                              <th>Emissão</th>
                              <th>Vencimento</th>
                              <th>Status</th>
                              <th>Link</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {requirements.map(req => {
                              const doc    = docMap[req.document_type_id]
                              const status = doc
                                ? computeDocumentStatus(doc.expiration_date, mapStatus(doc.status))
                                : 'pending'
                              const wf = mapWorkflow(doc?.workflow_status)
                              return (
                                <tr key={req.document_type_id}>
                                  <td className="td-primary td-truncate" title={req.document_types.name}>
                                    {req.document_types.name}
                                  </td>
                                  <td>{doc ? formatDate(doc.issue_date) : <span className="td-muted">—</span>}</td>
                                  <td>{doc ? formatDate(doc.expiration_date) : <span className="td-muted">—</span>}</td>
                                  <td>
                                    {wf
                                      ? <WorkflowStatusBadge status={wf} />
                                      : <span className="td-muted">—</span>}
                                  </td>
                                  <td>
                                    {doc?.external_file_url
                                      ? (
                                        <button
                                          className="link-external"
                                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                          onClick={() => handleViewFile(doc)}
                                          disabled={openingDocId === doc.id}
                                        >
                                          {openingDocId === doc.id ? 'Baixando...' : 'Baixar arquivo'}
                                        </button>
                                      )
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
                                      <>
                                        {status !== 'valid' ? (
                                          <button
                                            className="btn-icon btn-icon--success"
                                            disabled={quickActing === doc.id}
                                            onClick={() => handleQuickAction(doc, 'valid', 'homologation')}
                                          >
                                            <svg
                                              width="15"
                                              height="15"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Validar
                                          </button>
                                        ) : (
                                          <button
                                            className="btn-icon btn-icon--danger"
                                            disabled={quickActing === doc.id}
                                            onClick={() => handleQuickAction(doc, 'invalid', 'rejected')}
                                          >
                                            <svg
                                              width="15"
                                              height="15"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <line x1="18" y1="6" x2="6" y2="18" />
                                              <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                            Invalidar
                                          </button>
                                        )}
                                        <button
                                          className="btn-icon btn-icon--danger"
                                          disabled={deleting === doc.id}
                                          onClick={() => handleDeleteDoc(doc)}
                                        >
                                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                                          </svg>
                                          Remover
                                        </button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {(extraDocs.length > 0 || requirements.length === 0) && (
                  <div className="doc-section" style={{ marginBottom: 0 }}>
                    <h3 className="doc-section-title">
                      {requirements.length === 0 ? 'Documentos registrados' : 'Documentos adicionais'}
                    </h3>
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
                              const wf2 = mapWorkflow(doc.workflow_status)
                              return (
                                <tr key={doc.id}>
                                  <td className="td-primary td-muted">ID: {doc.document_type_id.slice(0, 8)}</td>
                                  <td>{formatDate(doc.issue_date)}</td>
                                  <td>{formatDate(doc.expiration_date)}</td>
                                  <td><DocStatusBadge status={status} /></td>
                                  <td>
                                    {wf2
                                      ? <WorkflowStatusBadge status={wf2} />
                                      : <span className="td-muted">—</span>}
                                  </td>
                                  <td>
                                    {doc.external_file_url
                                      ? (
                                        <button
                                          className="link-external"
                                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                          onClick={() => handleViewFile(doc)}
                                          disabled={openingDocId === doc.id}
                                        >
                                          {openingDocId === doc.id ? 'Baixando...' : 'Baixar arquivo'}
                                        </button>
                                      )
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
                                    {status !== 'valid' ? (
                                      <button
                                        className="btn-icon btn-icon--success"
                                        disabled={quickActing === doc.id}
                                        onClick={() => handleQuickAction(doc, 'valid', 'homologation')}
                                      >
                                        Validar
                                      </button>
                                    ) : (
                                      <button
                                        className="btn-icon btn-icon--danger"
                                        disabled={quickActing === doc.id}
                                        onClick={() => handleQuickAction(doc, 'invalid', 'rejected')}
                                      >
                                        Invalidar
                                      </button>
                                    )}
                                    <button
                                      className="btn-icon btn-icon--danger"
                                      disabled={deleting === doc.id}
                                      onClick={() => handleDeleteDoc(doc)}
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
                        <button
                          className="btn btn-primary"
                          onClick={() => navigate(`/funcionarios/${id}/documentos/novo`)}
                        >
                          Registrar primeiro documento
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bloco 3 — Histórico operacional */}
          <div className="block-card">
            <div
              className={`block-card-header${openBlocks.history ? ' block-card-header--open' : ''}`}
              onClick={() => toggleBlock('history')}
              role="button"
              aria-expanded={openBlocks.history}
            >
              <div className="block-card-title">
                <span className="block-card-num">3</span>
                Histórico operacional
              </div>
              <ChevronIcon open={openBlocks.history} />
            </div>

            {openBlocks.history && (
              <div className="block-card-body">
                <ActivityTimeline
                  logs={logs}
                  loading={loadingLogs}
                  compact
                  emptyMessage="Nenhuma atividade registrada para este funcionário."
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
