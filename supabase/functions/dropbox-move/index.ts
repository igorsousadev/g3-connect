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

    const { from_path, to_path } = await req.json()
    if (!from_path) return json({ error: 'Parâmetro "from_path" ausente.' })
    if (!to_path)   return json({ error: 'Parâmetro "to_path" ausente.' })

    const token      = await getDropboxToken()
    const rootFolder = (Deno.env.get('DROPBOX_ROOT_FOLDER') ?? '/G3Connect').replace(/\/$/, '')

    const fullFrom = from_path.startsWith(rootFolder) ? from_path : `${rootFolder}${from_path}`
    const fullTo   = to_path.startsWith(rootFolder)   ? to_path   : `${rootFolder}${to_path}`

    const moveRes = await fetch('https://api.dropboxapi.com/2/files/move_v2', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from_path: fullFrom, to_path: fullTo, autorename: false }),
    })

    const moveData = await moveRes.json()
    if (!moveRes.ok) return json({ error: moveData.error_summary ?? 'Erro ao mover arquivo.' })

    return json({ moved: true, new_path: moveData.metadata?.path_display ?? fullTo })
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
