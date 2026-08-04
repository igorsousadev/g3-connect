export interface Role {
  id: string
  created_at: string
  name: string
  description: string | null
  is_active: boolean
}

export type RoleInsert = Omit<Role, 'id' | 'created_at'>
export type RoleUpdate = Partial<RoleInsert>
