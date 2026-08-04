import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMessageTemplate, createMessageTemplate, updateMessageTemplate } from '../services/messageTemplateService'
import { TEMPLATE_VARIABLES } from '../lib/templateUtils'
import type { TemplateCategory } from '../types/messageTemplate'

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'pending_document',  label: 'Documento Pendente'  },
  { value: 'expiring_document', label: 'Documento Vencendo'  },
  { value: 'rejected_document', label: 'Documento Rejeitado' },
  { value: 'onboarding',        label: 'Onboarding'          },
  { value: 'generic',           label: 'Genérico'            },
]

export function MessageTemplateFormPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(isEditing)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [name,     setName]     = useState('')
  const [category, setCategory] = useState<TemplateCategory>('generic')
  const [content,  setContent]  = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!isEditing || !id) return
    getMessageTemplate(id)
      .then(tpl => {
        setName(tpl.name)
        setCategory(tpl.category)
        setContent(tpl.content)
        setIsActive(tpl.is_active)
      })
      .catch(() => setError('Erro ao carregar template.'))
      .finally(() => setLoading(false))
  }, [id, isEditing])

  function insertVariable(key: string) {
    setContent(prev => prev + key)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (!content.trim()) { setError('Conteúdo é obrigatório.'); return }

    setSaving(true)
    try {
      const payload = { name: name.trim(), category, content: content.trim(), is_active: isActive }
      if (isEditing && id) {
        await updateMessageTemplate(id, payload)
      } else {
        await createMessageTemplate(payload)
      }
      navigate('/templates-whatsapp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar template.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="page"><div className="table-loading"><div className="spinner" /></div></div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/templates-whatsapp')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Templates WhatsApp
        </button>
        <h1 className="page-title">{isEditing ? 'Editar template' : 'Novo template'}</h1>
        <p className="page-subtitle">Templates de mensagem para comunicação operacional via WhatsApp</p>
      </div>

      <div className="form-card form-card--wide">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nome <span className="form-required">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Cobrança de documento vencendo"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Categoria <span className="form-required">*</span></label>
              <select
                className="form-input form-select"
                value={category}
                onChange={e => setCategory(e.target.value as TemplateCategory)}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-group--span2">
              <div className="tpl-form-content-header">
                <label className="form-label">Conteúdo <span className="form-required">*</span></label>
                <div className="tpl-var-chips">
                  <span className="tpl-var-chips-label">Inserir variável:</span>
                  {TEMPLATE_VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      className="tpl-var-chip"
                      onClick={() => insertVariable(v.key)}
                      title={v.description}
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="form-input form-textarea"
                placeholder={`Ex.:\n\nOlá, {{responsavel}}.\n\nIdentificamos que o documento {{documento}} do funcionário {{funcionario}} está vencendo em {{dias}} dias.\n\nPoderia nos enviar a atualização?`}
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={8}
                required
              />
              <div className="tpl-var-table">
                <p className="tpl-var-table-title">Variáveis disponíveis</p>
                <div className="tpl-var-rows">
                  {TEMPLATE_VARIABLES.map(v => (
                    <div key={v.key} className="tpl-var-row">
                      <code className="tpl-var-code">{v.key}</code>
                      <span className="tpl-var-desc">{v.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group form-group--span2">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                />
                Template ativo
              </label>
              <span className="form-hint">Templates inativos não aparecem no seletor de mensagens.</span>
            </div>
          </div>

          <div className="form-actions form-actions--row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/templates-whatsapp')}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
