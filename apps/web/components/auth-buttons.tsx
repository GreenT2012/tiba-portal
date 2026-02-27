'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  if (!session) {
    return (
      <button
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
        onClick={() => signIn('keycloak')}
        type="button"
      >
        Login
      </button>
    );
  }

  return (
    <button
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
      onClick={() => signOut({ callbackUrl: '/' })}
      type="button"
    >
      Logout
    </button>
  );
}
