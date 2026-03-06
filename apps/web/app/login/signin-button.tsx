'use client';

import { signIn } from 'next-auth/react';

export function SignInButton() {
  return (
    <button
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100"
      onClick={() => {
        void signIn('keycloak', { callbackUrl: '/dashboard' }, { prompt: 'login', max_age: '0' });
      }}
      type="button"
    >
      Sign in with Keycloak
    </button>
  );
}
