import type { Metadata } from 'next';
import { auth } from '@/auth';
import { TopNav } from '@/components/nav/top-nav';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'TIBA Portal',
  description: 'Customer portal and internal dashboard'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <Providers>
          {session ? <TopNav email={session.user.email} roles={session.roles ?? []} /> : null}
          <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
