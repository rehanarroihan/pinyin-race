import { normalizePinyin } from '../../lib/pinyin/normalize'
import type { HskVocabularyEntry } from '../../domain/vocabulary'
import type { HskSourceEntry } from './loadHsk'

export function mapHskSourceToVocabulary(entry: HskSourceEntry): HskVocabularyEntry {
  return {
    hanzi: entry.hanzi,
    pinyinDisplay: entry.pinyin,
    pinyinNormalized: normalizePinyin(entry.pinyin),
    englishDefinitions: entry.translations?.eng?.filter(Boolean) ?? [],
    source: 'hsk',
    level: entry.level,
  }
}

