import { getEntriesByLevel } from '../../../data/hsk'
import { normalizePinyin } from '../../../lib/pinyin/normalize'
import { readLocalJson, writeLocalJson } from '../../../lib/storage/localJson'
import { toSetlistItem } from '../mappers'
import type { Setlist } from '../types'

const SETLISTS_KEY = 'pinyin_race_setlists_v1'
const SELECTED_KEY = 'pinyin_race_selected_setlists_v1'

export function getBuiltInSetlists(): Setlist[] {
  const now = Date.now()
  return ([1, 2, 3, 4, 5, 6] as const).map((level) => ({
    id: `hsk-${level}`,
    title: `HSK ${level}`,
    items: getEntriesByLevel(level).map(toSetlistItem),
    createdAt: now,
    updatedAt: now,
    builtIn: true,
  }))
}

export function loadSetlists(): Setlist[] {
  const stored = readLocalJson<Setlist[]>(SETLISTS_KEY) ?? []
  const custom = stored
    .filter((s) => !s.builtIn)
    .map((setlist) => ({
      ...setlist,
      items: setlist.items.map((item) => ({
        ...item,
        pinyinNormalized: item.pinyinNormalized ?? normalizePinyin(item.pinyin),
      })),
    }))
  return [...getBuiltInSetlists(), ...custom]
}

export function saveSetlists(all: Setlist[]) {
  const custom = all.filter((s) => !s.builtIn)
  writeLocalJson(SETLISTS_KEY, custom)
}

export function loadSelectedSetlistIds(): string[] {
  const raw = readLocalJson<string[]>(SELECTED_KEY)
  return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []
}

export function saveSelectedSetlistIds(ids: string[]) {
  writeLocalJson(SELECTED_KEY, ids)
}
