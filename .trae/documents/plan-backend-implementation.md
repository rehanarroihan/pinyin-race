# Plan: Backend Implementation — Pinyin Race

## Summary

Bangun backend REST API untuk Pinyin Race menggunakan Go (Gin + GORM + PostgreSQL) dari starter template yang sudah ada di `/Users/understd/Documents/Projects/Exercise/pinyin-race-be`. Backend ini akan menyediakan endpoints untuk:
- Auth (register/login — reuse dari starter)
- Custom setlists CRUD per user
- Game history storage
- User preferences (theme, audio settings, selected setlists)
- Leaderboard read endpoints (prebuilt setlists)

**Module path**: `github.com/rehanarroihan/pinyin-race-be`

**Scope**: Backend-only. Frontend integration (optimistic updates, background sync) akan di-plan terpisah.

---

## Decisions & Assumptions

| Decision | Choice | Rationale |
|---|---|---|
| Go module path | `github.com/rehanarroihan/pinyin-race-be` | Sesuai GitHub username |
| Auth | Reuse JWT starter (register/login/JWT token) | Sudah lengkap, tinggal extend |
| Scope | Backend-only, test via Postman/curl | Frontend integration terpisah |
| Future frontend strategy | Optimistic updates, background sync | Game over → langsung tampil hasil, save di belakang |
| Database | PostgreSQL (via GORM, sudah ada di starter) | Sudah terkonfigurasi |
| Redis | Phase 2 (belum implement di phase ini) | Belum butuh untuk skala saat ini |
| Built-in setlists (HSK 1-6) | Serve dari DB (seeded), bukan file statis | Konsisten dengan custom setlists, bisa di-query |

---

## Current State Analysis

### Backend Starter (`pinyin-race-be`)
- Sudah punya: entity `User`, auth JWT (register/login), CRUD user, file upload
- Arsitektur: CSR (Controller-Service-Repository) dengan DI via `samber/do`
- Database: PostgreSQL 16 via Docker, migrasi via GORM AutoMigrate
- Module path saat ini: `github.com/zetsux/gin-gorm-api-starter` (perlu rename)

### Frontend Data yang Perlu Backend API

| Data | Current Storage | Backend Action |
|---|---|---|
| Custom setlists | `pinyin_race_setlists_v1` (localStorage) | CRUD API per user |
| Selected setlist IDs | `pinyin_race_selected_setlists_v1` (localStorage) | GET/PUT per user |
| Game history | `pinyin_race_history_v1` (localStorage, max 50) | POST save, GET list |
| Theme preference | `pinyin_race_theme_v1` (localStorage) | PUT user preference |
| Audio settings | `pinyin_race_audio_settings_v1` (localStorage) | PUT user preference |
| Built-in setlists (HSK 1-6) | Generated from `pinyin.json` at runtime | Seed to DB, GET API |
| Game engine state | In-memory (RAFF) | Tidak perlu backend |

---

## Proposed Changes

### Phase 0: Project Setup & Module Rename

#### 0.1 Rename Go Module
**File**: `go.mod`, semua import paths di seluruh file Go
- Ubah `github.com/zetsux/gin-gorm-api-starter` → `github.com/rehanarroihan/pinyin-race-be`
- Update semua `import` statements di seluruh file `.go`
- Verify: `go build ./...` berhasil

#### 0.2 Update Docker/Env
**File**: `.env.example`, `docker-compose.yml`
- Pastikan konfigurasi DB sesuai kebutuhan
- Tidak perlu Redis di phase ini

#### 0.3 Verify Starter Berjalan
- `make up` → Docker containers up
- `make setup` → migrate + seed
- Test register/login via Postman

---

### Phase 1: Entity & Database Schema

#### 1.1 Setlist Entity
**File**: `core/entity/setlist.go` (new)

```go
type Setlist struct {
    ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
    UserID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"userId"`
    Title     string     `gorm:"not null" json:"title"`
    BuiltIn   bool       `gorm:"not null;default:false;index" json:"builtIn"`
    base.Model

    User  User           `gorm:"foreignKey:UserID" json:"-"`
    Items []SetlistItem  `gorm:"foreignKey:SetlistID;constraint:OnDelete:CASCADE" json:"items"`
}
```

#### 1.2 SetlistItem Entity
**File**: `core/entity/setlist_item.go` (new)

```go
type SetlistItem struct {
    ID              uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
    SetlistID       uuid.UUID `gorm:"type:uuid;not null;index" json:"setlistId"`
    Hanzi           string    `gorm:"not null" json:"hanzi"`
    PinyinDisplay   string    `gorm:"not null" json:"pinyinDisplay"`
    PinyinNormalized string   `gorm:"not null;index" json:"pinyinNormalized"`
    English         string    `gorm:"not null" json:"english"`
    Source          string    `gorm:"not null;default:'user'" json:"source"` // 'hsk' | 'user'
    SortOrder       int       `gorm:"not null;default:0" json:"sortOrder"`
    base.Model
}
```

#### 1.3 GameSession Entity
**File**: `core/entity/game_session.go` (new)

```go
type GameSession struct {
    ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
    UserID       uuid.UUID `gorm:"type:uuid;not null;index" json:"userId"`
    Score        int       `gorm:"not null;default:0" json:"score"`
    DurationMs   int       `gorm:"not null;default:0" json:"durationMs"`
    CorrectCount int       `gorm:"not null;default:0" json:"correctCount"`
    MissedCount  int       `gorm:"not null;default:0" json:"missedCount"`
    PlayedAt     time.Time `gorm:"not null" json:"playedAt"`
    base.Model

    User    User                `gorm:"foreignKey:UserID" json:"-"`
    Setlists []Setlist          `gorm:"many2many:game_session_setlists;" json:"setlists"`
    Missed   []GameSessionMissed `gorm:"foreignKey:GameSessionID;constraint:OnDelete:CASCADE" json:"missed"`
}
```

#### 1.4 GameSessionSetlist (Junction Table)
**File**: `core/entity/game_session_setlist.go` (new)

```go
type GameSessionSetlist struct {
    GameSessionID uuid.UUID `gorm:"type:uuid;primaryKey"`
    SetlistID     uuid.UUID `gorm:"type:uuid;primaryKey"`
}
```

#### 1.5 GameSessionMissed Entity
**File**: `core/entity/game_session_missed.go` (new)

```go
type GameSessionMissed struct {
    ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
    GameSessionID uuid.UUID `gorm:"type:uuid;not null;index" json:"gameSessionId"`
    Hanzi         string    `gorm:"not null" json:"hanzi"`
    Pinyin        string    `gorm:"not null" json:"pinyin"`
    MissCount     int       `gorm:"not null;default:1" json:"missCount"`
    base.Model
}
```

#### 1.6 UserPreferences Entity
**File**: `core/entity/user_preferences.go` (new)

```go
type UserPreferences struct {
    ID                 uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
    UserID             uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"userId"`
    Theme              string    `gorm:"not null;default:'dark'" json:"theme"` // 'light' | 'dark'
    MusicEnabled       bool      `gorm:"not null;default:true" json:"musicEnabled"`
    SfxEnabled         bool      `gorm:"not null;default:true" json:"sfxEnabled"`
    SelectedSetlistIDs []string  `gorm:"type:text[];not null;default:'{}'" json:"selectedSetlistIds"`
    base.Model

    User User `gorm:"foreignKey:UserID" json:"-"`
}
```

#### 1.7 Update Database Migrator
**File**: `database/migrator.go`
- Tambahkan semua entity baru ke `db.AutoMigrate(...)`
- Urutan penting: User → Setlist → SetlistItem → GameSession → GameSessionSetlist → GameSessionMissed → UserPreferences

#### 1.8 HSK Seed Data
**File**: `database/seeder/setlist.go` (new)
- Seed 6 built-in setlists (HSK 1-6) dengan `UserID = nil` atau sentinel UUID
- Baca data dari embedded JSON atau hardcode dari `pinyin.json` yang sudah ada di frontend
- Setiap setlist berisi `SetlistItem[]` dengan `source = 'hsk'`
- Seeder harus idempotent (cek apakah sudah ada sebelum insert)

---

### Phase 2: DTOs, Errors, Messages

#### 2.1 Setlist DTOs
**File**: `core/helper/dto/setlist.go` (new)

```go
type (
    SetlistCreateRequest struct {
        Title string `json:"title" binding:"required"`
    }

    SetlistUpdateRequest struct {
        Title string `json:"title"`
    }

    SetlistItemAddRequest struct {
        Hanzi           string `json:"hanzi" binding:"required"`
        PinyinDisplay   string `json:"pinyinDisplay" binding:"required"`
        PinyinNormalized string `json:"pinyinNormalized" binding:"required"`
        English         string `json:"english" binding:"required"`
        Source          string `json:"source"`
    }

    SetlistResponse struct {
        ID        string              `json:"id"`
        Title     string              `json:"title"`
        BuiltIn   bool                `json:"builtIn"`
        Items     []SetlistItemResponse `json:"items"`
        CreatedAt int64               `json:"createdAt"`  // Unix ms
        UpdatedAt int64               `json:"updatedAt"`
    }

    SetlistItemResponse struct {
        ID              string `json:"id"`
        Hanzi           string `json:"hanzi"`
        PinyinDisplay   string `json:"pinyinDisplay"`
        PinyinNormalized string `json:"pinyinNormalized"`
        English         string `json:"english"`
        Source          string `json:"source"`
        SortOrder       int    `json:"sortOrder"`
    }

    SetlistGetsRequest struct {
        base.PaginationRequest
    }

    SelectedSetlistsRequest struct {
        SetlistIDs []string `json:"setlistIds" binding:"required"`
    }
)
```

#### 2.2 Game History DTOs
**File**: `core/helper/dto/game_session.go` (new)

```go
type (
    GameSessionCreateRequest struct {
        SetlistIDs []string `json:"setlistIds" binding:"required"`
        Score      int      `json:"score" binding:"required"`
        DurationMs int      `json:"durationMs" binding:"required"`
        Correct    int      `json:"correct" binding:"required"`
        Missed     int      `json:"missed" binding:"required"`
        MissedBreakdown []MissedBreakdownItem `json:"missedBreakdown"`
    }

    MissedBreakdownItem struct {
        Hanzi     string `json:"hanzi"`
        Pinyin    string `json:"pinyin"`
        MissCount int    `json:"count"`
    }

    GameSessionResponse struct {
        ID           string                `json:"id"`
        Score        int                   `json:"score"`
        DurationMs   int                   `json:"durationMs"`
        CorrectCount int                   `json:"correctCount"`
        MissedCount  int                   `json:"missedCount"`
        SetlistIDs   []string              `json:"setlistIds"`
        Missed       []MissedBreakdownItem `json:"missedBreakdown"`
        PlayedAt     int64                 `json:"playedAt"`  // Unix ms
    }

    GameSessionGetsRequest struct {
        Limit int `form:"limit"`
        base.PaginationRequest
    }
)
```

#### 2.3 User Preferences DTOs
**File**: `core/helper/dto/user_preferences.go` (new)

```go
type (
    UserPreferencesResponse struct {
        Theme              string   `json:"theme"`
        MusicEnabled       bool     `json:"musicEnabled"`
        SfxEnabled         bool     `json:"sfxEnabled"`
        SelectedSetlistIDs []string `json:"selectedSetlistIds"`
    }

    UserPreferencesUpdateRequest struct {
        Theme              *string  `json:"theme"`
        MusicEnabled       *bool    `json:"musicEnabled"`
        SfxEnabled         *bool    `json:"sfxEnabled"`
        SelectedSetlistIDs []string `json:"setlistIds"`
    }
)
```

#### 2.4 Errors
**File**: `core/helper/errors/setlist.go` (new), `core/helper/errors/game_session.go` (new)

```go
// setlist.go
var (
    ErrSetlistNotFound      = errors.New("setlist not found")
    ErrSetlistItemNotFound  = errors.New("setlist item not found")
    ErrCannotModifyBuiltIn  = errors.New("cannot modify built-in setlist")
    ErrSetlistAccessDenied  = errors.New("setlist access denied")
)

// game_session.go
var (
    ErrGameSessionNotFound = errors.New("game session not found")
)
```

#### 2.5 Messages
**File**: `core/helper/messages/setlist.go` (new), `core/helper/messages/game_session.go` (new), `core/helper/messages/preferences.go` (new)

---

### Phase 3: Repository & Query Interfaces

#### 3.1 Setlist Repository Interface
**File**: `core/interface/repository/setlist.go` (new)

```go
type SetlistRepository interface {
    DB() *gorm.DB
    CreateSetlist(ctx context.Context, tx *gorm.DB, setlist entity.Setlist) (entity.Setlist, error)
    GetSetlistByID(ctx context.Context, tx *gorm.DB, id uuid.UUID) (entity.Setlist, error)
    UpdateSetlist(ctx context.Context, tx *gorm.DB, setlist entity.Setlist) error
    DeleteSetlistByID(ctx context.Context, tx *gorm.DB, id uuid.UUID) error
    AddItem(ctx context.Context, tx *gorm.DB, item entity.SetlistItem) (entity.SetlistItem, error)
    RemoveItem(ctx context.Context, tx *gorm.DB, itemID uuid.UUID) error
    GetItemsBySetlistID(ctx context.Context, tx *gorm.DB, setlistID uuid.UUID) ([]entity.SetlistItem, error)
}
```

#### 3.2 Setlist Query Interface
**File**: `core/interface/query/setlist.go` (new)

```go
type SetlistQuery interface {
    GetSetlistsByUserID(ctx context.Context, userID uuid.UUID, req dto.SetlistGetsRequest) ([]entity.Setlist, base.PaginationResponse, error)
    GetBuiltInSetlists(ctx context.Context) ([]entity.Setlist, error)
}
```

#### 3.3 GameSession Repository Interface
**File**: `core/interface/repository/game_session.go` (new)

```go
type GameSessionRepository interface {
    DB() *gorm.DB
    CreateGameSession(ctx context.Context, tx *gorm.DB, session entity.GameSession) (entity.GameSession, error)
}
```

#### 3.4 GameSession Query Interface
**File**: `core/interface/query/game_session.go` (new)

```go
type GameSessionQuery interface {
    GetGameSessionsByUserID(ctx context.Context, userID uuid.UUID, req dto.GameSessionGetsRequest) ([]entity.GameSession, base.PaginationResponse, error)
}
```

#### 3.5 UserPreferences Repository Interface
**File**: `core/interface/repository/user_preferences.go` (new)

```go
type UserPreferencesRepository interface {
    DB() *gorm.DB
    GetByUserID(ctx context.Context, tx *gorm.DB, userID uuid.UUID) (entity.UserPreferences, error)
    CreateOrUpdate(ctx context.Context, tx *gorm.DB, prefs entity.UserPreferences) error
}
```

---

### Phase 4: Repository & Query Implementations

#### 4.1 Setlist Repository
**File**: `infrastructure/repository/setlist.go` (new)
- Menggunakan generic helper (`Create`, `Update`, `Delete`) dari `generic.go`
- `AddItem` → insert ke `setlist_items`
- `RemoveItem` → delete dari `setlist_items` by ID
- Pastikan `GetSetlistByID` eager-load `Items` via Preload

#### 4.2 Setlist Query
**File**: `infrastructure/query/setlist.go` (new)
- `GetSetlistsByUserID` → filter by `user_id`, eager-load `Items`, pagination
- `GetBuiltInSetlists` → filter `built_in = true`, eager-load `Items`
- Allowed sorts: `id`, `title`, `created_at`, `updated_at`

#### 4.3 GameSession Repository
**File**: `infrastructure/repository/game_session.go` (new)
- `CreateGameSession` → insert game_session + cascade insert missed items + set many2many setlists
- Gunakan transaction untuk atomicity

#### 4.4 GameSession Query
**File**: `infrastructure/query/game_session.go` (new)
- `GetGameSessionsByUserID` → filter by `user_id`, eager-load `Missed` dan `Setlists`, pagination
- Default sort: `-played_at` (terbaru dulu)

#### 4.5 UserPreferences Repository
**File**: `infrastructure/repository/user_preferences.go` (new)
- `GetByUserID` → get by user_id, create default if not exists
- `CreateOrUpdate` → upsert (ON CONFLICT user_id DO UPDATE)

---

### Phase 5: Service Layer

#### 5.1 Setlist Service
**File**: `core/service/setlist.go` (new)

```go
type SetlistService interface {
    GetAllSetlists(ctx context.Context, userID uuid.UUID, req dto.SetlistGetsRequest) ([]dto.SetlistResponse, base.PaginationResponse, error)
    GetBuiltInSetlists(ctx context.Context) ([]dto.SetlistResponse, error)
    GetSetlistByID(ctx context.Context, userID uuid.UUID, setlistID uuid.UUID) (dto.SetlistResponse, error)
    CreateSetlist(ctx context.Context, userID uuid.UUID, req dto.SetlistCreateRequest) (dto.SetlistResponse, error)
    UpdateSetlist(ctx context.Context, userID uuid.UUID, setlistID uuid.UUID, req dto.SetlistUpdateRequest) (dto.SetlistResponse, error)
    DeleteSetlist(ctx context.Context, userID uuid.UUID, setlistID uuid.UUID) error
    AddItem(ctx context.Context, userID uuid.UUID, setlistID uuid.UUID, req dto.SetlistItemAddRequest) (dto.SetlistItemResponse, error)
    RemoveItem(ctx context.Context, userID uuid.UUID, setlistID uuid.UUID, itemID uuid.UUID) error
}
```

Business logic:
- Built-in setlists tidak bisa di-edit/hapus (check `setlist.BuiltIn == true`)
- User hanya bisa akses setlist miliknya sendiri (check `setlist.UserID == userID`)
- `GetAllSetlists` = built-in + custom user

#### 5.2 GameSession Service
**File**: `core/service/game_session.go` (new)

```go
type GameSessionService interface {
    CreateGameSession(ctx context.Context, userID uuid.UUID, req dto.GameSessionCreateRequest) (dto.GameSessionResponse, error)
    GetGameHistory(ctx context.Context, userID uuid.UUID, req dto.GameSessionGetsRequest) ([]dto.GameSessionResponse, base.PaginationResponse, error)
}
```

Business logic:
- Validate setlist IDs exist
- Map `MissedBreakdownItem` → `GameSessionMissed` entities
- Map `SetlistIDs` → `Setlist` entities (for many2many)
- Return response with setlist IDs and missed breakdown

#### 5.3 UserPreferences Service
**File**: `core/service/user_preferences.go` (new)

```go
type UserPreferencesService interface {
    GetPreferences(ctx context.Context, userID uuid.UUID) (dto.UserPreferencesResponse, error)
    UpdatePreferences(ctx context.Context, userID uuid.UUID, req dto.UserPreferencesUpdateRequest) (dto.UserPreferencesResponse, error)
}
```

Business logic:
- Create default preferences if not exists (theme='dark', music=true, sfx=true)
- Partial update: only update fields that are non-nil in request

---

### Phase 6: Controllers

#### 6.1 Setlist Controller
**File**: `api/v1/controller/setlist.go` (new)

```go
type SetlistController interface {
    GetAllSetlists(ctx *gin.Context)
    GetBuiltInSetlists(ctx *gin.Context)
    GetSetlistByID(ctx *gin.Context)
    CreateSetlist(ctx *gin.Context)
    UpdateSetlist(ctx *gin.Context)
    DeleteSetlist(ctx *gin.Context)
    AddItem(ctx *gin.Context)
    RemoveItem(ctx *gin.Context)
}
```

- `GetAllSetlists` / `GetBuiltInSetlists` / `GetSetlistByID` → GET handlers
- `CreateSetlist` → POST, bind `SetlistCreateRequest`
- `UpdateSetlist` → PATCH, bind `SetlistUpdateRequest`
- `DeleteSetlist` → DELETE
- `AddItem` → POST, bind `SetlistItemAddRequest`
- `RemoveItem` → DELETE

Semua authenticated endpoints mengambil `userID` dari context (`ctx.MustGet("ID").(string)`).

#### 6.2 GameSession Controller
**File**: `api/v1/controller/game_session.go` (new)

```go
type GameSessionController interface {
    CreateGameSession(ctx *gin.Context)
    GetGameHistory(ctx *gin.Context)
}
```

#### 6.3 UserPreferences Controller
**File**: `api/v1/controller/user_preferences.go` (new)

```go
type UserPreferencesController interface {
    GetPreferences(ctx *gin.Context)
    UpdatePreferences(ctx *gin.Context)
}
```

---

### Phase 7: Routes

#### 7.1 Setlist Routes
**File**: `api/v1/router/setlist.go` (new)

```
GET    /api/v1/setlists                    → GetAllSetlists (authenticated)
GET    /api/v1/setlists/builtin            → GetBuiltInSetlists (authenticated)
GET    /api/v1/setlists/:setlist_id        → GetSetlistByID (authenticated)
POST   /api/v1/setlists                    → CreateSetlist (authenticated)
PATCH  /api/v1/setlists/:setlist_id        → UpdateSetlist (authenticated)
DELETE /api/v1/setlists/:setlist_id        → DeleteSetlist (authenticated)
POST   /api/v1/setlists/:setlist_id/items  → AddItem (authenticated)
DELETE /api/v1/setlists/:setlist_id/items/:item_id → RemoveItem (authenticated)
```

#### 7.2 GameSession Routes
**File**: `api/v1/router/game_session.go` (new)

```
POST   /api/v1/game/sessions               → CreateGameSession (authenticated)
GET    /api/v1/game/sessions               → GetGameHistory (authenticated)
```

#### 7.3 UserPreferences Routes
**File**: `api/v1/router/user_preferences.go` (new)

```
GET    /api/v1/preferences                 → GetPreferences (authenticated)
PATCH  /api/v1/preferences                 → UpdatePreferences (authenticated)
```

#### 7.4 Register Routes
**File**: `api/v1/router/init.go` (update)
- Tambahkan `SetlistRouter(server, injector)`
- Tambahkan `GameSessionRouter(server, injector)`
- Tambahkan `UserPreferencesRouter(server, injector)`

---

### Phase 8: Dependency Injection

#### 8.1 Setlist DI
**File**: `provider/setlist.go` (new)

```go
func SetupSetlistDependencies(injector *do.Injector) {
    // Repository
    do.Provide(injector, func(i *do.Injector) (repositoryiface.SetlistRepository, error) {
        db := do.MustInvokeNamed[*gorm.DB](i, constant.DBInjectorKey)
        return repository.NewSetlistRepository(db), nil
    })
    // Query
    do.Provide(injector, func(i *do.Injector) (queryiface.SetlistQuery, error) {
        db := do.MustInvokeNamed[*gorm.DB](i, constant.DBInjectorKey)
        return query.NewSetlistQuery(db), nil
    })
    // Service
    do.Provide(injector, func(i *do.Injector) (service.SetlistService, error) {
        setlistR := do.MustInvoke[repositoryiface.SetlistRepository](i)
        setlistQ := do.MustInvoke[queryiface.SetlistQuery](i)
        return service.NewSetlistService(setlistR, setlistQ), nil
    })
    // Controller
    do.Provide(injector, func(i *do.Injector) (controller.SetlistController, error) {
        setlistS := do.MustInvoke[service.SetlistService](i)
        jwtS := do.MustInvoke[service.JWTService](i)
        return controller.NewSetlistController(setlistS, jwtS), nil
    })
}
```

#### 8.2 GameSession DI
**File**: `provider/game_session.go` (new) — pola sama

#### 8.3 UserPreferences DI
**File**: `provider/user_preferences.go` (new) — pola sama

#### 8.4 Update Setup
**File**: `provider/setup.go` (update)
- Tambahkan `SetupSetlistDependencies(injector)`
- Tambahkan `SetupGameSessionDependencies(injector)`
- Tambahkan `SetupUserPreferencesDependencies(injector)`

---

### Phase 9: Testing

#### 9.1 Unit Tests
- `core/service/tests/setlist_test.go` — test business logic (built-in protection, ownership check)
- `core/service/tests/game_session_test.go` — test session creation
- `core/service/tests/user_preferences_test.go` — test default creation, partial update

#### 9.2 Integration Tests
- `tests/integration/setlist/` — full CRUD flow via HTTP
- `tests/integration/game_session/` — create session + history retrieval
- `tests/integration/preferences/` — get + update preferences

---

## File Change Summary

### New Files (Backend)

| File | Purpose |
|---|---|
| `core/entity/setlist.go` | Setlist entity |
| `core/entity/setlist_item.go` | SetlistItem entity |
| `core/entity/game_session.go` | GameSession entity |
| `core/entity/game_session_setlist.go` | Junction table entity |
| `core/entity/game_session_missed.go` | Missed items entity |
| `core/entity/user_preferences.go` | User preferences entity |
| `core/helper/dto/setlist.go` | Setlist DTOs |
| `core/helper/dto/game_session.go` | Game session DTOs |
| `core/helper/dto/user_preferences.go` | Preferences DTOs |
| `core/helper/errors/setlist.go` | Setlist errors |
| `core/helper/errors/game_session.go` | Game session errors |
| `core/helper/messages/setlist.go` | Setlist messages |
| `core/helper/messages/game_session.go` | Game session messages |
| `core/helper/messages/preferences.go` | Preferences messages |
| `core/interface/repository/setlist.go` | Setlist repo interface |
| `core/interface/repository/game_session.go` | Game session repo interface |
| `core/interface/repository/user_preferences.go` | Preferences repo interface |
| `core/interface/query/setlist.go` | Setlist query interface |
| `core/interface/query/game_session.go` | Game session query interface |
| `core/service/setlist.go` | Setlist service |
| `core/service/game_session.go` | Game session service |
| `core/service/user_preferences.go` | Preferences service |
| `infrastructure/repository/setlist.go` | Setlist repo impl |
| `infrastructure/repository/game_session.go` | Game session repo impl |
| `infrastructure/repository/user_preferences.go` | Preferences repo impl |
| `infrastructure/query/setlist.go` | Setlist query impl |
| `infrastructure/query/game_session.go` | Game session query impl |
| `api/v1/controller/setlist.go` | Setlist controller |
| `api/v1/controller/game_session.go` | Game session controller |
| `api/v1/controller/user_preferences.go` | Preferences controller |
| `api/v1/router/setlist.go` | Setlist routes |
| `api/v1/router/game_session.go` | Game session routes |
| `api/v1/router/user_preferences.go` | Preferences routes |
| `provider/setlist.go` | Setlist DI wiring |
| `provider/game_session.go` | Game session DI wiring |
| `provider/user_preferences.go` | Preferences DI wiring |
| `database/seeder/setlist.go` | HSK 1-6 seed data |

### Modified Files (Backend)

| File | Change |
|---|---|
| `go.mod` | Module path rename |
| All `.go` files | Import path rename |
| `database/migrator.go` | Add new entities to AutoMigrate |
| `provider/setup.go` | Register new DI modules |
| `api/v1/router/init.go` | Register new routers |

---

## API Endpoints Summary

### Auth (existing)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/users` | No | Register |
| POST | `/api/v1/users/login` | No | Login |
| GET | `/api/v1/users/me` | Yes | Get current user |

### Setlists
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/setlists` | Yes | Get all setlists (built-in + custom) |
| GET | `/api/v1/setlists/builtin` | Yes | Get built-in setlists only |
| GET | `/api/v1/setlists/:id` | Yes | Get setlist by ID (with items) |
| POST | `/api/v1/setlists` | Yes | Create custom setlist |
| PATCH | `/api/v1/setlists/:id` | Yes | Update setlist title |
| DELETE | `/api/v1/setlists/:id` | Yes | Delete custom setlist |
| POST | `/api/v1/setlists/:id/items` | Yes | Add item to setlist |
| DELETE | `/api/v1/setlists/:id/items/:item_id` | Yes | Remove item from setlist |

### Game Sessions
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/game/sessions` | Yes | Save game session |
| GET | `/api/v1/game/sessions` | Yes | Get game history |

### User Preferences
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/preferences` | Yes | Get user preferences |
| PATCH | `/api/v1/preferences` | Yes | Update user preferences |

---

## Verification Steps

1. **Module rename**: `go build ./...` passes
2. **Docker up**: `make up` starts PostgreSQL + app
3. **Migration**: `make migrate` creates all tables
4. **Seed**: `make seed` creates admin user + HSK 1-6 setlists
5. **Auth flow**: Register → Login → Get token
6. **Setlist CRUD**: Create → Add items → Update title → Delete (with auth)
7. **Built-in protection**: PATCH/DELETE on built-in setlist returns 403
8. **Game session**: POST game result → GET history returns it
9. **Preferences**: GET returns defaults → PATCH updates → GET reflects changes
10. **Ownership**: User A cannot access User B's setlists

---

## Execution Order

1. Phase 0: Module rename + verify starter works
2. Phase 1: Entities + migration + seeder
3. Phase 2: DTOs + errors + messages
4. Phase 3: Repository + query interfaces
5. Phase 4: Repository + query implementations
6. Phase 5: Services
7. Phase 6: Controllers
8. Phase 7: Routes
9. Phase 8: DI wiring + register
10. Phase 9: Testing

Tiap phase bisa di-commit terpisah. Phase 0-8 adalah minimum viable backend. Phase 9 (testing) bisa dilakukan paralel atau setelah.
