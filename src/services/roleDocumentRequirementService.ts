import { supabase } from '../lib/supabase'
import { logActivity } from './activityLogService'
import type { RequirementWithDocumentType } from '../types/roleDocumentRequirement'

export async function listRequirementsByRole(roleId: string): Promise<RequirementWithDocumentType[]> {
  const { data, error } = await supabase
    .from('role_document_requirements')
    .select('*, document_types!inner(id, name, description, category, default_validity_days, is_required, is_company_required)')
    .eq('role_id', roleId)
    .eq('document_types.is_company_required', false)
    .order('created_at')
  if (error) throw error
  return data as RequirementWithDocumentType[]
}

// Retorna { [role_id]: count } para exibição rápida na listagem de funcionários
export async function getRequirementCountsByRole(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('role_document_requirements')
    .select('role_id, document_types!inner(is_company_required)')
    .eq('document_types.is_company_required', false)
  if (error) throw error
  const counts: Record<string, number> = {}
  data?.forEach(r => { counts[r.role_id] = (counts[r.role_id] ?? 0) + 1 })
  return counts
}

export async function addRequirement(roleId: string, documentTypeId: string): Promise<void> {
  const { data: documentType, error: documentTypeError } = await supabase
    .from('document_types')
    .select('is_company_required')
    .eq('id', documentTypeId)
    .single()
  if (documentTypeError) throw new Error('Documento não encontrado.')
  if (documentType.is_company_required) {
    throw new Error('Documentos obrigatórios para empresa não podem ser vinculados a cargos.')
  }

  const { error } = await supabase
    .from('role_document_requirements')
    .insert({ role_id: roleId, document_type_id: documentTypeId })
  if (error) {
    if (error.code === '23505') throw new Error('Este documento já está vinculado a este cargo.')
    throw new Error('Erro ao adicionar documento. Tente novamente.')
  }
  logActivity({
    entityType: 'checklist',
    entityId: roleId,
    actionType: 'updated',
    description: 'Documento adicionado ao checklist do cargo',
  }).catch(() => {})
}

export async function removeRequirement(id: string): Promise<void> {
  const { error } = await supabase
    .from('role_document_requirements')
    .delete()
    .eq('id', id)
  if (error) throw new Error('Erro ao remover documento. Tente novamente.')
  logActivity({
    entityType: 'checklist',
    entityId: id,
    actionType: 'updated',
    description: 'Documento removido do checklist',
  }).catch(() => {})
}
