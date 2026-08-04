export const DOCUMENT_CATEGORIES = [
  'SST',
  'Empresa',
  'Trabalhista',
  'Contratual',
  'Operacional',
  'Equipamentos',
  'Veículos',
  'Ambiental',
  'Saúde',
  'Engenharia',
  'Jurídico',
  'Qualidade',
  'Segurança Patrimonial',
  'Logística',
  'Alimentação',
  'Industrial',
  'Outros',
] as const

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number]

export interface DocumentType {
  id: string
  created_at: string
  name: string
  description: string | null
  category: string | null
  default_validity_days: number | null
  is_required: boolean
  is_company_required: boolean
  is_active: boolean
}

export type DocumentTypeInsert = Omit<DocumentType, 'id' | 'created_at'>
export type DocumentTypeUpdate = Partial<DocumentTypeInsert>
