'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

type Project = {
  id: string;
  customerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
};

type Ticket = {
  id: string;
  title: string;
  status: string;
  type: string;
  updatedAt: string;
  assigneeUserId: string | null;
  projectId: string;
};

type TicketsResponse = {
  items: Ticket[];
  page: number;
  pageSize: number;
  total: number;
};

type UserItem = {
  id: string;
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

type Tab = 'all' | 'open' | 'inProgress' | 'closed';

function queryForTab(projectId: string, tab: Tab) {
  if (tab === 'open') {
    return `projectId=${encodeURIComponent(projectId)}&status=OPEN`;
  }
  if (tab === 'inProgress') {
    return `projectId=${encodeURIComponent(projectId)}&status=IN_PROGRESS`;
  }
  if (tab === 'closed') {
    return `projectId=${encodeURIComponent(projectId)}&status=CLOSED`;
  }
  return `projectId=${encodeURIComponent(projectId)}`;
}

export default function ProjectDetailPage() {
  const { data: session } = useSession();
  const isTiba = Boolean(session?.roles?.includes('tiba_agent') || session?.roles?.includes('tiba_admin'));
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('all');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [userDisplayById, setUserDisplayById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isTiba) {
      return;
    }

    const run = async () => {
      try {
        const response = await fetch('/api/backend/users?limit=50', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const users = (await response.json()) as UserItem[];
        const map: Record<string, string> = {};
        for (const user of users ?? []) {
          const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
          map[user.id] = fullName || user.username || user.email || user.id.slice(0, 8);
        }
        setUserDisplayById(map);
      } catch {
        // non-critical lookup
      }
    };

    void run();
  }, [isTiba]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const controller = new AbortController();

    async function loadProject() {
      setProjectLoading(true);
      setProjectError(null);

      try {
        const response = await fetch(`/api/backend/projects/${projectId}`, {
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        setProject((await response.json()) as Project);
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return;
        }
        setProjectError(loadError instanceof Error ? loadError.message : 'Failed to load project');
      } finally {
        setProjectLoading(false);
      }
    }

    void loadProject();

    return () => controller.abort();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const controller = new AbortController();

    async function loadTickets() {
      setTicketsLoading(true);
      setTicketsError(null);

      try {
        const response = await fetch(`/api/backend/tickets?${queryForTab(projectId, tab)}`, {
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as TicketsResponse;
        setTickets(Array.isArray(data.items) ? data.items : []);
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return;
        }
        setTicketsError(loadError instanceof Error ? loadError.message : 'Failed to load tickets');
        setTickets([]);
      } finally {
        setTicketsLoading(false);
      }
    }

    void loadTickets();

    return () => controller.abort();
  }, [projectId, tab]);

  const assigneeLabel = (assigneeUserId: string | null) => {
    if (!assigneeUserId) {
      return 'Unassigned';
    }
    if (userDisplayById[assigneeUserId]) {
      return userDisplayById[assigneeUserId];
    }
    if (!isTiba) {
      return 'Assigned';
    }
    return assigneeUserId.slice(0, 8);
  };

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Project Detail</h1>
        <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm" href="/projects">
          Back to Projects
        </Link>
      </div>

      {projectLoading && <p className="text-slate-600">Loading project...</p>}
      {projectError && <p className="text-red-600">{projectError}</p>}

      {!projectLoading && !projectError && project && (
        <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">{project.name}</h2>
          <p className="mt-1 text-xs text-slate-500">updated {new Date(project.updatedAt).toLocaleString()}</p>
        </section>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === 'all' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700'
          }`}
          onClick={() => setTab('all')}
          type="button"
        >
          All
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === 'open' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700'
          }`}
          onClick={() => setTab('open')}
          type="button"
        >
          Open
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === 'inProgress' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700'
          }`}
          onClick={() => setTab('inProgress')}
          type="button"
        >
          In Progress
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === 'closed' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700'
          }`}
          onClick={() => setTab('closed')}
          type="button"
        >
          Closed
        </button>
      </div>

      {ticketsLoading && <p className="text-slate-600">Loading tickets...</p>}
      {ticketsError && <p className="text-red-600">{ticketsError}</p>}

      {!ticketsLoading && !ticketsError && (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length ? (
                tickets.map((ticket) => (
                  <tr className="border-b border-slate-100" key={ticket.id}>
                    <td className="px-3 py-2">
                      <Link className="text-slate-900 hover:underline" href={`/tickets/${ticket.id}`}>
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{ticket.type}</td>
                    <td className="px-3 py-2">{ticket.status}</td>
                    <td className="px-3 py-2">{new Date(ticket.updatedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{assigneeLabel(ticket.assigneeUserId)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={5}>
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
