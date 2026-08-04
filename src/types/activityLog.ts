export type EntityType =
  | 'company'
  | 'company_document'
  | 'contractor'
  | 'employee'
  | 'employee_document'
  | 'checklist'
  | 'role'
  | 'user_profile'
  | 'system_profile'

export type ActionType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'approved'
  | 'rejected'
  | 'status_changed'
  | 'note_added'
  | 'whatsapp_sent'

export interface ActivityLog {
  id: string
  created_at: string
  user_id: string | null
  entity_type: EntityType
  entity_id: string
  action_type: ActionType
  description: string
  metadata: Record<string, unknown> | null
}

export interface LogActivityParams {
  entityType: EntityType
  entityId: string
  actionType: ActionType
  description: string
  metadata?: Record<string, unknown>
}
