# Pinyin Race — Alpha Documentation

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Build & Development](#build--development)
- [Domain Model](#domain-model)
- [Data Layer](#data-layer)
  - [HSK Data Source](#hsk-data-source)
  - [CEDICT Data Source](#cedict-data-source)
  - [Pinyin Normalization](#pinyin-normalization)
  - [Dictionary Provider](#dictionary-provider)
- [Setlists Feature](#setlists-feature)
  - [Types](#setlist-types)
  - [Storage](#setlist-storage)
  - [Context & Provider](#setlist-context--provider)
  - [Mappers](#setlist-mappers)
- [Game Engine](#game-engine)
  - [Engine Configuration](#engine-configuration)
  - [Game Loop (requestAnimationFrame)](#game-loop)
  - [Difficulty Algorithm](#difficulty-algorithm)
  - [Spawn Logic & Weighted Random](#spawn-logic)
  - [Match Algorithm (tryMatch)](#match-algorithm)
  - [Entity Lifecycle](#entity-lifecycle)
  - [Score Calculation](#score-calculation)
- [Game Page](#game-page)
  - [State Management](#game-state-management)
  - [Audio System](#audio-system)
  - [Keyboard Handling](#keyboard-handling)
  - [Game Over & History](#game-over)
- [Theming System](#theming-system)
- [Audio Settings](#audio-settings)
- [Routing](#routing)
- [CSS Class Reference](#css-class-reference)
- [LocalStorage Keys](#localstorage-keys)
- [Constants](#constants)

---

## Overview

Pinyin Race is a web application for practicing Mandarin pinyin typing through a game mechanic. Hanzi characters spawn from the right side of the arena and drift leftward. The user types pinyin (without tones) to match and clear them before they cross the red boundary line. The game features 3 lives, increasing difficulty, weighted random spawning, and audio feedback.

**Key Features:**
- Prebuilt HSK 1–6 setlists (built-in, read-only)
- Custom user setlists with CEDICT-powered search/recommendations
- Multi-select setlists for combined gameplay
- Auto-match input (no Enter key needed)
- Group removal for duplicate hanzi
- Homophone disambiguation (leftmost group wins)
- Game history with per-entry correct/missed breakdown
- Setlist stats (highest score, most success, most failed) from game history
- Light/dark theme support
- Audio: background music + SFX (correct, wrong, game over, game start)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Build tool | Vite 8 |
| Framework | React 19 |
| Language | TypeScript 6 |
| Routing | react-router-dom 7 |
| Persistence | localStorage |
| Styling | CSS (custom properties, no framework) |
| Audio | HTMLAudioElement via Vite asset imports |

---

## Project Structure

```
src/
├── app/
│   ├── App.tsx                          # Root: providers + BrowserRouter
│   ├── AppShell.tsx                     # Layout: nav, settings, Outlet
│   ├── routes.tsx                       # Route definitions
│   ├── constants/
│   │   └── game.ts                      # INITIAL_GAME_HEARTS, MAX_GAME_PAUSES
│   └── providers/
│       ├── ThemeContext.ts              # createContext for theme
│       ├── useTheme.ts                 # useContext hook for theme
│       ├── ThemeProvider.tsx            # Theme state + localStorage sync
│       ├── AudioSettingsContext.ts      # createContext for audio settings
│       ├── useAudioSettings.ts          # useContext hook for audio
│       └── AudioSettingsProvider.tsx    # Audio settings state + localStorage sync
├── assets/
│   ├── pinyin.json                      # HSK 1–6 source data
│   ├── cedictJSON.json                  # CC-CEDICT dictionary data
│   └── sound/
│       ├── correct.mp3
│       ├── wrong.mp3
│       ├── game_over.mp3
│       ├── game_start.mp3
│       └── in_game.mp3
├── components/
│   └── Button/
│       ├── Button.tsx                   # Variants: primary, ghost, danger
│       └── Button.css
├── data/
│   ├── cedict/
│   │   ├── loadCedict.ts                # Import cedictJSON.json, typed as CedictSourceEntry[]
│   │   ├── mappers.ts                   # mapCedictSourceToVocabulary()
│   │   └── index.ts                     # Build index, searchCedictByPinyin()
│   ├── dict/
│   │   ├── types.ts                     # DictProvider interface
│   │   └── hybridProvider.ts            # createHybridProvider() → CEDICT-backed
│   └── hsk/
│       ├── loadHsk.ts                   # Import pinyin.json, typed as HskSourceEntry[]
│       ├── mappers.ts                   # mapHskSourceToVocabulary()
│       └── index.ts                     # Build index, getEntriesByLevel(), searchHskByPinyin()
├── domain/
│   └── vocabulary.ts                    # VocabularyEntry, HskVocabularyEntry, VocabularySource
├── features/
│   ├── game/
│   │   ├── engine/
│   │   │   └── gameEngine.ts            # createGameEngine() — core game logic
│   │   └── storage/
│   │       ├── historyStorage.ts        # appendHistory(), loadHistory(), GameHistory, FailedEntry types
│   │       └── historyStats.ts          # computeSetlistStats() — setlist performance analytics
│   └── setlists/
│       ├── types.ts                     # Setlist, SetlistItem, Recommendation
│       ├── mappers.ts                   # toSetlistItem(), toRecommendation()
│       ├── storage/
│       │   └── setlistsStorage.ts       # loadSetlists(), saveSetlists(), seed HSK 1–6
│       └── hooks/
│           ├── SetlistsContext.ts        # createContext
│           ├── useSetlists.ts           # useContext hook
│           └── SetlistsProvider.tsx      # CRUD, search, selected setlists management
├── lib/
│   ├── icons.tsx                        # CogIcon, MusicIcon, SfxIcon (inline SVG)
│   ├── pinyin/
│   │   └── normalize.ts                # normalizePinyin() — strip tone diacritics
│   └── storage/
│       └── localJson.ts                # readLocalJson(), writeLocalJson()
├── pages/
│   ├── HomePage/
│   │   └── HomePage.tsx                 # Multi-select setlists + Play button
│   ├── SetlistsPage/
│   │   └── SetlistsPage.tsx            # Setlist overview, create/delete
│   ├── SetlistEditorPage/
│   │   └── SetlistEditorPage.tsx        # Edit title, add/remove items, search, stats section
│   ├── GamePage/
│   │   ├── GamePage.tsx                 # Game UI, audio, input, dialogs
│   │   ├── GamePage.css                 # All game-related styles
│   │   └── example-only.html            # Design reference (not used in app)
│   └── NotFoundPage/
│       └── NotFoundPage.tsx
└── styles/
    ├── tokens.css                       # CSS custom properties (light + dark)
    └── global.css                       # Base styles, app-shell layout
```

---

## Build & Development

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Type-check + production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

**Vite config** ([vite.config.ts](../../../vite.config.ts)):
- `resolve.dedupe: ['react', 'react-dom']` — prevents "Invalid hook call" from mismatched React versions in react-router-dom

**TypeScript** ([tsconfig.app.json](../../../tsconfig.app.json)):
- Target: ES2023
- Module: ESNext with bundler resolution
- JSX: react-jsx
- `resolveJsonModule: true` — allows importing `.json` files directly

---

## Domain Model

The app uses a **domain-driven** approach: a neutral `VocabularyEntry` model decouples the UI from raw source formats (HSK JSON, CEDICT JSON).

### `VocabularyEntry` ([src/domain/vocabulary.ts](../../../src/domain/vocabulary.ts))

```typescript
type VocabularySource = 'hsk' | 'cedict'

type VocabularyEntry = {
  hanzi: string           // e.g. "你好"
  pinyinDisplay: string   // toned: "nǐ hǎo"
  pinyinNormalized: string // stripped: "ni hao"
  englishDefinitions: string[]
  source: VocabularySource
}

type HskVocabularyEntry = VocabularyEntry & {
  level: HskLevel  // 1 | 2 | 3 | 4 | 5 | 6
}
```

### `SetlistItem` ([src/features/setlists/types.ts](../../../src/features/setlists/types.ts))

```typescript
type SetlistItem = {
  hanzi: string
  pinyin: string            // toned display pinyin
  pinyinNormalized: string  // stripped for matching
  english: string
  source?: 'hsk' | 'user'
}

type Setlist = {
  id: string
  title: string
  items: SetlistItem[]
  createdAt: number         // Unix timestamp ms
  updatedAt: number
  builtIn?: boolean         // true for HSK 1–6
}
```

### `Recommendation` ([src/features/setlists/types.ts](../../../src/features/setlists/types.ts))

```typescript
type Recommendation = {
  hanzi: string
  pinyin: string
  pinyinNormalized: string
  english: string
}
```

---

## Data Layer

### HSK Data Source

**Source file:** [src/assets/pinyin.json](../../../src/assets/pinyin.json)

**Loader:** [src/data/hsk/loadHsk.ts](../../../src/data/hsk/loadHsk.ts)
- Imports `pinyin.json` via Vite's `resolveJsonModule`
- Returns typed `HskSourceEntry[]`

```typescript
type HskSourceEntry = {
  id: number
  level: HskLevel          // 1–6
  hanzi: string
  pinyin: string
  translations?: { eng?: string[] }
}
```

**Mapper:** [src/data/hsk/mappers.ts](../../../src/data/hsk/mappers.ts)
- `mapHskSourceToVocabulary(entry)` → `HskVocabularyEntry`
- Applies `normalizePinyin()` to generate `pinyinNormalized`

**Index:** [src/data/hsk/index.ts](../../../src/data/hsk/index.ts)
- Lazy-built singleton index (cached after first call)
- Three indexes: `entriesByLevel`, `entriesByPinyin` (normalized → entry[]), `entries` (flat list)
- `getEntriesByLevel(level)` — used to seed built-in setlists
- `searchHskByPinyin(query, limit)` — not actively used in UI (CEDICT is preferred for search)

### CEDICT Data Source

**Source file:** [src/assets/cedictJSON.json](../../../src/assets/cedictJSON.json)

**Loader:** [src/data/cedict/loadCedict.ts](../../../src/data/cedict/loadCedict.ts)

```typescript
type CedictSourceEntry = {
  traditional: string
  simplified: string
  pinyinRead: string       // toned pinyin with spaces: "nǐ hǎo"
  pinyinType: string
  definition: string[]
}
```

**Mapper:** [src/data/cedict/mappers.ts](../../../src/data/cedict/mappers.ts)
- `mapCedictSourceToVocabulary(entry)` → `VocabularyEntry`
- Prefers `simplified` over `traditional` for `hanzi`
- `pinyinDisplay` = `entry.pinyinRead` (the raw toned string from CEDICT)

**Index:** [src/data/cedict/index.ts](../../../src/data/cedict/index.ts)
- Lazy-built singleton with three Map indexes:
  - `entriesByPinyin` — normalized pinyin → `VocabularyEntry[]`
  - `entriesByDisplayPinyin` — lowercased toned pinyin → `VocabularyEntry[]`
  - `entriesByHanzi` — exact hanzi → `VocabularyEntry[]`

**Search priority** in `searchCedictByPinyin(query, limit)`:

1. **Exact hanzi match** — if query contains CJK characters (`/[\u3400-\u9fff]/u`)
2. **Exact toned pinyin match** — e.g., user types "Yīng" → entries with display pinyin "yīng" rank first
3. **Exact normalized pinyin match** — tone-stripped match
4. **Prefix match** — normalized pinyin starts with query
5. **Contains match** — normalized pinyin contains query

Deduplication by `${hanzi}__${pinyinDisplay}` key prevents duplicate results.

### Pinyin Normalization

**File:** [src/lib/pinyin/normalize.ts](../../../src/lib/pinyin/normalize.ts)

```typescript
function normalizePinyin(raw: string): string {
  return raw
    .normalize('NFD')                    // Decompose: "ǐ" → "i" + combining mark
    .replace(/[\u0300-\u036f]/g, '')    // Strip combining diacritical marks
    .replace(/[^a-zA-Z\s]/g, ' ')       // Remove non-alpha, keep spaces
    .toLowerCase()
    .replace(/\s+/g, ' ')               // Collapse whitespace
    .trim()
}
```

Used everywhere: game matching, setlist storage, search indexing.

### Dictionary Provider

**Interface:** [src/data/dict/types.ts](../../../src/data/dict/types.ts)

```typescript
type DictProvider = {
  searchByPinyin: (query: string, limit: number) => VocabularyEntry[]
}
```

**Implementation:** [src/data/dict/hybridProvider.ts](../../../src/data/dict/hybridProvider.ts)
- `createHybridProvider()` — currently delegates to `searchCedictByPinyin()`
- Designed as an abstraction layer so the search backend can be swapped without touching the UI

---

## Setlists Feature

### Setlist Types

See [Domain Model](#domain-model) above.

### Setlist Storage

**File:** [src/features/setlists/storage/setlistsStorage.ts](../../../src/features/setlists/storage/setlistsStorage.ts)

**Built-in setlists** are generated at runtime from HSK data — not persisted to localStorage:

```typescript
function getBuiltInSetlists(): Setlist[] {
  return ([1, 2, 3, 4, 5, 6] as const).map((level) => ({
    id: `hsk-${level}`,
    title: `HSK ${level}`,
    items: getEntriesByLevel(level).map(toSetlistItem),
    createdAt: now,
    updatedAt: now,
    builtIn: true,
  }))
}
```

**Custom setlists** are persisted to localStorage under key `pinyin_race_setlists_v1`. Only custom (non-builtIn) setlists are saved/loaded. Built-in setlists are always regenerated fresh from `pinyin.json`.

**Migration:** On load, each custom setlist item gets `pinyinNormalized` backfilled via `normalizePinyin()` if missing (handles legacy data).

**Selected setlist IDs** are stored separately under `pinyin_race_selected_setlists_v1` as a `string[]`.

### Setlist Context & Provider

**Context:** [src/features/setlists/hooks/SetlistsContext.ts](../../../src/features/setlists/hooks/SetlistsContext.ts)

```typescript
type SetlistsContextValue = {
  setlists: Setlist[]
  selectedSetlistIds: string[]
  toggleSelected: (id: string) => void
  createSetlist: () => string           // returns new setlist ID
  deleteSetlist: (id: string) => void
  getSetlistById: (id: string) => Setlist | null
  updateSetlistTitle: (id: string, title: string) => void
  addItemFromRecommendation: (setlistId: string, r: Recommendation) => void
  removeItem: (setlistId: string, index: number) => void
  search: (query: string) => Recommendation[]
  getItemsForSelectedSetlists: () => SetlistItem[]
}
```

**Provider:** [src/features/setlists/hooks/SetlistsProvider.tsx](../../../src/features/setlists/hooks/SetlistsProvider.tsx)

- Loads setlists and selected IDs from localStorage on mount
- Initializes `dictProvider` via `useMemo(() => createHybridProvider(), [])`
- All mutations call `persistSetlists()` or `persistSelected()` which update both React state and localStorage
- `getItemsForSelectedSetlists()` flattens items from all selected setlists into a single `SetlistItem[]` for the game engine
- Default selected setlist: `['hsk-1']` if nothing is stored

**Hook:** [src/features/setlists/hooks/useSetlists.ts](../../../src/features/setlists/hooks/useSetlists.ts)
- Simple `useContext(SetlistsContext)` wrapper

### Setlist Mappers

**File:** [src/features/setlists/mappers.ts](../../../src/features/setlists/mappers.ts)

- `toSetlistItem(entry: VocabularyEntry)` → `SetlistItem` — used when seeding built-in setlists
- `toRecommendation(entry: VocabularyEntry)` → `Recommendation` — used when displaying search results

---

## Game Engine

**File:** [src/features/game/engine/gameEngine.ts](../../../src/features/game/engine/gameEngine.ts)

### Engine Configuration

```typescript
type EngineConfig = {
  getNextWord: () => SetlistItem | null   // Weighted random word picker
  onSnapshot: (s: GameSnapshot) => void   // Called every frame
  onMatch?: (entities: GameEntity[]) => void  // Trigger SFX
  onMiss?: (entity: GameEntity) => void       // Track miss count
  onGameOver?: (s: GameSnapshot) => void      // Stop music, play SFX
}
```

The engine is a **pure function factory** — `createGameEngine(config)` returns `{ start, stop, pause, resume, reset, tryMatch }`. All state is captured in closures (no class).

### Game Loop

The engine uses `requestAnimationFrame` for smooth 60fps animation.

```
tick(ts)
  ├── Calculate dt = min(0.05, (ts - lastTs) / 1000)   // Cap at 50ms to prevent jumps
  ├── Get difficulty params based on elapsed time
  ├── Spawn new entity if now >= nextSpawnAt
  ├── Move all active + matched entities left: x -= speed * dt
  ├── Process entity states:
  │   ├── matched: keep if x > -entityWidth (still visible), else remove
  │   ├── missed: keep if removeAt > now (fading), else remove
  │   └── active: if x <= boundaryX → mark as missed, decrement heart
  ├── Check game over (hearts === 0)
  └── Emit snapshot → React setState (includes correctBreakdown from correctCounts)
```

### Difficulty Algorithm

**Function:** `difficulty(tMs: number)` where `tMs` = milliseconds since game start.

```typescript
function difficulty(tMs: number) {
  const t = Math.min(1, tMs / 90000)   // Normalized 0→1 over 90 seconds
  const spawnIntervalMs = 1600 - 1150 * t   // 1600ms → 450ms
  const baseSpeed = 90 + 160 * t             // 90px/s → 250px/s
  return { spawnIntervalMs, baseSpeed }
}
```

| Time | Spawn Interval | Base Speed |
|---|---|---|
| 0s (start) | 1600ms | 90 px/s |
| 45s | 1025ms | 170 px/s |
| 90s+ (max) | 450ms | 250 px/s |

Each entity also gets a random speed jitter: `baseSpeed + random() * 30` px/s.

### Spawn Logic

**Weighted random** in `pickNextWord()` (implemented in [GamePage.tsx](../../../src/pages/GamePage/GamePage.tsx)):

```
For each word in pool:
  freshnessBoost = min(3, timeSinceLastSeen / 7000)   // 0–3 weight boost
  missBoost = min(8, missCount * 1.2)                  // 0–8 weight boost
  weight = 1 + freshnessBoost + missBoost

Pick random r in [0, totalWeight)
Return first item where cumulative weight >= r
```

- **Freshness**: Words not seen recently get higher weight (prevents repetition)
- **Miss frequency**: Words the user frequently misses get higher weight (targets weak spots)
- Both are capped to prevent extreme skew

**Lane assignment:** 5 lanes, evenly distributed vertically. Random lane per spawn.

**Spawn position:** `x = arenaWidth + 80` (off-screen right).

### Match Algorithm

**Function:** `tryMatch(raw: string): boolean`

```typescript
function tryMatch(raw: string): boolean {
  1. Normalize input via normalizePinyin(raw)
  2. Find all active entities where pinyin === normalized input
  3. Group candidates by hanzi string
  4. If no groups → return false
  5. Find leftmost group: group with lowest minX entity
  6. Mark ALL entities in that group as 'matched'
  7. Track each matched entity in correctCounts Map (for correctBreakdown)
  8. score += groupSize, correct += groupSize
  9. Return true → input field is cleared
}
```

**Homophone handling example:**
- Screen has: `卧(wo)` at x=400, `我(wo)` at x=200
- User types "wo"
- Both have pinyin "wo" → grouped: `{卧: [ent1], 我: [ent2]}`
- Leftmost group is `我` (x=200) → matched
- `卧` remains active

**Duplicate hanzi handling:**
- Screen has: `我(wo)` at x=300, `我(wo)` at x=500
- User types "wo"
- Grouped: `{我: [ent1, ent2]}` — single group
- Both are marked as matched → score += 2

### Entity Lifecycle

```
spawn → status: 'active'    → moves left at speed px/s
  ↓
[matched] → status: 'matched' → continues moving left at same speed
  │                              → hanzi replaced by toned pinyin
  │                              → gradient background + checkmark icon
  │                              → removed when x < -entityWidth (off-screen)
  ↓
[boundary crossed] → status: 'missed' → stops at x = boundaryX
  │                                      → red background, opacity → 0
  │                                      → heart decremented
  │                                      → removed after 500ms (feedbackDurationMs)
```

### Score Calculation

| Event | Score Change |
|---|---|
| Entity matched | +1 per entity (group of N identical hanzi = +N) |
| Entity missed | No score penalty (only loses 1 heart) |
| Game over | Final score = total matched entities |

**Breakdown tracking:**
- `correctCounts` Map tracks every matched entity (key: `hanzi__pinyin`, value: `FailedEntry`)
- `missCounts` Map tracks every missed entity (same format)
- Both are emitted in the snapshot as `correctBreakdown` and `missedBreakdown` arrays (sorted by count desc)
- On `reset()`, both Maps are cleared and snapshot fields reset to `[]`

---

## Game Page

**File:** [src/pages/GamePage/GamePage.tsx](../../../src/pages/GamePage/GamePage.tsx)

### Game State Management

The page uses a combination of `useState` and `useRef`:

**React state** (triggers re-render):
- `snapshot: GameSnapshot` — engine state, updated every frame via `onSnapshot`
- `input: string` — current pinyin input value
- `isPaused: boolean`
- `pauseCount: number` (max 3)
- `musicEnabled: boolean` / `sfxEnabled: boolean` — local overrides for in-game audio

**Refs** (no re-render, accessed in callbacks):
- `engineRef` — engine instance
- `didSaveRef` — prevents double-saving game history
- `inputRef` — direct DOM access to input element
- `lastSeenAtRef` — `Map<string, number>` for weighted spawn freshness
- `missCountRef` — `Map<string, number>` for weighted spawn miss tracking
- Audio refs: `startAudioRef`, `musicAudioRef`, `correctAudioRef`, `wrongAudioRef`, `gameOverAudioRef`
- `musicEnabledRef` / `sfxEnabledRef` — synced from state, read in engine callbacks (which are stale-closure-safe)
- `isPausedRef` / `isGameOverRef` — synced from state for use in `keydown` handler
- `didInitMusicToggleRef` / `didInitSfxToggleRef` — prevent initial toggle effect from firing

### Audio System

Audio files are imported as Vite asset URLs and instantiated as `HTMLAudioElement`:

```typescript
import correctSfx from '../../assets/sound/correct.mp3'
// → resolved to "/assets/correct-abc123.mp3" at build time
```

**Helper functions** (defined at top of [GamePage.tsx](../../../src/pages/GamePage/GamePage.tsx)):

```typescript
playAudio(audio)   // Reset to 0, play (catch autoplay errors)
stopAudio(audio)   // Pause + reset to 0
pauseAudio(audio)  // Pause only (for music resume)
```

**Audio flow:**
1. Game starts → play `game_start.mp3` SFX
2. `game_start.mp3` ends → start `in_game.mp3` loop
3. Match → play `correct.mp3`
4. Miss → play `wrong.mp3`
5. Game over → stop music, play `game_over.mp3`

**Toggle:** In-game audio toggle buttons override global settings locally. Music toggle pauses/resumes the loop. SFX toggle mutes all short sounds.

### Keyboard Handling

Global `keydown` listener on `window`:

| Key | Action |
|---|---|
| `Escape` | Toggle pause/resume (if not game over, if pauses remaining) |
| `a-z` | Focus input + append character (if not paused/game over) |
| Other keys | Ignored |

When a letter key is pressed and focus is NOT on the input:
1. `preventDefault()` the key event
2. Focus the input element
3. Call `applyInputValue(input + key)` — appends and auto-matches

`applyInputValue` sanitizes leading whitespace, sets state, then calls `engine.tryMatch()`. If matched, clears input.

### Game Over

When `hearts === 0`:
1. Engine stops (`running = false`)
2. `onGameOver` callback fires: stop music, play game over SFX
3. Game over dialog renders with:
   - Score
   - Correct/missed counts
   - Missed breakdown grid (hanzi + pinyin + miss count per entry)
4. History saved to localStorage via `appendHistory()` with:
   - `score`, `durationMs`, `setlistIds`
   - `stats.missedBreakdown` — all missed entries from this game
   - `stats.correctBreakdown` — all correct entries from this game

**"Try again"** button:
- Resets `didSaveRef`, calls `engine.reset()`, clears input, resets pause count
- `engine.reset()` clears miss counts, re-initializes snapshot, calls `start()`

### Game History & Stats

**File:** [src/features/game/storage/historyStorage.ts](../../../src/features/game/storage/historyStorage.ts)

```typescript
type FailedEntry = {
  hanzi: string
  pinyin: string
  count: number
}

type GameHistory = {
  id: string
  playedAt: number
  setlistIds: string[]          // all setlist IDs used in the session
  score: number
  durationMs: number
  stats: {
    correct: number
    missed: number
    mostFailed?: FailedEntry | null
    missedBreakdown?: FailedEntry[]    // all missed entries, sorted by count desc
    correctBreakdown?: FailedEntry[]   // all correct entries, sorted by count desc
  }
}
```

- `appendHistory()` prepends the entry and caps at 50
- `loadHistory()` returns the full array
- `FailedEntry` is re-exported from `historyStorage.ts` and also exported via `gameEngine.ts`
- `missedBreakdown` and `correctBreakdown` are optional for backward-compatibility with older history entries

**Stats utility:** [src/features/game/storage/historyStats.ts](../../../src/features/game/storage/historyStats.ts)

```typescript
type SetlistStats = {
  totalGames: number
  soloBestScore: number | null        // highest score where setlistIds.length === 1
  comboBestScore: number | null       // highest score where setlistIds.length > 1
  overallBestScore: number | null     // highest score overall
  soloGamesPlayed: number
  comboGamesPlayed: number
  comboPartners: { setlistId, title, gamesPlayed }[]
  mostSuccess: EntryStat[]            // top entries by accuracy (correct / total)
  mostFailed: EntryStat[]             // top entries by miss count
}

type EntryStat = {
  hanzi: string
  pinyin: string
  correct: number
  missed: number
  accuracy: number                    // correct / (correct + missed) * 100
  totalMisses: number                 // total misses across all games
}

function computeSetlistStats(history, setlistId, allSetlists): SetlistStats
```

**Algorithm:**
1. Filter history → games where `setlistIds` includes target setlist
2. Split into solo games (length === 1) and combo games (length > 1)
3. Compute highest scores from each group
4. Aggregate per-entry stats from `missedBreakdown` and `correctBreakdown` across all relevant games
5. Compute combo partners from combo games (count co-occurrences with other setlist IDs)
6. Sort most success by accuracy, most failed by miss count

**Setlist Editor Stats UI:** [src/pages/SetlistEditorPage/SetlistEditorPage.tsx](../../../src/pages/SetlistEditorPage/SetlistEditorPage.tsx)

The `StatsSection` component renders above the items list when `totalGames > 0`:
- **Highest Score** card — shows overall best, with solo/combo breakdown
- **Games Played** card — shows total, with solo/combo breakdown
- **Combo partners** — lists setlists frequently played together
- **Most success** — top 5 entries by accuracy percentage (accent-colored)
- **Most failed** — top 5 entries by total miss count (danger-colored)

---

## Theming System

**Context:** [src/app/providers/ThemeContext.ts](../../../src/app/providers/ThemeContext.ts)

```typescript
type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (next: Theme) => void
  toggleTheme: () => void
}
```

**Provider:** [src/app/providers/ThemeProvider.tsx](../../../src/app/providers/ThemeProvider.tsx)

- On mount: reads from localStorage (`pinyin_race_theme_v1`) or falls back to `prefers-color-scheme` media query
- On theme change: sets `document.documentElement.dataset.theme` and `document.documentElement.style.colorScheme`, persists to localStorage

**CSS Variables:** [src/styles/tokens.css](../../../src/styles/tokens.css)

```css
:root {
  --bg, --panel, --text, --muted, --border, --accent, --accent-contrast, --danger, --shadow
  --radius, --radius-sm
  --font-sans, --font-mono
}

:root[data-theme='dark'] {
  /* Dark overrides for all variables */
}
```

---

## Audio Settings

**Context:** [src/app/providers/AudioSettingsContext.ts](../../../src/app/providers/AudioSettingsContext.ts)

```typescript
type AudioSettingsContextValue = {
  musicEnabled: boolean
  sfxEnabled: boolean
  setMusicEnabled: (enabled: boolean) => void
  setSfxEnabled: (enabled: boolean) => void
  toggleMusic: () => void
  toggleSfx: () => void
}
```

**Provider:** [src/app/providers/AudioSettingsProvider.tsx](../../../src/app/providers/AudioSettingsProvider.tsx)

- Stored in localStorage as `pinyin_race_audio_settings_v1` (JSON `{ musicEnabled, sfxEnabled }`)
- Default: both `true`

---

## Routing

**File:** [src/app/routes.tsx](../../../src/app/routes.tsx)

| Path | Component | Description |
|---|---|---|
| `/` | `HomePage` | Multi-select setlists, Play button |
| `/setlists` | `SetlistsPage` | Setlist management overview |
| `/setlists/:setlistId` | `SetlistEditorPage` | Edit setlist title, add/remove items, view stats |
| `/game` | `GamePage` | Active game session |
| `*` | `NotFoundPage` | 404 fallback |

**Provider hierarchy** in [App.tsx](../../../src/app/App.tsx):

```
ThemeProvider
  └── AudioSettingsProvider
        └── SetlistsProvider
              └── BrowserRouter
                    └── AppShell
                          └── Routes
```

---

## CSS Class Reference

### App Shell ([global.css](../../../src/styles/global.css))

| Class | Description |
|---|---|
| `.app-shell` | Root layout: max 1100px, grid with header + content |
| `.app-header` | Sticky top bar with nav + settings |
| `.app-header__left` | Brand + nav links |
| `.app-header__right` | Settings button area |
| `.app-brand` | App title link |
| `.app-nav` | Navigation container |
| `.app-nav__link` | Individual nav link |
| `.app-nav__link.is-active` | Active nav link style |
| `.app-settings` | Settings dropdown container |
| `.app-settings__trigger` | Settings gear button |
| `.app-settings__panel` | Settings dropdown panel |
| `.app-settings__row` | Individual setting row |

### Shared Components

| Class | File | Description |
|---|---|---|
| `.btn` | [Button.css](../../../src/components/Button/Button.css) | Base button |
| `.btn--primary` | | Primary filled button |
| `.btn--ghost` | | Ghost/outline button |
| `.btn--danger` | | Danger red button |
| `.panel` | [global.css](../../../src/styles/global.css) | Card-like container with border + shadow |
| `.stack` | | Vertical flex with gap |
| `.row` | | Horizontal flex with gap |
| `.title` | | Page heading |
| `.subtitle` | | Description text under title |
| `.muted` | | Secondary/muted text color |

### Game HUD ([GamePage.css](../../../src/pages/GamePage/GamePage.css))

| Class | Description |
|---|---|
| `.game-hud` | Score + hearts bar |
| `.heart` | Heart icon base |
| `.heart.is-on` | Active heart (red) |
| `.heart.is-off` | Lost heart (dimmed) |

### Game Arena ([GamePage.css](../../../src/pages/GamePage/GamePage.css))

| Class | Description |
|---|---|
| `.game-arena` | Game container: `overflow: hidden`, `position: relative`, `height: min(56vh, 520px)` |
| `.game-boundary` | Red vertical line at `left: 32px` — the "death zone" boundary |
| `.game-audio-controls` | Bottom-right audio toggle buttons |
| `.game-audio-button` | Circular audio toggle |
| `.game-audio-button.is-off` | Audio off state (with red diagonal line) |
| `.game-audio-button__icon` | SVG icon wrapper |

### Game Entities ([GamePage.css](../../../src/pages/GamePage/GamePage.css))

| Class | Description |
|---|---|
| `.game-entity` | Base entity chip: pill shape (`border-radius: 999px`), `min-width: 78px`, `inline-flex`, positioned via `transform: translate(x, y)` |
| `.game-entity__hanzi` | Hanzi text: 30px, bold, centered |
| `.game-entity__label` | Checkmark icon container: 22px circle, hidden by default |
| `.game-entity.is-matched` | Matched state: gradient background (accent toned), accent border, hanzi → 18px accent color + toned pinyin, checkmark visible |
| `.game-entity.is-missed` | Missed state: red background, red border, `opacity: 0` (fade out) |

### Game Input ([GamePage.css](../../../src/pages/GamePage/GamePage.css))

| Class | Description |
|---|---|
| `.game-input` | Pinyin text input: mono font, rounded |

### Game Dialogs ([GamePage.css](../../../src/pages/GamePage/GamePage.css))

| Class | Description |
|---|---|
| `.game-dialog-backdrop` | Fixed fullscreen overlay with blur |
| `.game-dialog` | Centered dialog card |
| `.game-dialog--pause` | Pause dialog variant (wider) |
| `.game-dialog__eyebrow` | "Game over" / "Pause" label |
| `.game-dialog__score` | Large score number |
| `.game-dialog__failed` | Missed items section |
| `.game-dialog__failed-grid` | Auto-fit grid for missed items |
| `.game-dialog__failed-item` | Individual missed item card |
| `.game-dialog__failed-hanzi` | Large hanzi in missed item |
| `.game-dialog__failed-pinyin` | Mono pinyin in missed item |
| `.game-dialog__stats` | Pause dialog stats grid |
| `.game-dialog__stat` | Individual stat card |
| `.game-dialog__hearts` | Hearts display in pause dialog |
| `.game-dialog__pause-count` | Pause counter (e.g., "2/3") |

---

## LocalStorage Keys

| Key | Type | Description |
|---|---|---|
| `pinyin_race_theme_v1` | `'light' \| 'dark'` | User theme preference |
| `pinyin_race_audio_settings_v1` | `{ musicEnabled: boolean, sfxEnabled: boolean }` | Audio settings |
| `pinyin_race_setlists_v1` | `Setlist[]` | Custom (non-builtIn) setlists only |
| `pinyin_race_selected_setlists_v1` | `string[]` | Selected setlist IDs for gameplay |
| `pinyin_race_history_v1` | `GameHistory[]` | Last 50 game sessions |

---

## Constants

**File:** [src/app/constants/game.ts](../../../src/app/constants/game.ts)

| Constant | Value | Description |
|---|---|---|
| `INITIAL_GAME_HEARTS` | `3` | Starting lives |
| `MAX_GAME_PAUSES` | `3` | Maximum pause attempts per game |

**Engine constants** (hardcoded in [gameEngine.ts](../../../src/features/game/engine/gameEngine.ts)):

| Constant | Value | Description |
|---|---|---|
| `entityWidth` | `192` | Entity chip width in px (for boundary detection) |
| `lanes` | `5` | Number of vertical lanes |
| `feedbackDurationMs` | `500` | How long missed entities remain visible |
| `boundaryX` | `32` | X position of the red boundary line |
