import type { DocumentStatus } from '../types/employeeDocument'

export function computeDocumentStatus(
  expirationDate: string | null,
  currentStatus: DocumentStatus,
): DocumentStatus {
  if (currentStatus === 'invalid') return 'invalid'
  if (currentStatus === 'pending') return 'pending'

  if (!expirationDate) return currentStatus

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expirationDate)
  expiry.setHours(0, 0, 0, 0)

  if (expiry < today) return 'expired'

  return 'valid'
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Retorna apenas a última observação de um campo notes acumulado.
 * Entradas são separadas por \n; retorna a última linha não vazia.
 */
export function getLastNote(notes: string | null | undefined): string | null {
  if (!notes) return null
  const last = notes.split('\n').map(l => l.trim()).filter(Boolean).at(-1)
  return last ?? null
}

/**
 * Define se o cliente pode anexar/substituir um documento no portal.
 * Regras:
 * - pending_client → permite sempre
 * - rejected       → permite sempre
 * - approved       → permite somente se vencido ou vencendo (≤ 30 dias)
 * - sem workflow   → permite se status for pending/invalid (documento ainda não enviado)
 * - analysis/homologation/sent/approved válido → bloqueia
 */
export function canClientUploadDoc(
  id: string | null,
  status: string,
  workflowStatus: string | null,
  daysUntilExpiry: number | null,
): boolean {
  if (!id) return false

  if (!workflowStatus) return status === 'pending' || status === 'invalid'

  if (workflowStatus === 'pending_client') return true
  if (workflowStatus === 'rejected')       return true

  if (workflowStatus === 'approved') {
    if (status === 'expired') return true
    if (daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30) return true
  }

  return false
}

const UPLOAD_BLOCKED_STATUSES = ['analysis', 'homologation', 'sent']

/**
 * Retorna mensagem de bloqueio quando o documento está em etapa que impede novo anexo.
 * Retorna null quando não há bloqueio (documento aprovado válido, etc.) — nesses casos
 * o botão é simplesmente ocultado sem mensagem.
 */
export function clientUploadBlockReason(
  id: string | null,
  workflowStatus: string | null,
): string | null {
  if (!id) return null
  if (workflowStatus && UPLOAD_BLOCKED_STATUSES.includes(workflowStatus)) {
    return 'Este documento já está em análise e não pode receber novos anexos no momento.'
  }
  return null
}

export function getDaysUntilExpiry(expirationDate: string | null): number | null {
  if (!expirationDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expirationDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
