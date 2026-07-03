import { Field, Select } from '../../components/ui';

export type AmountMode = 'debitCredit' | 'balance';

/** Draft column mapping edited by the wizard; becomes a TbColumnMap on submit. */
export interface ColumnMapDraft {
  mode: AmountMode;
  accountCode: string;
  accountName: string;
  balance: string;
  debit: string;
  credit: string;
  decimalSeparator: '.' | ',';
  delimiter: ',' | ';';
}

export function isDraftComplete(draft: ColumnMapDraft): boolean {
  if (draft.accountCode === '' || draft.accountName === '') return false;
  return draft.mode === 'balance' ? draft.balance !== '' : draft.debit !== '' && draft.credit !== '';
}

function HeaderSelect({
  id,
  headers,
  value,
  onChange,
}: {
  id: string;
  headers: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— select column —</option>
      {headers.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </Select>
  );
}

export function ColumnMapForm({
  headers,
  isCsv,
  value,
  onChange,
}: {
  /** Column headers detected from the file's first row. */
  headers: string[];
  /** Delimiter choice only applies to CSV files. */
  isCsv: boolean;
  value: ColumnMapDraft;
  onChange: (next: ColumnMapDraft) => void;
}) {
  const set = (patch: Partial<ColumnMapDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      {isCsv && (
        <Field label="Field delimiter" htmlFor="cm-delimiter" hint="Re-detects the column headers.">
          <Select
            id="cm-delimiter"
            className="max-w-40"
            value={value.delimiter}
            onChange={(e) => set({ delimiter: e.target.value as ',' | ';' })}
          >
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
          </Select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Account code column" htmlFor="cm-code">
          <HeaderSelect
            id="cm-code"
            headers={headers}
            value={value.accountCode}
            onChange={(v) => set({ accountCode: v })}
          />
        </Field>
        <Field label="Account name column" htmlFor="cm-name">
          <HeaderSelect
            id="cm-name"
            headers={headers}
            value={value.accountName}
            onChange={(v) => set({ accountName: v })}
          />
        </Field>
      </div>

      <Field label="Amount columns">
        <div className="flex gap-4 text-sm text-ink">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="cm-mode"
              checked={value.mode === 'debitCredit'}
              onChange={() => set({ mode: 'debitCredit' })}
            />
            Separate debit and credit
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="cm-mode"
              checked={value.mode === 'balance'}
              onChange={() => set({ mode: 'balance' })}
            />
            One signed balance
          </label>
        </div>
      </Field>

      {value.mode === 'debitCredit' ? (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Debit column" htmlFor="cm-debit">
            <HeaderSelect
              id="cm-debit"
              headers={headers}
              value={value.debit}
              onChange={(v) => set({ debit: v })}
            />
          </Field>
          <Field label="Credit column" htmlFor="cm-credit">
            <HeaderSelect
              id="cm-credit"
              headers={headers}
              value={value.credit}
              onChange={(v) => set({ credit: v })}
            />
          </Field>
        </div>
      ) : (
        <Field label="Balance column" htmlFor="cm-balance" hint="Signed: debits positive, credits negative.">
          <HeaderSelect
            id="cm-balance"
            headers={headers}
            value={value.balance}
            onChange={(v) => set({ balance: v })}
          />
        </Field>
      )}

      <Field label="Decimal separator" hint="Never guessed — pick what the file uses.">
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
