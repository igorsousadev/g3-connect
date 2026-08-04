import { supabase } from '../lib/supabase'
import { parseSupabaseError } from '../lib/errors'
import { logActivity } from './activityLogService'
import type { Employee, EmployeeInsert, EmployeeUpdate } from '../types/employee'

export async function listEmployees(companyId?: string): Promise<Employee[]> {
  let query = supabase.from('employees').select('*').order('full_name')
  if (companyId) query = query.eq('company_id', companyId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function countEmployees(): Promise<number> {
  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function countActiveEmployees(): Promise<number> {
  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  if (error) throw error
  return count ?? 0
}

export async function getEmployee(id: string): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createEmployee(employee: EmployeeInsert): Promise<Employee> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('employees')
    .insert({ ...employee, created_by: user!.id })
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Este CPF já está cadastrado no sistema.')
  logActivity({
    entityType: 'employee',
    entityId: data.id,
    actionType: 'created',
    description: `Funcionário "${employee.full_name}" cadastrado`,
  }).catch(() => {})
  return data
}

export async function updateEmployee(id: string, employee: EmployeeUpdate): Promise<Employee> {
  // full_name, cpf, company_id e role_id são imutáveis após o cadastro
  const { phone, status, notes } = employee
  const { data, error } = await supabase
    .from('employees')
    .update({ phone, status, notes })
    .eq('id', id)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Erro ao atualizar funcionário.')
  logActivity({
    entityType: 'employee',
    entityId: id,
    actionType: 'updated',
    description: `Funcionário "${data.full_name}" atualizado`,
  }).catch(() => {})
  return data
}
