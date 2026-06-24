import { normalizePinyin } from '../../lib/pinyin/normalize'
import type { HskLevel, HskVocabularyEntry } from '../../domain/vocabulary'
import { loadHskEntries } from './loadHsk'
import { mapHskSourceToVocabulary } from './mappers'

type HskIndex = {
  entries: HskVocabularyEntry[]
  entriesByLevel: Record<HskLevel, HskVocabularyEntry[]>
  entriesByPinyin: Map<string, HskVocabularyEntry[]>
}

let cached: HskIndex | null = null

function buildIndex(): HskIndex {
  const entries = loadHskEntries().map(mapHskSourceToVocabulary)
  const entriesByLevel = {
    1: [] as HskVocabularyEntry[],
    2: [] as HskVocabularyEntry[],
    3: [] as HskVocabularyEntry[],
    4: [] as HskVocabularyEntry[],
    5: [] as HskVocabularyEntry[],
    6: [] as HskVocabularyEntry[],
  }
  const entriesByPinyin = new Map<string, HskVocabularyEntry[]>()

  for (const e of entries) {
    entriesByLevel[e.level].push(e)
    const p = e.pinyinNormalized
    const arr = entriesByPinyin.get(p)
    if (arr) arr.push(e)
    else entriesByPinyin.set(p, [e])
  }

  return { entries, entriesByLevel, entriesByPinyin }
}

function getIndex(): HskIndex {
  if (!cached) cached = buildIndex()
  return cached
}

export function getEntriesByLevel(level: HskLevel): HskVocabularyEntry[] {
  return getIndex().entriesByLevel[level]
}

export function searchHskByPinyin(query: string, limit = 12): HskVocabularyEntry[] {
  const q = normalizePinyin(query)
  if (!q) return []

  const { entriesByPinyin } = getIndex()
  const direct = entriesByPinyin.get(q)
  const results: HskVocabularyEntry[] = direct ? [...direct] : []

  if (results.length < limit) {
    for (const [p, arr] of entriesByPinyin.entries()) {
      if (results.length >= limit) break
      if (p !== q && (p.startsWith(q) || p.includes(q))) {
        for (const e of arr) {
          results.push(e)
          if (results.length >= limit) break
        }
      }
    }
  }

  return results.slice(0, limit)
}
