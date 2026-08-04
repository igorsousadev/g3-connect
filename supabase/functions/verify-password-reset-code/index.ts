// @ts-nocheck — arquivo Deno; não é verificado pelo tsconfig do projeto Node
//
// Edge Function: verify-password-reset-code
// Recebe e-mail + código, valida hash, expiração e tentativas.
// Se válido, marca request como 'verified' e retorna o request_id
// (usado como token na etapa seguinte).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_ATTEMPTS = 5

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return json({ error: 'Dados incompletos.' })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedCode  = String(code).trim()

    if (!/^\d{6}$/.test(normalizedCode)) {
      return json({ error: 'O código deve conter exatamente 6 dígitos.' })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')              ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Busca request ativo (pending + não expirado) mais recente
    const { data: request } = await supabase
      .from('password_reset_requests')
      .select('id, code_hash, expires_at, attempts, status')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!request) {
      return json({ error: 'Código inválido ou expirado. Solicite um novo código.' })
    }

    // Incrementa tentativas
    const newAttempts   = request.attempts + 1
    const tooManyTries  = newAttempts >= MAX_ATTEMPTS

    await supabase
      .from('password_reset_requests')
      .update({
        attempts: newAttempts,
        status:   tooManyTries ? 'invalidated' : 'pending',
      })
      .eq('id', request.id)
      .eq('status', 'pending') // evita race condition

    if (tooManyTries) {
      return json({
        error: 'Muitas tentativas inválidas. Solicite um novo código.',
      })
    }

    // Compara hash do código fornecido
    const inputHash = await hashCode(normalizedCode)

    if (inputHash !== request.code_hash) {
      const remaining = MAX_ATTEMPTS - newAttempts
      return json({
        error: remaining === 1
          ? 'Código inválido. Última tentativa antes de bloquear.'
          : `Código inválido. ${remaining} tentativas restantes.`,
      })
    }

    // Código correto — marca como verificado
    await supabase
      .from('password_reset_requests')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', request.id)

    // Retorna o request_id como token para a próxima etapa
    return json({ request_id: request.id })
  } catch (err) {
    console.error('[verify-password-reset-code] unexpected error:', err)
    return json({ error: 'Erro ao verificar código. Tente novamente.' })
  }
})
