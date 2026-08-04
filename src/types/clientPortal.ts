export interface ClientSummary {
  totalEmployees: number
  validDocs: number
  pendingDocs: number
  expiringDocs: number
  expiredDocs: number
  irregularEmployees: number
}

export type DocHealth = 'ok' | 'warning' | 'critical'

export interface ClientEmployee {
  id: string
  fullName: string
  roleName: string | null
  totalDocs: number
  validDocs: number
  pendingDocs: number
  expiringDocs: number
  expiredDocs: number
  rejectedDocs: number
  health: DocHealth
}

export interface ClientDoc {
  id: string | null
  documentTypeName: string
  status: string
  workflowStatus: string | null
  issueDate: string | null
  expirationDate: string | null
  daysUntilExpiry: number | null
  notes: string | null
  externalFileUrl: string | null
}

export interface ClientPendingItem {
  docId: string | null
  employeeId: string
  employeeName: string
  documentTypeName: string
  status: string
  expirationDate: string | null
  daysUntilExpiry: number | null
  origin: 'employee' | 'company'
}
