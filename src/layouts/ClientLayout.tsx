import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const appName         = import.meta.env.VITE_APP_NAME       || 'G3 Connect'
const supportWhatsapp = import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined
const supportEmail    = import.meta.env.VITE_SUPPORT_EMAIL    as string | undefined

const NAV_ITEMS = [
  {
    to: '/portal/dashboard',
    label: 'Visão Geral',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    to: '/portal/empresa',
    label: 'Empresa',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
        <path d="M9 21v-4h6v4"/><path d="M9 8h1m5 0h1M9 12h1m5 0h1"/>
      </svg>
    ),
  },
  {
    to: '/portal/funcionarios',
    label: 'Funcionários',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    to: '/portal/pendencias',
    label: 'Pendências',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    to: '/portal/historico',
    label: 'Histórico',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
]

const SIGNOUT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const KEY_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="15" r="5"/>
    <path d="M21 2l-9.3 9.3M15.5 7.5l3 3M19 6l2-2"/>
  </svg>
)

export function ClientLayout({ companyName }: { companyName: string }) {
  const { signOut, profile, user } = useAuth()
  const navigate             = useNavigate()
  const [collapsed,    setCollapsed]    = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!dropdownOpen) return
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dropdownOpen])

  const waLink = supportWhatsapp
    ? `https://wa.me/${supportWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Preciso de suporte operacional.')}`
    : null

  const emailLink = supportEmail ? `mailto:${supportEmail}` : null

  const userName    = profile?.full_name ?? profile?.email ?? 'Usuário'
  const userEmail   = profile?.email ?? user?.email ?? ''
  const userInitial = userName[0].toUpperCase()

  function closeMobileMenu() { setMobileOpen(false) }

  return (
    <div className="client-layout">

      {/* ── Sidebar desktop reservada para uso futuro ───────────── */}
      <aside className={`client-sidebar-desktop${collapsed ? ' client-sidebar-desktop--collapsed' : ''}`}>
        <div className="client-sidebar-desktop-header">
          {!collapsed && (
            <div className="client-sidebar-desktop-brand">
              <span className="client-brand-name">{appName}</span>
              <span className="client-sidebar-desktop-company">{companyName}</span>
            </div>
          )}
          <button
            className="client-sidebar-toggle"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            )}
          </button>
        </div>
        <nav className="client-sidebar-desktop-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `client-sidebar-desktop-link${isActive ? ' active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="client-sidebar-desktop-icon">{item.icon}</span>
              {!collapsed && <span className="client-sidebar-desktop-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="client-sidebar-desktop-footer">
          {!collapsed && (
            <NavLink to="/portal/alterar-senha" className="client-signout-btn client-signout-btn--sidebar" style={{ marginBottom: 4 }}>
              {KEY_ICON}
              <span>Alterar senha</span>
            </NavLink>
          )}
          <button
            className="client-signout-btn client-signout-btn--sidebar"
            onClick={handleSignOut}
            title={collapsed ? 'Sair' : undefined}
          >
            {SIGNOUT_ICON}
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── Área de conteúdo ────────────────────────────────────── */}
      <div className="client-content">
        <header className="client-header">
          {/* Hambúrguer — visível apenas no mobile */}
          <button className="client-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="client-header-brand">
            <span className="client-brand-name">{appName}</span>
            <span className="client-company-tag">{companyName}</span>
          </div>

          {/* Nav horizontal — visível apenas no desktop */}
          <nav className="client-nav">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `client-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Dropdown de usuário — visível apenas no desktop */}
          <div className="client-user-dropdown client-header-actions--desktop" ref={dropdownRef}>
            <button
              className="client-user-btn"
              onClick={() => setDropdownOpen(o => !o)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <span className="client-user-avatar">{userInitial}</span>
              <span className="client-user-name">{companyName}</span>
              <svg
                className={`client-user-chevron${dropdownOpen ? ' open' : ''}`}
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {dropdownOpen && (
              <div className="client-user-menu">
                <div className="client-user-menu-info">
                  <span className="client-user-menu-username">{companyName}</span>
                  <span className="client-user-menu-company">{userEmail}</span>
                </div>
                <div className="client-user-menu-divider" />
                <NavLink
                  to="/portal/alterar-senha"
                  className="client-user-menu-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  {KEY_ICON}
                  Alterar senha
                </NavLink>
                <button className="client-user-menu-item client-user-menu-item--danger" onClick={handleSignOut}>
                  {SIGNOUT_ICON}
                  Sair
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="client-main">
          <Outlet />
        </main>
      </div>

      {/* ── Sidebar mobile (overlay) ─────────────────────────────── */}
      {mobileOpen && <div className="client-sidebar-overlay" onClick={closeMobileMenu} />}
      <aside className={`client-sidebar${mobileOpen ? ' client-sidebar--open' : ''}`}>
        <div className="client-sidebar-header">
          <span className="client-brand-name">{appName}</span>
          <button className="client-sidebar-close" onClick={closeMobileMenu} aria-label="Fechar menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="client-sidebar-user">
          <span className="client-sidebar-user-avatar">{userInitial}</span>
          <div className="client-sidebar-user-info">
            <span className="client-sidebar-user-name">{companyName}</span>
            <span className="client-sidebar-user-company">{userEmail}</span>
          </div>
        </div>

        <nav className="client-sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={({ isActive }) => `client-sidebar-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="client-sidebar-footer">
          <NavLink
            to="/portal/alterar-senha"
            onClick={closeMobileMenu}
            className="client-sidebar-link client-sidebar-link--action"
          >
            {KEY_ICON}
            <span>Alterar senha</span>
          </NavLink>
          <button className="client-signout-btn client-signout-btn--sidebar" onClick={handleSignOut}>
            {SIGNOUT_ICON}
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Botões flutuantes de suporte ────────────────────────── */}
      {waLink && (
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="client-wa-float" aria-label="Suporte via WhatsApp">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}
      {emailLink && (
        <a href={emailLink} className="client-email-float" aria-label="Suporte via E-mail">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </a>
      )}
    </div>
  )
}
