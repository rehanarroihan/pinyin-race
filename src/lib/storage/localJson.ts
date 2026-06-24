export function readLocalJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeLocalJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

