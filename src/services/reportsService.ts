import { supabase } from '../lib/supabase'
import { getDaysUntilExpiry } from '../lib/documentUtils'

// ─── Types ───────────────────────────────────────────────────

export interface ReportSummary {
  totalCompanies: number
  totalEmployees: number
  docs: {
    valid: number
    pending: number
    expiring: number
    expired: number
    submitted: number
    rejected: number
  }
  irregularEmployees: number
}

export interface CompanyRow {
  id: string
  name: string
  employees: number
  expired: number
  expiring: number
  pending: number
  rejected: number
  total: number
  health: 'ok' | 'warning' | 'critical'
}

export interface DocTypeRow {
  id: string
  name: string
  category: string | null
  total: number
  valid: number
  expiring: number
  expired: number
  pending: number
  rejected: number
}

export interface ExpiringDocRow {
  docId: string
  employeeId: string
  employeeName: string
  companyName: string
  documentTypeName: string
  expirationDate: string
  daysUntilExpiry: number
}

export interface ReportData {
  summary: ReportSummary
  companyRows: CompanyRow[]
  docTypeRows: DocTypeRow[]
  expiringRows: ExpiringDocRow[]
}

// ─── Service ─────────────────────────────────────────────────

export async function loadReportData(): Promise<ReportData> {
  const [allDocsRes, employeesRes, companiesCountRes] = await Promise.all([
    supabase
      .from('employee_documents')
      .select('id, employee_id, document_type_id, status, expiration_date, employees(full_name, company_id, companies(id, corporate_name)), document_types(id, name, category)'),
    supabase
      .from('employees')
      .select('id, company_id, companies(id, corporate_name)')
      .eq('status', 'active'),
    supabase
      .from('companies')
      .select('id', { count: 'exact', head: true }),
  ])

  if (allDocsRes.error)        throw allDocsRes.error
  if (employeesRes.error)      throw employeesRes.error
  if (companiesCountRes.error) throw companiesCountRes.error

  const allDocs        = (allDocsRes.data    ?? []) as any[]
  const employees      = (employeesRes.data  ?? []) as any[]
  const totalCompanies = companiesCountRes.count ?? 0

  // ─── Summary ─────────────────────────────────────────────
  const docsByStatus = { valid: 0, pending: 0, expiring: 0, expired: 0, submitted: 0, rejected: 0 }
  const irregularIds = new Set<string>()

  for (const doc of allDocs) {
    const s = doc.status as string
    if (s in docsByStatus) (docsByStatus as any)[s]++
    if (['expired', 'expiring', 'pending', 'rejected'].includes(s)) {
      irregularIds.add(doc.employee_id as string)
    }
  }

  const summary: ReportSummary = {
    totalCompanies,
    totalEmployees:      employees.length,
    docs:                docsByStatus,
    irregularEmployees:  irregularIds.size,
  }

  // ─── Company rows ─────────────────────────────────────────
  const companyMap = new Map<string, CompanyRow>()

  for (const emp of employees) {
    const company = emp.companies
    if (!company) continue
    if (!companyMap.has(emp.company_id)) {
      companyMap.set(emp.company_id, {
        id: emp.company_id, name: company.corporate_name,
        employees: 0, expired: 0, expiring: 0, pending: 0, rejected: 0, total: 0,
        health: 'ok',
      })
    }
    companyMap.get(emp.company_id)!.employees++
  }

  for (const doc of allDocs) {
    const emp = doc.employees
    if (!emp?.company_id) continue
    const row = companyMap.get(emp.company_id as string)
    if (!row) continue
    row.total++
    const s = doc.status as string
    if (s === 'expired')  row.expired++
    if (s === 'expiring') row.expiring++
    if (s === 'pending')  row.pending++
    if (s === 'rejected') row.rejected++
  }

  for (const row of companyMap.values()) {
    if (row.expired > 0 || row.rejected > 0)      row.health = 'critical'
    else if (row.expiring > 0 || row.pending > 0) row.health = 'warning'
  }

  const healthOrder = { critical: 0, warning: 1, ok: 2 } as const
  const companyRows = Array.from(companyMap.values()).sort((a, b) => {
    const hd = healthOrder[a.health] - healthOrder[b.health]
    return hd !== 0 ? hd : (b.expired + b.expiring) - (a.expired + a.expiring)
  })

  // ─── Doc type rows ─────────────────────────────────────────
  const docTypeMap = new Map<string, DocTypeRow>()

  for (const doc of allDocs) {
    const dtId   = doc.document_type_id as string
    const dtName = (doc.document_types as any)?.name ?? '—'
    if (!docTypeMap.has(dtId)) {
      const dtCategory = (doc.document_types as any)?.category ?? null
      docTypeMap.set(dtId, { id: dtId, name: dtName, category: dtCategory, total: 0, valid: 0, expiring: 0, expired: 0, pending: 0, rejected: 0 })
    }
    const row = docTypeMap.get(dtId)!
    row.total++
    const s = doc.status as string
    if (s === 'valid')    row.valid++
    if (s === 'expiring') row.expiring++
    if (s === 'expired')  row.expired++
    if (s === 'pending')  row.pending++
    if (s === 'rejected') row.rejected++
  }

  const docTypeRows = Array.from(docTypeMap.values()).sort((a, b) => b.total - a.total)

  // ─── Expiring rows (next 30 days) ─────────────────────────
  const expiringRows: ExpiringDocRow[] = allDocs
    .filter(doc => {
      if (!doc.expiration_date) return false
      if (['rejected', 'submitted'].includes(doc.status as string)) return false
      const days = getDaysUntilExpiry(doc.expiration_date)
      return days !== null && days >= 0 && days <= 30
    })
    .map(doc => {
      const emp = doc.employees as any
      return {
        docId:            doc.id as string,
        employeeId:       doc.employee_id as string,
        employeeName:     emp?.full_name ?? '—',
        companyName:      emp?.companies?.corporate_name ?? '—',
        documentTypeName: (doc.document_types as any)?.name ?? '—',
        expirationDate:   doc.expiration_date as string,
        daysUntilExpiry:  getDaysUntilExpiry(doc.expiration_date)!,
      }
    })
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  return { summary, companyRows, docTypeRows, expiringRows }
}
