import type { UserRole } from '../types/profile'

// Chaves de módulo que representam as telas/áreas do sistema.
// Adicione novas chaves aqui conforme o sistema crescer.
export type ModuleKey =
  | 'dashboard'
  | 'central_operacional'
  | 'companies'
  | 'employees'
  | 'documents'
  | 'history'
  | 'reports'
  | 'specialist_panel'
  | 'templates'
  | 'contractor_portals'
  | 'contractors'
  | 'segments'
  | 'roles'
  | 'document_types'
  | 'client_billing'
  | 'profiles'
  | 'system_profiles'
  | 'users'
  | 'client_portal'

// Mapa central: perfil → módulos acessíveis.
// Toda alteração de permissão deve ser feita APENAS aqui.
export const ROLE_MODULES: Record<UserRole, ModuleKey[]> = {
  admin: [
    'dashboard',
    'central_operacional',
    'companies',
    'employees',
    'documents',
    'history',
    'reports',
    'specialist_panel',
    'templates',
    'contractor_portals',
    'contractors',
    'segments',
    'roles',
    'document_types',
    // 'client_billing',
    'profiles',
    'system_profiles',
    'users',
    'client_portal',
  ],
  supervisor: [
    'dashboard',
    'central_operacional',
    'companies',
    'employees',
    'documents',
    'history',
    'specialist_panel',
    'templates',
    'contractors',
    'segments',
    'roles',
    'document_types',
  ],
  operator: [
    'dashboard',
    'central_operacional',
    'companies',
    'employees',
    'documents',
    'contractors',
  ],
  specialist: [
    'dashboard',
    'specialist_panel',
  ],
  client: [
    'client_portal',
  ],
}

// Retorna true se o perfil tem acesso ao módulo.
export function hasModule(role: UserRole, module: ModuleKey): boolean {
  return ROLE_MODULES[role]?.includes(module) ?? false
}

// Retorna a lista de perfis que têm acesso ao módulo.
// Usado para preencher allowedRoles nas rotas e roles nos itens de menu.
export function rolesFor(module: ModuleKey): UserRole[] {
  return (Object.entries(ROLE_MODULES) as [UserRole, ModuleKey[]][])
    .filter(([, modules]) => modules.includes(module))
    .map(([role]) => role)
}

// Perfis com acesso ao sistema interno (todos exceto client).
// Usado no wrapper externo de PrivateRoute.
export const INTERNAL_ROLES: UserRole[] = rolesFor('dashboard')
