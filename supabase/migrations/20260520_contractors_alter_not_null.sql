-- Migração: ajuste de campos obrigatórios em contractors
-- Data: 2026-05-20
--
-- Aplica em ambientes onde a tabela contractors já foi criada com colunas nullable.
-- Seguro para rodar em ambientes novos também (operações idempotentes).

-- ── 1. Tornar campos obrigatórios ────────────────────────────────────────────

ALTER TABLE public.contractors
  ALTER COLUMN corporate_name   SET NOT NULL,
  ALTER COLUMN trade_name       SET NOT NULL,
  ALTER COLUMN cnpj             SET NOT NULL,
  ALTER COLUMN code             SET NOT NULL,
  ALTER COLUMN responsible_name SET NOT NULL,
  ALTER COLUMN whatsapp         SET NOT NULL,
  ALTER COLUMN email            SET NOT NULL,
  ALTER COLUMN status           SET NOT NULL,
  ALTER COLUMN notes            SET NOT NULL,
  ALTER COLUMN notes            SET DEFAULT '';

-- ── 2. Garantir constraints de unicidade ─────────────────────────────────────

ALTER TABLE public.contractors
  DROP CONSTRAINT IF EXISTS contractors_code_unique;

ALTER TABLE public.contractors
  ADD CONSTRAINT contractors_code_unique UNIQUE (code);

ALTER TABLE public.contractors
  DROP CONSTRAINT IF EXISTS contractors_cnpj_unique;

DROP INDEX IF EXISTS contractors_cnpj_unique;

ALTER TABLE public.contractors
  ADD CONSTRAINT contractors_cnpj_unique UNIQUE (cnpj);

-- ── 3. Garantir índice de status ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_contractors_status
  ON public.contractors (status);

-- ── 4. Garantir trigger de updated_at ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_contractors_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractors_updated_at ON public.contractors;

CREATE TRIGGER contractors_updated_at
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION update_contractors_updated_at();

-- ── 5. Garantir RLS e policies ───────────────────────────────────────────────

ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read contractors"   ON public.contractors;
DROP POLICY IF EXISTS "Authenticated users can insert contractors" ON public.contractors;
DROP POLICY IF EXISTS "Authenticated users can update contractors" ON public.contractors;

CREATE POLICY "Authenticated users can read contractors"
  ON public.contractors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contractors"
  ON public.contractors FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contractors"
  ON public.contractors FOR UPDATE TO authenticated USING (true);
