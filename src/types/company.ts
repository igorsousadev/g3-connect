import type { EntityStatus } from './common'

export type CompanyStatus = EntityStatus

export interface Company {
  id: string
  created_at: string
  created_by: string
  corporate_name: string
  trade_name: string | null
  cnpj: string
  responsible_name: string
  whatsapp: string | null
  email: string | null
  status: CompanyStatus
  notes: string | null
  // Financial / billing fields
  monthly_fee: number | null
  billing_day: number | null
  payment_method: string | null
  contract_start_date: string | null
  contract_status: string | null
  plan_name: string | null
  invoice_required: boolean
  invoice_email: string | null
  financial_notes: string | null
}

export type CompanyInsert = Omit<Company, 'id' | 'created_at' | 'created_by'>
export type CompanyUpdate = Partial<CompanyInsert>
