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

const RECEIVABLES_KEY = 'mesai.receivables.v1';
const ADVANCES_KEY = 'mesai.advances.v1';
const ALLOWANCE_KEY = 'mesai.allowance.v1';
const BILLS_KEY = 'mesai.bills.v1';
const EXPENSES_KEY = 'mesai.expenses.v1';
const SAVINGS_KEY = 'mesai.savings.v1';

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
