import { supabase } from '../lib/supabase'
import { getOriginalFileName } from '../lib/fileNameUtils'
import type {
  DropboxUploadParams,
  DropboxUploadResult,
  DropboxDownloadLinkResult,
  DropboxListResult,
} from '../types/dropbox'

function throwIfError(data: Record<string, unknown> | null, error: unknown): void {
  if (error) throw new Error((error as Error).message ?? 'Erro ao chamar serviço Dropbox.')
  if (data?.error) throw new Error(data.error as string)
}

/** Faz upload de um arquivo para o Dropbox via Edge Function segura. */
export async function uploadFileToDropbox(params: DropboxUploadParams): Promise<DropboxUploadResult> {
  const formData = new FormData()
  formData.append('file', params.file)
  formData.append('path', params.path)

  const { data, error } = await supabase.functions.invoke('dropbox-upload', { body: formData })
  throwIfError(data, error)
  return data as DropboxUploadResult
}

/** Obtém um link temporário (válido por 4 horas) para visualizar ou baixar o arquivo. */
export async function getTemporaryDownloadLink(path: string): Promise<DropboxDownloadLinkResult> {
  const { data, error } = await supabase.functions.invoke('dropbox-download-link', {
    body: { path },
  })
  throwIfError(data, error)
  return data as DropboxDownloadLinkResult
}

/**
 * Retorna apenas a URL temporária para uso direto (abrir em nova aba, src de iframe etc).
 * Internamente chama getTemporaryDownloadLink.
 */
export async function downloadFileFromDropbox(path: string): Promise<string> {
  const result = await getTemporaryDownloadLink(path)
  return result.link
}

export async function downloadFileFromDropboxWithOriginalName(path: string): Promise<void> {
  const result = await getTemporaryDownloadLink(path)
  const fileName = getOriginalFileName(result.metadata?.name ?? path)

  try {
    const response = await fetch(result.link)
    if (!response.ok) throw new Error('Erro ao baixar arquivo.')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch {
    const link = document.createElement('a')
    link.href = result.link
    link.download = fileName
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}

/** Lista o conteúdo de uma pasta no Dropbox. */
export async function listDropboxFolder(path: string): Promise<DropboxListResult> {
  const { data, error } = await supabase.functions.invoke('dropbox-list', {
    body: { path, action: 'list' },
  })
  throwIfError(data, error)
  return data as DropboxListResult
}

/** Cria uma pasta no Dropbox (não falha se já existir). */
export async function createDropboxFolder(path: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('dropbox-list', {
    body: { path, action: 'create' },
  })
  throwIfError(data, error)
}

/** Remove um arquivo do Dropbox. */
export async function deleteDropboxFile(path: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('dropbox-delete', {
    body: { path },
  })
  throwIfError(data, error)
}

/** Move ou renomeia um arquivo no Dropbox. */
export async function moveDropboxFile(fromPath: string, toPath: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('dropbox-move', {
    body: { from_path: fromPath, to_path: toPath },
  })
  throwIfError(data, error)
}
