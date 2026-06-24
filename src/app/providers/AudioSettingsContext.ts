import { createContext } from 'react'

export type AudioSettingsContextValue = {
  musicEnabled: boolean
  sfxEnabled: boolean
  setMusicEnabled: (enabled: boolean) => void
  setSfxEnabled: (enabled: boolean) => void
  toggleMusic: () => void
  toggleSfx: () => void
}

export const AudioSettingsContext = createContext<AudioSettingsContextValue | null>(null)
