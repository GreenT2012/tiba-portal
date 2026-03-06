'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AssigneeOption, assigneeDisplayLabel } from '@/components/users/assignee-select';
import { listCustomers } from '@/features/customers/api';
import { listProjects } from '@/features/projects/api';
import { listTickets, type TicketSummary } from '@/features/tickets/api';
import { listUsers } from '@/features/users/api';

function shortId(id: string) {
  return id.slice(0, 8);
}

function userDisplay(user: { id: string; username: string | null; email: string | null; firstName: string | null; lastName: string | null }) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) {
    return fullName;
  }
  return user.username || user.email || shortId(user.id);
}

export default function TicketsPage() {
  const { data: session } = useSession();
  const isTiba = Boolean(session?.roles?.includes('tiba_agent') || session?.roles?.includes('tiba_admin'));
  const [items, setItems] = useState<TicketSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectById, setProjectById] = useState<Record<string, { name: string; customerId: string }>>({});
  const [customerNameById, setCustomerNameById] = useState<Record<string, string>>({});
  const [userDisplayById, setUserDisplayById] = useState<Record<string, string>>({});

  useEffect(() => {
    const run = async () => {
      try {
        const [tickets, projects] = await Promise.all([
          listTickets({ view: 'open' }),
          listProjects({ page: 1, pageSize: 200, sort: 'name', order: 'asc' })
        ]);

        setItems(tickets.items);
        setProjectById(
          Object.fromEntries(projects.items.map((project) => [project.id, { name: project.name, customerId: project.customerId }]))
        );

        if (!isTiba) {
          return;
        }

        const [customers, users] = await Promise.all([
          listCustomers({ page: 1, pageSize: 200, sort: 'name', order: 'asc' }),
          listUsers({ limit: 50 })
        ]);

        setCustomerNameById(Object.fromEntries(customers.items.map((customer) => [customer.id, customer.name])));
        setUserDisplayById(Object.fromEntries(users.map((user) => [user.id, userDisplay(user)])));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tickets');
      } finally {
        setLoading(false);
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

  const assigneeLabel = (ticket: TicketSummary & { assignee?: AssigneeOption | null }) => {
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
