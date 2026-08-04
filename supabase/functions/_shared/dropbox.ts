// @ts-nocheck — arquivo Deno; não é verificado pelo tsconfig do projeto Node

/**
 * Obtém um access token do Dropbox usando refresh token (OAuth2 offline access).
 * Requer os secrets: DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN.
 */
export async function getDropboxToken(): Promise<string> {
  const appKey       = Deno.env.get('DROPBOX_APP_KEY')
  const appSecret    = Deno.env.get('DROPBOX_APP_SECRET')
  const refreshToken = Deno.env.get('DROPBOX_REFRESH_TOKEN')

  if (!appKey)       throw new Error('DROPBOX_APP_KEY ausente')
  if (!appSecret)    throw new Error('DROPBOX_APP_SECRET ausente')
  if (!refreshToken) throw new Error('DROPBOX_REFRESH_TOKEN ausente')

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     appKey,
      client_secret: appSecret,
    }),
  })

  const data = await res.json()

  if (!res.ok || !data.access_token) {
    throw new Error('Erro ao obter token do Dropbox.')
  }

  return data.access_token
}
