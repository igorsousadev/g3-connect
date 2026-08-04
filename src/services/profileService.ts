import { supabase } from '../lib/supabase'
import type { Profile, ProfileUpdate } from '../types/profile'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*, companies(corporate_name, trade_name)')
    .eq('id', userId)
    .maybeSingle()
  return data as Profile | null
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, companies(corporate_name, trade_name)')
    .order('full_name')
  if (error || !data) return []
  return data as Profile[]
}

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw new Error(error.message)
}
