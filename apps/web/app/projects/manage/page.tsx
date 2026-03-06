import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProjectsAdminPage } from '@/components/projects/project-management';

export default async function ProjectManagementPage() {
  const session = await auth();
  const roles = session?.roles ?? [];
  const isInternal = roles.includes('tiba_agent') || roles.includes('tiba_admin');

  if (!session) {
    redirect('/login');
  }

  if (!isInternal) {
    redirect('/projects');
  }

  return <ProjectsAdminPage />;
}
