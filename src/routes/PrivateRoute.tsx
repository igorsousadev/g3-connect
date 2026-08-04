import { Navigate, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types/profile'

function SignOutButton() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  async function handle() {
    await signOut()
    navigate('/login')
  }
  return (
    <button className="btn btn-secondary" onClick={handle}>
      Sair da conta
    </button>
  )
}

interface PrivateRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

export function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (profile?.password_reset_pending) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px 32px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" />
          </svg>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
            Acesso não configurado
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
            Seu usuário ainda não possui um perfil de acesso configurado no sistema.
            Entre em contato com o administrador.
          </p>
          <SignOutButton />
        </div>
      </div>
    )
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(profile.role)) {
      if (profile.role === 'client') return <Navigate to="/portal/dashboard" replace />
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}
