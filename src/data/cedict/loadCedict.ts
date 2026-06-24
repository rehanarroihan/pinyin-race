import raw from '../../assets/cedictJSON.json'

export type CedictSourceEntry = {
  traditional: string
  simplified: string
  pinyinRead: string
  pinyinType: string
  definition: string[]
}

export function loadCedictEntries(): CedictSourceEntry[] {
  return raw as CedictSourceEntry[]
}

