import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { WhatsAppFloatButton, buildWhatsAppUrl } from '../components/WhatsAppFloatButton'
import './HomePage.css'

const appName = import.meta.env.VITE_APP_NAME || 'G3 Connect'

// ── Ícones inline ────────────────────────────────────────────
function Svg({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

const IconFiles = () => <Svg><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Svg>
const IconCalendar = () => <Svg><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Svg>
const IconWorkflow = () => <Svg><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M6 9v3a3 3 0 0 0 3 3h6"/></Svg>
const IconHistory = () => <Svg><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-3.86"/><polyline points="3 4 3 11 10 11"/></Svg>
const IconChecklist = () => <Svg><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/></Svg>
const IconBuilding = () => <Svg><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/></Svg>
const IconUsers = () => <Svg><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Svg>
const IconUserCheck = () => <Svg><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></Svg>
const IconSettings = () => <Svg><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Svg>
const IconMessage = () => <Svg><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>
const IconChart = () => <Svg><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Svg>
const IconLink = () => <Svg><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Svg>
const IconLayers = () => <Svg><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Svg>
const IconTarget = () => <Svg><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Svg>
const IconEye = () => <Svg><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Svg>
const IconFeather = () => <Svg><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></Svg>
const IconCheck = ({ size = 16 }: { size?: number }) => <Svg size={size}><polyline points="20 6 9 17 4 12"/></Svg>
const IconX = ({ size = 16 }: { size?: number }) => <Svg size={size}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>
const IconArrowRight = () => <Svg size={18}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Svg>
const IconMenu = () => <Svg size={22}><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></Svg>
const IconPlus = () => <Svg size={18}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>
const IconMail = () => <Svg size={18}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Svg>

function IconWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  )
}

// ── Conteúdo (baseado nos módulos existentes da plataforma) ─
type IconComponent = () => ReactElement

const navLinks = [
  { href: '#inicio', label: 'Início' },
  { href: '#solucoes', label: 'Soluções' },
  { href: '#beneficios', label: 'Benefícios' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#sobre', label: 'Sobre' },
  { href: '#contato', label: 'Contato' },
]

const principles: { Icon: IconComponent; title: string; desc: string }[] = [
  { Icon: IconLayers, title: 'Organização', desc: 'Empresas, funcionários e documentos estruturados.' },
  { Icon: IconTarget, title: 'Centralização', desc: 'Um único ambiente para toda a operação documental.' },
  { Icon: IconEye, title: 'Acompanhamento', desc: 'Status, etapas e vencimentos sempre visíveis.' },
  { Icon: IconFeather, title: 'Simplicidade', desc: 'Sem burocracia para quem envia e para quem gerencia.' },
]

const benefits: { Icon: IconComponent; title: string; desc: string }[] = [
  {
    Icon: IconFiles,
    title: 'Centralização de informações',
    desc: 'Documentos da empresa e dos funcionários reunidos em um só lugar, com links, observações e status.',
  },
  {
    Icon: IconCalendar,
    title: 'Controle de vencimentos',
    desc: 'Cada documento com sua validade registrada, para agir antes que o prazo expire.',
  },
  {
    Icon: IconWorkflow,
    title: 'Workflow estruturado',
    desc: 'Etapas definidas do recebimento à aprovação, com responsáveis claros em cada fase.',
  },
  {
    Icon: IconHistory,
    title: 'Histórico operacional',
    desc: 'Registro das alterações, aprovações e observações feitas ao longo do processo.',
  },
]

const steps = [
  {
    title: 'Organize sua operação',
    desc: 'Cadastre empresas, funcionários, cargos e os tipos de documento exigidos em cada caso.',
  },
  {
    title: 'Centralize os documentos',
    desc: 'Os documentos recebidos são registrados com link do arquivo, validade e status.',
  },
  {
    title: 'Acompanhe até a aprovação',
    desc: 'Especialistas realizam a homologação enquanto vencimentos e pendências ficam sob controle.',
  },
]

const comparison = [
  {
    before: 'Documentos espalhados em e-mails, planilhas e conversas',
    after: 'Documentos da empresa e dos funcionários organizados em um ambiente',
  },
  {
    before: 'Vencimentos controlados manualmente',
    after: 'Validade registrada e status de vencimento visível',
  },
  {
    before: 'Etapas da homologação sem rastreamento',
    after: 'Workflow com etapas definidas, do recebimento à aprovação',
  },
  {
    before: 'Pouco registro do que foi feito e por quem',
    after: 'Histórico operacional de alterações e aprovações',
  },
  {
    before: 'Mensagens de cobrança redigidas uma a uma',
    after: 'Templates de mensagens prontos para o WhatsApp',
  },
]

const extraModules: { Icon: IconComponent; title: string; desc: string }[] = [
  { Icon: IconMessage, title: 'Templates WhatsApp', desc: 'Mensagens padronizadas com variáveis como empresa, documento e prazo.' },
  { Icon: IconChart, title: 'Relatórios', desc: 'Visão consolidada da situação documental da operação.' },
  { Icon: IconBuilding, title: 'Contratantes e segmentos', desc: 'Organize as empresas conforme contratantes e áreas de atuação.' },
  { Icon: IconLink, title: 'Arquivos por link', desc: 'Registre links externos dos arquivos, sem uploads complexos.' },
]

const profiles: { Icon: IconComponent; title: string; desc: string; points: string[]; href: string; cta: string }[] = [
  {
    Icon: IconBuilding,
    title: 'Empresas terceirizadas',
    desc: 'Para quem precisa manter a documentação em dia para atender às exigências dos contratantes.',
    points: ['Portal para acompanhar documentos', 'Visão das pendências em aberto', 'Histórico da empresa e dos funcionários'],
    href: '#contato',
    cta: 'Falar com o time',
  },
  {
    Icon: IconUsers,
    title: 'Equipes operacionais',
    desc: 'Para operadores que organizam documentos, controlam prazos e se comunicam com os clientes.',
    points: ['Central Operacional unificada', 'Controle de validade e status', 'Templates para WhatsApp'],
    href: '#solucoes',
    cta: 'Ver funcionalidades',
  },
  {
    Icon: IconUserCheck,
    title: 'Especialistas em homologação',
    desc: 'Para quem analisa e decide sobre os documentos antes do envio ao contratante.',
    points: ['Fila de documentos para homologar', 'Aprovação ou rejeição com observações', 'Acompanhamento do envio'],
    href: '#solucoes',
    cta: 'Ver funcionalidades',
  },
  {
    Icon: IconSettings,
    title: 'Gestão e administração',
    desc: 'Para quem configura a plataforma e acompanha a operação como um todo.',
    points: ['Usuários e perfis de acesso', 'Checklists e tipos de documento configuráveis', 'Dashboard e relatórios'],
    href: '#contato',
    cta: 'Falar com o time',
  },
]

// ── Ilustrações da interface (representativas, sem dados reais) ─
function MockWindow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`hp-mock ${className}`}>
      <div className="hp-mock-bar" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className="hp-mock-body">{children}</div>
    </div>
  )
}

function Line({ w }: { w: string }) {
  return <span className="hp-line" style={{ width: w }} />
}

function Chip({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'blue' | 'slate'; children: ReactNode }) {
  return <span className={`hp-chip hp-chip--${tone}`}>{children}</span>
}

function HeroVisual() {
  return (
    <div className="hp-hero-visual" role="img" aria-label={`Ilustração representativa da interface do ${appName}`}>
      <div className="hp-hero-visual-glow" aria-hidden="true" />
      <MockWindow className="hp-mock--hero">
        <div className="hp-app" aria-hidden="true">
          <div className="hp-app-side">
            <img src="/favicon.png" alt="" className="hp-app-logo" />
            <span className="hp-app-nav is-active" />
            <span className="hp-app-nav" />
            <span className="hp-app-nav" />
            <span className="hp-app-nav" />
            <span className="hp-app-nav" />
          </div>
          <div className="hp-app-main">
            <div className="hp-app-head">
              <Line w="38%" />
              <span className="hp-app-btn" />
            </div>
            <div className="hp-app-kpis">
              <div className="hp-app-kpi"><span className="hp-kpi-dot hp-kpi-dot--green" /><Line w="60%" /><span className="hp-kpi-bar"><i style={{ width: '72%' }} /></span></div>
              <div className="hp-app-kpi"><span className="hp-kpi-dot hp-kpi-dot--amber" /><Line w="50%" /><span className="hp-kpi-bar"><i style={{ width: '38%' }} /></span></div>
              <div className="hp-app-kpi"><span className="hp-kpi-dot hp-kpi-dot--red" /><Line w="55%" /><span className="hp-kpi-bar"><i style={{ width: '18%' }} /></span></div>
            </div>
            <div className="hp-app-table">
              {([
                ['green', 'Válido', '62%'],
                ['amber', 'Pendente', '48%'],
                ['blue', 'Em análise', '56%'],
                ['red', 'Vencido', '40%'],
                ['green', 'Válido', '52%'],
              ] as const).map(([tone, label, w], i) => (
                <div className="hp-app-row" key={i}>
                  <span className="hp-app-avatar" />
                  <div className="hp-app-row-text"><Line w={w} /><Line w="30%" /></div>
                  <Chip tone={tone}>{label}</Chip>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MockWindow>

      <div className="hp-float hp-float--workflow" aria-hidden="true">
        <span className="hp-float-label">Etapa operacional</span>
        <div className="hp-float-steps">
          <span className="is-done" /><span className="is-done" /><span className="is-current" /><span /><span />
        </div>
        <strong>Homologação</strong>
      </div>

      <div className="hp-float hp-float--alert" aria-hidden="true">
        <span className="hp-float-icon"><IconCalendar /></span>
        <div>
          <strong>Vencimento próximo</strong>
          <span className="hp-float-label">Documento de funcionário</span>
        </div>
      </div>
    </div>
  )
}

function OperationalVisual() {
  const columns = [
    { label: 'Aguardando cliente', tone: 'amber' as const, cards: 2 },
    { label: 'Em análise', tone: 'blue' as const, cards: 3 },
    { label: 'Homologação', tone: 'slate' as const, cards: 2 },
  ]
  return (
    <MockWindow>
      <div className="hp-board" aria-hidden="true">
        {columns.map(col => (
          <div className="hp-board-col" key={col.label}>
            <Chip tone={col.tone}>{col.label}</Chip>
            {Array.from({ length: col.cards }).map((_, i) => (
              <div className="hp-board-card" key={i}>
                <Line w={i % 2 ? '70%' : '85%'} />
                <Line w="45%" />
                <span className="hp-board-tag">{i % 2 ? 'Empresa' : 'Funcionário'}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </MockWindow>
  )
}

function HomologationVisual() {
  return (
    <MockWindow>
      <div className="hp-review" aria-hidden="true">
        <div className="hp-review-doc">
          <span className="hp-review-icon"><IconFiles /></span>
          <div className="hp-review-doc-text"><Line w="70%" /><Line w="45%" /></div>
          <Chip tone="slate">Homologação</Chip>
        </div>
        <div className="hp-review-meta">
          <div><span className="hp-review-k">Validade</span><Line w="60%" /></div>
          <div><span className="hp-review-k">Status</span><Chip tone="amber">Pendente</Chip></div>
        </div>
        <div className="hp-review-note">
          <span className="hp-review-k">Observação</span>
          <Line w="92%" /><Line w="68%" />
        </div>
        <div className="hp-review-actions">
          <span className="hp-review-btn hp-review-btn--ghost"><IconX size={14} /> Rejeitar</span>
          <span className="hp-review-btn"><IconCheck size={14} /> Aprovar</span>
        </div>
      </div>
    </MockWindow>
  )
}

function ChecklistVisual() {
  const items: [boolean, string][] = [[true, '78%'], [true, '64%'], [true, '70%'], [false, '58%'], [false, '66%']]
  return (
    <MockWindow>
      <div className="hp-checklist" aria-hidden="true">
        <div className="hp-checklist-head">
          <span className="hp-review-icon"><IconChecklist /></span>
          <div className="hp-review-doc-text"><Line w="55%" /><Line w="35%" /></div>
        </div>
        {items.map(([done, w], i) => (
          <div className={`hp-checklist-item${done ? ' is-done' : ''}`} key={i}>
            <span className="hp-checklist-box">{done && <IconCheck size={12} />}</span>
            <Line w={w} />
            <Chip tone={done ? 'green' : 'amber'}>{done ? 'Válido' : 'Pendente'}</Chip>
          </div>
        ))}
      </div>
    </MockWindow>
  )
}

function PortalVisual() {
  return (
    <MockWindow>
      <div className="hp-portal" aria-hidden="true">
        <div className="hp-portal-head">
          <span className="hp-app-avatar hp-app-avatar--lg" />
          <div className="hp-review-doc-text"><Line w="60%" /><Line w="40%" /></div>
        </div>
        <div className="hp-portal-stats">
          <div><span className="hp-kpi-dot hp-kpi-dot--green" /><Line w="70%" /></div>
          <div><span className="hp-kpi-dot hp-kpi-dot--amber" /><Line w="60%" /></div>
          <div><span className="hp-kpi-dot hp-kpi-dot--red" /><Line w="50%" /></div>
        </div>
        <div className="hp-portal-list">
          <div className="hp-app-row"><span className="hp-app-avatar" /><div className="hp-app-row-text"><Line w="55%" /></div><Chip tone="amber">Pendente</Chip></div>
          <div className="hp-app-row"><span className="hp-app-avatar" /><div className="hp-app-row-text"><Line w="48%" /></div><Chip tone="green">Válido</Chip></div>
          <div className="hp-app-row"><span className="hp-app-avatar" /><div className="hp-app-row-text"><Line w="62%" /></div><Chip tone="green">Válido</Chip></div>
        </div>
      </div>
    </MockWindow>
  )
}

const features: { eyebrow: string; title: string; desc: string; points: string[]; Visual: IconComponent }[] = [
  {
    eyebrow: 'Central Operacional',
    title: 'Toda a operação documental em uma visão unificada',
    desc: 'Documentos da empresa e dos funcionários reunidos em uma única lista operacional, organizada por etapa do processo.',
    points: [
      'Etapas claras: aguardando cliente, em análise, homologação, enviado, aprovado ou rejeitado',
      'Status documental separado da etapa do processo',
      'Filtros para encontrar rapidamente o que precisa de atenção',
    ],
    Visual: OperationalVisual,
  },
  {
    eyebrow: 'Homologação',
    title: 'Um painel dedicado para quem analisa e aprova',
    desc: 'Especialistas acessam os documentos que estão em homologação, registram observações e definem o resultado.',
    points: [
      'Fila de documentos aguardando homologação',
      'Aprovação ou rejeição com observações internas',
      'Acompanhamento dos documentos enviados ao contratante',
    ],
    Visual: HomologationVisual,
  },
  {
    eyebrow: 'Checklist configurável',
    title: 'Cada cargo com os documentos que ele realmente exige',
    desc: 'Tipos de documento e checklists por cargo são configuráveis, sem regras fixas no sistema.',
    points: [
      'Cadastro de tipos de documento com validade',
      'Checklist de documentos obrigatórios por cargo ou função',
      'Documentos empresariais obrigatórios para cada empresa',
    ],
    Visual: ChecklistVisual,
  },
  {
    eyebrow: 'Portal do cliente',
    title: 'Transparência para a empresa terceirizada',
    desc: 'A empresa cliente acessa um portal próprio para acompanhar a situação da sua documentação.',
    points: [
      'Documentos da empresa e dos funcionários',
      'Pendências em aberto',
      'Histórico de movimentações',
    ],
    Visual: PortalVisual,
  },
]

// ── Componente principal ─────────────────────────────────────
export function HomePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const menuToggleRef = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  // Header com sombra durante a rolagem
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Rolagem suave entre âncoras apenas nesta página (respeitando movimento reduzido)
  useEffect(() => {
    const html = document.documentElement
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const previous = html.style.scrollBehavior
    html.style.scrollBehavior = 'smooth'
    return () => { html.style.scrollBehavior = previous }
  }, [])

  // Fecha o menu mobile com Esc
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuToggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // Metadados exclusivos da página pública; restaurados ao navegar.
  useEffect(() => {
    const previousTitle = document.title
    const title = `${appName} | Gestão documental e homologação de terceiros`
    const description = 'Centralize documentos de empresas e funcionários, acompanhe vencimentos, pendências e etapas de homologação com o G3 Connect.'
    document.title = title
    const tags = [
      ['name', 'description', description],
      ['property', 'og:title', title],
      ['property', 'og:description', description],
      ['property', 'og:type', 'website'],
      ['property', 'og:locale', 'pt_BR'],
    ]
    const restore = tags.map(([attribute, key, value]) => {
      const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
      const tag = existing ?? document.createElement('meta')
      const previousContent = tag.getAttribute('content')
      tag.setAttribute(attribute, key)
      tag.content = value
      if (!existing) document.head.append(tag)
      return () => {
        if (!existing) tag.remove()
        else if (previousContent === null) tag.removeAttribute('content')
        else tag.content = previousContent
      }
    })
    return () => {
      document.title = previousTitle
      restore.forEach(reset => reset())
    }
  }, [])

  const whatsappUrl = buildWhatsAppUrl()
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim()
  const emailUrl = supportEmail ? `mailto:${supportEmail}?subject=Contato%20G3%20Connect` : null

  // Canal comercial disponível: WhatsApp → e-mail → seção de contato
  const demoHref = whatsappUrl ?? emailUrl ?? '#contato'
  const demoIsExternal = demoHref.startsWith('http')
  const demoLinkProps = demoIsExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  const goToLogin = () => navigate('/login')
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="hp-root">
      <a className="hp-skip" href="#conteudo">Pular para o conteúdo</a>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className={`hp-header${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' is-open' : ''}`}>
        <div className="hp-container hp-header-inner">
          <a href="#inicio" className="hp-logo" onClick={closeMenu}>
            <img src="/favicon.png" alt="" className="hp-logo-img" width="32" height="32" />
            <span>{appName}</span>
          </a>

          <nav className="hp-nav" aria-label="Navegação principal">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="hp-nav-link">{link.label}</a>
            ))}
          </nav>

          <div className="hp-header-actions">
            <button type="button" className="hp-btn hp-btn--ghost hp-header-login" onClick={goToLogin}>
              Entrar
            </button>
            <a className="hp-btn hp-btn--primary hp-header-demo" href={demoHref} {...demoLinkProps}>
              Solicitar demonstração
            </a>
            <button
              ref={menuToggleRef}
              type="button"
              className="hp-menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="hp-mobile-menu"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenuOpen(v => !v)}
            >
              {menuOpen ? <IconX size={22} /> : <IconMenu />}
            </button>
          </div>
        </div>

        <div id="hp-mobile-menu" className="hp-mobile-menu" hidden={!menuOpen}>
          <nav className="hp-container" aria-label="Navegação principal (mobile)">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="hp-mobile-link" onClick={closeMenu}>{link.label}</a>
            ))}
            <div className="hp-mobile-actions">
              <button type="button" className="hp-btn hp-btn--ghost" onClick={goToLogin}>Entrar</button>
              <a className="hp-btn hp-btn--primary" href={demoHref} onClick={closeMenu} {...demoLinkProps}>
                Solicitar demonstração
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main id="conteudo">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section id="inicio" className="hp-hero">
          <div className="hp-hero-bg" aria-hidden="true" />
          <div className="hp-container hp-hero-grid">
            <div className="hp-hero-copy">
              <span className="hp-eyebrow">Gestão documental e homologação de terceiros</span>
              <h1 className="hp-hero-title">
                Simplifique processos.{' '}
                <span className="hp-nowrap">Centralize sua gestão.</span>{' '}
                <span className="hp-hero-accent">Conecte sua operação.</span>
              </h1>
              <p className="hp-hero-sub">
                O {appName} centraliza documentos, vencimentos, pendências e homologações de
                empresas terceirizadas e seus funcionários em uma única plataforma operacional.
              </p>
              <div className="hp-hero-actions">
                <a className="hp-btn hp-btn--primary hp-btn--lg" href={demoHref} {...demoLinkProps}>
                  Solicitar demonstração <IconArrowRight />
                </a>
                <a className="hp-btn hp-btn--outline hp-btn--lg" href="#solucoes">
                  Conhecer a plataforma
                </a>
              </div>
              <ul className="hp-hero-points">
                <li><IconCheck /> Documentos da empresa e dos funcionários</li>
                <li><IconCheck /> Controle de validade</li>
                <li><IconCheck /> Workflow de homologação</li>
              </ul>
            </div>
            <div>
              <HeroVisual />
              <span className="hp-visual-caption">Ilustração da plataforma · sem dados reais</span>
            </div>
          </div>
        </section>

        {/* ── Princípios / Sobre ─────────────────────────────── */}
        <section id="sobre" className="hp-principles">
          <div className="hp-container">
            <div className="hp-principles-intro hp-reveal">
              <h2 className="hp-principles-kicker">Sobre o {appName}</h2>
              <p className="hp-principles-text">
                Uma camada operacional entre empresas terceirizadas e os processos de homologação
                exigidos pelos contratantes, unindo <strong>software e operação</strong> para reduzir
                a burocracia do dia a dia.
              </p>
            </div>
            <ul className="hp-principles-grid">
              {principles.map(({ Icon, title, desc }) => (
                <li key={title} className="hp-principle hp-reveal">
                  <span className="hp-principle-icon"><Icon /></span>
                  <div>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Benefícios ─────────────────────────────────────── */}
        <section id="beneficios" className="hp-section">
          <div className="hp-container">
            <div className="hp-section-head hp-reveal">
              <span className="hp-eyebrow">Benefícios</span>
              <h2 className="hp-section-title">Mais controle, menos complexidade.</h2>
              <p className="hp-section-sub">
                Organize seus processos em um único ambiente e tenha mais clareza para acompanhar
                sua operação documental.
              </p>
            </div>
            <div className="hp-benefits-grid">
              {benefits.map(({ Icon, title, desc }) => (
                <article key={title} className="hp-benefit hp-reveal">
                  <span className="hp-icon-badge"><Icon /></span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Funcionalidades ────────────────────────────────── */}
        <section id="solucoes" className="hp-section hp-section--alt">
          <div className="hp-container">
            <div className="hp-section-head hp-reveal">
              <span className="hp-eyebrow">Soluções</span>
              <h2 className="hp-section-title">Tudo o que você precisa para uma gestão documental organizada.</h2>
              <p className="hp-section-sub">
                Módulos pensados para a rotina de quem cadastra, acompanha e homologa documentos.
              </p>
            </div>

            <div className="hp-features">
              {features.map(({ eyebrow, title, desc, points, Visual }, i) => (
                <div key={eyebrow} className={`hp-feature${i % 2 ? ' hp-feature--reverse' : ''}`}>
                  <div className="hp-feature-copy hp-reveal">
                    <span className="hp-feature-eyebrow">{eyebrow}</span>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                    <ul className="hp-check-list">
                      {points.map(point => (
                        <li key={point}><span className="hp-check"><IconCheck size={14} /></span>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="hp-feature-visual hp-reveal" role="img" aria-label={`Ilustração representativa: ${eyebrow}`}>
                    <Visual />
                  </div>
                </div>
              ))}
            </div>

            <div className="hp-modules">
              {extraModules.map(({ Icon, title, desc }) => (
                <div key={title} className="hp-module hp-reveal">
                  <span className="hp-module-icon"><Icon /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Como funciona ──────────────────────────────────── */}
        <section id="como-funciona" className="hp-section">
          <div className="hp-container">
            <div className="hp-section-head hp-section-head--center hp-reveal">
              <span className="hp-eyebrow">Como funciona</span>
              <h2 className="hp-section-title">Simples de começar. Fácil de gerenciar.</h2>
              <p className="hp-section-sub">
                O cliente envia os documentos pelo WhatsApp, sem precisar aprender uma nova ferramenta.
                A partir daí, a operação acontece na plataforma.
              </p>
            </div>
            <ol className="hp-steps">
              {steps.map((step, i) => (
                <li key={step.title} className="hp-step hp-reveal">
                  <span className="hp-step-number">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Comparativo ────────────────────────────────────── */}
        <section className="hp-section hp-section--dark">
          <div className="hp-dark-decor" aria-hidden="true" />
          <div className="hp-container">
            <div className="hp-section-head hp-section-head--center hp-reveal">
              <span className="hp-eyebrow hp-eyebrow--light">Antes e depois</span>
              <h2 className="hp-section-title">De processos dispersos a uma gestão centralizada.</h2>
            </div>
            <div className="hp-compare hp-reveal">
              <div className="hp-compare-col hp-compare-col--before">
                <h3>Gestão descentralizada</h3>
                <ul>
                  {comparison.map(row => (
                    <li key={row.before}><span className="hp-compare-icon"><IconX size={14} /></span>{row.before}</li>
                  ))}
                </ul>
              </div>
              <div className="hp-compare-col hp-compare-col--after">
                <h3>Com o {appName}</h3>
                <ul>
                  {comparison.map(row => (
                    <li key={row.after}><span className="hp-compare-icon"><IconCheck size={14} /></span>{row.after}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Perfis ─────────────────────────────────────────── */}
        <section className="hp-section">
          <div className="hp-container">
            <div className="hp-section-head hp-reveal">
              <span className="hp-eyebrow">Para quem é</span>
              <h2 className="hp-section-title">Uma plataforma que acompanha as necessidades da sua operação.</h2>
            </div>
            <div className="hp-profiles">
              {profiles.map(({ Icon, title, desc, points, href, cta }) => (
                <article key={title} className="hp-profile hp-reveal">
                  <span className="hp-icon-badge hp-icon-badge--lg"><Icon /></span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <ul className="hp-check-list hp-check-list--compact">
                    {points.map(point => (
                      <li key={point}><span className="hp-check"><IconCheck size={14} /></span>{point}</li>
                    ))}
                  </ul>
                  <a className="hp-text-link" href={href}>{cta} <IconArrowRight /></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA / Contato ──────────────────────────────────── */}
        <section id="contato" className="hp-cta-wrap">
          <div className="hp-container">
            <div className="hp-cta hp-reveal">
              <div className="hp-cta-decor" aria-hidden="true" />
              <div className="hp-cta-copy">
                <h2>Sua gestão documental pode ser muito mais simples.</h2>
                <p>
                  Conheça o {appName} e veja como uma plataforma centralizada pode organizar os
                  processos de documentação e homologação da sua empresa.
                </p>
              </div>
              <div className="hp-cta-actions">
                {(whatsappUrl || emailUrl) ? (
                  <a className="hp-btn hp-btn--white hp-btn--lg" href={demoHref} {...demoLinkProps}>
                    Solicitar uma demonstração <IconArrowRight />
                  </a>
                ) : (
                  <button type="button" className="hp-btn hp-btn--white hp-btn--lg" onClick={goToLogin}>
                    Acessar plataforma <IconArrowRight />
                  </button>
                )}
                <div className="hp-cta-channels">
                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><IconWhatsApp /> WhatsApp</a>
                  )}
                  {emailUrl && (
                    <a href={emailUrl}><IconMail /> {supportEmail}</a>
                  )}
                </div>
                <p className="hp-cta-login">
                  Já é cliente?{' '}
                  <button type="button" onClick={goToLogin}>Acesse sua conta</button>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section className="hp-section hp-faq-section">
          <div className="hp-container hp-faq-grid">
            <div className="hp-section-head hp-reveal">
              <span className="hp-eyebrow">FAQ</span>
              <h2 className="hp-section-title">Perguntas frequentes</h2>
              <p className="hp-section-sub">
                Não encontrou o que procurava? Fale com o nosso time pelos canais de contato.
              </p>
            </div>
            <div className="hp-faq hp-reveal">
              <details className="hp-faq-item">
                <summary>O que é o {appName}?<span className="hp-faq-icon"><IconPlus /></span></summary>
                <p>
                  É uma plataforma operacional de gestão documental e homologação para empresas
                  terceirizadas. Ela centraliza documentos, vencimentos, pendências e o acompanhamento
                  das homologações exigidas pelos contratantes.
                </p>
              </details>
              <details className="hp-faq-item">
                <summary>Para que serve a plataforma?<span className="hp-faq-icon"><IconPlus /></span></summary>
                <p>
                  Para organizar os documentos da empresa e dos funcionários, controlar validades,
                  acompanhar cada etapa do processo, do recebimento à aprovação, e manter um histórico
                  das movimentações.
                </p>
              </details>
              <details className="hp-faq-item">
                <summary>Quais empresas podem utilizar o sistema?<span className="hp-faq-icon"><IconPlus /></span></summary>
                <p>
                  Empresas terceirizadas e prestadoras de serviço que precisam manter sua documentação
                  e a de seus funcionários em dia para atender aos processos de homologação dos contratantes.
                </p>
              </details>
              <details className="hp-faq-item">
                <summary>Como solicitar uma demonstração?<span className="hp-faq-icon"><IconPlus /></span></summary>
                <p>
                  Utilize o botão “Solicitar demonstração” ou os canais de contato desta página para
                  falar diretamente com o nosso time.
                </p>
              </details>
              <details className="hp-faq-item">
                <summary>Como acessar minha conta?<span className="hp-faq-icon"><IconPlus /></span></summary>
                <p>
                  Clique em “Entrar” no topo da página e informe seu e-mail e senha. Os acessos são
                  criados pela nossa equipe. Se ainda não possui um, fale com o nosso time.
                </p>
              </details>
              <details className="hp-faq-item">
                <summary>Como entrar em contato com o suporte?<span className="hp-faq-icon"><IconPlus /></span></summary>
                <p>
                  Pelos canais disponíveis nesta página: WhatsApp e e-mail. Basta acessar a seção
                  de contato ou o botão flutuante no canto da tela.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="hp-footer">
        <div className="hp-container">
          <div className="hp-footer-grid">
            <div className="hp-footer-brand">
              <a href="#inicio" className="hp-logo hp-logo--light">
                <img src="/favicon.png" alt="" className="hp-logo-img" width="32" height="32" loading="lazy" />
                <span>{appName}</span>
              </a>
              <p>Gestão documental e homologação de terceiros.</p>
            </div>

            <nav className="hp-footer-col" aria-label="Plataforma">
              <h3>Plataforma</h3>
              <a href="#inicio">Início</a>
              <a href="#solucoes">Soluções</a>
              <a href="#beneficios">Benefícios</a>
              <a href="#como-funciona">Como funciona</a>
            </nav>

            <nav className="hp-footer-col" aria-label="Institucional">
              <h3>Institucional</h3>
              <a href="#sobre">Sobre</a>
              <a href="#contato">Contato</a>
              <button type="button" onClick={goToLogin}>Acessar plataforma</button>
            </nav>

            {(whatsappUrl || emailUrl) && (
              <div className="hp-footer-col">
                <h3>Contato</h3>
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                )}
                {emailUrl && <a href={emailUrl}>{supportEmail}</a>}
              </div>
            )}
          </div>

          <div className="hp-footer-bottom">
            <p>© {new Date().getFullYear()} {appName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {emailUrl && (
        <a className={`hp-floating-email${whatsappUrl ? '' : ' hp-floating-email--alone'}`} href={emailUrl} aria-label="Entrar em contato por e-mail">
          <IconMail />
        </a>
      )}
      <WhatsAppFloatButton />
    </div>
  )
}
