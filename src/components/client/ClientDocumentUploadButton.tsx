import { useRef, useState } from 'react'
import { useClientContext } from '../../contexts/ClientContext'
import { uploadClientEmployeeDoc, uploadClientCompanyDoc } from '../../services/clientPortalService'

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

interface Props {
  scope?: 'employee' | 'company'
  employeeId?: string
  documentId: string | null
  documentName: string
  workflowStatus?: string | null
  issueDate?: string | null
  hasFile?: boolean
  className?: string
  label?: string
  replaceLabel?: string
  onSuccess?: () => void
}

export function ClientDocumentUploadButton({
  scope = 'employee',
  employeeId,
  documentId,
  documentName,
  workflowStatus = null,
  issueDate = null,
  hasFile = false,
  className = 'client-doc-upload-btn',
  label = 'Anexar documento',
  replaceLabel = 'Substituir arquivo',
  onSuccess,
}: Props) {
  const { companyId } = useClientContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDisabled = !documentId || uploading || (scope === 'employee' && !employeeId)

  function openFilePicker() {
    if (isDisabled) return
    setError(null)
    inputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''

    if (!file || !documentId) return

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Apenas PDF, PNG, JPG ou WEBP são aceitos.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      if (scope === 'company') {
        await uploadClientCompanyDoc({
          docId: documentId,
          companyId,
          file,
          documentTypeName: documentName,
          workflowStatus,
          issueDate,
        })
      } else {
        await uploadClientEmployeeDoc({
          docId: documentId,
          employeeId: employeeId ?? '',
          companyId,
          file,
          documentTypeName: documentName,
          workflowStatus,
          issueDate,
        })
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {error && <span className="client-doc-upload-error">{error}</span>}
      <button
        type="button"
        className={className}
        disabled={isDisabled}
        onClick={openFilePicker}
      >
        {uploading ? 'Enviando...' : hasFile ? replaceLabel : label}
      </button>
    </>
  )
}
