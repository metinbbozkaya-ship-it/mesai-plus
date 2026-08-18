import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Receivable {
  id: string;
  label: string;
  amount: number;
  dueDate?: string; // YYYY-MM-DD
  paid: boolean;
  createdAt: string;
}

export interface Advance {
  id: string;
  label: string;
  amount: number;
  date: string; // YYYY-MM-DD
  repaid: boolean;
  createdAt: string;
}

export interface AllowanceSettings {
  transportPerDay: number; // yol
  mealPerDay: number; // yemek
  otherPerDay: number; // diğer
  enabled: boolean;
}

export interface Bill {
  id: string;
  label: string;
  amount: number;
  dueDay: number; // 1-31
  category: 'rent' | 'utility' | 'internet' | 'phone' | 'loan' | 'subscription' | 'other';
  paidMonths: string[]; // ["2026-07"]
  createdAt: string;
  // Optional payment-plan fields (e.g. a 12-month contract). Both undefined =
  // legacy/indefinite recurring bill — the pre-existing behavior, unchanged.
  // See src/utils/bill.ts for how these are safely read (never assumed present).
  totalMonths?: number; // positive integer, e.g. 12
  startMonth?: string; // "YYYY-MM", same standard as paidMonths entries
}

export interface Expense {
  id: string;
  label: string;
  amount: number;
  category: 'market' | 'transport' | 'food' | 'fun' | 'health' | 'other';
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  createdAt: string;
}

export type DebtType = 'credit_card' | 'personal_loan' | 'vehicle_loan' | 'housing_loan' | 'other';

export interface DebtPayment {
  installmentNumber: number; // 1-based
  paid: boolean;
  paidAt?: string; // ISO string, set only when paid=true
}

export interface Debt {
  id: string;
  type: DebtType;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  totalInstallments: number;
  paymentDay?: number; // 1-31
  payments: DebtPayment[];
  createdAt: string;
}

export type AssetCategory = 'gold' | 'currency' | 'silver' | 'other';

// A single manual purchase record. Aggregates (total quantity, total cost,
// weighted average price) are never stored — always derived from the list of
// purchases via src/utils/asset.ts. No live pricing, no sell/realized P&L.
export interface AssetPurchase {
  id: string;
  category: AssetCategory;
  subType: string; // e.g. 'gram_altin', 'USD', 'gram_gumus', or free text for category 'other'
  quantity: number; // grams / units / currency amount
  unitPrice: number; // TL cost per single unit at purchase time
  purchaseDate: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
}

const RECEIVABLES_KEY = 'mesai.receivables.v1';
const ADVANCES_KEY = 'mesai.advances.v1';
const ALLOWANCE_KEY = 'mesai.allowance.v1';
const BILLS_KEY = 'mesai.bills.v1';
const EXPENSES_KEY = 'mesai.expenses.v1';
const SAVINGS_KEY = 'mesai.savings.v1';
const DEBTS_KEY = 'mesai.debts.v1';
const ASSET_PURCHASES_KEY = 'mesai.assetPurchases.v1';

async function safeGet<T>(key: string, fb: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fb;
    return (JSON.parse(raw) ?? fb) as T;
  } catch { return fb; }
}

async function safeSet(key: string, v: unknown): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(v ?? null)); } catch {}
}

export async function loadReceivables(): Promise<Receivable[]> {
  return await safeGet<Receivable[]>(RECEIVABLES_KEY, []);
}
export async function saveReceivables(list: Receivable[]): Promise<void> {
  await safeSet(RECEIVABLES_KEY, list);
}

export async function loadAdvances(): Promise<Advance[]> {
  return await safeGet<Advance[]>(ADVANCES_KEY, []);
}
export async function saveAdvances(list: Advance[]): Promise<void> {
  await safeSet(ADVANCES_KEY, list);
}

export const DEFAULT_ALLOWANCE: AllowanceSettings = {
  transportPerDay: 0, mealPerDay: 0, otherPerDay: 0, enabled: false,
};

export async function loadAllowance(): Promise<AllowanceSettings> {
  return await safeGet<AllowanceSettings>(ALLOWANCE_KEY, DEFAULT_ALLOWANCE);
}
export async function saveAllowance(v: AllowanceSettings): Promise<void> {
  await safeSet(ALLOWANCE_KEY, v);
}

export async function loadBills(): Promise<Bill[]> {
  return await safeGet<Bill[]>(BILLS_KEY, []);
}
export async function saveBills(list: Bill[]): Promise<void> {
  await safeSet(BILLS_KEY, list);
}

export async function loadExpenses(): Promise<Expense[]> {
  return await safeGet<Expense[]>(EXPENSES_KEY, []);
}
export async function saveExpenses(list: Expense[]): Promise<void> {
  await safeSet(EXPENSES_KEY, list);
}

export async function loadSavings(): Promise<SavingsGoal[]> {
  return await safeGet<SavingsGoal[]>(SAVINGS_KEY, []);
}
export async function saveSavings(list: SavingsGoal[]): Promise<void> {
  await safeSet(SAVINGS_KEY, list);
}

// Builds a fresh, unpaid installment schedule for a new Debt. Pure/stateless —
// does not read or write storage. Safe against non-positive/NaN/Infinity input.
export function createDebtPayments(totalInstallments: number): DebtPayment[] {
  const n = Number.isFinite(totalInstallments) ? Math.floor(totalInstallments) : 0;
  if (n <= 0) return [];
  const payments: DebtPayment[] = [];
  for (let i = 1; i <= n; i++) {
    payments.push({ installmentNumber: i, paid: false });
  }
  return payments;
}

export async function loadDebts(): Promise<Debt[]> {
  return await safeGet<Debt[]>(DEBTS_KEY, []);
}
export async function saveDebts(list: Debt[]): Promise<void> {
  await safeSet(DEBTS_KEY, list);
}

export async function loadAssetPurchases(): Promise<AssetPurchase[]> {
  return await safeGet<AssetPurchase[]>(ASSET_PURCHASES_KEY, []);
}
export async function saveAssetPurchases(list: AssetPurchase[]): Promise<void> {
  await safeSet(ASSET_PURCHASES_KEY, list);
}
