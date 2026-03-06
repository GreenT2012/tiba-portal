'use client';

import { useEffect, useState } from 'react';
import { readApiError } from '@/lib/api';

type Project = {
  id: string;
  customerId: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type CustomerOption = {
  id: string;
  name: string;
};

type ProjectsResponse = {
  items: Project[];
};

type CustomersResponse = {
  items: CustomerOption[];
};

export function ProjectsAdminPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [debouncedCustomerQuery, setDebouncedCustomerQuery] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [customerNameById, setCustomerNameById] = useState<Record<string, string>>({});
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedCustomerQuery(customerQuery.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [customerQuery]);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: debouncedQuery, pageSize: '100' });
      const response = await fetch(`/api/backend/projects?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Failed to load projects'));
      }
      const data = (await response.json()) as ProjectsResponse;
      setProjects(Array.isArray(data.items) ? data.items : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, [debouncedQuery]);

  useEffect(() => {
    if (!customerDropdownOpen) {
      return;
    }

    let cancelled = false;

    const loadCustomers = async () => {
      setCustomersLoading(true);
      setCustomersError(null);

      try {
        const params = new URLSearchParams({
          q: debouncedCustomerQuery,
          page: '1',
          pageSize: '20',
          sort: 'name',
          order: 'asc'
        });
        const response = await fetch(`/api/backend/customers?${params.toString()}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(await readApiError(response, 'Failed to load customers'));
        }

        const data = (await response.json()) as CustomersResponse;
        const items = Array.isArray(data.items) ? data.items : [];
        if (cancelled) {
          return;
        }

        setCustomerOptions(items);
        setCustomerNameById((prev) => {
          const next = { ...prev };
          for (const item of items) {
            next[item.id] = item.name;
          }
          return next;
        });
      } catch (loadError) {
        if (!cancelled) {
          setCustomersError(loadError instanceof Error ? loadError.message : 'Failed to load customers');
          setCustomerOptions([]);
        }
      } finally {
        if (!cancelled) {
          setCustomersLoading(false);
        }
      }
    };

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [customerDropdownOpen, debouncedCustomerQuery]);

  const createProject = async () => {
    if (!selectedCustomer || !createName.trim()) {
      setError('Customer and project name are required');
      return;
    }

    setCreateLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backend/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedCustomer.id, name: createName.trim() })
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Failed to create project'));
      }

      setSelectedCustomer(null);
      setCustomerQuery('');
      setCreateName('');
      await loadProjects();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create project');
    } finally {
      setCreateLoading(false);
    }
  };

  const saveProject = async (project: Project, patch: { name?: string; isArchived?: boolean }) => {
    setSavingId(project.id);
    setError(null);

    try {
      const response = await fetch(`/api/backend/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Failed to update project'));
      }

      setEditingId(null);
      setEditingName('');
      await loadProjects();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update project');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">TIBA Project Admin</h1>
        <p className="mt-1 text-sm text-slate-600">Create, rename, and archive projects.</p>
      </div>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium">Create project</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="relative">
            <button
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm"
              onClick={() => setCustomerDropdownOpen((open) => !open)}
              type="button"
            >
              {selectedCustomer ? selectedCustomer.name : 'Select customer'}
            </button>
            {selectedCustomer && (
              <button
                className="absolute right-2 top-2 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerQuery('');
                }}
                type="button"
              >
                Clear
              </button>
            )}

            {customerDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-sm">
                <input
                  className="w-full border-b border-slate-200 px-3 py-2 text-sm"
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Search customers..."
                  value={customerQuery}
                />
                <div className="max-h-60 overflow-auto">
                  {customersLoading && <div className="px-3 py-2 text-sm text-slate-500">Loading customers...</div>}
                  {!customersLoading && customersError && <div className="px-3 py-2 text-sm text-red-600">{customersError}</div>}
                  {!customersLoading && !customersError && customerOptions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-500">No customers found.</div>
                  )}
                  {!customersLoading &&
                    !customersError &&
                    customerOptions.map((customer) => (
                      <button
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerQuery('');
                          setCustomerDropdownOpen(false);
                        }}
                        type="button"
                      >
                        {customer.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Project name"
            value={createName}
          />
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={createLoading || !selectedCustomer || !createName.trim()}
            onClick={() => void createProject()}
            type="button"
          >
            {createLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Projects</h2>
          <input
            className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects..."
            value={query}
          />
        </div>

        {loading && <p className="text-sm text-slate-600">Loading projects...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="space-y-2">
            {projects.length ? (
              projects.map((project) => (
                <div className="rounded-md border border-slate-200 p-3" key={project.id}>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{project.name}</p>
                      <p className="text-xs text-slate-500">
                        {project.id} - customer{' '}
                        {customerNameById[project.customerId] ?? `Customer ${project.customerId.slice(0, 8)}`} -{' '}
                        {project.isArchived ? 'archived' : 'active'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {editingId === project.id ? (
                        <>
                          <input
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                            onChange={(event) => setEditingName(event.target.value)}
                            value={editingName}
                          />
                          <button
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                            disabled={savingId === project.id}
                            onClick={() => void saveProject(project, { name: editingName.trim() })}
                            type="button"
                          >
                            Save
                          </button>
                          <button
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName('');
                            }}
                            type="button"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                          onClick={() => {
                            setEditingId(project.id);
                            setEditingName(project.name);
                          }}
                          type="button"
                        >
                          Rename
                        </button>
                      )}

                      <button
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                        disabled={savingId === project.id}
                        onClick={() => void saveProject(project, { isArchived: !project.isArchived })}
                        type="button"
                      >
                        {project.isArchived ? 'Unarchive' : 'Archive'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No projects found.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
