'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { InternalTicketQueue } from '@/components/tickets/internal-ticket-queue';
import { AssigneeOption, assigneeDisplayLabel } from '@/components/users/assignee-select';
import { listProjects, type Project } from '@/features/projects/api';
import { listTickets, type TicketSummary } from '@/features/tickets/api';

function shortId(id: string) {
  return id.slice(0, 8);
}

function queueViewFromSearch(view: string | null, status: string | null): 'new' | 'open' | 'my' | 'closed' {
  if (view === 'new' || view === 'open' || view === 'my' || view === 'closed') {
    return view;
  }
  if (status === 'CLOSED') {
    return 'closed';
  }
  return 'open';
}

export default function TicketsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const isInternal = Boolean(session?.roles?.includes('tiba_agent') || session?.roles?.includes('tiba_admin'));
  const initialView = useMemo(
    () => queueViewFromSearch(searchParams.get('view'), searchParams.get('status')),
    [searchParams]
  );

  const [items, setItems] = useState<TicketSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectById, setProjectById] = useState<Record<string, Project>>({});

  useEffect(() => {
    if (status !== 'authenticated' || isInternal) {
      return;
    }

    const run = async () => {
      try {
        const [tickets, projects] = await Promise.all([
          listTickets({ view: 'open' }),
          listProjects({ page: 1, pageSize: 200, sort: 'name', order: 'asc' })
        ]);

        setItems(tickets.items);
        setProjectById(Object.fromEntries(projects.items.map((project) => [project.id, project])));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [isInternal, status]);

  if (status === 'loading') {
    return <main><p className="text-slate-600">Loading tickets...</p></main>;
  }

  if (isInternal) {
    return <InternalTicketQueue currentUserSub={session?.user?.sub ?? ''} initialView={initialView} />;
  }

  const projectLabel = (projectId: string) => {
    const project = projectById[projectId];
    if (!project) {
      return shortId(projectId);
    }
    return project.name;
  };

  const assigneeLabel = (ticket: TicketSummary & { assignee?: AssigneeOption | null }) => {
    if (!ticket.assigneeUserId) {
      return 'Unassigned';
    }
    if (ticket.assignee) {
      return assigneeDisplayLabel(ticket.assignee);
    }
    return 'Assigned';
  };

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tickets</h1>
          <p className="mt-1 text-sm text-slate-600">View and manage your tickets inside the Tickets module.</p>
        </div>
        <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm" href="/tickets/new">
          Create Ticket
        </Link>
      </div>

      {loading && <p className="text-slate-600">Loading tickets...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3">
          {items.length ? (
            items.map((ticket) => (
              <Link className="block rounded-md border border-slate-200 bg-white p-4" href={`/tickets/${ticket.id}`} key={ticket.id}>
                <h2 className="font-medium text-slate-900">{ticket.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {ticket.type} - {ticket.status} - {projectLabel(ticket.projectId)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  assignee: {assigneeLabel(ticket)} - updated {new Date(ticket.updatedAt).toLocaleString()}
                </p>
              </Link>
            ))
          ) : (
            <p className="text-slate-600">No tickets found.</p>
          )}
        </div>
      )}
    </main>
  );
}
