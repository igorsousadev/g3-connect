import { supabase } from '../lib/supabase'
import { logActivity } from './activityLogService'
import type { UserRole } from '../types/profile'

export interface CreateUserInput {
  full_name: string
  email: string
  role: UserRole
  company_id: string | null
  is_active: boolean
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()
  return data !== null
}

export async function createManagedUser(input: CreateUserInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: input,
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)

  const userId: string = data?.userId ?? 'unknown'

  await logActivity({
    entityType: 'user_profile',
    entityId: userId,
    actionType: 'created',
    description: `Usuário criado: ${input.full_name} (${input.email}) — perfil: ${input.role}`,
  })

  return userId
}
