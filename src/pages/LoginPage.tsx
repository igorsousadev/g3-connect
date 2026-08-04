import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FloatingContactButton } from '../components/FloatingContactButton'
import './LoginPage.css'

const appName = import.meta.env.VITE_APP_NAME || 'G3 Connect'
const whatsappNumber = import.meta.env.VITE_SUPPORT_WHATSAPP || ''
const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || ''

type Mode = 'login' | 'forgot-email' | 'forgot-code' | 'forgot-password'

// ── Ícones inline ────────────────────────────────────────────
function IconDoc() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconEmail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconEye() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconShieldSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

// ── Componente principal ─────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')

  // Estado do login
  const [email, setEmail]          = useState('')
  const [password, setPassword]    = useState('')
  const [showPassword, setShowPwd] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Preenche e-mail salvo ao montar a página
  useEffect(() => {
    const saved = localStorage.getItem('g3_remember_me') === 'true'
    if (saved) {
      const savedEmail = localStorage.getItem('g3_remembered_email') ?? ''
      setRememberMe(true)
      setEmail(savedEmail)
    }
  }, [])
  const [loginError, setLoginError] = useState('')
  const [loginSuccess, setLoginSuccess] = useState('')
  const [loading, setLoading]      = useState(false)

  // Estado compartilhado do fluxo de recuperação
  const [resetEmail, setResetEmail]         = useState('')
  const [resetLoading, setResetLoading]     = useState(false)
  const [resetError, setResetError]         = useState('')
  const [resetInfo, setResetInfo]           = useState('')

  // Etapa 2: código
  const [resetCode, setResetCode] = useState('')

  // Etapa 3: nova senha
  const [requestId, setRequestId]           = useState('')
  const [newPassword, setNewPassword]       = useState('')
  const [confirmPwd, setConfirmPwd]         = useState('')
  const [showNewPwd, setShowNewPwd]         = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  // ── Handlers de login ──────────────────────────────────────
  async function handleLogin(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoginError('')
    setLoginSuccess('')
    setLoading(true)

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setLoginError('E-mail ou senha inválidos. Verifique suas credenciais.')
      setLoading(false)
      return
    }

    // Verifica se há recuperação de senha pendente para este usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('password_reset_pending')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profile?.password_reset_pending) {
      await supabase.auth.signOut()
      setResetEmail(email)
      setResetError(
        'Existe uma recuperação de senha em andamento para este e-mail. ' +
        'Insira o código que recebeu por e-mail ou solicite um novo código.',
      )
      setResetInfo('')
      setResetCode('')
      setMode('forgot-code')
      setLoading(false)
      return
    }

    // Persiste ou remove o e-mail conforme a preferência do usuário
    if (rememberMe) {
      localStorage.setItem('g3_remember_me', 'true')
      localStorage.setItem('g3_remembered_email', email)
    } else {
      localStorage.removeItem('g3_remember_me')
      localStorage.removeItem('g3_remembered_email')
    }

    navigate('/dashboard')
  }

  // ── Handlers do fluxo de recuperação ──────────────────────

  async function handleForgotEmail(e: { preventDefault(): void }) {
    e.preventDefault()
    setResetError('')
    setResetInfo('')
    setResetLoading(true)

    const normalizedEmail = resetEmail.toLowerCase().trim()

    const { data, error } = await supabase.functions.invoke(
      'request-password-reset',
      { body: { email: normalizedEmail } },
    )

    setResetLoading(false)

    if (error) {
      setResetError('Erro ao processar. Tente novamente.')
      return
    }

    setResetInfo(
      data?.message ??
      'Se o e-mail estiver cadastrado, você receberá as instruções em breve.',
    )
    setResetCode('')
    setMode('forgot-code')
  }

  async function handleVerifyCode(e: { preventDefault(): void }) {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)

    const { data, error } = await supabase.functions.invoke(
      'verify-password-reset-code',
      { body: { email: resetEmail.toLowerCase().trim(), code: resetCode.trim() } },
    )

    setResetLoading(false)

    if (error || !data?.request_id) {
      setResetError(data?.error ?? 'Código inválido ou expirado.')
      return
    }

    setRequestId(data.request_id)
    setNewPassword('')
    setConfirmPwd('')
    setMode('forgot-password')
  }

  async function handleResendCode() {
    setResetError('')
    setResetInfo('')
    setResetLoading(true)
    setResetCode('')

    const { data, error } = await supabase.functions.invoke(
      'request-password-reset',
      { body: { email: resetEmail.toLowerCase().trim() } },
    )

    setResetLoading(false)

    if (error) {
      setResetError('Erro ao reenviar. Tente novamente.')
      return
    }

    setResetInfo(
      data?.message ??
      'Se o e-mail estiver cadastrado, um novo código foi enviado.',
    )
  }

  async function handleConfirmNewPassword(e: { preventDefault(): void }) {
    e.preventDefault()
    setResetError('')

    if (newPassword.length < 8) {
      setResetError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (newPassword !== confirmPwd) {
      setResetError('As senhas não coincidem.')
      return
    }

    setResetLoading(true)

    const { data, error } = await supabase.functions.invoke('confirm-new-password', {
      body: { request_id: requestId, new_password: newPassword },
    })

    setResetLoading(false)

    if (error || !data?.success) {
      setResetError(data?.error ?? 'Erro ao atualizar senha. Tente novamente.')
      return
    }

    setLoginSuccess('Senha redefinida com sucesso! Faça login com sua nova senha.')
    setEmail(resetEmail)
    setPassword('')
    setMode('login')
  }

  // ── Navegação entre modos ──────────────────────────────────

  function switchToForgot() {
    setResetEmail(email)
    setResetError('')
    setResetInfo('')
    setResetCode('')
    setMode('forgot-email')
  }

  function switchToLogin() {
    setResetError('')
    setResetInfo('')
    setMode('login')
  }

  const contactHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : supportEmail
      ? `mailto:${supportEmail}`
      : '#'

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="lp-root">
      <div className="lp-card">
        {/* Logo — exibido apenas nos modos de recuperação */}
        {mode !== 'login' && (
          <div className="lp-logo">
            <div className="lp-logo-badge"><IconDoc /></div>
            <span className="lp-logo-name">{appName}</span>
          </div>
        )}

        {/* ── Modo: login ───────────────────────────────────── */}
        {mode === 'login' && (
          <>
            <div className="lp-form-header">
              <h1 className="lp-form-title">Bem-vindo de volta! 👋</h1>
              <p className="lp-form-subtitle">Faça login para acessar sua conta</p>
            </div>

            <form className="lp-form" onSubmit={handleLogin}>
              {loginSuccess && (
                <div className="lp-alert lp-alert--success">{loginSuccess}</div>
              )}
              {loginError && (
                <div className="lp-alert lp-alert--error">{loginError}</div>
              )}

              <div className="lp-form-group">
                <label className="lp-label" htmlFor="email">E-mail</label>
                <div className="lp-input-wrapper">
                  <span className="lp-input-icon"><IconEmail /></span>
                  <input
                    id="email"
                    type="email"
                    className="lp-input"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="lp-form-group">
                <label className="lp-label" htmlFor="password">Senha</label>
                <div className="lp-input-wrapper">
                  <span className="lp-input-icon"><IconLock /></span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="lp-input lp-input--password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="lp-eye-toggle"
                    onClick={() => setShowPwd(v => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              <div className="lp-remember-row">
                <label className="lp-checkbox-wrap">
                  <input
                    type="checkbox"
                    className="lp-checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span className="lp-checkbox-label">Lembrar-me</span>
                </label>
                <button type="button" className="lp-forgot-link" onClick={switchToForgot}>
                  Esqueci minha senha
                </button>
              </div>

              <button type="submit" className="lp-btn-primary" disabled={loading}>
                {!loading && <IconArrow />}
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="lp-contact-row">
              Não tem uma conta?{' '}
              <a
                href={contactHref}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-contact-link"
              >
                Fale com nosso time
              </a>
            </div>

            <div className="lp-security">
              <IconShieldSmall />
              Seus dados estão protegidos com segurança
            </div>
          </>
        )}

        {/* ── Modo: informar e-mail ─────────────────────────── */}
        {mode === 'forgot-email' && (
          <>
            <button type="button" className="lp-btn-back" onClick={switchToLogin}>
              <IconChevronLeft /> Voltar ao login
            </button>
            <div className="lp-form-header">
              <h1 className="lp-form-title">Recuperar senha</h1>
              <p className="lp-form-subtitle">
                Informe seu e-mail e enviaremos um código de verificação
              </p>
            </div>

            <form className="lp-form" onSubmit={handleForgotEmail}>
              {resetError && (
                <div className="lp-alert lp-alert--error">{resetError}</div>
              )}

              <div className="lp-form-group">
                <label className="lp-label" htmlFor="reset-email">E-mail</label>
                <div className="lp-input-wrapper">
                  <span className="lp-input-icon"><IconEmail /></span>
                  <input
                    id="reset-email"
                    type="email"
                    className="lp-input"
                    placeholder="seu@email.com"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="lp-btn-primary" disabled={resetLoading}>
                {!resetLoading && <IconArrow />}
                {resetLoading ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>
          </>
        )}

        {/* ── Modo: inserir código ──────────────────────────── */}
        {mode === 'forgot-code' && (
          <>
            <button type="button" className="lp-btn-back" onClick={() => setMode('forgot-email')}>
              <IconChevronLeft /> Voltar
            </button>
            <div className="lp-form-header">
              <h1 className="lp-form-title">Código de verificação</h1>
              <p className="lp-form-subtitle">
                Insira o código de 6 dígitos enviado para{' '}
                <strong>{resetEmail}</strong>
              </p>
            </div>

            <form className="lp-form" onSubmit={handleVerifyCode}>
              {resetInfo && (
                <div className="lp-alert lp-alert--info">{resetInfo}</div>
              )}
              {resetError && (
                <div className="lp-alert lp-alert--error">{resetError}</div>
              )}

              <div className="lp-form-group">
                <label className="lp-label" htmlFor="reset-code">Código</label>
                <input
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="lp-code-input"
                  placeholder="000000"
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              <button type="submit" className="lp-btn-primary" disabled={resetLoading || resetCode.length < 6}>
                {!resetLoading && <IconArrow />}
                {resetLoading ? 'Verificando...' : 'Verificar código'}
              </button>
            </form>

            <div className="lp-resend">
              <span className="lp-resend-label">Não recebeu o código?</span>
              <button
                type="button"
                className="lp-resend-btn"
                onClick={handleResendCode}
                disabled={resetLoading}
              >
                Reenviar
              </button>
            </div>
          </>
        )}

        {/* ── Modo: nova senha ──────────────────────────────── */}
        {mode === 'forgot-password' && (
          <>
            <div className="lp-form-header">
              <h1 className="lp-form-title">Nova senha</h1>
              <p className="lp-form-subtitle">Defina uma nova senha para sua conta</p>
            </div>

            <form className="lp-form" onSubmit={handleConfirmNewPassword}>
              {resetError && (
                <div className="lp-alert lp-alert--error">{resetError}</div>
              )}

              <div className="lp-form-group">
                <label className="lp-label" htmlFor="new-password">Nova senha</label>
                <div className="lp-input-wrapper">
                  <span className="lp-input-icon"><IconLock /></span>
                  <input
                    id="new-password"
                    type={showNewPwd ? 'text' : 'password'}
                    className="lp-input lp-input--password"
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="lp-eye-toggle"
                    onClick={() => setShowNewPwd(v => !v)}
                    tabIndex={-1}
                    aria-label={showNewPwd ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showNewPwd ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
                <p className="lp-password-hint">Mínimo 8 caracteres</p>
              </div>

              <div className="lp-form-group">
                <label className="lp-label" htmlFor="confirm-password">Confirmar nova senha</label>
                <div className="lp-input-wrapper">
                  <span className="lp-input-icon"><IconLock /></span>
                  <input
                    id="confirm-password"
                    type={showConfirmPwd ? 'text' : 'password'}
                    className="lp-input lp-input--password"
                    placeholder="Repita a nova senha"
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="lp-eye-toggle"
                    onClick={() => setShowConfirmPwd(v => !v)}
                    tabIndex={-1}
                    aria-label={showConfirmPwd ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmPwd ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              <button type="submit" className="lp-btn-primary" disabled={resetLoading}>
                {!resetLoading && <IconArrow />}
                {resetLoading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          </>
        )}
      </div>

      <FloatingContactButton />
    </div>
  )
}
