import type { EntityStatus } from '../types/common'

const config: Record<EntityStatus, { label: string; className: string }> = {
  active:   { label: 'Ativo',    className: 'badge badge--active'   },
  pending:  { label: 'Pendente', className: 'badge badge--pending'  },
  inactive: { label: 'Inativo',  className: 'badge badge--inactive' },
}

interface StatusBadgeProps {
  status: EntityStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = config[status] ?? config.pending
  return <span className={className}>{label}</span>
}
