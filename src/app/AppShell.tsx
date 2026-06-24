import { useRef, useState, type FocusEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AppRoutes } from './routes'
import { Button } from '../components/Button/Button'
import { useTheme } from './providers/useTheme'
import { useAudioSettings } from './providers/useAudioSettings'

const navItems = [
  { to: '/', label: 'Play' },
  { to: '/setlists', label: 'Setlists' },
]

function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M10.73 2.79a1 1 0 0 1 2.54 0l.2 1.25a8.05 8.05 0 0 1 1.98.82l1.08-.67a1 1 0 0 1 1.73 1l-.36 1.22c.6.53 1.11 1.14 1.49 1.84l1.26-.03a1 1 0 0 1 .78 1.34l-.44 1.18c.1.4.15.8.15 1.22s-.05.82-.15 1.22l.44 1.18a1 1 0 0 1-.78 1.34l-1.26-.03a8.01 8.01 0 0 1-1.49 1.84l.36 1.22a1 1 0 0 1-1.73 1l-1.08-.67a8.05 8.05 0 0 1-1.98.82l-.2 1.25a1 1 0 0 1-2.54 0l-.2-1.25a8.05 8.05 0 0 1-1.98-.82l-1.08.67a1 1 0 0 1-1.73-1l.36-1.22a8.01 8.01 0 0 1-1.49-1.84l-1.26.03a1 1 0 0 1-.78-1.34l.44-1.18A5.22 5.22 0 0 1 3 12c0-.42.05-.82.15-1.22l-.44-1.18a1 1 0 0 1 .78-1.34l1.26.03c.38-.7.89-1.31 1.49-1.84l-.36-1.22a1 1 0 0 1 1.73-1l1.08.67a8.05 8.05 0 0 1 1.98-.82l.2-1.25ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
        fill="currentColor"
      />
    </svg>
  )
}

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
