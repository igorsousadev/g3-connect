import { supabase } from '../lib/supabase'
import { parseSupabaseError } from '../lib/errors'
import { logActivity } from './activityLogService'
import type { EmployeeDocument, EmployeeDocumentInsert, EmployeeDocumentUpdate, EmployeeDocumentFile, WorkflowStatus } from '../types/employeeDocument'
import { WORKFLOW_STATUS_LABELS } from '../types/employeeDocument'

interface DocUpdateHint {
  actionType?: 'updated' | 'approved' | 'rejected' | 'status_changed' | 'note_added'
  description?: string
  employeeId?: string
}

async function assertEmployeeDocumentType(documentTypeId: string): Promise<void> {
  const { data, error } = await supabase
    .from('document_types')
    .select('is_company_required')
    .eq('id', documentTypeId)
    .single()
  if (error) throw new Error('Tipo de documento não encontrado.')
  if (data.is_company_required) {
    throw new Error('Documentos obrigatórios para empresa não podem ser vinculados a funcionários.')
  }
}

export async function listEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
  const { data, error } = await supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function getEmployeeDocument(id: string): Promise<EmployeeDocument> {
  const { data, error } = await supabase
    .from('employee_documents')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function upsertEmployeeDocument(doc: EmployeeDocumentInsert): Promise<EmployeeDocument> {
  await assertEmployeeDocumentType(doc.document_type_id)

  const { data, error } = await supabase
    .from('employee_documents')
    .upsert(doc, { onConflict: 'employee_id,document_type_id' })
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Documento já cadastrado para este funcionário.')
  logActivity({
    entityType: 'employee_document',
    entityId: data.id,
    actionType: 'created',
    description: 'Documento registrado',
    metadata: { employee_id: doc.employee_id },
  }).catch(() => {})
  return data
}

export async function updateEmployeeDocument(
  id: string,
  doc: EmployeeDocumentUpdate,
  hint?: DocUpdateHint,
): Promise<EmployeeDocument> {
  if (doc.document_type_id) {
    await assertEmployeeDocumentType(doc.document_type_id)
  }

  const { data, error } = await supabase
    .from('employee_documents')
    .update(doc)
    .eq('id', id)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Erro ao atualizar documento.')
  logActivity({
    entityType: 'employee_document',
    entityId: id,
    actionType: hint?.actionType ?? 'updated',
    description: hint?.description ?? 'Documento atualizado',
    metadata: hint?.employeeId ? { employee_id: hint.employeeId } : undefined,
  }).catch(() => {})
  return data
}

export async function updateWorkflowStatus(
  id: string,
  newStatus: WorkflowStatus,
  employeeId: string,
  prevStatus?: WorkflowStatus,
  observation?: string,
): Promise<EmployeeDocument> {
  const updates: EmployeeDocumentUpdate = { workflow_status: newStatus }
  if (newStatus === 'approved') updates.status = 'valid'
  if (newStatus === 'rejected') updates.status = 'invalid'

  const { data, error } = await supabase
    .from('employee_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Erro ao atualizar etapa do workflow.')

  const prev = prevStatus ? WORKFLOW_STATUS_LABELS[prevStatus] : null
  const next  = WORKFLOW_STATUS_LABELS[newStatus]
  const desc  = prev
    ? `Etapa alterada: ${prev} → ${next}${observation ? ` — "${observation}"` : ''}`
    : `Etapa definida: ${next}${observation ? ` — "${observation}"` : ''}`

  logActivity({
    entityType: 'employee_document',
    entityId: id,
    actionType: newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'status_changed',
    description: desc,
    metadata: { employee_id: employeeId, workflow_status: newStatus, prev_workflow_status: prevStatus },
  }).catch(() => {})

  return data
}

export async function listDocumentFiles(documentId: string): Promise<EmployeeDocumentFile[]> {
  const { data, error } = await supabase
    .from('employee_document_files')
    .select('*')
    .eq('employee_document_id', documentId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function addDocumentFile(
  documentId: string,
  params: { file_url: string; file_name: string | null; file_path: string | null },
): Promise<EmployeeDocumentFile> {
  await supabase
    .from('employee_document_files')
    .update({ is_current: false })
    .eq('employee_document_id', documentId)
    .eq('is_current', true)

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('employee_document_files')
    .insert({
      employee_document_id: documentId,
      file_url:    params.file_url,
      file_name:   params.file_name,
      file_path:   params.file_path,
      is_current:  true,
      uploaded_by: user?.id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEmployeeDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('employee_documents')
    .delete()
    .eq('id', id)
  if (error) throw new Error('Erro ao remover documento. Tente novamente.')
}

export interface DocumentCounts {
  active:       number  // status = 'valid'
  pending:      number
  expired:      number  // expiration_date < hoje (tempo real)
  expiring:     number  // expiration_date entre hoje e +30 dias
  homologation: number  // workflow_status in ('analysis', 'homologation', 'sent')
  approved:     number  // workflow_status = 'approved'
  rejected:     number  // workflow_status = 'rejected'
}

export async function getDocumentCounts(): Promise<DocumentCounts> {
  const today           = new Date().toISOString().split('T')[0]
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [activeRes, pendingRes, expiredRes, expiringRes, homologationRes, approvedRes, rejectedRes] = await Promise.all([
    supabase
      .from('employee_documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'valid'),
    supabase
      .from('employee_documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('employee_documents')
      .select('*', { count: 'exact', head: true })
      .not('expiration_date', 'is', null)
      .lt('expiration_date', today),
    supabase
      .from('employee_documents')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'invalid')
      .gte('expiration_date', today)
      .lte('expiration_date', thirtyDaysLater),
    supabase
      .from('employee_documents')
      .select('*', { count: 'exact', head: true })
      .in('workflow_status', ['analysis', 'homologation', 'sent']),
    supabase
      .from('employee_documents')
      .select('*', { count: 'exact', head: true })
      .eq('workflow_status', 'approved'),
    supabase
      .from('employee_documents')
      .select('*', { count: 'exact', head: true })
      .eq('workflow_status', 'rejected'),
  ])

  return {
    active:       activeRes.count       ?? 0,
    pending:      pendingRes.count      ?? 0,
    expired:      expiredRes.count      ?? 0,
    expiring:     expiringRes.count     ?? 0,
    homologation: homologationRes.count ?? 0,
    approved:     approvedRes.count     ?? 0,
    rejected:     rejectedRes.count     ?? 0,
  }
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export interface DocumentOverviewItem {
  id: string
  employee_id: string
  document_type_id: string
  status: string
  expiration_date: string | null
  issue_date: string | null
  external_file_url: string | null
  notes: string | null
  employees: { full_name: string; company_id: string } | null
  document_types: { name: string } | null
}

export async function listDocumentsForOverview(
  statusFilter?: string,
  companyId?: string,
): Promise<DocumentOverviewItem[]> {
  let query = supabase
    .from('employee_documents')
    .select('id, employee_id, document_type_id, status, expiration_date, issue_date, external_file_url, notes, employees(full_name, company_id), document_types(name)')
    .order('expiration_date', { ascending: true, nullsFirst: false })

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) throw error

  let items: DocumentOverviewItem[] = (data ?? []).map(row => ({
    id: row.id,
    employee_id: row.employee_id,
    document_type_id: row.document_type_id,
    status: row.status,
    expiration_date: row.expiration_date,
    issue_date: row.issue_date,
    external_file_url: row.external_file_url,
    notes: row.notes,
    employees: firstOrNull(row.employees as { full_name: string; company_id: string }[] | null | undefined),
    document_types: firstOrNull(row.document_types as { name: string }[] | null | undefined),
  }))

  if (companyId) {
    items = items.filter(item => item.employees?.company_id === companyId)
  }

  return items
}
