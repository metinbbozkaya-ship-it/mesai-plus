import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getColors, radius, spacing } from '../../src/theme';
import { useApp } from '../../src/context/AppContext';
import { usePro } from '../../src/context/ProContext';
import { useToast } from '../../src/context/ToastContext';
import { ProGate } from '../../src/components/ProGate';
import {
  Bill, Expense, SavingsGoal,
  loadBills, saveBills, loadExpenses, saveExpenses, loadSavings, saveSavings,
  loadReceivables, loadAdvances,
} from '../../src/storage/finance';
import { loadEntries } from '../../src/storage/db';
import { calculateHourlyRate } from '../../src/utils/salary';

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

const ymKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const fmtTL = (n: number) => `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WalletScreen() {
  const { theme, language, settings } = useApp();
  const { isPro } = usePro();
  const toast = useToast();
  const colors = getColors(theme);
  const isTr = language === 'tr';

  const [tab, setTab] = useState<Tab>('overview');
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [monthIncome, setMonthIncome] = useState(0);

  // Add modals
  const [billModal, setBillModal] = useState(false);
  const [bLabel, setBLabel] = useState(''); const [bAmount, setBAmount] = useState(''); const [bDue, setBDue] = useState('1'); const [bCat, setBCat] = useState<BillCat>('utility');

  const [expModal, setExpModal] = useState(false);
  const [eLabel, setELabel] = useState(''); const [eAmount, setEAmount] = useState(''); const [eCat, setECat] = useState<ExpenseCat>('market');
  const [scanning, setScanning] = useState(false);

  const [savModal, setSavModal] = useState(false);
  const [sName, setSName] = useState(''); const [sTarget, setSTarget] = useState('');

  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [contribAmt, setContribAmt] = useState('');

  const reload = useCallback(async () => {
    const [b, e, s, entries, recv, adv] = await Promise.all([
      loadBills(), loadExpenses(), loadSavings(), loadEntries(), loadReceivables(), loadAdvances(),
    ]);
    setBills(b); setExpenses(e); setSavings(s);
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

  // ── Bills ──
  const addBill = async () => {
    const n = parseFloat(bAmount.replace(',', '.'));
    const d = parseInt(bDue, 10);
    if (!bLabel.trim() || !isFinite(n) || n <= 0 || !d || d < 1 || d > 31) { toast.warning(isTr ? 'Geçerli veri girin' : 'Enter valid data'); return; }
    const next: Bill = { id: `bl_${Date.now()}`, label: bLabel.trim(), amount: n, dueDay: d, category: bCat, paidMonths: [], createdAt: new Date().toISOString() };
    const list = [next, ...bills]; setBills(list); await saveBills(list);
    setBillModal(false); setBLabel(''); setBAmount(''); setBDue('1'); setBCat('utility');
    toast.success(isTr ? 'Ödeme eklendi' : 'Bill added');
  };
  const toggleBillPaid = async (id: string) => {
    const list = bills.map(b => {
      if (b.id !== id) return b;
      const has = b.paidMonths.includes(curYm);
      return { ...b, paidMonths: has ? b.paidMonths.filter(m => m !== curYm) : [...b.paidMonths, curYm] };
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
  // ── Receipt OCR ──
  const guessCategory = (text: string): ExpenseCat => {
    const t = text.toLowerCase();
    if (/(market|migros|bim|a101|şok|sok|carrefour|metro|hakmar|bakkal|manav)/.test(t)) return 'market';
    if (/(benzin|akaryakıt|petrol|shell|opet|bp|otogaz|otobüs|metro|taksi|uber|bitaksi)/.test(t)) return 'transport';
    if (/(restoran|restaurant|kafe|cafe|kebap|pizza|burger|yemek|lokanta|dominos|starbucks)/.test(t)) return 'food';
    if (/(sinema|tiyatro|konser|oyun|spotify|netflix|steam|bilet)/.test(t)) return 'fun';
    if (/(eczane|hastane|doktor|ilaç|klinik|sağlık|dis|diş)/.test(t)) return 'health';
    return 'other';
  };

  const parseReceipt = (rawText: string): { total: number | null; merchant: string } => {
    const text = rawText.replace(/\r/g, '');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    // Find TOPLAM / TOTAL / GENEL TOPLAM line
    let total: number | null = null;
    const totalRegex = /(?:genel\s*toplam|toplam|tutar|total|grand\s*total|ödenecek)\s*[:\-]?\s*\*?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/i;
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(totalRegex);
      if (m) {
        const s = m[1].replace(/\./g, '').replace(',', '.');
        const n = parseFloat(s);
        if (isFinite(n) && n > 0) { total = n; break; }
      }
    }
    // Fallback: largest number in text
    if (total === null) {
      const nums = Array.from(text.matchAll(/(\d+[.,]\d{2})/g)).map(m => parseFloat(m[1].replace(',', '.'))).filter(n => isFinite(n) && n > 0);
      if (nums.length) total = Math.max(...nums);
    }
    // Merchant: first non-numeric, non-empty line (usually top of receipt)
    let merchant = '';
    for (const l of lines.slice(0, 5)) {
      const clean = l.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü\s\.\&]/g, '').trim();
      if (clean.length >= 3 && !/^\d/.test(l)) { merchant = clean.slice(0, 30); break; }
    }
    return { total, merchant };
  };

  const scanReceipt = async (source: 'camera' | 'library') => {
    try {
      let perm;
      if (source === 'camera') perm = await ImagePicker.requestCameraPermissionsAsync();
      else perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { toast.warning(isTr ? 'İzin gerekli' : 'Permission required'); return; }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images });

      if (result.canceled || !result.assets?.[0]?.base64) return;
      const b64 = result.assets[0].base64;
      if (b64.length > 900_000) { toast.warning(isTr ? 'Resim çok büyük, daha küçük seçin' : 'Image too large'); return; }

      setScanning(true);
      const form = new FormData();
      form.append('base64Image', `data:image/jpeg;base64,${b64}`);
      form.append('language', 'tur');
      form.append('scale', 'true');
      form.append('OCREngine', '2');

      const resp = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: { apikey: 'helloworld' },
        body: form as any,
      });
      const json: any = await resp.json();
      const parsedText: string = json?.ParsedResults?.[0]?.ParsedText || '';
      if (!parsedText) {
        toast.error(isTr ? 'Fiş okunamadı, tekrar deneyin' : 'Could not read receipt');
        return;
      }
      const { total, merchant } = parseReceipt(parsedText);
      setELabel(merchant || (isTr ? 'Fiş' : 'Receipt'));
      setEAmount(total ? total.toFixed(2) : '');
      setECat(guessCategory(parsedText));
      setExpModal(true);
      toast.success(isTr ? 'Fiş okundu, kontrol edin' : 'Receipt scanned, please verify');
    } catch (e: any) {
      console.warn('[OCR]', e);
      toast.error(isTr ? 'Fiş okuma başarısız' : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const openScanChoice = () => {
    Alert.alert(
      isTr ? 'Fiş Okut' : 'Scan Receipt',
      isTr ? 'Fiş kaynağı seçin' : 'Choose source',
      [
        { text: isTr ? 'Kamera' : 'Camera', onPress: () => scanReceipt('camera') },
        { text: isTr ? 'Galeri' : 'Gallery', onPress: () => scanReceipt('library') },
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
      ]
    );
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
      <LinearGradient colors={[colors.bg, colors.bg2]} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 140 }}>
        {/* Hero */}
        <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>{isTr ? 'Bu Ay Kalan Bakiye' : 'Balance This Month'}</Text>
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
              <Text style={styles.heroStatLabel}>{isTr ? 'Birikim' : 'Save'}</Text>
              <Text style={styles.heroStatVal}>%{savingRate.toFixed(0)}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, monthIncome > 0 ? (totalExpense / monthIncome) * 100 : 0)}%` }]} />
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['overview', 'bills', 'expenses', 'savings'] as Tab[]).map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { backgroundColor: colors.primary }]}>
              <Text style={[styles.tabText, { color: tab === t ? '#fff' : colors.textMuted }]}>
                {t === 'overview' ? (isTr ? 'Özet' : 'Overview') :
                 t === 'bills' ? (isTr ? 'Ödemeler' : 'Bills') :
                 t === 'expenses' ? (isTr ? 'Harcama' : 'Expenses') :
                 (isTr ? 'Birikim' : 'Savings')}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'overview' && (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{isTr ? 'Kategori Dağılımı' : 'Category Breakdown'}</Text>
              {catBreakdown.length === 0 ? (
                <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 12 }}>{isTr ? 'Henüz harcama yok' : 'No expenses yet'}</Text>
              ) : catBreakdown.map(c => {
                const pct = monthExpenseTotal > 0 ? (c.total / monthExpenseTotal) * 100 : 0;
                return (
                  <View key={c.k} style={{ marginBottom: 10 }}>
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
              <SumRow label={isTr ? 'Toplam birikim hedefi' : 'Total savings goal'} value={fmtTL(savings.reduce((a, g) => a + g.saved, 0))} colors={colors} bold />
            </View>
          </>
        )}

        {tab === 'bills' && (
          <>
            <Pressable onPress={() => setBillModal(true)}>
              <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtn}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>{isTr ? 'Yeni Ödeme' : 'New Bill'}</Text>
              </LinearGradient>
            </Pressable>
            {bills.length === 0 ? (
              <EmptyBox colors={colors} icon="receipt-outline" text={isTr ? 'Henüz sabit ödeme yok' : 'No bills yet'} />
            ) : bills.map(b => {
              const paid = b.paidMonths.includes(curYm);
              const cat = BILL_CATS.find(c => c.k === b.category);
              return (
                <View key={b.id} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border, opacity: paid ? 0.55 : 1 }]}>
                  <Pressable onPress={() => toggleBillPaid(b.id)} style={[styles.check, { borderColor: paid ? colors.primary : colors.border, backgroundColor: paid ? colors.primary : 'transparent' }]}>
                    {paid && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name={cat?.icon || 'document-outline'} size={14} color={colors.textMuted} />
                      <Text style={{ color: colors.text, fontWeight: '600', textDecorationLine: paid ? 'line-through' : 'none' }}>{b.label}</Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{isTr ? `Her ayın ${b.dueDay}. günü` : `Day ${b.dueDay} of month`}</Text>
                  </View>
                  <Text style={{ color: paid ? colors.textMuted : colors.accent, fontWeight: '700' }}>{fmtTL(b.amount)}</Text>
                  <Pressable onPress={() => removeBill(b.id)} style={{ marginLeft: 8, padding: 4 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        {tab === 'expenses' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
              <Pressable onPress={() => setExpModal(true)} style={{ flex: 1 }}>
                <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.addBtn, { marginBottom: 0 }]}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addBtnText}>{isTr ? 'Manuel' : 'Manual'}</Text>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={openScanChoice} disabled={scanning} style={{ flex: 1 }}>
                <LinearGradient colors={['#F59E0B', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.addBtn, { marginBottom: 0, opacity: scanning ? 0.6 : 1 }]}>
                  <Ionicons name={scanning ? 'hourglass-outline' : 'scan-outline'} size={18} color="#fff" />
                  <Text style={styles.addBtnText}>{scanning ? (isTr ? 'Okunuyor...' : 'Reading...') : (isTr ? 'Fiş Okut' : 'Scan Receipt')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
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
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{fmtTL(x.amount)}</Text>
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
            <Pressable onPress={() => setSavModal(true)}>
              <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtn}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>{isTr ? 'Yeni Birikim Hedefi' : 'New Savings Goal'}</Text>
              </LinearGradient>
            </Pressable>
            {savings.length === 0 ? (
              <EmptyBox colors={colors} icon="gift-outline" text={isTr ? 'Henüz hedef yok' : 'No goals yet'} />
            ) : savings.map(g => {
              const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
              const done = g.saved >= g.target;
              return (
                <View key={g.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name={done ? 'trophy' : 'flag-outline'} size={20} color={done ? '#F59E0B' : colors.primary} />
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginLeft: 8, flex: 1 }}>{g.name}</Text>
                    <Pressable onPress={() => removeGoal(g.id)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{fmtTL(g.saved)} / {fmtTL(g.target)}</Text>
                    <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>%{pct.toFixed(0)}</Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                    <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${pct}%` }} />
                  </View>
                  <Pressable onPress={() => { setContribGoal(g); setContribAmt(''); }}>
                    <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.contribBtn}>
                      <Ionicons name="add-circle-outline" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{isTr ? 'Katkı Ekle' : 'Add Contribution'}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Bill Modal */}
      <Modal visible={billModal} transparent animationType="slide" onRequestClose={() => setBillModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setBillModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg2 }]} onPress={e => e.stopPropagation()}>
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setBillModal(false)} style={[styles.modalBtn, { backgroundColor: colors.surface, flex: 1 }]}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text></Pressable>
              <Pressable onPress={addBill} style={{ flex: 1 }}><LinearGradient colors={[colors.primary, colors.accent]} style={styles.modalBtn}><Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Ekle' : 'Add'}</Text></LinearGradient></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Expense Modal */}
      <Modal visible={expModal} transparent animationType="slide" onRequestClose={() => setExpModal(false)}>
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
              <Pressable onPress={addExpense} style={{ flex: 1 }}><LinearGradient colors={[colors.primary, colors.accent]} style={styles.modalBtn}><Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Ekle' : 'Add'}</Text></LinearGradient></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Savings Goal Modal */}
      <Modal visible={savModal} transparent animationType="slide" onRequestClose={() => setSavModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSavModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg2 }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? 'Yeni Birikim Hedefi' : 'New Goal'}</Text>
            <TextInput value={sName} onChangeText={setSName} placeholder={isTr ? 'Hedef adı (örn. Tatil)' : 'Goal name'} placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
            <TextInput value={sTarget} onChangeText={setSTarget} placeholder={isTr ? 'Hedef tutar (₺)' : 'Target amount'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable onPress={() => setSavModal(false)} style={[styles.modalBtn, { backgroundColor: colors.surface, flex: 1 }]}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text></Pressable>
              <Pressable onPress={addGoal} style={{ flex: 1 }}><LinearGradient colors={[colors.primary, colors.accent]} style={styles.modalBtn}><Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Ekle' : 'Add'}</Text></LinearGradient></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Contribution Modal */}
      <Modal visible={!!contribGoal} transparent animationType="slide" onRequestClose={() => setContribGoal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setContribGoal(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg2 }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? `Katkı: ${contribGoal?.name || ''}` : `Contribute: ${contribGoal?.name || ''}`}</Text>
            <Text style={{ color: colors.textMuted, marginBottom: 8, fontSize: 13 }}>{isTr ? 'Pozitif değer eklenir, negatif çıkarılır.' : 'Positive adds, negative subtracts.'}</Text>
            <TextInput value={contribAmt} onChangeText={setContribAmt} placeholder={isTr ? 'Tutar (₺)' : 'Amount'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable onPress={() => setContribGoal(null)} style={[styles.modalBtn, { backgroundColor: colors.surface, flex: 1 }]}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text></Pressable>
              <Pressable onPress={addContrib} style={{ flex: 1 }}><LinearGradient colors={[colors.primary, colors.accent]} style={styles.modalBtn}><Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Ekle' : 'Add'}</Text></LinearGradient></Pressable>
            </View>
          </Pressable>
        </Pressable>
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

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, borderRadius: 32, marginBottom: spacing.md },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroAmount: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },
  heroRow: { flexDirection: 'row', marginTop: spacing.md, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 20, paddingVertical: 10 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginTop: 2 },
  heroStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  progressTrack: { height: 6, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.85)' },
  tabs: { flexDirection: 'row', borderRadius: 999, borderWidth: 1, padding: 3, marginBottom: spacing.md },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '700' },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, marginBottom: spacing.md },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: 8, gap: 12 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  catBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  contribBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 999 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, fontSize: 15 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
  modalBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
});
