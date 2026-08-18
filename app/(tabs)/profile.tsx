import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useToast } from '../../src/context/ToastContext';
import { getColors, radius, spacing } from '../../src/theme';
import { PrivacyCard } from '../../src/components/PrivacyCard';
import { LegalDisclaimer } from '../../src/components/LegalDisclaimer';
import { PageHeader } from '../../src/components/PageHeader';
import { exportBackup, importBackup, confirmImportBackup } from '../../src/services/dataExport';
import { usePro } from '../../src/context/ProContext';
import { useRouter } from 'expo-router';

// Aynı ay-anahtarı standardı: app/(tabs)/menu/salary.tsx
const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

interface SettingsRow {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isPro } = usePro();
  const { settings, updateSettings, language, theme, refresh, resetAll } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const isTr = language === 'tr';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState<'firstName' | 'lastName' | 'email' | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const handleExportBackup = async () => {
    if (!isPro) { router.push('/upgrade'); return; }
    try {
      setBusy('export');
      await exportBackup();
    } catch (e: any) {
      toast.error(isTr ? 'Yedek oluşturulamadı' : 'Backup failed');
    } finally {
      setBusy(null);
    }
  };

  // Second confirmation shown only when the backup's profile email doesn't
  // match the current session email. Cancel writes nothing; Continue writes
  // the same already-validated data via confirmImportBackup (no re-picking).
  const handleOwnerMismatch = (data: Record<string, unknown>): Promise<void> => {
    return new Promise((resolve) => {
      Alert.alert(
        isTr ? 'Farklı kullanıcı yedeği' : 'Different user backup',
        isTr
          ? 'Bu yedekteki profil e-postası mevcut oturum e-postasıyla eşleşmiyor. Yedek başka bir kişiye ait olabilir. Devam ederseniz mevcut profil, maaş ve mesai verileriniz değiştirilecektir. Yine de geri yüklemek istiyor musunuz?'
          : 'The profile email in this backup does not match the current session email. This backup may belong to another person. Continuing may replace your current profile, salary and work data. Do you still want to restore it?',
        [
          { text: isTr ? 'İptal' : 'Cancel', style: 'cancel', onPress: () => resolve() },
          {
            text: isTr ? 'Devam Et' : 'Continue',
            style: 'destructive',
            onPress: async () => {
              const r2 = await confirmImportBackup(data);
              if (!r2.ok) {
                toast.error(isTr ? 'Geri yükleme başarısız' : 'Restore failed');
              } else {
                await refresh();
                toast.success(isTr ? 'Verileriniz geri yüklendi' : 'Data restored');
              }
              resolve();
            },
          },
        ]
      );
    });
  };

  const handleImportBackup = async () => {
    if (!isPro) { router.push('/upgrade'); return; }
    Alert.alert(
      isTr ? 'Yedeği Geri Yükle' : 'Restore Backup',
      isTr
        ? 'Mevcut verileriniz yedek dosyasındaki verilerle değiştirilecek. Seçtiğiniz yedek dosyası başka bir kişiye ait olabilir. Geri yükleme işlemi mevcut profil, maaş ve mesai verilerinizi değiştirebilir. Devam etmek istiyor musunuz?'
        : 'Your current data will be replaced with data from the backup file. The selected backup file may belong to another person. Restoring it may replace your current profile, salary and work data. Continue?',
      [
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: isTr ? 'Geri Yükle' : 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy('import');
              const r = await importBackup();
              if (!r.ok) {
                if (r.message === 'CANCELLED') return;
                if (r.message === 'OWNER_MISMATCH' && r.mismatch) {
                  await handleOwnerMismatch(r.mismatch.data);
                  return;
                }
                toast.error(
                  r.message === 'INVALID_FORMAT' || r.message === 'INVALID_JSON'
                    ? (isTr ? 'Geçersiz yedek dosyası' : 'Invalid backup file')
                    : (isTr ? 'Geri yükleme başarısız' : 'Restore failed')
                );
                return;
              }
              await refresh();
              toast.success(isTr ? 'Verileriniz geri yüklendi' : 'Data restored');
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  };

  // Same confirmation copy and resetAll() call the drawer's "Tüm Verileri
  // Sıfırla" used before it moved here — behavior unchanged, only relocated.
  const handleResetAll = () => {
    Alert.alert(
      isTr ? 'Tüm Verileri Sil' : 'Delete All Data',
      isTr
        ? 'Tüm uygulama verileriniz silinecek. Bu işlem geri alınamaz.'
        : 'All app data will be deleted. This cannot be undone.',
      [
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: isTr ? 'Evet, Sil' : 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAll();
              toast.success(isTr ? 'Tüm veriler silindi' : 'All data has been deleted');
            } catch (e) {
              toast.error(isTr ? 'Veri silme sırasında hata oluştu' : 'Error deleting data');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    setFirstName(settings?.firstName ?? '');
    setLastName(settings?.lastName ?? '');
    setEmail(settings?.email ?? '');
  }, [settings]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      toast.warning(language === 'tr' ? 'Lütfen adınızı girin' : 'Please enter your first name');
      return;
    }

    if (!lastName.trim()) {
      toast.warning(language === 'tr' ? 'Lütfen soyadınızı girin' : 'Please enter your last name');
      return;
    }

    if (!email.trim()) {
      toast.warning(language === 'tr' ? 'Lütfen e-posta adresinizi girin' : 'Please enter your email address');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        ...settings,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
      });
      await refresh();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    } catch (e) {
      toast.error(language === 'tr' ? 'Bilgiler kaydedilirken hata oluştu' : 'Failed to save information');
    } finally {
      setIsSaving(false);
    }
  };

  const fullName = `${settings?.firstName ?? ''} ${settings?.lastName ?? ''}`.trim();
  const initials = (
    (settings?.firstName?.trim()?.[0] ?? '') + (settings?.lastName?.trim()?.[0] ?? '')
  ).toUpperCase();

  const now = new Date();
  const currentMonthSalary = settings?.monthlySalaries?.[MONTH_KEYS[now.getMonth()]] ?? 0;

  const settingsRows: SettingsRow[] = [
    {
      id: 'salary',
      icon: 'cash-outline',
      title: isTr ? 'Maaş Bilgileri' : 'Salary Info',
      subtitle: isTr ? 'Bu ayki maaşını düzenle' : 'Edit this month’s salary',
      onPress: () => router.push('/(tabs)/menu/salary'),
    },
  ];

  // Same recipient/subject pattern as the drawer's "Destek Merkezi" — see
  // handleSupportEmail in app/(tabs)/_layout.tsx.
  const handleContactEmail = async () => {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        toast.error(isTr ? 'E-posta uygulaması bulunamadı.' : 'No email application is available.');
        return;
      }
      await MailComposer.composeAsync({
        recipients: ['metardtec@gmail.com'],
        subject: isTr ? 'Mesai+ Destek Talebi' : 'Mesai+ Support Request',
        body: isTr ? 'Merhaba Mesai+ Destek Ekibi,\n\n' : 'Hello Mesai+ Support Team,\n\n',
      });
    } catch (e) {
      toast.error(isTr ? 'E-posta uygulaması bulunamadı.' : 'No email application is available.');
    }
  };

  const appVersion = Constants.expoConfig?.version ?? '';

  const aboutFeatures = isTr
    ? [
        'Mesai ve kazanç takibi',
        'Maaş ve çalışma düzeni',
        'Ödeme, borç ve harcama yönetimi',
        'Altın, döviz ve diğer varlık takibi',
        'Yıllık izin takibi',
        'Çalışma hayatı hesaplama araçları',
        'PDF/Excel raporlama ve cihazda yedekleme',
      ]
    : [
        'Work hours & overtime tracking',
        'Salary and work schedule',
        'Payment, debt and expense management',
        'Gold, currency and other asset tracking',
        'Annual leave tracking',
        'Work-life calculation tools',
        'PDF/Excel reporting and on-device backup',
      ];

  interface LegalRow {
    id: string;
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
  }

  const legalRows: LegalRow[] = [
    {
      id: 'developer',
      icon: 'code-slash-outline',
      title: isTr ? 'Geliştirici' : 'Developer',
      subtitle: 'METARD',
    },
    {
      id: 'contact',
      icon: 'mail-outline',
      title: isTr ? 'İletişim' : 'Contact',
      subtitle: 'metardtec@gmail.com',
      onPress: handleContactEmail,
    },
    {
      id: 'privacy',
      icon: 'shield-checkmark-outline',
      title: isTr ? 'Gizlilik Politikası' : 'Privacy Policy',
      onPress: () => router.push('/privacy'),
    },
    {
      id: 'data-deletion',
      icon: 'trash-outline',
      title: isTr ? 'Veri Silme Politikası' : 'Data Deletion Policy',
      onPress: () => router.push('/data-deletion'),
    },
    {
      id: 'terms',
      icon: 'document-text-outline',
      title: isTr ? 'Kullanım Koşulları' : 'Terms of Use',
      onPress: () => router.push('/terms'),
    },
    {
      id: 'feedback',
      icon: 'chatbubble-ellipses-outline',
      title: isTr ? 'Öneriler & Hatalar' : 'Suggestions & Bugs',
      onPress: () => router.push('/(tabs)/menu/feedback'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <PageHeader title={language === 'tr' ? 'Profil' : 'Profile'} showTitle={false} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={10}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.headerSubtitle}>
            {isTr ? 'Hesabını ve tercihlerini yönet' : 'Manage your account and preferences'}
          </Text>

          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTop}>
              <View style={styles.avatar}>
                {initials ? (
                  <Text style={styles.avatarText}>{initials}</Text>
                ) : (
                  <Ionicons name="person" size={26} color="#fff" />
                )}
              </View>
              <View style={styles.heroIdentity}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {fullName || (isTr ? 'Mesai+ Kullanıcısı' : 'Mesai+ User')}
                </Text>
                {!!fullName && (
                  <Text style={styles.heroTagline} numberOfLines={1}>
                    {isTr ? 'Mesai+ Kullanıcısı' : 'Mesai+ User'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroSalaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroSalaryLabel}>{isTr ? 'BU AY MAAŞ' : 'THIS MONTH’S SALARY'}</Text>
                <Text style={styles.heroSalaryAmount} numberOfLines={1} adjustsFontSizeToFit>
                  ₺{currentMonthSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/(tabs)/menu/salary')}
              style={({ pressed }) => [styles.heroLink, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.heroLinkText}>
                {isTr ? 'Maaş Bilgilerini Düzenle' : 'Edit Salary Info'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </Pressable>
          </LinearGradient>

          <Text style={styles.sectionLabel}>
            {isTr ? 'KİŞİSEL BİLGİLER' : 'PERSONAL INFO'}
          </Text>
          <View style={styles.formSection}>
            <View style={styles.card}>
              <Text style={styles.label}>{language === 'tr' ? 'Ad' : 'First Name'}</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                onFocus={() => setFocusedField('firstName')}
                onBlur={() => setFocusedField(null)}
                placeholder={language === 'tr' ? 'Adınız' : 'Your first name'}
                placeholderTextColor={colors.textDim}
                style={[styles.input, focusedField === 'firstName' && { borderColor: colors.primary }]}
                autoCapitalize="words"
                editable={!isSaving}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>{language === 'tr' ? 'Soyad' : 'Last Name'}</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                onFocus={() => setFocusedField('lastName')}
                onBlur={() => setFocusedField(null)}
                placeholder={language === 'tr' ? 'Soyadınız' : 'Your last name'}
                placeholderTextColor={colors.textDim}
                style={[styles.input, focusedField === 'lastName' && { borderColor: colors.primary }]}
                autoCapitalize="words"
                editable={!isSaving}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>{language === 'tr' ? 'Rapor E-postası' : 'Report Email'}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="user@example.com"
                placeholderTextColor={colors.textDim}
                style={[styles.input, focusedField === 'email' && { borderColor: colors.primary }]}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSaving}
              />
              <Text style={styles.helperText}>
                {language === 'tr'
                  ? 'Raporların gönderileceği e-posta adresi'
                  : 'The email address your reports will be sent to'}
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed || isSaving ? 0.85 : 1, flex: 1 }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    {savedFlash ? (language === 'tr' ? 'Kaydedildi' : 'Saved') : (language === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes')}
                  </Text>
                  <Ionicons name={savedFlash ? 'checkmark' : 'save'} size={20} color="#fff" />
                </>
              )}
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>
            {isTr ? 'HESAP' : 'ACCOUNT'}
          </Text>
          <View style={styles.settingsSurface}>
            {settingsRows.map((row, idx) => (
              <Pressable
                key={row.id}
                onPress={row.onPress}
                style={({ pressed }) => [
                  styles.settingsRow,
                  idx < settingsRows.length - 1 && styles.settingsRowBorder,
                  pressed && { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <View style={styles.settingsIconWrap}>
                  <Ionicons name={row.icon as any} size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsRowTitle} numberOfLines={1}>{row.title}</Text>
                  {!!row.subtitle && (
                    <Text style={styles.settingsRowSubtitle} numberOfLines={1}>{row.subtitle}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
              </Pressable>
            ))}
          </View>

          {/* Backup Section */}
          <Text style={styles.sectionLabel}>
            {isTr ? 'VERİ & YEDEKLEME' : 'DATA & BACKUP'}
          </Text>
          <View style={[styles.backupCard, { gap: spacing.sm }]}>
            <Text style={styles.backupDesc}>
              {isTr
                ? 'Verilerinizi bir dosyaya yedekleyin veya önceki bir yedeği geri yükleyin. Yedek dosyanız cihazınızda oluşturulur. Paylaşmayı seçerseniz, seçtiğiniz uygulama veya hizmete gönderilebilir.'
                : 'Back up your data to a file or restore from a previous backup. Your backup file is created on your device. If you choose to share it, it may be sent to the app or service you select.'}
            </Text>
            <Pressable onPress={handleExportBackup} disabled={busy !== null} style={({ pressed }) => [styles.backupBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}>
              {busy === 'export' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-download" size={18} color="#fff" />
                  <Text style={styles.backupBtnText}>
                    {isTr ? 'Yedeği Dışa Aktar' : 'Export Backup'}
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={handleImportBackup}
              disabled={busy !== null}
              style={({ pressed }) => [
                styles.backupBtnAlt,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {busy === 'import' ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color={colors.text} />
                  <Text style={[styles.backupBtnText, { color: colors.text }]}>
                    {isTr ? 'Yedeği Geri Yükle' : 'Restore Backup'}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleResetAll}
              style={({ pressed }) => [
                styles.resetBtn,
                { borderColor: colors.danger, backgroundColor: pressed ? colors.danger + '14' : 'transparent' },
              ]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.resetBtnTitle, { color: colors.danger }]}>
                  {isTr ? 'Tüm Verileri Sıfırla' : 'Reset All Data'}
                </Text>
                <Text style={styles.resetBtnSubtitle}>
                  {isTr ? 'Cihazdaki Mesai+ kullanıcı verilerini temizler.' : 'Clears Mesai+ user data stored on this device.'}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Mesai+ Hakkında */}
          <Text style={styles.sectionLabel}>
            {isTr ? 'MESAİ+ HAKKINDA' : 'ABOUT MESAİ+'}
          </Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>Mesai+</Text>
            <Text style={styles.aboutTagline}>
              {isTr
                ? 'Çalışma hayatınızı ve kişisel finansınızı tek yerde yönetin.'
                : 'Manage your work life and personal finances in one place.'}
            </Text>
            <View style={styles.aboutFeatureList}>
              {aboutFeatures.map((f) => (
                <Text key={f} style={styles.aboutFeatureText}>• {f}</Text>
              ))}
            </View>
            {!!appVersion && (
              <View style={styles.aboutVersionRow}>
                <Text style={styles.aboutVersionText}>
                  {isTr ? `Sürüm ${appVersion}` : `Version ${appVersion}`}
                </Text>
              </View>
            )}
          </View>

          {/* Geliştirici & Yasal */}
          <Text style={styles.sectionLabel}>
            {isTr ? 'GELİŞTİRİCİ & YASAL' : 'DEVELOPER & LEGAL'}
          </Text>
          <View style={styles.settingsSurface}>
            {legalRows.map((row, idx) => {
              const content = (
                <>
                  <View style={styles.settingsIconWrap}>
                    <Ionicons name={row.icon as any} size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsRowTitle} numberOfLines={1}>{row.title}</Text>
                    {!!row.subtitle && (
                      <Text style={styles.settingsRowSubtitle} numberOfLines={1}>{row.subtitle}</Text>
                    )}
                  </View>
                  {!!row.onPress && (
                    <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                  )}
                </>
              );
              if (!row.onPress) {
                return (
                  <View
                    key={row.id}
                    style={[styles.settingsRow, idx < legalRows.length - 1 && styles.settingsRowBorder]}
                  >
                    {content}
                  </View>
                );
              }
              return (
                <Pressable
                  key={row.id}
                  onPress={row.onPress}
                  style={({ pressed }) => [
                    styles.settingsRow,
                    idx < legalRows.length - 1 && styles.settingsRowBorder,
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  {content}
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: spacing.md }}>
            <PrivacyCard language={language} theme={theme} />
          </View>

          <LegalDisclaimer />

          <View style={{ height: spacing.xl * 3 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(colors: typeof import('../../src/theme').darkColors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    headerSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '500',
      marginBottom: spacing.md,
      marginTop: -spacing.xs,
    },
    heroCard: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.22)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '800',
    },
    heroIdentity: {
      flex: 1,
      minWidth: 0,
    },
    heroName: {
      color: '#fff',
      fontSize: 19,
      fontWeight: '800',
    },
    heroTagline: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    heroDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.25)',
      marginVertical: spacing.md,
    },
    heroSalaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroSalaryLabel: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    heroSalaryAmount: {
      color: '#fff',
      fontSize: 26,
      fontWeight: '800',
    },
    heroLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
    },
    heroLinkText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    formSection: {
      gap: spacing.sm,
      flex: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    label: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    input: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '500',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg2,
    },
    helperText: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: spacing.sm,
      fontStyle: 'italic',
    },
    settingsSurface: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    settingsRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingsIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.accent + '1A',
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsRowTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    settingsRowSubtitle: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 1,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xl,
    },
    button: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    sectionLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: spacing.md,
      marginTop: spacing.lg,
    },
    backupCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    backupDesc: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.xs,
    },
    backupBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
    },
    backupBtnAlt: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    backupBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm + 2,
      borderRadius: radius.md,
      borderWidth: 1,
      marginTop: spacing.sm,
    },
    resetBtnTitle: {
      fontSize: 13,
      fontWeight: '700',
    },
    resetBtnSubtitle: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    aboutCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    aboutTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    aboutTagline: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    aboutFeatureList: {
      marginTop: spacing.sm,
      gap: 4,
    },
    aboutFeatureText: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    aboutVersionRow: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    aboutVersionText: {
      color: colors.textDim,
      fontSize: 11,
      fontWeight: '600',
    },
  });
}
