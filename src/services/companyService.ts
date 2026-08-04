import { supabase } from '../lib/supabase'
import { parseSupabaseError } from '../lib/errors'
import { logActivity } from './activityLogService'
import { createRequiredCompanyDocuments } from './companyDocumentService'
import type { Company, CompanyInsert, CompanyUpdate } from '../types/company'

export async function listCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('corporate_name')
  if (error) throw error
  return data
}

export async function countCompanies(): Promise<number> {
  const { count, error } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function countActiveCompanies(): Promise<number> {
  const { count, error } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  if (error) throw error
  return count ?? 0
}

export async function getCompany(id: string): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCompany(company: CompanyInsert): Promise<Company> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('companies')
    .insert({ ...company, created_by: user!.id })
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Este CNPJ já está cadastrado no sistema.')
  logActivity({
    entityType: 'company',
    entityId: data.id,
    actionType: 'created',
    description: `Empresa "${data.corporate_name}" cadastrada`,
  }).catch(() => {})
  await createRequiredCompanyDocuments(data.id).catch(() => {})
  return data
}

export async function updateCompany(id: string, company: CompanyUpdate): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(company)
    .eq('id', id)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Este CNPJ já está cadastrado no sistema.')
  logActivity({
    entityType: 'company',
    entityId: id,
    actionType: 'updated',
    description: `Empresa "${data.corporate_name}" atualizada`,
  }).catch(() => {})
  return data
}
