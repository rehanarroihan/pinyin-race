import { searchCedictByPinyin } from '../cedict'
import type { DictProvider } from './types'

export function createHybridProvider(): DictProvider {
  return {
    searchByPinyin: (query: string, limit: number) => {
      return searchCedictByPinyin(query, limit)
    },
  }
}
