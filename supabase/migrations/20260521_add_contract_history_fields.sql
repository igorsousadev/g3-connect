-- Migração: campos de histórico e inativação de contratos em company_contractors
-- Data: 2026-05-21
--
-- Contrato é imutável após criação. A única operação permitida é inativação.
-- Um empresa pode ter vários contratos históricos (inativos) mas apenas 1 ativo.

-- 1. Adicionar colunas de histórico
ALTER TABLE public.company_contractors
  ADD COLUMN IF NOT EXISTS contract_inclusion_date date        NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS inactivated_at          timestamptz,
  ADD COLUMN IF NOT EXISTS inactivation_reason     text;

-- 2. Remover constraint unique(company_id, contractor_id)
--    Uma empresa pode ter novo contrato com a mesma contratante após inativar o anterior.
ALTER TABLE public.company_contractors
  DROP CONSTRAINT IF EXISTS uq_company_contractor;
