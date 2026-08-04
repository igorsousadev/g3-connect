import { supabase } from '../lib/supabase'
import { parseSupabaseError } from '../lib/errors'
import { logActivity } from './activityLogService'
import type { Contractor, ContractorInsert, ContractorUpdate } from '../types/contractor'

function requireNonBlank(value: string | undefined, label: string): void {
  if (!value || !value.trim()) throw new Error(`${label} é obrigatório(a).`)
}

export async function listContractors(): Promise<Contractor[]> {
  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .order('corporate_name')
  if (error) throw error
  return data
}

export async function getContractor(id: string): Promise<Contractor> {
  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createContractor(contractor: ContractorInsert): Promise<Contractor> {
  requireNonBlank(contractor.corporate_name,   'Razão social')
  requireNonBlank(contractor.trade_name,       'Nome fantasia')
  requireNonBlank(contractor.cnpj,             'CNPJ')
  requireNonBlank(contractor.code,             'Código')
  requireNonBlank(contractor.responsible_name, 'Responsável')
  requireNonBlank(contractor.whatsapp,         'WhatsApp')
  requireNonBlank(contractor.email,            'E-mail')
  requireNonBlank(contractor.notes,            'Observações')

  const { data, error } = await supabase
    .from('contractors')
    .insert(contractor)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Já existe uma contratante com este código ou CNPJ.')
  logActivity({
    entityType: 'contractor',
    entityId: data.id,
    actionType: 'created',
    description: `Contratante "${data.corporate_name}" cadastrada`,
  }).catch(() => {})
  return data
}

export async function updateContractor(id: string, contractor: ContractorUpdate): Promise<Contractor> {
  if (contractor.responsible_name !== undefined) requireNonBlank(contractor.responsible_name, 'Responsável')
  if (contractor.whatsapp         !== undefined) requireNonBlank(contractor.whatsapp,         'WhatsApp')
  if (contractor.email            !== undefined) requireNonBlank(contractor.email,            'E-mail')
  if (contractor.notes            !== undefined) requireNonBlank(contractor.notes,            'Observações')

  const { data, error } = await supabase
    .from('contractors')
    .update(contractor)
    .eq('id', id)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Já existe uma contratante com este código ou CNPJ.')
  logActivity({
    entityType: 'contractor',
    entityId: id,
    actionType: 'updated',
    description: `Contratante "${data.corporate_name}" atualizada`,
  }).catch(() => {})
  return data
}
