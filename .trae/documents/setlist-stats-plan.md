# Plan: Setlist Stats (Highest Score, Most Success, Most Failed)

## Summary

Tambah section statistik di SetlistEditorPage yang menampilkan highest score (solo & combo), most success entries, dan most failed entries — semua dihitung dari game history. Karena game bisa combine 2+ setlist, stats di-flatten dari semua game yang pernah menyertakan setlist tersebut.

## Current State Analysis

- `GameHistory` ([src/features/game/storage/historyStorage.ts](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/features/game/storage/historyStorage.ts)) menyimpan `setlistIds: string[]` tapi **hanya** `mostFailed` (1 entry) — ga ada per-entry breakdown
- `loadHistory()` ada tapi **tidak dipanggil** di manapun
- `SetlistEditorPage` ([src/pages/SetlistEditorPage/SetlistEditorPage.tsx](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/pages/SetlistEditorPage/SetlistEditorPage.tsx)) cuma edit title/items — ga ada stats
- GameEngine ([src/features/game/engine/gameEngine.ts](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/features/game/engine/gameEngine.ts)) compute `missedBreakdown` tapi **hanya `mostFailed` yang disimpan** ke history

## Problem

Untuk nampilin "most success" dan "most failed" entries (seperti screenshot), kita butuh **per-entry correct & missed counts** dari semua game. Data ini belum ada di `GameHistory` — cuma ada `mostFailed` (1 entry paling sering miss).

## Proposed Changes

### 1. Extend `GameHistory` type — [src/features/game/storage/historyStorage.ts](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/features/game/storage/historyStorage.ts)

Tambah 2 field ke `stats`:

```typescript
type GameHistory = {
  // ... existing fields ...
  stats: {
    correct: number
    missed: number
    mostFailed?: { hanzi, pinyin, count } | null
    // NEW:
    missedBreakdown: FailedEntry[]   // all missed entries, sorted by count desc
    correctBreakdown: FailedEntry[]  // all entries that spawned but weren't missed
  }
}
```

`FailedEntry = { hanzi: string, pinyin: string, count: number }` — reuse type dari `gameEngine.ts` (perlu di-export atau di-duplicate).

**Why:** Tanpa per-entry breakdown, kita ga bisa compute "most success" dan "most failed" dari history. Data ini di-cache di history supaya ga perlu re-compute dari raw game data.

**Migration:** Field baru bersifat optional di老 history entries — code harus handle `undefined` gracefully (fallback ke empty array).

### 2. Update GameEngine & GamePage untuk save breakdown

**GameEngine** ([src/features/game/engine/gameEngine.ts](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/features/game/engine/gameEngine.ts)):
- Engine sudah compute `missedBreakdown` (line 206) — ini sudah di-snapshot
- **Tambah:** Track correct entries — setiap kali entity matched, tambahin ke `correctCounts` Map (similar ke `missCounts`)
- Export `FailedEntry` type (sudah di-export)

**GamePage** ([src/pages/GamePage/GamePage.tsx](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/pages/GamePage/GamePage.tsx)):
- Pass `missedBreakdown` dan `correctBreakdown` ke `appendHistory()` (line 306-316)
- Engine perlu expose `correctBreakdown` di GameSnapshot

**Changes di GameEngine:**
```typescript
// Tambah di tick() saat entity matched:
let correctCounts = new Map<string, FailedEntry>()

// Di tryMatch(), setelah score += groupSize:
for (const it of matchedGroup) {
  const key = getMissKey(it)
  const current = correctCounts.get(key)
  correctCounts.set(key, current
    ? { ...current, count: current.count + 1 }
    : { hanzi: it.hanzi, pinyin: it.pinyinDisplay, count: 1 })
}

// Tambah di snapshot:
correctBreakdown: Array.from(correctCounts.values()).sort((a, b) => b.count - a.count)
```

**Changes di GameSnapshot:**
```typescript
type GameSnapshot = {
  // ... existing ...
  correctBreakdown: FailedEntry[]  // NEW
}
```

**Changes di GamePage `appendHistory`:**
```typescript
appendHistory({
  // ... existing ...
  stats: {
    correct: snapshot.correct,
    missed: snapshot.missed,
    mostFailed: snapshot.mostFailed,
    missedBreakdown: snapshot.missedBreakdown,
    correctBreakdown: snapshot.correctBreakdown,
  },
})
```

### 3. Create stats query utility — NEW: [src/features/game/storage/historyStats.ts](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/features/game/storage/historyStats.ts)

```typescript
type SetlistStats = {
  totalGames: number
  soloBestScore: number | null       // highest score where setlistIds.length === 1
  comboBestScore: number | null      // highest score where setlistIds.length > 1
  overallBestScore: number | null    // highest score overall
  soloGamesPlayed: number
  comboGamesPlayed: number
  comboPartners: { setlistId: string; title: string; gamesPlayed: number }[]
  mostSuccess: EntryStat[]           // top entries by accuracy (correct / total)
  mostFailed: EntryStat[]            // top entries by miss count
}

type EntryStat = {
  hanzi: string
  pinyin: string
  correct: number
  missed: number
  accuracy: number                  // correct / (correct + missed) * 100
  totalMisses: number               // total misses across all games
}

function computeSetlistStats(history: GameHistory[], setlistId: string, allSetlists: Setlist[]): SetlistStats
```

**Algorithm:**
1. Filter `history` → `relevantGames` = games where `setlistIds.includes(targetId)`
2. Split into `soloGames` (length === 1) and `comboGames` (length > 1)
3. Compute highest scores from each group
4. Aggregate per-entry stats from `missedBreakdown` and `correctBreakdown` across all relevant games (sum counts per hanzi key)
5. Compute `comboPartners` from combo games (count co-occurrences with other setlist IDs)

### 4. Add stats section to SetlistEditorPage — [src/pages/SetlistEditorPage/SetlistEditorPage.tsx](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/pages/SetlistEditorPage/SetlistEditorPage.tsx)

Tambah section di **atas** item list (setelah title panel):

```
┌─────────────────────────────────────┐
│ 📊 Stats                            │
│                                     │
│ Highest Score     Games Played      │
│ ┌──────────┐     ┌──────────┐      │
│ │   42     │     │   12     │      │
│ │ (solo)   │     │ (8 solo) │      │
│ │   38     │     │  (4 combo)│     │
│ │ (combo)  │     │          │      │
│ └──────────┘     └──────────┘      │
│                                     │
│ Combo partners: HSK 2 (3x), HSK 3  │
│ (1x)                                │
│                                     │
│ Most success        Accuracy        │
│ ┌─────────────────────────────┐    │
│ │ 机场 · jīchǎng       96%   │    │
│ │ hotel                        │    │
│ └─────────────────────────────┘    │
│ ...                                 │
│                                     │
│ Most failed          Retry          │
│ ┌─────────────────────────────┐    │
│ │ 换钱 · huànqián     12x    │    │
│ │ exchange money               │    │
│ └─────────────────────────────┘    │
│ ...                                 │
└─────────────────────────────────────┘
```

**Implementation:**
- `useEffect` call `loadHistory()` on mount
- `useMemo` compute `computeSetlistStats(history, setlistId, setlists)`
- Render with existing `.panel` classes, top 3 most success / top 3 most failed
- Handle empty state (no games played yet)
- Add CSS for the stats section in a new CSS file or inline styles (follow existing pattern — inline styles in SetlistEditorPage)

### 5. No schema migration needed

Field `missedBreakdown` dan `correctBreakdown` di GameHistory are optional — old entries without them gracefully fall back to empty arrays. No localStorage migration needed.

## Files to Change

| File | Change |
|---|---|
| `src/features/game/storage/historyStorage.ts` | Add `missedBreakdown` & `correctBreakdown` to GameHistory type |
| `src/features/game/engine/gameEngine.ts` | Track correct entries, expose `correctBreakdown` in snapshot, reset it |
| `src/pages/GamePage/GamePage.tsx` | Pass new breakdown fields to `appendHistory()` |
| `src/features/game/storage/historyStats.ts` | **NEW** — `computeSetlistStats()` utility |
| `src/pages/SetlistEditorPage/SetlistEditorPage.tsx` | Add stats section using `loadHistory()` + `computeSetlistStats()` |

## Assumptions & Decisions

1. **Data completeness:** Karena history cuma nyimpen 50 game terakhir, stats mungkin ga lengkap untuk setlist yang udah dimainin banyak kali. Ini acceptable untuk MVP.
2. **Accuracy calculation:** `accuracy = correct / (correct + missed) * 100`. Word yang ga pernah spawn di game manapun ga akan muncul di stats.
3. **Combo partner identification:** Ditunjukkan dari game history, bukan dari real-time selection. Bisa berubah tergantung game history.
4. **Display limit:** Tampilkan top 3 untuk most success dan most failed (expandable nanti).
5. **No new routes/pages:** Semua stats ditampilkan inline di SetlistEditorPage yang ada.

## Verification

1. Main 1 game dengan 1 setlist → cek highest solo score muncul di SetlistEditorPage
2. Main 1 game dengan 2 setlist → cek highest combo score muncul di kedua setlist detail
3. Main beberapa game → cek most success dan most failed entries sesuai
4. Setlist yang belum pernah dimainin → tampil empty state yang sesuai
5. `npm run build` tanpa errors
