import type { PostgrestError } from '@supabase/supabase-js'

export function parseSupabaseError(error: PostgrestError, duplicateMessage: string): Error {
  switch (error.code) {
    case '23505': return new Error(duplicateMessage)
    case '23502': return new Error('Campo obrigatório não foi informado.')
    case '23514': return new Error('Valor inválido para um dos campos.')
    default:      return new Error('Erro inesperado. Tente novamente.')
  }
}
