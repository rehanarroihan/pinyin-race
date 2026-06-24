export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6

export type VocabularySource = 'hsk' | 'cedict'

export type VocabularyEntry = {
  hanzi: string
  pinyinDisplay: string
  pinyinNormalized: string
  englishDefinitions: string[]
  source: VocabularySource
}

export type HskVocabularyEntry = VocabularyEntry & {
  level: HskLevel
}

