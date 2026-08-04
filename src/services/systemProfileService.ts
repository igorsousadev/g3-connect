import { supabase } from '../lib/supabase'
import { logActivity } from './activityLogService'

export interface SystemProfile {
  id: string
  name: string
  slug: string
  description: string | null
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SystemProfileInsert = {
  name: string
  slug: string
  description: string | null
}

export type SystemProfileUpdate = {
  name?: string
  description?: string | null
  is_active?: boolean
}

export async function listSystemProfiles(): Promise<SystemProfile[]> {
  const { data, error } = await supabase
    .from('system_profiles')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name')
  if (error || !data) return []
  return data as SystemProfile[]
}

export async function listActiveSystemProfiles(): Promise<SystemProfile[]> {
  const { data, error } = await supabase
    .from('system_profiles')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error || !data) return []
  return data as SystemProfile[]
}

export async function createSystemProfile(insert: SystemProfileInsert): Promise<void> {
  const { data, error } = await supabase
    .from('system_profiles')
    .insert({ ...insert, is_system: false, is_active: true })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  await logActivity({
    entityType: 'system_profile',
    entityId: data.id,
    actionType: 'created',
    description: `Perfil criado: ${insert.name} (${insert.slug})`,
  })
}

export async function updateSystemProfile(
  id: string,
  updates: SystemProfileUpdate,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from('system_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  await logActivity({
    entityType: 'system_profile',
    entityId: id,
    actionType: 'updated',
    description: `Perfil atualizado: ${name}`,
  })
}

export async function toggleSystemProfileActive(
  id: string,
  isActive: boolean,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from('system_profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  await logActivity({
    entityType: 'system_profile',
    entityId: id,
    actionType: 'status_changed',
    description: `Perfil ${isActive ? 'ativado' : 'desativado'}: ${name}`,
  })
}

export async function deleteSystemProfile(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('system_profiles')
    .delete()
    .eq('id', id)
    .eq('is_system', false)
  if (error) throw new Error(error.message)
  await logActivity({
    entityType: 'system_profile',
    entityId: id,
    actionType: 'deleted',
    description: `Perfil removido: ${name}`,
  })
}
