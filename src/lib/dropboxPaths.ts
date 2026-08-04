/**
 * Sanitiza um segmento de path para uso no Dropbox.
 * Remove acentos, espaços e caracteres especiais, resultando em slug seguro.
 * Exemplo: "NR10 Básico" → "nr10-basico"
 */
export function sanitizeDropboxPathSegment(segment: string): string {
  const result = segment
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return result || 'doc'
}

/** Sanitiza o nome do arquivo preservando a extensão. */
function sanitizeFileBaseName(name: string): string {
  const lastDot = name.lastIndexOf('.')
  const base    = lastDot > 0 ? name.slice(0, lastDot) : name
  const ext     = lastDot > 0 ? name.slice(lastDot)    : ''
  return (sanitizeDropboxPathSegment(base) || 'arquivo') + ext.toLowerCase()
}

/**
 * Gera nome de arquivo único com timestamp, identificador aleatório e nome sanitizado.
 * Evita sobrescrita e garante unicidade mesmo para uploads simultâneos.
 * Exemplo: "20260516_183001_a8f3_nr10.pdf"
 */
export function generateDropboxFileName(originalName: string): string {
  const now  = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')   // "20260516"
  const time = now.toISOString().slice(11, 19).replace(/:/g, '')  // "183001"
  const rand = Math.random().toString(36).slice(2, 6)             // "a8f3"
  const safe = sanitizeFileBaseName(originalName).slice(0, 60)
  return `${date}_${time}_${rand}_${safe}`
}

/** Extrai o ano de uma data ISO "YYYY-MM-DD" ou retorna o ano corrente. */
function yearOf(isoDate?: string | null): string {
  if (isoDate) {
    const y = parseInt(isoDate.slice(0, 4), 10)
    if (y > 2000 && y < 2100) return String(y)
  }
  return String(new Date().getFullYear())
}

// ─── Helpers principais ───────────────────────────────────────────────────────

/**
 * Path para documento de funcionário:
 * /companies/{companyId}/employees/{employeeId}/documents/{slug}/{year}/{arquivo}
 *
 * @param documentTypeSlug  Slug do tipo documental ou ID como fallback (ex: "nr10", "aso")
 * @param issueDate         Data de emissão "YYYY-MM-DD" — define a subpasta do ano
 */
export function buildEmployeeDocumentDropboxPath(params: {
  companyId: string
  employeeId: string
  documentTypeSlug: string
  fileName: string
  issueDate?: string | null
}): string {
  const { companyId, employeeId, documentTypeSlug, fileName, issueDate } = params
  const slug = sanitizeDropboxPathSegment(documentTypeSlug)
  const year = yearOf(issueDate)
  return `/companies/${companyId}/employees/${employeeId}/documents/${slug}/${year}/${generateDropboxFileName(fileName)}`
}

/**
 * Path para documento da empresa:
 * /companies/{companyId}/company-documents/{slug}/{year}/{arquivo}
 *
 * @param documentTypeSlug  Slug do tipo documental ou ID como fallback
 * @param issueDate         Data de emissão "YYYY-MM-DD" — define a subpasta do ano
 */
export function buildCompanyDocumentDropboxPath(params: {
  companyId: string
  documentTypeSlug: string
  fileName: string
  issueDate?: string | null
}): string {
  const { companyId, documentTypeSlug, fileName, issueDate } = params
  const slug = sanitizeDropboxPathSegment(documentTypeSlug)
  const year = yearOf(issueDate)
  return `/companies/${companyId}/company-documents/${slug}/${year}/${generateDropboxFileName(fileName)}`
}

// ─── Funções legadas — mantidas para compatibilidade com arquivos já enviados ─

/** @deprecated Use buildEmployeeDocumentDropboxPath */
export function buildEmployeeDocumentPath(params: {
  companyId: string
  employeeId: string
  documentTypeId: string
  fileName: string
}): string {
  const { companyId, employeeId, documentTypeId, fileName } = params
  return `/companies/${companyId}/employees/${employeeId}/documents/${documentTypeId}/${_legacySanitize(fileName)}`
}

/** @deprecated Use buildCompanyDocumentDropboxPath */
export function buildCompanyDocumentPath(params: {
  companyId: string
  documentTypeId: string
  fileName: string
}): string {
  const { companyId, documentTypeId, fileName } = params
  return `/companies/${companyId}/company-documents/${documentTypeId}/${_legacySanitize(fileName)}`
}

function _legacySanitize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}
