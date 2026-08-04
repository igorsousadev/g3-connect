import type { WorkflowStatus } from './employeeDocument'

export interface OperationalItem {
  source: 'employee' | 'company'
  docId: string | null
  status: string
  workflowStatus: WorkflowStatus | null
  expirationDate: string | null
  issueDate: string | null
  daysUntilExpiry: number | null
  externalFileUrl: string | null
  notes: string | null

  documentTypeId: string
  documentTypeName: string

  employeeId: string
  employeeName: string
  employeeCpf: string
  employeePhone: string | null

  roleId: string | null
  roleName: string | null

  companyId: string
  companyName: string
  companyWhatsapp: string | null

  contractLabel: string | null
  contractorId: string | null
  contractorCode: string | null
  contractorTradeName: string | null
  contractSearch: string | null

  isMissing: boolean
  updatedAt: string | null
}
