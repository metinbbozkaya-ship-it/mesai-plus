import { Bill } from '../storage/finance';

// Pure, UI-independent Bill payment-plan math. No AsyncStorage, no side
// effects, no state — every function here only reads the Bill object it's
// given (and its existing paidMonths) and returns a value.
//
// A Bill is "planned" only when both totalMonths and startMonth are set to
// valid values — this is what makes it opt-in and fully backward compatible:
// legacy records (created before this feature existed) simply have neither
// field, getBillPlannedMonths() returns [] for them, and every function below
// degrades to its safe/neutral value (0, false, null) instead of throwing.
// Legacy bills keep behaving exactly as the old indefinite/recurring model.

// Generates the YYYY-MM keys covered by a planned Bill, starting at
// startMonth and running for totalMonths consecutive months. Returns [] for
// legacy bills (no totalMonths/startMonth) or malformed input — never throws.
export function getBillPlannedMonths(bill: Bill): string[] {
  const total = bill?.totalMonths;
  if (!Number.isFinite(total) || !Number.isInteger(total) || (total as number) <= 0) return [];
  const start = bill?.startMonth;
  if (typeof start !== 'string') return [];
  const m = /^(\d{4})-(\d{2})$/.exec(start);
  if (!m) return [];
  const startYear = parseInt(m[1], 10);
  const startMonthIdx = parseInt(m[2], 10) - 1; // 0-based
  if (startMonthIdx < 0 || startMonthIdx > 11) return [];

  const months: string[] = [];
  for (let i = 0; i < (total as number); i++) {
    const d = new Date(startYear, startMonthIdx + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export function isBillPlanned(bill: Bill): boolean {
  return getBillPlannedMonths(bill).length > 0;
}

// Count of planned months that are also present in paidMonths — paidMonths
// remains the single source of truth; nothing is stored separately.
export function getBillPaidCount(bill: Bill): number {
  const planned = getBillPlannedMonths(bill);
  if (planned.length === 0) return 0;
  const paid = new Set(bill.paidMonths ?? []);
  return planned.filter(m => paid.has(m)).length;
}

export function getBillRemainingMonths(bill: Bill): number {
  const planned = getBillPlannedMonths(bill);
  if (planned.length === 0) return 0;
  return Math.max(0, planned.length - getBillPaidCount(bill));
}

// 0..100, matching this codebase's existing percentage convention (see
// getDebtProgress in src/utils/debt.ts) — not 0..1. Always clamped.
export function getBillProgress(bill: Bill): number {
  const planned = getBillPlannedMonths(bill);
  if (planned.length === 0) return 0;
  const pct = (getBillPaidCount(bill) / planned.length) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function getBillIsCompleted(bill: Bill): boolean {
  const planned = getBillPlannedMonths(bill);
  if (planned.length === 0) return false;
  return getBillPaidCount(bill) >= planned.length;
}

// First planned month not yet in paidMonths, in chronological order, or null
// if every planned month is paid (or the bill isn't a planned bill at all).
export function getBillNextUnpaidMonth(bill: Bill): string | null {
  const planned = getBillPlannedMonths(bill);
  const paid = new Set(bill.paidMonths ?? []);
  for (const m of planned) {
    if (!paid.has(m)) return m;
  }
  return null;
}
