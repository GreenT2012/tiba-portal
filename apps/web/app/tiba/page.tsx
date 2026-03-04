import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TibaBoard } from './tiba-board';

export default async function TibaPage() {
  const session = await auth();
  const roles = session?.roles ?? [];
  const isTiba = roles.includes('tiba_agent') || roles.includes('tiba_admin');

  if (!session) {
    redirect('/api/auth/signin?callbackUrl=/tiba');
  }

  if (!isTiba) {
    redirect('/tickets');
  }

  return <TibaBoard currentUserSub={session.user.sub} />;
}
