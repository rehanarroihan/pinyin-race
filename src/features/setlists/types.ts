export type SetlistItem = {
  hanzi: string
  pinyin: string
  pinyinNormalized: string
  english: string
  source?: 'hsk' | 'user'
}

export type Setlist = {
  id: string
  title: string
  items: SetlistItem[]
  createdAt: number
  updatedAt: number
  builtIn?: boolean
}

export type Recommendation = {
  hanzi: string
  pinyin: string
  pinyinNormalized: string
  english: string
}
