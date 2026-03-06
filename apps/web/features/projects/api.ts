import { paginatedProjectsSchema, projectSchema, type ProjectContract } from '@tiba/shared/projects';
import { requestJson } from '../http';

export type Project = ProjectContract;

export async function listProjects(params: {
  q?: string;
  customerId?: string;
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
} = {}) {
  const search = new URLSearchParams();
  if (params.q !== undefined) search.set('q', params.q);
  if (params.customerId) search.set('customerId', params.customerId);
  search.set('page', String(params.page ?? 1));
  search.set('pageSize', String(params.pageSize ?? 20));
  search.set('sort', params.sort ?? 'name');
  search.set('order', params.order ?? 'asc');

  return requestJson(`/api/backend/projects?${search.toString()}`, { cache: 'no-store' }, paginatedProjectsSchema, 'Failed to load projects');
}

export async function getProject(projectId: string) {
  return requestJson(`/api/backend/projects/${projectId}`, { cache: 'no-store' }, projectSchema, 'Failed to load project');
}

export async function createProject(body: { customerId: string; name: string }) {
  return requestJson(
    '/api/backend/projects',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    projectSchema,
    'Failed to create project'
  );
}

export async function updateProject(projectId: string, body: { name?: string; isArchived?: boolean }) {
  return requestJson(
    `/api/backend/projects/${projectId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    projectSchema,
    'Failed to update project'
  );
}
