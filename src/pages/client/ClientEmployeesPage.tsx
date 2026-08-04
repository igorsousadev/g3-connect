import { NavLink } from 'react-router-dom'
import { useClientEmployees } from '../../hooks/useClientPortal'
import type { DocHealth } from '../../types/clientPortal'

function HealthBadge({ health }: { health: DocHealth }) {
  const map: Record<DocHealth, { label: string; cls: string }> = {
    ok:       { label: 'Regular',   cls: 'health-badge--ok'       },
    warning:  { label: 'Atenção',   cls: 'health-badge--warning'  },
    critical: { label: 'Irregular', cls: 'health-badge--critical' },
  }
  const { label, cls } = map[health]
  return <span className={`health-badge ${cls}`}>{label}</span>
}

export function ClientEmployeesPage() {
  const { employees, loading, error } = useClientEmployees()

  if (loading) return <div className="client-page"><div className="spinner" /></div>
  if (error)   return <div className="client-page"><p className="error-message">{error}</p></div>

  return (
    <div className="client-page">
      <div className="client-page-header">
        <h1 className="client-page-title">Funcionários</h1>
        <p className="client-page-subtitle">
          {employees.length} funcionário{employees.length !== 1 ? 's' : ''} monitorado{employees.length !== 1 ? 's' : ''}
        </p>
      </div>

      {employees.length === 0 ? (
        <div className="client-empty-page">Nenhum funcionário cadastrado.</div>
      ) : (
        <div className="client-table-container">
          <table className="client-table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Cargo</th>
                <th>Situação</th>
                <th>Documentos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td className="client-td-name">{emp.fullName}</td>
                  <td className="client-td-role">{emp.roleName ?? '—'}</td>
                  <td><HealthBadge health={emp.health} /></td>
                  <td>
                    <div className="client-doc-counts">
                      {emp.validDocs > 0 && (
                        <span className="client-count client-count--ok">{emp.validDocs} válido{emp.validDocs !== 1 ? 's' : ''}</span>
                      )}
                      {emp.expiringDocs > 0 && (
                        <span className="client-count client-count--amber">{emp.expiringDocs} vencendo</span>
                      )}
                      {emp.pendingDocs > 0 && (
                        <span className="client-count client-count--orange">{emp.pendingDocs} pendente{emp.pendingDocs !== 1 ? 's' : ''}</span>
                      )}
                      {emp.expiredDocs > 0 && (
                        <span className="client-count client-count--red">{emp.expiredDocs} vencido{emp.expiredDocs !== 1 ? 's' : ''}</span>
                      )}
                      {emp.rejectedDocs > 0 && (
                        <span className="client-count client-count--red">{emp.rejectedDocs} rejeitado{emp.rejectedDocs !== 1 ? 's' : ''}</span>
                      )}
                      {emp.totalDocs === 0 && (
                        <span className="client-count client-count--neutral">Sem documentos</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <NavLink to={`/portal/funcionarios/${emp.id}`} className="client-view-btn">
                      Ver documentos
                    </NavLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
