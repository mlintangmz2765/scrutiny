import { FileSearch } from 'lucide-react';
import { useState } from 'react';
import {
  Amount,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatusChip,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  Tabs,
  Textarea,
  TotalsRow,
} from '../components/ui';

const swatches = [
  { name: 'primary', cls: 'bg-primary' },
  { name: 'primary-tint', cls: 'bg-primary-tint' },
  { name: 'accent', cls: 'bg-accent' },
  { name: 'ink', cls: 'bg-ink' },
  { name: 'ink-muted', cls: 'bg-ink-muted' },
  { name: 'sunken', cls: 'bg-sunken' },
  { name: 'success', cls: 'bg-success' },
  { name: 'warning', cls: 'bg-warning' },
  { name: 'danger', cls: 'bg-danger' },
  { name: 'info', cls: 'bg-info' },
];

const sampleRows = [
  { code: '1010', name: 'Cash at banks', py: 184500000, cy: 215720050 },
  { code: '1200', name: 'Trade receivables', py: 96030500, cy: 112478200 },
  { code: '2010', name: 'Trade payables', py: -64210000, cy: -71034950 },
];

export function DesignGalleryPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('unadjusted');

  return (
    <>
      <PageHeader
        title="Design system"
        description="Living gallery of every UI primitive. Keep it updated when components change (docs/DESIGN.md)."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Color tokens" description="Semantic tokens from theme.css — color always carries meaning." />
          <CardBody className="flex flex-wrap gap-3">
            {swatches.map((s) => (
              <div key={s.name} className="flex flex-col items-center gap-1.5">
                <span className={`h-10 w-16 rounded-control border border-border ${s.cls}`} />
                <span className="text-xs text-ink-muted">{s.name}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Typography" />
          <CardBody className="space-y-2">
            <p className="text-xl font-semibold">Page title — 20px / 600</p>
            <p className="text-base font-semibold">Section title — 16px / 600</p>
            <p className="text-sm">Body text — 14px / 400. Calm, dense, and exact.</p>
            <p className="text-[13px] text-ink-muted">Table body / secondary — 13px muted</p>
            <p className="text-xs text-ink-faint">Meta — 12px faint</p>
            <p className="tnum text-sm">Tabular figures: 1,234,567.89 vs 1,111,111.11</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Buttons" />
          <CardBody className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Delete engagement</Button>
            <Button size="sm">Small</Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Spinner />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Form controls" />
          <CardBody className="max-w-[560px] space-y-4">
            <Field label="Engagement name" htmlFor="g-name" hint="One engagement per fiscal year.">
              <Input id="g-name" placeholder="FY2026 audit" />
            </Field>
            <Field label="Materiality benchmark" htmlFor="g-benchmark">
              <Select id="g-benchmark" defaultValue="PROFIT_BEFORE_TAX">
                <option value="PROFIT_BEFORE_TAX">Profit before tax (default 5%)</option>
                <option value="REVENUE">Revenue (default 0.5%)</option>
                <option value="TOTAL_ASSETS">Total assets (default 0.5%)</option>
              </Select>
            </Field>
            <Field label="Planned response" htmlFor="g-response" error="A planned response is required for significant risks.">
              <Textarea id="g-response" placeholder="Describe the audit response…" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Badges & status" />
          <CardBody className="flex flex-wrap items-center gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="success">Balanced</Badge>
            <Badge tone="warning">Near materiality</Badge>
            <Badge tone="danger">High RMM</Badge>
            <Badge tone="info">Reviewed</Badge>
            <Badge tone="accent">Signed off</Badge>
            <span className="mx-2 h-4 w-px bg-border" />
            <StatusChip status="PLANNING" />
            <StatusChip status="FIELDWORK" />
            <StatusChip status="REVIEW" />
            <StatusChip status="COMPLETION" />
            <StatusChip status="ARCHIVED" />
          </CardBody>
        </Card>

        <div>
          <div className="mb-3">
            <Tabs
              items={[
                { id: 'unadjusted', label: 'Unadjusted' },
                { id: 'adjusted', label: 'Adjusted' },
                { id: 'prior', label: 'Prior year' },
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Code</TH>
                <TH>Account</TH>
                <TH numeric>Prior year</TH>
                <TH numeric>Current year</TH>
              </TR>
            </THead>
            <TBody>
              {sampleRows.map((row) => (
                <TR key={row.code}>
                  <TD className="text-ink-muted">{row.code}</TD>
                  <TD>{row.name}</TD>
                  <TD numeric>
                    <Amount value={row.py} />
                  </TD>
                  <TD numeric>
                    <Amount value={row.cy} />
                  </TD>
                </TR>
              ))}
              <TotalsRow>
                <TD>—</TD>
                <TD>Net total</TD>
                <TD numeric>
                  <Amount value={216320500} />
                </TD>
                <TD numeric>
                  <Amount value={257163300} />
                </TD>
              </TotalsRow>
            </TBody>
          </Table>
          <p className="mt-2 text-xs text-ink-faint">
            Negative amounts render in accounting parentheses, always tabular, always
            right-aligned.
          </p>
        </div>

        <EmptyState
          icon={FileSearch}
          title="Nothing sampled yet"
          hint="Empty states always say what arrives next and offer the action when available."
          action={<Button size="sm">Draw a sample</Button>}
        />
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Confirm sign-off"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Sign off as preparer</Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Signing off records your name and the current time on working paper C-100. Editing the
          paper later clears all sign-offs.
        </p>
      </Dialog>
    </>
  );
}
