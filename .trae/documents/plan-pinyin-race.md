# Plan: Pinyin Race (Vite + React + TS)

## Summary
Bangun web app latihan pinyin dengan gameplay “hanzi berjalan dari kanan ke kiri” (mirip Hanzi Deck). User bisa:
- Manage beberapa setlist (custom + prebuilt HSK 1–6)
- Pilih beberapa setlist sebelum main
- Main game: ketik pinyin (tanpa tone) untuk “nembak” hanzi yang sedang lewat → tambah score
- Punya 3 heart; kalau hanzi lewat batas kiri sebelum ketembak → heart berkurang; 0 heart → game over
- Data setlist & history disimpan lokal (localStorage) supaya tidak hilang saat refresh
- UI simple + elegant + support light/dark mode (toggle)

## Current State Analysis (Repo Nyata)
- Project masih template Vite React TS:
  - Entry: [main.tsx](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/main.tsx) render [App.tsx](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/App.tsx)
  - Styling global: [index.css](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/index.css) sudah pakai CSS variables + `prefers-color-scheme: dark`
- Dependencies saat ini hanya `react`, `react-dom` ([package.json](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/package.json))
- Asset vocab yang tersedia sekarang: [pinyin.json](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/assets/pinyin.json)
  - Struktur array dengan field penting: `hanzi`, `level` (1–6), `pinyin` (ber-tone), `translations.eng[]`

## Decisions & Assumptions (Locked)
- Input pinyin di game: tanpa tone.
- Tidak perlu on-screen keyboard; cukup 1 input field (user bisa ketik + backspace manual).
- “Hybrid dictionary”: tahap awal pakai dataset lokal (HSK 1–6 dari `pinyin.json`), tapi desain modul dictionary dibuat supaya gampang upgrade ke CC-CEDICT.
- Pinyin internal akan dinormalisasi (hapus tone marks, lowercase, rapihin spasi) supaya input tanpa tone tetap bisa match.

## Proposed Architecture & Code Rules (Scalable)
Struktur folder (rule utama: “feature-first”, tiap feature punya UI + logic + types sendiri):

```
src/
  app/
    App.tsx               // router + layout top-level
    routes.tsx            // definisi route
    providers/            // ThemeProvider, dll
  pages/
    HomePage/
    SetlistsPage/
    GamePage/
    NotFoundPage/
  features/
    setlists/
      components/
      hooks/
      storage/
      types.ts
    game/
      components/
      engine/             // loop, spawn, collision/match, difficulty ramp
      hooks/
      types.ts
  components/             // komponen generic lintas fitur (Button, Modal, Card)
  data/
    hsk/                  // loader + index dari pinyin.json (tahap awal)
    dict/                 // interface provider + stub CC-CEDICT provider
  lib/
    storage/              // localStorage wrapper
    pinyin/               // normalize utils
    random/               // RNG util
  styles/
    tokens.css            // CSS variables, theme tokens
    global.css            // base styles
```

Rules pembuatan file:
- Nama komponen: `PascalCase.tsx`, 1 komponen utama per file, export default hanya untuk page-level; komponen lain pakai named export.
- Hooks: `useXxx.ts` (pure logic, tidak render), diletakkan dekat feature (`features/*/hooks`) atau `src/hooks` bila benar-benar global.
- Helpers/utilities: `src/lib/<domain>/...` (mis. `pinyin/normalize.ts`, `storage/localStorage.ts`).
- Routes & layout: hanya di `src/app/*`, page komponen di `src/pages/*`.
- CSS:
  - Global tokens + reset di `src/styles/*`
  - Komponen/feature styling pakai file CSS terpisah per folder (mis. `GamePage.css`) atau CSS Modules (diputuskan saat eksekusi setelah lihat preferensi styling yang paling enak di repo).

## Data Model (Draft)
### Dictionary entry (dari `pinyin.json`)
```ts
type HskEntry = {
  id: number
  level: 1 | 2 | 3 | 4 | 5 | 6
  hanzi: string
  pinyin: string
  translations?: { eng?: string[] }
}
```

### Setlist
```ts
type SetlistItem = {
  hanzi: string
  pinyin: string           // sudah dinormalisasi (tanpa tone)
  english: string          // 1 string ringkas untuk display
  source?: 'hsk' | 'user'
}

type Setlist = {
  id: string
  title: string
  items: SetlistItem[]
  createdAt: number
  updatedAt: number
  builtIn?: boolean        // true untuk HSK 1-6
}
```

### Game session history (lokal)
```ts
type GameHistory = {
  id: string
  playedAt: number
  setlistIds: string[]
  score: number
  durationMs: number
  stats?: { correct: number; missed: number }
}
```

## UX Flows
### 1) Home (pre-game)
- List setlists (built-in HSK 1–6 + custom)
- Multi-select setlist untuk dimainkan
- Tombol “Play”

### 2) Setlist editor
- Create setlist (title)
- Add item:
  - User ketik pinyin (tanpa tone)
  - Tampilkan rekomendasi dari dictionary (match prefix/contains)
  - User pilih satu rekomendasi → autofill `hanzi`, pinyin normalized, english meaning (gabung `translations.eng`)
- Edit/remove item

### 3) Game
- Arena: hanzi muncul dari kanan dan bergerak ke kiri
- Input pinyin di bawah
- Saat input “commit” (Enter atau auto-check saat berubah—diputuskan di implementasi) dan ada hanzi cocok di layar:
  - Remove hanzi yang cocok (prioritas: yang paling dekat ke kiri / paling “urgent”)
  - Tambah score (+1, bisa ditambah combo di tahap lanjut)
  - Clear input
- Kalau hanzi melewati batas kiri:
  - Heart -1, hanzi dihapus, “miss” +1
- Game over saat heart = 0, tampilkan summary + “Play again”

## Core Implementation Details
### A) Dictionary module (Hybrid-ready)
File yang dibuat:
- `src/data/dict/types.ts`: interface provider
  - `searchByPinyin(query: string, limit: number)`
  - `getByHanzi(hanzi: string)` (optional untuk future)
- `src/data/hsk/loadHsk.ts`: import `pinyin.json`, map ke `HskEntry[]`
- `src/data/hsk/index.ts`: build index:
  - `pinyinNormalized -> HskEntry[]`
  - `level -> HskEntry[]` untuk prebuilt HSK 1–6
- `src/data/dict/hybridProvider.ts`: provider awal pakai index HSK; placeholder untuk CC-CEDICT provider nantinya

Pinyin normalize:
- Buat `src/lib/pinyin/normalize.ts`
  - Remove diacritics (NFD + strip combining marks)
  - Lowercase
  - Trim dan normalisasi spasi (mis. `bà ba` → `ba ba`)
  - Optional: remove punctuation

### B) Local persistence
- `src/lib/storage/localJson.ts`: wrapper aman untuk `localStorage.getItem/setItem` + JSON parse fallback
- `src/features/setlists/storage/setlistsStorage.ts`
  - Key: `pinyin_race_setlists_v1`
  - Seed built-in setlists HSK 1–6 pada first-run (dibentuk dari `level` filter)
- `src/features/game/storage/historyStorage.ts`
  - Key: `pinyin_race_history_v1`

### C) Routing + Layout + Theme
- Tambah dependency: `react-router-dom`
- `src/app/routes.tsx`: definisi route:
  - `/` HomePage
  - `/setlists` SetlistsPage
  - `/game` GamePage (require selected setlists state, fallback redirect ke Home)
- `src/app/providers/ThemeProvider.tsx`:
  - Simpan theme user di localStorage (key `pinyin_race_theme_v1`)
  - Terapkan theme dengan `data-theme="light|dark"` pada `document.documentElement`
- `src/app/App.tsx`: header minimal (title, nav, theme toggle) + outlet

### D) Game engine (DOM-based)
Entity:
```ts
type FallingHanzi = {
  id: string
  hanzi: string
  pinyin: string          // normalized
  english: string
  x: number
  y: number
  speed: number           // px/s
  spawnedAt: number
}
```

Engine loop:
- Gunakan `requestAnimationFrame`
- Simpan `lastTs`, update posisi pakai delta time
- Spawn scheduler:
  - `spawnIntervalMs` menurun seiring waktu (difficulty ramp)
  - `baseSpeed` naik perlahan seiring waktu
- “Lanes” (mis. 4–6 baris) untuk positioning `y` biar rapih dan readable

Matching:
- Saat user submit input:
  - normalize input
  - cari entity aktif dengan `entity.pinyin === input`
  - pilih yang `x` paling kecil (paling dekat kiri)
  - remove entity, score++
  - clear input

Miss detection:
- Jika `x <= leftBoundary`:
  - remove entity
  - heart--

### E) UI styling
- Migrasi `src/index.css` jadi:
  - `src/styles/tokens.css` (CSS variables untuk light/dark)
  - `src/styles/global.css` (layout, typography)
- Buat komponen UI kecil reusable:
  - `Button`, `Card`, `Modal` (opsional) tanpa library tambahan

## File-Level Change List (Concrete)
Create / update (ringkas):
- Update: `src/main.tsx` untuk pakai `src/app/App.tsx`
- Create: `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/providers/ThemeProvider.tsx`
- Create: pages `src/pages/*`
- Create: dictionary & hsk indexing `src/data/*`
- Create: local storage utilities `src/lib/storage/*`
- Create: pinyin normalize `src/lib/pinyin/normalize.ts`
- Create: game feature `src/features/game/*`
- Create: setlists feature `src/features/setlists/*`
- Update styling: `src/styles/*`, update import CSS di entry
- Update dependencies: add `react-router-dom` (+ types jika perlu)

## Verification (Definition of Done)
- App jalan di `npm run dev` tanpa error TypeScript/lint.
- Home:
  - Setlists built-in HSK 1–6 muncul dan bisa dipilih multi-select.
- Setlists:
  - Bisa create setlist baru, tambah item via rekomendasi dari dictionary, data persist setelah refresh.
- Game:
  - Hanzi spawn & bergerak; makin lama makin cepat/ramai.
  - Ketik pinyin yang benar bisa menghilangkan hanzi + nambah score.
  - Hanzi yang lolos batas kiri mengurangi heart.
  - Game over saat heart habis, ada summary.
- Theme:
  - Toggle light/dark bekerja dan persist setelah refresh.

