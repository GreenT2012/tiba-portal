import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProjectsAdminPage } from './projects-admin';

export default async function TibaProjectsPage() {
  const session = await auth();
  const roles = session?.roles ?? [];
  const isTiba = roles.includes('tiba_agent') || roles.includes('tiba_admin');

  if (!session) {
    redirect('/api/auth/signin?callbackUrl=/tiba/projects');
  }

  if (!isTiba) {
    redirect('/tickets');
  }

  return <ProjectsAdminPage />;
}
