# Deploy no Cloudflare Pages - G3 Connect

## Configuracoes do build

| Campo | Valor |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js version | `20` ou superior |

## Variaveis de ambiente (Cloudflare Pages > Settings > Environment Variables)

Estas variaveis devem ser configuradas no painel do Cloudflare Pages:

| Variavel | Descricao |
|---|---|
| `VITE_APP_NAME` | Nome da aplicacao exibido na interface, por exemplo `G3 Connect` |
| `VITE_APP_URL` | URL publica da aplicacao, por exemplo `https://g3.seudominio.com.br` |
| `VITE_SUPABASE_URL` | URL do projeto Supabase, por exemplo `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave anon publica do Supabase |
| `VITE_SUPPORT_WHATSAPP` | Numero de WhatsApp do suporte, somente digitos |

Todas as variaveis do frontend devem ter o prefixo `VITE_`. O Vite nao expoe variaveis sem esse prefixo no bundle.

## Credenciais do Dropbox ficam no Supabase, nao no Cloudflare

As credenciais do Dropbox sao usadas exclusivamente pelas Edge Functions do Supabase. Elas nao devem ser configuradas no Cloudflare Pages.

Configure-as em: Supabase Dashboard > Edge Functions > Secrets.

| Secret | Descricao |
|---|---|
| `DROPBOX_APP_KEY` | App key do app no Dropbox App Console |
| `DROPBOX_APP_SECRET` | App secret do app no Dropbox App Console |
| `DROPBOX_REFRESH_TOKEN` | Refresh token OAuth2 gerado para o app |
| `DROPBOX_ACCESS_TOKEN` | Token de longa duracao, alternativa ao refresh token |
| `DROPBOX_ROOT_FOLDER` | Pasta raiz no Dropbox, por exemplo `/G3Connect` |

## Fallback para SPA (React Router)

O arquivo `public/_redirects` esta configurado no projeto:

```txt
/* /index.html 200
```

Isso garante que rotas internas do React Router, como `/portal/dashboard` e `/empresas`, funcionem ao acessar diretamente a URL ou ao recarregar a pagina.

O Cloudflare Pages processa esse arquivo automaticamente durante o build.

## Passos para conectar o repositorio no Cloudflare Pages

1. Acesse Cloudflare Dashboard > Workers & Pages > Create application > Pages.
2. Clique em Connect to Git e selecione o repositorio do G3 Connect.
3. Configure o build:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Adicione as variaveis de ambiente listadas acima em Environment Variables.
5. Clique em Save and Deploy.

## Observacoes

- As Supabase Edge Functions continuam no Supabase e nao precisam ser migradas para Cloudflare Workers.
- O arquivo `netlify.toml` presente no repositorio e legado. Ele e ignorado pelo Cloudflare Pages e nao causa conflito no deploy atual.
- O Node.js padrao do Cloudflare Pages pode ser uma versao antiga. Recomenda-se fixar a versao em 20 ou superior nas configuracoes de build, ou via variavel de ambiente `NODE_VERSION=20`.
