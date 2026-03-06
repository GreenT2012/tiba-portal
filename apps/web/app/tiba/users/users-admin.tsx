'use client';

import { useEffect, useMemo, useState } from 'react';
import { listCustomers, type Customer } from '@/features/customers/api';
import { listUsers, provisionUser, resetUserPassword, type ProvisionedUser, type User } from '@/features/users/api';

const ALL_ROLES = ['customer_user', 'tiba_agent', 'tiba_admin'] as const;

function userDisplay(user: User) {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (name) {
    return name;
  }
  return user.username || user.email || 'Unnamed user';
}

function shortId(id: string) {
  return id.slice(0, 8);
}

export function UsersAdminPage({ canManageUsers }: { canManageUsers: boolean }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | ProvisionedUser | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['customer_user']);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  const [tempPassword, setTempPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const needsCustomer = useMemo(() => selectedRoles.includes('customer_user'), [selectedRoles]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedCustomerSearch(customerSearch.trim()), 300);
    return () => clearTimeout(timeout);
  }, [customerSearch]);

  useEffect(() => {
    if (!debouncedSearch) {
      setUsers([]);
      setUsersError(null);
      return;
    }

    let cancelled = false;

    const loadUsers = async () => {
      setUsersLoading(true);
      setUsersError(null);

      try {
        const data = await listUsers({ q: debouncedSearch, limit: 20 });
        if (!cancelled) {
          setUsers(data);
        }
      } catch (error) {
        if (!cancelled) {
          setUsersError(error instanceof Error ? error.message : 'Failed to load users');
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    };

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    if (!needsCustomer || !customerOpen) {
      return;
    }

    let cancelled = false;
    const loadCustomers = async () => {
      setCustomersLoading(true);
      setCustomersError(null);
      try {
        const data = await listCustomers({ q: debouncedCustomerSearch, page: 1, pageSize: 20, sort: 'name', order: 'asc' });
        if (!cancelled) {
          setCustomerOptions(data.items);
        }
      } catch (error) {
        if (!cancelled) {
          setCustomersError(error instanceof Error ? error.message : 'Failed to load customers');
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
  }, [needsCustomer, customerOpen, debouncedCustomerSearch]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      }
      return [...prev, role];
    });
  };

  const createUser = async () => {
    setFormError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Email is required');
      return;
    }
    if (selectedRoles.length === 0) {
      setFormError('At least one role is required');
      return;
    }
    if (needsCustomer && !selectedCustomer) {
      setFormError('Customer is required when role includes customer_user');
      return;
    }

    setProvisioning(true);
    try {
      const created = await provisionUser({
        email: trimmedEmail,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        roles: selectedRoles,
        customerId: needsCustomer ? selectedCustomer?.id : undefined
      });
      setSuccess(`User ${created.email ?? created.username ?? created.id} created.`);
      setSelectedUser(created);
      setEmail('');
      setFirstName('');
      setLastName('');
      setSelectedRoles(['customer_user']);
      setSelectedCustomer(null);
      setCustomerSearch('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setProvisioning(false);
    }
  };

  const resetPassword = async () => {
    if (!selectedUser) {
      return;
    }
    if (!tempPassword.trim()) {
      setResetMessage('Temporary password is required');
      return;
    }

    setResetting(true);
    setResetMessage(null);
    try {
      await resetUserPassword(selectedUser.id, { temporaryPassword: tempPassword.trim() });
      setTempPassword('');
      setResetMessage('Temporary password updated.');
    } catch (error) {
      setResetMessage(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">TIBA Users</h1>
        <p className="mt-1 text-sm text-slate-600">Search, provision, and reset user passwords without Keycloak console access.</p>
      </div>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium">Search users</h2>
        <input
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm md:max-w-sm"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by email or username..."
          value={search}
        />
        {!debouncedSearch && <p className="mt-2 text-xs text-slate-500">Type to search users.</p>}
        {usersLoading && <p className="mt-2 text-sm text-slate-600">Loading users...</p>}
        {usersError && <p className="mt-2 text-sm text-red-600">{usersError}</p>}
        {!usersLoading && !usersError && users.length > 0 && (
          <div className="mt-3 space-y-2">
            {users.map((user) => (
              <button
                className="w-full rounded-md border border-slate-200 p-3 text-left hover:bg-slate-50"
                key={user.id}
                onClick={() => setSelectedUser(user)}
                type="button"
              >
                <p className="text-sm font-medium text-slate-900">{userDisplay(user)}</p>
                <p className="text-xs text-slate-500">{user.email ?? user.username ?? `User ${shortId(user.id)}`}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium">Create user</h2>
        {!canManageUsers && <p className="mt-2 text-sm text-slate-500">Only `tiba_admin` can provision users.</p>}
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" disabled={!canManageUsers} onChange={(event) => setEmail(event.target.value)} placeholder="Email" value={email} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" disabled={!canManageUsers} onChange={(event) => setFirstName(event.target.value)} placeholder="First name (optional)" value={firstName} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" disabled={!canManageUsers} onChange={(event) => setLastName(event.target.value)} placeholder="Last name (optional)" value={lastName} />
          <div className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Roles</p>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <label className="flex items-center gap-2 text-sm" key={role}>
                  <input checked={selectedRoles.includes(role)} disabled={!canManageUsers} onChange={() => toggleRole(role)} type="checkbox" />
                  <span>{role}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {needsCustomer && (
          <div className="relative mt-3">
            <button
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm"
              disabled={!canManageUsers}
              onClick={() => setCustomerOpen((open) => !open)}
              type="button"
            >
              {selectedCustomer ? selectedCustomer.name : 'Select customer'}
            </button>
            {selectedCustomer && (
              <button
                className="absolute right-2 top-2 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs"
                disabled={!canManageUsers}
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
                type="button"
              >
                Clear
              </button>
            )}
            {customerOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-sm">
                <input className="w-full border-b border-slate-200 px-3 py-2 text-sm" disabled={!canManageUsers} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customers..." value={customerSearch} />
                <div className="max-h-60 overflow-auto">
                  {customersLoading && <div className="px-3 py-2 text-sm text-slate-500">Loading customers...</div>}
                  {!customersLoading && customersError && <div className="px-3 py-2 text-sm text-red-600">{customersError}</div>}
                  {!customersLoading && !customersError && customerOptions.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No customers found.</div>}
                  {!customersLoading &&
                    !customersError &&
                    customerOptions.map((customer) => (
                      <button
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                        disabled={!canManageUsers}
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch('');
                          setCustomerOpen(false);
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
        )}

        {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
        {success && <p className="mt-2 text-sm text-green-700">{success}</p>}

        <button
          className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          disabled={!canManageUsers || provisioning}
          onClick={() => void createUser()}
          type="button"
        >
          {provisioning ? 'Creating...' : 'Create user'}
        </button>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium">Reset password</h2>
        {!selectedUser ? (
          <p className="mt-2 text-sm text-slate-500">Select a user from search results first.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-700">Selected user: {userDisplay(selectedUser)}</p>
            <input
              className="mt-3 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
              disabled={!canManageUsers}
              onChange={(event) => setTempPassword(event.target.value)}
              placeholder="Temporary password"
              value={tempPassword}
            />
            <button
              className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={!canManageUsers || resetting}
              onClick={() => void resetPassword()}
              type="button"
            >
              {resetting ? 'Updating...' : 'Set temporary password'}
            </button>
            {resetMessage && <p className="mt-2 text-sm text-slate-600">{resetMessage}</p>}
          </>
        )}
      </section>
    </main>
  );
}
