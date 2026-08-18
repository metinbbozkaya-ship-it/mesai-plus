import React, { useEffect, useMemo, useState, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { useApp } from '../../src/context/AppContext';
import { getColors, radius, spacing } from '../../src/theme';
import { formatDate, toDateKey, fromDateKey, TR_DAYS_LONG, TR_MONTHS, EN_MONTHS } from '../../src/utils/dates';
import { calculateEarnings, formatTL, getDayType, getDayTypeLabel, getMultiplier, calculateHourlyRate, DayType } from '../../src/utils/salary';
import { t, Language } from '../../src/utils/i18n';
import { DayBadge } from '../../src/components/DayBadge';
import { CalendarPicker } from '../../src/components/CalendarPicker';
import { PageHeader } from '../../src/components/PageHeader';
import { useToast } from '../../src/context/ToastContext';

const MONTH_KEYS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

export default function EntryScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const params = useLocalSearchParams<{ date?: string }>();
  const { entries, settings, upsertEntry, deleteEntry: ctxDeleteEntry, theme, language } = useApp();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const toast = useToast();
  const initialDate = useMemo(() => {
    const d = typeof params?.date === 'string' ? params.date : '';
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const parsed = fromDateKey(d);
      if (parsed && !isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [params?.date]);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [showModal, setShowModal] = useState(false);
  const isTr = language === 'tr';

  useEffect(() => {
    if (typeof params?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
      const parsed = fromDateKey(params.date);
      if (parsed && !isNaN(parsed.getTime())) setSelectedDate(parsed);
    }
  }, [params?.date]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(language, 'tab_entry'),
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const dayType = useMemo(() => getDayType(selectedDate), [selectedDate]);
  const multiplier = useMemo(() => getMultiplier(dayType), [dayType]);

  const hourlyRate = useMemo(() => {
    const monthKey = MONTH_KEYS[selectedDate.getMonth()];
    const ms = settings?.monthlySalaries ?? {};
    let monthlySalary = ms?.[monthKey] ?? 0;
    if (!monthlySalary || monthlySalary <= 0) {
      const firstSet = Object.values(ms).find((v) => typeof v === 'number' && v > 0) as number | undefined;
      monthlySalary = firstSet ?? 0;
    }
    return calculateHourlyRate(monthlySalary);
  }, [settings?.monthlySalaries, selectedDate]);

  const monthName = isTr ? TR_MONTHS[selectedDate.getMonth()] : EN_MONTHS[selectedDate.getMonth()];

  const monthlySalary = useMemo(() => {
    const monthKey = MONTH_KEYS[selectedDate.getMonth()];
    return settings?.monthlySalaries?.[monthKey] ?? 0;
  }, [settings?.monthlySalaries, selectedDate]);

  const monthSummary = useMemo(() => {
    let totalEarnings = 0;
    let overtimeEarnings = 0;
    let deductions = 0;
    let totalHours = 0;
    let entryCount = 0;

    Object.entries(entries || {}).forEach(([key, entry]) => {
      const d = fromDateKey(key);
      if (d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear()) {
        const dt = getDayType(d);
        const calc = calculateEarnings({ hours: entry.hours, isAbsence: entry.isAbsence, dayType: dt }, hourlyRate, entry.customMultiplier);
        if (entry.hours < 0) {
          deductions += Math.abs(calc.earnings);
        } else {
          overtimeEarnings += calc.earnings;
        }
        totalHours += entry.hours;
        entryCount++;
      }
    });
    totalEarnings = monthlySalary + overtimeEarnings - deductions;
    return { totalEarnings, overtimeEarnings, deductions, totalHours, entryCount };
  }, [entries, selectedDate, hourlyRate, monthlySalary]);

  // Selected day entries
  const dayEntry = entries?.[dateKey];
  const dayEarning = useMemo(() => {
    if (!dayEntry) return null;
    return calculateEarnings({ hours: dayEntry.hours, isAbsence: dayEntry.isAbsence, dayType }, hourlyRate, dayEntry.customMultiplier);
  }, [dayEntry, dayType, hourlyRate]);

  // Date range for month
  const monthStart = `01.${String(selectedDate.getMonth() + 1).padStart(2, '0')}.${selectedDate.getFullYear()}`;
  const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const monthEnd = `${lastDay}.${String(selectedDate.getMonth() + 1).padStart(2, '0')}.${selectedDate.getFullYear()}`;

  const haptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openAddEntry = () => {
    if (hourlyRate <= 0) {
      Alert.alert(
        isTr ? 'Maaş Eksik' : 'Salary Missing',
        isTr
          ? 'Saatlik kazancı hesaplayabilmek için önce Maaş sekmesinden aylık maaşınızı girmeniz gerekiyor.'
          : 'To calculate hourly earnings, please enter your monthly salary in the Salary tab first.',
        [
          { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
          { text: isTr ? 'Maaş Ekranına Git' : 'Go to Salary', onPress: () => router.push('/(tabs)/menu/salary') },
        ]
      );
      return;
    }
    haptic();
    setShowModal(true);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <PageHeader title={t(language, 'tab_entry')} showTitle={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <CalendarPicker
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onMonthChange={setSelectedDate}
          language={language}
          colors={colors}
          entries={entries}
        />

        {/* Month Summary Card */}
        <Animated.View entering={FadeIn.duration(300)} style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryDateRange, { color: colors.textMuted }]}>
            {monthStart} - {monthEnd}
          </Text>
          <Text style={[styles.summaryTotal, { color: colors.text }]}>
            {formatTL(monthSummary.totalEarnings)}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryItemLabel, { color: colors.textMuted }]}>
                {isTr ? 'maaş' : 'salary'}
              </Text>
              <Text style={[styles.summaryItemValue, { color: colors.text }]}>
                {formatTL(monthlySalary)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryItemLabel, { color: colors.textMuted }]}>
                {isTr ? 'ek gelirler' : 'overtime'}
              </Text>
              <Text style={[styles.summaryItemValue, { color: colors.success }]}>
                +{formatTL(monthSummary.overtimeEarnings)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryItemLabel, { color: colors.textMuted }]}>
                {isTr ? 'kesintiler' : 'deductions'}
              </Text>
              <Text style={[styles.summaryItemValue, { color: colors.danger }]}>
                -{formatTL(monthSummary.deductions)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Daily Detail */}
        <View style={styles.dailySection}>
          <Text style={[styles.dailyTitle, { color: colors.text }]}>
            {isTr ? 'Günlük detay' : 'Daily detail'}
          </Text>

          {dayEntry ? (
            <Animated.View entering={FadeInDown.duration(300)} style={[styles.dayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.dayCardTop}>
                <View style={styles.dayCardLeft}>
                  <DayBadge dayType={dayType} />
                  <Text style={[styles.dayCardType, { color: colors.text }]} numberOfLines={1}>
                    {dayEntry.hours < 0
                      ? (isTr ? 'Kesinti' : 'Deduction')
                      : dayEntry.isAbsence
                        ? (isTr ? 'Devamsızlık' : 'Absence')
                        : (isTr ? 'Ek Mesai' : 'Overtime')}
                    {' '}({Math.abs(dayEntry.hours)} {isTr ? 'saat' : 'hr'})
                  </Text>
                </View>
                <Text style={[
                  styles.dayCardEarning,
                  { color: dayEntry.hours < 0 ? colors.danger : colors.success }
                ]} numberOfLines={1}>
                  {dayEntry.hours < 0 ? '-' : '+'}{formatTL(Math.abs(dayEarning?.earnings ?? 0))}
                </Text>
              </View>
              <Text style={[styles.dayCardDate, { color: colors.textMuted }]}>
                {selectedDate.getDate()} {monthName} {selectedDate.getFullYear()}
              </Text>
              {/* Edit/Delete row */}
              <View style={styles.dayCardActions}>
                <Pressable
                  onPress={() => { haptic(); setShowModal(true); }}
                  style={[styles.dayActionBtn, { backgroundColor: colors.primary + '15' }]}
                >
                  <Ionicons name="pencil" size={14} color={colors.primary} />
                  <Text style={[styles.dayActionText, { color: colors.primary }]}>
                    {isTr ? 'Düzenle' : 'Edit'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    haptic();
                    Alert.alert(t(language, 'delete'), t(language, 'delete_confirm'), [
                      { text: t(language, 'cancel'), style: 'cancel' },
                      {
                        text: t(language, 'delete'),
                        style: 'destructive',
                        onPress: async () => {
                          await ctxDeleteEntry(dateKey);
                          toast.success(isTr ? 'Giriş silindi' : 'Entry deleted');
                        },
                      },
                    ]);
                  }}
                  style={[styles.dayActionBtn, { backgroundColor: colors.danger + '15' }]}
                >
                  <Ionicons name="trash" size={14} color={colors.danger} />
                  <Text style={[styles.dayActionText, { color: colors.danger }]}>
                    {isTr ? 'Sil' : 'Delete'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            <View style={[styles.emptyDay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={28} color={colors.textDim} />
              <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>
                {isTr ? 'Bu gün için kayıt yok' : 'No entry for this day'}
              </Text>
              <Text style={[styles.emptyDayHint, { color: colors.textDim }]}>
                {isTr ? '+ butonuna tıklayarak mesai ekle' : 'Tap + to add an entry'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={openAddEntry}
        style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.92 : 1 }] }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Entry Modal */}
      <EntryModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        selectedDate={selectedDate}
        dateKey={dateKey}
        dayType={dayType}
        defaultMultiplier={multiplier}
        hourlyRate={hourlyRate}
        monthlySalary={monthlySalary}
        existingEntry={dayEntry}
        upsertEntry={upsertEntry}
        colors={colors}
        language={language}
        isTr={isTr}
        monthName={monthName}
      />
    </View>
  );
}

// ─── Time Options (30-min increments) ─────────────────────────
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const val = (i + 1) * 0.5;
  const h = Math.floor(val);
  const m = val % 1 === 0.5 ? '30' : '00';
  return { label: `${String(h).padStart(2, '0')}:${m}`, value: val };
});
// Reuses the existing time picker's own max value — no new limit introduced.
const MAX_ENTRY_HOURS = TIME_OPTIONS[TIME_OPTIONS.length - 1].value;

// ─── Entry Modal ────────────────────────────────────────────────
const MULTIPLIER_OPTIONS = [0.5, 1.0, 1.5, 2.0] as const;

interface EntryModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  dateKey: string;
  dayType: DayType;
  defaultMultiplier: number;
  hourlyRate: number;
  monthlySalary: number;
  existingEntry: any;
  upsertEntry: (date: string, hours: number, isAbsence: boolean, customMultiplier?: number) => Promise<any>;
  colors: any;
  language: Language;
  isTr: boolean;
  monthName: string;
}

function EntryModal({
  visible, onClose, selectedDate, dateKey, dayType, defaultMultiplier, hourlyRate,
  monthlySalary, existingEntry, upsertEntry, colors, language, isTr, monthName,
}: EntryModalProps) {
  const styles = getModalStyles(colors);
  const toast = useToast();
  const { workplaces, activeWorkplaceId, setActiveWorkplaceId } = useApp();
  const [activeTab, setActiveTab] = useState<'normal' | 'deduction'>('normal');
  const [hours, setHours] = useState('');
  const [isAbsence, setIsAbsence] = useState(false);
  const [selectedMultiplier, setSelectedMultiplier] = useState(defaultMultiplier);
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTimeIdx, setTempTimeIdx] = useState(0); // index in TIME_OPTIONS for picker

  useEffect(() => {
    if (visible) {
      if (existingEntry) {
        if (existingEntry.hours < 0) {
          setActiveTab('deduction');
          setHours(Math.abs(existingEntry.hours).toString());
          setIsAbsence(false);
        } else {
          setActiveTab('normal');
          setHours(existingEntry.hours.toString());
          setIsAbsence(existingEntry.isAbsence);
        }
        setSelectedMultiplier(existingEntry.customMultiplier ?? existingEntry.multiplier ?? defaultMultiplier);
      } else {
        setActiveTab('normal');
        setHours('');
        setIsAbsence(false);
        setSelectedMultiplier(defaultMultiplier);
      }
    }
  }, [visible, existingEntry, defaultMultiplier]);

  const quickAddHours = (delta: number) => {
    if (saving || (activeTab === 'normal' && isAbsence)) return;
    const current = parseFloat(hours) || 0;
    const next = Math.min(MAX_ENTRY_HOURS, Math.max(0, current + delta));
    setHours(next.toString());
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const earningPreview = useMemo(() => {
    const h = parseFloat(hours) || 0;
    if (activeTab === 'deduction') {
      return calculateEarnings({ hours: -Math.abs(h), isAbsence: false, dayType }, hourlyRate, selectedMultiplier);
    }
    return calculateEarnings({ hours: h, isAbsence, dayType }, hourlyRate, selectedMultiplier);
  }, [hours, isAbsence, dayType, hourlyRate, activeTab, selectedMultiplier]);

  // Month date range
  const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const monthRange = `${String(selectedDate.getMonth() + 1).padStart(2, '0')}.${selectedDate.getFullYear()}`;

  const onSave = async () => {
    const h = parseFloat(hours) || 0;
    if (!isAbsence && h === 0) {
      toast.warning(isTr ? 'Lütfen geçerli bir saat girin' : 'Please enter valid hours');
      return;
    }
    setSaving(true);
    try {
      const finalHours = activeTab === 'deduction' ? -Math.abs(h) : h;
      const customMult = selectedMultiplier !== defaultMultiplier ? selectedMultiplier : undefined;
      await upsertEntry(dateKey, finalHours, activeTab === 'normal' ? isAbsence : false, customMult);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t(language, 'save_success_msg'));
      onClose();
    } catch {
      toast.error(isTr ? 'Kaydetme başarısız' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView edges={['top']} style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
              {/* Gradient Hero Header */}
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroHeader}
              >
                <View style={styles.heroTopRow}>
                  <Pressable onPress={onClose} hitSlop={12} style={styles.heroCloseBtn}>
                    <Ionicons name="close" size={22} color="#fff" />
                  </Pressable>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.heroTitle}>
                      {existingEntry ? (isTr ? 'Mesai Düzenle' : 'Edit Entry') : (isTr ? 'Yeni Ek Mesai' : 'New Overtime')}
                    </Text>
                    <Text style={styles.heroDate}>
                      {String(selectedDate.getDate()).padStart(2, '0')}.{String(selectedDate.getMonth() + 1).padStart(2, '0')}.{selectedDate.getFullYear()}
                    </Text>
                  </View>
                  <View style={{ width: 36 }} />
                </View>

                <Text style={styles.heroPreviewLabel}>
                  {isTr ? 'Tahmini Kazanç' : 'Estimated Earning'}
                </Text>
                <Text style={styles.heroPreviewValue}>
                  {earningPreview.earnings < 0 ? '−' : ''}{formatTL(Math.abs(earningPreview.earnings))}
                </Text>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{getDayTypeLabel(dayType)}</Text>
                  </View>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>× {selectedMultiplier.toFixed(1)}</Text>
                  </View>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{formatTL(hourlyRate)}/h</Text>
                  </View>
                </View>
                {workplaces.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.heroPreviewLabel}>{isTr ? 'İş Yeri' : 'Workplace'}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 8 }}>
                      {workplaces.map(w => {
                        const active = (activeWorkplaceId || workplaces[0]?.id) === w.id;
                        return (
                          <Pressable key={w.id} onPress={() => setActiveWorkplaceId(w.id)} style={[styles.wpPill, active && styles.wpPillActive]}>
                            <Ionicons name="business-outline" size={12} color="#fff" />
                            <Text style={styles.heroBadgeText}>{w.name}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </LinearGradient>

              {/* Mesai bilgisi section */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isTr ? 'Mesai bilgisi' : 'Overtime info'}
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                {isTr ? 'Süre ve oranı seçin.' : 'Select duration and rate.'}
              </Text>

              {/* Tab Selector */}
              <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  onPress={() => setActiveTab('normal')}
                  style={[styles.tab, activeTab === 'normal' && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'normal' ? '#fff' : colors.textMuted }]}>
                    {isTr ? 'Ek Mesai' : 'Overtime'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab('deduction')}
                  style={[styles.tab, activeTab === 'deduction' && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'deduction' ? '#fff' : colors.textMuted }]}>
                    {isTr ? 'Kesinti' : 'Deduction'}
                  </Text>
                </Pressable>
              </View>

              {/* Hours Picker Trigger */}
              <Pressable
                onPress={() => {
                  if (saving || (activeTab === 'normal' && isAbsence)) return;
                  const currentVal = parseFloat(hours) || 0;
                  const idx = TIME_OPTIONS.findIndex((o) => o.value === currentVal);
                  setTempTimeIdx(idx >= 0 ? idx : 0);
                  setShowTimePicker(true);
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  {isTr ? 'Mesai Saati' : 'Hours'}
                </Text>
                <View style={styles.pickerTrigger}>
                  <Text style={[styles.pickerTriggerText, { color: hours ? colors.text : colors.textMuted, fontWeight: hours ? '800' : '600' }]}>
                    {hours ? TIME_OPTIONS.find((o) => o.value === parseFloat(hours))?.label ?? hours : (isTr ? 'Saat seçin' : 'Select hours')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </View>
              </Pressable>

              {/* Quick Add Chips */}
              <View style={styles.quickAddRow}>
                {[1, 2, 3].map((n) => {
                  const quickDisabled = saving || (activeTab === 'normal' && isAbsence);
                  return (
                    <Pressable
                      key={n}
                      onPress={() => quickAddHours(n)}
                      disabled={quickDisabled}
                      style={[
                        styles.quickAddChip,
                        { backgroundColor: colors.surface, borderColor: colors.border, opacity: quickDisabled ? 0.5 : 1 },
                      ]}
                    >
                      <Text style={[styles.quickAddText, { color: colors.primary }]}>
                        +{n} {isTr ? 'saat' : 'hr'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Time Picker Bottom Sheet */}
              <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
                <Pressable style={styles.pickerOverlay} onPress={() => setShowTimePicker(false)}>
                  <Pressable style={[styles.pickerSheet, { backgroundColor: colors.bg }]} onPress={(e) => e.stopPropagation()}>
                    <View style={[styles.handle, { backgroundColor: colors.textDim }]} />
                    <Text style={[styles.pickerTitle, { color: colors.text }]}>
                      {isTr ? 'Mesai Saati' : 'Overtime Hours'}
                    </Text>
                    <Text style={[styles.pickerSubtitle, { color: colors.textMuted }]}>
                      {isTr ? 'Listeden seçiminizi yapıp onaylayın' : 'Select from the list and confirm'}
                    </Text>
                    <ScrollView
                      style={styles.pickerList}
                      showsVerticalScrollIndicator={false}
                      bounces={false}
                    >
                      {TIME_OPTIONS.map((opt, idx) => {
                        const isSelected = idx === tempTimeIdx;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => {
                              setTempTimeIdx(idx);
                              if (Platform.OS !== 'web') Haptics.selectionAsync();
                            }}
                            style={[
                              styles.pickerItem,
                              { borderColor: isSelected ? colors.primary : 'transparent' },
                              isSelected && { backgroundColor: colors.primary + '18' },
                            ]}
                          >
                            <Text style={[
                              styles.pickerItemText,
                              { color: isSelected ? colors.primary : colors.text },
                              isSelected && { fontWeight: '800' },
                            ]}>
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <View style={styles.pickerActions}>
                      <Pressable
                        onPress={() => setShowTimePicker(false)}
                        style={[styles.pickerActionBtn, { borderColor: colors.border }]}
                      >
                        <Text style={[styles.pickerActionText, { color: colors.textMuted }]}>
                          {isTr ? 'Vazgeç' : 'Cancel'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setHours(TIME_OPTIONS[tempTimeIdx].value.toString());
                          setShowTimePicker(false);
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }}
                        style={[styles.pickerConfirmBtn, { backgroundColor: colors.primary }]}
                      >
                        <Text style={styles.pickerConfirmText}>{isTr ? 'Seç' : 'Select'}</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                </Pressable>
              </Modal>

              {/* Multiplier Selector */}
              <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  {isTr ? 'Mesai Oranı' : 'Overtime Rate'}
                </Text>
                <View style={styles.multiplierRow}>
                  {MULTIPLIER_OPTIONS.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => {
                        setSelectedMultiplier(m);
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.multiplierBtn,
                        { borderColor: selectedMultiplier === m ? colors.primary : colors.border },
                        selectedMultiplier === m && { backgroundColor: colors.primary + '22' },
                      ]}
                    >
                      <Text style={[
                        styles.multiplierText,
                        { color: selectedMultiplier === m ? colors.primary : colors.text },
                        selectedMultiplier === m && { fontWeight: '800' },
                      ]}>
                        ×{m.toFixed(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {selectedMultiplier === defaultMultiplier ? (
                  <Text style={[styles.multiplierHint, { color: colors.textMuted }]}>
                    ℹ️ {isTr
                      ? `${getDayTypeLabel(dayType)} için varsayılan oran: ×${defaultMultiplier.toFixed(1)}`
                      : `Default rate for ${getDayTypeLabel(dayType)}: ×${defaultMultiplier.toFixed(1)}`}
                  </Text>
                ) : (
                  <Text style={[styles.multiplierHint, { color: colors.textMuted }]}>
                    ℹ️ {isTr ? `Varsayılan: ×${defaultMultiplier.toFixed(1)} (${getDayTypeLabel(dayType)})` : `Default: ×${defaultMultiplier.toFixed(1)} (${getDayTypeLabel(dayType)})`}
                  </Text>
                )}
              </View>

              {/* Absence toggle (only for normal) */}
              {activeTab === 'normal' && (
                <Pressable
                  onPress={() => setIsAbsence(!isAbsence)}
                  style={[styles.absenceRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons
                    name={isAbsence ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isAbsence ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.absenceLabel, { color: isAbsence ? colors.primary : colors.text }]}>
                    {t(language, 'absence')}
                  </Text>
                </Pressable>
              )}

              {/* Save Button */}
              <Pressable
                onPress={onSave}
                disabled={saving}
                style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed || saving ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], marginTop: spacing.sm }]}
              >
                <Ionicons name={existingEntry ? 'pencil' : 'save'} color="#fff" size={18} />
                <Text style={styles.saveBtnText}>
                  {existingEntry ? (isTr ? 'Güncelle' : 'Update') : (isTr ? 'Kaydet' : 'Save')}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Styles ────────────────────────────────────────────────
function getStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: { padding: spacing.md, paddingBottom: 100, gap: spacing.xs },
    // Summary Card
    summaryCard: {
      borderRadius: radius.lg,
      padding: spacing.sm,
      borderWidth: 1,
      alignItems: 'center',
      gap: 2,
    },
    summaryDateRange: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
    summaryTotal: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      width: '100%',
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryItemLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
    summaryItemValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
    summaryDivider: { width: 1, height: 22, marginHorizontal: 4 },
    // Daily section
    dailySection: { marginTop: 4 },
    dailyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    dayCard: {
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      gap: 4,
    },
    dayCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    dayCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
    dayCardType: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
    dayCardDate: { fontSize: 11, fontWeight: '500', marginLeft: 2 },
    dayCardEarning: { fontSize: 15, fontWeight: '800', flexShrink: 0 },
    dayCardActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dayActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.md,
    },
    dayActionText: { fontSize: 13, fontWeight: '600' },
    emptyDay: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      alignItems: 'center',
      gap: 6,
    },
    emptyDayText: { fontSize: 14, fontWeight: '600', marginTop: 4 },
    emptyDayHint: { fontSize: 12, fontWeight: '500' },
    // FAB
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6,
      zIndex: 100,
    },
  });
}

// ─── Modal Styles ───────────────────────────────────────────────
function getModalStyles(colors: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'ios' ? 8 : 12,
      paddingBottom: Platform.OS === 'ios' ? 20 : spacing.lg,
    },
    heroHeader: {
      marginHorizontal: 0,
      marginTop: Platform.select({ ios: 8, default: 4 }),
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      borderRadius: 28,
      marginBottom: spacing.md,
      shadowColor: colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    heroCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
    heroDate: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 2 },
    heroPreviewLabel: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 4,
    },
    heroPreviewValue: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.8,
      marginTop: 2,
    },
    heroBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    heroBadge: {
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    wpPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
    wpPillActive: { backgroundColor: 'rgba(255,255,255,0.38)', borderColor: 'rgba(255,255,255,0.75)' },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: spacing.sm,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheetTitle: { fontSize: 17, fontWeight: '700' },
    // Info panel
    infoPanel: {
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 7,
    },
    infoLabel: { fontSize: 13, fontWeight: '500' },
    infoValue: { fontSize: 14, fontWeight: '700' },
    infoDivider: { height: 1 },
    // Section
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
    sectionSub: { fontSize: 13, fontWeight: '500', marginBottom: spacing.md },
    // Tabs
    tabs: {
      flexDirection: 'row',
      borderRadius: 999,
      borderWidth: 1,
      padding: 4,
      gap: 4,
      marginBottom: spacing.md,
    },
    tab: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 999,
      alignItems: 'center',
    },
    tabText: { fontSize: 13, fontWeight: '700' },
    // Input
    inputCard: {
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    hoursInput: {
      fontSize: 24,
      fontWeight: '800',
      paddingVertical: 8,
      borderBottomWidth: 2,
    },
    // Picker trigger
    pickerTrigger: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    pickerTriggerText: {
      fontSize: 18,
      fontWeight: '800',
    },
    // Quick add chips
    quickAddRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: spacing.md,
    },
    quickAddChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: 'center',
    },
    quickAddText: {
      fontSize: 13,
      fontWeight: '700',
    },
    // Picker sheet
    pickerSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: spacing.lg,
      paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
      maxHeight: Dimensions.get('window').height * 0.55,
    },
    pickerTitle: {
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 2,
    },
    pickerSubtitle: {
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    pickerList: {
      maxHeight: 260,
      marginBottom: spacing.md,
    },
    pickerItem: {
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 2,
      marginBottom: 4,
      alignItems: 'center',
    },
    pickerItemText: {
      fontSize: 18,
      fontWeight: '600',
    },
    pickerActions: {
      flexDirection: 'row',
      gap: 10,
    },
    pickerActionBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerActionText: {
      fontSize: 15,
      fontWeight: '700',
    },
    pickerConfirmBtn: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerConfirmText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    // Multiplier
    multiplierRow: {
      flexDirection: 'row',
      gap: 8,
    },
    multiplierBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radius.md,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    multiplierText: { fontSize: 15, fontWeight: '600' },
    multiplierHint: { fontSize: 11, fontWeight: '500', marginTop: 8 },
    // Absence
    absenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    absenceLabel: { fontSize: 15, fontWeight: '600' },
    // Save
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: radius.lg,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
