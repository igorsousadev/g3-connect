export type UserRole = 'admin' | 'operator' | 'specialist' | 'supervisor' | 'client'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:      'Administrador',
  operator:   'Operador',
  specialist: 'Especialista',
  supervisor: 'Supervisor',
  client:     'Cliente',
}

export interface Profile {
  id: string
  created_at: string
  full_name: string | null
  email: string
  role: UserRole
  company_id: string | null
  is_active: boolean
  password_reset_pending: boolean
  // joined via Supabase foreign key relation
  companies?: {
    corporate_name: string
    trade_name: string | null
  } | null
}

export interface ProfileUpdate {
  full_name?: string | null
  role?: UserRole
  company_id?: string | null
  is_active?: boolean
}
