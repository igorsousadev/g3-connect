export interface CompanyContractor {
  id: string
  company_id: string
  contractor_id: string
  segment_id: string
  contract_sequence: number
  contract_number: string
  contract_inclusion_date: string
  status: 'active' | 'inactive'
  notes: string
  inactivated_at: string | null
  inactivation_reason: string | null
  created_at: string
  updated_at: string
  // Joined
  contractors?: { id: string; corporate_name: string; trade_name: string; code: string }
  segments?: { id: string; name: string }
}

export type CompanyContractorInsert = Omit<
  CompanyContractor,
  'id' | 'created_at' | 'updated_at' | 'contractors' | 'segments' | 'contract_inclusion_date' | 'inactivated_at' | 'inactivation_reason'
> & {
  contract_inclusion_date?: string
  inactivated_at?: string | null
  inactivation_reason?: string | null
}

export type CompanyContractorUpdate = Partial<
  Pick<
    CompanyContractor,
    | 'status'
    | 'notes'
    | 'inactivated_at'
    | 'inactivation_reason'
  >
>
