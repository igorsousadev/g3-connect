// @ts-nocheck — arquivo Deno; não é verificado pelo tsconfig do projeto Node
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Sempre retorna 200 — erros são sinalizados via { error: "..." } no body.
  // Isso evita o comportamento do SDK Supabase de mascarar a mensagem real
  // com "Edge Function returned a non-2xx status code".
  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // Verificar se o chamador está autenticado e é admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado.' })

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: callerUser } } = await callerClient.auth.getUser()
    if (!callerUser) return json({ error: 'Não autorizado.' })

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    const callerRole = callerProfile?.role ?? ''
    const rolesPermitidos = ['admin', 'operator', 'supervisor']
    if (!rolesPermitidos.includes(callerRole)) {
      return json({ error: 'Acesso negado.' })
    }

    // Validar body
    const { full_name, email, role, company_id, is_active } = await req.json()

    if (!full_name?.trim() || !email?.trim() || !role) {
      return json({ error: 'Campos obrigatórios ausentes: full_name, email, role.' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return json({ error: 'E-mail inválido.' })
    }

    const allowedRoles = ['admin', 'operator', 'specialist', 'supervisor', 'client']
    if (!allowedRoles.includes(role)) {
      return json({ error: `Perfil inválido: ${role}.` })
    }

    // Operadores e supervisores só podem criar usuários com perfil cliente
    if (callerRole !== 'admin' && role !== 'client') {
      return json({ error: 'Acesso negado. Somente administradores podem criar usuários com este perfil.' })
    }

    // Criar usuário com admin client (usa SERVICE_ROLE_KEY server-side)
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: 'g3connect',
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    })

    let userId: string

    if (createError) {
      // Tratar e-mail já existente: buscar perfil existente e atualizar vínculo
      const jaExiste =
        createError.message?.toLowerCase().includes('already') ||
        (createError as unknown as { status?: number }).status === 422

      if (!jaExiste) return json({ error: 'Erro ao criar usuário. Verifique os dados e tente novamente.' })

      const { data: perfilExistente } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .single()

      if (!perfilExistente) {
        return json({ error: 'Usuário já existe no sistema, mas o perfil não foi encontrado. Verifique manualmente.' })
      }

      userId = perfilExistente.id
    } else {
      if (!newUser.user) return json({ error: 'Erro inesperado ao criar usuário.' })
      userId = newUser.user.id
    }

    // Criar/atualizar registro em profiles
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id:         userId,
        full_name:  full_name.trim(),
        email:      email.trim().toLowerCase(),
        role,
        company_id: company_id || null,
        is_active:  is_active ?? true,
      })

    if (profileError) return json({ error: 'Usuário criado, mas houve um erro ao salvar o perfil. Verifique manualmente.' })

    return json({ userId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor.'
    return json({ error: message })
  }
})

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
