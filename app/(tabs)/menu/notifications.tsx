import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, SafeAreaView, Platform } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApp } from '../../../src/context/AppContext';
import { useToast } from '../../../src/context/ToastContext';
import { getColors, radius, spacing } from '../../../src/theme';
import { t } from '../../../src/utils/i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DAILY_ID = 'mesai-daily-reminder';

async function scheduleDailyReminder(time: string, isTr: boolean) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const [h, m] = time.split(':').map(Number);
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: {
      title: isTr ? 'Mesai+ Hatırlatıcı' : 'Mesai+ Reminder',
      body: isTr
        ? 'Bugünkü mesai girişini yapmayı unutma! 💼'
        : "Don't forget to log today's work! 💼",
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: m,
    } as any,
  });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const { settings, updateSettings, entries, theme, language } = useApp();
  const toast = useToast();
  const isTr = language === 'tr';
  const colors = getColors(theme);
  const styles = getStyles(colors);

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings?.notificationsEnabled ?? true
  );
  const [notificationTime, setNotificationTime] = useState('09:00');
  const [showPicker, setShowPicker] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(language, 'tab_notifications'),
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

  useEffect(() => {
    setNotificationsEnabled(settings?.notificationsEnabled ?? true);
    setNotificationTime(settings?.notificationTime ?? '09:00');
  }, [settings]);

  const handleToggleNotifications = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    try {
      if (enabled) {
        if (Platform.OS === 'web') {
          await updateSettings({ ...settings, notificationsEnabled: true, notificationTime });
          toast.info(isTr ? 'Bildirimler yalnızca mobil cihazda çalışır' : 'Notifications only work on mobile');
          return;
        }
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          toast.error(t(language, 'notification_perm_denied'));
          setNotificationsEnabled(false);
          await updateSettings({ ...settings, notificationsEnabled: false });
          return;
        }
        await scheduleDailyReminder(notificationTime, isTr);
        await updateSettings({ ...settings, notificationsEnabled: true, notificationTime });
        toast.success(isTr ? `Her gün ${notificationTime}'da hatırlatacağız ✅` : `We'll remind you daily at ${notificationTime} ✅`);
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await updateSettings({ ...settings, notificationsEnabled: false });
        toast.info(t(language, 'notification_disabled'));
      }
    } catch (e) {
      console.error('Notification toggle error:', e);
      toast.error(t(language, 'notification_error'));
    }
  };

  const handleTimeChange = async (event: any, selected?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (event?.type === 'dismissed' || !selected) return;
    const hh = String(selected.getHours()).padStart(2, '0');
    const mm = String(selected.getMinutes()).padStart(2, '0');
    const newTime = `${hh}:${mm}`;
    setNotificationTime(newTime);
    await updateSettings({ ...settings, notificationTime: newTime, notificationsEnabled });
    if (notificationsEnabled && Platform.OS !== 'web') {
      await scheduleDailyReminder(newTime, isTr);
      toast.success(isTr ? `Saat güncellendi: ${newTime}` : `Time updated: ${newTime}`);
    }
  };

  const handleTestNotification = async () => {
    if (Platform.OS === 'web') {
      toast.info(isTr ? 'Bildirimler yalnızca mobil cihazda çalışır' : 'Notifications only work on mobile');
      return;
    }
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') { toast.error(t(language, 'notification_perm_denied')); return; }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isTr ? '🔔 Test Bildirimi' : '🔔 Test Notification',
          body: isTr ? 'Bildirimler başarıyla çalışıyor!' : 'Notifications are working!',
          sound: 'default',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 } as any,
      });
      toast.success(isTr ? 'Test bildirimi 2 saniye içinde gelecek' : 'Test notification in 2 seconds');
    } catch (e) {
      toast.error(isTr ? 'Bildirim gönderilemedi' : 'Failed to send notification');
    }
  };

  const getTodayEntry = () => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return entries?.[dateKey];
  };

  const todayEntry = getTodayEntry();
  const hasEntryToday = !!todayEntry;

  const timeDate = (() => {
    const [h, m] = notificationTime.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0); return d;
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{t(language, 'notifications')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={styles.pageTitle}>{t(language, 'notifications')}</Text>
          <Text style={styles.subtitle}>{t(language, 'daily_reminders')}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>📌 {t(language, 'daily_reminder')}</Text>
              <Text style={styles.cardSubtitle}>{t(language, 'reminder_description')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.textMuted, true: colors.accent }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
            />
          </View>

          {notificationsEnabled && (
            <View style={styles.timeInfo}>
              <Text style={styles.timeLabel}>{t(language, 'notification_time')}</Text>
              <Pressable onPress={() => setShowPicker(true)} style={styles.timeButton}>
                <Ionicons name="time-outline" size={22} color={colors.accent} />
                <Text style={styles.timeValue}>{notificationTime}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.timeNote}>
                {isTr
                  ? 'Her gün bu saatte hatırlatma bildirimi alacaksınız'
                  : "You'll get a reminder every day at this time"}
              </Text>
              {showPicker && (
                <DateTimePicker
                  value={timeDate}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              )}

              <Pressable onPress={handleTestNotification} style={styles.testBtn}>
                <Ionicons name="notifications-outline" size={16} color="#fff" />
                <Text style={styles.testBtnText}>{isTr ? 'Test Bildirimi Gönder' : 'Send Test Notification'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{t(language, 'todays_status')}</Text>
          {hasEntryToday ? (
            <View style={styles.statusGreen}>
              <Text style={styles.statusIcon}>✓</Text>
              <Text style={styles.statusText}>{t(language, 'entry_made')}</Text>
            </View>
          ) : (
            <View style={styles.statusRed}>
              <Text style={styles.statusIcon}>!</Text>
              <Text style={styles.statusText}>{t(language, 'entry_not_made')}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 {isTr ? 'Bilgi' : 'Info'}</Text>
          <Text style={styles.infoText}>{t(language, 'notification_info')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(colors: typeof import('../../../src/theme').darkColors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    },
    backButton: {
      padding: 8, borderRadius: radius.full ?? 999, borderWidth: 1,
    },
    headerTitle: { color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 },
    container: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    headerSection: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.lg },
    emoji: { fontSize: 64, marginBottom: spacing.md },
    pageTitle: { color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: spacing.sm, textAlign: 'center' },
    subtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
    card: {
      backgroundColor: colors.surface, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, marginBottom: spacing.lg,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
    cardSubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    timeInfo: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
    timeLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
    timeButton: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      backgroundColor: colors.bg, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.md,
    },
    timeValue: { color: colors.text, fontSize: 20, fontWeight: '800', flex: 1 },
    timeNote: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
    testBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.accent, borderRadius: radius.md,
      paddingVertical: spacing.md, marginTop: spacing.sm,
    },
    testBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    statusCard: {
      backgroundColor: colors.surface, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg,
    },
    statusLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: spacing.md },
    statusGreen: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingVertical: spacing.md, paddingHorizontal: spacing.md,
      backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: radius.md,
    },
    statusRed: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingVertical: spacing.md, paddingHorizontal: spacing.md,
      backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: radius.md,
    },
    statusIcon: { fontSize: 20, fontWeight: '800' },
    statusText: { color: colors.text, fontSize: 14, fontWeight: '700' },
    infoCard: {
      backgroundColor: colors.surface, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
    },
    infoTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.md },
    infoText: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  });
}
