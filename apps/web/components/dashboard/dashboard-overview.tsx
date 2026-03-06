'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardOverviewContract } from '@tiba/shared/dashboard';
import { getDashboardOverview } from '@/features/dashboard/api';

type DashboardOverviewProps = {
  roles: string[];
};

type OverviewCard = {
  title: string;
  description: string;
  href: string;
  countLabel?: string;
};

function createCards(roles: string[], overview: DashboardOverviewContract | null): OverviewCard[] {
  const isInternal = roles.includes('tiba_agent') || roles.includes('tiba_admin');

  if (!isInternal) {
    return [
      {
        title: 'Tickets',
        description: 'Open your ticket list, check updates, and continue existing work.',
        href: '/tickets',
        countLabel: overview ? `${overview.modules.tickets.openCount} open` : undefined
      },
      {
        title: 'Create Ticket',
        description: 'Start a new ticket flow inside the Tickets module.',
        href: '/tickets/new'
      },
      {
        title: 'Projects',
        description: 'Browse the projects available in your tenant.',
        href: '/projects',
        countLabel: overview ? `${overview.modules.projects.activeCount} active` : undefined
      }
    ];
  }

  const cards: OverviewCard[] = [
    {
      title: 'New Tickets',
      description: 'Go to the internal queue view for new, unassigned tickets.',
      href: '/tickets?view=new',
      countLabel: overview ? `${overview.modules.tickets.newCount ?? 0} waiting` : undefined
    },
    {
      title: 'Open Tickets',
      description: 'Continue active ticket work across tenants in the Tickets module.',
      href: '/tickets?view=open',
      countLabel: overview ? `${overview.modules.tickets.openCount} active` : undefined
    },
    {
      title: 'My Tickets',
      description: 'Jump into tickets assigned to your current user.',
      href: '/tickets?view=my',
      countLabel: overview ? `${overview.modules.tickets.myCount ?? 0} assigned` : undefined
    },
    {
      title: 'Projects',
      description: 'Open the shared Projects module for project lists and actions.',
      href: '/projects',
      countLabel: overview ? `${overview.modules.projects.activeCount} active` : undefined
    }
  ];

  cards.push({
    title: 'Admin',
    description: overview?.modules.admin?.userManagementEnabled
      ? 'Manage customers, users, and other administrative flows.'
      : 'Open customer and user administration flows that are available to your role.',
    href: '/admin',
    countLabel: overview?.modules.admin ? `${overview.modules.admin.customerCount} customers` : undefined
  });

  return cards;
}

function normalizeDashboardError(error: Error): string {
  if (error.message.includes('404: Cannot GET /api/v1/dashboard/overview')) {
    return 'The running API process does not expose the new dashboard overview route yet. Restart apps/api so /api/v1/dashboard/overview is loaded.';
  }
  return error.message;
}

export function DashboardOverview({ roles }: DashboardOverviewProps) {
  const [overview, setOverview] = useState<DashboardOverviewContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getDashboardOverview();
        if (!cancelled) {
          setOverview(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message = loadError instanceof Error ? normalizeDashboardError(loadError) : 'Failed to load dashboard overview';
          setError(message);
          setOverview(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => createCards(roles, overview), [overview, roles]);

  if (loading) {
    return <p className="text-slate-600">Loading dashboard overview...</p>;
  }

  return (
    <>
      {error && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link className="rounded-md border border-slate-200 bg-white p-5 hover:border-slate-300" href={card.href} key={card.href}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-medium text-slate-900">{card.title}</h2>
              {card.countLabel && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                  {card.countLabel}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
          </Link>
        ))}
      </div>

      {overview && (
        <section className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-900">Module overview</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tickets</p>
              <p className="mt-2 text-sm text-slate-700">Open: {overview.modules.tickets.openCount}</p>
              {overview.modules.tickets.newCount !== null && (
                <p className="text-sm text-slate-700">New: {overview.modules.tickets.newCount}</p>
              )}
              {overview.modules.tickets.myCount !== null && (
                <p className="text-sm text-slate-700">My: {overview.modules.tickets.myCount}</p>
              )}
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Projects</p>
              <p className="mt-2 text-sm text-slate-700">Total: {overview.modules.projects.totalCount}</p>
              <p className="text-sm text-slate-700">Active: {overview.modules.projects.activeCount}</p>
              <p className="text-sm text-slate-700">Archived: {overview.modules.projects.archivedCount}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Admin</p>
              {overview.modules.admin ? (
                <>
                  <p className="mt-2 text-sm text-slate-700">Customers: {overview.modules.admin.customerCount}</p>
                  <p className="text-sm text-slate-700">
                    User management: {overview.modules.admin.userManagementEnabled ? 'full access' : 'limited'}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-700">No admin access for your role.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
