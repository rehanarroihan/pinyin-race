import type { VocabularyEntry } from '../../domain/vocabulary'

export type DictProvider = {
  searchByPinyin: (query: string, limit: number) => VocabularyEntry[]
}
