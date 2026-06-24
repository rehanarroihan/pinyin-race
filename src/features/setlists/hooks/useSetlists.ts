import { useContext } from 'react'
import { SetlistsContext } from './SetlistsContext'

export function useSetlists() {
  const ctx = useContext(SetlistsContext)
  if (!ctx) throw new Error('useSetlists must be used within SetlistsProvider')
  return ctx
}
