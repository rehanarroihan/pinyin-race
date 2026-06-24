import { createContext } from 'react'
import type { Recommendation, Setlist, SetlistItem } from '../types'

export type SetlistsContextValue = {
  setlists: Setlist[]
  selectedSetlistIds: string[]
  toggleSelected: (id: string) => void
  createSetlist: () => string
  deleteSetlist: (id: string) => void
  getSetlistById: (id: string) => Setlist | null
  updateSetlistTitle: (id: string, title: string) => void
  addItemFromRecommendation: (setlistId: string, r: Recommendation) => void
  removeItem: (setlistId: string, index: number) => void
  search: (query: string) => Recommendation[]
  getItemsForSelectedSetlists: () => SetlistItem[]
}

export const SetlistsContext = createContext<SetlistsContextValue | null>(null)

