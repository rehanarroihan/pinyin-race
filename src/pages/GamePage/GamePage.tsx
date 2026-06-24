import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { INITIAL_GAME_HEARTS, MAX_GAME_PAUSES } from '../../app/constants/game'
import { useSetlists } from '../../features/setlists/hooks/useSetlists'
import { createGameEngine, type GameSnapshot } from '../../features/game/engine/gameEngine'
import { appendHistory } from '../../features/game/storage/historyStorage'
import { useAudioSettings } from '../../app/providers/useAudioSettings'
import { MusicIcon, SfxIcon } from '../../lib/icons'
import correctSfx from '../../assets/sound/correct.mp3'
import gameStartSfx from '../../assets/sound/game_start.mp3'
import gameOverSfx from '../../assets/sound/game_over.mp3'
import inGameMusic from '../../assets/sound/in_game.mp3'
import wrongSfx from '../../assets/sound/wrong.mp3'
import './GamePage.css'

function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) return
  audio.currentTime = 0
  void audio.play().catch(() => {})
}

function stopAudio(audio: HTMLAudioElement | null) {
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
}

function pauseAudio(audio: HTMLAudioElement | null) {
  if (!audio) return
  audio.pause()
}

export function GamePage() {
  const navigate = useNavigate()
  const { getItemsForSelectedSetlists, selectedSetlistIds } = useSetlists()
  const { musicEnabled: globalMusicEnabled, sfxEnabled: globalSfxEnabled } = useAudioSettings()
  const wordPool = useMemo(() => getItemsForSelectedSetlists(), [getItemsForSelectedSetlists])
  const engineRef = useRef<ReturnType<typeof createGameEngine> | null>(null)
  const didSaveRef = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const lastSeenAtRef = useRef(new Map<string, number>())
  const missCountRef = useRef(new Map<string, number>())
  const startAudioRef = useRef<HTMLAudioElement | null>(null)
  const musicAudioRef = useRef<HTMLAudioElement | null>(null)
  const correctAudioRef = useRef<HTMLAudioElement | null>(null)
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null)
  const gameOverAudioRef = useRef<HTMLAudioElement | null>(null)
  const musicEnabledRef = useRef(globalMusicEnabled)
  const sfxEnabledRef = useRef(globalSfxEnabled)
  const isPausedRef = useRef(false)
  const isGameOverRef = useRef(false)
  const didInitMusicToggleRef = useRef(false)
  const didInitSfxToggleRef = useRef(false)

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => ({
    score: 0,
    hearts: INITIAL_GAME_HEARTS,
    items: [],
    startedAt: Date.now(),
    isGameOver: false,
    missed: 0,
    correct: 0,
    mostFailed: null,
    boundaryX: 32,
  }))
  const [input, setInput] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [pauseCount, setPauseCount] = useState(0)
  const [musicEnabled, setMusicEnabled] = useState(() => globalMusicEnabled)
  const [sfxEnabled, setSfxEnabled] = useState(() => globalSfxEnabled)

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      const valueLength = inputRef.current?.value.length ?? 0
      inputRef.current?.setSelectionRange(valueLength, valueLength)
    })
  }, [])

  const applyInputValue = useCallback((nextValue: string) => {
    const sanitized = nextValue.replace(/^\s+/, '')
    setInput(sanitized)
    const matched = engineRef.current?.tryMatch(sanitized) ?? false
    if (matched) {
      setInput('')
    }
  }, [])

  const pickNextWord = useCallback(() => {
    if (wordPool.length === 0) return null
    const now = Date.now()
    const weights: Array<{ cumulative: number; index: number; key: string }> = []
    let total = 0

    for (let i = 0; i < wordPool.length; i++) {
      const item = wordPool[i]
      const key = `${item.hanzi}__${item.pinyinNormalized}`
      const lastSeenAt = lastSeenAtRef.current.get(key) ?? 0
      const timeSinceLastSeen = lastSeenAt > 0 ? now - lastSeenAt : 60_000
      const missCount = missCountRef.current.get(key) ?? 0

      const freshnessBoost = Math.min(3, timeSinceLastSeen / 7000)
      const missBoost = Math.min(8, missCount * 1.2)
      const weight = 1 + freshnessBoost + missBoost

      total += weight
      weights.push({ cumulative: total, index: i, key })
    }

    const r = Math.random() * total
    const picked = weights.find((w) => w.cumulative >= r) ?? weights[weights.length - 1]
    const item = wordPool[picked.index]
    lastSeenAtRef.current.set(picked.key, now)
    return item
  }, [wordPool])

  const startLoopMusic = useCallback(() => {
    if (!musicEnabledRef.current) return
    if (isPausedRef.current || isGameOverRef.current) return
    playAudio(musicAudioRef.current)
  }, [])

  const playGameStartSequence = useCallback(() => {
    stopAudio(startAudioRef.current)
    stopAudio(musicAudioRef.current)

    if (!sfxEnabledRef.current || !startAudioRef.current) {
      startLoopMusic()
      return
    }

    playAudio(startAudioRef.current)
  }, [startLoopMusic])

  useEffect(() => {
    startAudioRef.current = new Audio(gameStartSfx)
    musicAudioRef.current = new Audio(inGameMusic)
    musicAudioRef.current.loop = true
    correctAudioRef.current = new Audio(correctSfx)
    wrongAudioRef.current = new Audio(wrongSfx)
    gameOverAudioRef.current = new Audio(gameOverSfx)

    const handleGameStartEnded = () => {
      startLoopMusic()
    }

    startAudioRef.current.addEventListener('ended', handleGameStartEnded)

    return () => {
      startAudioRef.current?.removeEventListener('ended', handleGameStartEnded)
      stopAudio(startAudioRef.current)
      stopAudio(musicAudioRef.current)
      stopAudio(correctAudioRef.current)
      stopAudio(wrongAudioRef.current)
      stopAudio(gameOverAudioRef.current)
    }
  }, [startLoopMusic])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    isGameOverRef.current = snapshot.isGameOver
  }, [snapshot.isGameOver])

  useEffect(() => {
    musicEnabledRef.current = musicEnabled
    if (!didInitMusicToggleRef.current) {
      didInitMusicToggleRef.current = true
      return
    }

    if (!musicEnabled) {
      stopAudio(musicAudioRef.current)
      return
    }

    if (startAudioRef.current?.paused ?? true) {
      startLoopMusic()
    }
  }, [musicEnabled, startLoopMusic])

  useEffect(() => {
    sfxEnabledRef.current = sfxEnabled
    if (!didInitSfxToggleRef.current) {
      didInitSfxToggleRef.current = true
      return
    }

    if (sfxEnabled) return

    stopAudio(startAudioRef.current)
    stopAudio(correctAudioRef.current)
    stopAudio(wrongAudioRef.current)
    stopAudio(gameOverAudioRef.current)

    if (musicEnabledRef.current) {
      startLoopMusic()
    }
  }, [sfxEnabled, startLoopMusic])

  useEffect(() => {
    if (selectedSetlistIds.length === 0) {
      navigate('/')
      return
    }

    const engine = createGameEngine({
      getNextWord: () => pickNextWord(),
      onSnapshot: setSnapshot,
      onMatch: (_entities) => {
        if (!sfxEnabledRef.current) return
        playAudio(correctAudioRef.current)
      },
      onMiss: (entity) => {
        const key = `${entity.hanzi}__${entity.pinyin}`
        missCountRef.current.set(key, (missCountRef.current.get(key) ?? 0) + 1)
        if (!sfxEnabledRef.current) return
        playAudio(wrongAudioRef.current)
      },
      onGameOver: () => {
        stopAudio(startAudioRef.current)
        stopAudio(musicAudioRef.current)
        if (!sfxEnabledRef.current) return
        playAudio(gameOverAudioRef.current)
      },
    })

    engine.start()
    engineRef.current = engine
    playGameStartSequence()

    return () => {
      engine.stop()
      stopAudio(startAudioRef.current)
      stopAudio(musicAudioRef.current)
    }
  }, [navigate, pickNextWord, playGameStartSequence, selectedSetlistIds.length])

  useEffect(() => {
    if (!snapshot.isGameOver) return
    inputRef.current?.blur()
    setIsPaused(false)
    stopAudio(startAudioRef.current)
    stopAudio(musicAudioRef.current)
  }, [snapshot.isGameOver])

  const resumeGame = useCallback(() => {
    engineRef.current?.resume()
    isPausedRef.current = false
    setIsPaused(false)
    if (musicEnabledRef.current) {
      void musicAudioRef.current?.play().catch(() => {})
    }
    focusInput()
  }, [focusInput])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (snapshot.isGameOver) return

        if (isPaused) {
          event.preventDefault()
          resumeGame()
          return
        }

        if (pauseCount >= MAX_GAME_PAUSES) return

        event.preventDefault()
        engineRef.current?.pause()
        stopAudio(startAudioRef.current)
        pauseAudio(musicAudioRef.current)
        inputRef.current?.blur()
        isPausedRef.current = true
        setPauseCount((current) => current + 1)
        setIsPaused(true)
        return
      }

      if (snapshot.isGameOver || isPaused) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (!/^[a-z]$/i.test(event.key)) return
      if (document.activeElement === inputRef.current) return

      event.preventDefault()
      focusInput()
      applyInputValue(`${input}${event.key}`)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [applyInputValue, focusInput, input, isPaused, pauseCount, resumeGame, snapshot.isGameOver])

  useEffect(() => {
    if (!snapshot.isGameOver || didSaveRef.current) return
    didSaveRef.current = true
    appendHistory({
      playedAt: Date.now(),
      setlistIds: selectedSetlistIds,
      score: snapshot.score,
      durationMs: Date.now() - snapshot.startedAt,
      stats: {
        correct: snapshot.correct,
        missed: snapshot.missed,
        mostFailed: snapshot.mostFailed,
      },
    })
  }, [
    snapshot.mostFailed,
    selectedSetlistIds,
    snapshot.correct,
    snapshot.isGameOver,
    snapshot.missed,
    snapshot.score,
    snapshot.startedAt,
  ])

  if (wordPool.length === 0) {
    return (
      <section className="panel stack">
        <h1 className="title">No words selected</h1>
        <Button onClick={() => navigate('/')}>Back</Button>
      </section>
    )
  }

  return (
    <div className="stack">
      <section className="game-hud panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <div style={{ fontWeight: 650 }}>Score</div>
            <div style={{ fontFamily: 'var(--font-mono)' }}>{snapshot.score}</div>
          </div>
          <div className="row" aria-label="Hearts">
            {Array.from({ length: INITIAL_GAME_HEARTS }).map((_, i) => (
              <div
                key={i}
                className={i < snapshot.hearts ? 'heart is-on' : 'heart is-off'}
              >
                ♥
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="game-arena panel" aria-label="Game arena">
        <div className="game-audio-controls" aria-label="In-game audio controls">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setMusicEnabled((current) => !current)}
            aria-pressed={musicEnabled}
            aria-label={`Music ${musicEnabled ? 'on' : 'off'}`}
            title={`Music ${musicEnabled ? 'on' : 'off'}`}
            className={`game-audio-button ${musicEnabled ? 'is-on' : 'is-off'}`}
          >
            <span className="game-audio-button__icon" aria-hidden="true">
              <MusicIcon />
            </span>
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setSfxEnabled((current) => !current)}
            aria-pressed={sfxEnabled}
            aria-label={`SFX ${sfxEnabled ? 'on' : 'off'}`}
            title={`SFX ${sfxEnabled ? 'on' : 'off'}`}
            className={`game-audio-button ${sfxEnabled ? 'is-on' : 'is-off'}`}
          >
            <span className="game-audio-button__icon" aria-hidden="true">
              <SfxIcon />
            </span>
          </Button>
        </div>
        <div className="game-boundary" aria-hidden="true" />
        {snapshot.items.map((it) => {
          return (
            <div
              key={it.id}
              className={`game-entity ${
                it.status === 'matched'
                  ? 'is-matched'
                  : it.status === 'missed'
                    ? 'is-missed'
                    : ''
              }`}
              style={{ transform: `translate(${it.x}px, ${it.y}px)` }}
              aria-label={`${it.hanzi} ${it.pinyin}`}
            >
              <div className="game-entity__hanzi">
                {it.status === 'matched' ? it.pinyinDisplay : it.hanzi}
              </div>
            </div>
          )
        })}
      </section>

      <section className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 650 }}>Type pinyin</div>
            <div className="muted">Begitu cocok, score langsung masuk dan input di-reset</div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Quit
          </Button>
        </div>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            applyInputValue(e.target.value)
          }}
          disabled={snapshot.isGameOver || isPaused}
          placeholder="e.g. ni hao"
          className="game-input"
          autoFocus
        />

        {isPaused && !snapshot.isGameOver && (
          <div className="game-dialog-backdrop" role="presentation">
            <div className="game-dialog game-dialog--pause panel stack" role="dialog" aria-modal="true">
              <div className="game-dialog__eyebrow">Pause</div>
              <div className="game-dialog__score">{snapshot.score}</div>
              <div className="muted">Current score</div>
              <div className="game-dialog__stats">
                <div className="game-dialog__stat panel">
                  <div style={{ fontWeight: 650 }}>Heart</div>
                  <div className="game-dialog__hearts" aria-label="Current hearts">
                    {Array.from({ length: INITIAL_GAME_HEARTS }).map((_, i) => (
                      <div
                        key={i}
                        className={i < snapshot.hearts ? 'heart is-on' : 'heart is-off'}
                      >
                        ♥
                      </div>
                    ))}
                  </div>
                </div>
                <div className="game-dialog__stat panel">
                  <div style={{ fontWeight: 650 }}>Kesempatan pause</div>
                  <div className="game-dialog__pause-count">
                    {pauseCount}/{MAX_GAME_PAUSES}
                  </div>
                </div>
              </div>
              <div className="muted">Tekan Esc lagi atau klik Resume untuk lanjut main.</div>
              <div className="row">
                <Button
                  onClick={resumeGame}
                >
                  Resume
                </Button>
                <Button variant="ghost" onClick={() => navigate('/')}>
                  Quit
                </Button>
              </div>
            </div>
          </div>
        )}

        {snapshot.isGameOver && (
          <div className="game-dialog-backdrop" role="presentation">
            <div className="game-dialog panel stack" role="dialog" aria-modal="true">
              <div className="game-dialog__eyebrow">Game over</div>
              <div className="game-dialog__score">{snapshot.score}</div>
              <div className="muted">Correct: {snapshot.correct} · Missed: {snapshot.missed}</div>
              <div className="game-dialog__failed panel">
                <div style={{ fontWeight: 650 }}>Most failed</div>
                {snapshot.mostFailed ? (
                  <>
                    <div className="game-dialog__failed-hanzi">{snapshot.mostFailed.hanzi}</div>
                    <div className="muted" style={{ fontFamily: 'var(--font-mono)' }}>
                      {snapshot.mostFailed.pinyin}
                    </div>
                    <div className="muted">{snapshot.mostFailed.count}x missed</div>
                  </>
                ) : (
                  <div className="muted">Belum ada hanzi yang lolos.</div>
                )}
              </div>
              <div className="row">
                <Button
                  onClick={() => {
                    didSaveRef.current = false
                    engineRef.current?.reset()
                    setInput('')
                    setPauseCount(0)
                    setIsPaused(false)
                    playGameStartSequence()
                    inputRef.current?.focus()
                  }}
                >
                  Try again
                </Button>
                <Button variant="ghost" onClick={() => navigate('/setlists')}>
                  Ke set list
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
