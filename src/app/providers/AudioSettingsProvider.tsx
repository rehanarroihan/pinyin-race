import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AudioSettingsContext, type AudioSettingsContextValue } from './AudioSettingsContext'

const AUDIO_SETTINGS_STORAGE_KEY = 'pinyin_race_audio_settings_v1'

type StoredAudioSettings = {
  musicEnabled: boolean
  sfxEnabled: boolean
}

function readStoredAudioSettings(): StoredAudioSettings | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAudioSettings>
    if (typeof parsed.musicEnabled !== 'boolean' || typeof parsed.sfxEnabled !== 'boolean') {
      return null
    }
    return {
      musicEnabled: parsed.musicEnabled,
      sfxEnabled: parsed.sfxEnabled,
    }
  } catch {
    return null
  }
}

export function AudioSettingsProvider({ children }: { children: ReactNode }) {
  const [musicEnabled, setMusicEnabledState] = useState<boolean>(
    () => readStoredAudioSettings()?.musicEnabled ?? true,
  )
  const [sfxEnabled, setSfxEnabledState] = useState<boolean>(
    () => readStoredAudioSettings()?.sfxEnabled ?? true,
  )

  useEffect(() => {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        musicEnabled,
        sfxEnabled,
      }),
    )
  }, [musicEnabled, sfxEnabled])

  const setMusicEnabled = useCallback((enabled: boolean) => {
    setMusicEnabledState(enabled)
  }, [])

  const setSfxEnabled = useCallback((enabled: boolean) => {
    setSfxEnabledState(enabled)
  }, [])

  const toggleMusic = useCallback(() => {
    setMusicEnabledState((current) => !current)
  }, [])

  const toggleSfx = useCallback(() => {
    setSfxEnabledState((current) => !current)
  }, [])

  const value = useMemo<AudioSettingsContextValue>(
    () => ({
      musicEnabled,
      sfxEnabled,
      setMusicEnabled,
      setSfxEnabled,
      toggleMusic,
      toggleSfx,
    }),
    [musicEnabled, sfxEnabled, setMusicEnabled, setSfxEnabled, toggleMusic, toggleSfx],
  )

  return <AudioSettingsContext.Provider value={value}>{children}</AudioSettingsContext.Provider>
}
