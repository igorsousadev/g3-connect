import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientManagement } from '../../hooks/useClientManagement'
import { FilterCardsToggle } from '../../components/FilterCardsToggle'
import {
  createBilling,
  updateBilling,
  listBillingsByCompany,
  updateCompanyFinancials,
  updateBillingInvoiceStatus,
} from '../../services/clientBillingService'
import type { ClientManagementRow } from '../../services/clientBillingService'
import type { ClientBilling, ClientBillingInsert, InvoiceStatus } from '../../types/clientBilling'
import {
  BILLING_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  MONTHS_SHORT,
} from '../../types/clientBilling'

// ─── Helpers ──────────────────────────────────────────────
function formatCurrency(v: number | null | undefined): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatMonth(m: number, y: number): string {
  return `${MONTHS_SHORT[m - 1]}/${y}`
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const [y, mo, day] = d.split('-')
  return `${day}/${mo}/${y}`
}

// ─── Badges ───────────────────────────────────────────────
function BillingBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    pending:   'cm-badge cm-badge--b-pending',
    paid:      'cm-badge cm-badge--b-paid',
    overdue:   'cm-badge cm-badge--b-overdue',
    cancelled: 'cm-badge cm-badge--b-cancelled',
  }
  return <span className={cls[status] ?? 'cm-badge'}>{BILLING_STATUS_LABELS[status as keyof typeof BILLING_STATUS_LABELS] ?? status}</span>
}

function InvoiceBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    pending: 'cm-badge cm-badge--i-pending',
    issued:  'cm-badge cm-badge--i-issued',
    sent:    'cm-badge cm-badge--i-sent',
  }
  return <span className={cls[status] ?? 'cm-badge'}>{INVOICE_STATUS_LABELS[status as keyof typeof INVOICE_STATUS_LABELS] ?? status}</span>
}

function ContractBadge({ status }: { status: string | null }) {
  const s = status ?? 'active'
  const cls: Record<string, string> = {
    active:    'cm-badge cm-badge--c-active',
    inactive:  'cm-badge cm-badge--c-inactive',
    cancelled: 'cm-badge cm-badge--c-cancelled',
  }
  return <span className={cls[s] ?? 'cm-badge'}>{CONTRACT_STATUS_LABELS[s] ?? s}</span>
}

// ─── Form interfaces ───────────────────────────────────────
interface FinancialForm {
  monthly_fee:         string
  billing_day:         string
  payment_method:      string
  contract_start_date: string
  contract_status:     string
  plan_name:           string
  invoice_required:    string
  invoice_email:       string
  financial_notes:     string
}

interface BillingForm {
  reference_month: number
  reference_year:  number
  amount:          string
  due_date:        string
  notes:           string
}

type ModalState =
  | null
  | { kind: 'edit-financial';   row: ClientManagementRow }
  | { kind: 'billing-history';  companyId: string; companyName: string }
  | { kind: 'create-billing';   row: ClientManagementRow }
  | { kind: 'mark-paid';        billing: ClientBilling; companyId: string; companyName: string }

const EMPTY_FIN: FinancialForm = {
  monthly_fee: '', billing_day: '', payment_method: 'pix',
  contract_start_date: '', contract_status: 'active', plan_name: '',
  invoice_required: 'true', invoice_email: '', financial_notes: '',
}

// ─── Main page ─────────────────────────────────────────────
export function ClientManagementPage() {
  const navigate = useNavigate()
  const { rows, setRows, loading, error, refresh } = useClientManagement()

  const [search,          setSearch]          = useState('')
  const [filterContract,  setFilterContract]  = useState('')
  const [filterBilling,   setFilterBilling]   = useState('')
  const [filterDue,       setFilterDue]       = useState('')
  const [showFilterCards, setShowFilterCards] = useState(true)
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [modal,     setModal]     = useState<ModalState>(null)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [finForm,      setFinForm]      = useState<FinancialForm>(EMPTY_FIN)
  const [billingForm,  setBillingForm]  = useState<BillingForm>({ reference_month: new Date().getMonth() + 1, reference_year: new Date().getFullYear(), amount: '', due_date: '', notes: '' })
  const [paidAt,       setPaidAt]       = useState('')
  const [paidNotes,    setPaidNotes]    = useState('')
  const [historyRows,  setHistoryRows]  = useState<ClientBilling[]>([])
  const [historyLoad,  setHistoryLoad]  = useState(false)
  const [nfSaving,     setNfSaving]     = useState<string | null>(null)

  // ── Summary ─────────────────────────────────────────────
  const summary = useMemo(() => {
    const activeRows = rows.filter(r => (r.company.contract_status ?? 'active') === 'active')
    return {
      activeClients:    activeRows.length,
      totalEmployees:   rows.reduce((s, r) => s + r.employeeCount, 0),
      monthlyRevenue:   activeRows.reduce((s, r) => s + (r.company.monthly_fee ?? 0), 0),
      pendingBillings:  rows.filter(r => r.currentBilling?.status === 'pending').length,
      overdueBillings:  rows.filter(r => r.currentBilling?.status === 'overdue').length,
      pendingInvoices:  rows.filter(r => r.currentBilling?.invoice_status === 'pending' && r.currentBilling?.status !== 'cancelled').length,
    }
  }, [rows])

  // ── Filters ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now      = new Date()
    const today    = now.toISOString().split('T')[0]
    const weekLater = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]
    const q = search.toLowerCase()
    return rows.filter(r => {
      if (q && ![r.company.corporate_name, r.company.responsible_name, r.company.cnpj].join(' ').toLowerCase().includes(q)) return false
      if (filterContract && (r.company.contract_status ?? 'active') !== filterContract) return false
      if (filterBilling) {
        if (filterBilling === 'no-billing') { if (r.currentBilling) return false }
        else if (r.currentBilling?.status !== filterBilling) return false
      }
      if (filterDue === 'today' && r.currentBilling?.due_date !== today) return false
      if (filterDue === 'week') {
        const dd = r.currentBilling?.due_date
        if (!dd || dd < today || dd > weekLater) return false
      }
      return true
    })
  }, [rows, search, filterContract, filterBilling, filterDue])

  useEffect(() => { setPage(1) }, [search, filterContract, filterBilling, filterDue])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  const fmt = (v: number) => loading ? '...' : String(v)

  // ── Actions ──────────────────────────────────────────────
  function openEditFinancial(row: ClientManagementRow) {
    const c = row.company
    setFinForm({
      monthly_fee:         c.monthly_fee?.toString() ?? '',
      billing_day:         c.billing_day?.toString() ?? '',
      payment_method:      c.payment_method ?? 'pix',
      contract_start_date: c.contract_start_date ?? '',
      contract_status:     c.contract_status ?? 'active',
      plan_name:           c.plan_name ?? '',
      invoice_required:    c.invoice_required === false ? 'false' : 'true',
      invoice_email:       c.invoice_email ?? '',
      financial_notes:     c.financial_notes ?? '',
    })
    setSaveError(null)
    setModal({ kind: 'edit-financial', row })
  }

  async function saveFinancial() {
    if (!modal || modal.kind !== 'edit-financial') return
    setSaving(true); setSaveError(null)
    try {
      const data = {
        monthly_fee:         finForm.monthly_fee  ? Number(finForm.monthly_fee)  : null,
        billing_day:         finForm.billing_day  ? Number(finForm.billing_day)  : null,
        payment_method:      finForm.payment_method      || null,
        contract_start_date: finForm.contract_start_date || null,
        contract_status:     finForm.contract_status     || null,
        plan_name:           finForm.plan_name            || null,
        invoice_required:    finForm.invoice_required === 'true',
        invoice_email:       finForm.invoice_email        || null,
        financial_notes:     finForm.financial_notes      || null,
      }
      await updateCompanyFinancials(modal.row.company.id, data, modal.row.company.corporate_name)
      setRows(prev => prev.map(r =>
        r.company.id === modal.row.company.id ? { ...r, company: { ...r.company, ...data } } : r
      ))
      setModal(null)
    } catch { setSaveError('Erro ao salvar dados financeiros.') }
    finally   { setSaving(false) }
  }

  async function openBillingHistory(row: ClientManagementRow) {
    setHistoryRows([])
    setHistoryLoad(true)
    setModal({ kind: 'billing-history', companyId: row.company.id, companyName: row.company.corporate_name })
    try {
      setHistoryRows(await listBillingsByCompany(row.company.id))
    } catch { /* silent */ }
    finally { setHistoryLoad(false) }
  }

  function openCreateBilling(row: ClientManagementRow) {
    const now = new Date()
    setBillingForm({
      reference_month: now.getMonth() + 1,
      reference_year:  now.getFullYear(),
      amount:          row.company.monthly_fee?.toString() ?? '',
      due_date:        '',
      notes:           '',
    })
    setSaveError(null)
    setModal({ kind: 'create-billing', row })
  }

  async function saveBilling() {
    if (!modal || modal.kind !== 'create-billing') return
    if (!billingForm.amount) { setSaveError('Informe o valor da cobrança.'); return }
    setSaving(true); setSaveError(null)
    try {
      const payload: ClientBillingInsert = {
        company_id:      modal.row.company.id,
        reference_month: billingForm.reference_month,
        reference_year:  billingForm.reference_year,
        amount:          Number(billingForm.amount),
        due_date:        billingForm.due_date || null,
        status:          'pending',
        invoice_status:  'pending',
        invoice_number:  null,
        invoice_url:     null,
        paid_at:         null,
        notes:           billingForm.notes || null,
      }
      const created = await createBilling(payload)
      setRows(prev => prev.map(r =>
        r.company.id === modal.row.company.id && !r.currentBilling
          ? { ...r, currentBilling: created }
          : r
      ))
      setModal(null)
    } catch { setSaveError('Erro ao criar cobrança.') }
    finally   { setSaving(false) }
  }

  function openMarkPaid(billing: ClientBilling, row: ClientManagementRow) {
    setPaidAt(new Date().toISOString().split('T')[0])
    setPaidNotes('')
    setSaveError(null)
    setModal({ kind: 'mark-paid', billing, companyId: row.company.id, companyName: row.company.corporate_name })
  }

  async function saveMarkPaid() {
    if (!modal || modal.kind !== 'mark-paid') return
    setSaving(true); setSaveError(null)
    try {
      const updated = await updateBilling(
        modal.billing.id,
        { status: 'paid', paid_at: new Date(paidAt || Date.now()).toISOString(), notes: paidNotes || modal.billing.notes },
        modal.companyId,
        `Cobrança ${modal.billing.reference_month}/${modal.billing.reference_year} marcada como paga`,
      )
      setRows(prev => prev.map(r =>
        r.currentBilling?.id === modal.billing.id ? { ...r, currentBilling: updated } : r
      ))
      setModal(null)
    } catch { setSaveError('Erro ao registrar pagamento.') }
    finally   { setSaving(false) }
  }

  async function handleNfChange(billing: ClientBilling, companyId: string, status: InvoiceStatus) {
    setNfSaving(billing.id)
    try {
      const updated = await updateBillingInvoiceStatus(billing.id, status, companyId)
      setRows(prev => prev.map(r =>
        r.currentBilling?.id === billing.id ? { ...r, currentBilling: updated } : r
      ))
    } catch { /* silent */ }
    finally { setNfSaving(null) }
  }

  const closeModal = () => { setModal(null); setSaveError(null) }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Gestão de Clientes e Cobranças</h1>
          <p className="page-subtitle">Controle financeiro e operacional dos clientes</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <FilterCardsToggle visible={showFilterCards} onToggle={() => setShowFilterCards(v => !v)} />
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {showFilterCards && <div className="cards-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card stat-card--indigo">
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{fmt(summary.activeClients)}</span>
            <span className="stat-card-label">Clientes ativos</span>
          </div>
        </div>

        <div className="stat-card stat-card--violet">
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{fmt(summary.totalEmployees)}</span>
            <span className="stat-card-label">Funcionários monitorados</span>
          </div>
        </div>

        <div className="stat-card stat-card--teal">
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{loading ? '...' : formatCurrency(summary.monthlyRevenue)}</span>
            <span className="stat-card-label">Receita mensal prevista</span>
          </div>
        </div>

        <div
          className="stat-card stat-card--amber"
          style={{ cursor: 'pointer' }}
          onClick={() => setFilterBilling(filterBilling === 'pending' ? '' : 'pending')}
        >
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{fmt(summary.pendingBillings)}</span>
            <span className="stat-card-label">Cobranças pendentes</span>
          </div>
        </div>

        <div
          className="stat-card stat-card--red"
          style={{ cursor: 'pointer' }}
          onClick={() => setFilterBilling(filterBilling === 'overdue' ? '' : 'overdue')}
        >
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{fmt(summary.overdueBillings)}</span>
            <span className="stat-card-label">Cobranças vencidas</span>
          </div>
        </div>

        <div
          className="stat-card stat-card--orange"
          style={{ cursor: 'pointer' }}
          onClick={() => setFilterBilling(filterBilling === 'pending' ? '' : 'pending')}
        >
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{fmt(summary.pendingInvoices)}</span>
            <span className="stat-card-label">NFs pendentes</span>
          </div>
        </div>
      </div>}

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Filters */}
      <div className="toolbar toolbar--row" style={{ marginBottom: 16 }}>
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Buscar empresa, responsável, CNPJ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <select className="form-input form-select filter-select" value={filterContract} onChange={e => setFilterContract(e.target.value)}>
            <option value="">Todos os contratos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
        
        <div>
          <select className="form-input form-select filter-select" value={filterBilling} onChange={e => setFilterBilling(e.target.value)}>
            <option value="">Todas as cobranças</option>
            <option value="pending">Pendentes</option>
            <option value="overdue">Vencidas (inadimplentes)</option>
            <option value="paid">Pagas</option>
            <option value="cancelled">Canceladas</option>
            <option value="no-billing">Sem cobrança</option>
          </select>
        </div>
        
        <div>
          <select className="form-input form-select filter-select" value={filterDue} onChange={e => setFilterDue(e.target.value)}>
            <option value="">Todos os vencimentos</option>
            <option value="today">Vence hoje</option>
            <option value="week">Próximos 7 dias</option>
          </select>
        </div>

        {(search || filterContract || filterBilling || filterDue) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterContract(''); setFilterBilling(''); setFilterDue('') }}>
            Limpar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            <p>Nenhum cliente encontrado.</p>
          </div>
        ) : (
          <table className="table cm-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Responsável</th>
                <th style={{ textAlign: 'center' }}>Func.</th>
                <th>Valor/Mês</th>
                <th>Dia / Forma</th>
                <th>Contrato</th>
                <th>Cobrança</th>
                <th>NF</th>
                <th>Vencimento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(row => {
                const c  = row.company
                const b  = row.currentBilling
                const canPay = b?.status === 'pending' || b?.status === 'overdue'

                return (
                  <tr key={c.id}>
                    <td>
                      <div className="td-primary">{c.corporate_name}</div>
                      {c.plan_name && <div className="td-muted" style={{ fontSize: 11 }}>{c.plan_name}</div>}
                    </td>
                    <td className="td-muted">{c.responsible_name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="cm-count">{row.employeeCount}</span>
                    </td>
                    <td>
                      <span className="td-primary">{formatCurrency(c.monthly_fee)}</span>
                    </td>
                    <td className="td-muted">
                      {c.billing_day ? `Dia ${c.billing_day}` : '—'}
                      {c.payment_method && (
                        <div style={{ fontSize: 11 }}>{PAYMENT_METHOD_LABELS[c.payment_method] ?? c.payment_method}</div>
                      )}
                    </td>
                    <td><ContractBadge status={c.contract_status} /></td>
                    <td>
                      {b ? <BillingBadge status={b.status} /> : <span className="td-muted">—</span>}
                      {b && <div className="td-muted" style={{ fontSize: 11, marginTop: 2 }}>{formatMonth(b.reference_month, b.reference_year)}</div>}
                    </td>
                    <td>
                      {b ? (
                        <select
                          className="cm-nf-select"
                          value={b.invoice_status}
                          disabled={nfSaving === b.id}
                          onChange={e => handleNfChange(b, c.id, e.target.value as InvoiceStatus)}
                        >
                          <option value="pending">Pendente</option>
                          <option value="issued">Emitida</option>
                          <option value="sent">Enviada</option>
                        </select>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>
                    <td>
                      {b?.due_date ? (
                        <span className={b.status === 'overdue' ? 'cm-due-overdue' : ''}>{formatDate(b.due_date)}</span>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="cm-actions">
                        <button className="btn-icon" onClick={() => openEditFinancial(row)} title="Editar dados financeiros">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          Financeiro
                        </button>
                        <button className="btn-icon" onClick={() => openBillingHistory(row)} title="Histórico de cobranças">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          Histórico
                        </button>
                        <button className="btn-icon" onClick={() => openCreateBilling(row)} title="Nova cobrança">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          Cobrar
                        </button>
                        {canPay && (
                          <button className="btn-icon btn-icon--approve" onClick={() => openMarkPaid(b!, row)} title="Marcar como pago">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            Pago
                          </button>
                        )}
                        <button className="btn-icon" onClick={() => navigate(`/empresas/${c.id}/editar`)} title="Editar empresa">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {filtered.length} empresa{filtered.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
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

      {/* ── MODAL: Edit Financial ──────────────────────── */}
      {modal?.kind === 'edit-financial' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Dados financeiros — {modal.row.company.corporate_name}</span>
              <button className="modal-close" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              {saveError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{saveError}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Valor mensal (R$)</label>
                  <input type="number" step="0.01" className="form-input" value={finForm.monthly_fee} onChange={e => setFinForm(f => ({ ...f, monthly_fee: e.target.value }))} placeholder="0,00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Dia de cobrança</label>
                  <input type="number" min="1" max="31" className="form-input" value={finForm.billing_day} onChange={e => setFinForm(f => ({ ...f, billing_day: e.target.value }))} placeholder="Ex: 10" />
                </div>
                <div className="form-group">
                  <label className="form-label">Forma de pagamento</label>
                  <select className="form-input form-select" value={finForm.payment_method} onChange={e => setFinForm(f => ({ ...f, payment_method: e.target.value }))}>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status do contrato</label>
                  <select className="form-input form-select" value={finForm.contract_status} onChange={e => setFinForm(f => ({ ...f, contract_status: e.target.value }))}>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Início do contrato</label>
                  <input type="date" className="form-input" value={finForm.contract_start_date} onChange={e => setFinForm(f => ({ ...f, contract_start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Plano / pacote</label>
                  <input type="text" className="form-input" value={finForm.plan_name} onChange={e => setFinForm(f => ({ ...f, plan_name: e.target.value }))} placeholder="Ex: Plano Básico" />
                </div>
                <div className="form-group">
                  <label className="form-label">Emite nota fiscal?</label>
                  <select className="form-input form-select" value={finForm.invoice_required} onChange={e => setFinForm(f => ({ ...f, invoice_required: e.target.value }))}>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail para NF</label>
                  <input type="email" className="form-input" value={finForm.invoice_email} onChange={e => setFinForm(f => ({ ...f, invoice_email: e.target.value }))} placeholder="financeiro@empresa.com" />
                </div>
                <div className="form-group form-group--span2">
                  <label className="form-label">Observações financeiras</label>
                  <textarea className="form-input form-textarea" rows={3} value={finForm.financial_notes} onChange={e => setFinForm(f => ({ ...f, financial_notes: e.target.value }))} placeholder="Observações internas sobre cobrança, contrato..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveFinancial} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Billing History ─────────────────────── */}
      {modal?.kind === 'billing-history' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Histórico de cobranças — {modal.companyName}</span>
              <button className="modal-close" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              {historyLoad ? (
                <div className="table-loading"><div className="spinner" /></div>
              ) : historyRows.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <p>Nenhuma cobrança registrada.</p>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mês/Ano</th>
                      <th>Valor</th>
                      <th>Vencimento</th>
                      <th>Cobrança</th>
                      <th>NF</th>
                      <th>Pago em</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map(b => (
                      <tr key={b.id}>
                        <td className="td-primary">{formatMonth(b.reference_month, b.reference_year)}</td>
                        <td>{formatCurrency(b.amount)}</td>
                        <td>{formatDate(b.due_date)}</td>
                        <td><BillingBadge status={b.status} /></td>
                        <td><InvoiceBadge status={b.invoice_status} /></td>
                        <td className="td-muted">{b.paid_at ? formatDate(b.paid_at.split('T')[0]) : '—'}</td>
                        <td className="td-muted td-note">{b.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Create Billing ──────────────────────── */}
      {modal?.kind === 'create-billing' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nova cobrança — {modal.row.company.corporate_name}</span>
              <button className="modal-close" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              {saveError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{saveError}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Mês</label>
                  <select className="form-input form-select" value={billingForm.reference_month} onChange={e => setBillingForm(f => ({ ...f, reference_month: Number(e.target.value) }))}>
                    {MONTHS_SHORT.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ano</label>
                  <input type="number" className="form-input" value={billingForm.reference_year} onChange={e => setBillingForm(f => ({ ...f, reference_year: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Valor (R$) <span className="form-required">*</span></label>
                  <input type="number" step="0.01" className="form-input" value={billingForm.amount} onChange={e => setBillingForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Vencimento</label>
                  <input type="date" className="form-input" value={billingForm.due_date} onChange={e => setBillingForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="form-group form-group--span2">
                  <label className="form-label">Observações</label>
                  <textarea className="form-input form-textarea" rows={2} value={billingForm.notes} onChange={e => setBillingForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações sobre esta cobrança..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveBilling} disabled={saving}>{saving ? 'Salvando...' : 'Criar cobrança'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Mark as Paid ────────────────────────── */}
      {modal?.kind === 'mark-paid' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Registrar pagamento</span>
              <button className="modal-close" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              {saveError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{saveError}</div>}
              <p style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-muted)' }}>
                {modal.companyName} — cobrança de {formatMonth(modal.billing.reference_month, modal.billing.reference_year)} ({formatCurrency(modal.billing.amount)})
              </p>
              <div className="form-group">
                <label className="form-label">Data do pagamento</label>
                <input type="date" className="form-input" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Observações</label>
                <textarea className="form-input form-textarea" rows={2} value={paidNotes} onChange={e => setPaidNotes(e.target.value)} placeholder="Ex: Pix recebido, comprovante #..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveMarkPaid} disabled={saving}>{saving ? 'Salvando...' : 'Confirmar pagamento'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
