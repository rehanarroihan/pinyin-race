# Plan: Homophone & Duplicate Handling (Pinyin Race)

## Summary
Improve gameplay kalau ada:
- **Homophone**: beberapa hanzi beda tapi `pinyinNormalized` sama (contoh 我/卧 sama-sama `wo`)
- **Duplicate hanzi**: hanzi yang sama muncul beberapa kali di layar

Target behavior (berdasarkan keputusan user):
- Input pinyin tetap **tanpa tone**
- Kalau input match dan di layar ada beberapa hanzi **yang sama**, maka **semua hanzi yang sama** itu hilang bareng (group removal).
- Kalau input match dan di layar ada **lebih dari 1 hanzi berbeda** dengan pinyin sama (homophone), maka yang dihilangkan adalah **kelompok yang paling kiri** dulu, lalu berikutnya.
- Visual hint: pinyin bertone (`pinyinDisplay`) muncul **saat item “otw ilang”** dan juga **saat item matched** (biar learning-nya dapet).
- Spawn: ganti dari pure random menjadi **weighted random** supaya tidak kejadian “ngulang 1 item doang”.
- Setlist editor: **biarkan saja** (no warning/constraint) untuk homophone duplicates.

## Current State Analysis
### Matching (sekarang)
- `tryMatch` di [gameEngine.ts](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/features/game/engine/gameEngine.ts#L274-L314) mencari entity aktif dengan `it.pinyin === input` lalu ambil yang paling kiri (`x` terkecil) dan mark `matched`.
- UI game saat ini **tidak menampilkan pinyin** pada entity bergerak (hanya hanzi), di [GamePage.tsx](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/pages/GamePage/GamePage.tsx).

### Spawn (sekarang)
- `getNextWord` masih `wordPool[Math.floor(Math.random() * wordPool.length)]` di [GamePage.tsx](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/pages/GamePage/GamePage.tsx#L171-L205), raw random.
- Ini berpotensi bias dan bisa “repeat panjang”.

### Data model yang relevan
- `SetlistItem` punya:
  - `pinyin` (display, bertone)
  - `pinyinNormalized` (untuk matching)
  di [setlists/types.ts](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/features/setlists/types.ts).
- `GameEntity` sudah menyimpan `pinyinDisplay` dan `pinyin` (normalized) di [gameEngine.ts](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/features/game/engine/gameEngine.ts).

## Proposed Changes

### 1) Group removal untuk duplicate hanzi + homophone tie-break
**Tujuan**: sekali input pinyin → remove group yang tepat, bukan 1 entity doang.

#### Algorithm (di `tryMatch`)
File: [gameEngine.ts](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/features/game/engine/gameEngine.ts)

1. Normalize input → `inputPinyin = normalizePinyin(raw)`
2. Ambil semua entity aktif yang match pinyin: `candidates = items.filter(active && it.pinyin === inputPinyin)`
3. Kalau kosong → return false
4. Group candidates berdasarkan `hanzi`:
   - `groups: Map<hanzi, GameEntity[]>`
   - Untuk tiap group, hitung `minX = Math.min(...group.map(x))`
5. Pilih **group dengan minX terkecil** (paling kiri)
6. Mark **semua entity dalam group tersebut** jadi `matched` dan set `removeAt = now + feedbackDurationMs`
7. Score:
   - Tambah score sebesar `groupSize` (1 point per entity yang hilang)
   - Tambah `correct` sebesar `groupSize`
8. Callback event:
   - Ubah `onMatch` signature dari `onMatch?: (entity: GameEntity) => void` jadi `onMatch?: (entities: GameEntity[]) => void` supaya UI bisa play SFX sekali (atau multiple kalau nanti mau).

Edge case:
- Kalau di layar ada 我 (x=100) dan 卧 (x=300) dan user input `wo` → group 我 yang hilang dulu (semua 我 yang ada).
- Kalau nanti user input `wo` lagi dan masih ada group 卧 → group itu hilang.

### 2) Visual hint: tampilkan pinyin bertone saat “otw ilang” dan saat matched
File: [GamePage.tsx](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/pages/GamePage/GamePage.tsx) + styling [GamePage.css](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/pages/GamePage/GamePage.css)

#### Rule render pinyin
Tampilkan `it.pinyinDisplay` jika salah satu kondisi terpenuhi:
- `it.status !== 'active'` (matched/missed)
- atau `it.x <= boundaryX + hintDistancePx` (mis. `hintDistancePx = 140`)

UI:
- Tambahkan elemen pinyin kecil di bawah hanzi saat kondisi aktif.
- Style pinyin:
  - `font-family: var(--font-mono)`
  - `opacity` lebih rendah
  - untuk `matched`: warna mengarah ke accent
  - untuk `missed`: warna mengarah ke danger

Catatan: `boundaryX` saat ini internal engine; supaya UI bisa konsisten:
- Option A (simple): duplicate constant `BOUNDARY_X = 32` di UI juga, dan keep sama dengan engine.
- Option B (cleaner): expose via snapshot config (tambahan field `boundaryX` di snapshot).
Plan pilih **Option B** supaya single source of truth.

### 3) Weighted random spawn (mengurangi repetisi “1 item doang”)
File utama: [GamePage.tsx](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/pages/GamePage/GamePage.tsx)

#### Tujuan
- Coverage lebih merata daripada pure random
- Tetap bisa “random feel”
- Bisa menyesuaikan ke performa pemain (mis. yang sering miss muncul lebih sering)

#### Approach
Bikin picker lokal (pure function) yang maintain state per session:
- Input: `SetlistItem[] wordPool`
- State:
  - `lastSeenAtByKey: Map<string, number>` untuk penalize yang baru muncul
  - `missCountByKey: Map<string, number>` untuk boost yang sering lolos/miss (dari engine snapshot `mostFailed`/miss events)
  - `seenCountByKey: Map<string, number>` optional
- Weight formula (contoh):
  - `w = base + a * timeSinceLastSeen + b * missCount`
  - clamp minimal weight biar semua tetap bisa keluar

Integrasi:
- Saat `onMiss` dipanggil engine, update `missCountByKey` untuk entry yang miss.
- `getNextWord` pilih item berdasarkan weighted roulette.

Keying:
- Key per item: `${hanzi}__${pinyinNormalized}` supaya duplicate hanzi/pinyin tetap punya identity konsisten.

### 4) Tidak ubah UX setlist editor untuk homophone duplicates
Karena user pilih “biarkan saja”, tidak perlu warning atau constraint.

## Files to Change (Concrete)
- Update: [gameEngine.ts](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/features/game/engine/gameEngine.ts)
  - Group removal logic di `tryMatch`
  - `onMatch` signature → array
  - Tambah snapshot field untuk expose `boundaryX` (dan optional hint distance)
- Update: [GamePage.tsx](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/pages/GamePage/GamePage.tsx)
  - Render pinyinDisplay based on rule (status != active OR near boundary)
  - Update callback handling `onMatch(entities[])`
  - Implement weighted random picker + wire with onMiss event
- Update: [GamePage.css](file:///Users/understd/Documents/Projects/Exercise/pinyin-race/src/pages/GamePage/GamePage.css)
  - Style pinyin hint
- Optional (nice-to-have, if needed for cleanliness):
  - New helper in `src/lib/random/weightedPick.ts` (pure util)

## Assumptions & Decisions
- Score bertambah **per entity** yang hilang saat group removal (jadi kalau ada 3 我, score +3).
- `pinyinDisplay` yang ditampilkan adalah field yang sudah ada di entity (tone).
- Weighted random diimplementasi **session-local** (tidak persist) dan cuma untuk mencegah repetisi + meningkatkan munculnya item yang sering miss.

## Verification
- Manual:
  - Buat setlist berisi `我 (wǒ)` dan `卧 (wò)` lalu main:
    - Spawn keduanya di layar, ketik `wo` → yang paling kiri hilang (hanya 1 group hanzi).
    - Kalo ada 2x 我 di layar, ketik `wo` → dua-duanya hilang bareng, score nambah 2.
  - Saat item mendekati boundary kiri, pinyin bertone muncul sesaat sebelum hilang.
  - Saat match, pinyin bertone muncul pada item yang matched sebelum fade out.
  - Spawn tidak “nyangkut” di 1 item saja; item lain tetap muncul.
- Automated (lightweight):
  - Tambah unit test kecil untuk fungsi grouping + pick weighted (kalau kita bikin util pure).
  - `npm run lint` dan `npm run build` harus lulus.

