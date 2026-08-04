create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type_id uuid not null references public.document_types(id),
  status text not null default 'pending',
  workflow_status text not null default 'pending_client',
  issue_date date null,
  expiration_date date null,
  external_file_url text null,
  notes text null,
  approved_by uuid null references auth.users(id),
  approved_at timestamp with time zone null,
  constraint company_doc_unique unique (company_id, document_type_id),
  constraint company_documents_status_check check (status in ('pending', 'invalid', 'valid', 'expired')),
  constraint company_documents_workflow_status_check check (workflow_status in ('pending_client', 'analysis', 'homologation', 'sent', 'approved', 'rejected'))
);
