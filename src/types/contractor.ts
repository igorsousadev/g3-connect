export type ContractorStatus = 'active' | 'inactive'

export interface Contractor {
  id: string
  corporate_name: string
  trade_name: string
  cnpj: string
  code: string
  responsible_name: string
  whatsapp: string
  email: string
  status: ContractorStatus
  notes: string
  created_at: string
  updated_at: string
}

export type ContractorInsert = Omit<Contractor, 'id' | 'created_at' | 'updated_at'>
export type ContractorUpdate = Partial<ContractorInsert>
