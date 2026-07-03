import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTrialBalanceFile, type RowErrorCode, type TbColumnMap } from './parser.js';

const FIXTURES = path.resolve(process.cwd(), '..', '..', 'fixtures');
const readFixture = (name: string) => readFileSync(path.join(FIXTURES, name));

const debitCreditMap: TbColumnMap = {
  accountCode: 'Code',
  accountName: 'Name',
  debit: 'Debit',
  credit: 'Credit',
  decimalSeparator: '.',
};

describe('parseTrialBalanceFile — tb-valid.csv', () => {
  it('parses every row with no errors and balances to zero', async () => {
    const result = await parseTrialBalanceFile(readFixture('tb-valid.csv'), 'tb-valid.csv', debitCreditMap, 100);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(31);
    expect(result.isBalanced).toBe(true);
    expect(result.total).toBe(0);
    expect(result.totalDebit).toBe(468_700_000);
    expect(result.totalCredit).toBe(468_700_000);
  });

  it('converts amounts to exact signed minor units (debit +, credit −)', async () => {
    const result = await parseTrialBalanceFile(readFixture('tb-valid.csv'), 'tb-valid.csv', debitCreditMap, 100);
    const byCode = Object.fromEntries(result.rows.map((r) => [r.accountCode, r.amount]));
    expect(byCode['1000']).toBe(1_500_000); // cash, debit 15,000.00
    expect(byCode['4000']).toBe(-240_000_000); // revenue, credit 2,400,000.00
    expect(byCode['3100']).toBe(-58_700_000); // retained earnings, credit 587,000.00
    expect(byCode['8000']).toBe(6_500_000); // income tax expense, debit 65,000.00
  });
});

describe('parseTrialBalanceFile — tb-valid.xlsx', () => {
  it('parses the XLSX path identically to the CSV', async () => {
    const result = await parseTrialBalanceFile(readFixture('tb-valid.xlsx'), 'tb-valid.xlsx', debitCreditMap, 100);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(31);
    expect(result.isBalanced).toBe(true);
    const byCode = Object.fromEntries(result.rows.map((r) => [r.accountCode, r.amount]));
    expect(byCode['1000']).toBe(1_500_000);
    expect(byCode['4000']).toBe(-240_000_000);
  });
});

describe('parseTrialBalanceFile — validation', () => {
  it('flags an unbalanced file without row errors', async () => {
    const result = await parseTrialBalanceFile(
      readFixture('tb-unbalanced.csv'),
      'tb-unbalanced.csv',
      debitCreditMap,
      100,
    );
    expect(result.errors).toEqual([]);
    expect(result.isBalanced).toBe(false);
    expect(result.total).toBe(1_000_000); // debits 150,000 − credits 140,000
  });

  it('detects duplicate account codes on the later row', async () => {
    const result = await parseTrialBalanceFile(
      readFixture('tb-duplicate-codes.csv'),
      'tb-duplicate-codes.csv',
      debitCreditMap,
      100,
    );
    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ rowNumber: 3, code: 'DUPLICATE_CODE' });
  });

  it('collects every kind of row error', async () => {
    const result = await parseTrialBalanceFile(
      readFixture('tb-bad-amounts.csv'),
      'tb-bad-amounts.csv',
      debitCreditMap,
      100,
    );
    expect(result.rows).toHaveLength(0);
    const codes = new Set<RowErrorCode>(result.errors.map((e) => e.code));
    expect(codes).toEqual(
      new Set<RowErrorCode>(['UNPARSEABLE_AMOUNT', 'DEBIT_AND_CREDIT', 'MISSING_CODE', 'MISSING_NAME']),
    );
  });
});

describe('parseTrialBalanceFile — number formats', () => {
  it('parses comma-decimal balances with dot thousands, parentheses, and a ";" delimiter', async () => {
    const csv = 'Code;Name;Balance\n1000;Cash;1.234,56\n2000;Payables;(1.234,56)\n';
    const columnMap: TbColumnMap = {
      accountCode: 'Code',
      accountName: 'Name',
      balance: 'Balance',
      decimalSeparator: ',',
      delimiter: ';',
    };
    const result = await parseTrialBalanceFile(Buffer.from(csv, 'utf8'), 'x.csv', columnMap, 100);
    expect(result.errors).toEqual([]);
    const byCode = Object.fromEntries(result.rows.map((r) => [r.accountCode, r.amount]));
    expect(byCode['1000']).toBe(123_456);
    expect(byCode['2000']).toBe(-123_456);
    expect(result.isBalanced).toBe(true);
  });

  it('treats blank amounts as zero and a leading minus as negative (dot-decimal, balance mode)', async () => {
    const csv = 'Code,Name,Balance\n1000,Cash,\n2000,Loan,-500.00\n';
    const columnMap: TbColumnMap = {
      accountCode: 'Code',
      accountName: 'Name',
      balance: 'Balance',
      decimalSeparator: '.',
    };
    const result = await parseTrialBalanceFile(Buffer.from(csv, 'utf8'), 'x.csv', columnMap, 100);
    const byCode = Object.fromEntries(result.rows.map((r) => [r.accountCode, r.amount]));
    expect(byCode['1000']).toBe(0);
    expect(byCode['2000']).toBe(-50_000);
  });
});
