import { AuthButtons } from '@/components/auth-buttons';
import { auth } from '@/auth';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <AuthButtons />
      </div>

      <p className="mt-2 text-slate-600">Authenticated user context:</p>

      <pre className="mt-4 overflow-auto rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
        {JSON.stringify(
          {
            sub: session?.user?.sub ?? null,
            email: session?.user?.email ?? null,
            roles: session?.roles ?? [],
            customerId: session?.customerId ?? null
          },
          null,
          2
        )}
      </pre>
    </main>
  );
}
