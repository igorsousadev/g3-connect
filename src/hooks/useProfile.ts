import { useAuth } from '../contexts/AuthContext'

export function useProfile() {
  const { profile } = useAuth()
  return profile
}
