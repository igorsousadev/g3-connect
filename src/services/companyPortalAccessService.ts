import { supabase } from '../lib/supabase'
import { logActivity } from './activityLogService'
import type { CompanyPortalAccess, CompanyPortalAccessInsert, CompanyPortalAccessUpdate } from '../types/companyPortalAccess'

export async function listPortalAccesses(companyId: string): Promise<CompanyPortalAccess[]> {
  const { data, error } = await supabase
    .from('company_portal_access')
    .select('*')
    .eq('company_id', companyId)
    .order('contractor_name')
  if (error) throw error
  return data as CompanyPortalAccess[]
}

export async function createPortalAccess(data: CompanyPortalAccessInsert): Promise<CompanyPortalAccess> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: result, error } = await supabase
    .from('company_portal_access')
    .insert({ ...data, created_by: user?.id ?? null, updated_by: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  logActivity({
    entityType: 'company',
    entityId:   data.company_id,
    actionType: 'created',
    description: `Acesso ao portal "${data.contractor_name}" cadastrado`,
    metadata: { portal_access_id: result.id, contractor_name: data.contractor_name },
  }).catch(() => {})
  return result as CompanyPortalAccess
}

export async function updatePortalAccess(
  id: string,
  data: CompanyPortalAccessUpdate,
  companyId: string,
  contractorName: string,
): Promise<CompanyPortalAccess> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: result, error } = await supabase
    .from('company_portal_access')
    .update({ ...data, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  logActivity({
    entityType: 'company',
    entityId:   companyId,
    actionType: 'updated',
    description: `Acesso ao portal "${contractorName}" atualizado`,
    metadata: { portal_access_id: id },
  }).catch(() => {})
  return result as CompanyPortalAccess
}

export async function deletePortalAccess(
  id: string,
  companyId: string,
  contractorName: string,
): Promise<void> {
  const { error } = await supabase.from('company_portal_access').delete().eq('id', id)
  if (error) throw error
  logActivity({
    entityType: 'company',
    entityId:   companyId,
    actionType: 'deleted',
    description: `Acesso ao portal "${contractorName}" removido`,
    metadata: { portal_access_id: id },
  }).catch(() => {})
}

export async function recordPortalAccess(
  id: string,
  companyId: string,
  contractorName: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase
    .from('company_portal_access')
    .update({ last_access_at: new Date().toISOString(), updated_by: user?.id ?? null })
    .eq('id', id)
  logActivity({
    entityType: 'company',
    entityId:   companyId,
    actionType: 'status_changed',
    description: `Portal "${contractorName}" acessado`,
    metadata: { portal_access_id: id },
  }).catch(() => {})
}
