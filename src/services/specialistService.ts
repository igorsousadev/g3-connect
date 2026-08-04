import { supabase } from '../lib/supabase'
import { updateWorkflowStatus } from './employeeDocumentService'
import { updateEmployeeDocument } from './employeeDocumentService'
import { updateCompanyDocument } from './companyDocumentService'
import type { DocumentStatus, WorkflowStatus } from '../types/employeeDocument'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const LEGACY_STATUS: Record<string, DocumentStatus> = {
  expiring: 'valid', rejected: 'invalid', submitted: 'pending',
}
const LEGACY_WORKFLOW: Record<string, WorkflowStatus> = {
  submitted: 'analysis', under_review: 'analysis',
  pending_specialist: 'homologation', submitted_to_contractor: 'sent',
}

export type SpecialistNextAction = 'sent' | 'approved' | 'rejected'

export interface SpecialistQueueItem {
  source: 'employee' | 'company'
  id: string
  employee_id: string
  company_id: string
  document_type_id: string
  status: DocumentStatus
  workflow_status: WorkflowStatus
  expiration_date: string | null
  issue_date: string | null
  external_file_url: string | null
  notes: string | null
  contractLabel: string | null
  contractorId: string | null
  contractorCode: string | null
  contractorTradeName: string | null
  contractSearch: string | null
  employees: {
    full_name: string
    cpf: string | null
    phone: string | null
    company_id: string
    companies: { corporate_name: string } | null
    roles: { name: string } | null
  } | null
  document_types: { name: string } | null
}

export async function loadSpecialistQueue(): Promise<SpecialistQueueItem[]> {
  const [employeeDocsRes, companyDocsRes, activeContractsRes] = await Promise.all([
    supabase
      .from('employee_documents')
      .select('id, employee_id, document_type_id, status, workflow_status, expiration_date, issue_date, external_file_url, notes, employees(full_name, cpf, phone, company_id, companies(corporate_name), roles(name)), document_types(name)')
      .in('workflow_status', ['homologation', 'sent', 'approved', 'rejected'])
      .order('workflow_status'),

    supabase
      .from('company_documents')
      .select('id, company_id, document_type_id, status, workflow_status, expiration_date, issue_date, external_file_url, notes, companies(corporate_name), document_types!inner(name, category)')
      .eq('document_types.category', 'Empresa')
      .in('workflow_status', ['homologation', 'sent', 'approved', 'rejected'])
      .order('workflow_status'),

    supabase
      .from('company_contractors')
      .select('company_id, contractor_id, contract_sequence, contract_number, contractors(code, trade_name, corporate_name)')
      .eq('status', 'active'),
  ])

  if (employeeDocsRes.error) throw employeeDocsRes.error
  if (companyDocsRes.error) throw companyDocsRes.error

  type ContractInfo = {
    contractLabel: string
    contractorId: string
    contractorCode: string
    contractorTradeName: string
    contractSearch: string
  }
  const contractsByCompany = new Map<string, ContractInfo>()
  for (const row of (activeContractsRes.data ?? [])) {
    const ct  = row.contractors as any
    const seq = row.contract_sequence.toString().padStart(4, '0')
    const code = ct?.code ?? ''
    contractsByCompany.set(row.company_id, {
      contractLabel:       `${seq}/${code}`,
      contractorId:        row.contractor_id,
      contractorCode:      code,
      contractorTradeName: ct?.trade_name ?? '',
      contractSearch:      [seq, code, ct?.trade_name ?? '', ct?.corporate_name ?? '', row.contract_number ?? ''].join(' ').toLowerCase(),
    })
  }

  const employeeItems = (employeeDocsRes.data ?? []).map(row => {
    const rawEmp = firstOrNull(row.employees as Array<{
      full_name: string
      cpf: string | null
      phone: string | null
      company_id: string
      companies: { corporate_name: string }[] | null
      roles: { name: string }[] | null
    }> | null | undefined)
    return {
      source: 'employee',
      id: row.id,
      employee_id: row.employee_id,
      company_id: rawEmp?.company_id ?? '',
      document_type_id: row.document_type_id,
      status: (LEGACY_STATUS[row.status] ?? row.status) as DocumentStatus,
      workflow_status: (LEGACY_WORKFLOW[row.workflow_status] ?? row.workflow_status) as WorkflowStatus,
      expiration_date: row.expiration_date,
      issue_date: row.issue_date,
      external_file_url: row.external_file_url,
      notes: row.notes,
      contractLabel:       contractsByCompany.get(rawEmp?.company_id ?? '')?.contractLabel       ?? null,
      contractorId:        contractsByCompany.get(rawEmp?.company_id ?? '')?.contractorId        ?? null,
      contractorCode:      contractsByCompany.get(rawEmp?.company_id ?? '')?.contractorCode      ?? null,
      contractorTradeName: contractsByCompany.get(rawEmp?.company_id ?? '')?.contractorTradeName ?? null,
      contractSearch:      contractsByCompany.get(rawEmp?.company_id ?? '')?.contractSearch      ?? null,
      employees: rawEmp ? {
        full_name: rawEmp.full_name,
        cpf: rawEmp.cpf,
        phone: rawEmp.phone,
        company_id: rawEmp.company_id,
        companies: firstOrNull(rawEmp.companies),
        roles: firstOrNull(rawEmp.roles),
      } : null,
      document_types: firstOrNull(row.document_types as { name: string }[] | null | undefined),
    } satisfies SpecialistQueueItem
  })

  const companyItems = (companyDocsRes.data ?? []).map(row => {
    const company = firstOrNull(row.companies as { corporate_name: string }[] | null | undefined)
    return {
      source: 'company',
      id: row.id,
      employee_id: '',
      company_id: row.company_id,
      document_type_id: row.document_type_id,
      status: (LEGACY_STATUS[row.status] ?? row.status) as DocumentStatus,
      workflow_status: (LEGACY_WORKFLOW[row.workflow_status] ?? row.workflow_status) as WorkflowStatus,
      expiration_date: row.expiration_date,
      issue_date: row.issue_date,
      external_file_url: row.external_file_url,
      notes: row.notes,
      contractLabel:       contractsByCompany.get(row.company_id)?.contractLabel       ?? null,
      contractorId:        contractsByCompany.get(row.company_id)?.contractorId        ?? null,
      contractorCode:      contractsByCompany.get(row.company_id)?.contractorCode      ?? null,
      contractorTradeName: contractsByCompany.get(row.company_id)?.contractorTradeName ?? null,
      contractSearch:      contractsByCompany.get(row.company_id)?.contractSearch      ?? null,
      employees: {
        full_name: 'Documento da empresa',
        cpf: null,
        phone: null,
        company_id: row.company_id,
        companies: company,
        roles: null,
      },
      document_types: firstOrNull(row.document_types as { name: string }[] | null | undefined),
    } satisfies SpecialistQueueItem
  })

  return [...employeeItems, ...companyItems].sort((a, b) =>
    a.workflow_status.localeCompare(b.workflow_status) ||
    (a.employees?.companies?.corporate_name ?? '').localeCompare(b.employees?.companies?.corporate_name ?? '') ||
    (a.employees?.full_name ?? '').localeCompare(b.employees?.full_name ?? '')
  )
}

export async function changeDocumentStatus(
  item: SpecialistQueueItem,
  nextAction: SpecialistNextAction,
  observation: string,
): Promise<void> {
  const newNotes = observation.trim()
    ? (item.notes ? `${item.notes}\n${observation.trim()}` : observation.trim())
    : item.notes

  if (item.source === 'company') {
    await updateCompanyDocument(item.id, {
      status: nextAction === 'rejected' ? 'invalid' : 'valid',
      workflow_status: nextAction,
      notes: newNotes,
    }, {
      actionType: nextAction === 'approved' ? 'approved' : nextAction === 'rejected' ? 'rejected' : 'status_changed',
      companyId: item.company_id,
      prevWorkflowStatus: item.workflow_status,
      observation: observation.trim() || undefined,
    })
    return
  }

  if (nextAction === 'sent') {
    await updateEmployeeDocument(item.id, {
      status: 'valid',
      notes: newNotes,
    })

    await updateWorkflowStatus(
      item.id,
      'sent',
      item.employee_id,
      item.workflow_status,
      observation.trim() || undefined,
    )

    return
  }

  if (nextAction === 'approved') {
    await updateEmployeeDocument(item.id, {
      status: 'valid',
      notes: newNotes,
    })

    await updateWorkflowStatus(
      item.id,
      'approved',
      item.employee_id,
      item.workflow_status,
      observation.trim() || undefined,
    )

    return
  }

  if (nextAction === 'rejected') {
    await updateEmployeeDocument(item.id, {
      status: 'invalid',
      notes: newNotes,
    })

    await updateWorkflowStatus(
      item.id,
      'rejected',
      item.employee_id,
      item.workflow_status,
      observation.trim() || undefined,
    )
  }
}
