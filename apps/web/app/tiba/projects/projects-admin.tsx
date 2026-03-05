'use client';

import { useEffect, useState } from 'react';

type Project = {
  id: string;
  customerId: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProjectsResponse = {
  items: Project[];
};

export function ProjectsAdminPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createCustomerId, setCreateCustomerId] = useState('');
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

  const loadProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: debouncedQuery, pageSize: '100' });
      const response = await fetch(`/api/backend/projects?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(await response.text());
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

  const createProject = async () => {
    if (!createCustomerId.trim() || !createName.trim()) {
      setError('customerId and name are required');
      return;
    }

    setCreateLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backend/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: createCustomerId.trim(), name: createName.trim() })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setCreateCustomerId('');
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
        throw new Error(await response.text());
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
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setCreateCustomerId(event.target.value)}
            placeholder="Customer ID"
            value={createCustomerId}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Project name"
            value={createName}
          />
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={createLoading}
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
                        {project.id} - customer {project.customerId} - {project.isArchived ? 'archived' : 'active'}
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
