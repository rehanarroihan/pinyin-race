import { readLocalJson, writeLocalJson } from '../../../lib/storage/localJson'

export type GameHistory = {
  id: string
  playedAt: number
  setlistIds: string[]
  score: number
  durationMs: number
  stats: {
    correct: number
    missed: number
    mostFailed?: {
      hanzi: string
      pinyin: string
      count: number
    } | null
  }
}

const HISTORY_KEY = 'pinyin_race_history_v1'

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}`
}

export function appendHistory(entry: Omit<GameHistory, 'id'>) {
  const current = readLocalJson<GameHistory[]>(HISTORY_KEY) ?? []
  const next: GameHistory = { ...entry, id: uuid() }
  writeLocalJson(HISTORY_KEY, [next, ...current].slice(0, 50))
}

export function loadHistory(): GameHistory[] {
  const raw = readLocalJson<GameHistory[]>(HISTORY_KEY)
  return Array.isArray(raw) ? raw : []
}
