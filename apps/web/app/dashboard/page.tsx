import { auth } from '@/auth';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  const roles = session?.roles ?? [];

  return (
    <main>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Global module entry with role-based overview data and direct paths into `Tickets`, `Projects`, and `Admin`.
          </p>
        </div>
        <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm" href="/logout">
          Logout (SSO)
        </Link>
      </div>

      <DashboardOverview roles={roles} />
    </main>
  );
}
