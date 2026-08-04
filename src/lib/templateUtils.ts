export interface TemplateContext {
  empresa?: string
  funcionario?: string
  documento?: string
  responsavel?: string
  dias?: string
  status?: string
}

export const TEMPLATE_VARIABLES: { key: string; description: string }[] = [
  { key: '{{empresa}}',     description: 'Nome da empresa contratante' },
  { key: '{{funcionario}}', description: 'Nome do funcionário' },
  { key: '{{documento}}',   description: 'Tipo do documento' },
  { key: '{{responsavel}}', description: 'Responsável / empresa' },
  { key: '{{dias}}',        description: 'Dias para vencer (ou vencido)' },
  { key: '{{status}}',      description: 'Status atual do documento' },
]

export const CATEGORY_LABELS: Record<string, string> = {
  pending_document:  'Documento Pendente',
  expiring_document: 'Documento Vencendo',
  rejected_document: 'Documento Rejeitado',
  onboarding:        'Onboarding',
  generic:           'Genérico',
}

export function applyTemplate(content: string, ctx: TemplateContext): string {
  return content
    .replace(/\{\{empresa\}\}/g,     ctx.empresa     ?? '—')
    .replace(/\{\{funcionario\}\}/g, ctx.funcionario ?? '—')
    .replace(/\{\{documento\}\}/g,   ctx.documento   ?? '—')
    .replace(/\{\{responsavel\}\}/g, ctx.responsavel ?? '—')
    .replace(/\{\{dias\}\}/g,        ctx.dias        ?? '—')
    .replace(/\{\{status\}\}/g,      ctx.status      ?? '—')
}

export function buildWhatsAppLinkWithMessage(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.length < 12 ? `55${digits}` : digits
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export function buildWhatsAppLinkPlain(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.length < 12 ? `55${digits}` : digits
  return `https://wa.me/${number}`
}
