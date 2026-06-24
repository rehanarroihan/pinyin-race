import raw from '../../assets/pinyin.json'
import type { HskLevel } from '../../domain/vocabulary'

export type HskSourceEntry = {
  id: number
  level: HskLevel
  hanzi: string
  pinyin: string
  translations?: { eng?: string[] }
}

export function loadHskEntries(): HskSourceEntry[] {
  return raw as HskSourceEntry[]
}
