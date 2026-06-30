import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { useSetlists } from '../../features/setlists/hooks/useSetlists'
import { loadHistory } from '../../features/game/storage/historyStorage'
import { computeSetlistStats, type SetlistStats } from '../../features/game/storage/historyStats'

function StatsSection({ stats }: { stats: SetlistStats }) {
  return (
    <section className="panel stack">
      <div style={{ fontWeight: 650 }}>Stats</div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        <div className="panel" style={{ padding: 14 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
            Highest Score
          </div>
          {stats.overallBestScore !== null ? (
            <div style={{ fontSize: 28, fontWeight: 650, fontFamily: 'var(--font-mono)' }}>
              {stats.overallBestScore}
            </div>
          ) : (
            <div className="muted">—</div>
          )}
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {stats.soloBestScore !== null && `Solo: ${stats.soloBestScore}`}
            {stats.soloBestScore !== null && stats.comboBestScore !== null && ' · '}
            {stats.comboBestScore !== null && `Combo: ${stats.comboBestScore}`}
          </div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
            Games Played
          </div>
          <div style={{ fontSize: 28, fontWeight: 650, fontFamily: 'var(--font-mono)' }}>
            {stats.totalGames}
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {stats.soloGamesPlayed > 0 && `${stats.soloGamesPlayed} solo`}
            {stats.soloGamesPlayed > 0 && stats.comboGamesPlayed > 0 && ' · '}
            {stats.comboGamesPlayed > 0 && `${stats.comboGamesPlayed} combo`}
          </div>
        </div>
      </div>

      {stats.comboPartners.length > 0 && (
        <div className="muted" style={{ fontSize: 13 }}>
          Combo partners:{' '}
          {stats.comboPartners.map((p, i) => (
            <span key={p.setlistId}>
              {p.title} ({p.gamesPlayed}x)
              {i < stats.comboPartners.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}

      {stats.mostSuccess.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 650 }}>Most success</div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                padding: '2px 8px',
              }}
            >
              Accuracy
            </div>
          </div>
          <div className="stack">
            {stats.mostSuccess.slice(0, 5).map((e) => (
              <div
                key={`${e.hanzi}__${e.pinyin}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'color-mix(in srgb, var(--panel) 80%, transparent)',
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 650 }}>
                    {e.hanzi} · <span style={{ fontFamily: 'var(--font-mono)' }}>{e.pinyin}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {e.correct} correct · {e.missed} missed
                  </div>
                </div>
                <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 650 }}>
                  {e.accuracy}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.mostFailed.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 650 }}>Most failed</div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                borderRadius: 8,
                padding: '2px 8px',
              }}
            >
              Retry
            </div>
          </div>
          <div className="stack">
            {stats.mostFailed.slice(0, 5).map((e) => (
              <div
                key={`${e.hanzi}__${e.pinyin}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'color-mix(in srgb, var(--panel) 80%, transparent)',
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 650 }}>
                    {e.hanzi} · <span style={{ fontFamily: 'var(--font-mono)' }}>{e.pinyin}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {e.correct} correct · {e.missed} missed
                  </div>
                </div>
                <div style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontWeight: 650 }}>
                  {e.missed} misses
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export function SetlistEditorPage() {
  const navigate = useNavigate()
  const { setlistId } = useParams<{ setlistId: string }>()
  const { getSetlistById, updateSetlistTitle, removeItem, addItemFromRecommendation, search, setlists } =
    useSetlists()
  const setlist = setlistId ? getSetlistById(setlistId) : null

  const [query, setQuery] = useState('')
  const recs = useMemo(() => (query ? search(query) : []), [query, search])

  const [history] = useState(() => loadHistory())
  const stats = useMemo(
    () => (setlistId ? computeSetlistStats(history, setlistId, setlists) : null),
    [history, setlistId, setlists],
  )

  if (!setlist) {
    return (
      <section className="panel stack">
        <h1 className="title">Setlist not found</h1>
        <Link to="/setlists" className="muted">
          Back
        </Link>
      </section>
    )
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <input
              value={setlist.title}
              onChange={(e) => updateSetlistTitle(setlist.id, e.target.value)}
              aria-label="Setlist title"
              style={{
                width: 'min(520px, 100%)',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                fontWeight: 650,
                fontSize: 18,
              }}
              disabled={setlist.builtIn}
            />
            <div className="muted" style={{ marginTop: 6 }}>
              {setlist.items.length} items {setlist.builtIn ? '(built-in)' : ''}
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/setlists')}>
            Done
          </Button>
        </div>
      </section>

      {stats && stats.totalGames > 0 && <StatsSection stats={stats} />}

      {!setlist.builtIn && (
        <section className="panel stack">
          <div style={{ fontWeight: 650 }}>Add item</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type pinyin (no tone), e.g. ni hao"
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
            }}
          />
          {recs.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: 12,
              }}
            >
              {recs.map((r) => (
                <button
                  key={`${r.hanzi}-${r.pinyin}`}
                  type="button"
                  onClick={() => {
                    addItemFromRecommendation(setlist.id, r)
                    setQuery('')
                  }}
                  className="panel"
                  style={{
                    padding: 12,
                    display: 'grid',
                    gridTemplateRows: 'auto 1fr',
                    gap: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    minHeight: 148,
                  }}
                >
                  <div
                    style={{ textAlign: 'left', userSelect: 'text', cursor: 'text' }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ fontSize: 22, fontWeight: 400, userSelect: 'text' }}>{r.hanzi}</div>
                    <div
                      className="muted"
                      style={{ fontFamily: 'var(--font-mono)', userSelect: 'text' }}
                    >
                      {r.pinyin}
                    </div>
                  </div>
                  <div className="muted" style={{ textAlign: 'left' }}>
                    {r.english}
                  </div>
                </button>
              ))}
            </div>
          )}
          {query && recs.length === 0 && <div className="muted">No suggestions</div>}
        </section>
      )}

      <section className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 650 }}>Items</div>
          <div className="muted">Click delete to remove</div>
        </div>

        {setlist.items.map((it, idx) => (
          <div
            key={`${it.hanzi}-${it.pinyin}-${idx}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 160px 1fr auto',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'color-mix(in srgb, var(--panel) 80%, transparent)',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 650, userSelect: 'text' }}>{it.hanzi}</div>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', userSelect: 'text' }}>
              {it.pinyin}
            </div>
            <div className="muted">{it.english}</div>
            {!setlist.builtIn ? (
              <Button variant="danger" onClick={() => removeItem(setlist.id, idx)}>
                Delete
              </Button>
            ) : (
              <div />
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
