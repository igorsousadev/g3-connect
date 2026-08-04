import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { ClientRoute } from './ClientRoute'
import { AppLayout } from '../layouts/AppLayout'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { ChangePasswordPage } from '../pages/ChangePasswordPage'
import { CompaniesPage } from '../pages/CompaniesPage'
import { CompanyFormPage } from '../pages/CompanyFormPage'
import { ContractorsPage } from '../pages/ContractorsPage'
import { ContractorFormPage } from '../pages/ContractorFormPage'
import { SegmentsPage } from '../pages/SegmentsPage'
import { SegmentFormPage } from '../pages/SegmentFormPage'
import { CompanyDocumentFormPage } from '../pages/CompanyDocumentFormPage'
import { EmployeesPage } from '../pages/EmployeesPage'
import { EmployeeFormPage } from '../pages/EmployeeFormPage'
import { RolesPage } from '../pages/RolesPage'
import { RoleFormPage } from '../pages/RoleFormPage'
import { DocumentTypesPage } from '../pages/DocumentTypesPage'
import { DocumentTypeFormPage } from '../pages/DocumentTypeFormPage'

import { EmployeeDocumentFormPage } from '../pages/EmployeeDocumentFormPage'
import { DocumentsOverviewPage } from '../pages/DocumentsOverviewPage'
import { OperationalCenterPage } from '../pages/OperationalCenterPage'
import { ActivityLogPage } from '../pages/ActivityLogPage'
import { SpecialistPanelPage } from '../pages/SpecialistPanelPage'
import { MessageTemplatesPage } from '../pages/MessageTemplatesPage'
import { MessageTemplateFormPage } from '../pages/MessageTemplateFormPage'
import { ReportsPage } from '../pages/ReportsPage'
import { ClientDashboardPage } from '../pages/client/ClientDashboardPage'
import { ClientEmployeesPage } from '../pages/client/ClientEmployeesPage'
import { ClientEmployeeDocsPage } from '../pages/client/ClientEmployeeDocsPage'
import { ClientPendingPage } from '../pages/client/ClientPendingPage'
import { ClientCompanyDocsPage } from '../pages/client/ClientCompanyDocsPage'
import { ClientHistoryPage } from '../pages/client/ClientHistoryPage'
import { ProfilesPage } from '../pages/admin/ProfilesPage'
// import { ClientManagementPage } from '../pages/admin/ClientManagementPage'
import { SystemProfilesPage } from '../pages/admin/SystemProfilesPage'
import { CreateUserPage } from '../pages/admin/CreateUserPage'
import { INTERNAL_ROLES, rolesFor } from '../config/permissions'

function RedirectToEdit() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/funcionarios/${id}/editar`} replace />
}

function RedirectToCompanyEdit() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/empresas/${id}/editar`} replace />
}

function RedirectToDocTypeEdit() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/cadastro-documentos/${id}/editar`} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <PrivateRoute allowedRoles={INTERNAL_ROLES}>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="empresas"            element={<PrivateRoute allowedRoles={rolesFor('companies')}><CompaniesPage /></PrivateRoute>} />
        <Route path="empresas/nova"       element={<PrivateRoute allowedRoles={rolesFor('companies')}><CompanyFormPage /></PrivateRoute>} />
        <Route path="empresas/:id/editar" element={<PrivateRoute allowedRoles={rolesFor('companies')}><CompanyFormPage /></PrivateRoute>} />

        <Route path="contratantes"              element={<PrivateRoute allowedRoles={rolesFor('contractors')}><ContractorsPage /></PrivateRoute>} />
        <Route path="contratantes/nova"         element={<PrivateRoute allowedRoles={rolesFor('contractors')}><ContractorFormPage /></PrivateRoute>} />
        <Route path="contratantes/:id/editar"   element={<PrivateRoute allowedRoles={rolesFor('contractors')}><ContractorFormPage /></PrivateRoute>} />

        <Route path="segmentos"              element={<PrivateRoute allowedRoles={rolesFor('segments')}><SegmentsPage /></PrivateRoute>} />
        <Route path="segmentos/novo"         element={<PrivateRoute allowedRoles={rolesFor('segments')}><SegmentFormPage /></PrivateRoute>} />
        <Route path="segmentos/:id/editar"   element={<PrivateRoute allowedRoles={rolesFor('segments')}><SegmentFormPage /></PrivateRoute>} />
        <Route path="empresas/:companyId/documentos/novo" element={<PrivateRoute allowedRoles={rolesFor('companies')}><CompanyDocumentFormPage /></PrivateRoute>} />
        <Route path="empresas/:companyId/documentos/:documentId/editar" element={<PrivateRoute allowedRoles={rolesFor('companies')}><CompanyDocumentFormPage /></PrivateRoute>} />
        <Route path="empresas/:id/portais" element={<RedirectToCompanyEdit />} />

        <Route path="funcionarios"                              element={<PrivateRoute allowedRoles={rolesFor('employees')}><EmployeesPage /></PrivateRoute>} />
        <Route path="funcionarios/novo"                         element={<PrivateRoute allowedRoles={rolesFor('employees')}><EmployeeFormPage /></PrivateRoute>} />
        <Route path="funcionarios/:id/editar"                   element={<PrivateRoute allowedRoles={rolesFor('employees')}><EmployeeFormPage /></PrivateRoute>} />
        <Route path="funcionarios/:id/documentos"               element={<RedirectToEdit />} />
        <Route path="funcionarios/:id/documentos/novo"          element={<PrivateRoute allowedRoles={rolesFor('employees')}><EmployeeDocumentFormPage /></PrivateRoute>} />
        <Route path="funcionarios/:id/documentos/:docId/editar" element={<PrivateRoute allowedRoles={rolesFor('employees')}><EmployeeDocumentFormPage /></PrivateRoute>} />

        <Route path="documentos" element={<PrivateRoute allowedRoles={rolesFor('documents')}><DocumentsOverviewPage /></PrivateRoute>} />

        <Route path="relatorios"        element={<PrivateRoute allowedRoles={rolesFor('reports')}><ReportsPage /></PrivateRoute>} />
        <Route path="central-operacional" element={<PrivateRoute allowedRoles={rolesFor('central_operacional')}><OperationalCenterPage /></PrivateRoute>} />
        <Route path="central"             element={<Navigate to="/central-operacional" replace />} />
        <Route path="historico"           element={<PrivateRoute allowedRoles={rolesFor('history')}><ActivityLogPage /></PrivateRoute>} />
        <Route path="homologacao"         element={<PrivateRoute allowedRoles={rolesFor('specialist_panel')}><SpecialistPanelPage /></PrivateRoute>} />
        <Route path="especialista"        element={<Navigate to="/homologacao" replace />} />

        <Route path="templates-whatsapp"            element={<PrivateRoute allowedRoles={rolesFor('templates')}><MessageTemplatesPage /></PrivateRoute>} />
        <Route path="templates-whatsapp/novo"       element={<PrivateRoute allowedRoles={rolesFor('templates')}><MessageTemplateFormPage /></PrivateRoute>} />
        <Route path="templates-whatsapp/:id/editar" element={<PrivateRoute allowedRoles={rolesFor('templates')}><MessageTemplateFormPage /></PrivateRoute>} />

        <Route path="cargos"            element={<PrivateRoute allowedRoles={rolesFor('roles')}><RolesPage /></PrivateRoute>} />
        <Route path="cargos/novo"       element={<PrivateRoute allowedRoles={rolesFor('roles')}><RoleFormPage /></PrivateRoute>} />
        <Route path="cargos/:id/editar" element={<PrivateRoute allowedRoles={rolesFor('roles')}><RoleFormPage /></PrivateRoute>} />

        <Route path="cadastro-documentos"            element={<PrivateRoute allowedRoles={rolesFor('document_types')}><DocumentTypesPage /></PrivateRoute>} />
        <Route path="cadastro-documentos/novo"       element={<PrivateRoute allowedRoles={rolesFor('document_types')}><DocumentTypeFormPage /></PrivateRoute>} />
        <Route path="cadastro-documentos/:id/editar" element={<PrivateRoute allowedRoles={rolesFor('document_types')}><DocumentTypeFormPage /></PrivateRoute>} />
        <Route path="tipos-de-documento"             element={<Navigate to="/cadastro-documentos" replace />} />
        <Route path="tipos-de-documento/novo"        element={<Navigate to="/cadastro-documentos/novo" replace />} />
        <Route path="tipos-de-documento/:id/editar"  element={<RedirectToDocTypeEdit />} />

        <Route path="configuracoes/checklist" element={<Navigate to="/cargos" replace />} />

        <Route path="admin/perfis"         element={<PrivateRoute allowedRoles={rolesFor('profiles')}><ProfilesPage /></PrivateRoute>} />
        {/* <Route path="admin/clientes" element={<PrivateRoute allowedRoles={rolesFor('client_billing')}><ClientManagementPage /></PrivateRoute>} /> */}
        <Route path="admin/perfis-sistema" element={<PrivateRoute allowedRoles={rolesFor('system_profiles')}><SystemProfilesPage /></PrivateRoute>} />
        <Route path="admin/usuarios"       element={<PrivateRoute allowedRoles={rolesFor('users')}><CreateUserPage /></PrivateRoute>} />

        <Route path="alterar-senha" element={<ChangePasswordPage />} />
      </Route>

      <Route path="/portal" element={<ClientRoute />}>
        <Route index element={<Navigate to="/portal/dashboard" replace />} />
        <Route path="dashboard"        element={<ClientDashboardPage />} />
        <Route path="funcionarios"     element={<ClientEmployeesPage />} />
        <Route path="funcionarios/:id" element={<ClientEmployeeDocsPage />} />
        <Route path="empresa"          element={<ClientCompanyDocsPage />} />
        <Route path="pendencias"       element={<ClientPendingPage />} />
        <Route path="historico"        element={<ClientHistoryPage />} />
        <Route path="alterar-senha"    element={<ChangePasswordPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
