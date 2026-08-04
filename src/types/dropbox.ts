export interface DropboxUploadParams {
  file: File
  /** Path relativo sem a pasta raiz (ex: /companies/abc/employees/def/documents/ghi/arquivo.pdf) */
  path: string
}

export interface DropboxUploadResult {
  dropbox_path: string
  /** URL externa para armazenar em external_file_url. Null nesta versão — gerado sob demanda via getTemporaryDownloadLink. */
  external_file_url: null
  file_name: string
  mime_type: string
  file_size: number
  uploaded_at: string
}

export interface DropboxFileMetadata {
  '.tag': 'file' | 'folder'
  name: string
  path_lower: string
  path_display: string
  size?: number
  client_modified?: string
  server_modified?: string
}

export interface DropboxListResult {
  entries: DropboxFileMetadata[]
  cursor: string
  has_more: boolean
}

export interface DropboxDownloadLinkResult {
  link: string
  metadata: DropboxFileMetadata
}
