import { useEffect, Fragment, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { WhatsAppFloatButton, buildWhatsAppUrl } from '../components/WhatsAppFloatButton'
import './HomePage.css'

function IconWarning() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function IconFiles() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function IconZap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

function IconActivity() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

function IconMessage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function IconHistory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 8 12 12 14 14"/>
      <path d="M3.05 11a9 9 0 1 0 .5-3.86"/>
      <polyline points="3 4 3 11 10 11"/>
    </svg>
  )
}

function IconLayout() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function IconFolder() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  )
}

type IconComponent = () => ReactElement

const problems: { Icon: IconComponent; title: string; desc: string }[] = [
  {
    Icon: IconWarning,
    title: 'Documentos vencendo sem aviso',
    desc: 'Prazos perdidos por falta de controle, gerando multas e bloqueios operacionais.',
  },
  {
    Icon: IconFiles,
    title: 'Pendências espalhadas sem rastreamento',
    desc: 'Informações em e-mails, planilhas e WhatsApp, sem um ponto central de acompanhamento.',
  },
  {
    Icon: IconClock,
    title: 'Homologações lentas e manuais',
    desc: 'Processos de aprovação sem estrutura definida, gerando atrasos e retrabalho na operação.',
  },
  {
    Icon: IconEyeOff,
    title: 'Falta de visibilidade operacional',
    desc: 'Gestores sem acesso rápido ao status de empresas, funcionários e documentos em aberto.',
  },
]

const benefits: { Icon: IconComponent; title: string; desc: string }[] = [
  {
    Icon: IconCheck,
    title: 'Controle centralizado',
    desc: 'Documentos, vencimentos e pendências reunidos em uma única plataforma.',
  },
  {
    Icon: IconCalendar,
    title: 'Gestão de vencimentos',
    desc: 'Visibilidade completa sobre datas de validade para agir antes do prazo.',
  },
  {
    Icon: IconZap,
    title: 'Workflow estruturado',
    desc: 'Fluxo operacional definido do recebimento do documento à aprovação final.',
  },
  {
    Icon: IconActivity,
    title: 'Acompanhamento em tempo real',
    desc: 'Status atualizado de todos os documentos e homologações em andamento.',
  },
  {
    Icon: IconMessage,
    title: 'Comunicação facilitada',
    desc: 'Templates de mensagem para WhatsApp prontos para uso imediato pelos operadores.',
  },
  {
    Icon: IconHistory,
    title: 'Histórico completo',
    desc: 'Registro de todas as alterações, aprovações e movimentações da operação.',
  },
]

const steps = [
  {
    title: 'Cliente',
    desc: 'Envia os documentos via WhatsApp ou portal exclusivo.',
  },
  {
    title: 'Operador',
    desc: 'Organiza e registra os documentos no sistema.',
  },
  {
    title: 'Especialista',
    desc: 'Analisa e realiza a homologação dos documentos.',
  },
  {
    title: 'Aprovação',
    desc: 'Status atualizado e cliente informado do resultado.',
  },
]

const features: { Icon: IconComponent; title: string; desc: string }[] = [
  {
    Icon: IconLayout,
    title: 'Painel operacional',
    desc: 'Visão geral de todas as empresas, funcionários e documentos com status em tempo real.',
  },
  {
    Icon: IconUser,
    title: 'Portal do cliente',
    desc: 'Acesso exclusivo para o cliente acompanhar seus documentos e pendências.',
  },
  {
    Icon: IconFolder,
    title: 'Gestão documental',
    desc: 'Cadastro completo de documentos com vencimentos, links e histórico de alterações.',
  },
  {
    Icon: IconBell,
    title: 'Notificações e pendências',
    desc: 'Alertas sobre vencimentos próximos e pendências em aberto para ação imediata.',
  },
]

export function HomePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  const whatsappUrl = buildWhatsAppUrl()
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined

  return (
    <div className="hp-root">

      {/* Header */}
      <header className="hp-header">
        <div className="hp-container hp-header-inner">
          <span className="hp-logo">
            <img src="/favicon.png" alt="" className="hp-logo-img" aria-hidden="true" />
            G3<span> Connect</span>
          </span>
          <nav className="hp-nav">
            <a href="#como-funciona" className="hp-nav-link">Como funciona</a>
            <a href="#beneficios" className="hp-nav-link">Benefícios</a>
            <button className="hp-btn-outline" onClick={() => navigate('/login')}>
              Entrar
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hp-hero">
        <div className="hp-container">
          <div className="hp-hero-badge">Gestão documental simplificada</div>
          <h1 className="hp-hero-title">
            Controle documental e homologação<br />
            <span className="hp-hero-accent">sem complicação.</span>
          </h1>
          <p className="hp-hero-sub">
            O G3 Connect centraliza documentos, vencimentos, pendências e
            homologações de empresas terceirizadas em um único painel operacional.
          </p>
          <div className="hp-hero-actions">
            <button className="hp-btn-primary hp-btn-lg" onClick={() => navigate('/login')}>
              Acessar plataforma
            </button>
            {whatsappUrl ? (
              <a
                className="hp-btn-ghost hp-btn-lg"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWhatsApp /> Falar com especialista
              </a>
            ) : (
              <button className="hp-btn-ghost hp-btn-lg" onClick={() => navigate('/login')}>
                Falar com especialista
              </button>
            )}
          </div>
        </div>
      </section>

      {/* O problema */}
      <section className="hp-section hp-problem">
        <div className="hp-container">
          <div className="hp-section-label">O problema</div>
          <h2 className="hp-section-title">
            Gestão documental ainda é um gargalo na operação
          </h2>
          <div className="hp-problems-grid">
            {problems.map(({ Icon, title, desc }) => (
              <div key={title} className="hp-problem-card">
                <div className="hp-problem-icon"><Icon /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="hp-section hp-benefits">
        <div className="hp-container">
          <div className="hp-section-label">Benefícios</div>
          <h2 className="hp-section-title">
            Tudo que sua operação precisa em um só lugar
          </h2>
          <div className="hp-benefits-grid">
            {benefits.map(({ Icon, title, desc }) => (
              <div key={title} className="hp-benefit-card">
                <div className="hp-benefit-icon"><Icon /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="hp-section hp-how">
        <div className="hp-container">
          <div className="hp-section-label">Como funciona</div>
          <h2 className="hp-section-title">Fluxo operacional simples e direto</h2>
          <div className="hp-steps">
            {steps.map((step, i) => (
              <Fragment key={step.title}>
                <div className="hp-step">
                  <div className="hp-step-number">{i + 1}</div>
                  <div className="hp-step-title">{step.title}</div>
                  <div className="hp-step-desc">{step.desc}</div>
                </div>
                {i < steps.length - 1 && (
                  <div className="hp-step-arrow"><IconArrowRight /></div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="hp-section hp-features">
        <div className="hp-container">
          <div className="hp-section-label">Funcionalidades</div>
          <h2 className="hp-section-title">
            Ferramentas pensadas para operadores
          </h2>
          <div className="hp-features-grid">
            {features.map(({ Icon, title, desc }) => (
              <div key={title} className="hp-feature-card">
                <div className="hp-feature-icon"><Icon /></div>
                <div className="hp-feature-text">
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="hp-cta">
        <div className="hp-container">
          <h2>Organize sua operação documental com mais eficiência.</h2>
          <p>Centralize controle, vencimentos e homologações em uma única plataforma.</p>
          <button className="hp-btn-primary hp-btn-lg" onClick={() => navigate('/login')}>
            Acessar plataforma
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="hp-footer">
        <div className="hp-container hp-footer-inner">
          <div className="hp-footer-brand">
            <span className="hp-logo">
              <img src="/favicon.png" alt="" className="hp-logo-img" aria-hidden="true" />
              G3<span> Connect</span>
            </span>
            <p>Gestão documental e homologação de terceiros.</p>
          </div>
          <div className="hp-footer-links">
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            )}
            {supportEmail && (
              <a href={`mailto:${supportEmail}?subject=Contato%20G3%20Connect`}>Contato</a>
            )}
          </div>
        </div>
        <div className="hp-footer-bottom">
          <p>© {new Date().getFullYear()} G3 Connect. Todos os direitos reservados.</p>
        </div>
      </footer>

      <WhatsAppFloatButton />

    </div>
  )
}
