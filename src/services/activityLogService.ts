import { supabase } from '../lib/supabase'
import type { ActivityLog, LogActivityParams } from '../types/activityLog'

// Fire-and-forget: nunca lança exceção para não bloquear a operação principal
export async function logActivity(params: LogActivityParams): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('activity_logs').insert({
    user_id: user?.id ?? null,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action_type: params.actionType,
    description: params.description,
    metadata: {
      user_email: user?.email ?? null,
      ...(params.metadata ?? {}),
    },
  })
}

export async function listActivitiesGlobal(options: {
  entityType?: string
  actionType?: string
  limit?: number
} = {}): Promise<ActivityLog[]> {
  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 100)

  if (options.entityType) query = query.eq('entity_type', options.entityType)
  if (options.actionType) query = query.eq('action_type', options.actionType)

  const { data, error } = await query
  if (error) throw error
  return data as ActivityLog[]
}

export async function listActivitiesForEntity(
  entityType: string,
  entityId: string,
  limit = 20,
): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as ActivityLog[]
}

// Busca logs diretos da empresa + logs de documentos da empresa via metadata.company_id
export async function listActivitiesForCompany(
  companyId: string,
  limit = 50,
): Promise<ActivityLog[]> {
  const [companyRes, docRes] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', 'company')
      .eq('entity_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', 'company_document')
      .filter('metadata->>company_id', 'eq', companyId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const all = [...(companyRes.data ?? []), ...(docRes.data ?? [])] as ActivityLog[]
  return all
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}

// Busca logs diretos do funcionário + logs de documentos via metadata.employee_id
export async function listActivitiesForEmployee(
  employeeId: string,
  limit = 30,
): Promise<ActivityLog[]> {
  const [empRes, docRes] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', 'employee')
      .eq('entity_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', 'employee_document')
      .filter('metadata->>employee_id', 'eq', employeeId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const all = [...(empRes.data ?? []), ...(docRes.data ?? [])] as ActivityLog[]
  return all
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}
