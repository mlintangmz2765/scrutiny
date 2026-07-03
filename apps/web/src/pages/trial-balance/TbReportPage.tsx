import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { FsliStatement } from '@scrutiny/shared';
import {
  Amount,
  Badge,
  EmptyState,
  Spinner,
  Table,
  Tabs,
  TBody,
  TD,
  TH,
  THead,
  TotalsRow,
  TR,
} from '../../components/ui';
import { cn } from '../../lib/cn';
import { apiFetch } from '../../lib/api';
import { useEngagement } from '../engagements/EngagementLayout';

interface ReportRow {
  accountCode: string;
  accountName: string;
  fsliCode: string | null;
  priorAmount: number | null;
  currentAmount: number | null;
}

interface ReportData {
  rows: ReportRow[];
  totals: { prior: number; current: number };
}

interface SummaryRow {
  fsliCode: string;
  name: string;
  statement: FsliStatement;
  priorTotal: number;
  currentTotal: number;
  delta: number;
  deltaPct: number | null;
}

interface SummaryData {
  rows: SummaryRow[];
  unmappedCurrentTotal: number;
  unmappedAccountCount: number;
}

function formatPct(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export function TbReportPage() {
  const engagement = useEngagement();
  const [view, setView] = useState('accounts');
  const minor = engagement.minorUnitsPerMajor;

  const { data: report, isPending: reportPending } = useQuery({
    queryKey: ['engagement', engagement.id, 'tb-report'],
    queryFn: () => apiFetch<ReportData>(`/engagements/${engagement.id}/trial-balance/report`),
  });
  const { data: summary } = useQuery({
    queryKey: ['engagement', engagement.id, 'tb-summary'],
    queryFn: () => apiFetch<SummaryData>(`/engagements/${engagement.id}/trial-balance/summary`),
  });

  if (reportPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!report || report.rows.length === 0) {
    return (
      <EmptyState
        title="No trial balance yet"
        hint="Import a trial balance to see the account and FSLI views."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        items={[
          { id: 'accounts', label: 'Accounts' },
          { id: 'fsli', label: 'By FSLI' },
        ]}
        active={view}
        onChange={setView}
      />

      {view === 'accounts' ? (
        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Account</TH>
              <TH>FSLI</TH>
              <TH className="text-right">Prior year</TH>
              <TH className="text-right">Current year</TH>
            </TR>
          </THead>
          <TBody>
            {report.rows.map((row) => (
              <TR key={row.accountCode} className={cn(row.fsliCode === null && 'bg-warning-tint')}>
                <TD>{row.accountCode}</TD>
                <TD>{row.accountName}</TD>
                <TD>
                  {row.fsliCode ?? <Badge tone="warning">unmapped</Badge>}
                </TD>
                <TD className="text-right">
                  <Amount value={row.priorAmount} minorUnitsPerMajor={minor} />
                </TD>
                <TD className="text-right">
                  <Amount value={row.currentAmount} minorUnitsPerMajor={minor} />
                </TD>
              </TR>
            ))}
            <TotalsRow>
              <TD colSpan={3}>Total</TD>
              <TD className="text-right">
                <Amount value={report.totals.prior} minorUnitsPerMajor={minor} />
              </TD>
              <TD className="text-right">
                <Amount value={report.totals.current} minorUnitsPerMajor={minor} />
              </TD>
            </TotalsRow>
          </TBody>
        </Table>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>FSLI</TH>
              <TH>Name</TH>
              <TH>Statement</TH>
              <TH className="text-right">Prior year</TH>
              <TH className="text-right">Current year</TH>
              <TH className="text-right">Δ</TH>
              <TH className="text-right">Δ%</TH>
            </TR>
          </THead>
          <TBody>
            {(summary?.rows ?? []).map((row) => (
              <TR key={row.fsliCode}>
                <TD>{row.fsliCode}</TD>
                <TD>{row.name}</TD>
                <TD>{row.statement === 'BS' ? 'Balance sheet' : 'Income statement'}</TD>
                <TD className="text-right">
                  <Amount value={row.priorTotal} minorUnitsPerMajor={minor} />
                </TD>
                <TD className="text-right">
                  <Amount value={row.currentTotal} minorUnitsPerMajor={minor} />
                </TD>
                <TD className="text-right">
                  <Amount value={row.delta} minorUnitsPerMajor={minor} />
                </TD>
                <TD className="text-right tnum">{formatPct(row.deltaPct)}</TD>
              </TR>
            ))}
            {summary && summary.unmappedAccountCount > 0 && (
              <TR className="bg-warning-tint">
                <TD colSpan={4}>
                  <Badge tone="warning">{summary.unmappedAccountCount} unmapped accounts</Badge>
                </TD>
                <TD className="text-right">
                  <Amount value={summary.unmappedCurrentTotal} minorUnitsPerMajor={minor} />
                </TD>
                <TD colSpan={2} />
              </TR>
            )}
          </TBody>
        </Table>
      )}
    </div>
  );
}
