import type { ActivityLog } from '../types/activityLog'

// ─── Config ──────────────────────────────────────────────────
interface ActionConfig { label: string; dotClass: string; badgeClass: string }

const ACTION_CONFIG: Record<string, ActionConfig> = {
  created:        { label: 'Criado',         dotClass: 'tl-dot--created',        badgeClass: 'tl-badge--created'        },
  updated:        { label: 'Atualizado',     dotClass: 'tl-dot--updated',        badgeClass: 'tl-badge--updated'        },
  deleted:        { label: 'Removido',       dotClass: 'tl-dot--deleted',        badgeClass: 'tl-badge--deleted'        },
  approved:       { label: 'Aprovado',       dotClass: 'tl-dot--approved',       badgeClass: 'tl-badge--approved'       },
  rejected:       { label: 'Rejeitado',      dotClass: 'tl-dot--rejected',       badgeClass: 'tl-badge--rejected'       },
  status_changed: { label: 'Status',         dotClass: 'tl-dot--status_changed', badgeClass: 'tl-badge--status_changed' },
  note_added:     { label: 'Observação',     dotClass: 'tl-dot--note_added',     badgeClass: 'tl-badge--note_added'     },
  whatsapp_sent:  { label: 'WhatsApp',       dotClass: 'tl-dot--whatsapp_sent',  badgeClass: 'tl-badge--whatsapp_sent'  },
}

const ENTITY_LABELS: Record<string, string> = {
  company:           'Empresa',
  company_document:  'Documento da empresa',
  contractor:        'Contratante',
  employee:          'Funcionário',
  employee_document: 'Documento',
  checklist:         'Checklist',
  role:              'Cargo',
}

// ─── Utilities ───────────────────────────────────────────────
function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)   return 'Agora mesmo'
  if (mins < 60)  return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h atrás`
  const days = Math.floor(hrs / 24)
  if (days < 7)   return `${days}d atrás`
  return formatDateTime(dateStr)
}

// ─── Component ───────────────────────────────────────────────
interface Props {
  logs: ActivityLog[]
  loading?: boolean
  compact?: boolean
  emptyMessage?: string
}

export function ActivityTimeline({ logs, loading, compact, emptyMessage }: Props) {
  if (loading) {
    return <div className="tl-loading"><div className="spinner" /></div>
  }

  if (logs.length === 0) {
    return (
      <div className="tl-empty">
        <p>{emptyMessage ?? 'Nenhuma atividade registrada ainda.'}</p>
      </div>
    )
  }

  return (
    <div className={`timeline${compact ? ' timeline--compact' : ''}`}>
      {logs.map(log => {
        const conf        = ACTION_CONFIG[log.action_type] ?? ACTION_CONFIG.updated
        const entityLabel = ENTITY_LABELS[log.entity_type] ?? log.entity_type
        const userEmail   = (log.metadata?.user_email as string | null) ?? null

        return (
          <div key={log.id} className="tl-item">
            <div className={`tl-dot ${conf.dotClass}`} />
            <div className="tl-content">
              <div className="tl-header">
                <span className={`tl-badge ${conf.badgeClass}`}>{conf.label}</span>
                {!compact && (
                  <span className="tl-entity">{entityLabel}</span>
                )}
                <span className="tl-time" title={formatDateTime(log.created_at)}>
                  {compact ? formatTimeAgo(log.created_at) : formatDateTime(log.created_at)}
                </span>
              </div>
              <p className="tl-description">{log.description}</p>
              {!compact && userEmail && (
                <p className="tl-meta">por {userEmail}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
