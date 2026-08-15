import React, { useEffect, useState, useLayoutEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { useToast } from '../../src/context/ToastContext';
import { getColors, radius, spacing } from '../../src/theme';
import { t } from '../../src/utils/i18n';
import { PrivacyCard } from '../../src/components/PrivacyCard';
import { LegalDisclaimer } from '../../src/components/LegalDisclaimer';
import { PageHeader } from '../../src/components/PageHeader';
import { exportBackup, importBackup, confirmImportBackup } from '../../src/services/dataExport';
import { usePro } from '../../src/context/ProContext';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const { isPro } = usePro();
  const { settings, updateSettings, language, theme, refresh } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const isTr = language === 'tr';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: language === 'tr' ? 'Profil' : 'Profile',
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <PageHeader title={language === 'tr' ? 'Profil' : 'Profile'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={10}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.headerSection}>
            <Text style={styles.subtitle}>
              {language === 'tr' ? 'Adınız, soyadınız ve e-posta adresini girin' : 'Enter your name, surname and email'}
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.card}>
              <Text style={styles.label}>{language === 'tr' ? 'Ad' : 'First Name'}</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder={language === 'tr' ? 'Adınız' : 'Your first name'}
                placeholderTextColor={colors.textDim}
                style={styles.input}
                autoCapitalize="words"
                editable={!isSaving}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>{language === 'tr' ? 'Soyad' : 'Last Name'}</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder={language === 'tr' ? 'Soyadınız' : 'Your last name'}
                placeholderTextColor={colors.textDim}
                style={styles.input}
                autoCapitalize="words"
                editable={!isSaving}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>{language === 'tr' ? 'E-Posta Adresi' : 'Email Address'}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSaving}
              />
              <Text style={styles.helperText}>
                {language === 'tr'
                  ? 'Raporlar bu e-posta adresine gönderilecektir'
                  : 'Reports will be sent to this email address'}
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={({ pressed }) => [{ opacity: pressed || isSaving ? 0.8 : 1, flex: 1 }]}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {savedFlash ? (language === 'tr' ? 'Kaydedildi' : 'Saved') : (language === 'tr' ? 'Kaydet' : 'Save')}
                    </Text>
                    <Ionicons name={savedFlash ? 'checkmark' : 'save'} size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Backup Section */}
          <Text style={styles.sectionLabel}>
            💾 {isTr ? 'Veri Yedekleme' : 'Data Backup'}
          </Text>
          <View style={[styles.backupCard, { gap: spacing.sm }]}>
            <Text style={styles.backupDesc}>
              {isTr
                ? 'Verilerinizi bir dosyaya yedekleyin veya önceki bir yedeği geri yükleyin. Yedek dosyanız cihazınızda oluşturulur. Paylaşmayı seçerseniz, seçtiğiniz uygulama veya hizmete gönderilebilir.'
                : 'Back up your data to a file or restore from a previous backup. Your backup file is created on your device. If you choose to share it, it may be sent to the app or service you select.'}
            </Text>
            <Pressable onPress={handleExportBackup} disabled={busy !== null} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.backupBtn}
              >
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
              </LinearGradient>
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
    headerSection: {
      alignItems: 'center',
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    emoji: {
      fontSize: 40,
      marginBottom: spacing.sm,
    },
    pageTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: spacing.xs,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
    },
    formSection: {
      gap: spacing.sm,
      flex: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
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
      paddingVertical: spacing.xs,
      borderBottomWidth: 2,
      borderBottomColor: colors.border,
    },
    helperText: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: spacing.sm,
      fontStyle: 'italic',
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
  });
}
