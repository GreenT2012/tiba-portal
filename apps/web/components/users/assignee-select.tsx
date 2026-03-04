'use client';

import { useEffect, useMemo, useState } from 'react';

export type AssigneeOption = {
  id: string;
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

type AssigneeSelectProps = {
  value: string | null;
  onChange: (assigneeUserId: string | null) => void;
  disabled?: boolean;
  allowUnassigned?: boolean;
  label?: string;
  selectedAssignee?: AssigneeOption | null;
};

export function assigneePrimaryLabel(user: AssigneeOption): string {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) {
    return fullName;
  }
  return user.username ?? user.email ?? user.id;
}

export function assigneeSecondaryLabel(user: AssigneeOption): string {
  return user.email ?? '';
}

export function assigneeDisplayLabel(user: AssigneeOption): string {
  const primary = assigneePrimaryLabel(user);
  const secondary = assigneeSecondaryLabel(user);
  return secondary ? `${primary} (${secondary})` : primary;
}

export function AssigneeSelect({
  value,
  onChange,
  disabled,
  allowUnassigned = true,
  label = 'Assignee',
  selectedAssignee
}: AssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [users, setUsers] = useState<AssigneeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knownUsers, setKnownUsers] = useState<Record<string, AssigneeOption>>({});

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();

    async function loadUsers() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ q: debouncedQuery, limit: '20' });
        const response = await fetch(`/api/backend/users?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as AssigneeOption[];
        const nextUsers = Array.isArray(data) ? data : [];
        setUsers(nextUsers);
        setKnownUsers((prev) => {
          const next = { ...prev };
          for (const user of nextUsers) {
            next[user.id] = user;
          }
          return next;
        });
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Failed to load users');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();

    return () => controller.abort();
  }, [open, debouncedQuery]);

  useEffect(() => {
    if (selectedAssignee) {
      setKnownUsers((prev) => ({ ...prev, [selectedAssignee.id]: selectedAssignee }));
    }
  }, [selectedAssignee]);

  const selectedText = useMemo(() => {
    if (value === null) {
      return 'Unassigned';
    }

    const user = knownUsers[value] ?? (selectedAssignee?.id === value ? selectedAssignee : null);
    if (!user) {
      return `Assignee ${value.slice(0, 8)}`;
    }

    return assigneeDisplayLabel(user);
  }, [knownUsers, selectedAssignee, value]);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <button
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        {selectedText}
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
          <input
            className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users..."
            value={query}
          />

          <div className="max-h-40 overflow-auto rounded-md border border-slate-200">
            {loading && <div className="px-3 py-2 text-sm text-slate-500">Loading users...</div>}
            {!loading && error && <div className="px-3 py-2 text-sm text-red-600">{error}</div>}
            {!loading && !error && allowUnassigned && (
              <button
                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-100"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                type="button"
              >
                Unassigned
              </button>
            )}
            {!loading && !error && users.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No users found.</div>}
            {!loading &&
              !error &&
              users.map((user) => (
                <button
                  className="block w-full px-3 py-2 text-left hover:bg-slate-100"
                  key={user.id}
                  onClick={() => {
                    onChange(user.id);
                    setOpen(false);
                  }}
                  type="button"
                >
                  <p className="text-sm text-slate-900">{assigneePrimaryLabel(user)}</p>
                  {assigneeSecondaryLabel(user) && <p className="text-xs text-slate-500">{assigneeSecondaryLabel(user)}</p>}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
