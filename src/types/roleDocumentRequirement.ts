import type { DocumentType } from './documentType'

export interface RoleDocumentRequirement {
  id: string
  created_at: string
  role_id: string
  document_type_id: string
}

// Retornado quando a query inclui join com document_types
export interface RequirementWithDocumentType extends RoleDocumentRequirement {
  document_types: Pick<DocumentType, 'id' | 'name' | 'description' | 'category' | 'default_validity_days' | 'is_required' | 'is_company_required'>
}
