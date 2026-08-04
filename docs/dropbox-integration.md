# Integração com Dropbox — G3 Connect

## Visão geral

Os arquivos dos documentos são armazenados no Dropbox. O sistema G3 Connect guarda apenas
os metadados no banco Supabase (`dropbox_path`, `file_name`, `file_size` etc.).

Toda comunicação com o Dropbox ocorre em **Supabase Edge Functions** (servidor Deno),
nunca diretamente no frontend React. As credenciais nunca ficam expostas no navegador.

---

## Variáveis de ambiente

As variáveis abaixo devem ser configuradas nos **Secrets do projeto Supabase**
(Dashboard → Edge Functions → Secrets). Não usar prefixo `VITE_`.

| Variável                | Obrigatória                | Descrição                                                  |
|-------------------------|----------------------------|------------------------------------------------------------|
| `DROPBOX_ACCESS_TOKEN`  | Sim (Opção A)              | Token de longa duração gerado no App Console do Dropbox    |
| `DROPBOX_APP_KEY`       | Sim (Opção B)              | App Key do aplicativo Dropbox                              |
| `DROPBOX_APP_SECRET`    | Sim (Opção B)              | App Secret do aplicativo Dropbox                           |
| `DROPBOX_REFRESH_TOKEN` | Sim (Opção B)              | Refresh Token OAuth2 para renovar o access token           |
| `DROPBOX_ROOT_FOLDER`   | Não (padrão: `/G3Connect`) | Pasta raiz no Dropbox onde os arquivos são criados         |

**Opção A** (token direto) é mais simples para ambiente de desenvolvimento.  
**Opção B** (refresh token) é recomendada para produção, pois o access token é renovado automaticamente.

---

## Edge Functions criadas

| Função                  | Ação                                     |
|-------------------------|------------------------------------------|
| `dropbox-upload`        | Faz upload de um arquivo                 |
| `dropbox-download-link` | Gera link temporário de acesso (4 horas) |
| `dropbox-list`          | Lista conteúdo de uma pasta              |
| `dropbox-list`          | Cria uma pasta (via parâmetro `action`)  |
| `dropbox-delete`        | Remove um arquivo                        |
| `dropbox-move`          | Move ou renomeia um arquivo              |

---

## Serviço frontend

**Arquivo:** `src/services/dropboxService.ts`

Funções disponíveis para uso nas páginas:

```typescript
uploadFileToDropbox(params: DropboxUploadParams): Promise<DropboxUploadResult>
getTemporaryDownloadLink(path: string): Promise<DropboxDownloadLinkResult>
downloadFileFromDropbox(path: string): Promise<string>  // retorna só a URL
listDropboxFolder(path: string): Promise<DropboxListResult>
createDropboxFolder(path: string): Promise<void>
deleteDropboxFile(path: string): Promise<void>
moveDropboxFile(fromPath: string, toPath: string): Promise<void>
```

---

## Estrutura de paths

**Arquivo:** `src/lib/dropboxPaths.ts`

### Documento de funcionário
```
/G3Connect
  /companies/{companyId}
    /employees/{employeeId}
      /documents/{documentTypeSlug}
        /{year}
          {timestamp}_{random}_{nomeSeguro}.ext
```

Exemplo real:
```
/G3Connect/companies/abc123/employees/def456/documents/nr10/2026/20260516_183001_a8f3_nr10.pdf
```

### Documento da empresa
```
/G3Connect
  /companies/{companyId}
    /company-documents/{documentTypeSlug}
      /{year}
        {timestamp}_{random}_{nomeSeguro}.ext
```

Exemplo real:
```
/G3Connect/companies/abc123/company-documents/alvara-funcionamento/2026/20260516_183002_b9c1_alvara.pdf
```

### Observações sobre a estrutura
- **`{documentTypeSlug}`** — slug sanitizado do tipo documental (ex: `nr10`, `aso`, `ficha-epi`). Fallback para o ID caso o slug não exista.
- **`{year}`** — extraído da `issue_date` do documento; usa o ano corrente se não informado.
- **Nome do arquivo** — gerado automaticamente: `{data}_{hora}_{random}_{nomeOriginalSeguro}`. Garante unicidade e evita sobrescrita.

---

## Helpers de path

**Arquivo:** `src/lib/dropboxPaths.ts`

### Funções principais (novos uploads)

```typescript
// Documento de funcionário
buildEmployeeDocumentDropboxPath({
  companyId: string
  employeeId: string
  documentTypeSlug: string   // slug ou ID como fallback: docType.slug ?? docType.id
  fileName: string
  issueDate?: string | null  // "YYYY-MM-DD"
}): string

// Documento da empresa
buildCompanyDocumentDropboxPath({
  companyId: string
  documentTypeSlug: string
  fileName: string
  issueDate?: string | null
}): string

// Utilitários exportados
sanitizeDropboxPathSegment(segment: string): string  // "NR10 Básico" → "nr10-basico"
generateDropboxFileName(originalName: string): string // "nr10.pdf" → "20260516_183001_a8f3_nr10.pdf"
```

### Funções legadas (compatibilidade com arquivos existentes)

> Mantidas apenas para não quebrar arquivos já enviados. Não usar em novos uploads.

```typescript
/** @deprecated */ buildEmployeeDocumentPath({ companyId, employeeId, documentTypeId, fileName })
/** @deprecated */ buildCompanyDocumentPath({ companyId, documentTypeId, fileName })
```

---

## Exemplo: upload de documento de funcionário

```typescript
import { uploadFileToDropbox } from '../services/dropboxService'
import { buildEmployeeDocumentDropboxPath } from '../lib/dropboxPaths'

async function handleUpload(file: File, docType: DocumentType, doc: EmployeeDocumentInsert) {
  const path = buildEmployeeDocumentDropboxPath({
    companyId:        doc.company_id,
    employeeId:       doc.employee_id,
    documentTypeSlug: docType.slug ?? docType.id,  // slug preferencial, ID como fallback
    fileName:         file.name,
    issueDate:        doc.issue_date,               // define a subpasta do ano
  })

  const result = await uploadFileToDropbox({ file, path })

  // Salvar metadados no banco (employee_documents)
  await updateEmployeeDocument(docId, {
    dropbox_path: result.dropbox_path,
    file_name:    result.file_name,
    file_size:    result.file_size,
    mime_type:    result.mime_type,
    uploaded_at:  result.uploaded_at,
  })
}
```

---

## Exemplo: gerar link temporário para visualização

```typescript
import { downloadFileFromDropbox } from '../services/dropboxService'

async function openDocument(dropboxPath: string) {
  const url = await downloadFileFromDropbox(dropboxPath)
  window.open(url, '_blank')
}
```

O link é válido por **4 horas** e não exige autenticação no Dropbox para acesso.
Funciona tanto para arquivos no path antigo quanto no novo.

---

## Campos a salvar no banco após upload

Campos retornados por `uploadFileToDropbox` para persistir em `employee_documents`:

| Campo               | Tipo   | Descrição                               |
|---------------------|--------|-----------------------------------------|
| `dropbox_path`      | string | Path completo no Dropbox                |
| `external_file_url` | null   | Não armazenado (link gerado sob demanda)|
| `file_name`         | string | Nome gerado do arquivo                  |
| `mime_type`         | string | Tipo MIME (ex: `application/pdf`)       |
| `file_size`         | number | Tamanho em bytes                        |
| `uploaded_at`       | string | ISO 8601 do momento do upload           |

> **Nota:** `external_file_url` permanece `null` porque os links temporários expiram.
> Para abrir um arquivo, sempre chame `downloadFileFromDropbox(dropboxPath)` dinamicamente.

---

## Compatibilidade com arquivos antigos

Arquivos enviados com a estrutura anterior continuam acessíveis normalmente.
O `dropbox_path` salvo no banco aponta para o path exato — seja antigo ou novo.
A função `downloadFileFromDropbox(path)` funciona para qualquer path.

**Não é necessário migrar arquivos existentes.**

---

## Deploy das Edge Functions

```bash
# Deploy individual
supabase functions deploy dropbox-upload
supabase functions deploy dropbox-download-link
supabase functions deploy dropbox-list
supabase functions deploy dropbox-delete
supabase functions deploy dropbox-move

# Configurar secrets (uma vez por projeto)
supabase secrets set DROPBOX_ACCESS_TOKEN=seu_token
supabase secrets set DROPBOX_ROOT_FOLDER=/G3Connect
```
