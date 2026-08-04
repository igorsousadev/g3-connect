// @ts-nocheck — arquivo Deno; não é verificado pelo tsconfig do projeto Node
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

    const { path } = await req.json()
    if (!path) return json({ error: 'Parâmetro "path" ausente.' })

    const token      = await getDropboxToken()
    const rootFolder = (Deno.env.get('DROPBOX_ROOT_FOLDER') ?? '/G3Connect').replace(/\/$/, '')
    const fullPath   = path.startsWith(rootFolder) ? path : `${rootFolder}${path}`

    const deleteRes = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: fullPath }),
    })

    const deleteData = await deleteRes.json()
    if (!deleteRes.ok) return json({ error: deleteData.error_summary ?? 'Erro ao excluir arquivo.' })

    return json({ deleted: true, path: deleteData.metadata?.path_display ?? fullPath })
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
