-- ============================================================
-- Migração: fluxo próprio de recuperação de senha
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Adicionar coluna password_reset_pending em profiles
--    Indica se há recuperação de senha em andamento para o usuário.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_reset_pending boolean NOT NULL DEFAULT false;

-- 2. Criar tabela password_reset_requests
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  code_hash   text        NOT NULL,   -- SHA-256 do código de 6 dígitos
  expires_at  timestamptz NOT NULL,   -- criação + 15 minutos
  attempts    integer     NOT NULL DEFAULT 0,
  verified_at timestamptz,            -- preenchido ao validar o código
  used_at     timestamptz,            -- preenchido ao alterar a senha
  created_at  timestamptz NOT NULL DEFAULT now(),
  status      text        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'verified', 'used', 'expired', 'invalidated'))
);

-- 3. Índices para as consultas das Edge Functions
CREATE INDEX IF NOT EXISTS idx_prr_email_status
  ON public.password_reset_requests (lower(email), status);

CREATE INDEX IF NOT EXISTS idx_prr_user_id_status
  ON public.password_reset_requests (user_id, status);

-- 4. RLS: nenhuma política pública — apenas service role (Edge Functions)
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
