import type { VocabularyEntry } from '../../domain/vocabulary'
import { normalizePinyin } from '../../lib/pinyin/normalize'
import type { CedictSourceEntry } from './loadCedict'

export function mapCedictSourceToVocabulary(entry: CedictSourceEntry): VocabularyEntry {
  return {
    hanzi: entry.simplified || entry.traditional,
    pinyinDisplay: entry.pinyinRead,
    pinyinNormalized: normalizePinyin(entry.pinyinRead),
    englishDefinitions: entry.definition.filter(Boolean),
    source: 'cedict',
  }
}

