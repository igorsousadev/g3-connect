export function getFileNameFromPath(pathOrUrl: string): string {
  const clean = pathOrUrl.split('?')[0].split('#')[0]
  const parts = clean.split('/')
  return decodeURIComponent(parts[parts.length - 1] || 'arquivo')
}

export function getOriginalFileName(fileName: string): string {
  const name = getFileNameFromPath(fileName)
  const withoutTechnicalPrefix = name.replace(
    /^\d{8}[_-]\d{6}[_-][a-z0-9]{4,}[_-](.+)$/i,
    '$1',
  )
  return withoutTechnicalPrefix || name
}
