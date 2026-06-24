import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="panel stack">
      <h1 className="title">Not found</h1>
      <Link to="/" className="muted">
        Back to home
      </Link>
    </section>
  )
}

