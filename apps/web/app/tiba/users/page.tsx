import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { UsersAdminPage } from './users-admin';

export default async function TibaUsersPage() {
  const session = await auth();
  const roles = session?.roles ?? [];
  const isTiba = roles.includes('tiba_agent') || roles.includes('tiba_admin');

  if (!session) {
    redirect('/login');
  }

  if (!isTiba) {
    redirect('/tickets');
  }

  return <UsersAdminPage />;
}
