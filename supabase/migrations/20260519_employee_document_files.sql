-- Migração: histórico de arquivos por documento de funcionário
-- Data: 2026-05-19
--
-- Cria a tabela employee_document_files para armazenar múltiplos arquivos por documento.
-- Migra os arquivos existentes em employee_documents.external_file_url para o histórico.

-- ── 1. Criar tabela ─────────────────────────────────────────────────────────

CREATE TABLE employee_document_files (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_document_id uuid        NOT NULL REFERENCES employee_documents(id) ON DELETE CASCADE,
  file_url             text        NOT NULL,
  file_name            text,
  file_path            text,
  uploaded_at          timestamptz NOT NULL DEFAULT now(),
  uploaded_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_current           boolean     NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_document_files_document_id
  ON employee_document_files(employee_document_id);

-- ── 2. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE employee_document_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read employee document files"
  ON employee_document_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert employee document files"
  ON employee_document_files FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update employee document files"
  ON employee_document_files FOR UPDATE TO authenticated USING (true);

-- ── 3. Migrar arquivos existentes ────────────────────────────────────────────
-- Copia external_file_url de cada documento que já possui arquivo para o histórico.

INSERT INTO employee_document_files (
  employee_document_id,
  file_url,
  file_path,
  is_current
)
SELECT
  id,
  external_file_url,
  external_file_url,
  true
FROM employee_documents
WHERE external_file_url IS NOT NULL
  AND external_file_url <> '';
