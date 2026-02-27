'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type TicketSummary = {
  id: string;
  title: string;
  status: string;
  type: string;
  projectId: string;
  assigneeUserId: string | null;
  updatedAt: string;
};

type TicketsResponse = {
  items: TicketSummary[];
  page: number;
  pageSize: number;
  total: number;
};

export default function TicketsPage() {
  const [data, setData] = useState<TicketsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/backend/tickets?view=open', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const json = (await res.json()) as TicketsResponse;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm" href="/tickets/new">
          New Ticket
        </Link>
      </div>

      {loading && <p className="text-slate-600">Loading tickets...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3">
          {data?.items.length ? (
            data.items.map((ticket) => (
              <article className="rounded-md border border-slate-200 bg-white p-4" key={ticket.id}>
                <h2 className="font-medium text-slate-900">{ticket.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {ticket.type} - {ticket.status} - project {ticket.projectId}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  assignee: {ticket.assigneeUserId ?? 'unassigned'} - updated {new Date(ticket.updatedAt).toLocaleString()}
                </p>
              </article>
            ))
          ) : (
            <p className="text-slate-600">No tickets found.</p>
          )}
        </div>
      )}
    </main>
  );
}
