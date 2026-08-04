import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createDocumentType, getDocumentType, updateDocumentType } from '../services/documentTypeService'
import { isBlank } from '../lib/validation'
import type { DocumentTypeInsert } from '../types/documentType'
import { DOCUMENT_CATEGORIES } from '../types/documentType'

const emptyForm: DocumentTypeInsert = {
  name: '',
  description: '',
  category: null,
  default_validity_days: null,
  is_required: false,
  is_company_required: false,
  is_active: true,
}

export function DocumentTypeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)

  const [form, setForm] = useState<DocumentTypeInsert>(emptyForm)
  const [validityInput, setValidityInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEditing)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getDocumentType(id)
      .then(data => {
        setForm({
          name: data.name,
          description: data.description ?? '',
          category: data.category ?? null,
          default_validity_days: data.default_validity_days,
          is_required: data.is_required,
          is_company_required: data.is_company_required,
          is_active: data.is_active,
        })
        setValidityInput(data.default_validity_days ? String(data.default_validity_days) : '')
      })
      .catch(() => setError('Erro ao carregar tipo de documento.'))
      .finally(() => setFetching(false))
  }, [id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const name = form.name.trim()
    const description = (form.description ?? '').trim()

    if (isBlank(name)) {
      setError('Nome é obrigatório.')
      return
    }

    const days = validityInput.trim() ? parseInt(validityInput, 10) : null
    if (validityInput.trim() && (isNaN(days!) || days! <= 0)) {
      setError('Validade padrão deve ser um número positivo de dias.')
      return
    }

    setLoading(true)
    try {
      const payload: DocumentTypeInsert = {
        name,
        description: description || null,
        category: form.category || null,
        default_validity_days: days,
        is_required: form.is_required,
        is_company_required: form.is_company_required,
        is_active: form.is_active,
      }
      if (isEditing && id) {
        await updateDocumentType(id, payload)
      } else {
        await createDocumentType(payload)
      }
      navigate('/cadastro-documentos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar tipo de documento.')
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
        <button className="btn-back" onClick={() => navigate('/cadastro-documentos')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar
        </button>
        <h1 className="page-title">
          {isEditing ? 'Editar tipo de documento' : 'Novo tipo de documento'}
        </h1>
      </div>

      <div className="form-card form-card--wide">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-grid">
            <div className="form-group form-group--span2">
              <label className="form-label" htmlFor="name">Nome <span className="form-required">*</span></label>
              <input
                id="name"
                type="text"
                className="form-input"
                placeholder="Ex: ASO, NR10, NR35, CREA..."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="category">Categoria</label>
              <select
                id="category"
                className="form-input form-select"
                value={form.category ?? ''}
                onChange={e => {
                  const category = e.target.value || null
                  setForm(f => ({
                    ...f,
                    category,
                    is_company_required: category === 'Empresa' ? true : f.is_company_required,
                  }))
                }}
              >
                <option value="">— Sem categoria —</option>
                {DOCUMENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-group--span2">
              <label className="form-label" htmlFor="description">Descrição</label>
              <textarea
                id="description"
                className="form-input form-textarea"
                placeholder="Descreva este tipo de documento, quando é exigido, etc."
                value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="validity">Validade padrão (dias)</label>
              <input
                id="validity"
                type="number"
                min="1"
                className="form-input"
                placeholder="Ex: 365"
                value={validityInput}
                onChange={e => setValidityInput(e.target.value)}
              />
              <span className="form-hint">Deixe em branco se não houver validade definida.</span>
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
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_required}
                  onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))}
                />
                Documento obrigatório para o cargo
              </label>
            </div>

            <div className="form-group form-group--span2">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_company_required}
                  onChange={e => setForm(f => ({
                    ...f,
                    is_company_required: e.target.checked,
                    category: e.target.checked ? 'Empresa' : f.category === 'Empresa' ? null : f.category,
                  }))}
                />
                Documento obrigatório para empresa
              </label>
            </div>
          </div>

          <div className="form-actions form-actions--row">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/cadastro-documentos')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar tipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
