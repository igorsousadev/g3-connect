import { useNavigate } from 'react-router-dom'

interface UnavailableModuleProps {
  title?: string
  description?: string
}

export function UnavailableModule({
  title       = 'Tela indisponível no momento',
  description = 'Este módulo ainda não está disponível nesta versão do sistema.',
}: UnavailableModuleProps) {
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="unavailable-module">
        <div className="unavailable-module-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="unavailable-module-title">{title}</h1>
        <p className="unavailable-module-desc">{description}</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Voltar ao dashboard
        </button>
      </div>
    </div>
  )
}
