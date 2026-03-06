'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AssigneeOption, assigneeDisplayLabel } from '@/components/users/assignee-select';

type TicketSummary = {
  id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  type: string;
  projectId: string;
  assigneeUserId: string | null;
  assignee?: AssigneeOption | null;
  updatedAt: string;
};

type TicketsResponse = {
  items: TicketSummary[];
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

type BoardTab = 'new' | 'open' | 'my' | 'closed';

type StatusFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

type TypeFilter =
  | 'ALL'
  | 'Bug'
  | 'Feature'
  | 'Content'
  | 'Marketing'
  | 'Tracking'
  | 'Plugin';

const TABS: Array<{ key: BoardTab; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'open', label: 'Open' },
  { key: 'my', label: 'My' },
  { key: 'closed', label: 'Closed' }
];

const TYPE_OPTIONS: TypeFilter[] = ['ALL', 'Bug', 'Feature', 'Content', 'Marketing', 'Tracking', 'Plugin'];

function queryForTab(tab: BoardTab): string {
  if (tab === 'closed') {
    return 'status=CLOSED';
  }
  return `view=${tab}`;
}

function shortAssignee(assigneeUserId: string | null, currentUserSub: string): string {
  if (!assigneeUserId) {
    return 'Unassigned';
  }
  if (assigneeUserId === currentUserSub) {
    return 'Me';
  }
  return assigneeUserId.slice(0, 8);
}

function userDisplay(user: UserItem) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) {
    return fullName;
  }
  return user.username || user.email || user.id.slice(0, 8);
}

function assigneeForDisplay(
  ticket: TicketSummary,
  currentUserSub: string,
  userDisplayById: Record<string, string>
): string {
  if (ticket.assignee) {
    return assigneeDisplayLabel(ticket.assignee);
  }
  if (ticket.assigneeUserId && userDisplayById[ticket.assigneeUserId]) {
    return userDisplayById[ticket.assigneeUserId];
  }
  return shortAssignee(ticket.assigneeUserId, currentUserSub);
}

export function TibaBoard({ currentUserSub }: { currentUserSub: string }) {
  const [activeTab, setActiveTab] = useState<BoardTab>('new');
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [projectById, setProjectById] = useState<Record<string, { name: string; customerId: string }>>({});
  const [customerNameById, setCustomerNameById] = useState<Record<string, string>>({});
  const [userDisplayById, setUserDisplayById] = useState<Record<string, string>>({});

  const loadTickets = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/backend/tickets?${queryForTab(activeTab)}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as TicketsResponse;
      setTickets(Array.isArray(data.items) ? data.items : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [activeTab]);

  useEffect(() => {
    const run = async () => {
      try {
        const [projectsRes, customersRes, usersRes] = await Promise.all([
          fetch('/api/backend/projects?page=1&pageSize=200&sort=name&order=asc', { cache: 'no-store' }),
          fetch('/api/backend/customers?page=1&pageSize=200&sort=name&order=asc', { cache: 'no-store' }),
          fetch('/api/backend/users?limit=50', { cache: 'no-store' })
        ]);

        if (projectsRes.ok) {
          const projectsJson = (await projectsRes.json()) as ProjectsResponse;
          const map: Record<string, { name: string; customerId: string }> = {};
          for (const project of projectsJson.items ?? []) {
            map[project.id] = { name: project.name, customerId: project.customerId };
          }
          setProjectById(map);
        }

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
  }, []);

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (query && !ticket.title.toLowerCase().includes(query)) {
        return false;
      }
      if (statusFilter !== 'ALL' && ticket.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'ALL' && ticket.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [searchQuery, statusFilter, tickets, typeFilter]);

  const assignToMe = async (ticketId: string) => {
    setAssigningId(ticketId);
    setError(null);

    try {
      const response = await fetch(`/api/backend/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeUserId: currentUserSub })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadTickets();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Failed to assign ticket');
    } finally {
      setAssigningId(null);
    }
  };

  const updateStatus = async (ticketId: string, status: TicketSummary['status']) => {
    setStatusUpdatingId(ticketId);
    setError(null);

    try {
      const response = await fetch(`/api/backend/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadTickets();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const projectLabel = (projectId: string) => {
    const project = projectById[projectId];
    if (!project) {
      return projectId.slice(0, 8);
    }
    const customerName = customerNameById[project.customerId] ?? `Customer ${project.customerId.slice(0, 8)}`;
    return `${customerName} • ${project.name}`;
  };

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">TIBA Board</h1>
        <p className="mt-1 text-sm text-slate-600">Operational triage views for internal support roles.</p>
        <div className="mt-3">
          <Link className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" href="/tiba/projects">
            Manage Projects
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            className={`rounded-md px-3 py-2 text-sm ${
              activeTab === tab.key ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700'
            }`}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search title..."
          value={searchQuery}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          value={statusFilter}
        >
          <option value="ALL">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="CLOSED">CLOSED</option>
        </select>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
          value={typeFilter}
        >
          {TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type === 'ALL' ? 'All types' : type}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-slate-600">Loading...</p>}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-sm"
            onClick={() => void loadTickets()}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Assignee</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => (
                <tr className="border-b border-slate-100" key={ticket.id}>
                  <td className="px-3 py-2">
                    <Link className="text-slate-900 hover:underline" href={`/tickets/${ticket.id}`}>
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{ticket.type}</td>
                  <td className="px-3 py-2">{ticket.status}</td>
                  <td className="px-3 py-2">{new Date(ticket.updatedAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{assigneeForDisplay(ticket, currentUserSub, userDisplayById)}</td>
                  <td className="px-3 py-2">{projectLabel(ticket.projectId)}</td>
                  <td className="px-3 py-2">
                    {activeTab === 'new' ? (
                      <button
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                        disabled={assigningId === ticket.id || ticket.assigneeUserId === currentUserSub}
                        onClick={() => void assignToMe(ticket.id)}
                        type="button"
                      >
                        {assigningId === ticket.id ? 'Assigning...' : 'Assign to me'}
                      </button>
                    ) : activeTab === 'open' || activeTab === 'my' ? (
                      <select
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        disabled={statusUpdatingId === ticket.id}
                        onChange={(event) => {
                          void updateStatus(ticket.id, event.target.value as TicketSummary['status']);
                        }}
                        value={ticket.status}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={7}>
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
