import { supabase } from '../lib/supabase'
import { parseSupabaseError } from '../lib/errors'
import type { DocumentType, DocumentTypeInsert, DocumentTypeUpdate } from '../types/documentType'

export async function listDocumentTypes(): Promise<DocumentType[]> {
  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function countDocumentTypes(): Promise<number> {
  const { count, error } = await supabase
    .from('document_types')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function countActiveDocumentTypes(): Promise<number> {
  const { count, error } = await supabase
    .from('document_types')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  if (error) throw error
  return count ?? 0
}

export async function getDocumentType(id: string): Promise<DocumentType> {
  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createDocumentType(dt: DocumentTypeInsert): Promise<DocumentType> {
  const { data, error } = await supabase
    .from('document_types')
    .insert(dt)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Já existe um tipo de documento com este nome.')
  return data
}

export async function listActiveDocumentTypes(): Promise<DocumentType[]> {
  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .eq('is_active', true)
    .eq('is_company_required', false)
    .order('name')
  if (error) throw error
  return data
}

export async function listRoleRequirementDocumentTypes(): Promise<DocumentType[]> {
  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .eq('is_company_required', false)
    .order('name')
  if (error) throw error
  return data
}

export async function updateDocumentType(id: string, dt: DocumentTypeUpdate): Promise<DocumentType> {
  const { data, error } = await supabase
    .from('document_types')
    .update(dt)
    .eq('id', id)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Já existe um tipo de documento com este nome.')
  return data
}
