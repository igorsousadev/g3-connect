-- Migração: módulo de Segmentos
-- Data: 2026-05-20
--
-- Cria a tabela segments para armazenar segmentos de atuação das empresas prestadoras.

-- ── 1. Criar tabela ─────────────────────────────────────────────────────────

CREATE TABLE public.segments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  status      text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Constraint de unicidade ───────────────────────────────────────────────

ALTER TABLE public.segments
  ADD CONSTRAINT segments_name_unique UNIQUE (name);

-- ── 3. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX idx_segments_status ON public.segments (status);
CREATE INDEX idx_segments_name   ON public.segments (name);

-- ── 4. Trigger de updated_at ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_segments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER segments_updated_at
  BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION update_segments_updated_at();

-- ── 5. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read segments"
  ON public.segments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert segments"
  ON public.segments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update segments"
  ON public.segments FOR UPDATE TO authenticated USING (true);
