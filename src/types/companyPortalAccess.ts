export interface CompanyPortalAccess {
  id: string
  company_id: string
  contractor_name: string
  portal_url: string | null
  username: string
  password_encrypted: string
  notes: string | null
  created_by: string | null
  updated_by: string | null
  last_access_at: string | null
  last_upload_at: string | null
  last_upload_by: string | null
  created_at: string
  updated_at: string
}

export type CompanyPortalAccessInsert = Omit<CompanyPortalAccess, 'id' | 'created_at' | 'updated_at'>
export type CompanyPortalAccessUpdate = Partial<CompanyPortalAccessInsert>
