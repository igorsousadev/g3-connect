import { supabase } from '../lib/supabase'
import { computeDocumentStatus, getDaysUntilExpiry, getLastNote } from '../lib/documentUtils'
import { logActivity } from './activityLogService'
import { uploadFileToDropbox } from './dropboxService'
import { buildEmployeeDocumentDropboxPath, buildCompanyDocumentDropboxPath } from '../lib/dropboxPaths'
import type { DocumentStatus } from '../types/employeeDocument'
import type { ActivityLog } from '../types/activityLog'
import type {
  ClientSummary,
  ClientEmployee,
  ClientDoc,
  ClientPendingItem,
  DocHealth,
} from '../types/clientPortal'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const ALLOWED_DOC_STATUSES: readonly string[] = ['valid', 'expiring', 'expired', 'rejected', 'pending', 'submitted']
function normalizeDocumentStatus(s: string | null | undefined): DocumentStatus {
  if (s && ALLOWED_DOC_STATUSES.includes(s)) return s as DocumentStatus
  return 'pending'
}

export async function getClientLinkedCompany(
  userId: string,
): Promise<{ company_id: string; company_name: string } | null> {
  const { data, error } = await supabase
    .from('client_companies')
    .select('company_id, companies(corporate_name, trade_name)')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null

  const co = firstOrNull(data.companies as { corporate_name: string; trade_name: string | null }[] | null | undefined)
  return {
    company_id: data.company_id,
    company_name: co?.trade_name ?? co?.corporate_name ?? 'Empresa',
  }
}

export async function getClientSummary(companyId: string): Promise<ClientSummary> {
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'active')

  const employeeIds = (employees ?? []).map((e: { id: string }) => e.id)
  const totalEmployees = employeeIds.length

  const [empDocsResult, compDocsResult] = await Promise.all([
    employeeIds.length > 0
      ? supabase.from('employee_documents').select('employee_id, status, expiration_date').in('employee_id', employeeIds)
      : Promise.resolve({ data: [] as { employee_id: string; status: string; expiration_date: string | null }[] }),
    supabase.from('company_documents').select('status, expiration_date').eq('company_id', companyId),
  ])

  let validDocs = 0, pendingDocs = 0, expiringDocs = 0, expiredDocs = 0
  const irregularSet = new Set<string>()

  for (const doc of (empDocsResult.data ?? []) as { employee_id: string; status: string; expiration_date: string | null }[]) {
    const s = computeDocumentStatus(doc.expiration_date, normalizeDocumentStatus(doc.status))
    const days = getDaysUntilExpiry(doc.expiration_date)
    const isExpiring = s === 'valid' && days !== null && days >= 0 && days <= 30

    if (isExpiring)           { expiringDocs++;  irregularSet.add(doc.employee_id) }
    else if (s === 'valid')   { validDocs++ }
    else if (s === 'pending') { pendingDocs++;   irregularSet.add(doc.employee_id) }
    else if (s === 'expired') { expiredDocs++;   irregularSet.add(doc.employee_id) }
    else if (s === 'invalid') { irregularSet.add(doc.employee_id) }
  }

  for (const doc of (compDocsResult.data ?? []) as { status: string; expiration_date: string | null }[]) {
    const s = computeDocumentStatus(doc.expiration_date, normalizeDocumentStatus(doc.status))
    const days = getDaysUntilExpiry(doc.expiration_date)
    const isExpiring = s === 'valid' && days !== null && days >= 0 && days <= 30

    if (isExpiring)           expiringDocs++
    else if (s === 'valid')   validDocs++
    else if (s === 'pending') pendingDocs++
    else if (s === 'expired') expiredDocs++
  }

  return { totalEmployees, validDocs, pendingDocs, expiringDocs, expiredDocs, irregularEmployees: irregularSet.size }
}

export async function getClientEmployees(companyId: string): Promise<ClientEmployee[]> {
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, role, roles(name)')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('full_name')

  if (!employees || employees.length === 0) return []

  const employeeIds = employees.map((e: { id: string }) => e.id)

  const { data: docs } = await supabase
    .from('employee_documents')
    .select('employee_id, status, expiration_date')
    .in('employee_id', employeeIds)

  const docsByEmployee = new Map<string, { status: string; expiration_date: string | null }[]>()
  for (const doc of docs ?? []) {
    if (!docsByEmployee.has(doc.employee_id)) docsByEmployee.set(doc.employee_id, [])
    docsByEmployee.get(doc.employee_id)!.push(doc)
  }

  return employees.map((emp: { id: string; full_name: string; role: string | null; roles: unknown }) => {
    const empDocs = docsByEmployee.get(emp.id) ?? []
    let validDocs = 0, pendingDocs = 0, expiringDocs = 0, expiredDocs = 0, rejectedDocs = 0

    for (const doc of empDocs) {
      const s = computeDocumentStatus(doc.expiration_date, normalizeDocumentStatus(doc.status))
      const days = getDaysUntilExpiry(doc.expiration_date)
      const isExpiring = s === 'valid' && days !== null && days >= 0 && days <= 30

      if (isExpiring)           expiringDocs++
      else if (s === 'valid')   validDocs++
      else if (s === 'pending') pendingDocs++
      else if (s === 'expired') expiredDocs++
      else if (s === 'invalid') rejectedDocs++
    }

    const health: DocHealth =
      expiredDocs > 0 || rejectedDocs > 0 ? 'critical' :
      expiringDocs > 0 || pendingDocs > 0 ? 'warning' : 'ok'

    const roleObj = emp.roles as { name: string } | null
    return {
      id: emp.id,
      fullName: emp.full_name,
      roleName: roleObj?.name ?? emp.role ?? null,
      totalDocs: empDocs.length,
      validDocs,
      pendingDocs,
      expiringDocs,
      expiredDocs,
      rejectedDocs,
      health,
    }
  })
}

export async function getClientEmployeeDocs(
  employeeId: string,
  companyId: string,
): Promise<{ employee: { full_name: string; role: string | null }; docs: ClientDoc[] } | null> {
  const { data: emp } = await supabase
    .from('employees')
    .select('id, full_name, role, roles(name)')
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!emp) return null

  const { data: docs } = await supabase
    .from('employee_documents')
    .select('id, status, workflow_status, issue_date, expiration_date, notes, external_file_url, document_types(name)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: true })

  const roleObj = firstOrNull(emp.roles as { name: string }[] | null | undefined)
  const clientDocs: ClientDoc[] = (docs ?? []).map((doc: {
    id: string
    status: string
    workflow_status: string | null
    issue_date: string | null
    expiration_date: string | null
    notes: string | null
    external_file_url: string | null
    document_types: unknown
  }) => {
    const dt = doc.document_types as { name: string } | null
    return {
      id: doc.id,
      documentTypeName: dt?.name ?? 'Documento',
      status: computeDocumentStatus(doc.expiration_date, normalizeDocumentStatus(doc.status)),
      workflowStatus: doc.workflow_status ?? null,
      issueDate: doc.issue_date,
      expirationDate: doc.expiration_date,
      daysUntilExpiry: getDaysUntilExpiry(doc.expiration_date),
      notes: getLastNote(doc.notes),
      externalFileUrl: doc.external_file_url ?? null,
    }
  })

  return {
    employee: { full_name: emp.full_name, role: roleObj?.name ?? emp.role ?? null },
    docs: clientDocs,
  }
}

export async function getClientPending(companyId: string, companyName = 'Empresa'): Promise<ClientPendingItem[]> {
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('company_id', companyId)
    .eq('status', 'active')

  const employeeIds = (employees ?? []).map((e: { id: string }) => e.id)
  const nameMap = new Map((employees ?? []).map((e: { id: string; full_name: string }) => [e.id, e.full_name]))

  const [empDocsResult, compDocsResult] = await Promise.all([
    employeeIds.length > 0
      ? supabase.from('employee_documents').select('id, employee_id, status, expiration_date, document_types(name)').in('employee_id', employeeIds)
      : Promise.resolve({ data: [] as { id: string; employee_id: string; status: string; expiration_date: string | null; document_types: unknown }[] }),
    supabase.from('company_documents').select('id, status, expiration_date, document_types(name)').eq('company_id', companyId),
  ])

  const items: ClientPendingItem[] = []

  for (const doc of (empDocsResult.data ?? []) as { id: string; employee_id: string; status: string; expiration_date: string | null; document_types: unknown }[]) {
    const s = computeDocumentStatus(doc.expiration_date, normalizeDocumentStatus(doc.status))
    const days = getDaysUntilExpiry(doc.expiration_date)
    const isExpiring = s === 'valid' && days !== null && days >= 0 && days <= 30
    const effectiveStatus: string = isExpiring ? 'expiring' : s

    if (!['pending', 'expiring', 'expired', 'rejected', 'submitted', 'invalid'].includes(effectiveStatus)) continue

    const dt = firstOrNull(doc.document_types as { name: string }[] | null | undefined)
    items.push({
      docId: doc.id,
      employeeId: doc.employee_id,
      employeeName: nameMap.get(doc.employee_id) ?? '—',
      documentTypeName: dt?.name ?? 'Documento',
      status: effectiveStatus,
      expirationDate: doc.expiration_date,
      daysUntilExpiry: days,
      origin: 'employee',
    })
  }

  for (const doc of (compDocsResult.data ?? []) as { id: string; status: string; expiration_date: string | null; document_types: unknown }[]) {
    const s = computeDocumentStatus(doc.expiration_date, normalizeDocumentStatus(doc.status))
    const days = getDaysUntilExpiry(doc.expiration_date)
    const isExpiring = s === 'valid' && days !== null && days >= 0 && days <= 30
    const effectiveStatus: string = isExpiring ? 'expiring' : s

    if (!['pending', 'expiring', 'expired', 'invalid'].includes(effectiveStatus)) continue

    const dt = firstOrNull(doc.document_types as { name: string }[] | null | undefined)
    items.push({
      docId: doc.id,
      employeeId: '',
      employeeName: companyName,
      documentTypeName: dt?.name ?? 'Documento',
      status: effectiveStatus,
      expirationDate: doc.expiration_date,
      daysUntilExpiry: days,
      origin: 'company',
    })
  }

  const order: Record<string, number> = { expired: 0, expiring: 1, pending: 2, invalid: 3, rejected: 4, submitted: 5 }
  items.sort((a, b) => {
    const diff = (order[a.status] ?? 6) - (order[b.status] ?? 6)
    if (diff !== 0) return diff
    if (a.daysUntilExpiry !== null && b.daysUntilExpiry !== null) return a.daysUntilExpiry - b.daysUntilExpiry
    return 0
  })

  return items
}

export async function uploadClientEmployeeDoc(params: {
  docId: string
  employeeId: string
  companyId: string
  file: File
  documentTypeName: string
  workflowStatus: string | null
  issueDate: string | null
}): Promise<void> {
  const { docId, employeeId, companyId, file, documentTypeName, workflowStatus, issueDate } = params

  // Verificar que o funcionário pertence à empresa logada e que o upload é permitido
  const { data: emp, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (empError || !emp) throw new Error('Funcionário não encontrado ou sem permissão.')

  const { data: currentDoc } = await supabase
    .from('employee_documents')
    .select('workflow_status')
    .eq('id', docId)
    .eq('employee_id', employeeId)
    .maybeSingle()

  const BLOCKED = ['analysis', 'homologation', 'sent']
  if (currentDoc?.workflow_status && BLOCKED.includes(currentDoc.workflow_status)) {
    throw new Error('Este documento já está em análise e não pode receber novos anexos no momento.')
  }

  const dropboxPath = buildEmployeeDocumentDropboxPath({
    companyId,
    employeeId,
    documentTypeSlug: documentTypeName,
    fileName: file.name,
    issueDate,
  })

  const result = await uploadFileToDropbox({ file, path: dropboxPath })

  const { error: updateError } = await supabase
    .from('employee_documents')
    .update({
      external_file_url: result.dropbox_path,
      status: 'valid',
      workflow_status: 'analysis',
      issue_date: null,
      expiration_date: null,
    })
    .eq('id', docId)
    .eq('employee_id', employeeId)

  if (updateError) throw new Error('Erro ao salvar documento. Tente novamente.')

  logActivity({
    entityType: 'employee_document',
    entityId: docId,
    actionType: 'updated',
    description: 'Documento enviado pelo portal da empresa',
    metadata: {
      employee_id: employeeId,
      company_id: companyId,
      workflow_status: 'analysis',
      prev_workflow_status: workflowStatus,
    },
  }).catch(() => {})
}

export async function uploadClientCompanyDoc(params: {
  docId: string
  companyId: string
  file: File
  documentTypeName: string
  workflowStatus: string | null
  issueDate: string | null
}): Promise<void> {
  const { docId, companyId, file, documentTypeName, workflowStatus, issueDate } = params

  // Verificar que o usuário logado está vinculado a esta empresa (via profiles, igual ao ClientRoute)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user?.id ?? '')
    .eq('company_id', companyId)
    .maybeSingle()

  if (!ownerProfile) throw new Error('Empresa não encontrada ou sem permissão.')

  const { data: currentDoc } = await supabase
    .from('company_documents')
    .select('workflow_status')
    .eq('id', docId)
    .eq('company_id', companyId)
    .maybeSingle()

  const BLOCKED = ['analysis', 'homologation', 'sent']
  if (currentDoc?.workflow_status && BLOCKED.includes(currentDoc.workflow_status)) {
    throw new Error('Este documento já está em análise e não pode receber novos anexos no momento.')
  }

  const dropboxPath = buildCompanyDocumentDropboxPath({
    companyId,
    documentTypeSlug: documentTypeName,
    fileName: file.name,
    issueDate,
  })

  const result = await uploadFileToDropbox({ file, path: dropboxPath })

  const { data: updated, error: updateError } = await supabase
    .from('company_documents')
    .update({
      external_file_url: result.dropbox_path,
      status: 'valid',
      workflow_status: 'analysis',
      issue_date: null,
      expiration_date: null,
    })
    .eq('id', docId)
    .eq('company_id', companyId)
    .select('id')

  if (updateError || !updated?.length) throw new Error('Erro ao salvar documento. Tente novamente.')

  logActivity({
    entityType: 'company_document',
    entityId: docId,
    actionType: 'updated',
    description: 'Documento da empresa enviado pelo portal da empresa',
    metadata: {
      company_id: companyId,
      workflow_status: 'analysis',
      prev_workflow_status: workflowStatus,
    },
  }).catch(() => {})
}

export async function getClientCompanyDocs(companyId: string): Promise<ClientDoc[]> {
  const { data: docs } = await supabase
    .from('company_documents')
    .select('id, status, workflow_status, issue_date, expiration_date, notes, external_file_url, document_types(name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  return (docs ?? []).map((doc: {
    id: string
    status: string
    workflow_status: string | null
    issue_date: string | null
    expiration_date: string | null
    notes: string | null
    external_file_url: string | null
    document_types: unknown
  }) => {
    const dt = firstOrNull(doc.document_types as { name: string }[] | null | undefined)
    return {
      id: doc.id,
      documentTypeName: dt?.name ?? 'Documento',
      status: computeDocumentStatus(doc.expiration_date, normalizeDocumentStatus(doc.status)),
      workflowStatus: doc.workflow_status ?? null,
      issueDate: doc.issue_date,
      expirationDate: doc.expiration_date,
      daysUntilExpiry: getDaysUntilExpiry(doc.expiration_date),
      notes: getLastNote(doc.notes),
      externalFileUrl: doc.external_file_url ?? null,
    }
  })
}

export async function getClientActivity(companyId: string, limit = 20): Promise<ActivityLog[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('company_id', companyId)

  const employeeIds = (employees ?? []).map((e: { id: string }) => e.id)

  const [compDocResult, empResult, docResult] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', 'company_document')
      .eq('user_id', user.id)
      .filter('metadata->>company_id', 'eq', companyId)
      .order('created_at', { ascending: false })
      .limit(limit),
    employeeIds.length > 0
      ? supabase
          .from('activity_logs')
          .select('*')
          .eq('entity_type', 'employee')
          .eq('user_id', user.id)
          .in('entity_id', employeeIds)
          .order('created_at', { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: null as ActivityLog[] | null }),
    employeeIds.length > 0
      ? supabase
          .from('activity_logs')
          .select('*')
          .eq('entity_type', 'employee_document')
          .eq('user_id', user.id)
          .filter('metadata->>employee_id', 'in', `(${employeeIds.join(',')})`)
          .order('created_at', { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: null as ActivityLog[] | null }),
  ])

  const all = [
    ...(compDocResult.data ?? []),
    ...(empResult.data ?? []),
    ...(docResult.data ?? []),
  ] as ActivityLog[]
  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return all.slice(0, limit)
}
