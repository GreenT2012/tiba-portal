import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { CustomersAdminPage } from '@/components/admin/customers-admin';

export default async function AdminCustomersPage() {
  const session = await auth();
  const roles = session?.roles ?? [];
  const isInternal = roles.includes('tiba_agent') || roles.includes('tiba_admin');

  if (!session) {
    redirect('/login');
  }

  if (!isInternal) {
    redirect('/dashboard');
  }

  return <CustomersAdminPage />;
}
