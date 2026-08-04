// @ts-nocheck — arquivo Deno; não é verificado pelo tsconfig do projeto Node
//
// Edge Function: request-password-reset
// Recebe e-mail, gera código de 6 dígitos, salva hash, envia e-mail.
// Sempre retorna HTTP 200 com mensagem genérica — nunca revela se o e-mail existe.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPasswordResetEmail } from '../_shared/mail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GENERIC_MESSAGE =
  'Se o e-mail estiver cadastrado, você receberá as instruções em breve.'

const CODE_EXPIRY_MINUTES = 15

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function generateCode(): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return String(buf[0] % 1_000_000).padStart(6, '0')
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
    const { email } = await req.json()

    // Validação mínima — sem revelar o motivo de rejeição ao cliente
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return json({ message: GENERIC_MESSAGE })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')        ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Busca usuário pela tabela profiles (possui coluna email)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!profile) {
      // E-mail não cadastrado — retorna mensagem genérica sem revelar
      return json({ message: GENERIC_MESSAGE })
    }

    const userId = profile.id

    // Invalida requests pendentes anteriores para o mesmo usuário
    await supabase
      .from('password_reset_requests')
      .update({ status: 'invalidated' })
      .eq('user_id', userId)
      .eq('status', 'pending')

    // Gera código e salva hash
    const code      = generateCode()
    const codeHash  = await hashCode(code)
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1_000).toISOString()

    const { error: insertError } = await supabase
      .from('password_reset_requests')
      .insert({
        user_id:   userId,
        email:     normalizedEmail,
        code_hash: codeHash,
        expires_at: expiresAt,
        status:    'pending',
        attempts:  0,
      })

    if (insertError) {
      console.error('[request-password-reset] insert error:', insertError)
      return json({ message: GENERIC_MESSAGE })
    }

    // Marca perfil como recuperação pendente
    await supabase
      .from('profiles')
      .update({ password_reset_pending: true })
      .eq('id', userId)

    // Envia e-mail com o código em texto plano (nunca salvo)
    await sendPasswordResetEmail(normalizedEmail, code)

    return json({ message: GENERIC_MESSAGE })
  } catch (err) {
    console.error('[request-password-reset] unexpected error:', err)
    return json({ message: GENERIC_MESSAGE })
  }
})
