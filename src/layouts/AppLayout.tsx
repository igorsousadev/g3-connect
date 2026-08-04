import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types/profile'
import { ROLE_LABELS } from '../types/profile'
import { rolesFor } from '../config/permissions'

const appName = import.meta.env.VITE_APP_NAME || 'G3 Connect'

type NavItem = { to: string; label: string; icon: React.ReactNode; roles?: UserRole[] }
type NavGroupProps = { label: string; items: NavItem[]; role: UserRole; onNavigate?: () => void }

// ── Operação ─────────────────────────────────────────────────────────────────

const navOperacao: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    roles: rolesFor('dashboard'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  },
  {
    to: '/central-operacional',
    label: 'Central Operacional',
    roles: rolesFor('central_operacional'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  },
  {
    to: '/homologacao',
    label: 'Central de Homologação',
    roles: rolesFor('specialist_panel'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  },
  {
    to: '/historico',
    label: 'Histórico Operacional',
    roles: rolesFor('history'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  },
]

// ── Cadastros ─────────────────────────────────────────────────────────────────

const navCadastros: NavItem[] = [
  {
    to: '/cadastro-documentos',
    label: 'Documentos',
    roles: rolesFor('document_types'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
  },
  {
    to: '/cargos',
    label: 'Cargos e Funções',
    roles: rolesFor('roles'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
  },
  {
    to: '/segmentos',
    label: 'Segmentos',
    roles: rolesFor('segments'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" /><path d="M22 4v16" /></svg>,
  },
  {
    to: '/contratantes',
    label: 'Contratantes',
    roles: rolesFor('contractors'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" /></svg>,
  },
  {
    to: '/empresas',
    label: 'Empresas',
    roles: rolesFor('companies'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  },
  {
    to: '/funcionarios',
    label: 'Funcionários',
    roles: rolesFor('employees'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  },
  {
    to: '/templates-whatsapp',
    label: 'Templates WhatsApp',
    roles: rolesFor('templates'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  },
]

// ── Administração ─────────────────────────────────────────────────────────────

const navAdmin: NavItem[] = [
  {
    to: '/admin/perfis',
    label: 'Usuários e Perfis',
    roles: rolesFor('profiles'),
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><line x1="19" y1="11" x2="19" y2="17" /><line x1="22" y1="14" x2="16" y2="14" /></svg>,
  },
  // {
  //   to: '/admin/clientes',
  //   label: 'Clientes e Cobrança',
  //   roles: rolesFor('client_billing'),
  //   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  // },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function filterByRole(items: NavItem[], role: UserRole): NavItem[] {
  return items.filter(item => !item.roles || item.roles.includes(role))
}

function NavGroup({ label, items, role, onNavigate }: NavGroupProps) {
  const visible = filterByRole(items, role)
  if (visible.length === 0) return null
  return (
    <>
      <span className="sidebar-section-label">{label}</span>
      {visible.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          title={item.label}
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          onClick={onNavigate}
        >
          {item.icon}
          <span className="sidebar-link-label">{item.label}</span>
        </NavLink>
      ))}
    </>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function AppLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1')
  const [mobileOpen, setMobileOpen] = useState(false)

  const effectiveRole: UserRole = profile?.role ?? 'operator'

  function toggleCollapsed() {
    setCollapsed(v => {
      const next = !v
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
      if (next) setUserMenuOpen(false)
      return next
    })
  }

  function closeMobileMenu() {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function handleSignOut() {
    setUserMenuOpen(false)
    await signOut()
    navigate('/login')
  }

  const sidebarClass = ['sidebar', collapsed ? 'sidebar--collapsed' : '', mobileOpen ? 'sidebar--mobile-open' : ''].filter(Boolean).join(' ')

  return (
    <div className="app-layout">
      {/* Mobile hamburger */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Abrir menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobileMenu} />
      )}

      <aside className={sidebarClass}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">{appName}</span>
            <span className="sidebar-brand-sub">Gestão Operacional</span>
          </div>
          <button
            className="sidebar-collapse-btn"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {collapsed
                ? <polyline points="9 18 15 12 9 6" />
                : <polyline points="15 18 9 12 15 6" />}
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavGroup label="Operação"       items={navOperacao}  role={effectiveRole} onNavigate={closeMobileMenu} />
          <NavGroup label="Cadastros"      items={navCadastros} role={effectiveRole} onNavigate={closeMobileMenu} />
          <NavGroup label="Administração"  items={navAdmin}     role={effectiveRole} onNavigate={closeMobileMenu} />
        </nav>

        <div className="sidebar-footer">
          {/* Backdrop transparente para fechar o menu */}
          {userMenuOpen && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 98 }}
              onClick={() => setUserMenuOpen(false)}
            />
          )}

          {/* Updrop — abre acima do botão do usuário */}
          {userMenuOpen && (
            <div className="sidebar-user-dropdown" style={{ position: 'relative', zIndex: 99 }}>
              <NavLink
                to="/alterar-senha"
                className="sidebar-user-dropdown-item"
                onClick={() => setUserMenuOpen(false)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="sidebar-link-label">Alterar Senha</span>
              </NavLink>
              <button
                className="sidebar-user-dropdown-item sidebar-user-dropdown-item--danger"
                onClick={handleSignOut}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="sidebar-link-label">Sair</span>
              </button>
            </div>
          )}

          {/* Botão do usuário — trigger do menu (no collapsed mode, shows only avatar) */}
          <button
            className={`sidebar-user-btn${userMenuOpen ? ' open' : ''}`}
            onClick={() => {
              if (collapsed) {
                toggleCollapsed()
              } else {
                setUserMenuOpen(v => !v)
              }
            }}
            title={collapsed ? 'Expandir menu' : undefined}
          >
            <div className="sidebar-user-avatar">
              {(profile?.full_name ?? user?.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {profile?.full_name ?? user?.email}
              </span>
              {profile && (
                <span className="sidebar-user-role">{ROLE_LABELS[profile.role]}</span>
              )}
            </div>
            <svg
              className="sidebar-user-chevron"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
