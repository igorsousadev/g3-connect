// @ts-nocheck — arquivo Deno; não é verificado pelo tsconfig do projeto Node
//
// Edge Function: confirm-new-password
// Recebe request_id (token gerado após verificação do código) + nova senha.
// Atualiza a senha via Supabase Admin API, marca request como 'used'
// e limpa password_reset_pending no perfil.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Janela de validade após verificação do código (em minutos)
const VERIFIED_WINDOW_MINUTES = 10

const MIN_PASSWORD_LENGTH = 8

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { request_id, new_password } = await req.json()

    if (!request_id || !new_password) {
      return json({ error: 'Dados incompletos.' })
    }

    if (typeof new_password !== 'string' || new_password.length < MIN_PASSWORD_LENGTH) {
      return json({ error: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')              ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Busca request verificado dentro da janela de validade
    const windowStart = new Date(
      Date.now() - VERIFIED_WINDOW_MINUTES * 60 * 1_000,
    ).toISOString()

    const { data: request } = await supabase
      .from('password_reset_requests')
      .select('id, user_id, verified_at, status')
      .eq('id', request_id)
      .eq('status', 'verified')
      .gt('verified_at', windowStart)
      .maybeSingle()

    if (!request) {
      return json({
        error: 'Sessão expirada ou inválida. Inicie o processo de recuperação novamente.',
      })
    }

    // Atualiza senha via Admin API (service role)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      request.user_id,
      { password: new_password },
    )

    if (updateError) {
      console.error('[confirm-new-password] updateUserById error:', updateError)
      return json({ error: 'Erro ao atualizar senha. Tente novamente.' })
    }

    // Marca request como usado
    await supabase
      .from('password_reset_requests')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('id', request.id)

    // Remove flag de recuperação pendente no perfil
    await supabase
      .from('profiles')
      .update({ password_reset_pending: false })
      .eq('id', request.user_id)

    return json({ success: true })
  } catch (err) {
    console.error('[confirm-new-password] unexpected error:', err)
    return json({ error: 'Erro ao processar. Tente novamente.' })
  }
})
