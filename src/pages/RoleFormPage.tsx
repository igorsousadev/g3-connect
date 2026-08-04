import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createRole, getRole, updateRole } from '../services/roleService'
import { isBlank } from '../lib/validation'
import type { RoleInsert } from '../types/role'
import { RoleDocumentChecklistSection } from '../components/RoleDocumentChecklistSection'

const emptyForm: RoleInsert = {
  name: '',
  description: '',
  is_active: true,
}

export function RoleFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)

  const [form, setForm] = useState<RoleInsert>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEditing)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getRole(id)
      .then(data => setForm({ name: data.name, description: data.description ?? '', is_active: data.is_active }))
      .catch(() => setError('Erro ao carregar cargo.'))
      .finally(() => setFetching(false))
  }, [id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const name = form.name.trim()
    const description = (form.description ?? '').trim()

    if (isBlank(name)) {
      setError('Nome do cargo é obrigatório.')
      return
    }

    setLoading(true)
    try {
      const payload: RoleInsert = { name, description: description || null, is_active: form.is_active }
      if (isEditing && id) {
        await updateRole(id, payload)
      } else {
        await createRole(payload)
      }
      navigate('/cargos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cargo.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="spinner" /> Carregando...
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/cargos')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar
        </button>
        <h1 className="page-title">{isEditing ? 'Editar cargo' : 'Novo cargo'}</h1>
      </div>

      <div className="form-card form-card--wide">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Nome <span className="form-required">*</span></label>
              <input
                id="name"
                type="text"
                className="form-input"
                placeholder="Ex: Eletricista, Operador de Empilhadeira..."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="is_active">Status</label>
              <select
                id="is_active"
                className="form-input form-select"
                value={form.is_active ? 'true' : 'false'}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            <div className="form-group form-group--span2">
              <label className="form-label" htmlFor="description">Descrição</label>
              <textarea
                id="description"
                className="form-input form-textarea"
                placeholder="Descreva as responsabilidades ou características deste cargo..."
                value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <div className="form-actions form-actions--row">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/cargos')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar cargo'}
            </button>
          </div>
        </form>
      </div>

      {isEditing && id ? (
        <RoleDocumentChecklistSection roleId={id} />
      ) : (
        <div className="form-card form-card--wide" style={{ marginTop: 24 }}>
          <div className="alert" style={{ margin: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', color: 'var(--text-secondary)', fontSize: 14 }}>
            Salve o cargo antes de configurar o checklist documental.
          </div>
        </div>
      )}
    </div>
  )
}
