import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ClientContext } from '../contexts/ClientContext'
import { ClientLayout } from '../layouts/ClientLayout'

export function ClientRoute() {
  const { user, profile, loading, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="client-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!profile || profile.role !== 'client') {
    return (
      <div className="client-forbidden">
        <div className="client-forbidden-box">
          <h2>Acesso não autorizado</h2>
          <p>Seu usuário não possui perfil de cliente no sistema.</p>
          <p>Entre em contato com o suporte operacional para regularizar seu acesso.</p>
          <button className="btn btn-secondary" onClick={handleSignOut}>Sair</button>
        </div>
      </div>
    )
  }

  if (!profile.company_id) {
    return (
      <div className="client-forbidden">
        <div className="client-forbidden-box">
          <h2>Empresa não vinculada</h2>
          <p>Seu perfil não está vinculado a nenhuma empresa.</p>
          <p>Entre em contato com o suporte operacional.</p>
          <button className="btn btn-secondary" onClick={handleSignOut}>Sair</button>
        </div>
      </div>
    )
  }

  const co = profile.companies
  const companyName = co?.trade_name ?? co?.corporate_name ?? 'Empresa'

  return (
    <ClientContext.Provider value={{ companyId: profile.company_id, companyName }}>
      <ClientLayout companyName={companyName} />
    </ClientContext.Provider>
  )
}
