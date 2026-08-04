import type { DocumentStatus, WorkflowStatus } from './employeeDocument'

export interface CompanyDocument {
  id: string
  created_at: string
  updated_at: string | null
  company_id: string
  document_type_id: string
  status: DocumentStatus
  workflow_status: WorkflowStatus
  issue_date: string | null
  expiration_date: string | null
  external_file_url: string | null
  notes: string | null
  approved_by: string | null
  approved_at: string | null
}

export interface CompanyDocumentInsert {
  company_id: string
  document_type_id: string
  status?: DocumentStatus
  workflow_status?: WorkflowStatus
  issue_date?: string | null
  expiration_date?: string | null
  external_file_url?: string | null
  notes?: string | null
}

export type CompanyDocumentUpdate = Partial<Omit<CompanyDocumentInsert, 'company_id'>>

export interface CompanyDocumentFile {
  id: string
  company_document_id: string
  file_url: string
  file_name: string | null
  file_path: string | null
  uploaded_at: string
  uploaded_by: string | null
  is_current: boolean
  created_at: string
}

export interface CompanyDocumentWithType extends CompanyDocument {
  document_types: {
    id: string
    name: string
    category: string | null
    default_validity_days: number | null
  } | null
}
