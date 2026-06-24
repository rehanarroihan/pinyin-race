import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { useSetlists } from '../../features/setlists/hooks/useSetlists'

export function SetlistEditorPage() {
  const navigate = useNavigate()
  const { setlistId } = useParams<{ setlistId: string }>()
  const { getSetlistById, updateSetlistTitle, removeItem, addItemFromRecommendation, search } =
    useSetlists()
  const setlist = setlistId ? getSetlistById(setlistId) : null

  const [query, setQuery] = useState('')
  const recs = useMemo(() => (query ? search(query) : []), [query, search])

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
