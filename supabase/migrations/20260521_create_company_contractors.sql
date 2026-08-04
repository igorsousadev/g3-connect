-- Migração: tabela de vínculos empresa prestadora × contratante
-- Data: 2026-05-21
--
-- Cada linha representa a relação entre uma empresa prestadora e uma contratante.
-- Armazena o contrato gerado automaticamente para essa relação.

-- ── 1. Criar tabela ─────────────────────────────────────────────────────────

CREATE TABLE public.company_contractors (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contractor_id     uuid        NOT NULL REFERENCES public.contractors(id),
  segment_id        uuid        NOT NULL REFERENCES public.segments(id),
  contract_sequence integer     NOT NULL,
  contract_number   text        NOT NULL,
  status            text        NOT NULL DEFAULT 'active',
  notes             text        NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_contractors_status_check  CHECK (status IN ('active', 'inactive')),
  CONSTRAINT uq_company_contractor             UNIQUE (company_id, contractor_id),
  CONSTRAINT uq_contractor_sequence            UNIQUE (contractor_id, contract_sequence),
  CONSTRAINT uq_contract_number                UNIQUE (contract_number)
);

-- ── 2. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX idx_company_contractors_company    ON public.company_contractors (company_id);
CREATE INDEX idx_company_contractors_contractor ON public.company_contractors (contractor_id);
CREATE INDEX idx_company_contractors_status     ON public.company_contractors (status);

-- ── 3. Trigger de updated_at ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_company_contractors_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER company_contractors_updated_at
  BEFORE UPDATE ON public.company_contractors
  FOR EACH ROW EXECUTE FUNCTION update_company_contractors_updated_at();

-- ── 4. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.company_contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read company_contractors"
  ON public.company_contractors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert company_contractors"
  ON public.company_contractors FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update company_contractors"
  ON public.company_contractors FOR UPDATE TO authenticated USING (true);
