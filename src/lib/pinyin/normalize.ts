export function normalizePinyin(raw: string): string {
  const noTone = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .toLowerCase()
  return noTone.replace(/\s+/g, ' ').trim()
}

