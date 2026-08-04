import { downloadFileFromDropbox } from '../services/dropboxService'
import { downloadFileFromDropboxWithOriginalName } from '../services/dropboxService'
import { getOriginalFileName } from './fileNameUtils'

/**
 * Resolve a URL de visualização de um arquivo de documento.
 *
 * - Path Dropbox (começa com "/"): gera link temporário via Edge Function (válido por 4 horas).
 * - Link externo (http/https): retorna diretamente.
 * - Nulo ou vazio: retorna null.
 */
export async function resolveDocumentFileUrl(fileRef: string | null): Promise<string | null> {
  if (!fileRef) return null
  if (fileRef.startsWith('/')) {
    return await downloadFileFromDropbox(fileRef)
  }
  return fileRef
}

export async function downloadDocumentFile(fileRef: string | null): Promise<void> {
  if (!fileRef) return
  if (fileRef.startsWith('/')) {
    await downloadFileFromDropboxWithOriginalName(fileRef)
    return
  }

  const link = document.createElement('a')
  link.href = fileRef
  link.download = getOriginalFileName(fileRef)
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
