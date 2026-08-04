import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createSegment, getSegment, updateSegment } from '../services/segmentService'
import { isBlank } from '../lib/validation'
import type { SegmentInsert } from '../types/segment'

const emptyForm: SegmentInsert = {
  name:        '',
  description: '',
  status:      'active',
}

export function SegmentFormPage() {
  const navigate  = useNavigate()
  const { id }    = useParams<{ id: string }>()
  const isEditing = Boolean(id)

  const [form,     setForm]     = useState<SegmentInsert>(emptyForm)
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(isEditing)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!id) return
    getSegment(id)
      .then(data => setForm({ name: data.name, description: data.description, status: data.status }))
      .catch(() => setError('Erro ao carregar segmento.'))
      .finally(() => setFetching(false))
  }, [id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const name        = form.name.trim()
    const description = form.description.trim()

    if (isBlank(name)) {
      setError('Nome do segmento é obrigatório.')
      return
    }
    if (isBlank(description)) {
      setError('Descrição do segmento é obrigatória.')
      return
    }

    setLoading(true)
    try {
      const payload: SegmentInsert = { name, description, status: form.status }
      if (isEditing && id) {
        await updateSegment(id, payload)
      } else {
        await createSegment(payload)
      }
      navigate('/segmentos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar segmento.')
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
        <button className="btn-back" onClick={() => navigate('/segmentos')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar
        </button>
        <h1 className="page-title">{isEditing ? 'Editar segmento' : 'Novo segmento'}</h1>
      </div>

      <div className="form-card form-card--wide">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Nome <span className="form-required">*</span>
              </label>
              <input
                id="name"
                type="text"
                className="form-input"
                placeholder="Ex: Limpeza, Segurança Patrimonial, Jardinagem..."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="status">Status</label>
              <select
                id="status"
                className="form-input form-select"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>

            <div className="form-group form-group--span2">
              <label className="form-label" htmlFor="description">
                Descrição <span className="form-required">*</span>
              </label>
              <textarea
                id="description"
                className="form-input form-textarea"
                placeholder="Descreva as atividades ou características deste segmento..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <div className="form-actions form-actions--row">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/segmentos')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar segmento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
