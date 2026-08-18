import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getColors, radius, spacing } from '../../src/theme';
import { useApp } from '../../src/context/AppContext';
import { usePro } from '../../src/context/ProContext';
import { useToast } from '../../src/context/ToastContext';
import { ProGate } from '../../src/components/ProGate';
import {
  Bill, Expense, SavingsGoal, Debt, DebtType, AssetPurchase, AssetCategory,
  loadBills, saveBills, loadExpenses, saveExpenses, loadSavings, saveSavings,
  loadReceivables, loadAdvances, loadDebts, saveDebts, createDebtPayments,
  loadAssetPurchases, saveAssetPurchases,
} from '../../src/storage/finance';
import { loadEntries } from '../../src/storage/db';
import { calculateHourlyRate } from '../../src/utils/salary';
import {
  getDebtInstallmentAmount, getDebtPaidAmount, getDebtRemainingAmount,
  getDebtPaidInstallmentCount, getDebtRemainingInstallmentCount,
  getDebtProgress, getDebtIsCompleted, getDebtNextInstallment,
} from '../../src/utils/debt';
import { getAssetPurchaseCost, getAssetTotalCost, groupAssetPurchases, AssetGroup } from '../../src/utils/asset';
import {
  getBillPlannedMonths, isBillPlanned, getBillPaidCount, getBillRemainingMonths,
  getBillProgress, getBillIsCompleted, getBillNextUnpaidMonth,
} from '../../src/utils/bill';
import { shareDebtsPdf, shareSingleDebtPdf, shareDebtsXlsx, shareSingleDebtXlsx } from '../../src/services/debtReport';

type Tab = 'overview' | 'bills' | 'expenses' | 'savings';
type ExpenseCat = Expense['category'];
type BillCat = Bill['category'];

const EXP_CATS: { k: ExpenseCat; label: string; labelEn: string; icon: any; color: string }[] = [
  { k: 'market', label: 'Market', labelEn: 'Grocery', icon: 'cart-outline', color: '#10B981' },
  { k: 'transport', label: 'Ulaşım', labelEn: 'Transport', icon: 'bus-outline', color: '#3B82F6' },
  { k: 'food', label: 'Yemek', labelEn: 'Food', icon: 'restaurant-outline', color: '#F59E0B' },
  { k: 'fun', label: 'Eğlence', labelEn: 'Fun', icon: 'game-controller-outline', color: '#EC4899' },
  { k: 'health', label: 'Sağlık', labelEn: 'Health', icon: 'medkit-outline', color: '#EF4444' },
  { k: 'other', label: 'Diğer', labelEn: 'Other', icon: 'ellipsis-horizontal', color: '#8B5CF6' },
];

const BILL_CATS: { k: BillCat; label: string; labelEn: string; icon: any }[] = [
  { k: 'rent', label: 'Kira', labelEn: 'Rent', icon: 'home-outline' },
  { k: 'utility', label: 'Fatura', labelEn: 'Utility', icon: 'flash-outline' },
  { k: 'internet', label: 'İnternet', labelEn: 'Internet', icon: 'wifi-outline' },
  { k: 'phone', label: 'Telefon', labelEn: 'Phone', icon: 'call-outline' },
  { k: 'loan', label: 'Kredi', labelEn: 'Loan', icon: 'card-outline' },
  { k: 'subscription', label: 'Abonelik', labelEn: 'Subscription', icon: 'repeat-outline' },
  { k: 'other', label: 'Diğer', labelEn: 'Other', icon: 'document-outline' },
];

// Payment-duration chip options for the New Bill form. 'none' = no plan (the
// legacy/indefinite recurring bill this app already supported); 'other'
// reveals a free-form numeric input.
type BillDurationChip = 'none' | '3' | '6' | '12' | '24' | 'other';
const BILL_DURATION_CHIPS: { k: BillDurationChip; label: string; labelEn: string }[] = [
  { k: 'none', label: 'Süresiz', labelEn: 'Indefinite' },
  { k: '3', label: '3 Ay', labelEn: '3 mo' },
  { k: '6', label: '6 Ay', labelEn: '6 mo' },
  { k: '12', label: '12 Ay', labelEn: '12 mo' },
  { k: '24', label: '24 Ay', labelEn: '24 mo' },
  { k: 'other', label: 'Diğer', labelEn: 'Other' },
];

const DEBT_TYPES: { k: DebtType; label: string; labelEn: string; icon: any }[] = [
  { k: 'credit_card', label: 'Kredi Kartı', labelEn: 'Credit Card', icon: 'card-outline' },
  { k: 'personal_loan', label: 'İhtiyaç Kredisi', labelEn: 'Personal Loan', icon: 'cash-outline' },
  { k: 'vehicle_loan', label: 'Taşıt Kredisi', labelEn: 'Vehicle Loan', icon: 'car-outline' },
  { k: 'housing_loan', label: 'Konut Kredisi', labelEn: 'Housing Loan', icon: 'home-outline' },
  { k: 'other', label: 'Diğer', labelEn: 'Other', icon: 'wallet-outline' },
];

const ASSET_CATEGORIES: { k: AssetCategory; label: string; labelEn: string; icon: any; emoji: string }[] = [
  { k: 'gold', label: 'Altın', labelEn: 'Gold', icon: 'medal-outline', emoji: '🥇' },
  { k: 'currency', label: 'Döviz', labelEn: 'Currency', icon: 'cash-outline', emoji: '💵' },
  { k: 'silver', label: 'Gümüş', labelEn: 'Silver', icon: 'ellipse-outline', emoji: '🥈' },
  { k: 'other', label: 'Diğer', labelEn: 'Other', icon: 'cube-outline', emoji: '📦' },
];

const GOLD_SUBTYPES: { k: string; label: string; labelEn: string; unit: string }[] = [
  { k: 'gram_altin', label: 'Gram Altın', labelEn: 'Gram Gold', unit: 'gr' },
  { k: 'ceyrek_altin', label: 'Çeyrek Altın', labelEn: 'Quarter Gold', unit: 'adet' },
  { k: 'yarim_altin', label: 'Yarım Altın', labelEn: 'Half Gold', unit: 'adet' },
  { k: 'tam_altin', label: 'Tam Altın', labelEn: 'Full Gold', unit: 'adet' },
  { k: 'cumhuriyet_altini', label: 'Cumhuriyet Altını', labelEn: 'Republic Gold', unit: 'adet' },
  { k: 'diger_altin', label: 'Diğer Altın', labelEn: 'Other Gold', unit: 'adet' },
];

const CURRENCY_SUBTYPES: { k: string; label: string; labelEn: string }[] = [
  { k: 'USD', label: 'USD', labelEn: 'USD' },
  { k: 'EUR', label: 'EUR', labelEn: 'EUR' },
  { k: 'GBP', label: 'GBP', labelEn: 'GBP' },
];
// UI-only sentinel for the "Diğer Döviz" chip — never persisted as a subType.
// Picking it reveals a free-text input; the code the user types becomes the
// real subType (and doubles as its own unit/display label).
const CURRENCY_OTHER_SENTINEL = '__other__';

const SILVER_SUBTYPE = { k: 'gram_gumus', label: 'Gram Gümüş', labelEn: 'Gram Silver', unit: 'gr' };

// Human-facing name for a category+subType combo. Falls back to the raw
// subType string for anything outside the known catalogs (custom currency
// codes, category 'other' free text, or legacy/backup data).
function getAssetSubTypeLabel(category: AssetCategory, subType: string, isTr: boolean): string {
  if (category === 'gold') {
    const m = GOLD_SUBTYPES.find(s => s.k === subType);
    return m ? (isTr ? m.label : m.labelEn) : subType;
  }
  if (category === 'silver') return isTr ? SILVER_SUBTYPE.label : SILVER_SUBTYPE.labelEn;
  return subType; // currency codes and 'other' free text are already display-ready
}

// Unit suffix shown after quantity. Returns '' when no safe assumption exists
// (category 'other') — quantity is then shown as a plain number, per FAZ B analysis.
function getAssetUnit(category: AssetCategory, subType: string): string {
  if (category === 'gold') return GOLD_SUBTYPES.find(s => s.k === subType)?.unit ?? 'adet';
  if (category === 'silver') return SILVER_SUBTYPE.unit;
  if (category === 'currency') return subType;
  return '';
}

const fmtQty = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const ymKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const ymdKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtTL = (n: number) => `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function WalletScreen() {
  const { theme, language, settings } = useApp();
  const { isPro } = usePro();
  const toast = useToast();
  const colors = getColors(theme);
  const isTr = language === 'tr';

  const [tab, setTab] = useState<Tab>('overview');
  // Which calendar month the SABİT ÖDEMELER (Bill) list/toggle targets — independent
  // from the always-"now" curYm used by the hero/overview budget figures below.
  const [billMonthOffset, setBillMonthOffset] = useState(0);
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [monthIncome, setMonthIncome] = useState(0);

  // Add modals
  const [billModal, setBillModal] = useState(false);
  const [bLabel, setBLabel] = useState(''); const [bAmount, setBAmount] = useState(''); const [bDue, setBDue] = useState('1'); const [bCat, setBCat] = useState<BillCat>('utility');
  const [bDurationChip, setBDurationChip] = useState<BillDurationChip>('none');
  const [bDurationCustom, setBDurationCustom] = useState('');
  const [billDetailId, setBillDetailId] = useState<string | null>(null);
  const billDetail = bills.find(b => b.id === billDetailId) ?? null;

  const [expModal, setExpModal] = useState(false);
  const [eLabel, setELabel] = useState(''); const [eAmount, setEAmount] = useState(''); const [eCat, setECat] = useState<ExpenseCat>('market');

  const [savModal, setSavModal] = useState(false);
  const [sName, setSName] = useState(''); const [sTarget, setSTarget] = useState('');

  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [contribAmt, setContribAmt] = useState('');

  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtModal, setDebtModal] = useState(false);
  const [dType, setDType] = useState<DebtType>('credit_card');
  const [dName, setDName] = useState('');
  const [dTotal, setDTotal] = useState('');
  const [dMonthly, setDMonthly] = useState('');
  const [dInstallments, setDInstallments] = useState('');
  const [dPayDay, setDPayDay] = useState('');
  const [debtDetailId, setDebtDetailId] = useState<string | null>(null);
  const debtDetail = debts.find(d => d.id === debtDetailId) ?? null;
  const [reportBusy, setReportBusy] = useState(false);

  // ── Birikim alt sekmesi: Hedefler (mevcut SavingsGoal) / Varlıklar (yeni AssetPurchase) ──
  const [savingsSubTab, setSavingsSubTab] = useState<'goals' | 'assets'>('goals');
  const [assets, setAssets] = useState<AssetPurchase[]>([]);
  const [assetModal, setAssetModal] = useState(false);
  const [aCategory, setACategory] = useState<AssetCategory>('gold');
  const [aSubType, setASubType] = useState('gram_altin');
  const [aCustomSubType, setACustomSubType] = useState('');
  const [aQuantity, setAQuantity] = useState('');
  const [aUnitPrice, setAUnitPrice] = useState('');
  const [aDate, setADate] = useState(() => new Date());
  const [aShowDatePicker, setAShowDatePicker] = useState(false);
  const [aNote, setANote] = useState('');
  const [assetDetailKey, setAssetDetailKey] = useState<string | null>(null);

  const resetAssetForm = () => {
    setACategory('gold'); setASubType('gram_altin'); setACustomSubType('');
    setAQuantity(''); setAUnitPrice(''); setADate(new Date()); setANote('');
  };

  const handleAssetCategoryChange = (cat: AssetCategory) => {
    setACategory(cat);
    setACustomSubType('');
    if (cat === 'gold') setASubType('gram_altin');
    else if (cat === 'currency') setASubType('USD');
    else if (cat === 'silver') setASubType(SILVER_SUBTYPE.k);
    else setASubType(''); // 'other' has no subType chips — aCustomSubType is the asset name
  };

  const reload = useCallback(async () => {
    const [b, e, s, entries, recv, adv, d, ap] = await Promise.all([
      loadBills(), loadExpenses(), loadSavings(), loadEntries(), loadReceivables(), loadAdvances(), loadDebts(), loadAssetPurchases(),
    ]);
    setBills(b); setExpenses(e); setSavings(s); setDebts(d); setAssets(ap);
    // Monthly income = salary + overtime earnings this month + collected receivables this month + received advances
    const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
    const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const salary = settings.monthlySalaries?.[MONTHS[m]] || 0;
    const hRate = calculateHourlyRate(salary);
    let ot = 0;
    Object.values(entries).forEach((ent: any) => {
      const d = new Date(ent.date);
      if (d.getFullYear() === y && d.getMonth() === m && !ent.isAbsence) {
        const mult = ent.customMultiplier ?? 1.5;
        ot += (ent.hours || 0) * hRate * mult;
      }
    });
    setMonthIncome(salary + ot);
  }, [settings.monthlySalaries]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const curYm = ymKey(new Date());

  // Selected month for the Bill (Sabit Ödemeler) list — starts on the real
  // current month, navigable via billMonthOffset. Never affects curYm/hero figures.
  const billMonthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + billMonthOffset);
    return d;
  }, [billMonthOffset]);
  const billMonthKey = ymKey(billMonthDate);
  const billMonthLabel = `${isTr ? MONTHS_TR[billMonthDate.getMonth()] : MONTHS_EN[billMonthDate.getMonth()]} ${billMonthDate.getFullYear()}`;

  const monthExpenses = useMemo(() => expenses.filter(x => x.date.startsWith(curYm)), [expenses, curYm]);
  const monthExpenseTotal = useMemo(() => monthExpenses.reduce((a, b) => a + b.amount, 0), [monthExpenses]);
  const monthBillTotal = useMemo(() => bills.reduce((a, b) => a + b.amount, 0), [bills]);
  const paidBillTotal = useMemo(() => bills.filter(b => b.paidMonths.includes(curYm)).reduce((a, b) => a + b.amount, 0), [bills, curYm]);
  const totalExpense = monthExpenseTotal + paidBillTotal;
  const remaining = monthIncome - totalExpense;
  const savingRate = monthIncome > 0 ? Math.max(0, Math.min(100, (remaining / monthIncome) * 100)) : 0;

  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return EXP_CATS.map(c => ({ ...c, total: map[c.k] || 0 })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [monthExpenses]);

  // Derived Debt aggregates — computed entirely via src/utils/debt.ts helpers,
  // nothing re-implemented here; no new totals written to storage.
  const debtTotals = useMemo(() => {
    const totalAmount = debts.reduce((a, d) => a + (Number.isFinite(d.totalAmount) ? d.totalAmount : 0), 0);
    const paidAmount = debts.reduce((a, d) => a + getDebtPaidAmount(d), 0);
    const remainingAmount = debts.reduce((a, d) => a + getDebtRemainingAmount(d), 0);
    const paidInstallments = debts.reduce((a, d) => a + getDebtPaidInstallmentCount(d), 0);
    const totalInstallments = debts.reduce((a, d) => a + (Number.isFinite(d.totalInstallments) ? d.totalInstallments : 0), 0);
    const progress = totalAmount > 0 ? Math.max(0, Math.min(100, (paidAmount / totalAmount) * 100)) : 0;
    const activeDebts = debts.filter(d => !getDebtIsCompleted(d));
    const activeCount = activeDebts.length;
    const monthlyPaymentTotal = activeDebts.reduce((a, d) => a + (Number.isFinite(d.monthlyPayment) ? d.monthlyPayment : 0), 0);
    return { totalAmount, paidAmount, remainingAmount, paidInstallments, totalInstallments, progress, activeCount, monthlyPaymentTotal };
  }, [debts]);

  // Derived Asset aggregates — computed entirely via src/utils/asset.ts helpers,
  // nothing re-implemented here; no aggregate written to storage.
  const assetGroups = useMemo(() => groupAssetPurchases(assets), [assets]);
  const assetTotalCost = useMemo(() => getAssetTotalCost(assets), [assets]);

  // If the last purchase in the open Asset Detail group gets deleted, the group
  // disappears from assetGroups — close the modal instead of showing an empty screen.
  useEffect(() => {
    if (assetDetailKey && !assetGroups.some(g => `${g.category}::${g.subType}` === assetDetailKey)) {
      setAssetDetailKey(null);
    }
  }, [assetDetailKey, assetGroups]);

  // ── Bills ──
  const addBill = async () => {
    const n = parseFloat(bAmount.replace(',', '.'));
    const d = parseInt(bDue, 10);
    if (!bLabel.trim() || !isFinite(n) || n <= 0 || !d || d < 1 || d > 31) { toast.warning(isTr ? 'Geçerli veri girin' : 'Enter valid data'); return; }

    let totalMonths: number | undefined;
    if (bDurationChip !== 'none') {
      const raw = bDurationChip === 'other' ? bDurationCustom : bDurationChip;
      const parsed = parseInt(raw, 10);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        toast.warning(isTr ? 'Geçerli bir ödeme süresi girin' : 'Enter a valid payment duration');
        return;
      }
      totalMonths = parsed;
    }

    const next: Bill = {
      id: `bl_${Date.now()}`, label: bLabel.trim(), amount: n, dueDay: d, category: bCat, paidMonths: [], createdAt: new Date().toISOString(),
      ...(totalMonths !== undefined ? { totalMonths, startMonth: curYm } : {}),
    };
    const list = [next, ...bills]; setBills(list); await saveBills(list);
    setBillModal(false); setBLabel(''); setBAmount(''); setBDue('1'); setBCat('utility'); setBDurationChip('none'); setBDurationCustom('');
    toast.success(isTr ? 'Ödeme eklendi' : 'Bill added');
  };
  const toggleBillPaid = async (id: string, monthKey: string = curYm) => {
    const list = bills.map(b => {
      if (b.id !== id) return b;
      const has = b.paidMonths.includes(monthKey);
      return { ...b, paidMonths: has ? b.paidMonths.filter(m => m !== monthKey) : [...b.paidMonths, monthKey] };
    });
    setBills(list); await saveBills(list);
  };
  const removeBill = (id: string) => {
    Alert.alert(isTr ? 'Sil?' : 'Delete?', '', [
      { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
      { text: isTr ? 'Sil' : 'Delete', style: 'destructive', onPress: async () => {
        const list = bills.filter(b => b.id !== id); setBills(list); await saveBills(list);
      }},
    ]);
  };

  // ── Expenses ──
  const addExpense = async () => {
    const n = parseFloat(eAmount.replace(',', '.'));
    if (!eLabel.trim() || !isFinite(n) || n <= 0) { toast.warning(isTr ? 'Geçerli veri girin' : 'Enter valid data'); return; }
    const today = new Date().toISOString().slice(0, 10);
    const next: Expense = { id: `ex_${Date.now()}`, label: eLabel.trim(), amount: n, category: eCat, date: today, createdAt: new Date().toISOString() };
    const list = [next, ...expenses]; setExpenses(list); await saveExpenses(list);
    setExpModal(false); setELabel(''); setEAmount(''); setECat('market');
    toast.success(isTr ? 'Harcama eklendi' : 'Expense added');
  };
  const removeExpense = (id: string) => {
    Alert.alert(isTr ? 'Sil?' : 'Delete?', '', [
      { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
      { text: isTr ? 'Sil' : 'Delete', style: 'destructive', onPress: async () => {
        const list = expenses.filter(x => x.id !== id); setExpenses(list); await saveExpenses(list);
      }},
    ]);
  };

  // ── Savings ──
  const addGoal = async () => {
    const n = parseFloat(sTarget.replace(',', '.'));
    if (!sName.trim() || !isFinite(n) || n <= 0) { toast.warning(isTr ? 'Geçerli veri girin' : 'Enter valid data'); return; }
    const next: SavingsGoal = { id: `sv_${Date.now()}`, name: sName.trim(), target: n, saved: 0, createdAt: new Date().toISOString() };
    const list = [next, ...savings]; setSavings(list); await saveSavings(list);
    setSavModal(false); setSName(''); setSTarget('');
    toast.success(isTr ? 'Hedef eklendi' : 'Goal added');
  };
  const addContrib = async () => {
    if (!contribGoal) return;
    const n = parseFloat(contribAmt.replace(',', '.'));
    if (!isFinite(n) || n === 0) { toast.warning(isTr ? 'Tutar girin' : 'Enter amount'); return; }
    const list = savings.map(g => g.id === contribGoal.id ? { ...g, saved: Math.max(0, g.saved + n) } : g);
    setSavings(list); await saveSavings(list);
    setContribGoal(null); setContribAmt('');
    toast.success(isTr ? 'Katkı eklendi' : 'Contribution added');
  };
  const removeGoal = (id: string) => {
    Alert.alert(isTr ? 'Sil?' : 'Delete?', '', [
      { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
      { text: isTr ? 'Sil' : 'Delete', style: 'destructive', onPress: async () => {
        const list = savings.filter(g => g.id !== id); setSavings(list); await saveSavings(list);
      }},
    ]);
  };

  // ── Assets (Varlıklar) — manual purchase records only; no sell/live-price/P&L ──
  const addAssetPurchase = async () => {
    const resolvedSubType = aCategory === 'currency' && aSubType === CURRENCY_OTHER_SENTINEL
      ? aCustomSubType.trim().toUpperCase()
      : aCategory === 'other'
        ? aCustomSubType.trim()
        : aSubType;

    const quantity = parseFloat(aQuantity.replace(',', '.'));
    const unitPrice = parseFloat(aUnitPrice.replace(',', '.'));

    if (!resolvedSubType || !isFinite(quantity) || quantity <= 0 || !isFinite(unitPrice) || unitPrice <= 0) {
      toast.warning(isTr ? 'Geçerli veri girin' : 'Enter valid data');
      return;
    }

    const next: AssetPurchase = {
      id: `ap_${Date.now()}`,
      category: aCategory,
      subType: resolvedSubType,
      quantity,
      unitPrice,
      purchaseDate: ymdKey(aDate),
      ...(aNote.trim() ? { note: aNote.trim() } : {}),
      createdAt: new Date().toISOString(),
    };
    const list = [next, ...assets];
    setAssets(list); await saveAssetPurchases(list);
    setAssetModal(false); resetAssetForm();
    toast.success(isTr ? 'Alım eklendi' : 'Purchase added');
  };

  const removeAssetPurchase = (id: string) => {
    Alert.alert(
      isTr ? 'Bu alım kaydı silinsin mi?' : 'Delete this purchase record?',
      '',
      [
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
        { text: isTr ? 'Sil' : 'Delete', style: 'destructive', onPress: async () => {
          const list = assets.filter(a => a.id !== id);
          setAssets(list); await saveAssetPurchases(list);
        }},
      ]
    );
  };

  // ── Debts ──
  const addDebt = async () => {
    const total = parseFloat(dTotal.replace(',', '.'));
    const monthly = parseFloat(dMonthly.replace(',', '.'));
    const installments = parseInt(dInstallments, 10);
    const payDayTrim = dPayDay.trim();
    const payDay = payDayTrim === '' ? undefined : parseInt(payDayTrim, 10);

    if (!dName.trim() || !isFinite(total) || total <= 0 || !isFinite(monthly) || monthly <= 0 || !Number.isInteger(installments) || installments <= 0) {
      toast.warning(isTr ? 'Geçerli veri girin' : 'Enter valid data');
      return;
    }
    if (payDayTrim !== '' && (!Number.isInteger(payDay) || (payDay as number) < 1 || (payDay as number) > 31)) {
      toast.warning(isTr ? 'Ödeme günü 1-31 arasında olmalı' : 'Payment day must be between 1 and 31');
      return;
    }
    // First N-1 installments alone already meeting/exceeding totalAmount means
    // the last installment (getDebtInstallmentAmount's remainder formula) would
    // clamp to 0 — a plan with a meaningless trailing $0 installment. Block it
    // here rather than silently saving a confusing schedule.
    if (monthly * (installments - 1) >= total) {
      toast.warning(isTr ? 'Aylık ödeme × taksit sayısı toplam borcu aşıyor, planı kontrol edin' : 'Monthly payment × installments exceeds the total amount — please check your plan');
      return;
    }

    const next: Debt = {
      id: `dt_${Date.now()}`,
      type: dType,
      name: dName.trim(),
      totalAmount: total,
      monthlyPayment: monthly,
      totalInstallments: installments,
      ...(payDay !== undefined ? { paymentDay: payDay } : {}),
      payments: createDebtPayments(installments),
      createdAt: new Date().toISOString(),
    };
    const list = [next, ...debts];
    setDebts(list); await saveDebts(list);
    setDebtModal(false);
    setDName(''); setDTotal(''); setDMonthly(''); setDInstallments(''); setDPayDay(''); setDType('credit_card');
    toast.success(isTr ? 'Borç eklendi' : 'Debt added');
  };

  const toggleDebtInstallment = async (debtId: string, installmentNumber: number) => {
    const list = debts.map(d => {
      if (d.id !== debtId) return d;
      const payments = d.payments.map(p => {
        if (p.installmentNumber !== installmentNumber) return p;
        return p.paid
          ? { ...p, paid: false, paidAt: undefined }
          : { ...p, paid: true, paidAt: new Date().toISOString() };
      });
      return { ...d, payments };
    });
    setDebts(list); await saveDebts(list);
  };

  const removeDebt = (id: string) => {
    Alert.alert(
      isTr ? 'Borcu Sil' : 'Delete Debt',
      isTr ? 'Bu borç ve ödeme geçmişi silinecek. Devam edilsin mi?' : 'This debt and its payment history will be deleted. Continue?',
      [
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
        { text: isTr ? 'Sil' : 'Delete', style: 'destructive', onPress: async () => {
          const list = debts.filter(d => d.id !== id);
          setDebts(list); await saveDebts(list);
          setDebtDetailId(null);
        }},
      ]
    );
  };

  // ── Debt reports (read-only — never touches debts state/storage) ──
  const runDebtsReport = async (format: 'pdf' | 'xlsx') => {
    setReportBusy(true);
    try {
      if (format === 'pdf') await shareDebtsPdf(debts, language);
      else await shareDebtsXlsx(debts, language);
    } catch (e) {
      console.warn('[DebtReport]', e);
      toast.error(isTr ? 'Rapor oluşturulamadı' : 'Could not create report');
    } finally {
      setReportBusy(false);
    }
  };

  const openDebtsReportChoice = () => {
    Alert.alert(
      isTr ? 'Borç Raporu' : 'Debt Report',
      isTr ? 'Rapor formatını seçin' : 'Choose a report format',
      [
        { text: 'PDF', onPress: () => runDebtsReport('pdf') },
        { text: 'Excel', onPress: () => runDebtsReport('xlsx') },
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const runSingleDebtReport = async (debt: Debt, format: 'pdf' | 'xlsx') => {
    setReportBusy(true);
    try {
      if (format === 'pdf') await shareSingleDebtPdf(debt, language);
      else await shareSingleDebtXlsx(debt, language);
    } catch (e) {
      console.warn('[DebtReport]', e);
      toast.error(isTr ? 'Rapor oluşturulamadı' : 'Could not create report');
    } finally {
      setReportBusy(false);
    }
  };

  const openSingleDebtReportChoice = (debt: Debt) => {
    Alert.alert(
      isTr ? 'Borç Raporu' : 'Debt Report',
      isTr ? 'Rapor formatını seçin' : 'Choose a report format',
      [
        { text: 'PDF', onPress: () => runSingleDebtReport(debt, 'pdf') },
        { text: 'Excel', onPress: () => runSingleDebtReport(debt, 'xlsx') },
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (!isPro) {
    return <ProGate icon="wallet-outline"
      title={isTr ? '💰 Cüzdan' : '💰 Wallet'}
      subtitle={isTr ? 'Aylık bütçenizi, faturalarınızı, harcamalarınızı ve birikim hedeflerinizi tek yerden yönetin.' : 'Manage your monthly budget, bills, expenses, and savings goals in one place.'}
      features={[
        isTr ? '✅ Aylık bütçe özeti' : '✅ Monthly budget overview',
        isTr ? '✅ Sabit ödemeler & fatura takibi' : '✅ Bills & fixed payments tracking',
        isTr ? '✅ Kategorili harcama kaydı' : '✅ Categorized expense logging',
        isTr ? '✅ Birikim hedefleri' : '✅ Savings goals',
        isTr ? '✅ Aylık rapor & grafikler' : '✅ Monthly report & charts',
      ]}
    />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 140 }}>
        {/* Hero */}
        <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>{isTr ? 'Bu Ay Kullanılabilir' : 'Available This Month'}</Text>
          <Text style={[styles.heroAmount, remaining < 0 && { color: '#FEE2E2' }]}>{remaining < 0 ? '−' : ''}{fmtTL(Math.abs(remaining))}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>{isTr ? 'Gelir' : 'Income'}</Text>
              <Text style={styles.heroStatVal}>{fmtTL(monthIncome)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>{isTr ? 'Gider' : 'Expense'}</Text>
              <Text style={styles.heroStatVal}>{fmtTL(totalExpense)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>{isTr ? 'Tasarruf' : 'Save'}</Text>
              <Text style={styles.heroStatVal}>%{savingRate.toFixed(0)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs — 4 equal-width segments (fits 320-360dp without horizontal scroll) */}
        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['overview', 'bills', 'expenses', 'savings'] as Tab[]).map(t => {
            const active = tab === t;
            const label = t === 'overview' ? (isTr ? 'Özet' : 'Overview') :
              t === 'bills' ? (isTr ? 'Ödemeler' : 'Payments') :
              t === 'expenses' ? (isTr ? 'Harcamalar' : 'Expenses') :
              (isTr ? 'Birikim' : 'Savings');
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tabBtn, active && { backgroundColor: colors.primary }]}
              >
                <Text numberOfLines={1} style={[styles.tabText, { color: active ? '#fff' : colors.textMuted }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'overview' && (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{isTr ? 'Kategori Dağılımı' : 'Category Breakdown'}</Text>
              {catBreakdown.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                  <Ionicons name="pie-chart-outline" size={26} color={colors.textMuted} />
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13, marginTop: 8 }}>{isTr ? 'Henüz harcama yok' : 'No expenses yet'}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2, textAlign: 'center' }}>
                    {isTr ? 'İlk harcamanı eklediğinde kategori analizin burada görünecek.' : 'Once you add your first expense, your category breakdown will appear here.'}
                  </Text>
                </View>
              ) : catBreakdown.map(c => {
                const pct = monthExpenseTotal > 0 ? (c.total / monthExpenseTotal) * 100 : 0;
                return (
                  <View key={c.k} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={c.icon} size={14} color={c.color} />
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{isTr ? c.label : c.labelEn}</Text>
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>{fmtTL(c.total)}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: c.color, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{isTr ? 'Bu Ayın Özeti' : 'This Month'}</Text>
              <SumRow label={isTr ? 'Sabit ödemeler (toplam)' : 'Fixed bills (total)'} value={fmtTL(monthBillTotal)} colors={colors} />
              <SumRow label={isTr ? 'Ödenen faturalar' : 'Paid bills'} value={fmtTL(paidBillTotal)} colors={colors} />
              <SumRow label={isTr ? 'Değişken harcama' : 'Variable expense'} value={fmtTL(monthExpenseTotal)} colors={colors} />
              <SumRow label={isTr ? 'Toplam birikim' : 'Total savings'} value={fmtTL(savings.reduce((a, g) => a + g.saved, 0))} colors={colors} bold />
              <SumRow label={isTr ? 'Toplam Varlıklar (maliyet bazlı)' : 'Total Assets (cost basis)'} value={fmtTL(assetTotalCost)} colors={colors} bold />
            </View>

            {debts.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{isTr ? 'Borç Durumu' : 'Debt Status'}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{isTr ? 'Toplam Kalan Borç' : 'Total Remaining Debt'}</Text>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 22, marginTop: 2 }}>{fmtTL(debtTotals.remainingAmount)}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                  {isTr
                    ? `${debtTotals.paidInstallments} / ${debtTotals.totalInstallments} taksit ödendi`
                    : `${debtTotals.paidInstallments} / ${debtTotals.totalInstallments} installments paid`}
                </Text>
                <Pressable onPress={() => setTab('bills')} style={{ marginTop: 10 }}>
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>{isTr ? 'Detayları Gör →' : 'View Details →'}</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {tab === 'bills' && (() => {
          const unpaidBills = bills.filter(b => !b.paidMonths.includes(billMonthKey)).sort((a, b) => a.dueDay - b.dueDay);
          const paidBills = bills.filter(b => b.paidMonths.includes(billMonthKey));
          const hasAnyPayment = bills.length > 0 || debts.length > 0;

          if (!hasAnyPayment) {
            return (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', paddingVertical: spacing.lg }]}>
                <Ionicons name="wallet-outline" size={40} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14, marginTop: 10 }}>{isTr ? 'Henüz ödeme eklenmedi.' : 'No payments added yet.'}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                  {isTr
                    ? 'Sabit ödemelerini veya borçlarını ekleyerek aylık yükümlülüklerini burada takip edebilirsin.'
                    : 'Add your fixed bills or debts to track your monthly obligations here.'}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 14, alignSelf: 'stretch' }}>
                  <Pressable onPress={() => setBillModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary, marginBottom: 0, flex: 1 }]}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText} numberOfLines={1}>{isTr ? 'Yeni Ödeme' : 'New Bill'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setDebtModal(true)} style={[styles.secondaryBtn, { borderColor: colors.border, flex: 1, marginBottom: 0 }]}>
                    <Ionicons name="add" size={18} color={colors.text} />
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{isTr ? 'Yeni Borç' : 'New Debt'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }

          return (
            <>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{isTr ? 'Ödeme Özeti' : 'Payment Summary'}</Text>
                <SumRow label={isTr ? 'Bu Ay Ödemeler' : "This Month's Payments"} value={fmtTL(monthBillTotal + debtTotals.monthlyPaymentTotal)} colors={colors} bold />
                <SumRow label={isTr ? `Sabit Ödemeler (${bills.length} adet)` : `Fixed Bills (${bills.length})`} value={fmtTL(monthBillTotal)} colors={colors} />
                <SumRow label={isTr ? `Borç Ödemeleri (${debtTotals.activeCount} aktif)` : `Debt Payments (${debtTotals.activeCount} active)`} value={fmtTL(debtTotals.monthlyPaymentTotal)} colors={colors} />
                <SumRow label={isTr ? 'Toplam Kalan Borç' : 'Total Remaining Debt'} value={fmtTL(debtTotals.remainingAmount)} colors={colors} bold />
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{isTr ? 'SABİT ÖDEMELER' : 'FIXED BILLS'}</Text>
              <Pressable onPress={() => setBillModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>{isTr ? 'Yeni Ödeme' : 'New Bill'}</Text>
              </Pressable>

              {bills.length > 0 && (
                <View style={[styles.monthSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Pressable onPress={() => setBillMonthOffset(o => o - 1)} hitSlop={10} style={{ padding: 4 }}>
                    <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                  </Pressable>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.monthSelectorLabel, { color: colors.text }]}>{billMonthLabel}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>
                      {isTr ? `${paidBills.length} / ${bills.length} ödendi` : `${paidBills.length} / ${bills.length} paid`}
                    </Text>
                  </View>
                  <Pressable onPress={() => setBillMonthOffset(o => o + 1)} hitSlop={10} style={{ padding: 4 }}>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              )}

              {bills.length === 0 ? (
                <EmptyBox colors={colors} icon="receipt-outline" text={isTr ? 'Henüz sabit ödeme yok' : 'No bills yet'} />
              ) : (
                <>
                  {unpaidBills.length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{isTr ? 'BEKLEYEN' : 'PENDING'}</Text>
                      {unpaidBills.map(b => (
                        <BillRow key={b.id} bill={b} paid={false} monthLabel={billMonthLabel} colors={colors} isTr={isTr}
                          onTogglePaid={() => toggleBillPaid(b.id, billMonthKey)} onRemove={() => removeBill(b.id)} onOpenDetail={() => setBillDetailId(b.id)} />
                      ))}
                    </>
                  )}
                  {paidBills.length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{isTr ? 'ÖDENDİ' : 'PAID'}</Text>
                      {paidBills.map(b => (
                        <BillRow key={b.id} bill={b} paid={true} monthLabel={billMonthLabel} colors={colors} isTr={isTr}
                          onTogglePaid={() => toggleBillPaid(b.id, billMonthKey)} onRemove={() => removeBill(b.id)} onOpenDetail={() => setBillDetailId(b.id)} />
                      ))}
                    </>
                  )}
                </>
              )}

              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: spacing.md }]}>{isTr ? 'BORÇ & TAKSİTLER' : 'DEBTS & INSTALLMENTS'}</Text>
              <Pressable onPress={() => setDebtModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>{isTr ? 'Yeni Borç' : 'New Debt'}</Text>
              </Pressable>
              {debts.length === 0 ? (
                <EmptyBox colors={colors} icon="card-outline" text={isTr ? 'Henüz borç eklenmedi' : 'No debts yet'} />
              ) : (
                <>
                  <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{isTr ? 'Toplam Borç' : 'Total Debt'}</Text>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 26, marginTop: 4 }}>{fmtTL(debtTotals.totalAmount)}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{isTr ? 'Ödenen' : 'Paid'}</Text>
                        <Text style={{ color: colors.success, fontWeight: '700', fontSize: 15, marginTop: 2 }}>{fmtTL(debtTotals.paidAmount)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{isTr ? 'Kalan' : 'Remaining'}</Text>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 2 }}>{fmtTL(debtTotals.remainingAmount)}</Text>
                      </View>
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 12 }}>
                      <View style={{ height: '100%', width: `${debtTotals.progress}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{isTr ? `%${debtTotals.progress.toFixed(0)} tamamlandı` : `${debtTotals.progress.toFixed(0)}% completed`}</Text>
                  </View>

                  {debts.map(d => (
                    <DebtCard key={d.id} debt={d} colors={colors} isTr={isTr} onPress={() => setDebtDetailId(d.id)} />
                  ))}

                  <Pressable onPress={openDebtsReportChoice} disabled={reportBusy} style={[styles.secondaryBtn, { borderColor: colors.border, opacity: reportBusy ? 0.6 : 1, marginTop: spacing.xs }]}>
                    {reportBusy ? (
                      <ActivityIndicator color={colors.text} size="small" />
                    ) : (
                      <>
                        <Ionicons name="document-text-outline" size={18} color={colors.text} />
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{isTr ? 'Rapor Oluştur' : 'Create Report'}</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </>
          );
        })()}

        {tab === 'expenses' && (
          <>
            <Pressable onPress={() => setExpModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>{isTr ? 'Yeni Harcama' : 'New Expense'}</Text>
            </Pressable>
            {monthExpenses.length === 0 ? (
              <EmptyBox colors={colors} icon="pricetag-outline" text={isTr ? 'Bu ay harcama yok' : 'No expenses this month'} />
            ) : monthExpenses.map(x => {
              const cat = EXP_CATS.find(c => c.k === x.category);
              return (
                <View key={x.id} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.catBadge, { backgroundColor: cat?.color || colors.primary }]}>
                    <Ionicons name={cat?.icon || 'pricetag-outline'} size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{x.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{new Date(x.date).toLocaleDateString('tr-TR')}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>-{fmtTL(x.amount)}</Text>
                  <Pressable onPress={() => removeExpense(x.id)} style={{ marginLeft: 8, padding: 4 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        {tab === 'savings' && (
          <>
            <View style={[styles.subSegment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {(['goals', 'assets'] as const).map(st => {
                const active = savingsSubTab === st;
                const label = st === 'goals' ? (isTr ? 'Hedefler' : 'Goals') : (isTr ? 'Varlıklar' : 'Assets');
                return (
                  <Pressable
                    key={st}
                    onPress={() => setSavingsSubTab(st)}
                    style={[styles.subSegmentBtn, active && { backgroundColor: colors.primary }]}
                  >
                    <Text numberOfLines={1} style={[styles.subSegmentText, { color: active ? '#fff' : colors.textMuted }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {savingsSubTab === 'goals' && (
              <>
                <Pressable onPress={() => setSavModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addBtnText}>{isTr ? 'Yeni Birikim Hedefi' : 'New Savings Goal'}</Text>
                </Pressable>
                {savings.length === 0 ? (
                  <EmptyBox colors={colors} icon="gift-outline" text={isTr ? 'Hazırladığın hedefler burada görünecek.' : 'Goals you set will appear here.'} />
                ) : savings.map(g => {
                  const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
                  const done = g.saved >= g.target;
                  return (
                    <View key={g.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name={done ? 'trophy' : 'flag-outline'} size={20} color={done ? colors.warning : colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginLeft: 8, flex: 1 }}>{g.name}</Text>
                        <Pressable onPress={() => removeGoal(g.id)} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                        </Pressable>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{fmtTL(g.saved)} / {fmtTL(g.target)}</Text>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>%{pct.toFixed(0)}</Text>
                      </View>
                      <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.primary, borderRadius: 4 }} />
                      </View>
                      <Text style={{ color: done ? colors.success : colors.textMuted, fontSize: 12, fontWeight: done ? '700' : '400', marginBottom: 10 }}>
                        {done ? (isTr ? 'Tamamlandı 🎉' : 'Completed 🎉') : (isTr ? `Kalan ${fmtTL(Math.max(0, g.target - g.saved))}` : `Remaining ${fmtTL(Math.max(0, g.target - g.saved))}`)}
                      </Text>
                      <Pressable onPress={() => { setContribGoal(g); setContribAmt(''); }} style={[styles.contribBtn, { backgroundColor: colors.primary }]}>
                        <Ionicons name="add-circle-outline" size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{isTr ? 'Katkı Ekle' : 'Add Contribution'}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </>
            )}

            {savingsSubTab === 'assets' && (
              assets.length === 0 ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', paddingVertical: spacing.lg }]}>
                  <Ionicons name="diamond-outline" size={40} color={colors.textMuted} />
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14, marginTop: 10 }}>{isTr ? 'Henüz varlık alımı eklenmedi' : 'No asset purchases yet'}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                    {isTr
                      ? 'Altın, döviz, gümüş ve diğer birikim alımlarını burada takip edebilirsin.'
                      : 'Track your gold, currency, silver and other savings purchases here.'}
                  </Text>
                  <Pressable onPress={() => { resetAssetForm(); setAssetModal(true); }} style={[styles.addBtn, { backgroundColor: colors.primary, marginBottom: 0, marginTop: 14, paddingHorizontal: spacing.lg }]}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>{isTr ? 'İlk Alımını Ekle' : 'Add Your First Purchase'}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{isTr ? 'Toplam Yatırılan' : 'Total Invested'}</Text>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 26, marginTop: 4 }}>{fmtTL(assetTotalCost)}</Text>
                  </View>

                  {assetGroups.map(g => (
                    <AssetGroupCard key={`${g.category}::${g.subType}`} group={g} colors={colors} isTr={isTr}
                      onPress={() => setAssetDetailKey(`${g.category}::${g.subType}`)} />
                  ))}

                  <Pressable onPress={() => { resetAssetForm(); setAssetModal(true); }} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>{isTr ? 'Yeni Alım' : 'New Purchase'}</Text>
                  </Pressable>
                </>
              )
            )}
          </>
        )}
      </ScrollView>

      {/* Bill Modal */}
      <Modal visible={billModal} transparent animationType="slide" onRequestClose={() => setBillModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalOverlay} onPress={() => setBillModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg2 }]} onPress={e => e.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? 'Yeni Ödeme' : 'New Bill'}</Text>
              <TextInput value={bLabel} onChangeText={setBLabel} placeholder={isTr ? 'Açıklama (örn. Kira)' : 'Label (e.g. Rent)'} placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <TextInput value={bAmount} onChangeText={setBAmount} placeholder={isTr ? 'Tutar (₺)' : 'Amount'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <TextInput value={bDue} onChangeText={setBDue} placeholder={isTr ? 'Vade günü (1-31)' : 'Due day (1-31)'} keyboardType="number-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
                {BILL_CATS.map(c => (
                  <Pressable key={c.k} onPress={() => setBCat(c.k)} style={[styles.chip, { borderColor: bCat === c.k ? colors.primary : colors.border, backgroundColor: bCat === c.k ? colors.primary : 'transparent' }]}>
                    <Ionicons name={c.icon} size={14} color={bCat === c.k ? '#fff' : colors.textMuted} />
                    <Text style={{ color: bCat === c.k ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{isTr ? c.label : c.labelEn}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.textMuted }]}>{isTr ? 'ÖDEME SÜRESİ' : 'PAYMENT DURATION'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
                {BILL_DURATION_CHIPS.map(c => (
                  <Pressable key={c.k} onPress={() => setBDurationChip(c.k)} style={[styles.chip, { borderColor: bDurationChip === c.k ? colors.primary : colors.border, backgroundColor: bDurationChip === c.k ? colors.primary : 'transparent' }]}>
                    <Text style={{ color: bDurationChip === c.k ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{isTr ? c.label : c.labelEn}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {bDurationChip === 'other' && (
                <TextInput value={bDurationCustom} onChangeText={setBDurationCustom} placeholder={isTr ? 'Ay sayısı (örn. 18)' : 'Number of months (e.g. 18)'} keyboardType="number-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => setBillModal(false)} style={[styles.modalBtn, { backgroundColor: colors.surface, flex: 1 }]}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text></Pressable>
                <Pressable onPress={addBill} style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Ekle' : 'Add'}</Text></Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Expense Modal */}
      <Modal visible={expModal} transparent animationType="slide" onRequestClose={() => setExpModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalOverlay} onPress={() => setExpModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg2 }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? 'Yeni Harcama' : 'New Expense'}</Text>
            <TextInput value={eLabel} onChangeText={setELabel} placeholder={isTr ? 'Açıklama' : 'Label'} placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
            <TextInput value={eAmount} onChangeText={setEAmount} placeholder={isTr ? 'Tutar (₺)' : 'Amount'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
              {EXP_CATS.map(c => (
                <Pressable key={c.k} onPress={() => setECat(c.k)} style={[styles.chip, { borderColor: eCat === c.k ? c.color : colors.border, backgroundColor: eCat === c.k ? c.color : 'transparent' }]}>
                  <Ionicons name={c.icon} size={14} color={eCat === c.k ? '#fff' : colors.textMuted} />
                  <Text style={{ color: eCat === c.k ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{isTr ? c.label : c.labelEn}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setExpModal(false)} style={[styles.modalBtn, { backgroundColor: colors.surface, flex: 1 }]}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text></Pressable>
              <Pressable onPress={addExpense} style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Ekle' : 'Add'}</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Savings Goal Modal */}
      <Modal visible={savModal} transparent animationType="slide" onRequestClose={() => setSavModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalOverlay} onPress={() => setSavModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg2 }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? 'Yeni Birikim Hedefi' : 'New Goal'}</Text>
            <TextInput value={sName} onChangeText={setSName} placeholder={isTr ? 'Hedef adı (örn. Tatil)' : 'Goal name'} placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
            <TextInput value={sTarget} onChangeText={setSTarget} placeholder={isTr ? 'Hedef tutar (₺)' : 'Target amount'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable onPress={() => setSavModal(false)} style={[styles.modalBtn, { backgroundColor: colors.surface, flex: 1 }]}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text></Pressable>
              <Pressable onPress={addGoal} style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Ekle' : 'Add'}</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Contribution Modal */}
      <Modal visible={!!contribGoal} transparent animationType="slide" onRequestClose={() => setContribGoal(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalOverlay} onPress={() => setContribGoal(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg2 }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? `Katkı: ${contribGoal?.name || ''}` : `Contribute: ${contribGoal?.name || ''}`}</Text>
            <Text style={{ color: colors.textMuted, marginBottom: 8, fontSize: 13 }}>{isTr ? 'Pozitif değer eklenir, negatif çıkarılır.' : 'Positive adds, negative subtracts.'}</Text>
            <TextInput value={contribAmt} onChangeText={setContribAmt} placeholder={isTr ? 'Tutar (₺)' : 'Amount'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable onPress={() => setContribGoal(null)} style={[styles.modalBtn, { backgroundColor: colors.surface, flex: 1 }]}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text></Pressable>
              <Pressable onPress={addContrib} style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Ekle' : 'Add'}</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* New Asset Purchase Modal */}
      <Modal visible={assetModal} transparent animationType="slide" onRequestClose={() => setAssetModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalOverlay} onPress={() => setAssetModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg2 }]} onPress={e => e.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? 'Yeni Alım' : 'New Purchase'}</Text>

              <Text style={[styles.formLabel, { color: colors.textMuted }]}>{isTr ? 'VARLIK TÜRÜ' : 'ASSET TYPE'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
                {ASSET_CATEGORIES.map(c => (
                  <Pressable key={c.k} onPress={() => handleAssetCategoryChange(c.k)} style={[styles.chip, { borderColor: aCategory === c.k ? colors.primary : colors.border, backgroundColor: aCategory === c.k ? colors.primary : 'transparent' }]}>
                    <Text style={{ fontSize: 13 }}>{c.emoji}</Text>
                    <Text style={{ color: aCategory === c.k ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{isTr ? c.label : c.labelEn}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {aCategory !== 'other' && (
                <>
                  <Text style={[styles.formLabel, { color: colors.textMuted }]}>{isTr ? 'ALT TÜR' : 'SUBTYPE'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
                    {aCategory === 'gold' && GOLD_SUBTYPES.map(s => (
                      <Pressable key={s.k} onPress={() => setASubType(s.k)} style={[styles.chip, { borderColor: aSubType === s.k ? colors.primary : colors.border, backgroundColor: aSubType === s.k ? colors.primary : 'transparent' }]}>
                        <Text style={{ color: aSubType === s.k ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{isTr ? s.label : s.labelEn}</Text>
                      </Pressable>
                    ))}
                    {aCategory === 'currency' && [...CURRENCY_SUBTYPES, { k: CURRENCY_OTHER_SENTINEL, label: 'Diğer', labelEn: 'Other' }].map(s => (
                      <Pressable key={s.k} onPress={() => setASubType(s.k)} style={[styles.chip, { borderColor: aSubType === s.k ? colors.primary : colors.border, backgroundColor: aSubType === s.k ? colors.primary : 'transparent' }]}>
                        <Text style={{ color: aSubType === s.k ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{isTr ? s.label : s.labelEn}</Text>
                      </Pressable>
                    ))}
                    {aCategory === 'silver' && (
                      <View style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primary }]}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{isTr ? SILVER_SUBTYPE.label : SILVER_SUBTYPE.labelEn}</Text>
                      </View>
                    )}
                  </ScrollView>
                </>
              )}

              {(aCategory === 'other' || (aCategory === 'currency' && aSubType === CURRENCY_OTHER_SENTINEL)) && (
                <TextInput
                  value={aCustomSubType}
                  onChangeText={setACustomSubType}
                  placeholder={aCategory === 'other' ? (isTr ? 'Varlık adı (örn. Platin)' : 'Asset name (e.g. Platinum)') : (isTr ? 'Para birimi kodu (örn. CHF)' : 'Currency code (e.g. CHF)')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                />
              )}

              <TextInput value={aQuantity} onChangeText={setAQuantity} placeholder={isTr ? 'Miktar' : 'Quantity'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <TextInput value={aUnitPrice} onChangeText={setAUnitPrice} placeholder={isTr ? 'Birim alış fiyatı (₺)' : 'Unit purchase price (₺)'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />

              {(() => {
                const q = parseFloat(aQuantity.replace(',', '.'));
                const p = parseFloat(aUnitPrice.replace(',', '.'));
                const total = isFinite(q) && isFinite(p) ? q * p : 0;
                return (
                  <View style={[styles.totalCostBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>{isTr ? 'Toplam Maliyet' : 'Total Cost'}</Text>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>{fmtTL(total)}</Text>
                  </View>
                );
              })()}

              <Text style={[styles.formLabel, { color: colors.textMuted }]}>{isTr ? 'ALIŞ TARİHİ' : 'PURCHASE DATE'}</Text>
              <Pressable onPress={() => setAShowDatePicker(true)} style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.text, fontSize: 15 }}>{aDate.toLocaleDateString('tr-TR')}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              </Pressable>
              {aShowDatePicker && (
                <DateTimePicker
                  value={aDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, selected) => {
                    setAShowDatePicker(Platform.OS === 'ios');
                    if (event?.type === 'dismissed' || !selected) return;
                    setADate(selected);
                  }}
                />
              )}

              <TextInput value={aNote} onChangeText={setANote} placeholder={isTr ? 'Not (opsiyonel)' : 'Note (optional)'} placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => setAssetModal(false)} style={[styles.modalBtn, { backgroundColor: colors.surface, flex: 1 }]}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text></Pressable>
                <Pressable onPress={addAssetPurchase} style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Alımı Kaydet' : 'Save Purchase'}</Text></Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* New Debt Modal */}
      <Modal visible={debtModal} transparent animationType="slide" onRequestClose={() => setDebtModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalOverlay} onPress={() => setDebtModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg2 }]} onPress={e => e.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? 'Yeni Borç' : 'New Debt'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
                {DEBT_TYPES.map(t => (
                  <Pressable key={t.k} onPress={() => setDType(t.k)} style={[styles.chip, { borderColor: dType === t.k ? colors.primary : colors.border, backgroundColor: dType === t.k ? colors.primary : 'transparent' }]}>
                    <Ionicons name={t.icon} size={14} color={dType === t.k ? '#fff' : colors.textMuted} />
                    <Text style={{ color: dType === t.k ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{isTr ? t.label : t.labelEn}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput value={dName} onChangeText={setDName} placeholder={isTr ? 'Borç adı (örn. Worldcard)' : 'Debt name (e.g. Visa Card)'} placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <TextInput value={dTotal} onChangeText={setDTotal} placeholder={isTr ? 'Toplam borç (₺)' : 'Total amount'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <TextInput value={dMonthly} onChangeText={setDMonthly} placeholder={isTr ? 'Aylık ödeme (₺)' : 'Monthly payment'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <TextInput value={dInstallments} onChangeText={setDInstallments} placeholder={isTr ? 'Toplam taksit (adet)' : 'Total installments'} keyboardType="number-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <TextInput value={dPayDay} onChangeText={setDPayDay} placeholder={isTr ? 'Ödeme günü (1-31, opsiyonel)' : 'Payment day (1-31, optional)'} keyboardType="number-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => setDebtModal(false)} style={[styles.modalBtn, { backgroundColor: colors.surface, flex: 1 }]}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text></Pressable>
                <Pressable onPress={addDebt} style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Borcu Ekle' : 'Add Debt'}</Text></Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Debt Detail — full-screen (long installment lists don't fit a bottom-sheet well) */}
      <Modal visible={!!debtDetail} animationType="slide" onRequestClose={() => setDebtDetailId(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={1}>{debtDetail?.name}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {isTr ? DEBT_TYPES.find(t => t.k === debtDetail?.type)?.label : DEBT_TYPES.find(t => t.k === debtDetail?.type)?.labelEn}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => debtDetail && !reportBusy && openSingleDebtReportChoice(debtDetail)} hitSlop={10} style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: reportBusy ? 0.6 : 1 }]}>
                {reportBusy ? <ActivityIndicator color={colors.text} size="small" /> : <Ionicons name="document-text-outline" size={18} color={colors.text} />}
              </Pressable>
              <Pressable onPress={() => setDebtDetailId(null)} hitSlop={10} style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>
          {debtDetail && (
            <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <SumRow label={isTr ? 'Toplam Borç' : 'Total Amount'} value={fmtTL(debtDetail.totalAmount)} colors={colors} />
                <SumRow label={isTr ? 'Ödenen' : 'Paid'} value={fmtTL(getDebtPaidAmount(debtDetail))} colors={colors} />
                <SumRow label={isTr ? 'Kalan' : 'Remaining'} value={fmtTL(getDebtRemainingAmount(debtDetail))} colors={colors} bold />
                <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 10 }}>
                  <View style={{ height: '100%', width: `${getDebtProgress(debtDetail)}%`, backgroundColor: getDebtIsCompleted(debtDetail) ? colors.success : colors.primary, borderRadius: 4 }} />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                  {isTr
                    ? `${getDebtPaidInstallmentCount(debtDetail)} / ${debtDetail.totalInstallments} taksit ödendi · ${getDebtRemainingInstallmentCount(debtDetail)} taksit kaldı`
                    : `${getDebtPaidInstallmentCount(debtDetail)} / ${debtDetail.totalInstallments} installments paid · ${getDebtRemainingInstallmentCount(debtDetail)} left`}
                </Text>
                {getDebtIsCompleted(debtDetail) && (
                  <View style={[styles.completedBadge, { backgroundColor: colors.success + '20', alignSelf: 'flex-start', marginTop: 8 }]}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                    <Text style={{ color: colors.success, fontSize: 10, fontWeight: '700' }}>{isTr ? 'TAMAMLANDI' : 'COMPLETED'}</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{isTr ? 'TAKSİTLER' : 'INSTALLMENTS'}</Text>
              {Array.from({ length: Math.max(0, debtDetail.totalInstallments) }, (_, i) => i + 1).map(num => {
                const payment = debtDetail.payments.find(p => p.installmentNumber === num);
                const isPaid = !!payment?.paid;
                const amount = getDebtInstallmentAmount(debtDetail, num);
                return (
                  <Pressable key={num} onPress={() => toggleDebtInstallment(debtDetail.id, num)} style={[styles.installmentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name={isPaid ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={isPaid ? colors.success : colors.textMuted} />
                    <Text style={{ color: colors.text, fontWeight: '600', flex: 1, marginLeft: 8 }}>{isTr ? `${num}. Taksit` : `Installment ${num}`}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginRight: 8 }}>{fmtTL(amount)}</Text>
                    <Text style={{ color: isPaid ? colors.success : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{isPaid ? (isTr ? 'Ödendi' : 'Paid') : (isTr ? 'Bekliyor' : 'Pending')}</Text>
                  </Pressable>
                );
              })}

              <Pressable onPress={() => removeDebt(debtDetail.id)} style={[styles.dangerBtn, { borderColor: colors.danger }]}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 14 }}>{isTr ? 'Borcu Sil' : 'Delete Debt'}</Text>
              </Pressable>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Bill Detail — full-screen (mirrors Debt Detail pattern); only reachable for planned bills */}
      <Modal visible={!!billDetail} animationType="slide" onRequestClose={() => setBillDetailId(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={1}>{billDetail?.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {billDetail ? `${fmtTL(billDetail.amount)}${isTr ? ' / ay' : ' / mo'}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => setBillDetailId(null)} hitSlop={10} style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          {billDetail && (() => {
            const plannedMonths = getBillPlannedMonths(billDetail);
            const paidCount = getBillPaidCount(billDetail);
            const remaining = getBillRemainingMonths(billDetail);
            const progress = getBillProgress(billDetail);
            const completed = getBillIsCompleted(billDetail);
            return (
              <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <SumRow label={isTr ? 'Aylık Tutar' : 'Monthly Amount'} value={`${fmtTL(billDetail.amount)}${isTr ? ' / ay' : ' / mo'}`} colors={colors} />
                  <SumRow label={isTr ? 'Ödenen' : 'Paid'} value={`${paidCount} / ${plannedMonths.length}`} colors={colors} bold />
                  <SumRow label={isTr ? 'Kalan' : 'Remaining'} value={isTr ? `${remaining} ay` : `${remaining} mo`} colors={colors} />
                  <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 10 }}>
                    <View style={{ height: '100%', width: `${progress}%`, backgroundColor: completed ? colors.success : colors.primary, borderRadius: 4 }} />
                  </View>
                  {completed && (
                    <View style={[styles.completedBadge, { backgroundColor: colors.success + '20', alignSelf: 'flex-start', marginTop: 8 }]}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                      <Text style={{ color: colors.success, fontSize: 10, fontWeight: '700' }}>{isTr ? 'TAMAMLANDI' : 'COMPLETED'}</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{isTr ? 'ÖDEME AYLARI' : 'PAYMENT MONTHS'}</Text>
                {plannedMonths.map(monthKey => {
                  const isPaid = billDetail.paidMonths.includes(monthKey);
                  const [y, m] = monthKey.split('-').map(Number);
                  const label = new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                  return (
                    <Pressable key={monthKey} onPress={() => toggleBillPaid(billDetail.id, monthKey)} style={[styles.installmentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Ionicons name={isPaid ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={isPaid ? colors.success : colors.textMuted} />
                      <Text style={{ color: colors.text, fontWeight: '600', flex: 1, marginLeft: 8, textTransform: 'capitalize' }}>{label}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 13, marginRight: 8 }}>{fmtTL(billDetail.amount)}</Text>
                      <Text style={{ color: isPaid ? colors.success : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{isPaid ? (isTr ? 'Ödendi' : 'Paid') : (isTr ? 'Bekliyor' : 'Pending')}</Text>
                    </Pressable>
                  );
                })}

                <Pressable onPress={() => removeBill(billDetail.id)} style={[styles.dangerBtn, { borderColor: colors.danger }]}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 14 }}>{isTr ? 'Ödemeyi Sil' : 'Delete Bill'}</Text>
                </Pressable>
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* Asset Detail — full-screen (mirrors Debt Detail pattern) */}
      <Modal visible={!!assetDetailKey} animationType="slide" onRequestClose={() => setAssetDetailKey(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          {(() => {
            const group = assetGroups.find(g => `${g.category}::${g.subType}` === assetDetailKey) ?? null;
            if (!group) return null;
            const unit = getAssetUnit(group.category, group.subType);
            const catMeta = ASSET_CATEGORIES.find(c => c.k === group.category);
            const sortedPurchases = [...group.purchases].sort((a, b) => {
              const dateDiff = new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
              if (dateDiff !== 0) return dateDiff;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            return (
              <>
                <View style={styles.detailHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={1}>
                      {catMeta?.emoji} {getAssetSubTypeLabel(group.category, group.subType, isTr)}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {isTr ? `${group.purchases.length} alım` : `${group.purchases.length} purchases`}
                    </Text>
                  </View>
                  <Pressable onPress={() => setAssetDetailKey(null)} hitSlop={10} style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="close" size={20} color={colors.text} />
                  </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
                  <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <SumRow label={isTr ? 'Toplam' : 'Total'} value={`${fmtQty(group.totalQuantity)}${unit ? ' ' + unit : ''}`} colors={colors} bold />
                    <SumRow label={isTr ? 'Toplam Maliyet' : 'Total Cost'} value={fmtTL(group.totalCost)} colors={colors} />
                    <SumRow label={isTr ? 'Ortalama Alış' : 'Average Price'} value={`${fmtTL(group.averagePrice)}${unit ? ' / ' + unit : ''}`} colors={colors} bold />
                  </View>

                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{isTr ? 'ALIM GEÇMİŞİ' : 'PURCHASE HISTORY'}</Text>
                  {sortedPurchases.map(p => (
                    <View key={p.id} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'flex-start' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                          {new Date(p.purchaseDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                          {fmtQty(p.quantity)}{unit ? ' ' + unit : ''} × {fmtTL(p.unitPrice)}
                        </Text>
                        <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 14, marginTop: 2 }}>{fmtTL(getAssetPurchaseCost(p))}</Text>
                        {!!p.note && (
                          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>{p.note}</Text>
                        )}
                      </View>
                      <Pressable onPress={() => removeAssetPurchase(p.id)} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ))}

                  <Pressable onPress={() => { resetAssetForm(); setACategory(group.category); setASubType(group.subType); setAssetModal(true); }} style={[styles.addBtn, { backgroundColor: colors.primary, marginTop: spacing.sm }]}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>{isTr ? 'Yeni Alım' : 'New Purchase'}</Text>
                  </Pressable>
                </ScrollView>
              </>
            );
          })()}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SumRow({ label, value, colors, bold }: { label: string; value: string; colors: any; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: bold ? colors.accent : colors.text, fontWeight: bold ? '800' : '600', fontSize: 14 }}>{value}</Text>
    </View>
  );
}

function EmptyBox({ colors, icon, text }: { colors: any; icon: any; text: string }) {
  return (
    <View style={{ padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', marginTop: spacing.md }}>
      <Ionicons name={icon} size={44} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, marginTop: 10 }}>{text}</Text>
    </View>
  );
}

function BillRow({ bill, paid, monthLabel, colors, isTr, onTogglePaid, onRemove, onOpenDetail }: {
  bill: Bill; paid: boolean; monthLabel: string; colors: any; isTr: boolean; onTogglePaid: () => void; onRemove: () => void; onOpenDetail: () => void;
}) {
  const cat = BILL_CATS.find(c => c.k === bill.category);
  const planned = isBillPlanned(bill);
  const planTotal = getBillPlannedMonths(bill).length;
  const planPaid = planned ? getBillPaidCount(bill) : 0;
  const planRemaining = planned ? getBillRemainingMonths(bill) : 0;
  const planProgress = planned ? getBillProgress(bill) : 0;
  const planCompleted = planned && getBillIsCompleted(bill);

  return (
    <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border, opacity: paid ? 0.55 : 1, alignItems: 'flex-start' }]}>
      <Pressable onPress={onTogglePaid} style={[styles.check, { marginTop: 2, borderColor: paid ? colors.primary : colors.border, backgroundColor: paid ? colors.primary : 'transparent' }]}>
        {paid && <Ionicons name="checkmark" size={16} color="#fff" />}
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={cat?.icon || 'document-outline'} size={14} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontWeight: '600', textDecorationLine: paid ? 'line-through' : 'none' }}>{bill.label}</Text>
          {planCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: 10, fontWeight: '700' }}>{isTr ? 'TAMAMLANDI' : 'DONE'}</Text>
            </View>
          )}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{isTr ? `Her ayın ${bill.dueDay}. günü` : `Day ${bill.dueDay} of month`}</Text>
        <Text style={{ color: paid ? colors.success : colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
          {monthLabel} · {paid ? (isTr ? '✓ Ödendi' : '✓ Paid') : (isTr ? '○ Bekliyor' : '○ Pending')}
        </Text>

        {planned && (
          <View style={{ marginTop: 6 }}>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
              {isTr ? `${planPaid} / ${planTotal} ödendi · ${planRemaining} ay kaldı` : `${planPaid} / ${planTotal} paid · ${planRemaining} mo left`}
            </Text>
            <View style={{ height: 5, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
              <View style={{ height: '100%', width: `${planProgress}%`, backgroundColor: planCompleted ? colors.success : colors.primary, borderRadius: 3 }} />
            </View>
            <Pressable onPress={onOpenDetail} style={{ marginTop: 6 }}>
              <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 12 }}>{isTr ? 'Ödeme Planını Gör →' : 'View Payment Plan →'}</Text>
            </Pressable>
          </View>
        )}
      </View>
      <Text style={{ color: paid ? colors.textMuted : colors.accent, fontWeight: '700' }}>{fmtTL(bill.amount)}{isTr ? ' / ay' : ' / mo'}</Text>
      <Pressable onPress={onRemove} style={{ marginLeft: 8, padding: 4 }}>
        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function DebtCard({ debt, colors, isTr, onPress }: { debt: Debt; colors: any; isTr: boolean; onPress: () => void }) {
  const meta = DEBT_TYPES.find(t => t.k === debt.type);
  const remaining = getDebtRemainingAmount(debt);
  const progress = getDebtProgress(debt);
  const paidCount = getDebtPaidInstallmentCount(debt);
  const next = getDebtNextInstallment(debt);
  const completed = getDebtIsCompleted(debt);
  return (
    <Pressable onPress={onPress} style={[styles.debtCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.debtIconBadge, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name={meta?.icon || 'wallet-outline'} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{debt.name}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{isTr ? meta?.label : meta?.labelEn}</Text>
        </View>
        {completed ? (
          <View style={[styles.completedBadge, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: 10, fontWeight: '700' }}>{isTr ? 'TAMAMLANDI' : 'DONE'}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 10 }}>{isTr ? 'Kalan Borç' : 'Remaining'}</Text>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20, marginTop: 2 }}>{fmtTL(remaining)}</Text>
      <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
        <View style={{ height: '100%', width: `${progress}%`, backgroundColor: completed ? colors.success : colors.primary, borderRadius: 3 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {isTr ? `${paidCount} / ${debt.totalInstallments} taksit ödendi` : `${paidCount} / ${debt.totalInstallments} installments paid`}
        </Text>
        {next && (
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{isTr ? `Sonraki: ${fmtTL(next.amount)}` : `Next: ${fmtTL(next.amount)}`}</Text>
        )}
      </View>
    </Pressable>
  );
}

function AssetGroupCard({ group, colors, isTr, onPress }: { group: AssetGroup; colors: any; isTr: boolean; onPress: () => void }) {
  const catMeta = ASSET_CATEGORIES.find(c => c.k === group.category);
  const unit = getAssetUnit(group.category, group.subType);
  const label = getAssetSubTypeLabel(group.category, group.subType, isTr);
  return (
    <Pressable onPress={onPress} style={[styles.debtCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.debtIconBadge, { backgroundColor: colors.primary + '18' }]}>
          <Text style={{ fontSize: 16 }}>{catMeta?.emoji ?? '💰'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{label}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{isTr ? `${group.purchases.length} alım` : `${group.purchases.length} purchases`}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 10 }}>{isTr ? 'Toplam' : 'Total'}</Text>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20, marginTop: 2 }}>{fmtQty(group.totalQuantity)}{unit ? ` ${unit}` : ''}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{isTr ? 'Toplam Maliyet' : 'Total Cost'}</Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 2 }}>{fmtTL(group.totalCost)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{isTr ? 'Ortalama Alış' : 'Average Price'}</Text>
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13, marginTop: 2 }}>{fmtTL(group.averagePrice)}{unit ? ` / ${unit}` : ''}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18, borderRadius: 32, marginBottom: spacing.md },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroAmount: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },
  heroRow: { flexDirection: 'row', marginTop: spacing.sm + 4, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 20, paddingVertical: 8 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginTop: 2 },
  heroStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  tabs: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: spacing.xs },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 6, marginBottom: spacing.sm },
  monthSelectorLabel: { fontSize: 13, fontWeight: '700' },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, marginBottom: spacing.md },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, marginBottom: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: 6, gap: 10 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  catBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  contribBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 999 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, fontSize: 15 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
  modalBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  debtCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm },
  debtIconBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: spacing.md, gap: 12 },
  detailTitle: { fontSize: 19, fontWeight: '800' },
  closeBtn: { padding: 6, borderRadius: 999, borderWidth: 1 },
  installmentRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1, marginBottom: 6 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, marginTop: spacing.md },
  subSegment: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: 4, gap: 4 },
  subSegmentBtn: { flex: 1, paddingVertical: 7, paddingHorizontal: 6, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  subSegmentText: { fontSize: 12, fontWeight: '700' },
  formLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  totalCostBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: 8 },
});
