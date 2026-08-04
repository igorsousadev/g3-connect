alter table public.company_documents
  add column if not exists workflow_status text not null default 'pending_client';

alter table public.company_documents
  drop constraint if exists company_documents_status_check;

alter table public.company_documents
  add constraint company_documents_status_check
  check (status in ('pending', 'invalid', 'valid', 'expired'));

alter table public.company_documents
  drop constraint if exists company_documents_workflow_status_check;

alter table public.company_documents
  add constraint company_documents_workflow_status_check
  check (workflow_status in ('pending_client', 'analysis', 'homologation', 'sent', 'approved', 'rejected'));
