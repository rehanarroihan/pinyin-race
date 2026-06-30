import type { GameHistory, FailedEntry } from './historyStorage'
import type { Setlist } from '../../setlists/types'

export type EntryStat = {
  hanzi: string
  pinyin: string
  correct: number
  missed: number
  accuracy: number
  totalMisses: number
}

export type ComboPartner = {
  setlistId: string
  title: string
  gamesPlayed: number
}

export type SetlistStats = {
  totalGames: number
  soloBestScore: number | null
  comboBestScore: number | null
  overallBestScore: number | null
  soloGamesPlayed: number
  comboGamesPlayed: number
  comboPartners: ComboPartner[]
  mostSuccess: EntryStat[]
  mostFailed: EntryStat[]
}

const EMPTY_STATS: SetlistStats = {
  totalGames: 0,
  soloBestScore: null,
  comboBestScore: null,
  overallBestScore: null,
  soloGamesPlayed: 0,
  comboGamesPlayed: 0,
  comboPartners: [],
  mostSuccess: [],
  mostFailed: [],
}

function aggregateEntries(
  entries: FailedEntry[] | undefined,
  acc: Map<string, { hanzi: string; pinyin: string; count: number }>,
) {
  if (!entries) return
  for (const e of entries) {
    const key = `${e.hanzi}__${e.pinyin}`
    const current = acc.get(key)
    if (current) {
      current.count += e.count
    } else {
      acc.set(key, { hanzi: e.hanzi, pinyin: e.pinyin, count: e.count })
    }
  }
}

export function computeSetlistStats(
  history: GameHistory[],
  setlistId: string,
  allSetlists: Setlist[],
): SetlistStats {
  const relevant = history.filter((g) => g.setlistIds.includes(setlistId))
  if (relevant.length === 0) return EMPTY_STATS

  const soloGames = relevant.filter((g) => g.setlistIds.length === 1)
  const comboGames = relevant.filter((g) => g.setlistIds.length > 1)

  const soloBestScore = soloGames.length > 0
    ? Math.max(...soloGames.map((g) => g.score))
    : null
  const comboBestScore = comboGames.length > 0
    ? Math.max(...comboGames.map((g) => g.score))
    : null
  const overallBestScore = Math.max(...relevant.map((g) => g.score))

  // Combo partners
  const partnerCounts = new Map<string, number>()
  for (const g of comboGames) {
    for (const id of g.setlistIds) {
      if (id === setlistId) continue
      partnerCounts.set(id, (partnerCounts.get(id) ?? 0) + 1)
    }
  }
  const setlistMap = new Map(allSetlists.map((s) => [s.id, s.title]))
  const comboPartners: ComboPartner[] = Array.from(partnerCounts.entries())
    .map(([id, count]) => ({
      setlistId: id,
      title: setlistMap.get(id) ?? id,
      gamesPlayed: count,
    }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)

  // Aggregate per-entry stats
  const missedAgg = new Map<string, { hanzi: string; pinyin: string; count: number }>()
  const correctAgg = new Map<string, { hanzi: string; pinyin: string; count: number }>()

  for (const g of relevant) {
    aggregateEntries(g.stats.missedBreakdown, missedAgg)
    aggregateEntries(g.stats.correctBreakdown, correctAgg)
  }

  // Merge into EntryStat[]
  const entryMap = new Map<string, EntryStat>()

  for (const [key, m] of missedAgg) {
    entryMap.set(key, {
      hanzi: m.hanzi,
      pinyin: m.pinyin,
      correct: 0,
      missed: m.count,
      accuracy: 0,
      totalMisses: m.count,
    })
  }

  for (const [key, c] of correctAgg) {
    const existing = entryMap.get(key)
    if (existing) {
      existing.correct = c.count
      existing.accuracy = Math.round((c.count / (c.count + existing.missed)) * 100)
    } else {
      entryMap.set(key, {
        hanzi: c.hanzi,
        pinyin: c.pinyin,
        correct: c.count,
        missed: 0,
        accuracy: 100,
        totalMisses: 0,
      })
    }
  }

  const allEntries = Array.from(entryMap.values())

  // Most success: highest accuracy (min 1 correct), then most correct
  const mostSuccess = allEntries
    .filter((e) => e.correct > 0)
    .sort((a, b) => b.accuracy - a.accuracy || b.correct - a.correct)

  // Most failed: highest miss count
  const mostFailed = allEntries
    .filter((e) => e.missed > 0)
    .sort((a, b) => b.missed - a.missed)

  return {
    totalGames: relevant.length,
    soloBestScore,
    comboBestScore,
    overallBestScore,
    soloGamesPlayed: soloGames.length,
    comboGamesPlayed: comboGames.length,
    comboPartners,
    mostSuccess,
    mostFailed,
  }
}
