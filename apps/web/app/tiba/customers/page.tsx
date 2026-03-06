import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { CustomersAdminPage } from './customers-admin';

export default async function TibaCustomersPage() {
  const session = await auth();
  const roles = session?.roles ?? [];
  const isTiba = roles.includes('tiba_agent') || roles.includes('tiba_admin');

  if (!session) {
    redirect('/api/auth/signin?callbackUrl=/tiba/customers');
  }

  if (!isTiba) {
    redirect('/tickets');
  }

  return <CustomersAdminPage />;
}
