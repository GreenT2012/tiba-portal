'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readApiError } from '@/lib/api';

type Project = {
  id: string;
  customerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type ProjectsResponse = {
  items: Project[];
  page: number;
  pageSize: number;
  total: number;
};

export default function ProjectsPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ q: debouncedQuery, pageSize: '50' });
        const response = await fetch(`/api/backend/projects?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(await readApiError(response, 'Failed to load projects'));
        }

        const data = (await response.json()) as ProjectsResponse;
        setProjects(Array.isArray(data.items) ? data.items : []);
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load projects');
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();

    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
      </div>

      <input
        className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search projects..."
        value={query}
      />

      {loading && <p className="text-slate-600">Loading projects...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3">
          {projects.length ? (
            projects.map((project) => (
              <Link className="block rounded-md border border-slate-200 bg-white p-4" href={`/projects/${project.id}`} key={project.id}>
                <h2 className="font-medium text-slate-900">{project.name}</h2>
                <p className="mt-1 text-xs text-slate-500">updated {new Date(project.updatedAt).toLocaleString()}</p>
              </Link>
            ))
          ) : (
            <p className="text-slate-600">No projects found.</p>
          )}
        </div>
      )}
    </main>
  );
}
