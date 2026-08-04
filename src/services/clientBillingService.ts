import { supabase } from '../lib/supabase'
import { logActivity } from './activityLogService'
import type { Company } from '../types/company'
import type { ClientBilling, ClientBillingInsert, ClientBillingUpdate, InvoiceStatus } from '../types/clientBilling'
import { INVOICE_STATUS_LABELS } from '../types/clientBilling'

export interface ClientManagementRow {
  company: Company
  employeeCount: number
  currentBilling: ClientBilling | null
}

export async function loadClientManagementData(): Promise<ClientManagementRow[]> {
  const [companiesRes, employeesRes, billingsRes] = await Promise.all([
    supabase.from('companies').select('*').order('corporate_name'),
    supabase.from('employees').select('company_id').eq('status', 'active'),
    // Load most recent pending/overdue billing per company
    supabase
      .from('client_billings')
      .select('*')
      .in('status', ['pending', 'overdue'])
      .order('reference_year',  { ascending: false })
      .order('reference_month', { ascending: false }),
  ])

  if (companiesRes.error) throw companiesRes.error
  if (employeesRes.error) throw employeesRes.error
  if (billingsRes.error)  throw billingsRes.error

  const countMap = new Map<string, number>()
  for (const e of (employeesRes.data ?? [])) {
    countMap.set(e.company_id, (countMap.get(e.company_id) ?? 0) + 1)
  }

  const billingMap = new Map<string, ClientBilling>()
  for (const b of (billingsRes.data ?? [])) {
    if (!billingMap.has(b.company_id)) {
      billingMap.set(b.company_id, b as ClientBilling)
    }
  }

  return (companiesRes.data ?? []).map(company => ({
    company:        company as Company,
    employeeCount:  countMap.get(company.id) ?? 0,
    currentBilling: billingMap.get(company.id) ?? null,
  }))
}

export async function createBilling(data: ClientBillingInsert): Promise<ClientBilling> {
  const { data: result, error } = await supabase
    .from('client_billings')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  logActivity({
    entityType: 'company',
    entityId:   data.company_id,
    actionType: 'created',
    description: `Cobrança criada: ${data.reference_month}/${data.reference_year} — R$ ${Number(data.amount).toFixed(2)}`,
    metadata: { billing_id: result.id, amount: data.amount },
  }).catch(() => {})
  return result as ClientBilling
}

export async function updateBilling(
  id: string,
  data: ClientBillingUpdate,
  companyId: string,
  description?: string,
): Promise<ClientBilling> {
  const { data: result, error } = await supabase
    .from('client_billings')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  if (description) {
    logActivity({
      entityType: 'company',
      entityId:   companyId,
      actionType: 'status_changed',
      description,
      metadata: { billing_id: id },
    }).catch(() => {})
  }
  return result as ClientBilling
}

export async function listBillingsByCompany(companyId: string): Promise<ClientBilling[]> {
  const { data, error } = await supabase
    .from('client_billings')
    .select('*')
    .eq('company_id', companyId)
    .order('reference_year',  { ascending: false })
    .order('reference_month', { ascending: false })
  if (error) throw error
  return data as ClientBilling[]
}

export async function updateCompanyFinancials(
  id: string,
  data: Record<string, unknown>,
  companyName: string,
): Promise<void> {
  const { error } = await supabase.from('companies').update(data).eq('id', id)
  if (error) throw error
  logActivity({
    entityType: 'company',
    entityId:   id,
    actionType: 'updated',
    description: `Dados financeiros de "${companyName}" atualizados`,
    metadata: { financial_update: true },
  }).catch(() => {})
}

export async function updateBillingInvoiceStatus(
  id: string,
  invoiceStatus: InvoiceStatus,
  companyId: string,
): Promise<ClientBilling> {
  return updateBilling(
    id,
    { invoice_status: invoiceStatus },
    companyId,
    `Status NF alterado para: ${INVOICE_STATUS_LABELS[invoiceStatus]}`,
  )
}
