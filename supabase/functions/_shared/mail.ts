// @ts-nocheck — arquivo Deno; não é verificado pelo tsconfig do projeto Node
//
// Camada isolada de envio de e-mail.
// Troca de provedor: basta alterar os Supabase Secrets (SMTP_HOST, SMTP_PORT, etc.).
// Nunca usar variáveis VITE_ aqui — este código roda apenas no servidor.

import nodemailer from 'npm:nodemailer@6.9.9'

const APP_NAME = Deno.env.get('APP_NAME') ?? 'Application'

export async function sendPasswordResetEmail(
  to: string,
  code: string,
): Promise<void> {
  const host   = Deno.env.get('SMTP_HOST') ?? ''
  const port   = parseInt(Deno.env.get('SMTP_PORT') ?? '587', 10)
  const user   = Deno.env.get('SMTP_USER') ?? ''
  const pass   = Deno.env.get('SMTP_PASS') ?? ''
  const from   = Deno.env.get('SMTP_FROM') ?? user
  const secure = port === 465

  if (!host || !user || !pass || !from) {
    throw new Error('Configuracao SMTP incompleta.')
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })

  await transporter.sendMail({
    from: `"${APP_NAME}" <${from}>`,
    to,
    subject: `${APP_NAME} — Código de recuperação de senha`,
    text:
      `Seu código de recuperação de senha é: ${code}\n\n` +
      `Este código expira em 15 minutos.\n` +
      `Se você não solicitou esta ação, ignore este e-mail.`,
    html: buildHtml(code),
  })
}

function buildHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de senha</title>
</head>
<body style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:36px;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">
      Recuperação de senha
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
      Recebemos uma solicitação de redefinição de senha para sua conta no ${APP_NAME}.
      Use o código abaixo para continuar:
    </p>
    <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#2563eb;font-family:'Courier New',monospace;">
        ${code}
      </span>
    </div>
    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
      Este código é válido por <strong>15 minutos</strong>.
      Se você não solicitou a recuperação de senha, ignore este e-mail —
      sua conta permanece segura.
    </p>
  </div>
</body>
</html>`
}
