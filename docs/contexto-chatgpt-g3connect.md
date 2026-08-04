# Contexto completo para ChatGPT - Projeto G3 Connect

Use este documento como contexto base ao pedir ajuda ao ChatGPT/Codex/Claude sobre o projeto G3 Connect.

## Como o assistente deve agir neste projeto

Voce e um assistente tecnico ajudando a evoluir o G3 Connect.

Regras obrigatorias:
- Responder em portugues do Brasil.
- Antes de sugerir alteracoes, entender a estrutura existente.
- Nao propor refatoracoes grandes sem necessidade.
- Nao criar dependencias novas se a solucao puder ser feita com React, TypeScript e CSS existentes.
- Preservar o padrao visual atual.
- Priorizar MVP simples, operacional e facil de manter.
- Manter regras de negocio configuraveis sempre que possivel.
- Nao fixar contratantes, dominios, documentos, mensagens ou fluxos especificos no codigo.
- Separar status documental de etapa operacional.
- Nao usar `employee_documents` para documentos da empresa.
- Nao expor credenciais no frontend.
- Toda integracao Dropbox deve continuar via Supabase Edge Functions.
- Ao mexer em botoes dentro de linhas clicaveis, usar `stopPropagation`.
- Ao abrir anexos, usar `resolveDocumentFileUrl`.
- Ao registrar historico, usar `activity_logs` via service existente.

## Visao geral do produto

O G3 Connect e uma plataforma operacional de gestao documental, homologacao de terceiros, acompanhamento de pendencias, vencimentos e produtividade interna.

Ele nao e apenas um GED. O foco e Software + Operacao:
- cliente envia documentos;
- operador organiza informacoes;
- especialista faz homologacao;
- sistema centraliza status, pendencias, vencimentos e historico;
- cliente acompanha pelo portal.

Filosofia do MVP:
- simples;
- rapido;
- baixo custo;
- organizado;
- facil de operar;
- facil de manter.

Evitar:
- overengineering;
- automacoes complexas desnecessarias;
- IA prematura;
- upload/fluxos complexos sem necessidade;
- bibliotecas de UI externas.

## Stack

- React 19
- TypeScript
- Vite
- React Router 7
- Supabase Auth
- Supabase/PostgreSQL
- Supabase Edge Functions
- Dropbox para arquivos
- CSS proprio
- Deploy atual documentado para Cloudflare Pages

Scripts:
- `npm run dev`: servidor Vite
- `npm run build`: `tsc -b && vite build`
- `npm run lint`: ESLint
- `npm run preview`: preview do build

Variaveis frontend:
- `VITE_APP_NAME`
- `VITE_APP_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPPORT_WHATSAPP`
- `VITE_SUPPORT_EMAIL`

Secrets de servidor Supabase:
- `DROPBOX_ACCESS_TOKEN`
- `DROPBOX_APP_KEY`
- `DROPBOX_APP_SECRET`
- `DROPBOX_REFRESH_TOKEN`
- `DROPBOX_ROOT_FOLDER`

## Estrutura de pastas

Pastas principais:
- `src/pages`: paginas da aplicacao.
- `src/components`: componentes reutilizaveis.
- `src/layouts`: layouts interno e portal cliente.
- `src/routes`: roteamento e guards.
- `src/services`: acesso a dados e regras por modulo.
- `src/hooks`: hooks de carregamento/estado por modulo.
- `src/types`: tipos TypeScript.
- `src/lib`: helpers e utilitarios.
- `src/config`: configuracoes como permissoes.
- `src/contexts`: contexto de auth e cliente.
- `supabase/migrations`: scripts SQL.
- `supabase/functions`: Edge Functions.
- `docs`: documentacao do projeto.
- `public`: assets publicos, redirects e rotas.

Arquivos importantes:
- `src/main.tsx`
- `src/App.tsx`
- `src/routes/AppRouter.tsx`
- `src/config/permissions.ts`
- `src/lib/supabase.ts`
- `src/lib/documentFileResolver.ts`
- `src/lib/dropboxPaths.ts`
- `CLAUDE.md`
- `docs/contexto-g3-connect.md`
- `docs/dropbox-integration.md`
- `docs/cloudflare-pages-deploy.md`

## Perfis e permissoes

Autenticacao via Supabase Auth.

Perfis:
- `admin`: acesso total.
- `supervisor`: visao operacional ampla, sem areas administrativas sensiveis.
- `operator`: operacao diaria.
- `specialist`: homologacao.
- `client`: portal do cliente.

Tipo:
- `src/types/profile.ts`

Permissoes:
- `src/config/permissions.ts`

Modulo de permissoes centraliza:
- `ROLE_MODULES`
- `hasModule`
- `rolesFor`
- `INTERNAL_ROLES`

Regra: alteracoes de acesso a telas devem passar preferencialmente por `src/config/permissions.ts`.

## Rotas principais

Arquivo:
- `src/routes/AppRouter.tsx`

Rotas publicas:
- `/`
- `/login`

Area interna:
- `/dashboard`
- `/empresas`
- `/empresas/nova`
- `/empresas/:id/editar`
- `/empresas/:companyId/documentos/novo`
- `/empresas/:companyId/documentos/:documentId/editar`
- `/contratantes`
- `/contratantes/nova`
- `/contratantes/:id/editar`
- `/segmentos`
- `/segmentos/novo`
- `/segmentos/:id/editar`
- `/funcionarios`
- `/funcionarios/novo`
- `/funcionarios/:id/editar`
- `/funcionarios/:id/documentos/novo`
- `/funcionarios/:id/documentos/:docId/editar`
- `/documentos`
- `/central-operacional`
- `/historico`
- `/homologacao`
- `/templates-whatsapp`
- `/templates-whatsapp/novo`
- `/templates-whatsapp/:id/editar`
- `/cargos`
- `/cargos/novo`
- `/cargos/:id/editar`
- `/cadastro-documentos`
- `/cadastro-documentos/novo`
- `/cadastro-documentos/:id/editar`
- `/relatorios`
- `/admin/perfis`
- `/admin/perfis-sistema`
- `/admin/usuarios`
- `/alterar-senha`

Portal cliente:
- `/portal/dashboard`
- `/portal/funcionarios`
- `/portal/funcionarios/:id`
- `/portal/empresa`
- `/portal/pendencias`
- `/portal/historico`
- `/portal/alterar-senha`

## Modulos do sistema

Modulos existentes ou em evolucao:
- Login/Auth
- Dashboard
- Central Operacional
- Empresas
- Contratantes
- Segmentos
- Vinculos empresa x contratante
- Funcionarios
- Cargos/Funcoes
- Checklist por cargo
- Tipos de documento
- Documentos de funcionarios
- Documentos da empresa
- Painel do especialista / Homologacao
- Portal cliente
- Historico operacional
- Templates WhatsApp
- Relatorios
- Perfis administrativos
- Perfis de sistema
- Criacao de usuarios
- Reset/alteracao de senha
- Integracao Dropbox

## Banco de dados e entidades

### profiles

Campos conhecidos:
- `id`
- `created_at`
- `full_name`
- `email`
- `role`
- `company_id`
- `is_active`
- `password_reset_pending`

Roles aceitos:
- `admin`
- `operator`
- `specialist`
- `supervisor`
- `client`

Cliente deve acessar somente a propria empresa.

### system_profiles

Criada em:
- `supabase/migrations/20240512_system_profiles_and_supervisor.sql`

Campos:
- `id`
- `name`
- `slug`
- `description`
- `is_system`
- `is_active`
- `created_at`
- `updated_at`

Perfis padrao:
- Administrador
- Operador
- Especialista
- Supervisor
- Cliente

### companies

Tipo:
- `src/types/company.ts`

Campos conhecidos:
- `id`
- `created_at`
- `created_by`
- `corporate_name`
- `trade_name`
- `cnpj`
- `responsible_name`
- `whatsapp`
- `email`
- `status`
- `notes`
- `monthly_fee`
- `billing_day`
- `payment_method`
- `contract_start_date`
- `contract_status`
- `plan_name`
- `invoice_required`
- `invoice_email`
- `financial_notes`

Status:
- `active`
- `pending`
- `inactive`

Regras:
- CNPJ unico.
- Empresa pode ter documentos proprios.
- Na criacao de empresa, gerar documentos obrigatorios empresariais quando existirem tipos com `is_company_required = true`.

### contractors

Modulo de contratantes.

Migration:
- `supabase/migrations/20260520_create_contractors.sql`

Tipo:
- `src/types/contractor.ts`

Campos:
- `id`
- `corporate_name`
- `trade_name`
- `cnpj`
- `code`
- `responsible_name`
- `whatsapp`
- `email`
- `status`
- `notes`
- `created_at`
- `updated_at`

Regras:
- `code` unico.
- `cnpj` unico.
- status: `active` ou `inactive`.

### segments

Modulo de segmentos.

Migration:
- `supabase/migrations/20260520_create_segments.sql`

Campos:
- `id`
- `name`
- `description`
- `status`
- `created_at`
- `updated_at`

Regras:
- `name` unico.
- status: `active` ou `inactive`.

### company_contractors

Vinculo entre empresa prestadora e contratante.

Migrations:
- `supabase/migrations/20260521_create_company_contractors.sql`
- `supabase/migrations/20260521_add_contract_history_fields.sql`
- `supabase/migrations/20260521_one_active_contractor_per_company.sql`

Tipo:
- `src/types/companyContractor.ts`

Campos:
- `id`
- `company_id`
- `contractor_id`
- `segment_id`
- `contract_sequence`
- `contract_number`
- `contract_inclusion_date`
- `status`
- `notes`
- `inactivated_at`
- `inactivation_reason`
- `created_at`
- `updated_at`

Regras:
- Rela uma empresa prestadora com uma contratante e segmento.
- Gera/guarda numero de contrato.
- Deve existir apenas um vinculo ativo por empresa quando a migration `one_active_contractor_per_company` estiver aplicada.

### employees

Tipo:
- `src/types/employee.ts`

Campos:
- `id`
- `created_at`
- `created_by`
- `company_id`
- `full_name`
- `cpf`
- `role`
- `role_id`
- `phone`
- `status`
- `notes`

Regras:
- CPF unico.
- Funcionario pertence a uma empresa.
- `role` e legado.
- `role_id` e o campo correto para novos cadastros.
- Documentos ficam em `employee_documents`.

### roles

Modulo de cargos/funcoes.

Arquivos:
- `src/types/role.ts`
- `src/services/roleService.ts`
- `src/pages/RolesPage.tsx`
- `src/pages/RoleFormPage.tsx`

Checklist por cargo:
- `role_document_requirements`
- `src/components/RoleDocumentChecklistSection.tsx`
- `src/services/roleDocumentRequirementService.ts`

Regra:
- Documentos empresariais nao devem aparecer em checklist de cargo.

### document_types

Tipo:
- `src/types/documentType.ts`

Campos:
- `id`
- `created_at`
- `name`
- `description`
- `category`
- `default_validity_days`
- `is_required`
- `is_company_required`
- `is_active`

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

Regras:
- `is_company_required = true`: documento obrigatorio da empresa.
- `is_company_required = false`: documento de funcionario/cargo.
- Documentos de empresa devem usar categoria `Empresa`.
- Formularios de documento de funcionario nao devem listar tipos com `is_company_required = true`.
- Checklist de cargo nao deve listar documentos empresariais.

### employee_documents

Tipo:
- `src/types/employeeDocument.ts`

Campos:
- `id`
- `created_at`
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

Arquivos historicos:
- `employee_document_files`
- migration `supabase/migrations/20260519_employee_document_files.sql`

### company_documents

Tipo:
- `src/types/companyDocument.ts`

Migrations:
- `supabase/migrations/20260517_create_company_documents.sql`
- `supabase/migrations/20260517_update_company_documents_workflow.sql`
- `supabase/migrations/20260519_company_document_files.sql`

Campos:
- `id`
- `created_at`
- `updated_at`
- `company_id`
- `document_type_id`
- `status`
- `workflow_status`
- `issue_date`
- `expiration_date`
- `external_file_url`
- `notes`
- `approved_by`
- `approved_at`

Regra critica:
- Documentos de empresa ficam em `company_documents`, nunca em `employee_documents`.
- Tela propria de inclusao/edicao, nao modal.
- Rotas usadas:
  - `/empresas/:companyId/documentos/novo`
  - `/empresas/:companyId/documentos/:documentId/editar`
- Deve haver unicidade por empresa + tipo documental.

### activity_logs

Tipo:
- `src/types/activityLog.ts`

Service:
- `src/services/activityLogService.ts`

Funcoes conhecidas:
- `logActivity`
- `listActivitiesGlobal`
- `listActivitiesForEntity`
- `listActivitiesForCompany`
- `listActivitiesForEmployee`

Entidades:
- `company`
- `company_document`
- `contractor`
- `employee`
- `employee_document`
- `checklist`
- `role`
- `user_profile`
- `system_profile`

Acoes:
- `created`
- `updated`
- `deleted`
- `approved`
- `rejected`
- `status_changed`
- `note_added`
- `whatsapp_sent`

## Status documental e workflow

Regra critica:
- `status` representa situacao documental do arquivo.
- `workflow_status` representa etapa operacional.
- Nao misturar os dois.

Status documental atual:
- `pending`: Pendente
- `invalid`: Invalido
- `valid`: Valido
- `expired`: Vencido

Workflow atual:
- `pending_client`: Aguardando cliente
- `analysis`: Em analise
- `homologation`: Homologacao
- `sent`: Enviado
- `approved`: Aprovado
- `rejected`: Rejeitado

Responsavel por etapa:
- `pending_client`: cliente
- `analysis`: operador
- `homologation`: especialista
- `sent`: especialista
- `approved`: concluido
- `rejected`: cliente

Valores legados que podem aparecer:
- status: `expiring`, `submitted`, `rejected`
- workflow: `submitted`, `under_review`, `pending_specialist`, `submitted_to_contractor`

Mapeamentos desejados:
- `expiring` -> `valid`
- `submitted` -> `pending` ou `analysis`, conforme campo
- `rejected` em status documental -> `invalid`
- `under_review` -> `analysis`
- `pending_specialist` -> `homologation`
- `submitted_to_contractor` -> `sent`

## Central Operacional

Pagina:
- `src/pages/OperationalCenterPage.tsx`

Hook:
- `src/hooks/useOperationalCenter.ts`

Service:
- `src/services/operationalService.ts`

Tipo:
- `src/types/operational.ts`

A Central Operacional e o coracao do sistema.

Ela deve unificar:
- documentos de funcionarios (`employee_documents`);
- documentos de empresa (`company_documents`);
- documentos faltantes por checklist;
- contexto de empresa, funcionario, cargo, contratante e contrato.

Campos importantes do item operacional:
- `source`
- `docId`
- `status`
- `workflowStatus`
- `expirationDate`
- `issueDate`
- `daysUntilExpiry`
- `externalFileUrl`
- `notes`
- `documentTypeId`
- `documentTypeName`
- `employeeId`
- `employeeName`
- `employeeCpf`
- `employeePhone`
- `roleId`
- `roleName`
- `companyId`
- `companyName`
- `companyWhatsapp`
- `contractLabel`
- `contractorId`
- `contractorCode`
- `contractorTradeName`
- `contractSearch`
- `isMissing`
- `updatedAt`

Regras:
- Cards e filtros somam documentos de funcionario + documentos de empresa.
- Filtro de origem: todos, funcionarios, empresas.
- Documentos vencidos: `expiration_date < hoje`.
- Documentos vencendo em 30 dias: entre hoje e hoje + 30 dias.
- Paginacao deve respeitar somente o valor escolhido em registros por pagina.
- CSS da tabela nao deve limitar linhas por altura de viewport.
- A pagina pode rolar verticalmente.
- Ao clicar na linha, abrir historico.
- Botoes internos devem chamar `stopPropagation`.

Atalhos existentes:
- `Esc`
- `W`
- `E`
- `V`

## Painel do Especialista / Homologacao

Pagina:
- `src/pages/SpecialistPanelPage.tsx`

Hook:
- `src/hooks/useSpecialistPanel.ts`

Service:
- `src/services/specialistService.ts`

Considera:
- `employee_documents`
- `company_documents`

Etapas relevantes:
- `homologation`
- `sent`
- `approved`
- `rejected`

Acoes:
- Enviar
- Aprovar
- Rejeitar

Regras:
- Se `source = employee`, atualizar `employee_documents`.
- Se `source = company`, atualizar `company_documents`.
- Historico usa `listActivitiesForEntity`.
- `Esc` fecha historico.
- Nao implementar atalhos `W` ou `V` na Homologacao sem decisao explicita.
- Botao de anexo usa `resolveDocumentFileUrl` e `stopPropagation`.

## Portal cliente

Rotas:
- `/portal/dashboard`
- `/portal/funcionarios`
- `/portal/funcionarios/:id`
- `/portal/empresa`
- `/portal/pendencias`
- `/portal/historico`
- `/portal/alterar-senha`

Arquivos:
- `src/layouts/ClientLayout.tsx`
- `src/routes/ClientRoute.tsx`
- `src/contexts/ClientContext.tsx`
- `src/services/clientPortalService.ts`
- `src/pages/client/ClientDashboardPage.tsx`
- `src/pages/client/ClientEmployeesPage.tsx`
- `src/pages/client/ClientEmployeeDocsPage.tsx`
- `src/pages/client/ClientCompanyDocsPage.tsx`
- `src/pages/client/ClientPendingPage.tsx`
- `src/pages/client/ClientHistoryPage.tsx`

Regra:
- Usuario `client` deve ver somente dados da propria `company_id`.

## Dropbox e arquivos

Documentacao:
- `docs/dropbox-integration.md`

Service frontend:
- `src/services/dropboxService.ts`

Helpers:
- `src/lib/dropboxPaths.ts`
- `src/lib/documentFileResolver.ts`

Edge Functions:
- `supabase/functions/dropbox-upload`
- `supabase/functions/dropbox-download-link`
- `supabase/functions/dropbox-list`
- `supabase/functions/dropbox-delete`
- `supabase/functions/dropbox-move`

Funcoes frontend conhecidas:
- `uploadFileToDropbox`
- `getTemporaryDownloadLink`
- `downloadFileFromDropbox`
- `listDropboxFolder`
- `createDropboxFolder`
- `deleteDropboxFile`
- `moveDropboxFile`

Regra:
- Credenciais Dropbox ficam somente em Supabase Secrets.
- Frontend nunca chama Dropbox direto.
- Links temporarios devem ser gerados por Edge Function.
- `external_file_url` pode conter URL externa ou path Dropbox legado.
- `resolveDocumentFileUrl(fileRef)`:
  - se vazio, retorna `null`;
  - se comeca com `/`, resolve via Dropbox/Edge Function;
  - se `http/https`, abre direto.

Paths novos:
- Documento de funcionario:
  `/G3Connect/companies/{companyId}/employees/{employeeId}/documents/{documentTypeSlug}/{year}/{fileName}`
- Documento da empresa:
  `/G3Connect/companies/{companyId}/company-documents/{documentTypeSlug}/{year}/{fileName}`

## WhatsApp

Fluxo operacional e WhatsApp-first.

Componentes:
- `src/components/WhatsAppModal.tsx`
- `src/components/WhatsAppFloatButton.tsx`
- `src/components/FloatingContactButton.tsx`

Templates:
- `src/pages/MessageTemplatesPage.tsx`
- `src/pages/MessageTemplateFormPage.tsx`
- `src/services/messageTemplateService.ts`

Variaveis de template:
- `{{empresa}}`
- `{{documento}}`
- `{{dias}}`
- `{{funcionario}}`
- `{{responsavel}}`
- `{{status}}`

## Interface e UX

Principios:
- visual limpo;
- profissional;
- operacional;
- responsivo quando fizer sentido;
- desktop-first na area interna;
- portal cliente mais amigavel em mobile.

Padroes:
- CSS proprio.
- Evitar biblioteca de UI externa.
- Cards de filtros podem ser ocultados/exibidos por `FilterCardsToggle`.
- Nao alterar logica de filtros ao ocultar cards.
- Nao usar cards dentro de cards.
- Evitar textos explicativos longos dentro da aplicacao.
- Priorizar densidade e clareza nas telas operacionais.

Componente:
- `src/components/FilterCardsToggle.tsx`

Usado em:
- Empresas
- Funcionarios
- Cargos
- Templates
- Usuarios
- Tipos de Documento
- Central Operacional
- Painel do Especialista

## Deploy

Documentacao:
- `docs/cloudflare-pages-deploy.md`

Cloudflare Pages:
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 20 ou superior

SPA fallback:
- `public/_redirects`
- `public/_routes.json`

Observacao:
- `netlify.toml` existe como legado.
- Edge Functions continuam no Supabase.

## Supabase Edge Functions

Funcoes:
- `create-user`
- `request-password-reset`
- `verify-password-reset-code`
- `confirm-new-password`
- `dropbox-upload`
- `dropbox-download-link`
- `dropbox-list`
- `dropbox-delete`
- `dropbox-move`

Shared:
- `supabase/functions/_shared/mail.ts`
- `supabase/functions/_shared/dropbox.ts`

## Migrations existentes

- `20240512_system_profiles_and_supervisor.sql`
- `20260517_add_company_required_document_types.sql`
- `20260517_add_empresa_document_category.sql`
- `20260517_create_company_documents.sql`
- `20260517_update_company_documents_workflow.sql`
- `20260517_update_document_status_workflow.sql`
- `20260518_password_reset.sql`
- `20260519_company_document_files.sql`
- `20260519_employee_document_files.sql`
- `20260520_contractors_alter_not_null.sql`
- `20260520_create_contractors.sql`
- `20260520_create_segments.sql`
- `20260521_add_contract_history_fields.sql`
- `20260521_create_company_contractors.sql`
- `20260521_migrate_portal_access.sql`
- `20260521_one_active_contractor_per_company.sql`

## Arquivos por dominio

Empresas:
- `src/pages/CompaniesPage.tsx`
- `src/pages/CompanyFormPage.tsx`
- `src/services/companyService.ts`
- `src/hooks/useCompanies.ts`
- `src/types/company.ts`

Contratantes:
- `src/pages/ContractorsPage.tsx`
- `src/pages/ContractorFormPage.tsx`
- `src/services/contractorService.ts`
- `src/hooks/useContractors.ts`
- `src/types/contractor.ts`

Segmentos:
- `src/pages/SegmentsPage.tsx`
- `src/pages/SegmentFormPage.tsx`
- `src/services/segmentService.ts`
- `src/hooks/useSegments.ts`
- `src/types/segment.ts`

Funcionarios:
- `src/pages/EmployeesPage.tsx`
- `src/pages/EmployeeFormPage.tsx`
- `src/services/employeeService.ts`
- `src/hooks/useEmployees.ts`
- `src/types/employee.ts`

Documentos de funcionario:
- `src/pages/EmployeeDocumentsPage.tsx`
- `src/pages/EmployeeDocumentFormPage.tsx`
- `src/services/employeeDocumentService.ts`
- `src/hooks/useEmployeeDocuments.ts`
- `src/types/employeeDocument.ts`

Documentos da empresa:
- `src/pages/CompanyDocumentFormPage.tsx`
- `src/services/companyDocumentService.ts`
- `src/hooks/useCompanyDocuments.ts`
- `src/types/companyDocument.ts`

Tipos de documento:
- `src/pages/DocumentTypesPage.tsx`
- `src/pages/DocumentTypeFormPage.tsx`
- `src/services/documentTypeService.ts`
- `src/hooks/useDocumentTypes.ts`
- `src/types/documentType.ts`

Cargos:
- `src/pages/RolesPage.tsx`
- `src/pages/RoleFormPage.tsx`
- `src/pages/RoleChecklistPage.tsx`
- `src/services/roleService.ts`
- `src/services/roleDocumentRequirementService.ts`
- `src/hooks/useRoles.ts`
- `src/types/role.ts`
- `src/types/roleDocumentRequirement.ts`

Central:
- `src/pages/OperationalCenterPage.tsx`
- `src/services/operationalService.ts`
- `src/hooks/useOperationalCenter.ts`
- `src/types/operational.ts`

Homologacao:
- `src/pages/SpecialistPanelPage.tsx`
- `src/services/specialistService.ts`
- `src/hooks/useSpecialistPanel.ts`

Historico:
- `src/pages/ActivityLogPage.tsx`
- `src/components/ActivityTimeline.tsx`
- `src/services/activityLogService.ts`
- `src/hooks/useActivityLogs.ts`
- `src/types/activityLog.ts`

Relatorios:
- `src/pages/ReportsPage.tsx`
- `src/services/reportsService.ts`
- `src/hooks/useReports.ts`

Admin:
- `src/pages/admin/ProfilesPage.tsx`
- `src/pages/admin/SystemProfilesPage.tsx`
- `src/pages/admin/CreateUserPage.tsx`
- `src/services/profileService.ts`
- `src/services/systemProfileService.ts`
- `src/services/userManagementService.ts`

## Pendencias conhecidas

Build mencionado na documentacao anterior tinha pendencias em:
- `src/pages/ReportsPage.tsx`: imports/constantes declarados e nao usados.
- `src/services/clientPortalService.ts`: comparacoes TypeScript com status legados.

Antes de assumir que ainda existem, rodar:
- `npm run build`
- `npm run lint`

## Proximos pontos provaveis

- Corrigir build e lint.
- Validar Central Operacional em ambiente local.
- Validar Homologacao em ambiente local.
- Consolidar labels/enums de status e workflow.
- Revisar RLS para portal cliente.
- Evoluir upload e historico de multiplos arquivos.
- Evoluir dashboard e relatorios.
- Consolidar deploy Cloudflare Pages.

## Prompt curto para abrir uma conversa

Estou trabalhando no projeto G3 Connect, uma plataforma React + TypeScript + Vite + Supabase para gestao documental e homologacao de empresas terceirizadas. Use as regras deste contexto: preservar MVP simples, nao adicionar bibliotecas sem necessidade, manter CSS proprio, separar `status` documental de `workflow_status`, usar `company_documents` para documentos de empresa, `employee_documents` para funcionarios, Dropbox somente por Supabase Edge Functions e respeitar as permissoes centralizadas em `src/config/permissions.ts`. Antes de sugerir mudancas, considere os arquivos e modulos descritos neste documento.

