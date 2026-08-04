export type TemplateCategory =
  | 'pending_document'
  | 'expiring_document'
  | 'rejected_document'
  | 'onboarding'
  | 'generic'

export interface MessageTemplate {
  id: string
  created_at: string
  name: string
  category: TemplateCategory
  content: string
  is_active: boolean
}

export interface MessageTemplateInsert {
  name: string
  category: TemplateCategory
  content: string
  is_active: boolean
}

export type MessageTemplateUpdate = Partial<MessageTemplateInsert>
