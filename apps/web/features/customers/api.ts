import { customerSchema, paginatedCustomersSchema, type CustomerContract } from '@tiba/shared/customers';
import { requestJson } from '../http';

export type Customer = CustomerContract;

export async function listCustomers(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
} = {}) {
  const search = new URLSearchParams();
  if (params.q !== undefined) search.set('q', params.q);
  search.set('page', String(params.page ?? 1));
  search.set('pageSize', String(params.pageSize ?? 20));
  search.set('sort', params.sort ?? 'name');
  search.set('order', params.order ?? 'asc');

  return requestJson(`/api/backend/customers?${search.toString()}`, { cache: 'no-store' }, paginatedCustomersSchema, 'Failed to load customers');
}

export async function createCustomer(body: { name: string }) {
  return requestJson(
    '/api/backend/customers',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    customerSchema,
    'Failed to create customer'
  );
}
