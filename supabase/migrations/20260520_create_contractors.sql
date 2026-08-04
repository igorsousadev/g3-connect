-- Migração: módulo de Contratantes
-- Data: 2026-05-20
--
-- Cria a tabela contractors para armazenar empresas contratantes.
-- Todos os campos são obrigatórios (NOT NULL).

-- ── 1. Criar tabela ─────────────────────────────────────────────────────────

CREATE TABLE public.contractors (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_name   text        NOT NULL,
  trade_name       text        NOT NULL,
  cnpj             text        NOT NULL,
  code             text        NOT NULL,
  responsible_name text        NOT NULL,
  whatsapp         text        NOT NULL,
  email            text        NOT NULL,
  status           text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes            text        NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Constraints de unicidade ──────────────────────────────────────────────

ALTER TABLE public.contractors
  ADD CONSTRAINT contractors_code_unique UNIQUE (code);

ALTER TABLE public.contractors
  ADD CONSTRAINT contractors_cnpj_unique UNIQUE (cnpj);

-- ── 3. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX idx_contractors_status ON public.contractors (status);

-- ── 4. Trigger de updated_at ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_contractors_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER contractors_updated_at
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION update_contractors_updated_at();

-- ── 5. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contractors"
  ON public.contractors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contractors"
  ON public.contractors FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contractors"
  ON public.contractors FOR UPDATE TO authenticated USING (true);

