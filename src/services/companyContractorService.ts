import { supabase } from '../lib/supabase'
import { parseSupabaseError } from '../lib/errors'
import { logActivity } from './activityLogService'
import type {
  CompanyContractor,
  CompanyContractorInsert,
  CompanyContractorUpdate,
} from '../types/companyContractor'

const SELECT_WITH_JOINS = '*, contractors(id, corporate_name, trade_name, code), segments(id, name)'

// Garante que a empresa não tenha outro vínculo ativo antes de criar/ativar um novo.
async function assertSingleActiveContractor(companyId: string, excludeId?: string): Promise<void> {
  let query = supabase
    .from('company_contractors')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'active')
  if (excludeId) query = query.neq('id', excludeId)
  const { data } = await query.limit(1).maybeSingle()
  if (data) {
    throw new Error('Esta empresa já possui uma contratante ativa. Inative o vínculo atual antes de ativar outro.')
  }
}

export interface ActiveContractEntry {
  label:  string  // exibição: "0001/CBH"
  search: string  // busca (minúsculas): sequência + código + nome fantasia + número completo
}

// Retorna map de company_id → ActiveContractEntry para todos os vínculos ativos.
export async function listActiveContractLabelsByCompany(): Promise<Record<string, ActiveContractEntry>> {
  const { data } = await supabase
    .from('company_contractors')
    .select('company_id, contract_sequence, contract_number, contractors(code, trade_name)')
    .eq('status', 'active')
  const map: Record<string, ActiveContractEntry> = {}
  for (const row of (data ?? [])) {
    const ct   = row.contractors as unknown as { code: string; trade_name: string } | null
    const code = ct?.code ?? ''
    const seq  = row.contract_sequence.toString().padStart(4, '0')
    map[row.company_id] = {
      label:  `${seq}/${code}`,
      search: [seq, code, ct?.trade_name ?? '', row.contract_number ?? ''].join(' ').toLowerCase(),
    }
  }
  return map
}

export async function getNextContractorSequence(contractorId: string): Promise<number> {
  const { data } = await supabase
    .from('company_contractors')
    .select('contract_sequence')
    .eq('contractor_id', contractorId)
    .order('contract_sequence', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.contract_sequence ?? 0) + 1
}

export async function listCompanyContractors(companyId: string): Promise<CompanyContractor[]> {
  const { data, error } = await supabase
    .from('company_contractors')
    .select(SELECT_WITH_JOINS)
    .eq('company_id', companyId)
    .order('status')             // 'active' < 'inactive' — vínculo ativo aparece primeiro
    .order('contract_sequence')
  if (error) throw error
  return data
}

export async function createCompanyContractor(
  companyId: string,
  contractorId: string,
  segmentId: string,
  companyCorporateName: string,
  contractorCode: string,
  notes: string,
): Promise<CompanyContractor> {
  await assertSingleActiveContractor(companyId)

  const { data: maxData } = await supabase
    .from('company_contractors')
    .select('contract_sequence')
    .eq('contractor_id', contractorId)
    .order('contract_sequence', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSeq = (maxData?.contract_sequence ?? 0) + 1
  const contractNumber = `${nextSeq.toString().padStart(4, '0')}/${contractorCode} - ${companyCorporateName.toUpperCase()}`

  const payload: CompanyContractorInsert = {
    company_id:        companyId,
    contractor_id:     contractorId,
    segment_id:        segmentId,
    contract_sequence: nextSeq,
    contract_number:   contractNumber,
    status:            'active',
    notes,
  }

  const { data, error } = await supabase
    .from('company_contractors')
    .insert(payload)
    .select(SELECT_WITH_JOINS)
    .single()

  if (error) throw parseSupabaseError(error, 'Erro ao vincular contratante. Verifique se já existe um vínculo com esta contratante.')

  logActivity({
    entityType: 'company',
    entityId:   companyId,
    actionType: 'updated',
    description: `Vínculo com contratante "${data.contractors?.trade_name ?? contractorCode}" criado — Contrato: ${contractNumber}`,
  }).catch(() => {})

  return data
}

export async function inactivateCompanyContractor(
  id: string,
  companyId: string,
  contractorName: string,
  reason?: string,
): Promise<CompanyContractor> {
  const { data, error } = await supabase
    .from('company_contractors')
    .update({
      status:              'inactive',
      inactivated_at:      new Date().toISOString(),
      inactivation_reason: reason?.trim() || null,
    })
    .eq('id', id)
    .select(SELECT_WITH_JOINS)
    .single()

  if (error) throw parseSupabaseError(error, 'Erro ao inativar contrato.')

  logActivity({
    entityType: 'company',
    entityId:   companyId,
    actionType: 'updated',
    description: `Contrato "${data.contract_number}" inativado com contratante "${contractorName}"${reason?.trim() ? ` — Motivo: ${reason.trim()}` : ''}`,
  }).catch(() => {})

  return data
}

export async function updateCompanyContractor(
  id: string,
  companyId: string,
  contractorName: string,
  updates: CompanyContractorUpdate,
): Promise<CompanyContractor> {
  if (updates.status === 'active') {
    await assertSingleActiveContractor(companyId, id)
  }

  const { data, error } = await supabase
    .from('company_contractors')
    .update(updates)
    .eq('id', id)
    .select(SELECT_WITH_JOINS)
    .single()

  if (error) throw parseSupabaseError(error, 'Erro ao atualizar vínculo com contratante.')

  logActivity({
    entityType: 'company',
    entityId:   companyId,
    actionType: 'updated',
    description: `Vínculo com "${contractorName}" atualizado`,
  }).catch(() => {})

  return data
}
