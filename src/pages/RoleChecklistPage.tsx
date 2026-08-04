import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listRoles } from '../services/roleService'
import { listRoleRequirementDocumentTypes } from '../services/documentTypeService'
import {
  listRequirementsByRole,
  addRequirement,
  removeRequirement,
} from '../services/roleDocumentRequirementService'
import type { Role } from '../types/role'
import type { DocumentType } from '../types/documentType'
import type { RequirementWithDocumentType } from '../types/roleDocumentRequirement'

export function RoleChecklistPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [roles, setRoles] = useState<Role[]>([])
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [requirements, setRequirements] = useState<RequirementWithDocumentType[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState(searchParams.get('cargo') ?? '')
  const [addingDocId, setAddingDocId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listRoles().then(setRoles).catch(() => {})
    listRoleRequirementDocumentTypes().then(setDocumentTypes).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedRoleId) { setRequirements([]); return }
    setLoading(true)
    setError('')
    listRequirementsByRole(selectedRoleId)
      .then(setRequirements)
      .catch(() => setError('Erro ao carregar checklist.'))
      .finally(() => setLoading(false))
  }, [selectedRoleId])

  function handleRoleChange(id: string) {
    setSelectedRoleId(id)
    setAddingDocId('')
    if (id) setSearchParams({ cargo: id })
    else setSearchParams({})
  }

  async function handleAdd() {
    if (!addingDocId || !selectedRoleId) return
    setError('')
    try {
      await addRequirement(selectedRoleId, addingDocId)
      setAddingDocId('')
      const updated = await listRequirementsByRole(selectedRoleId)
      setRequirements(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar documento.')
    }
  }

  async function handleRemove(reqId: string) {
    setError('')
    try {
      await removeRequirement(reqId)
      setRequirements(prev => prev.filter(r => r.id !== reqId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover documento.')
    }
  }

  const linkedIds = new Set(requirements.map(r => r.document_type_id))
  const availableDocs = documentTypes.filter(dt => dt.is_active && !linkedIds.has(dt.id))
  const selectedRole = roles.find(r => r.id === selectedRoleId)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Checklist por Cargo</h1>
        <p className="page-subtitle">Defina os documentos obrigatórios para cada cargo</p>
      </div>

      <div className="form-card form-card--wide">
        <div className="form-group">
          <label className="form-label" htmlFor="role-select">Selecione um cargo</label>
          <select
            id="role-select"
            className="form-input form-select"
            value={selectedRoleId}
            onChange={e => handleRoleChange(e.target.value)}
          >
            <option value="">Selecione um cargo para ver o checklist</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}{!r.is_active ? ' (inativo)' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedRoleId && (
          <>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="checklist-header">
              <span className="checklist-title">
                Documentos exigidos para <strong>{selectedRole?.name}</strong>
              </span>
              <span className="badge badge--pending">{requirements.length} doc{requirements.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <div className="spinner" />
              </div>
            ) : requirements.length === 0 ? (
              <div className="checklist-empty">Nenhum documento vinculado a este cargo ainda.</div>
            ) : (
              <ul className="checklist-list">
                {requirements.map(req => (
                  <li key={req.id} className="checklist-item">
                    <div className="checklist-item-info">
                      <span className="checklist-item-name">{req.document_types.name}</span>
                      <span className="checklist-item-meta">
                        {req.document_types.category && <span className="checklist-item-category">{req.document_types.category}</span>}
                        {req.document_types.default_validity_days
                          ? `Validade: ${req.document_types.default_validity_days} dias`
                          : 'Sem validade definida'}
                        {req.document_types.is_required && ' · Obrigatório'}
                      </span>
                    </div>
                    <button
                      className="btn-icon btn-icon--danger"
                      onClick={() => handleRemove(req.id)}
                      title="Remover"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {availableDocs.length > 0 && (
              <div className="checklist-add">
                <select
                  className="form-input form-select"
                  value={addingDocId}
                  onChange={e => setAddingDocId(e.target.value)}
                >
                  <option value="">Selecione um documento para adicionar...</option>
                  {availableDocs.map(dt => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}{dt.category ? ` (${dt.category})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  onClick={handleAdd}
                  disabled={!addingDocId}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Adicionar
                </button>
              </div>
            )}

            {availableDocs.length === 0 && requirements.length > 0 && (
              <p className="checklist-complete">Todos os documentos ativos já estão vinculados a este cargo.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
