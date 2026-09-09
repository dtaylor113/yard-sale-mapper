import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-4xl">🧭❓</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to="/" className="btn-text mt-5 inline-block text-sm">
        ← Back to all events
      </Link>
    </div>
  );
}
