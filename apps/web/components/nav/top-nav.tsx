'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type TopNavProps = {
  email: string | null;
  roles: string[];
};

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  if (href === '/tickets') {
    return pathname === '/tickets' || pathname.startsWith('/tickets/');
  }
  if (href === '/tickets/new') {
    return pathname === '/tickets/new';
  }
  if (href === '/tiba') {
    return pathname === '/tiba';
  }
  if (href === '/tiba/projects') {
    return pathname === '/tiba/projects';
  }
  if (href === '/tiba/customers') {
    return pathname === '/tiba/customers';
  }
  if (href === '/tiba/users') {
    return pathname === '/tiba/users';
  }
  return pathname === href;
}

function roleLabel(roles: string[]) {
  if (roles.includes('tiba_admin')) {
    return 'tiba_admin';
  }
  if (roles.includes('tiba_agent')) {
    return 'tiba_agent';
  }
  if (roles.includes('customer_user')) {
    return 'customer_user';
  }
  return 'user';
}

export function TopNav({ email, roles }: TopNavProps) {
  const pathname = usePathname();
  const isTiba = roles.includes('tiba_agent') || roles.includes('tiba_admin');

  const baseClass = 'rounded-md px-3 py-2 text-sm';
  const activeClass = 'bg-slate-900 text-white';
  const inactiveClass = 'text-slate-700 hover:bg-slate-100';

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-2">
          <Link
            className={`${baseClass} ${isActive(pathname, '/dashboard') ? activeClass : inactiveClass}`}
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link className={`${baseClass} ${isActive(pathname, '/tickets') ? activeClass : inactiveClass}`} href="/tickets">
            Tickets
          </Link>
          <Link
            className={`${baseClass} ${isActive(pathname, '/tickets/new') ? activeClass : inactiveClass}`}
            href="/tickets/new"
          >
            New Ticket
          </Link>
          {isTiba && (
            <>
              <Link className={`${baseClass} ${isActive(pathname, '/tiba') ? activeClass : inactiveClass}`} href="/tiba">
                TIBA Board
              </Link>
              <Link
                className={`${baseClass} ${isActive(pathname, '/tiba/projects') ? activeClass : inactiveClass}`}
                href="/tiba/projects"
              >
                TIBA Projects
              </Link>
              <Link
                className={`${baseClass} ${isActive(pathname, '/tiba/customers') ? activeClass : inactiveClass}`}
                href="/tiba/customers"
              >
                TIBA Customers
              </Link>
              <Link
                className={`${baseClass} ${isActive(pathname, '/tiba/users') ? activeClass : inactiveClass}`}
                href="/tiba/users"
              >
                TIBA Users
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">{email ?? 'user'}</span>
          <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-700">
            {roleLabel(roles)}
          </span>
          <Link className="rounded-md border border-slate-300 bg-white px-3 py-1.5" href="/logout">
            Logout
          </Link>
        </div>
      </div>
    </header>
  );
}
