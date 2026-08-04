import { supabase } from '../lib/supabase'
import type { MessageTemplate, MessageTemplateInsert, MessageTemplateUpdate } from '../types/messageTemplate'

export async function listAllTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .order('category')
    .order('name')
  if (error) throw error
  return data
}

export async function listActiveTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name')
  if (error) throw error
  return data
}

export async function getMessageTemplate(id: string): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createMessageTemplate(tpl: MessageTemplateInsert): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from('message_templates')
    .insert(tpl)
    .select()
    .single()
  if (error) throw new Error('Erro ao criar template.')
  return data
}

export async function updateMessageTemplate(id: string, tpl: MessageTemplateUpdate): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from('message_templates')
    .update(tpl)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error('Erro ao atualizar template.')
  return data
}

export async function toggleTemplateActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('message_templates')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw new Error('Erro ao alterar status do template.')
}

export async function deleteMessageTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', id)
  if (error) throw new Error('Erro ao remover template.')
}
