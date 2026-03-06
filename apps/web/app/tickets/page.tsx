'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AssigneeOption, assigneeDisplayLabel } from '@/components/users/assignee-select';
import { readApiError } from '@/lib/api';

type TicketSummary = {
  id: string;
  title: string;
  status: string;
  type: string;
  projectId: string;
  assigneeUserId: string | null;
  assignee?: AssigneeOption | null;
  updatedAt: string;
};

type TicketsResponse = {
  items: TicketSummary[];
  page: number;
  pageSize: number;
  total: number;
};

type ProjectItem = {
  id: string;
  name: string;
  customerId: string;
};

type ProjectsResponse = {
  items: ProjectItem[];
};

type CustomerItem = {
  id: string;
  name: string;
};

type CustomersResponse = {
  items: CustomerItem[];
};

type UserItem = {
  id: string;
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

function shortId(id: string) {
  return id.slice(0, 8);
}

function userDisplay(user: UserItem) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) {
    return fullName;
  }
  return user.username || user.email || shortId(user.id);
}

export default function TicketsPage() {
  const { data: session } = useSession();
  const isTiba = Boolean(session?.roles?.includes('tiba_agent') || session?.roles?.includes('tiba_admin'));
  const [data, setData] = useState<TicketsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectById, setProjectById] = useState<Record<string, { name: string; customerId: string }>>({});
  const [customerNameById, setCustomerNameById] = useState<Record<string, string>>({});
  const [userDisplayById, setUserDisplayById] = useState<Record<string, string>>({});

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/backend/tickets?view=open', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(await readApiError(res, 'Failed to load tickets'));
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

  useEffect(() => {
    const run = async () => {
      try {
        const projectsRes = await fetch('/api/backend/projects?page=1&pageSize=200&sort=name&order=asc', {
          cache: 'no-store'
        });
        if (projectsRes.ok) {
          const projectsJson = (await projectsRes.json()) as ProjectsResponse;
          const projectsMap: Record<string, { name: string; customerId: string }> = {};
          for (const project of projectsJson.items ?? []) {
            projectsMap[project.id] = { name: project.name, customerId: project.customerId };
          }
          setProjectById(projectsMap);
        }

        if (!isTiba) {
          return;
        }

        const [customersRes, usersRes] = await Promise.all([
          fetch('/api/backend/customers?page=1&pageSize=200&sort=name&order=asc', { cache: 'no-store' }),
          fetch('/api/backend/users?limit=50', { cache: 'no-store' })
        ]);

        if (customersRes.ok) {
          const customersJson = (await customersRes.json()) as CustomersResponse;
          const map: Record<string, string> = {};
          for (const customer of customersJson.items ?? []) {
            map[customer.id] = customer.name;
          }
          setCustomerNameById(map);
        }

        if (usersRes.ok) {
          const usersJson = (await usersRes.json()) as UserItem[];
          const map: Record<string, string> = {};
          for (const user of usersJson ?? []) {
            map[user.id] = userDisplay(user);
          }
          setUserDisplayById(map);
        }
      } catch {
        // non-critical lookups
      }
    };

    void run();
  }, [isTiba]);

  const projectLabel = (projectId: string) => {
    const project = projectById[projectId];
    if (!project) {
      return shortId(projectId);
    }
    if (!isTiba) {
      return project.name;
    }
    const customerName = customerNameById[project.customerId] ?? `Customer ${shortId(project.customerId)}`;
    return `${customerName} • ${project.name}`;
  };

  const assigneeLabel = (ticket: TicketSummary) => {
    if (!ticket.assigneeUserId) {
      return 'Unassigned';
    }
    if (ticket.assignee) {
      return assigneeDisplayLabel(ticket.assignee);
    }
    if (userDisplayById[ticket.assigneeUserId]) {
      return userDisplayById[ticket.assigneeUserId];
    }
    if (!isTiba) {
      return 'Assigned';
    }
    return shortId(ticket.assigneeUserId);
  };

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
