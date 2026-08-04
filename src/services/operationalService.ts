import { supabase } from '../lib/supabase'
import { computeDocumentStatus, getDaysUntilExpiry } from '../lib/documentUtils'
import type { OperationalItem } from '../types/operational'
import type { DocumentStatus, WorkflowStatus } from '../types/employeeDocument'

const LEGACY_STATUS: Record<string, DocumentStatus> = {
  expiring: 'valid', rejected: 'invalid', submitted: 'pending',
}
const LEGACY_WORKFLOW: Record<string, WorkflowStatus> = {
  submitted: 'analysis', under_review: 'analysis',
  pending_specialist: 'homologation', submitted_to_contractor: 'sent',
}

export async function loadOperationalItems(): Promise<OperationalItem[]> {
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const [problemDocsRes, companyDocsRes, employeesRes, requirementsRes, existingDocsRes, activeContractsRes] = await Promise.all([
    // Docs problemáticos: status crítico ou vencendo em 30 dias
    supabase
      .from('employee_documents')
      .select(`
        id, status, workflow_status, expiration_date, issue_date, external_file_url, notes,
        employee_id, document_type_id,
        employees(full_name, cpf, phone, company_id, role_id,
          companies(id, corporate_name, whatsapp),
          roles(id, name)
        ),
        document_types(id, name)
      `)
      .or([
        // status problemático — novos e antigos (antes da migração)
        'status.in.(pending,invalid,expired,rejected,submitted)',
        // vencendo em 30 dias
        `expiration_date.lte.${thirtyDaysLater}`,
        // workflow ativo — novos e antigos (antes da migração)
        'workflow_status.in.(pending_client,analysis,homologation,sent,approved,rejected,pending_specialist,under_review,submitted,submitted_to_contractor)',
      ].join(',')),

    supabase
      .from('company_documents')
      .select(`
        id, status, workflow_status, expiration_date, issue_date, external_file_url, notes,
        company_id, document_type_id,
        companies(id, corporate_name, whatsapp),
        document_types!inner(id, name, category)
      `)
      .eq('document_types.category', 'Empresa')
      .or([
        'status.in.(pending,invalid,expired,valid)',
        `expiration_date.lte.${thirtyDaysLater}`,
        'workflow_status.in.(pending_client,analysis,homologation,sent,approved,rejected)',
      ].join(',')),

    // Funcionários ativos com cargo (para detectar checklist incompleto)
    supabase
      .from('employees')
      .select(`
        id, full_name, cpf, phone, company_id, role_id,
        companies(id, corporate_name, whatsapp),
        roles(id, name)
      `)
      .not('role_id', 'is', null)
      .eq('status', 'active'),

    // Todos os requisitos de documentos por cargo
    supabase
      .from('role_document_requirements')
      .select('role_id, document_type_id, document_types!inner(id, name, is_company_required)')
      .eq('document_types.is_company_required', false),

    // Pares existentes (employee_id + document_type_id) para lookup rápido
    supabase
      .from('employee_documents')
      .select('employee_id, document_type_id'),

    // Contratos ativos por empresa
    supabase
      .from('company_contractors')
      .select('company_id, contractor_id, contract_sequence, contract_number, contractors(code, trade_name, corporate_name)')
      .eq('status', 'active'),
  ])

  if (problemDocsRes.error) throw problemDocsRes.error
  if (companyDocsRes.error) throw companyDocsRes.error
  if (employeesRes.error) throw employeesRes.error
  if (requirementsRes.error) throw requirementsRes.error
  if (existingDocsRes.error) throw existingDocsRes.error

  type ContractInfo = {
    contractLabel: string; contractorId: string; contractorCode: string
    contractorTradeName: string; contractSearch: string
  }
  const contractsByCompany = new Map<string, ContractInfo>()
  for (const row of (activeContractsRes.data ?? [])) {
    const ct   = row.contractors as any
    const seq  = row.contract_sequence.toString().padStart(4, '0')
    const code = ct?.code ?? ''
    contractsByCompany.set(row.company_id, {
      contractLabel:       `${seq}/${code}`,
      contractorId:        row.contractor_id,
      contractorCode:      code,
      contractorTradeName: ct?.trade_name ?? '',
      contractSearch:      [seq, code, ct?.trade_name ?? '', ct?.corporate_name ?? '', row.contract_number ?? ''].join(' ').toLowerCase(),
    })
  }

  const items: OperationalItem[] = []

  // Processar documentos com problema
  for (const doc of (problemDocsRes.data ?? [])) {
    const emp = doc.employees as any
    const dt  = doc.document_types as any
    const company  = emp?.companies
    const role     = emp?.roles
    const contract = contractsByCompany.get(emp?.company_id ?? '')

    const rawStatus   = (LEGACY_STATUS[doc.status] ?? doc.status) as DocumentStatus
    const computedStatus = computeDocumentStatus(doc.expiration_date, rawStatus)
    const daysLeft = getDaysUntilExpiry(doc.expiration_date)
    const rawWf = doc.workflow_status as string | null
    const mappedWf = rawWf ? ((LEGACY_WORKFLOW[rawWf] ?? rawWf) as WorkflowStatus) : null

    items.push({
      source: 'employee',
      docId: doc.id,
      status: computedStatus,
      workflowStatus: mappedWf,
      expirationDate: doc.expiration_date,
      issueDate: doc.issue_date,
      daysUntilExpiry: daysLeft,
      externalFileUrl: doc.external_file_url,
      notes: doc.notes,
      documentTypeId: doc.document_type_id,
      documentTypeName: dt?.name ?? '—',
      employeeId: doc.employee_id,
      employeeName: emp?.full_name ?? '—',
      employeeCpf: emp?.cpf ?? '',
      employeePhone: emp?.phone ?? null,
      roleId: emp?.role_id ?? null,
      roleName: role?.name ?? null,
      companyId: emp?.company_id ?? '',
      companyName: company?.corporate_name ?? '—',
      companyWhatsapp: company?.whatsapp ?? null,
      contractLabel:       contract?.contractLabel       ?? null,
      contractorId:        contract?.contractorId        ?? null,
      contractorCode:      contract?.contractorCode      ?? null,
      contractorTradeName: contract?.contractorTradeName ?? null,
      contractSearch:      contract?.contractSearch      ?? null,
      isMissing: false,
      updatedAt: null,
    })
  }

  // Processar documentos corporativos da empresa
  for (const doc of (companyDocsRes.data ?? [])) {
    const dt       = doc.document_types as any
    const company  = doc.companies as any
    const contract = contractsByCompany.get(doc.company_id)

    const rawStatus = (LEGACY_STATUS[doc.status] ?? doc.status) as DocumentStatus
    const computedStatus = computeDocumentStatus(doc.expiration_date, rawStatus)
    const daysLeft = getDaysUntilExpiry(doc.expiration_date)
    const rawWf = doc.workflow_status as string | null
    const mappedWf = rawWf
      ? ((LEGACY_WORKFLOW[rawWf] ?? rawWf) as WorkflowStatus)
      : 'pending_client'

    items.push({
      source: 'company',
      docId: doc.id,
      status: computedStatus,
      workflowStatus: mappedWf,
      expirationDate: doc.expiration_date,
      issueDate: doc.issue_date,
      daysUntilExpiry: daysLeft,
      externalFileUrl: doc.external_file_url,
      notes: doc.notes,
      documentTypeId: doc.document_type_id,
      documentTypeName: dt?.name ?? '—',
      employeeId: '',
      employeeName: 'Documento da empresa',
      employeeCpf: '',
      employeePhone: null,
      roleId: null,
      roleName: null,
      companyId: doc.company_id,
      companyName: company?.corporate_name ?? '—',
      companyWhatsapp: company?.whatsapp ?? null,
      contractLabel:       contract?.contractLabel       ?? null,
      contractorId:        contract?.contractorId        ?? null,
      contractorCode:      contract?.contractorCode      ?? null,
      contractorTradeName: contract?.contractorTradeName ?? null,
      contractSearch:      contract?.contractSearch      ?? null,
      isMissing: false,
      updatedAt: null,
    })
  }

  // Conjunto de pares existentes para evitar duplicatas
  const existingSet = new Set(
    (existingDocsRes.data ?? []).map(e => `${e.employee_id}:${e.document_type_id}`)
  )

  // Mapa de requisitos por cargo
  const requirementsByRole = new Map<string, Array<{ document_type_id: string; name: string }>>()
  for (const req of (requirementsRes.data ?? [])) {
    if (!requirementsByRole.has(req.role_id)) requirementsByRole.set(req.role_id, [])
    requirementsByRole.get(req.role_id)!.push({
      document_type_id: req.document_type_id,
      name: (req.document_types as any)?.name ?? '—',
    })
  }

  // Detectar documentos obrigatórios não enviados (checklist incompleto)
  for (const emp of (employeesRes.data ?? [])) {
    const role     = emp.roles     as any
    const company  = emp.companies as any
    const contract = contractsByCompany.get(emp.company_id)
    const requirements = requirementsByRole.get(emp.role_id!) ?? []

    for (const req of requirements) {
      const key = `${emp.id}:${req.document_type_id}`
      if (!existingSet.has(key)) {
        items.push({
          source: 'employee',
          docId: null,
          status: 'missing',
          workflowStatus: 'pending_client',
          expirationDate: null,
          issueDate: null,
          daysUntilExpiry: null,
          externalFileUrl: null,
          notes: null,
          documentTypeId: req.document_type_id,
          documentTypeName: req.name,
          employeeId: emp.id,
          employeeName: emp.full_name,
          employeeCpf: emp.cpf,
          employeePhone: emp.phone,
          roleId: emp.role_id,
          roleName: role?.name ?? null,
          companyId: emp.company_id,
          companyName: company?.corporate_name ?? '—',
          companyWhatsapp: company?.whatsapp ?? null,
          contractLabel:       contract?.contractLabel       ?? null,
          contractorId:        contract?.contractorId        ?? null,
          contractorCode:      contract?.contractorCode      ?? null,
          contractorTradeName: contract?.contractorTradeName ?? null,
          contractSearch:      contract?.contractSearch      ?? null,
          isMissing: true,
          updatedAt: null,
        })
      }
    }
  }

  return items
}

export function buildWhatsAppLink(
  phone: string | null,
  employeeName: string,
): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  const number = digits.length >= 12 ? digits : `55${digits}`
  const message = `Olá ${employeeName}, identificamos documentos pendentes no processo de homologação. Poderia nos enviar os documentos atualizados? Obrigado.`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
