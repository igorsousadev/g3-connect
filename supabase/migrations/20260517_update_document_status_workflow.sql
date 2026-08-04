-- Migração: atualizar status documental e etapas operacionais
-- Data: 2026-05-17
--
-- Novos valores de status: pending | invalid | valid | expired
-- Novos valores de workflow_status: pending_client | analysis | homologation | sent | approved | rejected

-- ── 1. Converter valores de status ──────────────────────────────────────────

-- expiring → valid (não vencido, portanto válido)
UPDATE employee_documents
SET status = 'valid'
WHERE status = 'expiring';

-- rejected → invalid
UPDATE employee_documents
SET status = 'invalid'
WHERE status = 'rejected';

-- submitted → pending
UPDATE employee_documents
SET status = 'pending'
WHERE status = 'submitted';

-- ── 2. Converter valores de workflow_status ──────────────────────────────────

-- submitted / under_review → analysis
UPDATE employee_documents
SET workflow_status = 'analysis'
WHERE workflow_status IN ('submitted', 'under_review');

-- pending_specialist → homologation
UPDATE employee_documents
SET workflow_status = 'homologation'
WHERE workflow_status = 'pending_specialist';

-- submitted_to_contractor → sent
UPDATE employee_documents
SET workflow_status = 'sent'
WHERE workflow_status = 'submitted_to_contractor';

-- ── 3. Remover constraints antigas e adicionar novas ─────────────────────────

ALTER TABLE employee_documents
  DROP CONSTRAINT IF EXISTS employee_documents_status_check;

ALTER TABLE employee_documents
  ADD CONSTRAINT employee_documents_status_check
  CHECK (status IN ('pending', 'invalid', 'valid', 'expired'));

ALTER TABLE employee_documents
  DROP CONSTRAINT IF EXISTS employee_documents_workflow_status_check;

ALTER TABLE employee_documents
  ADD CONSTRAINT employee_documents_workflow_status_check
  CHECK (workflow_status IN ('pending_client', 'analysis', 'homologation', 'sent', 'approved', 'rejected'));
