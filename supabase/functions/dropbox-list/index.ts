// @ts-nocheck — arquivo Deno; não é verificado pelo tsconfig do projeto Node
// Ações suportadas via parâmetro "action": "list" (padrão) | "create"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getDropboxToken } from '../_shared/dropbox.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado.' })

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) return json({ error: 'Não autorizado.' })

    const { path, action = 'list' } = await req.json()
    if (!path) return json({ error: 'Parâmetro "path" ausente.' })

    const token      = await getDropboxToken()
    const rootFolder = (Deno.env.get('DROPBOX_ROOT_FOLDER') ?? '/G3Connect').replace(/\/$/, '')
    const fullPath   = path.startsWith(rootFolder) ? path : `${rootFolder}${path}`

    if (action === 'create') {
      const createRes = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: fullPath, autorename: false }),
      })
      const createData = await createRes.json()

      // Ignorar erro de pasta já existente (path/conflict/folder)
      if (!createRes.ok && !createData.error_summary?.includes('path/conflict')) {
        return json({ error: createData.error_summary ?? 'Erro ao criar pasta.' })
      }

      return json({ created: true, path: fullPath })
    }

    // action === 'list'
    const listRes = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: fullPath, recursive: false }),
    })
    const listData = await listRes.json()
    if (!listRes.ok) return json({ error: listData.error_summary ?? 'Erro ao listar pasta.' })

    return json({
      entries:  listData.entries,
      cursor:   listData.cursor,
      has_more: listData.has_more,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erro interno do servidor.' })
  }
})

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
