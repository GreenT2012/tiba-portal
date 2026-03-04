import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function TibaPage() {
  const session = await auth();
  const roles = session?.roles ?? [];
  const isTiba = roles.includes('tiba_agent') || roles.includes('tiba_admin');

  if (!session) {
    redirect('/api/auth/signin?callbackUrl=/tiba');
  }

  if (!isTiba) {
    redirect('/dashboard');
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold">TIBA Board</h1>
      <p className="mt-2 text-slate-600">Board views are available in this section for TIBA roles.</p>
    </main>
  );
}
