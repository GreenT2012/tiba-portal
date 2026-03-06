'use client';

import { useEffect, useState } from 'react';
import { createCustomer, listCustomers, type Customer } from '@/features/customers/api';

export function CustomersAdminPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listCustomers({ q: debouncedQuery, page: 1, pageSize: 20, sort: 'name', order: 'asc' });
      setCustomers(data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, [debouncedQuery]);

  const onCreateCustomer = async () => {
    const trimmed = createName.trim();
    if (!trimmed) {
      setError('Customer name is required');
      return;
    }

    setCreateLoading(true);
    setError(null);

    try {
      await createCustomer({ name: trimmed });
      setCreateName('');
      await loadCustomers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create customer');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Admin Customers</h1>
        <p className="mt-1 text-sm text-slate-600">Create and review customer tenants inside the Admin module.</p>
      </div>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium">Create customer</h2>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Customer name"
            value={createName}
          />
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={createLoading || !createName.trim()}
            onClick={() => void onCreateCustomer()}
            type="button"
          >
            {createLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Customers</h2>
          <input
            className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customers..."
            value={query}
          />
        </div>

        {loading && <p className="text-sm text-slate-600">Loading customers...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="space-y-2">
            {customers.length ? (
              customers.map((customer) => (
                <div className="rounded-md border border-slate-200 p-3" key={customer.id}>
                  <p className="text-sm font-medium text-slate-900">{customer.name}</p>
                  <p className="text-xs text-slate-500">{customer.id}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No customers found.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
