import { useRef, useState, type FocusEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AppRoutes } from './routes'
import { Button } from '../components/Button/Button'
import { useTheme } from './providers/useTheme'
import { useAudioSettings } from './providers/useAudioSettings'
import { CogIcon } from '../lib/icons'

const navItems = [
  { to: '/', label: 'Play' },
  { to: '/setlists', label: 'Setlists' },
]

export function AppShell() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { musicEnabled, sfxEnabled, toggleMusic, toggleSfx } = useAudioSettings()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement | null>(null)

  const handleSettingsBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null

    if (!settingsRef.current?.contains(nextTarget)) {
      setIsSettingsOpen(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__left">
          <Link className="app-brand" to="/">
            Pinyin Race
          </Link>
          <nav className="app-nav" aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.to}
                className={
                  location.pathname === item.to ? 'app-nav__link is-active' : 'app-nav__link'
                }
                to={item.to}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="app-header__right">
          <div
            ref={settingsRef}
            className="app-settings"
            onMouseEnter={() => setIsSettingsOpen(true)}
            onMouseLeave={() => setIsSettingsOpen(false)}
            onFocus={() => setIsSettingsOpen(true)}
            onBlur={handleSettingsBlur}
          >
            <Button
              className="app-settings__trigger"
              variant="ghost"
              type="button"
              aria-label="Settings"
              aria-haspopup="true"
              aria-expanded={isSettingsOpen}
              aria-controls="app-settings-menu"
            >
              <CogIcon />
            </Button>
            {isSettingsOpen && (
              <div id="app-settings-menu" className="app-settings__menu panel stack" aria-label="App settings">
                <div className="app-settings__item">
                  <div>
                    <div style={{ fontWeight: 650 }}>Dark mode</div>
                    <div className="muted">Ubah tema aplikasi.</div>
                  </div>
                  <Button variant={theme === 'dark' ? 'primary' : 'ghost'} type="button" onClick={toggleTheme}>
                    {theme === 'dark' ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="app-settings__item">
                  <div>
                    <div style={{ fontWeight: 650 }}>Music</div>
                    <div className="muted">Setting default music untuk game baru.</div>
                  </div>
                  <Button
                    variant={musicEnabled ? 'primary' : 'ghost'}
                    type="button"
                    onClick={toggleMusic}
                  >
                    {musicEnabled ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="app-settings__item">
                  <div>
                    <div style={{ fontWeight: 650 }}>SFX</div>
                    <div className="muted">Setting default sound effect untuk game baru.</div>
                  </div>
                  <Button variant={sfxEnabled ? 'primary' : 'ghost'} type="button" onClick={toggleSfx}>
                    {sfxEnabled ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="app-main">
        <AppRoutes />
      </main>
    </div>
  )
}
