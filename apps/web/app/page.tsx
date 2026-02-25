import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">TIBA Portal</h1>
      <p className="mt-2 text-slate-600">Baseline customer portal scaffold.</p>

      <nav className="mt-8 flex gap-4">
        <Link className="rounded-md border border-slate-300 bg-white px-4 py-2" href="/dashboard">
          Go to Dashboard
        </Link>
        <Link className="rounded-md border border-slate-300 bg-white px-4 py-2" href="/tickets">
          Go to Tickets
        </Link>
      </nav>
    </main>
  );
}
