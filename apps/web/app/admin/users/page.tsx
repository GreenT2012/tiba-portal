import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { UsersAdminPage } from '@/components/admin/users-admin';

export default async function AdminUsersPage() {
  const session = await auth();
  const roles = session?.roles ?? [];
  const isInternal = roles.includes('tiba_agent') || roles.includes('tiba_admin');
  const isAdmin = roles.includes('tiba_admin');

  if (!session) {
    redirect('/login');
  }

  if (!isInternal) {
    redirect('/dashboard');
  }

  return <UsersAdminPage canManageUsers={isAdmin} />;
}
