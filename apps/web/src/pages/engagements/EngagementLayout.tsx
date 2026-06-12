import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom';
import type { EngagementRecord } from '@scrutiny/shared';
import { PageHeader, Spinner, StatusChip } from '../../components/ui';
import { ApiError, apiFetch } from '../../lib/api';

export interface EngagementContext {
  engagement: EngagementRecord;
}

/** Child pages of /engagements/:id read the engagement from outlet context. */
export function useEngagement(): EngagementRecord {
  return useOutletContext<EngagementContext>().engagement;
}

export function EngagementLayout() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, error } = useQuery({
    queryKey: ['engagement', id],
    queryFn: () => apiFetch<EngagementRecord>(`/engagements/${id}`),
    retry: false,
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (error || !data) {
    const message =
      error instanceof ApiError && error.status === 404
        ? 'Engagement not found, or you are not a member of it.'
        : 'Could not load the engagement.';
    return <p className="rounded-control bg-danger-tint px-3 py-2 text-[13px] text-danger">{message}</p>;
  }

  return (
    <>
      <Link
        to="/engagements"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All engagements
      </Link>
      <PageHeader
        title={data.name}
        description={`${data.clientName} · ${data.periodStart} → ${data.periodEnd} · ${data.currencyCode}`}
        actions={<StatusChip status={data.status} />}
      />
      <Outlet context={{ engagement: data } satisfies EngagementContext} />
    </>
  );
}
