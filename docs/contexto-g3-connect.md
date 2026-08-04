# Contexto do Projeto - G3 Connect

## Visao Geral

O G3 Connect e uma plataforma SaaS operacional para gestao documental, homologacao de terceiros, acompanhamento de pendencias, controle de vencimentos e organizacao de documentos de empresas terceirizadas e seus funcionarios.

O produto nao e apenas um GED. O foco principal e operacao, workflow, acompanhamento humano, cobranca documental, homologacao e produtividade da equipe, com modelo de negocio de Software + Operacao.

Stack:
- React 19
- TypeScript
- Vite
- Supabase
- PostgreSQL
- Supabase Auth
- Deploy atual: Cloudflare Pages

Padroes importantes:
- Nao usar bibliotecas de UI externas.
- Manter CSS proprio.
- Preservar o padrao visual atual.
- Nao refatorar sem necessidade.
- Nao alterar mais do que o necessario.
- Area operacional desktop-first.
- Portal cliente pode ser mais responsivo/mobile-friendly.

## Perfis e Usuarios

Autenticacao via Supabase Auth.

Perfis planejados/usados:
- `admin`
- `operator`
- `specialist`
- `client`

Tabela `profiles`:
- `id`
- `full_name`
- `email`
- `role`
- `company_id`
- `is_active`

Cliente deve acessar apenas os dados da propria empresa.

## Modulos Principais

O sistema ja possui ou esta em evolucao com:
- Login/Auth
- Dashboard
- Central Operacional
- Empresas
- Funcionarios
- Cargos/Funcoes
- Tipos de Documento
- Checklist por Cargo
- Documentos de Funcionarios
- Documentos da Empresa
- Central de Homologacao / Painel do Especialista
- Portal Cliente
- Relatorios
- Historico Operacional
- Templates WhatsApp
- Usuarios/perfis administrativos

## Empresas

Tabela: `public.companies`

Campos conhecidos:
- `id`
- `corporate_name`
- `trade_name`
- `cnpj`
- `responsible_name`
- `whatsapp`
- `email`
- `status`
- `notes`

Regras:
- CNPJ unico.
- Empresa pode ter documentos proprios.
- Na criacao de empresa, o sistema deve gerar automaticamente documentos obrigatorios empresariais quando existirem tipos com `is_company_required = true`.

## Funcionarios

Tabela: `public.employees`

Campos conhecidos:
- `id`
- `full_name`
- `cpf`
- `role`
- `role_id`
- `company_id`
- `phone`
- `status`
- `notes`

Regras:
- CPF unico.
- Funcionario pertence a uma empresa.
- Funcionario pode estar vinculado a um cargo/funcao.
- Documentos de funcionario ficam em `employee_documents`.

## Cargos e Checklist

Tabela: `public.roles`

Checklist por cargo usa `public.role_document_requirements`, relacionando cargo/funcao com tipos de documentos obrigatorios.

Documentos marcados como empresariais nao devem aparecer em checklist de cargos.

## Tipos de Documento

Tabela: `public.document_types`

Campos conhecidos:
- `id`
- `name`
- `description`
- `default_validity_days`
- `is_required`
- `is_active`
- `category`
- `is_company_required`

Categorias conhecidas:
- `SST`
- `Empresa`
- `Trabalhista`
- `Contratual`
- `Operacional`
- `Equipamentos`
- `Veiculos`
- `Ambiental`
- `Saude`
- `Engenharia`
- `Juridico`
- `Qualidade`
- `Seguranca Patrimonial`
- `Logistica`
- `Alimentacao`
- `Industrial`
- `Outros`

Flag `is_company_required`:
- `true`: documento obrigatorio para empresa.
- `false`: documento de funcionario/cargo.

Regras:
- Documentos com `is_company_required = true` nao aparecem em checklist de cargos.
- Documentos com categoria `Empresa` sao usados para documentos corporativos.
- Em formularios de documentos de funcionario, nao devem aparecer tipos com `is_company_required = true`.
- Em documentos de empresa, a regra principal e listar tipos com `category = 'Empresa'`.

Migrations relacionadas:
- `supabase/migrations/20260517_add_company_required_document_types.sql`
- `supabase/migrations/20260517_add_empresa_document_category.sql`

## Documentos de Funcionarios

Tabela: `public.employee_documents`

Campos conhecidos:
- `id`
- `employee_id`
- `document_type_id`
- `status`
- `workflow_status`
- `issue_date`
- `expiration_date`
- `external_file_url`
- `notes`
- `approved_by`
- `approved_at`
- `created_at`
- `updated_at`

Documentos de funcionarios usam upload/anexo por `external_file_url`.

Helper de arquivo:
- `src/lib/documentFileResolver.ts`
- Funcao: `resolveDocumentFileUrl(fileRef)`

Comportamento:
- Se `fileRef` comeca com `/`, resolve via Dropbox/Edge Function.
- Se e `http/https`, abre direto.
- Se vazio, retorna `null`.

## Documentos da Empresa

Tabela: `public.company_documents`

Migration:
- `supabase/migrations/20260517_create_company_documents.sql`

Estrutura:
- `id uuid primary key default gen_random_uuid()`
- `created_at timestamp with time zone not null default now()`
- `updated_at timestamp with time zone null default now()`
- `company_id uuid not null references public.companies(id) on delete cascade`
- `document_type_id uuid not null references public.document_types(id)`
- `status text not null default 'pending'`
- `workflow_status text not null default 'pending_client'`
- `issue_date date null`
- `expiration_date date null`
- `external_file_url text null`
- `notes text null`
- `approved_by uuid null references auth.users(id)`
- `approved_at timestamp with time zone null`
- unique `(company_id, document_type_id)`

Migration de workflow:
- `supabase/migrations/20260517_update_company_documents_workflow.sql`

Regras:
- Nao usar `employee_documents` para documentos da empresa.
- Documentos da empresa devem usar `company_documents`.
- Na tela de empresa, documentos empresariais devem listar apenas tipos da categoria `Empresa`.
- Inclusao/edicao de documento da empresa deve ser em tela propria, nao modal.

Rotas sugeridas/usadas:
- `/empresas/:companyId/documentos/novo`
- `/empresas/:companyId/documentos/:documentId/editar`

Tela provavel:
- `src/pages/CompanyDocumentFormPage.tsx`

Service/hook/tipo provaveis:
- `src/services/companyDocumentService.ts`
- `src/hooks/useCompanyDocuments.ts`
- `src/types/companyDocument.ts`

Ao criar empresa:
- Buscar `document_types` com `is_company_required = true` e, se existir, `is_active = true`.
- Criar registros em `company_documents`.
- `status = 'pending'`
- `workflow_status = 'pending_client'`
- `notes = 'Documento obrigatorio da empresa gerado automaticamente.'`
- Evitar duplicidade por `(company_id, document_type_id)`.

## Status Documental

Status documental representa a situacao documental do arquivo.

Valores atuais:
- `pending` = Pendente
- `invalid` = Invalido
- `valid` = Valido
- `expired` = Vencido

Valores legados que podem aparecer em codigo antigo:
- `expiring`
- `rejected`
- `submitted`

Mapeamentos legados:
- `expiring` -> `valid`
- `rejected` -> `invalid`
- `submitted` -> `pending`

## Etapa Operacional / Workflow

Workflow representa a etapa operacional do processo, separado do status documental.

Valores atuais:
- `pending_client` = Aguardando cliente
- `analysis` = Em analise
- `homologation` = Homologacao
- `sent` = Enviado
- `approved` = Aprovado
- `rejected` = Rejeitado

Valores legados que podem aparecer:
- `submitted`
- `under_review`
- `pending_specialist`
- `submitted_to_contractor`

Mapeamentos legados:
- `submitted` -> `analysis`
- `under_review` -> `analysis`
- `pending_specialist` -> `homologation`
- `submitted_to_contractor` -> `sent`

Regra critica:
- Status documental nao e etapa operacional.
- `status` e `workflow_status` devem permanecer separados.

## Fluxo Operacional

Fluxo principal:

Cliente envia documento -> Operador recebe -> Operador confere -> Especialista homologa -> Documento aprovado -> Enviado a contratante.

Na pratica:
- Operador atua na Central Operacional.
- Especialista atua no Painel do Especialista.
- Cliente acompanha/envia documentos no portal cliente futuramente.

## Central Operacional

Pagina:
- `src/pages/OperationalCenterPage.tsx`

Hook provavel:
- `src/hooks/useOperationalCenter.ts`

Service provavel:
- `src/services/operationalService.ts`

A Central Operacional e o coracao do sistema.

Ela deve considerar:
- `employee_documents`
- `company_documents`

A lista e unificada em um item operacional, com origem:
- `employee`
- `company`

Tipo sugerido/conhecido: `OperationalItem`

Campos importantes:
- `source`
- `docId`
- `companyId`
- `companyName`
- `employeeId`
- `employeeName`
- `documentTypeId`
- `documentTypeName`
- `status`
- `workflowStatus`
- `expirationDate`
- `externalFileUrl`
- `notes`
- `daysUntilExpiry`
- `updatedAt`

A tabela exibe:
- Origem
- Empresa
- Funcionario / Documento da empresa
- Documento
- Status/etapa
- Dias parado
- Vencimento
- Anexo
- Acoes

Regras:
- Cards e filtros devem somar documentos de funcionario + documentos de empresa.
- Filtros funcionam sobre a lista unificada.
- Existe filtro de origem: Todos, Funcionarios, Empresas.
- Documentos vencidos: `expiration_date < hoje`.
- Documentos vencendo em 30 dias: `expiration_date >= hoje` e `expiration_date <= hoje + 30 dias`.

Historico:
- Ao clicar na linha, abre painel expandido de historico.
- Usa `activity_logs`.
- Para funcionario: `entity_type = 'employee_document'`.
- Para empresa: `entity_type = 'company_document'`.
- Busca via `listActivitiesForEntity`.
- Atalhos existentes na Central: `Esc`, `W`, `E`, `V`.

Coluna de anexo:
- Quando `externalFileUrl` existe, mostra botao `Abrir`.
- Usa `resolveDocumentFileUrl`.
- Abre em nova aba.
- Usa `stopPropagation` para nao abrir historico da linha.
- Quando nao existe anexo, mostra `—`.

Paginacao:
- Deve respeitar apenas o valor selecionado em registros por pagina.
- Nao deve depender de altura da tela, viewport ou cards.
- CSS da tabela operacional nao deve limitar linhas por `max-height`.
- A pagina pode rolar verticalmente.

## Painel do Especialista / Homologacao

Pagina:
- `src/pages/SpecialistPanelPage.tsx`

Hook provavel:
- `src/hooks/useSpecialistPanel.ts`

Service:
- `src/services/specialistService.ts`

A Homologacao considera:
- `employee_documents`
- `company_documents`

Entram documentos em etapas relevantes:
- `homologation`
- `sent`
- `approved`
- `rejected`

Para documentos da empresa:
- Buscar em `company_documents`.
- Join com `document_types`.
- Filtrar `document_types.category = 'Empresa'`.

Tipo conhecido: `SpecialistQueueItem`

Campos:
- `source: 'employee' | 'company'`
- `id`
- `employee_id`
- `company_id`
- `document_type_id`
- `status`
- `workflow_status`
- `expiration_date`
- `issue_date`
- `external_file_url`
- `notes`
- `employees`
- `document_types`

Para documentos da empresa:
- `employee_id = ''`
- `employees.full_name = 'Documento da empresa'`
- `employees.company_id = company_id`
- `employees.companies.corporate_name = nome da empresa`

Acoes:
- Enviar
- Aprovar
- Rejeitar

Ao alterar:
- Se `source = 'employee'`, atualiza `employee_documents`.
- Se `source = 'company'`, atualiza `company_documents`.

Historico:
- Ao clicar na linha, abre historico igual a Central Operacional.
- Usa `listActivitiesForEntity`.
- Para funcionario: `entity_type = 'employee_document'`.
- Para empresa: `entity_type = 'company_document'`.
- Atalho mantido: `Esc` fecha historico.
- Nao implementar atalhos `W` ou `V` na Homologacao.

Anexo:
- Botao `Abrir`.
- Usa `resolveDocumentFileUrl`.
- Abre arquivo em nova aba.
- Usa `stopPropagation`.

## Historico Operacional

Tabela: `public.activity_logs`

Campos provaveis:
- `id`
- `created_at`
- `user_id`
- `entity_type`
- `entity_id`
- `action_type`
- `description`
- `metadata`

Service:
- `src/services/activityLogService.ts`

Funcoes conhecidas:
- `logActivity`
- `listActivitiesGlobal`
- `listActivitiesForEntity`
- `listActivitiesForCompany`
- `listActivitiesForEmployee`

Entidades relevantes:
- `company`
- `employee`
- `employee_document`
- `company_document`

Tipos de acao conhecidos:
- `created`
- `updated`
- `approved`
- `rejected`
- `status_changed`
- `note_added`

## Templates WhatsApp

Tabela: `public.message_templates`

Variaveis:
- `{{empresa}}`
- `{{documento}}`
- `{{dias}}`
- `{{funcionario}}`
- `{{responsavel}}`
- `{{status}}`

Fluxo principal e WhatsApp-first.

Componente:
- `src/components/WhatsAppModal.tsx`

## Dashboard

Pagina:
- `src/pages/DashboardPage`

Estrutura desejada:
- Empresas monitoradas
- Funcionarios monitorados
- Cargos ativos
- Documentos cadastrados
- Cards/indicadores da Central Operacional

Documento cadastrado:
- Contar `document_types`.
- Apenas `is_active = true`.
- Nao contar `employee_documents`.

## Tipos de Documento - Cards/Filtros

Pagina:
- `src/pages/DocumentTypesPage.tsx`

Cards:
- Total
- Obrigatorios para cargos
- Obrigatorios para empresa
- Ativos
- Inativos

Regras:
- Total: total de tipos cadastrados.
- Obrigatorios para cargos: `is_company_required = false` e `is_required = true`.
- Obrigatorios para empresa: `is_company_required = true`.
- Ativos: `is_active = true`.
- Inativos: `is_active = false`.

Cards funcionam como filtros clicaveis e devem combinar com filtro por categoria.

## Cards de Filtros

Decisao atual:
- Nao usar modo compacto/redimensionado.
- Cards devem manter tamanho padrao.
- Usar botao `Ocultar filtros` / `Exibir filtros`.

Componente:
- `src/components/FilterCardsToggle.tsx`

Usado em paginas com cards de filtro:
- Empresas
- Funcionarios
- Cargos
- Templates
- Usuarios
- Tipos de Documento
- Central Operacional
- Painel do Especialista

Regra:
- Esconder/exibir bloco visual dos cards.
- Filtro selecionado continua funcionando mesmo oculto.
- Nao alterar logica de filtragem.

## Upload / PDF / Dropbox

Existe integracao com Dropbox ou arquivo por `external_file_url`.

Helper:
- `src/lib/documentFileResolver.ts`

Comportamento:
- Se `external_file_url` comeca com `/`, usa Dropbox via Edge Function.
- Se e URL externa, abre direto.
- Nao expor credenciais no frontend.
- Toda comunicacao Dropbox deve continuar via Edge Functions.

Service provavel:
- `src/services/dropboxService.ts`

## Build Atual

Comando:
- `npm.cmd run build`

Build conhecido com pendencias fora das ultimas alteracoes:

`src/pages/ReportsPage.tsx`
- `useReports` declarado e nao usado.
- `Tab` declarado e nao usado.
- `OverviewTab`, `CompaniesTab`, `DocTypesTab`, `ActivityTab` declarados e nao usados.

`src/services/clientPortalService.ts`
- Comparacoes TypeScript envolvendo status legados `expiring` e `rejected`.
- Erros TS2367 por tipos sem intersecao.

## Arquivos Importantes

Paginas:
- `src/pages/OperationalCenterPage.tsx`
- `src/pages/SpecialistPanelPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/DocumentTypesPage.tsx`
- `src/pages/CompanyFormPage.tsx`
- `src/pages/CompanyDocumentFormPage.tsx`
- `src/pages/EmployeeDocumentFormPage.tsx`
- `src/pages/EmployeesPage.tsx`
- `src/pages/CompaniesPage.tsx`
- `src/pages/RolesPage.tsx`
- `src/pages/MessageTemplatesPage.tsx`
- `src/pages/admin/ProfilesPage.tsx`
- `src/pages/admin/ClientManagementPage.tsx`
- `src/pages/admin/SystemProfilesPage.tsx`
- `src/pages/admin/CreateUserPage.tsx`

Services:
- `src/services/operationalService.ts`
- `src/services/specialistService.ts`
- `src/services/employeeDocumentService.ts`
- `src/services/companyDocumentService.ts`
- `src/services/companyService.ts`
- `src/services/activityLogService.ts`
- `src/services/dropboxService.ts`
- `src/services/clientPortalService.ts`

Hooks:
- `src/hooks/useOperationalCenter.ts`
- `src/hooks/useSpecialistPanel.ts`
- `src/hooks/useCompanyDocuments.ts`
- `src/hooks/useEmployeeDocuments.ts`

Components:
- `src/components/FilterCardsToggle.tsx`
- `src/components/WhatsAppModal.tsx`
- `src/components/DocStatusBadge.tsx`
- `src/components/ActivityTimeline.tsx`
- `src/components/RoleDocumentChecklistSection.tsx`

Utils:
- `src/lib/documentUtils.ts`
- `src/lib/documentFileResolver.ts`

Migrations:
- `supabase/migrations/20260517_add_company_required_document_types.sql`
- `supabase/migrations/20260517_add_empresa_document_category.sql`
- `supabase/migrations/20260517_create_company_documents.sql`
- `supabase/migrations/20260517_update_company_documents_workflow.sql`

## Regras de Desenvolvimento

Sempre:
- Preservar UX limpa.
- Desktop-first na area operacional.
- Nao usar biblioteca UI externa.
- Nao quebrar funcionalidades existentes.
- Nao alterar autenticacao, rotas ou permissoes sem necessidade.
- Nao usar `employee_documents` para documentos de empresa.
- Nao usar documentos empresariais em checklist de cargos.
- Reutilizar hooks/services existentes.
- Evitar duplicacao de regra.
- Evitar refatoracao agressiva.
- Ao mexer em tabela clicavel, usar `stopPropagation` nos botoes internos.
- Ao mexer em anexos, usar `resolveDocumentFileUrl`.
- Ao mexer em historico, usar `activity_logs` e `listActivitiesForEntity`.

## Proximos Pontos Provaveis

- Corrigir build em `ReportsPage.tsx`.
- Corrigir tipos legados em `clientPortalService.ts`.
- Validar visual da Central e Homologacao em ambiente local.
- Consolidar labels/enums de status e workflow para reduzir duplicacao.
- Evoluir portal cliente.
- Finalizar permissoes/RLS.
- Deploy em Cloudflare Pages.
