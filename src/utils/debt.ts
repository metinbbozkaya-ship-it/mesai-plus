import { Debt, DebtPayment } from '../storage/finance';

// Pure, UI-independent debt math. No AsyncStorage, no side effects, no state —
// every function here only reads the Debt object it's given and returns a value.

export interface DebtNextInstallment {
  installmentNumber: number;
  amount: number;
}

// Rounds to 2 decimals, safe against floating-point drift (e.g. 0.1 + 0.2).
function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getInstallmentCount(debt: Debt): number {
  const n = debt?.totalInstallments;
  return Number.isFinite(n) && Number.isInteger(n) && (n as number) > 0 ? (n as number) : 0;
}

// De-duplicated, range-guarded set of installmentNumbers marked paid=true.
// Ignores malformed entries (missing/non-integer/out-of-range numbers) and
// counts a duplicate installmentNumber only once.
function collectUniquePaidInstallmentNumbers(debt: Debt): Set<number> {
  const seen = new Set<number>();
  if (!debt || !Array.isArray(debt.payments)) return seen;
  const count = getInstallmentCount(debt);
  for (const p of debt.payments as DebtPayment[]) {
    if (!p || typeof p !== 'object' || !p.paid) continue;
    const num = p.installmentNumber;
    if (!Number.isFinite(num) || !Number.isInteger(num) || num < 1) continue;
    if (count > 0 && num > count) continue;
    seen.add(num);
  }
  return seen;
}

// Amount owed for a single 1-based installment. The first N-1 installments are
// exactly `monthlyPayment`; the last installment absorbs whatever remainder is
// needed so the full schedule sums to exactly `totalAmount` (handles totalAmount
// not being evenly divisible by monthlyPayment × totalInstallments). Never
// negative, never crashes on malformed/out-of-range input — returns 0 instead.
export function getDebtInstallmentAmount(debt: Debt, installmentNumber: number): number {
  const total = Number.isFinite(debt?.totalAmount) ? debt.totalAmount : 0;
  const monthly = Number.isFinite(debt?.monthlyPayment) ? debt.monthlyPayment : 0;
  const count = getInstallmentCount(debt);
  if (total <= 0 || monthly <= 0 || count <= 0) return 0;
  if (!Number.isFinite(installmentNumber) || !Number.isInteger(installmentNumber)) return 0;
  if (installmentNumber < 1 || installmentNumber > count) return 0;

  if (installmentNumber < count) {
    return roundMoney(monthly);
  }
  const last = total - monthly * (count - 1);
  return roundMoney(Math.max(0, last));
}

// Sum of getDebtInstallmentAmount() for every genuinely paid=true installment —
// never a blind paidCount × monthlyPayment estimate, so a differently-sized
// last installment is always reflected correctly. Duplicate installmentNumber
// entries are counted once.
export function getDebtPaidAmount(debt: Debt): number {
  const nums = collectUniquePaidInstallmentNumbers(debt);
  let sum = 0;
  nums.forEach(num => { sum += getDebtInstallmentAmount(debt, num); });
  return roundMoney(sum);
}

// Always >= 0 — never a negative remaining balance, regardless of input.
export function getDebtRemainingAmount(debt: Debt): number {
  const total = Number.isFinite(debt?.totalAmount) ? debt.totalAmount : 0;
  if (total <= 0) return 0;
  const paid = getDebtPaidAmount(debt);
  return roundMoney(Math.max(0, total - paid));
}

export function getDebtPaidInstallmentCount(debt: Debt): number {
  return collectUniquePaidInstallmentNumbers(debt).size;
}

export function getDebtRemainingInstallmentCount(debt: Debt): number {
  const count = getInstallmentCount(debt);
  const paid = getDebtPaidInstallmentCount(debt);
  return Math.max(0, count - paid);
}

// 0..100, matching this codebase's existing percentage convention (see
// savingRate/goal pct in wallet.tsx) — not 0..1. Always clamped.
export function getDebtProgress(debt: Debt): number {
  const total = Number.isFinite(debt?.totalAmount) ? debt.totalAmount : 0;
  if (total <= 0) return 0;
  const paid = getDebtPaidAmount(debt);
  const pct = (paid / total) * 100;
  return Math.max(0, Math.min(100, pct));
}

// Requires BOTH the full installment count to be paid AND the derived
// remaining amount to be <= 0 — either signal alone could be misleading under
// inconsistent/hand-edited data, so neither is trusted on its own.
export function getDebtIsCompleted(debt: Debt): boolean {
  const count = getInstallmentCount(debt);
  if (count <= 0) return false;
  const paidCount = getDebtPaidInstallmentCount(debt);
  const remaining = getDebtRemainingAmount(debt);
  return paidCount >= count && remaining <= 0;
}

// First unpaid installment in ascending order, or null if every installment
// is paid (or the debt has no valid installment schedule at all).
export function getDebtNextInstallment(debt: Debt): DebtNextInstallment | null {
  const count = getInstallmentCount(debt);
  if (count <= 0) return null;
  const paidNums = collectUniquePaidInstallmentNumbers(debt);
  for (let i = 1; i <= count; i++) {
    if (!paidNums.has(i)) {
      return { installmentNumber: i, amount: getDebtInstallmentAmount(debt, i) };
    }
  }
  return null;
}
