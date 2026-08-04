import { createContext, useContext } from 'react'

interface ClientContextType {
  companyId: string
  companyName: string
}

export const ClientContext = createContext<ClientContextType | undefined>(undefined)

export function useClientContext(): ClientContextType {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useClientContext deve ser usado dentro de ClientRoute')
  return ctx
}
