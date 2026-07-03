import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { TbColumnMap, TbImportKind } from '@scrutiny/shared';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui';
import { Amount } from '../../components/ui';
import { ApiError, apiFetch, apiUpload } from '../../lib/api';
import { useEngagement } from '../engagements/EngagementLayout';
import { ColumnMapForm, isDraftComplete, type ColumnMapDraft } from './ColumnMapForm';

interface PreviewRow {
  rowNumber: number;
  accountCode: string;
  accountName: string;
  amount: number;
}

interface PreviewResult {
  rows: PreviewRow[];
  rowCount: number;
  errors: { rowNumber: number; code: string; message: string }[];
  totalDebit: number;
  totalCredit: number;
  total: number;
  isBalanced: boolean;
}

interface ImportMeta {
  fileName: string;
  importedAt: string;
  importedByName: string;
  rowCount: number;
}

interface TbOverview {
  current: ImportMeta | null;
  prior: ImportMeta | null;
  unmappedAccountCount: number;
}

const emptyDraft: ColumnMapDraft = {
  mode: 'debitCredit',
  accountCode: '',
  accountName: '',
  balance: '',
  debit: '',
  credit: '',
  decimalSeparator: '.',
  delimiter: ',',
};

function draftToColumnMap(draft: ColumnMapDraft): TbColumnMap {
  const base = {
    accountCode: draft.accountCode,
    accountName: draft.accountName,
    decimalSeparator: draft.decimalSeparator,
    delimiter: draft.delimiter,
  };
  return draft.mode === 'balance'
    ? { ...base, balance: draft.balance }
    : { ...base, debit: draft.debit, credit: draft.credit };
}

/** First-line header sniff for CSVs; XLSX headers cannot be read client-side. */
function detectCsvHeaders(firstLine: string, delimiter: ',' | ';'): string[] {
  return firstLine
    .replace(new RegExp('^\\uFEFF'), '')
    .split(delimiter)
    .map((h) => h.trim().replace(/^"(.*)"$/, '$1'))
    .filter((h) => h !== '');
}

export function TbImportPage() {
  const engagement = useEngagement();
  const queryClient = useQueryClient();
  const archived = engagement.status === 'ARCHIVED';

  const [kind, setKind] = useState<TbImportKind>('CURRENT');
  const [file, setFile] = useState<File | null>(null);
  const [firstLine, setFirstLine] = useState('');
  const [draft, setDraft] = useState<ColumnMapDraft>(emptyDraft);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCsv = file !== null && !/\.xlsx$/i.test(file.name);
  const headers = isCsv ? detectCsvHeaders(firstLine, draft.delimiter) : [];

  const { data: overview } = useQuery({
    queryKey: ['engagement', engagement.id, 'trial-balance'],
    queryFn: () => apiFetch<TbOverview>(`/engagements/${engagement.id}/trial-balance`),
  });
  const existing = overview ? (kind === 'CURRENT' ? overview.current : overview.prior) : null;

  async function onFileChange(next: File | null) {
    setFile(next);
    setPreview(null);
    setError(null);
    setDraft(emptyDraft);
    if (next && !/\.xlsx$/i.test(next.name)) {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
        reader.readAsText(next.slice(0, 64 * 1024));
      });
      setFirstLine(text.split(/\r?\n/)[0] ?? '');
    } else {
      setFirstLine('');
    }
  }

  function buildForm(): FormData {
    if (!file) throw new Error('No file selected.');
    const form = new FormData();
    form.append('columnMap', JSON.stringify(draftToColumnMap(draft)));
    form.append('kind', kind);
    form.append('file', file, file.name);
    return form;
  }

  const previewMutation = useMutation({
    mutationFn: () =>
      apiUpload<PreviewResult>(`/engagements/${engagement.id}/trial-balance/preview`, buildForm()),
    onSuccess: (result) => {
      setPreview(result);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Preview failed.'),
  });

  const importMutation = useMutation({
    mutationFn: () =>
      apiUpload<{ rowCount: number }>(
        `/engagements/${engagement.id}/trial-balance/import`,
        buildForm(),
      ),
    onSuccess: async () => {
      setPreview(null);
      setFile(null);
      setError(null);
      await queryClient.invalidateQueries({
        queryKey: ['engagement', engagement.id, 'trial-balance'],
      });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Import failed.'),
  });

  const canPreview = file !== null && isDraftComplete(draft) && !previewMutation.isPending;
  const canConfirm =
    preview !== null && preview.errors.length === 0 && preview.isBalanced && !importMutation.isPending;

  if (archived) {
    return (
      <p className="rounded-control bg-sunken px-3 py-2 text-[13px] text-ink-muted">
        This engagement is archived — the trial balance is read-only.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {(overview?.current || overview?.prior) && (
        <Card>
          <CardHeader title="Imported trial balances" />
          <CardBody>
            <ul className="space-y-1 text-sm text-ink">
              {overview.current && (
                <li>
                  <span className="font-medium">Current year:</span> {overview.current.fileName} ·{' '}
                  {overview.current.rowCount} accounts · by {overview.current.importedByName}
                </li>
              )}
              {overview.prior && (
                <li>
                  <span className="font-medium">Prior year:</span> {overview.prior.fileName} ·{' '}
                  {overview.prior.rowCount} accounts · by {overview.prior.importedByName}
                </li>
              )}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="1 · Choose file" />
        <CardBody className="space-y-4">
          <Field label="Trial balance kind" htmlFor="tb-kind">
            <Select
              id="tb-kind"
              className="max-w-56"
              value={kind}
              onChange={(e) => setKind(e.target.value as TbImportKind)}
            >
              <option value="CURRENT">Current year</option>
              <option value="PRIOR">Prior year</option>
            </Select>
          </Field>
          <Field label="File (CSV or XLSX)" htmlFor="tb-file">
            <input
              id="tb-file"
              type="file"
              accept=".csv,.xlsx"
              className="block text-sm text-ink file:mr-3 file:rounded-control file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
            />
          </Field>
          {existing && (
            <p className="rounded-control bg-warning-tint px-3 py-2 text-[13px] text-warning">
              A {kind === 'CURRENT' ? 'current-year' : 'prior-year'} import already exists (
              {existing.fileName}). Importing again replaces it entirely.
            </p>
          )}
        </CardBody>
      </Card>

      {file && (
        <Card>
          <CardHeader title="2 · Map columns" />
          <CardBody className="space-y-4">
            {!isCsv && (
              <p className="text-[13px] text-ink-muted">
                XLSX headers cannot be inspected in the browser — type the exact header names from
                the first worksheet row.
              </p>
            )}
            {isCsv ? (
              <ColumnMapForm headers={headers} isCsv value={draft} onChange={setDraft} />
            ) : (
              <XlsxColumnInputs value={draft} onChange={setDraft} />
            )}
            <Button onClick={() => previewMutation.mutate()} disabled={!canPreview}>
              {previewMutation.isPending ? 'Analyzing…' : 'Preview'}
            </Button>
          </CardBody>
        </Card>
      )}

      {preview && (
        <Card>
          <CardHeader
            title="3 · Preview"
            actions={
              preview.isBalanced ? (
                <Badge tone="success">Balanced</Badge>
              ) : (
                <Badge tone="danger">Out of balance</Badge>
              )
            }
          />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
              <span>
                Rows: <span className="tnum font-medium">{preview.rowCount}</span>
              </span>
              <span>
                Debits:{' '}
                <Amount value={preview.totalDebit} minorUnitsPerMajor={engagement.minorUnitsPerMajor} />
              </span>
              <span>
                Credits:{' '}
                <Amount
                  value={-preview.totalCredit}
                  minorUnitsPerMajor={engagement.minorUnitsPerMajor}
                />
              </span>
              {preview.errors.length > 0 && (
                <Badge tone="danger">{preview.errors.length} row error(s)</Badge>
              )}
            </div>

            {preview.errors.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-control bg-danger-tint px-3 py-2 text-[13px] text-danger">
                {preview.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.rowNumber}: {e.message}
                  </li>
                ))}
              </ul>
            )}

            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Name</TH>
                  <TH className="text-right">Amount</TH>
                </TR>
              </THead>
              <TBody>
                {preview.rows.map((row) => (
                  <TR key={row.rowNumber}>
                    <TD>{row.accountCode}</TD>
                    <TD>{row.accountName}</TD>
                    <TD className="text-right">
                      <Amount value={row.amount} minorUnitsPerMajor={engagement.minorUnitsPerMajor} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            {preview.rowCount > preview.rows.length && (
              <p className="text-[13px] text-ink-faint">
                Showing the first {preview.rows.length} of {preview.rowCount} rows.
              </p>
            )}

            <Button onClick={() => importMutation.mutate()} disabled={!canConfirm}>
              {importMutation.isPending
                ? 'Importing…'
                : existing
                  ? 'Confirm import (replaces existing)'
                  : 'Confirm import'}
            </Button>
          </CardBody>
        </Card>
      )}

      {error && (
        <p className="rounded-control bg-danger-tint px-3 py-2 text-[13px] text-danger">{error}</p>
      )}
    </div>
  );
}

/** Free-text fallback for XLSX, where the browser cannot list the headers. */
function XlsxColumnInputs({
  value,
  onChange,
}: {
  value: ColumnMapDraft;
  onChange: (next: ColumnMapDraft) => void;
}) {
  const set = (patch: Partial<ColumnMapDraft>) => onChange({ ...value, ...patch });
  const text = (
    id: string,
    label: string,
    key: 'accountCode' | 'accountName' | 'debit' | 'credit' | 'balance',
  ) => (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        className="h-9 w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-ink"
        value={value[key]}
        onChange={(e) => set({ [key]: e.target.value } as Partial<ColumnMapDraft>)}
      />
    </Field>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {text('cm-code', 'Account code column', 'accountCode')}
        {text('cm-name', 'Account name column', 'accountName')}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {text('cm-debit', 'Debit column', 'debit')}
        {text('cm-credit', 'Credit column', 'credit')}
      </div>
      <Field label="Decimal separator">
        <div className="flex gap-4 text-sm text-ink">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="cm-decimal"
              checked={value.decimalSeparator === '.'}
              onChange={() => set({ decimalSeparator: '.' })}
            />
            Dot — 1,234.56
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="cm-decimal"
              checked={value.decimalSeparator === ','}
              onChange={() => set({ decimalSeparator: ',' })}
            />
            Comma — 1.234,56
          </label>
        </div>
      </Field>
    </div>
  );
}
