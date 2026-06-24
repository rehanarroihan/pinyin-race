import type { VocabularyEntry } from '../../domain/vocabulary'
import type { Recommendation, SetlistItem } from './types'

export function toRecommendation(entry: VocabularyEntry): Recommendation {
  return {
    hanzi: entry.hanzi,
    pinyin: entry.pinyinDisplay,
    pinyinNormalized: entry.pinyinNormalized,
    english: entry.englishDefinitions.join('; '),
  }
}

export function toSetlistItem(entry: VocabularyEntry): SetlistItem {
  return {
    hanzi: entry.hanzi,
    pinyin: entry.pinyinDisplay,
    pinyinNormalized: entry.pinyinNormalized,
    english: entry.englishDefinitions.join('; '),
    source: entry.source === 'hsk' ? 'hsk' : 'user',
  }
}

