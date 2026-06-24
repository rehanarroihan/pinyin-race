import { useContext } from 'react'
import { AudioSettingsContext } from './AudioSettingsContext'

export function useAudioSettings() {
  const ctx = useContext(AudioSettingsContext)
  if (!ctx) {
    throw new Error('useAudioSettings must be used within AudioSettingsProvider')
  }
  return ctx
}
