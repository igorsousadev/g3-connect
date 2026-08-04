import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listSystemProfiles,
  createSystemProfile,
  updateSystemProfile,
  toggleSystemProfileActive,
  deleteSystemProfile,
} from '../../services/systemProfileService'
import type { SystemProfile } from '../../services/systemProfileService'

const SLUG_REGEX = /^[a-z0-9_-]+$/

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

interface FormState {
  name: string
  slug: string
  description: string
}

const emptyForm: FormState = { name: '', slug: '', description: '' }

export function SystemProfilesPage() {
  const navigate = useNavigate()
  const [profiles, setProfiles]   = useState<SystemProfile[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [page, setPage]           = useState(1)
  const [pageSize, setPageSize]   = useState(10)

  // modal: null = fechado, 'create' = novo perfil, profile.id = editar
  const [modal, setModal] = useState<'create' | SystemProfile | null>(null)
  const [form, setForm]   = useState<FormState>(emptyForm)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setProfiles(await listSystemProfiles())
    } catch {
      setError('Erro ao carregar perfis. Verifique se a tabela system_profiles existe no banco.')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm(emptyForm)
    setFormError(null)
    setModal('create')
  }

  function openEdit(profile: SystemProfile) {
    setForm({ name: profile.name, slug: profile.slug, description: profile.description ?? '' })
    setFormError(null)
    setModal(profile)
  }

  function closeModal() {
    setModal(null)
    setFormError(null)
  }

  function handleNameChange(value: string) {
    setForm(prev => ({
      ...prev,
      name: value,
      ...(modal === 'create' ? { slug: slugify(value) } : {}),
    }))
  }

  function validate(): string | null {
    if (!form.name.trim()) return 'Nome obrigatório.'
    if (!form.slug.trim()) return 'Slug obrigatório.'
    if (!SLUG_REGEX.test(form.slug)) return 'Slug deve conter apenas letras minúsculas, números, underline ou hífen.'
    const editingId = modal !== 'create' ? (modal as SystemProfile).id : null
    const duplicate = profiles.find(p => p.slug === form.slug && p.id !== editingId)
    if (duplicate) return `O slug "${form.slug}" já está em uso.`
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) { setFormError(err); return }
    setSaving(true)
    setFormError(null)
    try {
      if (modal === 'create') {
        await createSystemProfile({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || null,
        })
      } else {
        const profile = modal as SystemProfile
        await updateSystemProfile(
          profile.id,
          {
            name: form.name.trim(),
            description: form.description.trim() || null,
          },
          form.name.trim(),
        )
      }
      await load()
      closeModal()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(profile: SystemProfile) {
    try {
      await toggleSystemProfileActive(profile.id, !profile.is_active, profile.name)
      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, is_active: !p.is_active } : p))
    } catch {
      alert('Erro ao alterar status do perfil.')
    }
  }

  async function handleDelete(profile: SystemProfile) {
    if (profile.is_system) return
    if (!confirm(`Remover perfil "${profile.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteSystemProfile(profile.id, profile.name)
      setProfiles(prev => prev.filter(p => p.id !== profile.id))
    } catch {
      alert('Erro ao remover perfil.')
    }
  }

  const totalPages = Math.max(1, Math.ceil(profiles.length / pageSize))
  const paginated  = profiles.slice((page - 1) * pageSize, page * pageSize)
  const isEditing  = modal !== null && modal !== 'create'
  const editingIsSystem = isEditing ? (modal as SystemProfile).is_system : false

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Gerenciamento de Perfis</h1>
          <p className="page-subtitle">Perfis disponíveis para seleção no cadastro de usuários</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/perfis')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            Usuários & Perfis
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo perfil
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : profiles.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <p>Nenhum perfil cadastrado. Execute a migração SQL para popular os perfis padrão.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Slug</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <tr key={p.id}>
                  <td className="td-primary">{p.name}</td>
                  <td className="td-mono">{p.slug}</td>
                  <td className="td-muted td-truncate">{p.description ?? '—'}</td>
                  <td>
                    <span className={`badge ${p.is_system ? 'badge--active' : 'badge--inactive'}`}>
                      {p.is_system ? 'Sistema' : 'Personalizado'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge--active' : 'badge--inactive'}`}>
                      {p.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="td-actions--multi">
                    <button className="btn-icon" onClick={() => openEdit(p)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar
                    </button>
                    <button className="btn-icon" onClick={() => handleToggle(p)}>
                      {p.is_active ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                          Desativar
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Ativar
                        </>
                      )}
                    </button>
                    {!p.is_system && (
                      <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(p)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && profiles.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {profiles.length} perfil{profiles.length !== 1 ? 'is' : ''} &mdash; página {page} de {totalPages}
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

      {modal !== null && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modal === 'create' ? 'Novo perfil' : 'Editar perfil'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {formError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{formError}</div>}

              <div className="form-group">
                <label className="form-label">Nome <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  className="form-input"
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ex.: Supervisor"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Slug <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  className="form-input td-mono"
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                  placeholder="Ex.: supervisor"
                  disabled={editingIsSystem}
                  style={editingIsSystem ? { background: 'var(--bg)', color: 'var(--text-muted)' } : {}}
                />
                {editingIsSystem && (
                  <p className="form-hint">O slug de perfis do sistema não pode ser alterado.</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição opcional do perfil"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>
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
