import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createManagedUser } from '../../services/userManagementService'
import { listCompanies } from '../../services/companyService'
import { ROLE_LABELS } from '../../types/profile'
import type { UserRole } from '../../types/profile'
import type { Company } from '../../types/company'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Perfis disponíveis para criação de usuário (excluindo client — gerenciado separadamente, se necessário)
const CREATABLE_ROLES: UserRole[] = ['admin', 'operator', 'specialist', 'supervisor', 'client']

interface FormState {
  full_name: string
  email: string
  role: UserRole
  company_id: string
  is_active: boolean
}

const emptyForm: FormState = {
  full_name:  '',
  email:      '',
  role:       'operator',
  company_id: '',
  is_active:  true,
}

export function CreateUserPage() {
  const navigate = useNavigate()

  const [form, setForm]         = useState<FormState>(emptyForm)
  const [companies, setCompanies] = useState<Company[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<{ email: string } | null>(null)

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => {})
  }, [])

  function validate(): string | null {
    if (!form.full_name.trim()) return 'Nome completo obrigatório.'
    if (!form.email.trim()) return 'E-mail obrigatório.'
    if (!EMAIL_REGEX.test(form.email.trim())) return 'E-mail inválido.'
    if (!form.role) return 'Perfil obrigatório.'
    if (form.role === 'client' && !form.company_id) return 'Empresa obrigatória para perfil Cliente.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setSaving(true)
    setError(null)
    try {
      await createManagedUser({
        full_name:  form.full_name.trim(),
        email:      form.email.trim().toLowerCase(),
        role:       form.role,
        company_id: form.company_id || null,
        is_active:  form.is_active,
      })
      setSuccess({ email: form.email.trim().toLowerCase() })
      setForm(emptyForm)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar usuário.')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate('/admin/perfis')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Voltar
          </button>
          <h1 className="page-title">Cadastro de Usuários</h1>
        </div>
        <div className="form-card form-card--wide">
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Usuário criado</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
              <strong>{success.email}</strong>
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
              Senha padrão: <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>g3connect</code>
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => navigate('/admin/perfis')}>
                Ver usuários
              </button>
              <button className="btn btn-primary" onClick={() => setSuccess(null)}>
                Criar outro
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/admin/perfis')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar
        </button>
        <h1 className="page-title">Novo usuário</h1>
      </div>

      <div className="form-card form-card--wide">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="full_name">Nome completo <span className="form-required">*</span></label>
              <input
                id="full_name"
                className="form-input"
                type="text"
                value={form.full_name}
                onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Nome completo do usuário"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">E-mail <span className="form-required">*</span></label>
              <input
                id="email"
                className="form-input"
                type="email"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="role">Perfil de acesso <span className="form-required">*</span></label>
              <select
                id="role"
                className="form-input form-select"
                value={form.role}
                onChange={e => setForm(prev => ({ ...prev, role: e.target.value as UserRole, company_id: '' }))}
              >
                {CREATABLE_ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="is_active">Status</label>
              <select
                id="is_active"
                className="form-input form-select"
                value={form.is_active ? 'active' : 'inactive'}
                onChange={e => setForm(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>

            {form.role === 'client' && (
              <div className="form-group form-group--span2">
                <label className="form-label" htmlFor="company_id">Empresa vinculada <span className="form-required">*</span></label>
                <select
                  id="company_id"
                  className="form-input form-select"
                  value={form.company_id}
                  onChange={e => setForm(prev => ({ ...prev, company_id: e.target.value }))}
                >
                  <option value="">— Selecionar empresa —</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.trade_name ?? c.corporate_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group form-group--span2">
              <span className="form-hint">
                A senha padrão para usuários criados pela administração é <strong>g3connect</strong>.
                O usuário deverá alterá-la no primeiro acesso.
              </span>
            </div>
          </div>

          <div className="form-actions form-actions--row">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/perfis')} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
