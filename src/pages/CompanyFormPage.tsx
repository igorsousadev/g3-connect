import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createCompany, getCompany, updateCompany } from '../services/companyService'
import { checkEmailExists, createManagedUser } from '../services/userManagementService'
import { listActivitiesForCompany } from '../services/activityLogService'
import { listCompanyDocuments, updateCompanyDocument } from '../services/companyDocumentService'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { validateCNPJ, isBlank } from '../lib/validation'
import { downloadDocumentFile } from '../lib/documentFileResolver'
import { listContractors } from '../services/contractorService'
import { listActiveSegments } from '../services/segmentService'
import {
  listCompanyContractors,
  createCompanyContractor,
  inactivateCompanyContractor,
  getNextContractorSequence,
} from '../services/companyContractorService'
import type { CompanyInsert, CompanyStatus } from '../types/company'
import type { ActivityLog } from '../types/activityLog'
import type { CompanyDocumentWithType } from '../types/companyDocument'
import type { Contractor } from '../types/contractor'
import type { Segment } from '../types/segment'
import type { CompanyContractor } from '../types/companyContractor'
import { DOCUMENT_STATUS_LABELS, WORKFLOW_STATUS_LABELS, type DocumentStatus, type WorkflowStatus } from '../types/employeeDocument'

// ── Formatadores ────────────────────────────────────────────────────────────

function formatCNPJ(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatWhatsApp(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}

// ── Ícones ──────────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ── Constantes ──────────────────────────────────────────────────────────────

const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  active:   'Ativa',
  pending:  'Pendente',
  inactive: 'Inativa',
}

const emptyForm: CompanyInsert = {
  corporate_name:      '',
  trade_name:          '',
  cnpj:                '',
  responsible_name:    '',
  whatsapp:            '',
  email:               '',
  status:              'pending',
  notes:               '',
  monthly_fee:         null,
  billing_day:         10,
  payment_method:      'pix',
  contract_start_date: null,
  contract_status:     'active',
  plan_name:           '',
  invoice_required:    true,
  invoice_email:       '',
  financial_notes:     '',
}

function makeEmptyContractorLinkForm() {
  return {
    contractor_id: '',
    segment_id:    '',
    notes:         '',
  }
}

// ── Componente ──────────────────────────────────────────────────────────────

export function CompanyFormPage() {
  const navigate    = useNavigate()
  const { id }      = useParams<{ id: string }>()
  const { profile } = useAuth()
  const isEditing   = Boolean(id)
  const canEdit     = ['admin', 'supervisor', 'operator'].includes(profile?.role ?? '')
  const topRef      = useRef<HTMLDivElement>(null)

  // ── Dados da empresa ───────────────────────────────────────────────────────
  const [form,              setForm]              = useState<CompanyInsert>(emptyForm)
  const [loading,           setLoading]           = useState(false)
  const [fetching,          setFetching]          = useState(isEditing)
  const [error,             setError]             = useState('')
  const [saveSuccess,       setSaveSuccess]       = useState(false)
  const [clientUserWarning, setClientUserWarning] = useState<string | null>(null)

  // ── Blocos expansíveis ─────────────────────────────────────────────────────
  const [openBlocks, setOpenBlocks] = useState({ contract: false, data: false, docs: false, history: false })

  // ── Contratantes e segmentos (dropdowns) ───────────────────────────────────
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [segments,    setSegments]    = useState<Segment[]>([])

  // ── Vínculos da empresa com contratantes ───────────────────────────────────
  const [companyContractors,  setCompanyContractors]  = useState<CompanyContractor[]>([])
  const [loadingContractors,  setLoadingContractors]  = useState(false)
  const [contractorLinkForm,  setContractorLinkForm]  = useState(makeEmptyContractorLinkForm)
  const [contractorSaving,    setContractorSaving]    = useState(false)
  const [contractorSaveError, setContractorSaveError] = useState<string | null>(null)
  const [contractBlockError,  setContractBlockError]  = useState<string | null>(null)
  const [contractSeqPreview,  setContractSeqPreview]  = useState<number | null>(null)
  const [contractSeqLoading,  setContractSeqLoading]  = useState(false)
  const [showNewContractModal, setShowNewContractModal] = useState(false)

  // ── Inativação de contrato ─────────────────────────────────────────────────
  const [inactivationConfirm, setInactivationConfirm] = useState<CompanyContractor | null>(null)
  const [inactivationReason,  setInactivationReason]  = useState('')
  const [inactivating,        setInactivating]        = useState(false)
  const [inactivationError,   setInactivationError]   = useState<string | null>(null)

  // ── Histórico ──────────────────────────────────────────────────────────────
  const [logs,        setLogs]        = useState<ActivityLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // ── Documentos da empresa ──────────────────────────────────────────────────
  const [companyDocs,  setCompanyDocs]  = useState<CompanyDocumentWithType[]>([])
  const [loadingDocs,  setLoadingDocs]  = useState(false)
  const [docsError,    setDocsError]    = useState<string | null>(null)
  const [quickActing,  setQuickActing]  = useState<string | null>(null)

  // ── Efeitos ────────────────────────────────────────────────────────────────

  function toggleBlock(block: keyof typeof openBlocks) {
    setOpenBlocks(prev => ({ ...prev, [block]: !prev[block] }))
  }

  useEffect(() => {
    if (!error) return
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const timer = setTimeout(() => setError(''), 10_000)
    return () => clearTimeout(timer)
  }, [error])

  useEffect(() => {
    if (!id) return
    getCompany(id)
      .then(data => setForm({
        corporate_name:      data.corporate_name,
        trade_name:          data.trade_name ?? '',
        cnpj:                data.cnpj,
        responsible_name:    data.responsible_name,
        whatsapp:            data.whatsapp ?? '',
        email:               data.email ?? '',
        status:              data.status,
        notes:               data.notes ?? '',
        monthly_fee:         data.monthly_fee ?? null,
        billing_day:         data.billing_day ?? 10,
        payment_method:      data.payment_method ?? 'pix',
        contract_start_date: data.contract_start_date ?? null,
        contract_status:     data.contract_status ?? 'active',
        plan_name:           data.plan_name ?? '',
        invoice_required:    data.invoice_required ?? true,
        invoice_email:       data.invoice_email ?? '',
        financial_notes:     data.financial_notes ?? '',
      }))
      .catch(() => setError('Erro ao carregar empresa.'))
      .finally(() => setFetching(false))
  }, [id])

  useEffect(() => {
    Promise.all([listContractors(), listActiveSegments()])
      .then(([cList, sList]) => {
        setContractors(cList.filter(c => c.status === 'active'))
        setSegments(sList)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    setLoadingContractors(true)
    listCompanyContractors(id)
      .then(setCompanyContractors)
      .catch(() => {})
      .finally(() => setLoadingContractors(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoadingLogs(true)
    listActivitiesForCompany(id)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoadingLogs(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoadingDocs(true)
    setDocsError(null)
    listCompanyDocuments(id)
      .then(setCompanyDocs)
      .catch(() => setDocsError('Erro ao carregar documentos da empresa.'))
      .finally(() => setLoadingDocs(false))
  }, [id])

  // ── Handlers — empresa ─────────────────────────────────────────────────────

  function set(field: keyof CompanyInsert, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaveSuccess(false)

    const corporate_name   = form.corporate_name.trim()
    const trade_name       = (form.trade_name ?? '').trim()
    const cnpj             = form.cnpj.trim()
    const responsible_name = form.responsible_name.trim()
    const whatsapp         = (form.whatsapp ?? '').trim()
    const email            = (form.email ?? '').trim()
    const notes            = (form.notes ?? '').trim()

    if (isBlank(corporate_name))   { setError('Razão social é obrigatória.'); return }
    if (isBlank(responsible_name)) { setError('Nome do responsável é obrigatório.'); return }
    if (isBlank(whatsapp))         { setError('WhatsApp é obrigatório.'); return }
    if (isBlank(cnpj))             { setError('CNPJ é obrigatório.'); return }
    if (!validateCNPJ(cnpj))       { setError('CNPJ inválido. Verifique os dígitos informados.'); return }

    if (!isEditing) {
      if (!contractorLinkForm.contractor_id) {
        const msg = 'Informe uma contratante vinculada para continuar.'
        setContractBlockError(msg)
        setError(msg)
        setOpenBlocks(prev => ({ ...prev, contract: true }))
        return
      }
      if (!contractorLinkForm.segment_id) {
        const msg = 'Selecione o segmento para a contratante vinculada.'
        setContractBlockError(msg)
        setError(msg)
        setOpenBlocks(prev => ({ ...prev, contract: true }))
        return
      }
    }
    setContractBlockError(null)

    const payload: CompanyInsert = {
      corporate_name,
      trade_name:          trade_name || null,
      cnpj,
      responsible_name,
      whatsapp,
      email:               email || null,
      status:              form.status,
      notes:               notes || null,
      monthly_fee:         form.monthly_fee,
      billing_day:         form.billing_day,
      payment_method:      form.payment_method,
      contract_start_date: form.contract_start_date,
      contract_status:     form.contract_status,
      plan_name:           form.plan_name || null,
      invoice_required:    form.invoice_required,
      invoice_email:       form.invoice_email || null,
      financial_notes:     form.financial_notes || null,
    }

    setLoading(true)
    try {
      if (isEditing && id) {
        // Campos bloqueados não são enviados na atualização
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { corporate_name: _cn, trade_name: _tn, cnpj: _cnpj, responsible_name: _rn, email: _em, ...updatePayload } = payload
        await updateCompany(id, updatePayload)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        if (email) {
          const jaExiste = await checkEmailExists(email)
          if (jaExiste) {
            setError('Já existe um usuário cadastrado com este e-mail.')
            return
          }
        }

        const created = await createCompany(payload)

        if (contractorLinkForm.contractor_id && contractorLinkForm.segment_id) {
          const contractor = contractors.find(c => c.id === contractorLinkForm.contractor_id)
          if (contractor) {
            await createCompanyContractor(
              created.id,
              contractorLinkForm.contractor_id,
              contractorLinkForm.segment_id,
              corporate_name,
              contractor.code,
              contractorLinkForm.notes.trim(),
            ).catch(() => {})
          }
        }

        if (created.email) {
          const fullName = (created.responsible_name || created.trade_name || created.corporate_name).trim()
          try {
            await createManagedUser({
              full_name:  fullName,
              email:      created.email,
              role:       'client',
              company_id: created.id,
              is_active:  true,
            })
          } catch (userErr) {
            setClientUserWarning(
              userErr instanceof Error ? userErr.message : 'Erro desconhecido ao criar acesso.'
            )
            setLoading(false)
            setTimeout(() => navigate(`/empresas/${created.id}/editar`), 6000)
            return
          }
        }

        navigate(`/empresas/${created.id}/editar`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar empresa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadCompanyDocument(fileUrl: string) {
    try {
      await downloadDocumentFile(fileUrl)
    } catch {
      alert('Erro ao baixar arquivo. Tente novamente.')
    }
  }

  function openCompanyDocAdd() {
    if (!id) return
    navigate(`/empresas/${id}/documentos/novo`)
  }

  async function handleDocQuickAction(docId: string, newStatus: DocumentStatus, newWorkflow: WorkflowStatus) {
    setQuickActing(docId)
    const prevDoc = companyDocs.find(d => d.id === docId)
    try {
      await updateCompanyDocument(docId, { status: newStatus, workflow_status: newWorkflow }, {
        actionType: newStatus === 'valid' ? 'approved' : 'rejected',
        companyId: id,
        prevWorkflowStatus: prevDoc?.workflow_status,
      })
      setCompanyDocs(prev => prev.map(d =>
        d.id === docId ? { ...d, status: newStatus, workflow_status: newWorkflow } : d
      ))
    } catch {
      alert('Erro ao atualizar documento.')
    } finally {
      setQuickActing(null)
    }
  }

  // ── Handlers — vínculos com contratante ───────────────────────────────────

  function buildContractPreview(contractorId: string, seq: number | null, corporateName: string): string {
    if (!contractorId || seq === null) return ''
    const contractor = contractors.find(c => c.id === contractorId)
    if (!contractor) return ''
    const name = corporateName.trim() || '[RAZÃO SOCIAL DA EMPRESA]'
    return `${seq.toString().padStart(4, '0')}/${contractor.code} - ${name.toUpperCase()}`
  }

  function fetchContractSeqPreview(contractorId: string) {
    if (!contractorId) { setContractSeqPreview(null); return }
    setContractSeqLoading(true)
    setContractSeqPreview(null)
    getNextContractorSequence(contractorId)
      .then(setContractSeqPreview)
      .catch(() => setContractSeqPreview(null))
      .finally(() => setContractSeqLoading(false))
  }

  function openNewContractModal() {
    setContractorLinkForm(makeEmptyContractorLinkForm())
    setContractSeqPreview(null)
    setContractorSaveError(null)
    setShowNewContractModal(true)
  }

  async function handleContractorLinkSave() {
    if (!id) return
    if (!contractorLinkForm.contractor_id) { setContractorSaveError('Selecione a contratante.'); return }
    if (!contractorLinkForm.segment_id)    { setContractorSaveError('Selecione o segmento.'); return }

    setContractorSaving(true)
    setContractorSaveError(null)
    try {
      const contractor = contractors.find(c => c.id === contractorLinkForm.contractor_id)
      if (!contractor) { setContractorSaveError('Contratante não encontrada.'); return }
      const newLink = await createCompanyContractor(
        id,
        contractorLinkForm.contractor_id,
        contractorLinkForm.segment_id,
        form.corporate_name,
        contractor.code,
        contractorLinkForm.notes.trim(),
      )
      setCompanyContractors(prev => [...prev, newLink])
      setShowNewContractModal(false)
      setContractorLinkForm(makeEmptyContractorLinkForm())
      setContractSeqPreview(null)
    } catch (err) {
      setContractorSaveError(err instanceof Error ? err.message : 'Erro ao salvar contrato.')
    } finally {
      setContractorSaving(false)
    }
  }

  async function handleInactivate() {
    if (!inactivationConfirm || !id) return
    setInactivating(true)
    setInactivationError(null)
    try {
      const contractorName = inactivationConfirm.contractors?.trade_name
        ?? inactivationConfirm.contractors?.corporate_name ?? ''
      const updated = await inactivateCompanyContractor(
        inactivationConfirm.id,
        id,
        contractorName,
        inactivationReason,
      )
      setCompanyContractors(prev => prev.map(l => l.id === updated.id ? updated : l))
      setInactivationConfirm(null)
      setInactivationReason('')
    } catch (err) {
      setInactivationError(err instanceof Error ? err.message : 'Erro ao inativar contrato.')
    } finally {
      setInactivating(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (fetching) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="spinner" /> Carregando...
      </div>
    )
  }

  const displayName = (form.trade_name?.trim() || form.corporate_name.trim()) || 'Empresa'
  const activeContract    = companyContractors.find(l => l.status === 'active')
  const inactiveContracts = companyContractors.filter(l => l.status === 'inactive')

  return (
    <div className="page page--wide">

      {/* ── Cabeçalho ────────────────────────────────────────── */}
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/empresas')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Empresas
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            {isEditing ? displayName : 'Nova empresa'}
          </h1>
          {isEditing && (
            <span className={`badge badge--${form.status}`}>
              {COMPANY_STATUS_LABELS[form.status]}
            </span>
          )}
        </div>

        {isEditing && (
          <div className="co-hero-chips">
            {form.cnpj && (
              <span className="co-hero-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
                {form.cnpj}
              </span>
            )}
            {form.responsible_name && (
              <span className="co-hero-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                {form.responsible_name}
              </span>
            )}
            {form.whatsapp && (
              <span className="co-hero-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.78l3-1.27a2 2 0 0 1 2 .46l2 3.86a2 2 0 0 1-.46 2.33L9.32 9.4a18 18 0 0 0 6.28 6.28l1.04-.87a2 2 0 0 1 2.33-.46l3.86 2a2 2 0 0 1 .17 2.57z" />
                </svg>
                {form.whatsapp}
              </span>
            )}
            {form.email && (
              <span className="co-hero-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                </svg>
                {form.email}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Âncora de scroll + alert global de validação/erro ── */}
      <div ref={topRef} />
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, color: 'inherit' }}
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Bloco 1 — Contrato ativo ──────────────────────────── */}
      <div className="block-card">
        <div
          className={`block-card-header${openBlocks.contract ? ' block-card-header--open' : ''}`}
          onClick={() => toggleBlock('contract')}
          role="button"
          aria-expanded={openBlocks.contract}
        >
          <div className="block-card-title">
            <span className="block-card-num">1</span>
            Contrato ativo
            {!isEditing && <span className="form-required" style={{ marginLeft: 4 }}>*</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isEditing && canEdit && !loadingContractors && !activeContract && (
              <button
                className="btn btn-primary"
                style={{ height: 32, padding: '0 14px', fontSize: 13 }}
                onClick={e => { e.stopPropagation(); openNewContractModal() }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Novo contrato
              </button>
            )}
            <ChevronIcon open={openBlocks.contract} />
          </div>
        </div>

        {openBlocks.contract && (
          <div className="block-card-body">

            {/* ── Modo criação: formulário inline ── */}
            {!isEditing && (
              <>
                {contractBlockError && (
                  <div className="alert alert-error" style={{ marginBottom: 16 }}>{contractBlockError}</div>
                )}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Contratante <span className="form-required">*</span></label>
                    <select
                      className={`form-input form-select${contractBlockError && !contractorLinkForm.contractor_id ? ' form-input--error' : ''}`}
                      value={contractorLinkForm.contractor_id}
                      onChange={e => {
                        const v = e.target.value
                        setContractorLinkForm(f => ({ ...f, contractor_id: v, segment_id: '' }))
                        fetchContractSeqPreview(v)
                        if (v) setContractBlockError(null)
                      }}
                    >
                      <option value="">Selecione</option>
                      {contractors.map(c => (
                        <option key={c.id} value={c.id}>{c.trade_name || c.corporate_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Segmento <span className="form-required">*</span></label>
                    <select
                      className="form-input form-select"
                      value={contractorLinkForm.segment_id}
                      onChange={e => setContractorLinkForm(f => ({ ...f, segment_id: e.target.value }))}
                      disabled={!contractorLinkForm.contractor_id}
                    >
                      <option value="">Selecione</option>
                      {segments.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group form-group--span2">
                    <label className="form-label">Nº do Contrato (prévia)</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontFamily: 'monospace' }}
                      placeholder="Selecione a contratante para ver a prévia"
                      value={contractorLinkForm.contractor_id
                        ? (contractSeqLoading ? 'Calculando...' : buildContractPreview(contractorLinkForm.contractor_id, contractSeqPreview, form.corporate_name))
                        : ''}
                      disabled
                    />
                    <span className="form-hint">Gerado automaticamente ao salvar. Pode ser diferente do exibido em caso de cadastro simultâneo.</span>
                  </div>

                  <div className="form-group form-group--span2">
                    <label className="form-label">Observações</label>
                    <textarea
                      className="form-input form-textarea"
                      rows={2}
                      value={contractorLinkForm.notes}
                      onChange={e => setContractorLinkForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Modo edição: contrato ativo ── */}
            {isEditing && (
              loadingContractors ? (
                <div className="table-loading"><div className="spinner" /></div>
              ) : activeContract ? (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Contratante</label>
                      <input
                        type="text"
                        className="form-input"
                        value={activeContract.contractors?.trade_name || activeContract.contractors?.corporate_name || '—'}
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Segmento</label>
                      <input
                        type="text"
                        className="form-input"
                        value={activeContract.segments?.name || '—'}
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nº do Contrato</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontFamily: 'monospace' }}
                        value={activeContract.contract_number}
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Data de inclusão</label>
                      <input
                        type="text"
                        className="form-input"
                        value={activeContract.contract_inclusion_date
                          ? new Date(`${activeContract.contract_inclusion_date}T00:00:00`).toLocaleDateString('pt-BR')
                          : '—'}
                        disabled
                      />
                    </div>

                    {activeContract.notes && (
                      <div className="form-group form-group--span2">
                        <label className="form-label">Observações</label>
                        <textarea
                          className="form-input form-textarea"
                          rows={2}
                          value={activeContract.notes}
                          disabled
                        />
                      </div>
                    )}

                    {canEdit && (
                      <div className="form-group form-group--span2">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ color: 'var(--color-error, #dc2626)', borderColor: 'var(--color-error, #dc2626)' }}
                          onClick={() => { setInactivationConfirm(activeContract); setInactivationReason('') }}
                        >
                          Inativar contrato
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Histórico de contratos ── */}
                  {inactiveContracts.length > 0 && (
                    <>
                      <div style={{ marginTop: 28, marginBottom: 12, fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Histórico de contratos
                      </div>
                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Contrato</th>
                              <th>Contratante</th>
                              <th>Segmento</th>
                              <th>Data de inclusão</th>
                              <th>Data de inativação</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inactiveContracts.map(link => (
                              <tr key={link.id}>
                                <td>
                                  <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                    {link.contract_sequence.toString().padStart(4, '0')}/{link.contractors?.code ?? '—'}
                                  </span>
                                </td>
                                <td className="td-muted">
                                  {link.contractors?.trade_name || link.contractors?.corporate_name || '—'}
                                </td>
                                <td className="td-muted">{link.segments?.name || '—'}</td>
                                <td className="td-muted">
                                  {link.contract_inclusion_date
                                    ? new Date(`${link.contract_inclusion_date}T00:00:00`).toLocaleDateString('pt-BR')
                                    : '—'}
                                </td>
                                <td className="td-muted">
                                  {link.inactivated_at
                                    ? new Date(link.inactivated_at).toLocaleDateString('pt-BR')
                                    : '—'}
                                </td>
                                <td>
                                  <span className="badge badge--inactive">Inativo</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <p>Esta empresa não possui contrato ativo.</p>
                    {canEdit && (
                      <button className="btn btn-primary" onClick={openNewContractModal}>Novo contrato</button>
                    )}
                  </div>

                  {/* ── Histórico de contratos ── */}
                  {inactiveContracts.length > 0 && (
                    <>
                      <div style={{ marginTop: 28, marginBottom: 12, fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Histórico de contratos
                      </div>
                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Contrato</th>
                              <th>Contratante</th>
                              <th>Segmento</th>
                              <th>Data de inclusão</th>
                              <th>Data de inativação</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inactiveContracts.map(link => (
                              <tr key={link.id}>
                                <td>
                                  <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                    {link.contract_sequence.toString().padStart(4, '0')}/{link.contractors?.code ?? '—'}
                                  </span>
                                </td>
                                <td className="td-muted">
                                  {link.contractors?.trade_name || link.contractors?.corporate_name || '—'}
                                </td>
                                <td className="td-muted">{link.segments?.name || '—'}</td>
                                <td className="td-muted">
                                  {link.contract_inclusion_date
                                    ? new Date(`${link.contract_inclusion_date}T00:00:00`).toLocaleDateString('pt-BR')
                                    : '—'}
                                </td>
                                <td className="td-muted">
                                  {link.inactivated_at
                                    ? new Date(link.inactivated_at).toLocaleDateString('pt-BR')
                                    : '—'}
                                </td>
                                <td>
                                  <span className="badge badge--inactive">Inativo</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Bloco 2 — Dados da empresa ───────────────────────── */}
      <div className="block-card">
        <div
          className={`block-card-header${openBlocks.data ? ' block-card-header--open' : ''}`}
          onClick={() => toggleBlock('data')}
          role="button"
          aria-expanded={openBlocks.data}
        >
          <div className="block-card-title">
            <span className="block-card-num">2</span>
            Dados da empresa
          </div>
          <ChevronIcon open={openBlocks.data} />
        </div>

        {openBlocks.data && (
          <div className="block-card-body">
            <form id="company-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group form-group--span2">
                  <label className="form-label" htmlFor="corporate_name">Razão social <span className="form-required">*</span></label>
                  <input
                    id="corporate_name"
                    type="text"
                    className="form-input"
                    value={form.corporate_name}
                    onChange={e => set('corporate_name', e.target.value)}
                    disabled={isEditing}
                    required
                  />
                  {isEditing && <span className="form-hint">Campo bloqueado após o cadastro.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="trade_name">Nome fantasia</label>
                  <input
                    id="trade_name"
                    type="text"
                    className="form-input"
                    value={form.trade_name ?? ''}
                    onChange={e => set('trade_name', e.target.value)}
                    disabled={isEditing}
                  />
                  {isEditing && <span className="form-hint">Campo bloqueado após o cadastro.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cnpj">CNPJ <span className="form-required">*</span></label>
                  <input
                    id="cnpj"
                    type="text"
                    className="form-input"
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onChange={e => set('cnpj', formatCNPJ(e.target.value))}
                    disabled={isEditing}
                    required
                  />
                  {isEditing && <span className="form-hint">Campo bloqueado após o cadastro.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="responsible_name">Responsável <span className="form-required">*</span></label>
                  <input
                    id="responsible_name"
                    type="text"
                    className="form-input"
                    value={form.responsible_name}
                    onChange={e => set('responsible_name', e.target.value)}
                    disabled={isEditing}
                    required
                  />
                  {isEditing && <span className="form-hint">Campo bloqueado após o cadastro.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="whatsapp">WhatsApp <span className="form-required">*</span></label>
                  <input
                    id="whatsapp"
                    type="text"
                    className="form-input"
                    placeholder="(00) 00000-0000"
                    value={form.whatsapp ?? ''}
                    onChange={e => set('whatsapp', formatWhatsApp(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    value={form.email ?? ''}
                    onChange={e => set('email', e.target.value)}
                    disabled={isEditing}
                  />
                  {isEditing && <span className="form-hint">Campo bloqueado após o cadastro.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="status">Status <span className="form-required">*</span></label>
                  <select
                    id="status"
                    className="form-input form-select"
                    value={form.status}
                    onChange={e => set('status', e.target.value as CompanyStatus)}
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

            </form>
          </div>
        )}
      </div>

      {/* ── Blocos 3–4 somente no modo de edição ─────────────── */}
      {isEditing && id && (
        <>
          {/* ── Bloco 3 — Documentos da empresa ──────────────── */}
          <div className="block-card">
            <div
              className={`block-card-header${openBlocks.docs ? ' block-card-header--open' : ''}`}
              onClick={() => toggleBlock('docs')}
              role="button"
              aria-expanded={openBlocks.docs}
            >
              <div className="block-card-title">
                <span className="block-card-num">3</span>
                Documentos da empresa
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {canEdit && (
                  <button
                    className="btn btn-primary"
                    style={{ height: 32, padding: '0 14px', fontSize: 13 }}
                    onClick={e => { e.stopPropagation(); openCompanyDocAdd() }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Adicionar documento
                  </button>
                )}
                <ChevronIcon open={openBlocks.docs} />
              </div>
            </div>

            {openBlocks.docs && (
              <div className="block-card-body">
                {docsError && <div className="alert alert-error">{docsError}</div>}
                {loadingDocs ? (
                  <div className="table-loading"><div className="spinner" /></div>
                ) : companyDocs.length === 0 ? (
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <p>Nenhum documento da empresa cadastrado.</p>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, textAlign: 'center' }}>
                      Contratos sociais, alvarás, certidões e demais documentos corporativos estarão disponíveis aqui.
                    </span>
                    {canEdit && <button className="btn btn-primary" onClick={openCompanyDocAdd}>Adicionar primeiro documento</button>}
                  </div>
                ) : (
                  <>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Documento</th>
                            <th>Status</th>
                            <th>Etapa</th>
                            <th>Emissão</th>
                            <th>Vencimento</th>
                            <th>Arquivo</th>
                            <th>Observações</th>
                            {canEdit && <th></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {companyDocs.map(doc => (
                            <tr key={doc.id}>
                              <td className="td-primary">{doc.document_types?.name ?? 'Documento'}</td>
                              <td>
                                <span className={`badge ${doc.status === 'valid' ? 'badge--active' : doc.status === 'pending' ? 'badge--pending' : 'badge--inactive'}`}>
                                  {DOCUMENT_STATUS_LABELS[doc.status]}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${doc.workflow_status === 'approved' ? 'badge--active' : doc.workflow_status === 'rejected' ? 'badge--inactive' : 'badge--pending'}`}>
                                  {WORKFLOW_STATUS_LABELS[doc.workflow_status]}
                                </span>
                              </td>
                              <td className="td-muted">{doc.issue_date ? new Date(`${doc.issue_date}T00:00:00`).toLocaleDateString('pt-BR') : '—'}</td>
                              <td className="td-muted">{doc.expiration_date ? new Date(`${doc.expiration_date}T00:00:00`).toLocaleDateString('pt-BR') : '—'}</td>
                              <td>{doc.external_file_url ? <button type="button" className="link-external link-button" onClick={() => handleDownloadCompanyDocument(doc.external_file_url!)}>Baixar</button> : <span className="td-muted">—</span>}</td>
                              <td className="td-muted td-note">{doc.notes || '—'}</td>
                              {canEdit && (
                                <td className="td-actions">
                                  <button className="btn-icon" onClick={() => navigate(`/empresas/${id}/documentos/${doc.id}/editar`)}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Editar
                                  </button>
                                  <button
                                    className="btn-icon btn-icon--success"
                                    disabled={quickActing === doc.id}
                                    onClick={() => handleDocQuickAction(doc.id, 'valid', 'homologation')}
                                    title="Validar documento"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Validar
                                  </button>
                                  <button
                                    className="btn-icon btn-icon--danger"
                                    disabled={quickActing === doc.id}
                                    onClick={() => handleDocQuickAction(doc.id, 'invalid', 'rejected')}
                                    title="Invalidar documento"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                    Invalidar
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="op-count" style={{ marginTop: 12 }}>
                      {companyDocs.length} documento{companyDocs.length !== 1 ? 's' : ''} cadastrado{companyDocs.length !== 1 ? 's' : ''}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Bloco 4 — Histórico operacional ──────────────── */}
          <div className="block-card">
            <div
              className={`block-card-header${openBlocks.history ? ' block-card-header--open' : ''}`}
              onClick={() => toggleBlock('history')}
              role="button"
              aria-expanded={openBlocks.history}
            >
              <div className="block-card-title">
                <span className="block-card-num">4</span>
                Histórico operacional
              </div>
              <ChevronIcon open={openBlocks.history} />
            </div>

            {openBlocks.history && (
              <div className="block-card-body">
                <ActivityTimeline
                  logs={logs}
                  loading={loadingLogs}
                  emptyMessage="Nenhuma ação registrada para esta empresa."
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Alertas e ações globais do formulário ────────────── */}
      {saveSuccess       && <div className="alert alert-success">Empresa salva com sucesso.</div>}
      {clientUserWarning && (
        <div className="alert alert-warning">
          Empresa criada com sucesso. Atenção: não foi possível criar o acesso do cliente — {clientUserWarning} Redirecionando em instantes...
        </div>
      )}
      <div className="form-actions form-actions--row">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/empresas')}>
          Cancelar
        </button>
        <button type="submit" form="company-form" className="btn btn-primary" disabled={loading}>
          {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar empresa'}
        </button>
      </div>

      {/* ── Modal — novo contrato (modo edição) ──────────────── */}
      {showNewContractModal && (
        <div className="modal-backdrop" onClick={() => !contractorSaving && setShowNewContractModal(false)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Novo contrato</span>
              <button className="modal-close" onClick={() => setShowNewContractModal(false)} disabled={contractorSaving}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {contractorSaveError && (
                <div className="alert alert-error" style={{ marginBottom: 12 }}>{contractorSaveError}</div>
              )}

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Contratante <span className="form-required">*</span></label>
                <select
                  className="form-input form-select"
                  value={contractorLinkForm.contractor_id}
                  onChange={e => {
                    const v = e.target.value
                    setContractorLinkForm(f => ({ ...f, contractor_id: v, segment_id: '' }))
                    fetchContractSeqPreview(v)
                  }}
                  autoFocus
                >
                  <option value="">Selecione</option>
                  {contractors.map(c => (
                    <option key={c.id} value={c.id}>{c.trade_name || c.corporate_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Segmento <span className="form-required">*</span></label>
                <select
                  className="form-input form-select"
                  value={contractorLinkForm.segment_id}
                  onChange={e => setContractorLinkForm(f => ({ ...f, segment_id: e.target.value }))}
                  disabled={!contractorLinkForm.contractor_id}
                >
                  <option value="">Selecione</option>
                  {segments.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {contractorLinkForm.contractor_id && (
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Nº do Contrato (prévia)</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontFamily: 'monospace' }}
                    value={contractSeqLoading
                      ? 'Calculando...'
                      : buildContractPreview(contractorLinkForm.contractor_id, contractSeqPreview, form.corporate_name)
                    }
                    disabled
                  />
                  <span className="form-hint">Gerado automaticamente ao salvar.</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input form-textarea"
                  rows={2}
                  value={contractorLinkForm.notes}
                  onChange={e => setContractorLinkForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewContractModal(false)} disabled={contractorSaving}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleContractorLinkSave} disabled={contractorSaving}>
                {contractorSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal — confirmação de inativação ────────────────── */}
      {inactivationConfirm && (
        <div className="modal-backdrop" onClick={() => !inactivating && setInactivationConfirm(null)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Inativar contrato</span>
              <button className="modal-close" onClick={() => setInactivationConfirm(null)} disabled={inactivating}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {inactivationError && (
                <div className="alert alert-error" style={{ marginBottom: 12 }}>{inactivationError}</div>
              )}
              <p style={{ marginBottom: 16, color: 'var(--text-secondary, #374151)' }}>
                Tem certeza que deseja inativar este contrato? Esta ação não poderá ser desfeita.
              </p>
              <div className="form-group">
                <label className="form-label">Motivo da inativação</label>
                <textarea
                  className="form-input form-textarea"
                  rows={3}
                  placeholder="Descreva o motivo (opcional)"
                  value={inactivationReason}
                  onChange={e => setInactivationReason(e.target.value)}
                  disabled={inactivating}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setInactivationConfirm(null)} disabled={inactivating}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--color-error, #dc2626)', borderColor: 'var(--color-error, #dc2626)' }}
                onClick={handleInactivate}
                disabled={inactivating}
              >
                {inactivating ? 'Inativando...' : 'Confirmar inativação'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
