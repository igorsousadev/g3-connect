import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCompany } from '../services/companyService'
import {
  createPortalAccess,
  updatePortalAccess,
  deletePortalAccess,
  recordPortalAccess,
} from '../services/companyPortalAccessService'
import { useCompanyPortalAccess } from '../hooks/useCompanyPortalAccess'
import type { CompanyPortalAccess, CompanyPortalAccessInsert } from '../types/companyPortalAccess'

const EMPTY_FORM = {
  contractor_name:    '',
  portal_url:         '',
  username:           '',
  password_encrypted: '',
  notes:              '',
}

type ModalState = null | { kind: 'add' } | { kind: 'edit'; access: CompanyPortalAccess }

function formatDateTime(dt: string | null): string {
  if (!dt) return '—'
  const d = new Date(dt)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function CompanyPortalsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'operator'

  const [companyName, setCompanyName] = useState('')
  const { accesses, setAccesses, loading, error } = useCompanyPortalAccess(id)

  const [modal,     setModal]     = useState<ModalState>(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [showPass,  setShowPass]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [revealed,  setRevealed]  = useState<Set<string>>(new Set())
  const [copied,    setCopied]    = useState<string | null>(null)

  useEffect(() => {
    if (id) getCompany(id).then(c => setCompanyName(c.corporate_name)).catch(() => {})
  }, [id])

  function openAdd() {
    setForm(EMPTY_FORM)
    setShowPass(false)
    setSaveError(null)
    setModal({ kind: 'add' })
  }

  function openEdit(access: CompanyPortalAccess) {
    setForm({
      contractor_name:    access.contractor_name,
      portal_url:         access.portal_url ?? '',
      username:           access.username,
      password_encrypted: '',
      notes:              access.notes ?? '',
    })
    setShowPass(false)
    setSaveError(null)
    setModal({ kind: 'edit', access })
  }

  async function handleSave() {
    if (!id) return
    if (!form.contractor_name.trim()) { setSaveError('Informe o nome da contratante.'); return }
    if (!form.username.trim())        { setSaveError('Informe o usuário.');             return }
    if (modal?.kind === 'add' && !form.password_encrypted.trim()) { setSaveError('Informe a senha.'); return }

    setSaving(true); setSaveError(null)
    try {
      if (modal?.kind === 'add') {
        const payload: CompanyPortalAccessInsert = {
          company_id:         id,
          contractor_name:    form.contractor_name.trim(),
          portal_url:         form.portal_url.trim() || null,
          username:           form.username.trim(),
          password_encrypted: form.password_encrypted,
          notes:              form.notes.trim() || null,
          created_by:         null,
          updated_by:         null,
          last_access_at:     null,
          last_upload_at:     null,
          last_upload_by:     null,
        }
        const created = await createPortalAccess(payload)
        setAccesses(prev => [...prev, created].sort((a, b) => a.contractor_name.localeCompare(b.contractor_name)))
      } else if (modal?.kind === 'edit') {
        const updateData: Partial<CompanyPortalAccessInsert> = {
          contractor_name: form.contractor_name.trim(),
          portal_url:      form.portal_url.trim() || null,
          username:        form.username.trim(),
          notes:           form.notes.trim() || null,
        }
        if (form.password_encrypted.trim()) {
          updateData.password_encrypted = form.password_encrypted
        }
        const updated = await updatePortalAccess(modal.access.id, updateData, id, form.contractor_name.trim())
        setAccesses(prev => prev.map(a => a.id === modal.access.id ? updated : a))
      }
      setModal(null)
    } catch { setSaveError('Erro ao salvar acesso.') }
    finally   { setSaving(false) }
  }

  async function handleDelete(access: CompanyPortalAccess) {
    if (!id || !confirm(`Remover acesso ao portal "${access.contractor_name}"?`)) return
    setDeleting(access.id)
    try {
      await deletePortalAccess(access.id, id, access.contractor_name)
      setAccesses(prev => prev.filter(a => a.id !== access.id))
    } catch { alert('Erro ao remover acesso.') }
    finally   { setDeleting(null) }
  }

  async function handleOpenPortal(access: CompanyPortalAccess) {
    if (!id || !access.portal_url) return
    window.open(access.portal_url, '_blank', 'noopener,noreferrer')
    await recordPortalAccess(access.id, id, access.contractor_name)
    setAccesses(prev => prev.map(a =>
      a.id === access.id ? { ...a, last_access_at: new Date().toISOString() } : a
    ))
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    } catch { /* silent */ }
  }

  function toggleReveal(accessId: string) {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(accessId)) next.delete(accessId); else next.add(accessId)
      return next
    })
  }

  return (
    <div className="page page--wide">
      <div className="page-header page-header--row">
        <div>
          <button className="btn-back" onClick={() => navigate(`/empresas/${id}/editar`)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {companyName || 'Empresa'}
          </button>
          <h1 className="page-title">Portais da Contratante</h1>
          <p className="page-subtitle">Acessos externos para homologação</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Adicionar acesso
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : accesses.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p>Nenhum acesso de portal cadastrado.</p>
            {canEdit && (
              <button className="btn btn-primary" onClick={openAdd}>Adicionar primeiro acesso</button>
            )}
          </div>
        ) : (
          <table className="table portal-table">
            <thead>
              <tr>
                <th>Contratante</th>
                <th>Portal</th>
                <th>Usuário</th>
                <th>Senha</th>
                <th>Observações</th>
                <th>Último acesso</th>
                <th>Último upload</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {accesses.map(access => {
                const isRevealed = revealed.has(access.id)
                return (
                  <tr key={access.id}>
                    <td className="td-primary">{access.contractor_name}</td>

                    <td>
                      {access.portal_url ? (
                        <button
                          className="btn-icon btn-icon--submit"
                          onClick={() => handleOpenPortal(access)}
                          title={access.portal_url}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          Abrir
                        </button>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>

                    <td>
                      <div className="portal-credential">
                        <span className="portal-value">{access.username}</span>
                        <button
                          className={`btn-icon portal-copy-btn${copied === `u:${access.id}` ? ' portal-copy-btn--done' : ''}`}
                          onClick={() => copy(access.username, `u:${access.id}`)}
                          title="Copiar usuário"
                        >
                          {copied === `u:${access.id}` ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                    </td>

                    <td>
                      <div className="portal-credential">
                        <span className="portal-value portal-value--mono">
                          {isRevealed ? access.password_encrypted : '••••••••'}
                        </span>
                        <button
                          className="btn-icon"
                          onClick={() => toggleReveal(access.id)}
                          title={isRevealed ? 'Ocultar senha' : 'Revelar senha'}
                        >
                          {isRevealed ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                        <button
                          className={`btn-icon portal-copy-btn${copied === `p:${access.id}` ? ' portal-copy-btn--done' : ''}`}
                          onClick={() => copy(access.password_encrypted, `p:${access.id}`)}
                          title="Copiar senha"
                        >
                          {copied === `p:${access.id}` ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                    </td>

                    <td className="td-muted td-note">{access.notes || '—'}</td>
                    <td className="td-muted portal-dt">{formatDateTime(access.last_access_at)}</td>
                    <td className="td-muted portal-dt">{formatDateTime(access.last_upload_at)}</td>

                    {canEdit && (
                      <td className="td-actions">
                        <button className="btn-icon" onClick={() => openEdit(access)} title="Editar acesso">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          className="btn-icon btn-icon--danger"
                          disabled={deleting === access.id}
                          onClick={() => handleDelete(access)}
                          title="Remover acesso"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="op-count" style={{ marginTop: 12 }}>
        {!loading && `${accesses.length} acesso${accesses.length !== 1 ? 's' : ''} cadastrado${accesses.length !== 1 ? 's' : ''}`}
      </p>

      {/* ── Modal add/edit ──────────────────────────────── */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {modal.kind === 'add' ? 'Adicionar acesso ao portal' : `Editar — ${modal.access.contractor_name}`}
              </span>
              <button className="modal-close" onClick={() => setModal(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {saveError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{saveError}</div>}

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Contratante <span className="form-required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: LDC, Petrobras, Vale..."
                  value={form.contractor_name}
                  onChange={e => setForm(f => ({ ...f, contractor_name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">URL do portal</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://portal.contratante.com.br"
                  value={form.portal_url}
                  onChange={e => setForm(f => ({ ...f, portal_url: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Usuário <span className="form-required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  autoComplete="off"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">
                  Senha {modal.kind === 'add' && <span className="form-required">*</span>}
                  {modal.kind === 'edit' && <span className="form-hint" style={{ display: 'inline', marginLeft: 6 }}>(em branco = manter atual)</span>}
                </label>
                <div className="portal-input-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    autoComplete="new-password"
                    value={form.password_encrypted}
                    onChange={e => setForm(f => ({ ...f, password_encrypted: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="portal-reveal-btn"
                    onClick={() => setShowPass(s => !s)}
                    title={showPass ? 'Ocultar' : 'Mostrar senha'}
                  >
                    {showPass ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input form-textarea"
                  rows={2}
                  placeholder="Informações adicionais sobre o portal..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
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
