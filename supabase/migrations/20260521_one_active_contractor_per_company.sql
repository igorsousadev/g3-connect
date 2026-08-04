-- Migração: restrição de no máximo um vínculo ativo por empresa
-- Data: 2026-05-21
--
-- Uma empresa prestadora pode ter vários vínculos históricos com contratantes,
-- porém somente um pode estar ativo por vez.

-- Índice único parcial: garante unicidade de (company_id) quando status = 'active'
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_contractors_one_active_per_company
  ON public.company_contractors (company_id)
  WHERE status = 'active';
