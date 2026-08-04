import { supabase } from '../lib/supabase'
import { parseSupabaseError } from '../lib/errors'
import type { Role, RoleInsert, RoleUpdate } from '../types/role'

export async function listRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function listActiveRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function countActiveRoles(): Promise<number> {
  const { count, error } = await supabase
    .from('roles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  if (error) throw error
  return count ?? 0
}

export async function getRole(id: string): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createRole(role: RoleInsert): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .insert(role)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Já existe um cargo com este nome.')
  return data
}

export async function updateRole(id: string, role: RoleUpdate): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .update(role)
    .eq('id', id)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Já existe um cargo com este nome.')
  return data
}
