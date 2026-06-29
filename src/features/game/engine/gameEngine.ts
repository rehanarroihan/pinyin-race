import { normalizePinyin } from '../../../lib/pinyin/normalize'
import { INITIAL_GAME_HEARTS } from '../../../app/constants/game'
import type { SetlistItem } from '../../setlists/types'

type GameEntityStatus = 'active' | 'matched' | 'missed'

export type GameEntity = {
  id: string
  hanzi: string
  pinyin: string
  pinyinDisplay: string
  english: string
  x: number
  y: number
  speed: number
  spawnedAt: number
  status: GameEntityStatus
  removeAt?: number
}

export type FailedEntry = {
  hanzi: string
  pinyin: string
  count: number
}

export type GameSnapshot = {
  score: number
  hearts: number
  items: GameEntity[]
  startedAt: number
  isGameOver: boolean
  missed: number
  correct: number
  mostFailed: FailedEntry | null
  missedBreakdown: FailedEntry[]
  boundaryX: number
}

type EngineConfig = {
  getNextWord: () => SetlistItem | null
  onSnapshot: (s: GameSnapshot) => void
  onMatch?: (entities: GameEntity[]) => void
  onMiss?: (entity: GameEntity) => void
  onGameOver?: (s: GameSnapshot) => void
}

type Engine = {
  start: () => void
  stop: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  tryMatch: (raw: string) => boolean
}

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}`
}

export function createGameEngine({
  getNextWord,
  onSnapshot,
  onMatch,
  onMiss,
  onGameOver,
}: EngineConfig): Engine {
  let raf = 0
  let running = false
  let paused = false
  let lastTs = 0
  let nextSpawnAt = 0
  let pausedAt = 0
  let arenaWidth = 900
  let arenaHeight = 420
  const boundaryX = 32
  const entityWidth = 120
  const lanes = 5
  const feedbackDurationMs = 500
  let missCounts = new Map<string, FailedEntry>()

  let snapshot: GameSnapshot = {
    score: 0,
    hearts: INITIAL_GAME_HEARTS,
    items: [],
    startedAt: Date.now(),
    isGameOver: false,
    missed: 0,
    correct: 0,
    mostFailed: null,
    missedBreakdown: [],
    boundaryX,
  }

  function emit() {
    onSnapshot({ ...snapshot, items: snapshot.items.slice() })
  }

  function measureArena() {
    const el = document.querySelector<HTMLElement>('.game-arena')
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width > 0) arenaWidth = Math.max(320, rect.width)
    if (rect.height > 0) arenaHeight = Math.max(240, rect.height)
  }

  function difficulty(tMs: number) {
    const t = Math.min(1, tMs / 90000)
    const spawnIntervalMs = 1600 - 1150 * t
    const baseSpeed = 90 + 160 * t
    return { spawnIntervalMs, baseSpeed }
  }

  function getMissKey(entity: Pick<GameEntity, 'hanzi' | 'pinyinDisplay'>) {
    return `${entity.hanzi}__${entity.pinyinDisplay}`
  }

  function trackMiss(entity: Pick<GameEntity, 'hanzi' | 'pinyinDisplay'>): FailedEntry {
    const key = getMissKey(entity)
    const current = missCounts.get(key)
    const next: FailedEntry = current
      ? { ...current, count: current.count + 1 }
      : { hanzi: entity.hanzi, pinyin: entity.pinyinDisplay, count: 1 }
    missCounts.set(key, next)
    return next
  }

  function spawn(now: number) {
    measureArena()
    const word = getNextWord()
    if (!word) return

    const { baseSpeed } = difficulty(now - snapshot.startedAt)
    const laneHeight = Math.floor((arenaHeight - 40) / lanes)
    const lane = Math.floor(Math.random() * lanes)
    const y = 20 + lane * laneHeight

    const ent: GameEntity = {
      id: uuid(),
      hanzi: word.hanzi,
      pinyin: word.pinyinNormalized,
      pinyinDisplay: word.pinyin,
      english: word.english,
      x: arenaWidth + 80,
      y,
      speed: baseSpeed + Math.random() * 30,
      spawnedAt: now,
      status: 'active',
    }

    snapshot = { ...snapshot, items: [...snapshot.items, ent] }
  }

  function tick(ts: number) {
    if (!running) return
    measureArena()
    if (!lastTs) lastTs = ts
    const dt = Math.min(0.05, (ts - lastTs) / 1000)
    lastTs = ts

    const now = Date.now()
    const { spawnIntervalMs } = difficulty(now - snapshot.startedAt)

    if (now >= nextSpawnAt && !snapshot.isGameOver) {
      nextSpawnAt = now + spawnIntervalMs
      spawn(now)
    }

    if (!snapshot.isGameOver) {
      const moved = snapshot.items.map((it) => {
        if (it.status === 'matched') {
          return { ...it, x: it.x - it.speed * dt }
        }
        if (it.status === 'active') {
          return { ...it, x: it.x - it.speed * dt }
        }
        return it
      })
      const survivors: GameEntity[] = []
      let hearts = snapshot.hearts
      let missed = snapshot.missed
      let mostFailed = snapshot.mostFailed
      let missedBreakdown = snapshot.missedBreakdown

      for (const it of moved) {
        if (it.status === 'matched') {
          if (it.x > -entityWidth) {
            survivors.push(it)
          }
          continue
        }

        if (it.status === 'missed') {
          if ((it.removeAt ?? 0) > now) {
            survivors.push(it)
          }
          continue
        }

        if (it.x <= boundaryX) {
          const failed = trackMiss(it)
          onMiss?.(it)
          hearts = Math.max(0, hearts - 1)
          missed += 1
          mostFailed = !mostFailed || failed.count >= mostFailed.count ? failed : mostFailed
          missedBreakdown = Array.from(missCounts.values()).sort((a, b) => b.count - a.count)
          survivors.push({
            ...it,
            x: boundaryX,
            status: 'missed',
            removeAt: now + feedbackDurationMs,
          })
        } else {
          survivors.push(it)
        }
      }

      const isGameOver = hearts === 0
      snapshot = { ...snapshot, items: survivors, hearts, missed, isGameOver, mostFailed, missedBreakdown }

      if (isGameOver) {
        running = false
        emit()
        onGameOver?.(snapshot)
        return
      }
    }

    emit()
    raf = requestAnimationFrame(tick)
  }

  function start() {
    stop()
    measureArena()
    lastTs = 0
    nextSpawnAt = Date.now() + 600
    running = true
    paused = false
    pausedAt = 0
    raf = requestAnimationFrame(tick)
  }

  function stop() {
    running = false
    paused = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  function pause() {
    if (!running || paused || snapshot.isGameOver) return
    paused = true
    pausedAt = Date.now()
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  function resume() {
    if (!running || !paused || snapshot.isGameOver) return

    const pausedDuration = pausedAt ? Date.now() - pausedAt : 0
    if (pausedDuration > 0) {
      snapshot = {
        ...snapshot,
        startedAt: snapshot.startedAt + pausedDuration,
      }
      nextSpawnAt += pausedDuration
    }

    paused = false
    pausedAt = 0
    lastTs = 0
    raf = requestAnimationFrame(tick)
  }

  function reset() {
    missCounts = new Map()
    snapshot = {
      score: 0,
      hearts: INITIAL_GAME_HEARTS,
      items: [],
      startedAt: Date.now(),
      isGameOver: false,
      missed: 0,
      correct: 0,
      mostFailed: null,
      missedBreakdown: [],
      boundaryX,
    }
    emit()
    start()
  }

  function tryMatch(raw: string): boolean {
    if (snapshot.isGameOver) return false
    const input = normalizePinyin(raw)
    if (!input) return false

    const groups = new Map<string, GameEntity[]>()
    for (const it of snapshot.items) {
      if (it.status !== 'active') continue
      if (it.pinyin !== input) continue
      const existing = groups.get(it.hanzi)
      if (existing) existing.push(it)
      else groups.set(it.hanzi, [it])
    }

    if (groups.size === 0) return false

    let bestHanzi = ''
    let bestMinX = Number.POSITIVE_INFINITY
    for (const [hanzi, items] of groups) {
      let minX = Number.POSITIVE_INFINITY
      for (const it of items) {
        if (it.x < minX) minX = it.x
      }
      if (minX < bestMinX) {
        bestMinX = minX
        bestHanzi = hanzi
      }
    }

    const matchedGroup = groups.get(bestHanzi) ?? []
    if (matchedGroup.length === 0) return false

    const now = Date.now()
    const matchedIds = new Set(matchedGroup.map((it) => it.id))
    const nextItems = snapshot.items.map((it) =>
      matchedIds.has(it.id)
        ? {
            ...it,
            status: 'matched' as const,
          }
        : it,
    )

    const groupSize = matchedGroup.length
    snapshot = {
      ...snapshot,
      items: nextItems,
      score: snapshot.score + groupSize,
      correct: snapshot.correct + groupSize,
    }
    onMatch?.(matchedGroup)
    emit()
    return true
  }

  return { start, stop, pause, resume, reset, tryMatch }
}
