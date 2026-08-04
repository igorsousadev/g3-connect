import { supabase } from '../lib/supabase'
import { logActivity } from './activityLogService'
import type { CompanyDocument, CompanyDocumentInsert, CompanyDocumentUpdate, CompanyDocumentWithType, CompanyDocumentFile } from '../types/companyDocument'
import type { DocumentType } from '../types/documentType'
import { WORKFLOW_STATUS_LABELS } from '../types/employeeDocument'
import type { WorkflowStatus } from '../types/employeeDocument'

interface CompanyDocUpdateHint {
  actionType?: 'updated' | 'approved' | 'rejected' | 'status_changed' | 'note_added'
  description?: string
  companyId?: string
  prevWorkflowStatus?: WorkflowStatus
  observation?: string
}

export async function listCompanyDocumentTypes(): Promise<DocumentType[]> {
  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .eq('category', 'Empresa')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function listRequiredCompanyDocumentTypes(): Promise<DocumentType[]> {
  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .eq('category', 'Empresa')
    .eq('is_company_required', true)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function listCompanyDocuments(companyId: string): Promise<CompanyDocumentWithType[]> {
  const { data, error } = await supabase
    .from('company_documents')
    .select('*, document_types(id, name, category, default_validity_days)')
    .eq('company_id', companyId)
    .order('created_at')
  if (error) throw error
  return data as CompanyDocumentWithType[]
}

export async function getCompanyDocument(id: string): Promise<CompanyDocument> {
  const { data, error } = await supabase
    .from('company_documents')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function upsertCompanyDocument(doc: CompanyDocumentInsert): Promise<CompanyDocument> {
  const { data: documentType, error: documentTypeError } = await supabase
    .from('document_types')
    .select('category')
    .eq('id', doc.document_type_id)
    .single()
  if (documentTypeError) throw new Error('Tipo de documento não encontrado.')
  if (documentType.category !== 'Empresa') {
    throw new Error('Apenas documentos da categoria Empresa podem ser vinculados à empresa.')
  }

  const { data, error } = await supabase
    .from('company_documents')
    .upsert(
      {
        status: 'pending',
        workflow_status: 'pending_client',
        issue_date: null,
        expiration_date: null,
        external_file_url: null,
        notes: null,
        ...doc,
      },
      { onConflict: 'company_id,document_type_id' },
    )
    .select()
    .single()
  if (error) throw new Error('Erro ao salvar documento da empresa.')

  logActivity({
    entityType: 'company_document',
    entityId: data.id,
    actionType: 'created',
    description: 'Documento da empresa registrado',
    metadata: { company_id: doc.company_id },
  }).catch(() => {})

  return data
}

export async function updateCompanyDocument(id: string, doc: CompanyDocumentUpdate, hint?: CompanyDocUpdateHint): Promise<CompanyDocument> {
  if (doc.document_type_id) {
    const { data: documentType, error: documentTypeError } = await supabase
      .from('document_types')
      .select('category')
      .eq('id', doc.document_type_id)
      .single()
    if (documentTypeError) throw new Error('Tipo de documento não encontrado.')
    if (documentType.category !== 'Empresa') {
      throw new Error('Apenas documentos da categoria Empresa podem ser vinculados à empresa.')
    }
  }

  const { data, error } = await supabase
    .from('company_documents')
    .update({ ...doc, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error('Erro ao atualizar documento da empresa.')

  const actionType = hint?.actionType ?? 'updated'
  const newWf = doc.workflow_status
  const prev = hint?.prevWorkflowStatus ? WORKFLOW_STATUS_LABELS[hint.prevWorkflowStatus] : null
  const next = newWf ? WORKFLOW_STATUS_LABELS[newWf] : null
  const obs  = hint?.observation ? ` — "${hint.observation}"` : ''
  const builtDescription = (prev && next)
    ? `Etapa alterada: ${prev} → ${next}${obs}`
    : actionType === 'approved'
      ? `Documento da empresa aprovado${obs}`
      : actionType === 'rejected'
        ? `Documento da empresa rejeitado${obs}`
        : 'Documento da empresa atualizado'
  const description = hint?.description ?? builtDescription

  logActivity({
    entityType: 'company_document',
    entityId: id,
    actionType,
    description,
    metadata: {
      ...(hint?.companyId            ? { company_id: hint.companyId }                           : {}),
      ...(newWf                      ? { workflow_status: newWf }                                : {}),
      ...(hint?.prevWorkflowStatus   ? { prev_workflow_status: hint.prevWorkflowStatus }         : {}),
    },
  }).catch(() => {})

  return data
}

export async function listCompanyDocumentFiles(documentId: string): Promise<CompanyDocumentFile[]> {
  const { data, error } = await supabase
    .from('company_document_files')
    .select('*')
    .eq('company_document_id', documentId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function addCompanyDocumentFile(
  documentId: string,
  params: { file_url: string; file_name: string | null; file_path: string | null },
): Promise<CompanyDocumentFile> {
  await supabase
    .from('company_document_files')
    .update({ is_current: false })
    .eq('company_document_id', documentId)
    .eq('is_current', true)

  const { data, error } = await supabase
    .from('company_document_files')
    .insert({
      company_document_id: documentId,
      file_url: params.file_url,
      file_name: params.file_name,
      file_path: params.file_path,
      is_current: true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCompanyDocument(id: string): Promise<void> {
  const { error } = await supabase.from('company_documents').delete().eq('id', id)
  if (error) throw new Error('Erro ao remover documento. Tente novamente.')
}

export async function createRequiredCompanyDocuments(companyId: string): Promise<void> {
  const requiredTypes = await listRequiredCompanyDocumentTypes()
  if (requiredTypes.length === 0) return

  const rows = requiredTypes.map(dt => ({
    company_id: companyId,
    document_type_id: dt.id,
    status: 'pending',
    workflow_status: 'pending_client',
    notes: 'Documento obrigatório da empresa gerado automaticamente.',
  }))

  const { error } = await supabase
    .from('company_documents')
    .upsert(rows, { onConflict: 'company_id,document_type_id', ignoreDuplicates: true })
  if (error) throw error
}
