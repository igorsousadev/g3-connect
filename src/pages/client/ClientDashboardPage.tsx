import { NavLink } from 'react-router-dom'
import { useClientContext } from '../../contexts/ClientContext'
import { useClientDashboard } from '../../hooks/useClientPortal'
import { DocStatusBadge } from '../../components/DocStatusBadge'
import { ActivityTimeline } from '../../components/ActivityTimeline'
import { ClientDocumentUploadButton } from '../../components/client/ClientDocumentUploadButton'
import { formatDate } from '../../lib/documentUtils'
import type { DocumentStatus } from '../../types/employeeDocument'

export function ClientDashboardPage() {
  const { companyName } = useClientContext()
  const { summary, pending, activity, loading, error, reload } = useClientDashboard()

  if (loading) return <div className="client-page"><div className="spinner" /></div>
  if (error)   return <div className="client-page"><p className="error-message">{error}</p></div>
  if (!summary) return null

  const urgentPending = pending.slice(0, 5)

  return (
    <div className="client-page">
      <div className="client-page-header">
        <h1 className="client-page-title">Visão Geral</h1>
        <p className="client-page-subtitle">Situação operacional de <strong>{companyName}</strong></p>
      </div>

      <div className="client-cards-grid">
        <div className="client-card client-card--blue">
          <div className="client-card-value">{summary.totalEmployees}</div>
          <div className="client-card-label">Funcionários monitorados</div>
        </div>
        <div className="client-card client-card--green">
          <div className="client-card-value">{summary.validDocs}</div>
          <div className="client-card-label">Documentos válidos</div>
        </div>
        <div className="client-card client-card--amber">
          <div className="client-card-value">{summary.expiringDocs}</div>
          <div className="client-card-label">Vencendo em breve</div>
        </div>
        <div className="client-card client-card--orange">
          <div className="client-card-value">{summary.pendingDocs}</div>
          <div className="client-card-label">Pendências abertas</div>
        </div>
        <div className={`client-card ${summary.irregularEmployees > 0 ? 'client-card--red' : 'client-card--neutral'}`}>
          <div className="client-card-value">{summary.irregularEmployees}</div>
          <div className="client-card-label">Funcionários irregulares</div>
        </div>
      </div>

      <div className="client-two-cols">
        <div className="client-section">
          <div className="client-section-header">
            <h2 className="client-section-title">Pendências Recentes</h2>
            {pending.length > 5 && (
              <NavLink to="/portal/pendencias" className="client-section-link">
                Ver todas ({pending.length})
              </NavLink>
            )}
          </div>
          {urgentPending.length === 0 ? (
            <div className="client-empty">Nenhuma pendência no momento.</div>
          ) : (
            <div className="client-pending-list">
              {urgentPending.map((item, i) => (
                <div key={`${item.docId ?? item.employeeId}-${i}`} className="client-pending-item">
                  <div className="client-pending-main">
                    <span className="client-pending-name">
                      {item.employeeName}
                      {item.origin === 'company' && (
                        <span className="client-origin-tag">Empresa</span>
                      )}
                    </span>
                    <span className="client-pending-doc">{item.documentTypeName}</span>
                  </div>
                  <div className="client-pending-right">
                    <DocStatusBadge status={item.status as DocumentStatus} />
                    {item.expirationDate && (
                      <span className="client-pending-date">{formatDate(item.expirationDate)}</span>
                    )}
                    <ClientDocumentUploadButton
                      scope={item.origin}
                      employeeId={item.employeeId}
                      documentId={item.docId}
                      documentName={item.documentTypeName}
                      className="client-pending-action"
                      onSuccess={reload}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="client-section">
          <div className="client-section-header">
            <h2 className="client-section-title">Atividade Recente</h2>
            <NavLink to="/portal/historico" className="client-section-link">Ver histórico</NavLink>
          </div>
          {activity.length === 0 ? (
            <div className="client-empty">Nenhuma atividade recente.</div>
          ) : (
            <ActivityTimeline logs={activity} compact />
          )}
        </div>
      </div>
    </div>
  )
}
