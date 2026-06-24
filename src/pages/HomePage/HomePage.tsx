import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { useSetlists } from '../../features/setlists/hooks/useSetlists'

export function HomePage() {
  const navigate = useNavigate()
  const { setlists, selectedSetlistIds, toggleSelected } = useSetlists()

  const selectedCount = selectedSetlistIds.length

  return (
    <div className="stack">
      <section className="panel">
        <h1 className="title">Practice pinyin by typing</h1>
        <p className="subtitle">Pilih beberapa setlist, lalu mulai game.</p>
        <div className="row" style={{ marginTop: 14 }}>
          <Button onClick={() => navigate('/game')} disabled={selectedCount === 0}>
            Play
          </Button>
          <Link to="/setlists" className="muted">
            Manage setlists
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600 }}>Selected setlists</div>
            <div className="muted">{selectedCount} selected</div>
          </div>
        </div>
        <div className="stack" style={{ marginTop: 12 }}>
          {setlists.map((s) => {
            const selected = selectedSetlistIds.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSelected(s.id)}
                className="panel"
                style={{
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: selected
                    ? 'color-mix(in srgb, var(--accent) 12%, var(--panel))'
                    : undefined,
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>{s.title}</div>
                  <div className="muted">{s.items.length} items</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                  {selected ? 'selected' : ''}
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

