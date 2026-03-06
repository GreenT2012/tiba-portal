import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';

export default async function AdminPage() {
  const session = await auth();
  const roles = session?.roles ?? [];
  const isInternal = roles.includes('tiba_agent') || roles.includes('tiba_admin');

  if (!session) {
    redirect('/login');
  }

  if (!isInternal) {
    redirect('/dashboard');
  }

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-slate-600">Administrative module for customers, users, and system-near management flows.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link className="rounded-md border border-slate-200 bg-white p-5 hover:border-slate-300" href="/admin/customers">
          <h2 className="text-base font-medium text-slate-900">Customers</h2>
          <p className="mt-2 text-sm text-slate-600">Create and review customer tenants inside the Admin module.</p>
        </Link>
        <Link className="rounded-md border border-slate-200 bg-white p-5 hover:border-slate-300" href="/admin/users">
          <h2 className="text-base font-medium text-slate-900">Users</h2>
          <p className="mt-2 text-sm text-slate-600">Provision users, assign roles, and reset passwords.</p>
        </Link>
      </div>
    </main>
  );
}
