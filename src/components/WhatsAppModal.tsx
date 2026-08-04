import { useState, useEffect, useMemo } from 'react'
import { listActiveTemplates } from '../services/messageTemplateService'
import { logActivity } from '../services/activityLogService'
import {
  applyTemplate,
  buildWhatsAppLinkWithMessage,
  buildWhatsAppLinkPlain,
  CATEGORY_LABELS,
} from '../lib/templateUtils'
import type { MessageTemplate } from '../types/messageTemplate'
import type { TemplateContext } from '../lib/templateUtils'
import type { EntityType } from '../types/activityLog'

interface Props {
  phone: string | null
  recipients?: {
    person?: { label: string; phone: string | null }
    company?: { label: string; phone: string | null }
  }
  context: TemplateContext
  title: string
  logContext?: { entityType: EntityType; entityId: string; employeeId?: string }
  onClose: () => void
}

const WA_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
)

type RecipientKey = 'person' | 'company'

export function WhatsAppModal({ phone, recipients, context, title, logContext, onClose }: Props) {
  const [templates,       setTemplates]       = useState<MessageTemplate[]>([])
  const [loadingTpl,      setLoadingTpl]      = useState(true)
  const [selectedId,      setSelectedId]      = useState<string | null>(null)
  const [categoryFilter,  setCategoryFilter]  = useState('all')
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientKey>('person')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    listActiveTemplates()
      .then(data => {
        setTemplates(data)
        if (data.length > 0) setSelectedId(data[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingTpl(false))
  }, [])

  const categories = useMemo(() => {
    const set = new Set(templates.map(t => t.category))
    return set.size > 1 ? ['all', ...Array.from(set)] : []
  }, [templates])

  const filtered = useMemo(() =>
    categoryFilter === 'all' ? templates : templates.filter(t => t.category === categoryFilter),
    [templates, categoryFilter],
  )

  const recipientOptions = useMemo(() => {
    const personPhone = recipients?.person?.phone ?? phone
    return [
      {
        key: 'person' as const,
        label: recipients?.person?.label ?? 'Pessoa',
        phone: personPhone?.trim() || null,
      },
      {
        key: 'company' as const,
        label: recipients?.company?.label ?? 'Empresa',
        phone: recipients?.company?.phone?.trim() || null,
      },
    ]
  }, [phone, recipients])

  useEffect(() => {
    const hasPerson = Boolean(recipientOptions.find(opt => opt.key === 'person')?.phone)
    const hasCompany = Boolean(recipientOptions.find(opt => opt.key === 'company')?.phone)
    if (hasPerson) setSelectedRecipient('person')
    else if (hasCompany) setSelectedRecipient('company')
  }, [recipientOptions])

  const selectedPhone = recipientOptions.find(opt => opt.key === selectedRecipient)?.phone ?? null
  const hasAnyPhone = recipientOptions.some(opt => opt.phone)

  const selected = templates.find(t => t.id === selectedId) ?? null
  const preview  = selected ? applyTemplate(selected.content, context) : null

  function handleOpen() {
    if (!selectedPhone) return

    const url = preview
      ? buildWhatsAppLinkWithMessage(selectedPhone, preview)
      : buildWhatsAppLinkPlain(selectedPhone)

    window.open(url, '_blank', 'noopener,noreferrer')

    if (logContext) {
      logActivity({
        entityType:  logContext.entityType,
        entityId:    logContext.entityId,
        actionType:  'whatsapp_sent',
        description: selected
          ? `WhatsApp aberto: template "${selected.name}" — ${context.funcionario ?? context.empresa ?? ''}`
          : `WhatsApp aberto — ${context.funcionario ?? context.empresa ?? ''}`,
        metadata: {
          employee_id:   logContext.employeeId,
          template_id:   selected?.id,
          template_name: selected?.name,
          recipient_type: selectedRecipient,
        },
      }).catch(() => {})
    }

    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className={`modal-phone${!hasAnyPhone ? ' modal-phone--missing' : ''}`}>
            {WA_ICON}
            <span>{hasAnyPhone ? 'Selecione o número para envio pelo WhatsApp' : 'Nenhum número de WhatsApp disponível para este registro.'}</span>
          </div>

          {hasAnyPhone && (
            <div className="wa-recipient-options">
              {recipientOptions.map(opt => (
                <label
                  key={opt.key}
                  className={`wa-recipient-option${selectedRecipient === opt.key ? ' wa-recipient-option--active' : ''}${!opt.phone ? ' wa-recipient-option--disabled' : ''}`}
                >
                  <input
                    type="radio"
                    name="whatsapp-recipient"
                    value={opt.key}
                    checked={selectedRecipient === opt.key}
                    disabled={!opt.phone}
                    onChange={() => setSelectedRecipient(opt.key)}
                  />
                  <span className="wa-recipient-label">{opt.label}</span>
                  <span className="wa-recipient-phone">{opt.phone ?? 'Não cadastrado'}</span>
                </label>
              ))}
            </div>
          )}

          {loadingTpl ? (
            <div className="tl-loading"><div className="spinner" /></div>
          ) : templates.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p style={{ fontSize: 14 }}>
                Nenhum template ativo.{' '}
                <a href="/templates-whatsapp/novo" className="link-action" target="_blank" rel="noopener noreferrer">
                  Criar template
                </a>
              </p>
            </div>
          ) : (
            <>
              {categories.length > 0 && (
                <div className="tpl-category-filter">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      className={`tpl-cat-btn${categoryFilter === cat ? ' tpl-cat-btn--active' : ''}`}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat === 'all' ? 'Todos' : CATEGORY_LABELS[cat] ?? cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="tpl-cols">
                <div>
                  <p className="tpl-col-label">Templates disponíveis</p>
                  <div className="tpl-list">
                    {filtered.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: 8 }}>
                        Nenhum template nessa categoria.
                      </p>
                    ) : filtered.map(t => (
                      <div
                        key={t.id}
                        className={`tpl-item${selectedId === t.id ? ' tpl-item--active' : ''}`}
                        onClick={() => setSelectedId(t.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(t.id) }}
                      >
                        <div className="tpl-item-name">{t.name}</div>
                        <div className="tpl-item-cat">{CATEGORY_LABELS[t.category] ?? t.category}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="tpl-col-label">Pré-visualização</p>
                  {preview ? (
                    <div className="tpl-preview">{preview}</div>
                  ) : (
                    <div className="tpl-preview tpl-preview--empty">
                      Selecione um template à esquerda para visualizar a mensagem com as variáveis preenchidas.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
          <button
            className="btn btn-whatsapp"
            onClick={handleOpen}
            disabled={!selectedPhone}
          >
            {WA_ICON}
            Abrir WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
