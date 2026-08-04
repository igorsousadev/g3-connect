export type DocumentStatus = 'pending' | 'invalid' | 'valid' | 'expired'

export type WorkflowStatus =
  | 'pending_client'
  | 'analysis'
  | 'homologation'
  | 'sent'
  | 'approved'
  | 'rejected'

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Pendente',
  invalid: 'Inválido',
  valid:   'Válido',
  expired: 'Vencido',
}

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  pending_client: 'Aguardando cliente',
  analysis:       'Em análise',
  homologation:   'Homologação',
  sent:           'Enviado',
  approved:       'Aprovado',
  rejected:       'Rejeitado',
}

export const WORKFLOW_RESPONSIBLE: Record<WorkflowStatus, 'client' | 'operator' | 'specialist' | 'done'> = {
  pending_client: 'client',
  analysis:       'operator',
  homologation:   'specialist',
  sent:           'specialist',
  approved:       'done',
  rejected:       'client',
}

export interface EmployeeDocument {
  id: string
  created_at: string
  employee_id: string
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

export interface EmployeeDocumentInsert {
  employee_id: string
  document_type_id: string
  status: DocumentStatus
  workflow_status?: WorkflowStatus
  issue_date: string | null
  expiration_date: string | null
  external_file_url: string | null
  notes: string | null
}

export type EmployeeDocumentUpdate = Partial<EmployeeDocumentInsert>

export interface EmployeeDocumentFile {
  id: string
  employee_document_id: string
  file_url: string
  file_name: string | null
  file_path: string | null
  uploaded_at: string
  uploaded_by: string | null
  is_current: boolean
  created_at: string
}
