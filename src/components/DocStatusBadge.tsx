import type { DocumentStatus, WorkflowStatus } from '../types/employeeDocument'
import { DOCUMENT_STATUS_LABELS, WORKFLOW_STATUS_LABELS } from '../types/employeeDocument'

const docConfig: Record<DocumentStatus, string> = {
  pending: 'doc-badge doc-badge--pending',
  invalid: 'doc-badge doc-badge--invalid',
  valid:   'doc-badge doc-badge--valid',
  expired: 'doc-badge doc-badge--expired',
}

const wfConfig: Record<WorkflowStatus, string> = {
  pending_client: 'wf-badge wf-badge--client',
  analysis:       'wf-badge wf-badge--analysis',
  homologation:   'wf-badge wf-badge--homologation',
  sent:           'wf-badge wf-badge--sent',
  approved:       'wf-badge wf-badge--approved',
  rejected:       'wf-badge wf-badge--rejected',
}

export function DocStatusBadge({ status }: { status: DocumentStatus }) {
  const className = docConfig[status] ?? 'doc-badge doc-badge--pending'
  const label     = DOCUMENT_STATUS_LABELS[status] ?? status
  return <span className={className}>{label}</span>
}

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const className = wfConfig[status] ?? 'wf-badge wf-badge--client'
  return <span className={className}>{WORKFLOW_STATUS_LABELS[status] ?? status}</span>
}
