import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listProfiles, updateProfile } from '../../services/profileService'
import { listCompanies } from '../../services/companyService'
import { logActivity } from '../../services/activityLogService'
import { useAuth } from '../../contexts/AuthContext'
import { FilterCardsToggle } from '../../components/FilterCardsToggle'
import type { Profile, ProfileUpdate, UserRole } from '../../types/profile'
import { ROLE_LABELS } from '../../types/profile'
import type { Company } from '../../types/company'

export function ProfilesPage() {
  const navigate = useNavigate()
  const { profile: currentProfile } = useAuth()
  const [profiles,  setProfiles]  = useState<Profile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'admin' | 'operator' | 'specialist' | 'supervisor' | 'client'>('all')
  const [showFilterCards, setShowFilterCards] = useState(true)
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)

  const [editRole,      setEditRole]      = useState<UserRole>('operator')
  const [editCompanyId, setEditCompanyId] = useState<string>('')
  const [editIsActive,  setEditIsActive]  = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [p, c] = await Promise.all([listProfiles(), listCompanies()])
    setProfiles(p)
    setCompanies(c)
    setLoading(false)
  }

  function openEdit(profile: Profile) {
    setEditing(profile)
    setEditRole(profile.role)
    setEditCompanyId(profile.company_id ?? '')
    setEditIsActive(profile.is_active)
    setError(null)
  }

  function closeEdit() {
    setEditing(null)
    setError(null)
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const roleChanged = editing.role !== editRole
      const updates: ProfileUpdate = {
        role: editRole,
        company_id: editRole === 'client' && editCompanyId ? editCompanyId : null,
        is_active: editIsActive,
      }
      await updateProfile(editing.id, updates)
      if (roleChanged) {
        logActivity({
          entityType: 'user_profile',
          entityId: editing.id,
          actionType: 'updated',
          description: `Perfil de "${displayName(editing)}" alterado de ${ROLE_LABELS[editing.role]} para ${ROLE_LABELS[editRole]}.`,
          metadata: { old_role: editing.role, new_role: editRole },
        })
      }
      await loadAll()
      closeEdit()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const displayName = (p: Profile) => p.full_name ?? p.email
  const companyName = (p: Profile) => {
    if (!p.companies) return '—'
    return p.companies.trade_name ?? p.companies.corporate_name
  }

  const summary = {
    total:      profiles.length,
    active:     profiles.filter(p =>  p.is_active).length,
    inactive:   profiles.filter(p => !p.is_active).length,
    admin:      profiles.filter(p => p.role === 'admin').length,
    operator:   profiles.filter(p => p.role === 'operator').length,
    specialist: profiles.filter(p => p.role === 'specialist').length,
    supervisor: profiles.filter(p => p.role === 'supervisor').length,
    client:     profiles.filter(p => p.role === 'client').length,
  }

  const filtered = statusFilter === 'all'      ? profiles
    : statusFilter === 'active'                ? profiles.filter(p =>  p.is_active)
    : statusFilter === 'inactive'              ? profiles.filter(p => !p.is_active)
    : profiles.filter(p => p.role === statusFilter)

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Usuários & Perfis</h1>
          <p className="page-subtitle">Gerencie papéis de acesso e vinculação de empresa</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <FilterCardsToggle visible={showFilterCards} onToggle={() => setShowFilterCards(v => !v)} />
          <button className="btn btn-secondary" onClick={() => navigate('/admin/perfis-sistema')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Perfis do sistema
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/usuarios')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo usuário
          </button>
        </div>
      </div>

      {showFilterCards && <div className="cards-grid" style={{ marginBottom: 20 }}>
        {([
          {
            key: 'all' as const, label: 'Todos', value: summary.total, color: 'default',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
          },
          {
            key: 'active' as const, label: 'Ativos', value: summary.active, color: 'green',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" /></svg>,
          },
          {
            key: 'inactive' as const, label: 'Inativos', value: summary.inactive, color: 'red',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" /></svg>,
          },
          {
            key: 'admin' as const, label: 'Admin', value: summary.admin, color: 'indigo',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
          },
          {
            key: 'supervisor' as const, label: 'Supervisor', value: summary.supervisor, color: 'violet',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
          },
          {
            key: 'operator' as const, label: 'Operador', value: summary.operator, color: 'blue',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
          },
          {
            key: 'specialist' as const, label: 'Especialista', value: summary.specialist, color: 'teal',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
          },
          {
            key: 'client' as const, label: 'Cliente', value: summary.client, color: 'amber',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
          },
        ] as const).map(card => (
          <div
            key={card.key}
            className={`stat-card stat-card--${card.color}${statusFilter === card.key ? ' stat-card--active' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => { setStatusFilter(card.key); setPage(1) }}
          >
            <div className="stat-card-icon">{card.icon}</div>
            <div className="stat-card-body">
              <span className="stat-card-value">{loading ? '...' : card.value}</span>
              <span className="stat-card-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>}

      <div className="table-container">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <p>{profiles.length === 0 ? 'Nenhum usuário cadastrado.' : 'Nenhum usuário encontrado para o filtro selecionado.'}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome / E-mail</th>
                <th>Perfil</th>
                <th>Empresa</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <tr key={p.id}>
                  <td>
                    <span className="td-primary">{displayName(p)}</span>
                    {p.full_name && <span className="td-muted" style={{ display: 'block', fontSize: '12px' }}>{p.email}</span>}
                  </td>
                  <td>
                    <span className={`badge badge--role badge--role-${p.role}`}>
                      {ROLE_LABELS[p.role]}
                    </span>
                  </td>
                  <td className="td-muted">{companyName(p)}</td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge--active' : 'badge--inactive'}`}>
                      {p.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="td-actions">
                    <button className="btn-icon" onClick={() => openEdit(p)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {filtered.length} usuário{filtered.length !== 1 ? 's' : ''} &mdash; página {page} de {totalPages}
          </div>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(1)}          disabled={page === 1}>«</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
          <select
            className="form-input form-select"
            style={{ width: 'auto' }}
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
          >
            {[5,10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar perfil</h2>
              <button className="modal-close" onClick={closeEdit}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <p className="profiles-edit-name">{displayName(editing)}</p>
              <p className="profiles-edit-email">{editing.full_name ? editing.email : ''}</p>

              {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

              {(() => {
                const isSelf = editing.id === currentProfile?.id
                return (
                  <div className="form-group">
                    <label className="form-label">Papel de acesso</label>
                    <select
                      className="form-input form-select"
                      value={editRole}
                      onChange={e => setEditRole(e.target.value as UserRole)}
                      disabled={isSelf}
                    >
                      {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    {isSelf && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        Não é possível alterar o próprio perfil de acesso.
                      </p>
                    )}
                  </div>
                )
              })()}

              {editRole === 'client' && (
                <div className="form-group">
                  <label className="form-label">Empresa vinculada</label>
                  <select className="form-input form-select" value={editCompanyId} onChange={e => setEditCompanyId(e.target.value)}>
                    <option value="">— Selecionar empresa —</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.trade_name ?? c.corporate_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input form-select" value={editIsActive ? 'active' : 'inactive'} onChange={e => setEditIsActive(e.target.value === 'active')}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeEdit} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
