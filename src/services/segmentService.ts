import { supabase } from '../lib/supabase'
import { parseSupabaseError } from '../lib/errors'
import type { Segment, SegmentInsert, SegmentUpdate } from '../types/segment'

export async function listSegments(): Promise<Segment[]> {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function listActiveSegments(): Promise<Segment[]> {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .eq('status', 'active')
    .order('name')
  if (error) throw error
  return data
}

export async function getSegment(id: string): Promise<Segment> {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createSegment(segment: SegmentInsert): Promise<Segment> {
  const { data, error } = await supabase
    .from('segments')
    .insert(segment)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Já existe um segmento com este nome.')
  return data
}

export async function updateSegment(id: string, segment: SegmentUpdate): Promise<Segment> {
  const { data, error } = await supabase
    .from('segments')
    .update(segment)
    .eq('id', id)
    .select()
    .single()
  if (error) throw parseSupabaseError(error, 'Já existe um segmento com este nome.')
  return data
}
