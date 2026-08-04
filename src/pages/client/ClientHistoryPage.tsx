import { useClientHistory } from '../../hooks/useClientPortal'
import { ActivityTimeline } from '../../components/ActivityTimeline'

export function ClientHistoryPage() {
  const { logs, loading, error } = useClientHistory()

  if (loading) return <div className="client-page"><div className="spinner" /></div>
  if (error)   return <div className="client-page"><p className="error-message">{error}</p></div>

  return (
    <div className="client-page">
      <div className="client-page-header">
        <h1 className="client-page-title">Histórico</h1>
        <p className="client-page-subtitle">Atualizações operacionais recentes da sua empresa</p>
      </div>

      <div className="client-section">
        <ActivityTimeline
          logs={logs}
          emptyMessage="Nenhuma movimentação realizada por você até o momento."
        />
      </div>
    </div>
  )
}
