import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-4xl">🧭❓</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-800">
        ← Back to all events
      </Link>
    </div>
  );
}
