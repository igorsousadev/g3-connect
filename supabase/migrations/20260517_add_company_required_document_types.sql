-- Add flag for company-level document types.
-- Existing records remain role/employee-oriented by default.

ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS is_company_required boolean NOT NULL DEFAULT false;
