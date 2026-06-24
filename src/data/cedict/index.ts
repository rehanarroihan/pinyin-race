import { normalizePinyin } from '../../lib/pinyin/normalize'
import type { VocabularyEntry } from '../../domain/vocabulary'
import { loadCedictEntries } from './loadCedict'
import { mapCedictSourceToVocabulary } from './mappers'

type CedictIndex = {
  entries: VocabularyEntry[]
  entriesByPinyin: Map<string, VocabularyEntry[]>
  entriesByDisplayPinyin: Map<string, VocabularyEntry[]>
  entriesByHanzi: Map<string, VocabularyEntry[]>
}

let cached: CedictIndex | null = null

function normalizeDisplayPinyinQuery(raw: string): string {
  return raw.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

function containsHanzi(raw: string): boolean {
  return /[\u3400-\u9fff]/u.test(raw)
}

function buildIndex(): CedictIndex {
  const entries = loadCedictEntries().map(mapCedictSourceToVocabulary)
  const entriesByPinyin = new Map<string, VocabularyEntry[]>()
  const entriesByDisplayPinyin = new Map<string, VocabularyEntry[]>()
  const entriesByHanzi = new Map<string, VocabularyEntry[]>()

  for (const entry of entries) {
    if (!entry.pinyinNormalized) continue
    const existing = entriesByPinyin.get(entry.pinyinNormalized)
    if (existing) existing.push(entry)
    else entriesByPinyin.set(entry.pinyinNormalized, [entry])

    const displayKey = normalizeDisplayPinyinQuery(entry.pinyinDisplay)
    const existingDisplay = entriesByDisplayPinyin.get(displayKey)
    if (existingDisplay) existingDisplay.push(entry)
    else entriesByDisplayPinyin.set(displayKey, [entry])

    const existingHanzi = entriesByHanzi.get(entry.hanzi)
    if (existingHanzi) existingHanzi.push(entry)
    else entriesByHanzi.set(entry.hanzi, [entry])
  }

  return { entries, entriesByPinyin, entriesByDisplayPinyin, entriesByHanzi }
}

function getIndex(): CedictIndex {
  if (!cached) cached = buildIndex()
  return cached
}

export function searchCedictByPinyin(query: string, limit = 12): VocabularyEntry[] {
  const rawQuery = query.trim()
  const q = normalizePinyin(query)
  const displayQuery = normalizeDisplayPinyinQuery(query)
  if (!rawQuery) return []

  const { entries, entriesByPinyin, entriesByDisplayPinyin, entriesByHanzi } = getIndex()
  const exactDisplay = entriesByDisplayPinyin.get(displayQuery) ?? []
  const exact = entriesByPinyin.get(q) ?? []
  const exactHanzi = entriesByHanzi.get(rawQuery) ?? []
  const isHanziQuery = containsHanzi(rawQuery)
  const deduped = new Set<string>()
  const results: VocabularyEntry[] = []

  const pushEntry = (entry: VocabularyEntry) => {
    const key = `${entry.hanzi}__${entry.pinyinDisplay}`
    if (deduped.has(key)) return
    deduped.add(key)
    results.push(entry)
  }

  for (const entry of exactHanzi) {
    pushEntry(entry)
    if (results.length >= limit) return results
  }

  if (isHanziQuery) {
    for (const entry of entries) {
      if (!entry.hanzi.includes(rawQuery) || entry.hanzi === rawQuery) continue
      pushEntry(entry)
      if (results.length >= limit) return results
    }
  }

  if (!q) return results

  for (const entry of exactDisplay) {
    pushEntry(entry)
    if (results.length >= limit) return results
  }

  for (const entry of exact) {
    pushEntry(entry)
    if (results.length >= limit) return results
  }

  for (const [pinyin, entries] of entriesByPinyin.entries()) {
    if (results.length >= limit) break
    if (pinyin === q || (!pinyin.startsWith(q) && !pinyin.includes(q))) continue
    for (const entry of entries) {
      pushEntry(entry)
      if (results.length >= limit) break
    }
  }

  return results
}
