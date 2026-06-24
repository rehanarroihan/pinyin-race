import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { ThemeProvider } from './providers/ThemeProvider'
import { AudioSettingsProvider } from './providers/AudioSettingsProvider'
import { SetlistsProvider } from '../features/setlists/hooks/SetlistsProvider'

export default function App() {
  return (
    <ThemeProvider>
      <AudioSettingsProvider>
        <SetlistsProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </SetlistsProvider>
      </AudioSettingsProvider>
    </ThemeProvider>
  )
}
