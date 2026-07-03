/**
 * Keyword-based FSLI auto-suggestion (docs/phases/PHASE-02 T-02.5). Matching is
 * case-insensitive on the account name; first matching entry wins, so more
 * specific patterns must precede generic ones. No match → null.
 */
export const FSLI_SUGGESTION_KEYWORDS: readonly { pattern: RegExp; fsliCode: string }[] = [
  { pattern: /cost of (goods|sales)|cogs/, fsliCode: 'X.1' },
  { pattern: /tax expense/, fsliCode: 'X.5' },
  { pattern: /depreciation|amortization/, fsliCode: 'X.3' },
  { pattern: /interest/, fsliCode: 'X.4' },
  // \b guards: "current" contains "rent"; "bank loan" must hit loan, not bank.
  { pattern: /\b(salary|salaries|rent|utilities|office)\b/, fsliCode: 'X.2' },
  { pattern: /revenue|sales/, fsliCode: 'R.1' },
  { pattern: /loan|borrowing/, fsliCode: 'L.4' },
  { pattern: /cash|bank/, fsliCode: 'A.1' },
  { pattern: /receivable|debtor/, fsliCode: 'A.2' },
  { pattern: /inventory|stock/, fsliCode: 'A.4' },
  { pattern: /prepaid/, fsliCode: 'A.5' },
  { pattern: /equipment|property|vehicle/, fsliCode: 'A.6' },
  { pattern: /payable|creditor/, fsliCode: 'L.1' },
  { pattern: /capital|share/, fsliCode: 'E.1' },
  { pattern: /retained/, fsliCode: 'E.2' },
];

/** Suggests an FSLI code for an account name, or null when nothing matches. */
export function suggestFsli(accountName: string): string | null {
  const name = accountName.toLowerCase();
  for (const { pattern, fsliCode } of FSLI_SUGGESTION_KEYWORDS) {
    if (pattern.test(name)) return fsliCode;
  }
  return null;
}
