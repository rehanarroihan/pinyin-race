import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { createHybridProvider } from '../../../data/dict/hybridProvider'
import {
  loadSelectedSetlistIds,
  loadSetlists,
  saveSelectedSetlistIds,
  saveSetlists,
} from '../storage/setlistsStorage'
import { toRecommendation } from '../mappers'
import type { Recommendation, Setlist, SetlistItem } from '../types'
import { SetlistsContext, type SetlistsContextValue } from './SetlistsContext'

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}`
}

export function SetlistsProvider({ children }: { children: ReactNode }) {
  const dictProvider = useMemo(() => createHybridProvider(), [])
  const [setlists, setSetlists] = useState<Setlist[]>(() => loadSetlists())
  const [selectedSetlistIds, setSelectedSetlistIds] = useState<string[]>(() => {
    const stored = loadSelectedSetlistIds()
    const available = new Set(loadSetlists().map((s) => s.id))
    const cleaned = stored.filter((id) => available.has(id))
    return cleaned.length > 0 ? cleaned : ['hsk-1']
  })

  const persistSetlists = useCallback((next: Setlist[]) => {
    setSetlists(next)
    saveSetlists(next)
  }, [])

  const persistSelected = useCallback((next: string[]) => {
    setSelectedSetlistIds(next)
    saveSelectedSetlistIds(next)
  }, [])

  const toggleSelected = useCallback(
    (id: string) => {
      persistSelected(
        selectedSetlistIds.includes(id)
          ? selectedSetlistIds.filter((x) => x !== id)
          : [...selectedSetlistIds, id],
      )
    },
    [persistSelected, selectedSetlistIds],
  )

  const createSetlist = useCallback(() => {
    const id = uuid()
    const now = Date.now()
    const next: Setlist = {
      id,
      title: 'New setlist',
      items: [],
      createdAt: now,
      updatedAt: now,
      builtIn: false,
    }
    persistSetlists([next, ...setlists])
    return id
  }, [persistSetlists, setlists])

  const deleteSetlist = useCallback(
    (id: string) => {
      persistSetlists(setlists.filter((s) => s.id !== id))
      if (selectedSetlistIds.includes(id)) {
        persistSelected(selectedSetlistIds.filter((x) => x !== id))
      }
    },
    [persistSelected, persistSetlists, selectedSetlistIds, setlists],
  )

  const getSetlistById = useCallback(
    (id: string) => setlists.find((s) => s.id === id) ?? null,
    [setlists],
  )

  const updateSetlistTitle = useCallback(
    (id: string, title: string) => {
      persistSetlists(
        setlists.map((s) => (s.id === id ? { ...s, title, updatedAt: Date.now() } : s)),
      )
    },
    [persistSetlists, setlists],
  )

  const addItemFromRecommendation = useCallback(
    (setlistId: string, r: Recommendation) => {
      const item: SetlistItem = {
        hanzi: r.hanzi,
        pinyin: r.pinyin,
        pinyinNormalized: r.pinyinNormalized,
        english: r.english,
        source: 'user',
      }
      persistSetlists(
        setlists.map((s) =>
          s.id === setlistId ? { ...s, items: [...s.items, item], updatedAt: Date.now() } : s,
        ),
      )
    },
    [persistSetlists, setlists],
  )

  const removeItem = useCallback(
    (setlistId: string, index: number) => {
      persistSetlists(
        setlists.map((s) =>
          s.id === setlistId
            ? { ...s, items: s.items.filter((_, i) => i !== index), updatedAt: Date.now() }
            : s,
        ),
      )
    },
    [persistSetlists, setlists],
  )

  const search = useCallback((query: string): Recommendation[] => {
    return dictProvider.searchByPinyin(query, 12).map(toRecommendation)
  }, [dictProvider])

  const getItemsForSelectedSetlists = useCallback((): SetlistItem[] => {
    const selected = new Set(selectedSetlistIds)
    const items: SetlistItem[] = []
    for (const s of setlists) {
      if (!selected.has(s.id)) continue
      items.push(...s.items)
    }
    return items
  }, [selectedSetlistIds, setlists])

  const value = useMemo<SetlistsContextValue>(
    () => ({
      setlists,
      selectedSetlistIds,
      toggleSelected,
      createSetlist,
      deleteSetlist,
      getSetlistById,
      updateSetlistTitle,
      addItemFromRecommendation,
      removeItem,
      search,
      getItemsForSelectedSetlists,
    }),
    [
      addItemFromRecommendation,
      createSetlist,
      deleteSetlist,
      getItemsForSelectedSetlists,
      getSetlistById,
      removeItem,
      search,
      selectedSetlistIds,
      setlists,
      toggleSelected,
      updateSetlistTitle,
    ],
  )

  return <SetlistsContext.Provider value={value}>{children}</SetlistsContext.Provider>
}
