import type { EntityStatus } from './common'

export type EmployeeStatus = EntityStatus

export interface Employee {
  id: string
  created_at: string
  created_by: string
  company_id: string
  full_name: string
  cpf: string
  role: string | null       // campo legado — mantido apenas para exibição de registros anteriores
  role_id: string | null    // FK para roles — obrigatório em novos registros
  phone: string | null
  status: EmployeeStatus
  notes: string | null
}

// role excluído do insert (deprecated). role_id é obrigatório em novos cadastros.
export interface EmployeeInsert {
  company_id: string
  full_name: string
  cpf: string
  role_id: string
  phone: string | null
  status: EmployeeStatus
  notes: string | null
}

export type EmployeeUpdate = Partial<EmployeeInsert>
