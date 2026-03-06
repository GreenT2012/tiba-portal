import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SignInButton } from './signin-button';

export default async function LoginPage() {
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto mt-16 max-w-md rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Use your Keycloak account to access the TIBA portal.</p>
      <div className="mt-6">
        <SignInButton />
      </div>
    </main>
  );
}
