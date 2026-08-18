import React, { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { getColors, spacing, radius } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildCorporateHtml, shareCorporatePdf, makeReportNo } from '../../services/corporateReports';

const LEAVE_START_DATE_KEY = 'mesai.leave.startDate.v2';
const LEAVE_DAYS_KEY = 'mesai.leave.days.v2';
const LEAVE_USED_DAYS_KEY_LEGACY = 'mesai.leave.usedDays.v2';

type LeaveType = 'annual' | 'excuse' | 'sick' | 'unpaid';
interface LeaveDay {
  date: string; // YYYY-MM-DD
  type: LeaveType;
  note?: string;
}

const LEAVE_TYPE_META: Record<LeaveType, { tr: string; en: string; color: string; icon: any }> = {
  annual: { tr: 'Yıllık İzin', en: 'Annual', color: '#10B981', icon: 'leaf' },
  excuse: { tr: 'Mazeret', en: 'Excuse', color: '#F59E0B', icon: 'time' },
  sick: { tr: 'Hastalık', en: 'Sick', color: '#EF4444', icon: 'medkit' },
  unpaid: { tr: 'Ücretsiz', en: 'Unpaid', color: '#6B7280', icon: 'remove-circle' },
};

function calculateAnnualLeave(startDate: Date) {
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365.25);
  const remainingDays = totalDays - Math.floor(years * 365.25);
  const months = Math.floor(remainingDays / 30.44);
  const days = Math.floor(remainingDays - months * 30.44);

  let annualLeaveDays = 0;
  let description = '';
  let descriptionEn = '';
  if (years < 1) {
    annualLeaveDays = 0;
    description = '1 yılı doldurmadınız. İzin hakkı henüz oluşmadı.';
    descriptionEn = 'Less than 1 year. No leave entitlement yet.';
  } else if (years < 5) {
    annualLeaveDays = 14;
    description = '1-5 yıl arası: Yılda 14 gün izin hakkı';
    descriptionEn = '1-5 years: 14 days annual leave';
  } else if (years < 15) {
    annualLeaveDays = 20;
    description = '5-15 yıl arası: Yılda 20 gün izin hakkı';
    descriptionEn = '5-15 years: 20 days annual leave';
  } else {
    annualLeaveDays = 26;
    description = '15 yıl ve üzeri: Yılda 26 gün izin hakkı';
    descriptionEn = '15+ years: 26 days annual leave';
  }
  return { years, months, days, totalDays, annualLeaveDays, description, descriptionEn };
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const TR_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const EN_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function AnnualLeaveCalculator() {
  const { language, theme, settings } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const isTr = language === 'tr';

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [leaveDays, setLeaveDays] = useState<LeaveDay[]>([]);
  const [calMonth, setCalMonth] = useState(new Date());
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [showWebDateModal, setShowWebDateModal] = useState(false);
  const [webDateInput, setWebDateInput] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingLeavePdf, setIsExportingLeavePdf] = useState(false);

  // Type picker modal
  const [typeModalDate, setTypeModalDate] = useState<string | null>(null);
  const [typeModalNote, setTypeModalNote] = useState('');
  const [typeModalType, setTypeModalType] = useState<LeaveType>('annual');
  const [typeModalEditMode, setTypeModalEditMode] = useState(false);
  // Action menu (edit/delete) for existing leave
  const [actionMenuDate, setActionMenuDate] = useState<string | null>(null);
  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  }, []);

  const reloadFromStorage = useCallback(async () => {
    try {
      const [savedDate, savedDaysJson, legacyUsed] = await Promise.all([
        AsyncStorage.getItem(LEAVE_START_DATE_KEY),
        AsyncStorage.getItem(LEAVE_DAYS_KEY),
        AsyncStorage.getItem(LEAVE_USED_DAYS_KEY_LEGACY),
      ]);
      if (savedDate) {
        const d = new Date(savedDate);
        setStartDate(!isNaN(d.getTime()) ? d : null);
      } else {
        setStartDate(null);
      }
      if (savedDaysJson) {
        try {
          const arr = JSON.parse(savedDaysJson);
          if (Array.isArray(arr)) setLeaveDays(arr);
        } catch { setLeaveDays([]); }
      } else {
        setLeaveDays([]);
      }
      // Legacy: ignore (count is now derived from array)
      void legacyUsed;
    } catch (e) {
      console.warn('Failed to load leave data', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { reloadFromStorage(); }, [reloadFromStorage]));

  const leaveInfo = useMemo(() => startDate ? calculateAnnualLeave(startDate) : null, [startDate]);
  const usedDays = leaveDays.filter(d => d.type === 'annual').length;
  const remainingDays = (leaveInfo?.annualLeaveDays ?? 0) - usedDays;

  // Calendar grid
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const monthName = (isTr ? TR_MONTHS : EN_MONTHS)[month];
  const firstDay = new Date(year, month, 1).getDay();
  const firstDayMonStart = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calCells: (number | null)[] = [];
  for (let i = 0; i < firstDayMonStart; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);

  const leaveDayMap = useMemo(() => {
    const m: Record<string, LeaveDay> = {};
    leaveDays.forEach(ld => { m[ld.date] = ld; });
    return m;
  }, [leaveDays]);

  const persistLeaveDays = async (next: LeaveDay[]) => {
    setLeaveDays(next);
    try {
      await AsyncStorage.setItem(LEAVE_DAYS_KEY, JSON.stringify(next));
      const used = next.filter(d => d.type === 'annual').length;
      await AsyncStorage.setItem(LEAVE_USED_DAYS_KEY_LEGACY, String(used));
    } catch (e) {
      console.warn('Failed to persist leave days', e);
    }
  };

  const handleDayPress = (day: number) => {
    const date = new Date(year, month, day);
    const key = toDateKey(date);
    const existing = leaveDayMap[key];
    if (existing) {
      setActionMenuDate(key);
    } else {
      setTypeModalDate(key);
      setTypeModalType('annual');
      setTypeModalNote('');
      setTypeModalEditMode(false);
    }
  };

  const handleEditLeave = () => {
    if (!actionMenuDate) return;
    const existing = leaveDayMap[actionMenuDate];
    if (!existing) return;
    setTypeModalDate(actionMenuDate);
    setTypeModalType(existing.type);
    setTypeModalNote(existing.note || '');
    setTypeModalEditMode(true);
    setActionMenuDate(null);
  };

  const handleDeleteLeave = () => {
    if (!actionMenuDate) return;
    const key = actionMenuDate;
    setActionMenuDate(null);
    Alert.alert(
      isTr ? 'İzni Sil' : 'Delete Leave',
      isTr ? 'Bu izin kaydını silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this leave record?',
      [
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: isTr ? 'Sil' : 'Delete', style: 'destructive',
          onPress: async () => {
            await persistLeaveDays(leaveDays.filter(d => d.date !== key));
            showToast(isTr ? 'İzin kaydı silindi' : 'Leave record deleted');
          },
        },
      ]
    );
  };

  const confirmAddLeave = async () => {
    if (!typeModalDate) return;
    const filtered = leaveDays.filter(d => d.date !== typeModalDate);
    const next = [...filtered, { date: typeModalDate, type: typeModalType, note: typeModalNote.trim() || undefined }].sort((a, b) => a.date < b.date ? -1 : 1);
    await persistLeaveDays(next);
    showToast(isTr ? (typeModalEditMode ? 'İzin kaydı güncellendi' : 'İzin kaydı eklendi') : (typeModalEditMode ? 'Leave updated' : 'Leave added'));
    setTypeModalDate(null);
    setTypeModalNote('');
    setTypeModalEditMode(false);
  };

  const handleNativeDateChange = useCallback((_: any, selectedDate?: Date) => {
    setShowNativePicker(false);
    if (selectedDate) setStartDate(selectedDate);
  }, []);

  const handleOpenDatePicker = useCallback(() => {
    if (Platform.OS === 'web') {
      setWebDateInput(startDate ? startDate.toISOString().split('T')[0] : '');
      setShowWebDateModal(true);
    } else {
      setShowNativePicker(true);
    }
  }, [startDate]);

  const handleWebDateConfirm = useCallback(() => {
    if (webDateInput) {
      const d = new Date(webDateInput + 'T00:00:00');
      if (!isNaN(d.getTime()) && d <= new Date()) setStartDate(d);
    }
    setShowWebDateModal(false);
  }, [webDateInput]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const ops: Promise<void>[] = [];
      if (startDate) {
        ops.push(AsyncStorage.setItem(LEAVE_START_DATE_KEY, startDate.toISOString().split('T')[0]));
      }
      ops.push(AsyncStorage.setItem(LEAVE_DAYS_KEY, JSON.stringify(leaveDays)));
      ops.push(AsyncStorage.setItem(LEAVE_USED_DAYS_KEY_LEGACY, String(usedDays)));
      await Promise.all(ops);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      toast.error(isTr ? 'Kaydetme başarısız.' : 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  }, [startDate, leaveDays, usedDays, isTr]);

  const formatDate = (d: Date) => d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  // PDF: Summary (existing)
  const exportSummaryPdf = async () => {
    if (!leaveInfo || !startDate) return;
    setIsExportingPdf(true);
    try {
      const fullName = `${settings?.firstName ?? ''} ${settings?.lastName ?? ''}`.trim();
      const startStr = startDate.toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
      const yr = new Date().getFullYear();
      const monthlyNet = Object.values(settings?.monthlySalaries ?? {})[new Date().getMonth()] ?? 0;
      const total = leaveInfo.annualLeaveDays;
      const used = usedDays;
      const remain = total - used;
      const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
      const summaryTable = `
        <table>
          <thead><tr><th>${isTr ? 'Kalem' : 'Item'}</th><th class="num">${isTr ? 'Gün' : 'Days'}</th></tr></thead>
          <tbody>
            <tr><td class="strong">${isTr ? 'Toplam Hakedilen İzin' : 'Total Entitled Leave'}</td><td class="num">${total}</td></tr>
            <tr><td class="strong">${isTr ? 'Kullanılan İzin' : 'Used Leave'}</td><td class="num neg">${used}</td></tr>
            <tr class="total-row"><td>${isTr ? 'KALAN İZİN' : 'REMAINING LEAVE'}</td><td class="num">${remain}</td></tr>
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span class="label">${isTr ? 'Kullanım Oranı' : 'Usage Rate'}</span><span class="value">${pct.toFixed(0)}%</span></div>
          <div class="row"><span class="label">${isTr ? 'İşe Başlama' : 'Start Date'}</span><span class="value">${startStr}</span></div>
          <div class="row"><span class="label">${isTr ? 'Kıdem' : 'Tenure'}</span><span class="value">${leaveInfo.years} ${isTr ? 'yıl' : 'yr'} ${leaveInfo.months} ${isTr ? 'ay' : 'mo'}</span></div>
          <div class="row grand"><span class="label">${isTr ? 'KALAN İZİN HAKKINIZ' : 'YOUR REMAINING LEAVE'}</span><span class="value">${remain} ${isTr ? 'gün' : 'days'}</span></div>
        </div>`;
      const html = buildCorporateHtml({
        reportTitle: isTr ? 'YILLIK İZİN DÖKÜM BELGESİ' : 'ANNUAL LEAVE STATEMENT',
        reportSubtitle: isTr ? 'İş Kanunu Madde 53 Kapsamında İzin Durumu' : 'Leave Status under Labor Law Art. 53',
        reportNo: makeReportNo('MS-IZ'), period: `${yr}`, fullName, email: settings?.email || '',
        netSalary: monthlyNet, language: isTr ? 'tr' : 'en', fileName: `Mesai+_Yillik_Izin_${yr}.pdf`,
      }, [{ title: isTr ? 'İzin Özeti' : 'Leave Summary', body: summaryTable }]);
      await shareCorporatePdf(html, `Mesai+_Yillik_Izin_${yr}.pdf`, isTr ? 'tr' : 'en');
    } catch (e) {
      toast.error(isTr ? 'PDF oluşturulamadı' : 'Failed to generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // PDF: Detailed leave list
  const exportDetailedLeavePdf = async () => {
    if (leaveDays.length === 0) {
      toast.info(isTr ? 'Henüz izin günü işaretlenmedi.' : 'No leave days marked.');
      return;
    }
    setIsExportingLeavePdf(true);
    try {
      const fullName = `${settings?.firstName ?? ''} ${settings?.lastName ?? ''}`.trim();
      const yr = new Date().getFullYear();
      const monthlyNet = Object.values(settings?.monthlySalaries ?? {})[new Date().getMonth()] ?? 0;
      const counts: Record<LeaveType, number> = { annual: 0, excuse: 0, sick: 0, unpaid: 0 };
      const sorted = [...leaveDays].sort((a, b) => a.date < b.date ? -1 : 1);
      const rows = sorted.map((ld, i) => {
        counts[ld.type]++;
        const d = new Date(ld.date + 'T00:00:00');
        const ds = d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
        const dn = d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { weekday: 'short' });
        const meta = LEAVE_TYPE_META[ld.type];
        return `<tr><td class="center">${i + 1}</td><td>${ds}</td><td>${dn}</td><td><span style="color:${meta.color};font-weight:700;">${isTr ? meta.tr : meta.en}</span></td><td>${ld.note || '—'}</td></tr>`;
      }).join('');

      const table = `
        <table>
          <thead><tr>
            <th class="center">#</th>
            <th>${isTr ? 'Tarih' : 'Date'}</th>
            <th>${isTr ? 'Gün' : 'Day'}</th>
            <th>${isTr ? 'İzin Türü' : 'Leave Type'}</th>
            <th>${isTr ? 'Açıklama' : 'Note'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div class="row"><span class="label">${isTr ? 'Yıllık' : 'Annual'}</span><span class="value">${counts.annual} ${isTr ? 'gün' : 'd'}</span></div>
          <div class="row"><span class="label">${isTr ? 'Mazeret' : 'Excuse'}</span><span class="value">${counts.excuse} ${isTr ? 'gün' : 'd'}</span></div>
          <div class="row"><span class="label">${isTr ? 'Hastalık' : 'Sick'}</span><span class="value">${counts.sick} ${isTr ? 'gün' : 'd'}</span></div>
          <div class="row"><span class="label">${isTr ? 'Ücretsiz' : 'Unpaid'}</span><span class="value">${counts.unpaid} ${isTr ? 'gün' : 'd'}</span></div>
          <div class="row grand"><span class="label">${isTr ? 'TOPLAM' : 'TOTAL'}</span><span class="value">${leaveDays.length} ${isTr ? 'gün' : 'days'}</span></div>
        </div>`;

      const html = buildCorporateHtml({
        reportTitle: isTr ? 'İZİN DETAY RAPORU' : 'LEAVE DETAIL REPORT',
        reportSubtitle: isTr ? 'Tarih Bazlı İzin Dökümü' : 'Date-by-date Leave Breakdown',
        reportNo: makeReportNo('MS-IZD'), period: `${yr}`, fullName, email: settings?.email || '',
        netSalary: monthlyNet, language: isTr ? 'tr' : 'en',
        fileName: `Mesai+_Izin_Detay_${yr}.pdf`,
      }, [{ title: isTr ? 'İzin Günleri' : 'Leave Days', body: table }]);
      await shareCorporatePdf(html, `Mesai+_Izin_Detay_${yr}.pdf`, isTr ? 'tr' : 'en');
    } catch (e) {
      toast.error(isTr ? 'PDF oluşturulamadı' : 'Failed to generate PDF');
    } finally {
      setIsExportingLeavePdf(false);
    }
  };

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const dayNames = isTr ? TR_DAYS : EN_DAYS;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{isTr ? 'Yıllık İzin Takibi' : 'Annual Leave Tracker'}</Text>
        <Text style={styles.subtitle}>{isTr ? 'İş Kanunu Madde 53' : 'Labor Law Article 53'}</Text>
      </View>

      {/* Start Date Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>{isTr ? 'İşe Başlama Tarihi' : 'Employment Start Date'}</Text>
        </View>
        <Pressable onPress={handleOpenDatePicker} style={[styles.dateButton, { borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.dateText}>{startDate ? formatDate(startDate) : (isTr ? 'Tarih seçin...' : 'Select date...')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
        {showNativePicker && Platform.OS !== 'web' && (
          <DateTimePicker value={startDate ?? new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleNativeDateChange} maximumDate={new Date()} minimumDate={new Date(1970, 0, 1)} />
        )}
      </View>

      {Platform.OS === 'web' && showWebDateModal && (
        <Modal transparent animationType="fade" visible={showWebDateModal}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowWebDateModal(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? 'Tarih Girin' : 'Enter Date'}</Text>
              <Text style={[styles.modalHint, { color: colors.textMuted }]}>{isTr ? 'Format: YYYY-AA-GG' : 'Format: YYYY-MM-DD'}</Text>
              <TextInput value={webDateInput} onChangeText={setWebDateInput} placeholder="2020-01-15" placeholderTextColor={colors.textDim} style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]} autoFocus />
              <View style={styles.modalButtons}>
                <Pressable onPress={() => setShowWebDateModal(false)} style={[styles.modalBtn, { backgroundColor: colors.border }]}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text>
                </Pressable>
                <Pressable onPress={handleWebDateConfirm} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Tamam' : 'OK'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {startDate && leaveInfo && (
        <>
          {/* Work Duration */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="time" size={20} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{isTr ? 'Çalışma Süresi' : 'Employment Duration'}</Text>
            </View>
            <View style={styles.durationRow}>
              <View style={styles.durationItem}><Text style={styles.durationValue}>{leaveInfo.years}</Text><Text style={styles.durationLabel}>{isTr ? 'Yıl' : 'Years'}</Text></View>
              <View style={styles.durationItem}><Text style={styles.durationValue}>{leaveInfo.months}</Text><Text style={styles.durationLabel}>{isTr ? 'Ay' : 'Months'}</Text></View>
              <View style={styles.durationItem}><Text style={styles.durationValue}>{leaveInfo.days}</Text><Text style={styles.durationLabel}>{isTr ? 'Gün' : 'Days'}</Text></View>
            </View>
          </View>

          {/* Leave Entitlement */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="leaf" size={20} color={colors.success} />
              </View>
              <Text style={styles.cardTitle}>{isTr ? 'İzin Hakkı' : 'Leave Entitlement'}</Text>
            </View>
            <Text style={[styles.lawDescription, { color: colors.textMuted }]}>{isTr ? leaveInfo.description : leaveInfo.descriptionEn}</Text>
            <View style={styles.leaveGrid}>
              <View style={[styles.leaveBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                <Text style={[styles.leaveBoxValue, { color: colors.primary }]}>{leaveInfo.annualLeaveDays}</Text>
                <Text style={[styles.leaveBoxLabel, { color: colors.textMuted }]}>{isTr ? 'Toplam Hak' : 'Total'}</Text>
              </View>
              <View style={[styles.leaveBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
                <Text style={[styles.leaveBoxValue, { color: colors.warning }]}>{usedDays}</Text>
                <Text style={[styles.leaveBoxLabel, { color: colors.textMuted }]}>{isTr ? 'Kullanılan' : 'Used'}</Text>
              </View>
              <View style={[styles.leaveBox, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
                <Text style={[styles.leaveBoxValue, { color: remainingDays >= 0 ? colors.success : colors.danger }]}>{remainingDays}</Text>
                <Text style={[styles.leaveBoxLabel, { color: colors.textMuted }]}>{isTr ? 'Kalan' : 'Remaining'}</Text>
              </View>
            </View>
          </View>

          {/* Calendar Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="calendar-number" size={20} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{isTr ? 'İzin Takvimi' : 'Leave Calendar'}</Text>
            </View>
            <Text style={[styles.lawDescription, { color: colors.textMuted, marginBottom: spacing.sm }]}>
              {isTr ? 'Bir güne dokunup izin türünü seçin. Tekrar dokunarak silebilirsiniz.' : 'Tap a day to mark leave. Tap again to remove.'}
            </Text>
            <View style={styles.calNav}>
              <Pressable onPress={() => setCalMonth(new Date(year, month - 1, 1))} style={styles.calNavBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
              <Text style={[styles.calTitle, { color: colors.text }]}>{monthName} {year}</Text>
              <Pressable onPress={() => setCalMonth(new Date(year, month + 1, 1))} style={styles.calNavBtn}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.calRow}>
              {dayNames.map(d => <Text key={d} style={[styles.calDayName, { color: colors.textMuted }]}>{d}</Text>)}
            </View>
            <View style={styles.calGrid}>
              {calCells.map((day, idx) => {
                if (day === null) return <View key={idx} style={styles.calCell} />;
                const date = new Date(year, month, day);
                const key = toDateKey(date);
                const ld = leaveDayMap[key];
                const meta = ld ? LEAVE_TYPE_META[ld.type] : null;
                return (
                  <Pressable key={idx} onPress={() => handleDayPress(day)} style={[styles.calCell, ld && { backgroundColor: meta!.color + '30', borderColor: meta!.color, borderWidth: 1.5 }]}>
                    <Text style={[styles.calDayText, { color: ld ? meta!.color : colors.text }, ld && { fontWeight: '800' }]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
            {/* Legend */}
            <View style={styles.legendRow}>
              {(Object.keys(LEAVE_TYPE_META) as LeaveType[]).map(t => (
                <View key={t} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: LEAVE_TYPE_META[t].color }]} />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>{isTr ? LEAVE_TYPE_META[t].tr : LEAVE_TYPE_META[t].en}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Save */}
          <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => [styles.saveButton, { backgroundColor: savedFlash ? colors.success : colors.primary, opacity: isSaving ? 0.6 : pressed ? 0.8 : 1 }]}>
            {isSaving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name={savedFlash ? 'checkmark-circle' : 'save'} size={20} color="#fff" />
                <Text style={styles.saveButtonText}>{savedFlash ? (isTr ? 'Kaydedildi ✓' : 'Saved ✓') : (isTr ? 'Kaydet' : 'Save')}</Text>
              </>
            )}
          </Pressable>

          {/* PDF Buttons */}
          <Pressable onPress={exportSummaryPdf} disabled={isExportingPdf} style={({ pressed }) => [styles.gradientBtn, { backgroundColor: colors.primary, opacity: pressed || isExportingPdf ? 0.7 : 1, marginTop: spacing.sm }]}>
            {isExportingPdf ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="document-text" size={20} color="#fff" /><Text style={styles.gradientBtnText}>{isTr ? 'İzin Özet Raporu (PDF)' : 'Leave Summary (PDF)'}</Text></>
            )}
          </Pressable>
          <Pressable onPress={exportDetailedLeavePdf} disabled={isExportingLeavePdf} style={({ pressed }) => [styles.gradientBtn, { backgroundColor: colors.primary, opacity: pressed || isExportingLeavePdf ? 0.7 : 1, marginTop: spacing.sm }]}>
            {isExportingLeavePdf ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="list" size={20} color="#fff" /><Text style={styles.gradientBtnText}>{isTr ? 'İzin Detay Raporu (PDF)' : 'Leave Detail Report (PDF)'}</Text></>
            )}
          </Pressable>

          <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              {isTr ? 'İş Kanunu Madde 53: 1-5 yıl → 14, 5-15 yıl → 20, 15+ yıl → 26 gün.' : 'Labor Law Art. 53: 1-5 yr → 14, 5-15 yr → 20, 15+ yr → 26 days.'}
            </Text>
          </View>
        </>
      )}

      {!startDate && (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isTr ? 'İşe başlama tarihinizi girerek yıllık izin hakkınızı hesaplayın.' : 'Enter your start date to calculate annual leave entitlement.'}</Text>
        </View>
      )}

      {/* Action Menu (edit/delete) for existing leave */}
      <Modal transparent animationType="fade" visible={actionMenuDate !== null} onRequestClose={() => setActionMenuDate(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setActionMenuDate(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? 'İşlem Seçin' : 'Choose Action'}</Text>
            {actionMenuDate && (() => {
              const ld = leaveDayMap[actionMenuDate];
              if (!ld) return null;
              const meta = LEAVE_TYPE_META[ld.type];
              return (
                <View style={[styles.typeRow, { borderColor: meta.color, backgroundColor: meta.color + '15' }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                      {new Date(actionMenuDate + 'T00:00:00').toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {isTr ? meta.tr : meta.en}{ld.note ? ` · ${ld.note}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })()}
            <Pressable onPress={handleEditLeave} style={[styles.actionBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{isTr ? 'İzni Düzenle' : 'Edit Leave'}</Text>
            </Pressable>
            <Pressable onPress={handleDeleteLeave} style={[styles.actionBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger + '40' }]}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 15 }}>{isTr ? 'İzni Sil' : 'Delete Leave'}</Text>
            </Pressable>
            <Pressable onPress={() => setActionMenuDate(null)} style={[styles.actionBtn, { backgroundColor: colors.border, borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{isTr ? 'İptal' : 'Cancel'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Type Picker Modal */}
      <Modal transparent animationType="fade" visible={typeModalDate !== null} onRequestClose={() => setTypeModalDate(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTypeModalDate(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{typeModalEditMode ? (isTr ? 'İzni Düzenle' : 'Edit Leave') : (isTr ? 'İzin Türü Seçin' : 'Select Leave Type')}</Text>
            <Text style={[styles.modalHint, { color: colors.textMuted }]}>{typeModalDate ? new Date(typeModalDate + 'T00:00:00').toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</Text>
            <View style={{ gap: spacing.xs }}>
              {(Object.keys(LEAVE_TYPE_META) as LeaveType[]).map(t => (
                <Pressable key={t} onPress={() => setTypeModalType(t)} style={[styles.typeRow, { borderColor: typeModalType === t ? LEAVE_TYPE_META[t].color : colors.border, backgroundColor: typeModalType === t ? LEAVE_TYPE_META[t].color + '15' : 'transparent' }]}>
                  <Ionicons name={LEAVE_TYPE_META[t].icon} size={18} color={LEAVE_TYPE_META[t].color} />
                  <Text style={[{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }]}>{isTr ? LEAVE_TYPE_META[t].tr : LEAVE_TYPE_META[t].en}</Text>
                  {typeModalType === t && <Ionicons name="checkmark-circle" size={18} color={LEAVE_TYPE_META[t].color} />}
                </Pressable>
              ))}
            </View>
            <TextInput value={typeModalNote} onChangeText={setTypeModalNote} placeholder={isTr ? 'Açıklama (opsiyonel)' : 'Note (optional)'} placeholderTextColor={colors.textDim} style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]} />
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setTypeModalDate(null)} style={[styles.modalBtn, { backgroundColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text>
              </Pressable>
              <Pressable onPress={confirmAddLeave} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{typeModalEditMode ? (isTr ? 'Güncelle' : 'Update') : (isTr ? 'Ekle' : 'Add')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Toast */}
      {toastMsg && (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: colors.surfaceAlt, borderColor: colors.success + '60' }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{toastMsg}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
    header: { marginBottom: spacing.sm },
    title: { color: colors.text, fontSize: 28, fontWeight: '800' },
    subtitle: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: spacing.xs },
    card: { borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    iconBadge: { width: 36, height: 36, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
    dateButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1 },
    dateText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },
    durationRow: { flexDirection: 'row', justifyContent: 'space-around' },
    durationItem: { alignItems: 'center', gap: 4 },
    durationValue: { color: colors.primary, fontSize: 32, fontWeight: '800' },
    durationLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    lawDescription: { fontSize: 13, lineHeight: 18, marginBottom: spacing.md },
    leaveGrid: { flexDirection: 'row', gap: spacing.sm },
    leaveBox: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1 },
    leaveBoxValue: { fontSize: 24, fontWeight: '800' },
    leaveBoxLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
    calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    calNavBtn: { padding: spacing.xs, borderRadius: radius.md },
    calTitle: { fontSize: 16, fontWeight: '700' },
    calRow: { flexDirection: 'row' },
    calDayName: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingVertical: 4 },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calCell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: radius.sm, padding: 2 },
    calDayText: { fontSize: 13, fontWeight: '500' },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 11, fontWeight: '600' },
    infoCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
    infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
    emptyCard: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
    emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.md },
    saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    gradientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: radius.md },
    gradientBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    modalContent: { width: '100%', maxWidth: 360, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    modalHint: { fontSize: 12 },
    modalInput: { borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, fontSize: 14, fontWeight: '500' },
    modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    modalBtn: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center' },
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1 },
    toastWrap: { position: 'absolute', bottom: spacing.xl, left: 0, right: 0, alignItems: 'center', zIndex: 9999 },
    toast: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  });
}
