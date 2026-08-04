-- Allow "Empresa" as a document type category when a category check constraint exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_types_category_check'
      AND conrelid = 'public.document_types'::regclass
  ) THEN
    ALTER TABLE public.document_types
      DROP CONSTRAINT document_types_category_check;

    ALTER TABLE public.document_types
      ADD CONSTRAINT document_types_category_check
      CHECK (
        category IS NULL OR category IN (
          'SST',
          'Empresa',
          'Trabalhista',
          'Contratual',
          'Operacional',
          'Equipamentos',
          'Veículos',
          'Ambiental',
          'Saúde',
          'Engenharia',
          'Jurídico',
          'Qualidade',
          'Segurança Patrimonial',
          'Logística',
          'Alimentação',
          'Industrial',
          'Outros'
        )
      );
  END IF;
END $$;
