import { assertSafeAmount, roundHalfAwayFromZero, type TbColumnMap } from '@scrutiny/shared';
import { parse as parseCsv } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

export type { TbColumnMap };

export interface ParsedRow {
  /** 1-based data row (header excluded). */
  rowNumber: number;
  accountCode: string;
  accountName: string;
  /** Signed minor units: debit +, credit −. */
  amount: number;
}

export type RowErrorCode =
  | 'MISSING_CODE'
  | 'MISSING_NAME'
  | 'UNPARSEABLE_AMOUNT'
  | 'DEBIT_AND_CREDIT'
  | 'DUPLICATE_CODE';

export interface RowError {
  rowNumber: number;
  code: RowErrorCode;
  message: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: RowError[];
  /** Totals over successfully parsed rows, in signed minor units. */
  totalDebit: number;
  totalCredit: number;
  total: number;
  isBalanced: boolean;
}

/** A source record as header→cell-string, plus its 1-based data row number. */
interface RawRecord {
  rowNumber: number;
  cells: Record<string, string>;
}

function isXlsx(fileName: string): boolean {
  return /\.xlsx$/i.test(fileName);
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const obj = value as { text?: unknown; result?: unknown };
    if (typeof obj.text === 'string') return obj.text.trim();
    if (obj.result !== undefined && obj.result !== null) return String(obj.result).trim();
  }
  return String(value).trim();
}

function readCsv(buffer: Buffer, delimiter: string): RawRecord[] {
  const records = parseCsv(buffer, {
    columns: true,
    bom: true,
    delimiter,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];
  return records.map((cells, index) => ({ rowNumber: index + 1, cells }));
}

async function readXlsx(buffer: Buffer): Promise<RawRecord[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs ships pre-Node-22 Buffer typings; hand it a plain ArrayBuffer copy.
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(arrayBuffer as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: Record<number, string> = {};
  headerRow.eachCell((cell, col) => {
    headers[col] = cellToString(cell.value);
  });

  const records: RawRecord[] = [];
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const cells: Record<string, string> = {};
    let hasContent = false;
    for (const [colStr, header] of Object.entries(headers)) {
      if (!header) continue;
      const text = cellToString(row.getCell(Number(colStr)).value);
      cells[header] = text;
      if (text !== '') hasContent = true;
    }
    if (hasContent) records.push({ rowNumber: r - 1, cells });
  }
  return records;
}

/**
 * Parses a numeric cell to signed minor units, or returns null when it cannot be
 * parsed. Blank → 0. Parentheses denote a negative. The thousands separator is
 * whichever character is not the decimal separator.
 */
function parseAmountToMinor(
  raw: string,
  decimalSeparator: '.' | ',',
  minorUnitsPerMajor: number,
): number | null {
  let s = raw.trim();
  if (s === '') return 0;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1).trim();
  }

  const thousands = decimalSeparator === '.' ? ',' : '.';
  s = s.split(thousands).join('');
  if (decimalSeparator === ',') s = s.replace(',', '.');

  if (!/^\d+(\.\d+)?$/.test(s)) return null;

  const major = Number(s);
  if (!Number.isFinite(major)) return null;

  const magnitude = roundHalfAwayFromZero(major * minorUnitsPerMajor);
  const minor = negative ? -magnitude : magnitude;
  try {
    assertSafeAmount(minor);
  } catch {
    return null;
  }
  return minor;
}

function amountForRow(
  cells: Record<string, string>,
  columnMap: TbColumnMap,
  minorUnitsPerMajor: number,
): { amount: number } | { error: RowErrorCode } {
  const { decimalSeparator } = columnMap;

  if (columnMap.balance !== undefined) {
    const amount = parseAmountToMinor(cells[columnMap.balance] ?? '', decimalSeparator, minorUnitsPerMajor);
    if (amount === null) return { error: 'UNPARSEABLE_AMOUNT' };
    return { amount };
  }

  const debit = parseAmountToMinor(cells[columnMap.debit ?? ''] ?? '', decimalSeparator, minorUnitsPerMajor);
  const credit = parseAmountToMinor(cells[columnMap.credit ?? ''] ?? '', decimalSeparator, minorUnitsPerMajor);
  if (debit === null || credit === null) return { error: 'UNPARSEABLE_AMOUNT' };
  if (debit > 0 && credit > 0) return { error: 'DEBIT_AND_CREDIT' };
  return { amount: debit - credit };
}

/**
 * Parses a CSV/XLSX trial balance into typed rows plus a collected error list
 * (never throws on bad data; only misconfiguration throws). Amounts become signed
 * integer minor units (debit +, credit −). `isBalanced` is the Σ over parsed rows.
 */
export async function parseTrialBalanceFile(
  buffer: Buffer,
  fileName: string,
  columnMap: TbColumnMap,
  minorUnitsPerMajor: number,
): Promise<ParseResult> {
  if (columnMap.balance === undefined && (columnMap.debit === undefined || columnMap.credit === undefined)) {
    throw new Error('columnMap must define either "balance" or both "debit" and "credit".');
  }

  const raw = isXlsx(fileName)
    ? await readXlsx(buffer)
    : readCsv(buffer, columnMap.delimiter ?? ',');

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];
  const seenCodes = new Set<string>();

  for (const { rowNumber, cells } of raw) {
    const rowErrors: RowError[] = [];
    const push = (code: RowErrorCode, message: string) => rowErrors.push({ rowNumber, code, message });

    const accountCode = (cells[columnMap.accountCode] ?? '').trim();
    const accountName = (cells[columnMap.accountName] ?? '').trim();

    if (accountCode === '') push('MISSING_CODE', 'Account code is required.');
    if (accountName === '') push('MISSING_NAME', 'Account name is required.');
    if (accountCode !== '' && seenCodes.has(accountCode)) {
      push('DUPLICATE_CODE', `Account code "${accountCode}" appears more than once.`);
    }

    const amountResult = amountForRow(cells, columnMap, minorUnitsPerMajor);
    if ('error' in amountResult) {
      push(
        amountResult.error,
        amountResult.error === 'DEBIT_AND_CREDIT'
          ? 'A line cannot have both a debit and a credit amount.'
          : 'Amount is not a valid number.',
      );
    }

    if (accountCode !== '') seenCodes.add(accountCode);

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }
    // amountResult has an amount here (no errors were pushed).
    const amount = (amountResult as { amount: number }).amount;
    rows.push({ rowNumber, accountCode, accountName, amount });
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const row of rows) {
    if (row.amount >= 0) totalDebit += row.amount;
    else totalCredit += -row.amount;
  }
  const total = totalDebit - totalCredit;

  return { rows, errors, totalDebit, totalCredit, total, isBalanced: total === 0 };
}
