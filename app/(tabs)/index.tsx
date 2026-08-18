import React, { useMemo, useState, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, FlatList, SafeAreaView, RefreshControl } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/context/AppContext';
import { useToast } from '../../src/context/ToastContext';
import { usePro } from '../../src/context/ProContext';
import { getColors, radius, spacing } from '../../src/theme';
import { formatDate, toDateKey, formatTurkishMonth } from '../../src/utils/dates';
import { calculateEarnings, formatTL, getDayType, getDayTypeLabel, getMultiplier } from '../../src/utils/salary';
import { t } from '../../src/utils/i18n';
import { DayBadge } from '../../src/components/DayBadge';
import { StatCard } from '../../src/components/StatCard';
import { MonthDetailsModal } from '../../src/components/MonthDetailsModal';
import { generateReportData, sharePdfReport, sendPdfByEmail } from '../../src/services/reportGenerator';
import { exportMonthlyStyledXlsx } from '../../src/services/dataExport';
import { EmptyState } from '../../src/components/EmptyState';
import { PageHeader } from '../../src/components/PageHeader';
import { GoalCard } from '../../src/components/GoalCard';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { FadeInView } from '../../src/components/FadeInView';
import { SkeletonCard } from '../../src/components/SkeletonCard';
import { Sparkline } from '../../src/components/Sparkline';
import { WeeklyBarChart } from '../../src/components/WeeklyBarChart';
import { WeeklyCalendar } from '../../src/components/WeeklyCalendar';

function HomeScreenContent() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const { entries, settings, ready, theme, language, refresh, workplaces, activeWorkplaceId, setActiveWorkplaceId } = useApp();
  const toast = useToast();
  const { isPro } = usePro();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const [activeTab, setActiveTab] = useState<'month' | 'week' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [refresh]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(language, 'tab_home'),
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );
  
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const todayEntry = entries?.[todayKey];
  const dayType = getDayType(today);

  const monthSummary = useMemo(() => {
    const y = today.getFullYear();
    const m = today.getMonth();
    const all = Object.values(entries ?? {});
    const inMonth = all.filter(e => {
      if (!e?.date) return false;
      const parts = e.date.split('-');
      return parseInt(parts?.[0] ?? '0', 10) === y && parseInt(parts?.[1] ?? '0', 10) - 1 === m;
    });
    let totalHours = 0;
    let gross = 0;
    let deduction = 0;
    inMonth.forEach(e => {
      totalHours += Number(e?.hours ?? 0) || 0;
      const earn = Number(e?.earnings ?? 0) || 0;
      if (earn < 0) deduction += -earn;
      else gross += earn;
    });
    return { totalHours, gross, deduction, net: gross - deduction, earned: gross - deduction };
  }, [entries, today]);

  // Last 7 days: daily earnings + labels
  const last7Days = useMemo(() => {
    const values: number[] = [];
    const labels: string[] = [];
    const dayShortTr = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const dayShortEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = new Map<string, number>();
    Object.values(entries ?? {}).forEach((e: any) => {
      if (!e?.date) return;
      map.set(e.date, (map.get(e.date) ?? 0) + (Number(e?.earnings ?? 0) || 0));
    });
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      values.push(map.get(key) ?? 0);
      labels.push((language === 'tr' ? dayShortTr : dayShortEn)[d.getDay()]);
    }
    return { values, labels, hasData: values.some(v => v !== 0) };
  }, [entries, today, language]);

  const allMonthsSummary = useMemo(() => {
    const all = Object.values(entries ?? {});
    const monthsMap = new Map<string, { totalHours: number; earned: number; year: number; month: number; daily: number[] }>();

    all.forEach(e => {
      if (!e?.date) return;
      const parts = e.date.split('-');
      const year = parseInt(parts?.[0] ?? '0', 10);
      const month = parseInt(parts?.[1] ?? '0', 10) - 1;
      const day = parseInt(parts?.[2] ?? '0', 10);
      const key = `${year}-${month}`;

      if (!monthsMap.has(key)) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        monthsMap.set(key, { totalHours: 0, earned: 0, year, month, daily: new Array(daysInMonth).fill(0) });
      }

      const monthData = monthsMap.get(key)!;
      monthData.totalHours += Number(e?.hours ?? 0) || 0;
      const earn = Number(e?.earnings ?? 0) || 0;
      monthData.earned += earn;
      if (day > 0 && day <= monthData.daily.length) {
        monthData.daily[day - 1] += earn;
      }
    });

    return Array.from(monthsMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [entries]);

  const greeting = settings?.firstName ? `${language === 'tr' ? 'Merhaba' : 'Hello'}, ${settings.firstName}` : (language === 'tr' ? 'Merhaba' : 'Hello');

  const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

  const handleGenerateReport = async (monthIndex: number) => {
    setMonthModalVisible(false);

    // Pro gate: rapor üretimi Pro özelliğidir
    if (!isPro) {
      router.push('/upgrade');
      return;
    }

    // Show dialog to choose between download and email
    const buildReportData = () => generateReportData(
      monthIndex,
      entries || {},
      settings?.monthlySalaries || {},
      language,
      settings?.firstName || '',
      settings?.lastName || '',
      settings?.email || ''
    );

    Alert.alert(
      language === 'tr' ? 'Rapor Gönder' : 'Export Report',
      language === 'tr' ? 'Rapor formatını seçin:' : 'Choose report format:',
      [
        {
          text: language === 'tr' ? 'İptal' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'tr' ? 'PDF Raporu (.pdf)' : 'PDF Report (.pdf)',
          onPress: async () => {
            setIsGeneratingReport(true);
            try {
              await sharePdfReport(buildReportData(), language);
            } catch (error: any) {
              console.log('Report error:', error);
              toast.error(language === 'tr' ? 'PDF oluşturulamadı' : 'Failed to generate PDF');
            } finally {
              setIsGeneratingReport(false);
            }
          },
        },
        {
          text: language === 'tr' ? 'Excel Çizelgesi (.xlsx)' : 'Excel Spreadsheet (.xlsx)',
          onPress: async () => {
            setIsGeneratingReport(true);
            try {
              await exportMonthlyStyledXlsx(buildReportData(), language);
            } catch (error: any) {
              console.log('Excel error:', error);
              toast.error(language === 'tr' ? 'Excel oluşturulamadı' : 'Failed to generate Excel');
            } finally {
              setIsGeneratingReport(false);
            }
          },
        },
        {
          text: language === 'tr' ? 'E-posta Gönder' : 'Send by Email',
          onPress: async () => {
            setIsGeneratingReport(true);
            try {
              if (!settings?.email) {
                toast.warning(language === 'tr' ? 'Profil sayfasında e-posta adresinizi girin' : 'Please set your email address in the Profile page');
                setIsGeneratingReport(false);
                return;
              }
              const reportData = generateReportData(
                monthIndex,
                entries || {},
                settings?.monthlySalaries || {},
                language,
                settings?.firstName || '',
                settings?.lastName || '',
                settings?.email || ''
              );
              await sendPdfByEmail(reportData, language);
            } catch (error: any) {
              console.log('Report error:', error);
              toast.error(language === 'tr' ? 'Rapor gönderilemedi' : 'Failed to send report');
            } finally {
              setIsGeneratingReport(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <PageHeader title={t(language, 'tab_home')} showTitle={false} />
      <ScrollView
        style={styles.wrap}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent, colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <FadeInView delay={0}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>
          <Text style={styles.date}>{formatDate(today, language)}</Text>
        </FadeInView>

        <FadeInView delay={80} style={{ marginTop: spacing.sm }}>
        <AnimatedPressable
          onPress={() => router.push('/entry')}
          accessibilityLabel={language === 'tr' ? "Bugünün mesaisini gir" : "Log today's work hours"}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroHeader}>
              <Text style={styles.heroTitle}>{t(language, 'today')}</Text>
              <DayBadge dayType={dayType} />
            </View>
            {todayEntry ? (
              <>
                <Text style={styles.heroBig}>
                  {todayEntry.isAbsence ? t(language, 'absence') : `${(todayEntry.hours ?? 0).toFixed(1)} ${language === 'tr' ? 'saat' : 'hrs'}`}
                </Text>
                <Text style={styles.heroSub}>
                  {todayEntry.isAbsence && todayEntry.dayType === 'weekday'
                    ? `${t(language, 'deductions')}: ${formatTL(Math.abs(todayEntry.earnings ?? 0))}`
                    : `${t(language, 'earnings')}: ${formatTL(todayEntry.earnings ?? 0)}`}
                </Text>
                <View style={styles.heroBtn}>
                  <Text style={styles.heroBtnText}>{t(language, 'edit')}</Text>
                  <Ionicons name="chevron-forward" color="#fff" size={18} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.heroBig}>{language === 'tr' ? 'Henüz giriş yapılmadı' : 'No entry yet'}</Text>
                <Text style={styles.heroSub}>{getDayTypeLabel(dayType)} • ×{getMultiplier(dayType)} {language === 'tr' ? 'oranı' : 'rate'}</Text>
                <View style={styles.heroBtn}>
                  <Text style={styles.heroBtnText}>{t(language, 'entry')}</Text>
                  <Ionicons name="arrow-forward" color="#fff" size={18} />
                </View>
              </>
            )}
          </LinearGradient>
        </AnimatedPressable>
        </FadeInView>

        {/* Workplace Switcher */}
        {workplaces.length === 0 && (
          <FadeInView delay={100} style={{ marginTop: spacing.sm }}>
            <Pressable
              onPress={() => router.push('/(tabs)/menu/workplaces')}
              style={({ pressed }) => [styles.addWorkplaceCta, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.addWorkplaceIcon, { backgroundColor: colors.primary + '1F' }]}>
                <Ionicons name="business" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addWorkplaceText}>
                  {language === 'tr'
                    ? 'İş yeri ekleyerek kayıtlarını ayrı ayrı takip et'
                    : 'Add a workplace to track your entries separately'}
                </Text>
                <Text style={styles.addWorkplaceLink}>
                  {language === 'tr' ? '+ İlk İş Yerini Ekle' : '+ Add Your First Workplace'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </FadeInView>
        )}
        {workplaces.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            style={{ marginTop: spacing.sm, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md }}
          >
            <Pressable
              onPress={() => setActiveWorkplaceId('')}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                backgroundColor: activeWorkplaceId === '' ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: activeWorkplaceId === '' ? colors.primary : colors.border,
                flexDirection: 'row', alignItems: 'center', gap: 6,
              }}
            >
              <Ionicons name="grid" size={14} color={activeWorkplaceId === '' ? '#FFFFFF' : colors.textMuted} />
              <Text style={{
                color: activeWorkplaceId === '' ? '#FFFFFF' : colors.text,
                fontSize: 13, fontWeight: '600',
              }}>{language === 'tr' ? 'Tümü' : 'All'}</Text>
            </Pressable>
            {workplaces.map(w => {
              const active = activeWorkplaceId === w.id;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => setActiveWorkplaceId(w.id)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                    backgroundColor: active ? w.color : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? w.color : colors.border,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{w.emoji}</Text>
                  <Text style={{
                    color: active ? '#FFFFFF' : colors.text,
                    fontSize: 13, fontWeight: '600',
                  }}>{w.name}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => router.push('/(tabs)/menu/workplaces')}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                backgroundColor: colors.surface,
                borderWidth: 1, borderColor: colors.border,
                borderStyle: 'dashed',
                flexDirection: 'row', alignItems: 'center', gap: 6,
              }}
            >
              <Ionicons name="add" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>
                {language === 'tr' ? 'Yönet' : 'Manage'}
              </Text>
            </Pressable>
          </ScrollView>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => {
              if (!isPro) {
                router.push('/upgrade');
                return;
              }
              setActiveTab('week');
            }}
            style={[styles.tabButton, activeTab === 'week' && styles.tabButtonActive, !isPro && styles.tabButtonLocked]}
          >
            <Text style={[styles.tabLabel, activeTab === 'week' && styles.tabLabelActive]}>
              {language === 'tr' ? 'Bu Hafta' : 'This Week'}{!isPro ? ' 🔒' : ''}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('month')}
            style={[styles.tabButton, activeTab === 'month' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabLabel, activeTab === 'month' && styles.tabLabelActive]}>{t(language, 'this_month')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('all')}
            style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabLabel, activeTab === 'all' && styles.tabLabelActive]}>{t(language, 'all_months')}</Text>
          </Pressable>
        </View>

        {/* Bu Hafta Tab Content */}
        {activeTab === 'week' && (
          <WeeklyCalendar entries={entries} theme={theme} language={language} />
        )}

        {/* Bu Ay Tab Content */}
        {activeTab === 'month' && (
          monthSummary.totalHours === 0 ? (
            <EmptyState
              language={language}
              theme={theme}
              icon="time-outline"
              onPress={() => router.push('/entry')}
            />
          ) : (
            <>
              <View style={styles.statsGroup}>
                <View style={styles.grid}>
                  <StatCard label={t(language, 'total_hours')} value={`${monthSummary.totalHours.toFixed(1)} ${language === 'tr' ? 'sa' : 'h'}`} />
                  <StatCard label={t(language, 'your_salary')} value={formatTL(Object.values(settings?.monthlySalaries ?? {})[today.getMonth()] ?? 0)} accent={colors.primary} />
                </View>
                <View style={styles.grid}>
                  <StatCard label={t(language, 'overtime_pay')} value={formatTL(monthSummary.earned)} accent={colors.success} large />
                </View>
              </View>
              <FadeInView delay={120}>
                <WeeklyBarChart
                  weekly={last7Days.values}
                  labels={last7Days.labels}
                  theme={theme}
                  language={language}
                  title={language === 'tr' ? 'Son 7 Gün' : 'Last 7 Days'}
                />
              </FadeInView>
              <View style={{ marginTop: spacing.xs }}>
                <GoalCard current={monthSummary.earned} />
              </View>
            </>
          )
        )}

        {/* Tüm Aylar Tab Content */}
        {activeTab === 'all' && (
          <View style={styles.monthList}>
            {allMonthsSummary.length === 0 ? (
              <EmptyState
                language={language}
                theme={theme}
                icon="calendar-outline"
                onPress={() => router.push('/entry')}
              />
            ) : (
              allMonthsSummary.map((monthData, idx) => {
                const monthDate = new Date(monthData.year, monthData.month, 1);
                const monthName = formatTurkishMonth(monthDate);
                return (
                  <FadeInView key={idx} delay={idx * 60}>
                    <AnimatedPressable
                      onPress={() => setSelectedMonth({ year: monthData.year, month: monthData.month })}
                      style={styles.monthItem}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={styles.monthItemLeft}>
                          <Text style={styles.monthItemTitle}>{monthName}</Text>
                          <Text style={styles.monthItemDetail}>{monthData.totalHours.toFixed(1)} {language === 'tr' ? 'saat' : 'hrs'}</Text>
                        </View>
                        {monthData.daily.some(v => v !== 0) && (
                          <View style={{ marginHorizontal: spacing.sm, opacity: 0.9 }}>
                            <Sparkline
                              data={monthData.daily}
                              width={72}
                              height={26}
                              color={monthData.earned >= 0 ? colors.success : colors.danger}
                            />
                          </View>
                        )}
                        <View style={styles.monthItemRight}>
                          <Text style={[styles.monthItemEarned, monthData.earned >= 0 ? styles.monthItemEarnedPositive : styles.monthItemEarnedNegative]}>
                            {monthData.earned > 0 ? '+' : ''}{formatTL(monthData.earned)}
                          </Text>
                          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </View>
                      </View>
                    </AnimatedPressable>
                  </FadeInView>
                );
              })
            )}
          </View>
        )}

        {!ready && (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <SkeletonCard height={80} />
            <SkeletonCard height={64} />
            <SkeletonCard height={64} />
          </View>
        )}

        {/* Report Export Section */}
        <Pressable
          onPress={() => setMonthModalVisible(true)}
          disabled={isGeneratingReport}
          style={({ pressed }) => [
            {
              marginTop: spacing.sm,
              opacity: pressed || isGeneratingReport ? 0.85 : 1,
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              padding: spacing.sm + 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            },
          ]}
        >
          <Ionicons name="document-text" size={20} color="#fff" />
          <Text style={{ flex: 1, color: '#fff', fontSize: 15, fontWeight: '700' }}>{language === 'tr' ? 'Rapor Gönder' : 'Export Report'}</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </Pressable>
      </ScrollView>

      {/* Report Month Selection Modal */}
      <Modal
        visible={monthModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMonthModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{language === 'tr' ? 'Ay Seçin' : 'Select Month'}</Text>
            <Pressable onPress={() => setMonthModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={MONTH_KEYS.map((key, index) => ({
              id: index.toString(),
              name: language === 'tr' ? MONTHS_TR[index] : MONTHS_EN[index],
              value: index.toString(),
            }))}
            renderItem={({ item }) => (
              <Pressable
                disabled={isGeneratingReport}
                onPress={() => handleGenerateReport(parseInt(item.value))}
                style={({ pressed }) => [{ paddingVertical: spacing.md, paddingHorizontal: spacing.lg, opacity: pressed || isGeneratingReport ? 0.6 : 1, borderBottomWidth: 1, borderBottomColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{item.name}</Text>
              </Pressable>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ flexGrow: 1 }}
          />
        </SafeAreaView>
      </Modal>

      <MonthDetailsModal
        visible={!!selectedMonth}
        onClose={() => setSelectedMonth(null)}
        month={selectedMonth}
      />
    </>
  );
}

function getStyles(colors: typeof import('../../src/theme').darkColors) {
  return StyleSheet.create({
    wrap: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    greeting: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    date: { color: colors.textMuted, fontSize: 13, marginTop: 4, fontWeight: '500' },
    addWorkplaceCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm + 2,
    },
    addWorkplaceIcon: {
      width: 36, height: 36, borderRadius: radius.sm,
      justifyContent: 'center', alignItems: 'center',
    },
    addWorkplaceText: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
    addWorkplaceLink: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 2 },
    hero: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      overflow: 'hidden',
      shadowColor: colors.primary,
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    heroTitle: { color: '#fff', fontSize: 11, fontWeight: '800', opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1.2 },
    heroBig: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500', marginTop: 6 },
    heroBtn: {
      marginTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.full ?? 999,
      gap: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    heroBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    tabContainer: {
      flexDirection: 'row',
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      gap: 4,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
    },
    tabButton: { flex: 1, paddingVertical: spacing.sm - 2, alignItems: 'center', borderRadius: radius.sm },
    tabButtonActive: { backgroundColor: colors.bg },
    tabButtonLocked: { opacity: 0.55 },
    tabLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
    tabLabelActive: { color: colors.primary },
    statsGroup: { gap: spacing.xs, marginBottom: spacing.xs },
    grid: { flexDirection: 'row', gap: spacing.xs },
    monthList: { marginTop: spacing.sm },
    monthItem: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    monthItemPressed: {
      opacity: 0.7,
      backgroundColor: colors.border,
    },
    monthItemLeft: { flex: 1 },
    monthItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginLeft: spacing.sm,
    },
    monthItemTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
    monthItemDetail: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    monthItemEarned: { fontSize: 14, fontWeight: '800' },
    monthItemEarnedPositive: { color: colors.success },
    monthItemEarnedNegative: { color: colors.danger },
    emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 13, marginTop: spacing.md },
    loading: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  });
}

export default function HomeScreen() {
  return <HomeScreenContent />;
}
