import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useClientPending } from '../../hooks/useClientPortal'
import { DocStatusBadge } from '../../components/DocStatusBadge'
import { ClientDocumentUploadButton } from '../../components/client/ClientDocumentUploadButton'
import { formatDate } from '../../lib/documentUtils'
import type { ClientPendingItem } from '../../types/clientPortal'
import type { DocumentStatus } from '../../types/employeeDocument'

function PendingSection({
  title,
  items,
  urgency,
  onUploaded,
}: {
  title: string
  items: ClientPendingItem[]
  urgency: 'critical' | 'warning' | 'neutral'
  onUploaded: () => void
}) {
  return (
    <div className={`client-pending-section client-pending-section--${urgency}`}>
      <div className="client-pending-section-title">
        {title}
        <span className="client-pending-count">{items.length}</span>
      </div>
      <div className="client-pending-rows">
        {items.map((item, i) => (
          <div key={`${item.docId ?? item.employeeId}-${i}`} className="client-pending-row">
            <div className="client-pending-row-main">
              {item.origin === 'employee' ? (
                <NavLink to={`/portal/funcionarios/${item.employeeId}`} className="client-pending-emp-link">
                  {item.employeeName}
                </NavLink>
              ) : (
                <span className="client-pending-emp-link client-pending-emp-link--company">
                  {item.employeeName}
                  <span className="client-origin-tag">Empresa</span>
                </span>
              )}
              <span className="client-pending-row-doc">{item.documentTypeName}</span>
            </div>
            <div className="client-pending-row-right">
              <DocStatusBadge status={item.status as DocumentStatus} />
              {item.expirationDate && (
                <span className="client-pending-row-date">{formatDate(item.expirationDate)}</span>
              )}
              <ClientDocumentUploadButton
                scope={item.origin}
                employeeId={item.employeeId}
                documentId={item.docId}
                documentName={item.documentTypeName}
                className="client-pending-action"
                onSuccess={onUploaded}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ClientPendingPage() {
  const { items, loading, error, reload } = useClientPending()

  const { expired, expiring, pending, other } = useMemo(() => ({
    expired:  items.filter(i => i.status === 'expired'),
    expiring: items.filter(i => i.status === 'expiring'),
    pending:  items.filter(i => i.status === 'pending'),
    other:    items.filter(i => i.status === 'rejected' || i.status === 'submitted'),
  }), [items])

  if (loading) return <div className="client-page"><div className="spinner" /></div>
  if (error)   return <div className="client-page"><p className="error-message">{error}</p></div>

  return (
    <div className="client-page">
      <div className="client-page-header">
        <h1 className="client-page-title">Pendências</h1>
        <p className="client-page-subtitle">
          {items.length === 0
            ? 'Nenhuma pendência encontrada.'
            : `${items.length} item${items.length !== 1 ? 's' : ''} requer${items.length === 1 ? '' : 'em'} atenção`}
        </p>
      </div>

      {items.length === 0 && (
        <div className="client-success-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Todos os documentos estão em ordem.
        </div>
      )}

      {expired.length > 0  && <PendingSection title="Documentos Vencidos"   items={expired}  urgency="critical" onUploaded={reload} />}
      {expiring.length > 0 && <PendingSection title="Vencendo em Breve"     items={expiring} urgency="warning"  onUploaded={reload} />}
      {pending.length > 0  && <PendingSection title="Pendências Abertas"    items={pending}  urgency="neutral"  onUploaded={reload} />}
      {other.length > 0    && <PendingSection title="Em Análise / Enviados" items={other}    urgency="neutral"  onUploaded={reload} />}
    </div>
  )
}
