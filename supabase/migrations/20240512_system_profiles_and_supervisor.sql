-- ============================================================
-- Migração: perfil supervisor + tabela system_profiles
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Adicionar 'supervisor' ao check constraint da coluna role em public.profiles
--    (a coluna role é TEXT com check constraint, não ENUM)

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'operator', 'specialist', 'supervisor', 'client'));


-- 2. Criar tabela system_profiles (referência de perfis disponíveis no sistema)

CREATE TABLE IF NOT EXISTS public.system_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  is_system   boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS system_profiles_updated_at ON public.system_profiles;
CREATE TRIGGER system_profiles_updated_at
  BEFORE UPDATE ON public.system_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 3. Inserir perfis padrão do sistema (is_system = true)

INSERT INTO public.system_profiles (name, slug, description, is_system, is_active)
VALUES
  ('Administrador', 'admin',      'Acesso total ao sistema.',                                          true, true),
  ('Operador',      'operator',   'Gestão operacional de empresas, funcionários e documentos.',        true, true),
  ('Especialista',  'specialist', 'Análise e homologação de documentos.',                              true, true),
  ('Supervisor',    'supervisor', 'Visão operacional ampliada. Sem acesso a áreas administrativas.',   true, true),
  ('Cliente',       'client',     'Acesso ao portal do cliente para consulta de documentos.',          true, true)
ON CONFLICT (slug) DO NOTHING;


-- 4. RLS (Row Level Security) para system_profiles
--    Leitura: todos os usuários autenticados
--    Escrita: somente admin (verificado pela aplicação + Edge Function)

ALTER TABLE public.system_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_profiles_select" ON public.system_profiles;
CREATE POLICY "system_profiles_select"
  ON public.system_profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "system_profiles_all_admin" ON public.system_profiles;
CREATE POLICY "system_profiles_all_admin"
  ON public.system_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- Fim da migração
-- ============================================================
