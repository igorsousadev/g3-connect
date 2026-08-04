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

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado.' })

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) return json({ error: 'Não autorizado.' })

    // Receber FormData com o arquivo e o path de destino
    const formData   = await req.formData()
    const file       = formData.get('file')
    const targetPath = formData.get('path')

    if (!file || typeof file === 'string') return json({ error: 'Parâmetro "file" inválido ou ausente.' })
    if (!targetPath || typeof targetPath !== 'string') return json({ error: 'Parâmetro "path" ausente.' })

    const token      = await getDropboxToken()
    const rootFolder = (Deno.env.get('DROPBOX_ROOT_FOLDER') ?? '/G3Connect').replace(/\/$/, '')
    const fullPath   = `${rootFolder}${targetPath}`

    const fileBuffer = await (file as File).arrayBuffer()

    const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization:     `Bearer ${token}`,
        'Content-Type':    'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path:        fullPath,
          mode:        'overwrite',
          autorename:  false,
          mute:        false,
        }),
      },
      body: fileBuffer,
    })

    const uploadData = await uploadRes.json()
    if (!uploadRes.ok) return json({ error: uploadData.error_summary ?? 'Erro ao enviar arquivo para o Dropbox.' })

    return json({
      dropbox_path:      uploadData.path_display,
      external_file_url: null,
      file_name:         uploadData.name,
      mime_type:         (file as File).type,
      file_size:         uploadData.size,
      uploaded_at:       new Date().toISOString(),
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
