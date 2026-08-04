import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createContractor, getContractor, updateContractor } from '../services/contractorService'
import { validateCNPJ, isBlank } from '../lib/validation'
import type { ContractorInsert, ContractorStatus, ContractorUpdate } from '../types/contractor'

function formatCNPJ(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatWhatsApp(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}

const emptyForm: ContractorInsert = {
  corporate_name:   '',
  trade_name:       '',
  cnpj:             '',
  code:             '',
  responsible_name: '',
  whatsapp:         '',
  email:            '',
  status:           'active',
  notes:            '',
}

export function ContractorFormPage() {
  const navigate  = useNavigate()
  const { id }    = useParams<{ id: string }>()
  const isEditing = Boolean(id)

  const [form,     setForm]     = useState<ContractorInsert>(emptyForm)
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(isEditing)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!id) return
    getContractor(id)
      .then(data => setForm({
        corporate_name:   data.corporate_name,
        trade_name:       data.trade_name,
        cnpj:             data.cnpj,
        code:             data.code,
        responsible_name: data.responsible_name,
        whatsapp:         data.whatsapp,
        email:            data.email,
        status:           data.status,
        notes:            data.notes,
      }))
      .catch(() => setError('Erro ao carregar contratante.'))
      .finally(() => setFetching(false))
  }, [id])

  function set(field: keyof ContractorInsert, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!isEditing) {
      const corporate_name   = form.corporate_name.trim()
      const trade_name       = form.trade_name.trim()
      const cnpj             = form.cnpj.trim()
      const code             = form.code.trim()
      const responsible_name = form.responsible_name.trim()
      const whatsapp         = form.whatsapp.trim()
      const email            = form.email.trim()
      const notes            = form.notes.trim()

      if (isBlank(corporate_name))   { setError('Razão social é obrigatória.');              return }
      if (isBlank(trade_name))       { setError('Nome fantasia é obrigatório.');              return }
      if (isBlank(cnpj))             { setError('CNPJ é obrigatório.');                       return }
      if (!validateCNPJ(cnpj))       { setError('CNPJ inválido. Verifique os dígitos informados.'); return }
      if (isBlank(code))             { setError('Código da contratante é obrigatório.');      return }
      if (isBlank(responsible_name)) { setError('Responsável é obrigatório.');                return }
      if (isBlank(whatsapp))         { setError('WhatsApp é obrigatório.');                   return }
      if (isBlank(email))            { setError('E-mail é obrigatório.');                     return }
      if (isBlank(notes))            { setError('Observações são obrigatórias.');              return }

      const payload: ContractorInsert = {
        corporate_name,
        trade_name,
        cnpj,
        code,
        responsible_name,
        whatsapp,
        email,
        status: form.status,
        notes,
      }

      setLoading(true)
      try {
        await createContractor(payload)
        navigate('/contratantes')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao salvar contratante. Tente novamente.')
      } finally {
        setLoading(false)
      }
      return
    }

    // Modo edição — apenas campos editáveis
    const responsible_name = form.responsible_name.trim()
    const whatsapp         = form.whatsapp.trim()
    const email            = form.email.trim()
    const notes            = form.notes.trim()

    if (isBlank(responsible_name)) { setError('Responsável é obrigatório.');   return }
    if (isBlank(whatsapp))         { setError('WhatsApp é obrigatório.');       return }
    if (isBlank(email))            { setError('E-mail é obrigatório.');         return }
    if (isBlank(notes))            { setError('Observações são obrigatórias.'); return }

    const updatePayload: ContractorUpdate = {
      responsible_name,
      whatsapp,
      email,
      status: form.status,
      notes,
    }

    setLoading(true)
    try {
      await updateContractor(id!, updatePayload)
      navigate('/contratantes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar contratante. Tente novamente.')
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
        <button className="btn-back" onClick={() => navigate('/contratantes')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Contratantes
        </button>
        <h1 className="page-title">{isEditing ? 'Editar contratante' : 'Nova contratante'}</h1>
      </div>

      <div className="form-card form-card--wide">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          {isEditing && (
            <p className="form-hint" style={{ marginBottom: 16 }}>
              Razão social, nome fantasia, CNPJ e código não podem ser alterados após o cadastro.
            </p>
          )}

          <div className="form-grid">
            <div className="form-group form-group--span2">
              <label className="form-label" htmlFor="corporate_name">
                Razão social <span className="form-required">*</span>
              </label>
              <input
                id="corporate_name"
                type="text"
                className="form-input"
                value={form.corporate_name}
                onChange={e => set('corporate_name', e.target.value)}
                disabled={isEditing}
                required={!isEditing}
              />
              {isEditing && <span className="form-hint">Campo bloqueado após o cadastro.</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="trade_name">
                Nome fantasia <span className="form-required">*</span>
              </label>
              <input
                id="trade_name"
                type="text"
                className="form-input"
                value={form.trade_name}
                onChange={e => set('trade_name', e.target.value)}
                disabled={isEditing}
                required={!isEditing}
              />
              {isEditing && <span className="form-hint">Campo bloqueado após o cadastro.</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cnpj">
                CNPJ <span className="form-required">*</span>
              </label>
              <input
                id="cnpj"
                type="text"
                className="form-input"
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={e => set('cnpj', formatCNPJ(e.target.value))}
                disabled={isEditing}
                required={!isEditing}
              />
              {isEditing && <span className="form-hint">Campo bloqueado após o cadastro.</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="code">
                Código <span className="form-required">*</span>
              </label>
              <input
                id="code"
                type="text"
                className="form-input"
                value={form.code}
                onChange={e => set('code', e.target.value)}
                disabled={isEditing}
                required={!isEditing}
              />
              {isEditing && <span className="form-hint">Campo bloqueado após o cadastro.</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="responsible_name">
                Responsável <span className="form-required">*</span>
              </label>
              <input
                id="responsible_name"
                type="text"
                className="form-input"
                value={form.responsible_name}
                onChange={e => set('responsible_name', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="whatsapp">
                WhatsApp <span className="form-required">*</span>
              </label>
              <input
                id="whatsapp"
                type="text"
                className="form-input"
                placeholder="(00) 00000-0000"
                value={form.whatsapp}
                onChange={e => set('whatsapp', formatWhatsApp(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                E-mail <span className="form-required">*</span>
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="status">
                Status <span className="form-required">*</span>
              </label>
              <select
                id="status"
                className="form-input form-select"
                value={form.status}
                onChange={e => set('status', e.target.value as ContractorStatus)}
                required
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>

            <div className="form-group form-group--span2">
              <label className="form-label" htmlFor="notes">
                Observações <span className="form-required">*</span>
              </label>
              <textarea
                id="notes"
                className="form-input form-textarea"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>

          <div className="form-actions form-actions--row">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/contratantes')}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar contratante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
