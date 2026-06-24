import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { useSetlists } from '../../features/setlists/hooks/useSetlists'

export function SetlistsPage() {
  const navigate = useNavigate()
  const { setlists, createSetlist, deleteSetlist } = useSetlists()

  return (
    <div className="stack">
      <section className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 className="title" style={{ marginBottom: 0 }}>
              Setlists
            </h1>
            <p className="subtitle">HSK 1–6 tersedia, kamu juga bisa bikin sendiri.</p>
          </div>
          <Button onClick={() => navigate(`/setlists/${createSetlist()}`)}>New setlist</Button>
        </div>
      </section>

      <section className="panel stack">
        {setlists.map((s) => (
          <div
            key={s.id}
            className="panel"
            style={{ padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 650 }}>{s.title}</div>
              <div className="muted">{s.items.length} items</div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => navigate(`/setlists/${s.id}`)}>
                Edit
              </Button>
              {!s.builtIn && (
                <Button variant="danger" onClick={() => deleteSetlist(s.id)}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

