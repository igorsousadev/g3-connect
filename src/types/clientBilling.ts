export type BillingStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type InvoiceStatus = 'pending' | 'issued' | 'sent'

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  pending:   'Pendente',
  paid:      'Pago',
  overdue:   'Vencido',
  cancelled: 'Cancelado',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'Pendente',
  issued:  'Emitida',
  sent:    'Enviada',
}

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active:    'Ativo',
  inactive:  'Inativo',
  cancelled: 'Cancelado',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix:           'PIX',
  boleto:        'Boleto',
  transferencia: 'Transferência',
  dinheiro:      'Dinheiro',
}

export const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'] as const

export interface ClientBilling {
  id: string
  company_id: string
  reference_month: number
  reference_year: number
  amount: number
  due_date: string | null
  status: BillingStatus
  invoice_status: InvoiceStatus
  invoice_number: string | null
  invoice_url: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ClientBillingInsert = Omit<ClientBilling, 'id' | 'created_at' | 'updated_at'>
export type ClientBillingUpdate = Partial<ClientBillingInsert>
