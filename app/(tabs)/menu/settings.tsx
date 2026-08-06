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
import { useNavigation, useRouter } from 'expo-router';
import { useApp } from '../../../src/context/AppContext';
import { useToast } from '../../../src/context/ToastContext';
import { getColors, radius, spacing } from '../../../src/theme';
import { t } from '../../../src/utils/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backupUserData, restoreUserData } from '../../../src/storage/db';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const { settings, updateSettings, language, theme, refresh, resetAll, logout } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(language, 'tab_profile'),
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

  useEffect(() => {
    setFirstName(settings?.firstName ?? '');
    setLastName(settings?.lastName ?? '');

    const loadLoginEmail = async () => {
      try {
        const email = await AsyncStorage.getItem('mesai.user.email.v1');
        if (email) {
          setLoginEmail(email);
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (e) {
        console.warn('Failed to load login email', e);
        setIsLoggedIn(false);
      }
    };
    loadLoginEmail();
  }, [settings]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.warning(language === 'tr' ? 'Lütfen adınız ve soyadınızı girin' : 'Please enter your first and last name');
      return;
    }

    try {
      await updateSettings({
        ...settings,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: loginEmail,
      });
      await refresh();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    } catch (e) {
      toast.error(language === 'tr' ? 'Bilgiler kaydedilirken hata oluştu' : 'Failed to save information');
    }
  };

  const performLogin = async (email: string) => {
    try {
      if (!email.trim()) {
        toast.warning(language === 'tr' ? 'Lütfen e-posta adresini gir' : 'Please enter your email address');
        return false;
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (loginEmail && loginEmail !== normalizedEmail) {
        await backupUserData(loginEmail);
      }

      await AsyncStorage.setItem('mesai.user.email.v1', normalizedEmail);
      const restored = await restoreUserData(normalizedEmail);
      await refresh();

      setLoginEmail(normalizedEmail);
      setIsLoggedIn(true);

      const msg = restored
        ? `${normalizedEmail} ile bağlandınız. Verileriniz geri yüklendi.`
        : `${normalizedEmail} ile bağlandınız.`;
      const msgEn = restored
        ? `Logged in with ${normalizedEmail}. Your data has been restored.`
        : `Logged in with ${normalizedEmail}.`;

      toast.success(language === 'tr' ? msg : msgEn);
      return true;
    } catch (e) {
      console.error('Login error', e);
      toast.error(language === 'tr' ? 'Giriş sırasında hata oluştu' : 'Login failed');
      return false;
    }
  };

  const handleEmailLogin = async () => {
    setIsAuthenticating(true);
    await performLogin(loginEmail);
    setIsAuthenticating(false);
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    await performLogin(loginEmail);
    setIsAuthenticating(false);
  };

  const handleLogout = () => {
    Alert.alert(
      language === 'tr' ? 'Oturumdan Çık' : 'Sign Out',
      language === 'tr'
        ? 'Oturumunuzu kapatacaksınız. Verileriniz yedeklenir ve uygulama sıfırlanır. Tekrar giriş yaptığınızda verileriniz geri gelir.'
        : 'You will sign out. Your data will be backed up and the app will reset. When you sign back in, your data will be restored.',
      [
        {
          text: language === 'tr' ? 'İptal' : 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: language === 'tr' ? 'Evet, Çık' : 'Yes, Sign Out',
          onPress: async () => {
            try {
              // Call logout from AppContext (backs up data, removes email, resets app)
              // Root layout will automatically show login screen when email is removed
              await logout();

              toast.success(language === 'tr' ? 'Oturumdan çıktınız. Verileriniz yedeklendi.' : 'You have signed out. Your data has been backed up.');
            } catch (e) {
              toast.error(language === 'tr' ? 'Oturumdan çıkışta hata oluştu' : 'Sign out failed');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      language === 'tr' ? 'Tüm Verileri Sil' : 'Delete All Data',
      language === 'tr'
        ? 'Uygulamadaki tüm girilen veriler (girişler ve ayarlar) silinecektir. Bu işlem geri alınamaz. Emin misiniz?'
        : 'All data in the app (entries and settings) will be deleted. This action cannot be undone. Are you sure?',
      [
        {
          text: language === 'tr' ? 'İptal' : 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: language === 'tr' ? 'Evet, Sil' : 'Yes, Delete',
          onPress: async () => {
            setIsResetting(true);
            try {
              await resetAll();
              await refresh();
              toast.success(language === 'tr' ? 'Tüm veriler silindi.' : 'All data has been deleted.');
            } catch (e) {
              toast.error(language === 'tr' ? 'Veriler silinirken hata oluştu' : 'Failed to delete data');
            } finally {
              setIsResetting(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {!isLoggedIn ? (
            <>
              <View style={styles.headerSection}>
                <Text style={styles.emoji}>🔑</Text>
                <Text style={styles.pageTitle}>{language === 'tr' ? 'Giriş Yap' : 'Sign In'}</Text>
                <Text style={styles.subtitle}>
                  {language === 'tr' ? 'E-posta ile hesabınıza bağlanın' : 'Connect to your account with email'}
                </Text>
              </View>

              <View style={styles.formSection}>
                <View style={styles.card}>
                  <Text style={styles.label}>{language === 'tr' ? 'E-posta Adresi' : 'Email Address'}</Text>
                  <TextInput
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    placeholder="user@example.com"
                    placeholderTextColor={colors.textDim}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isAuthenticating}
                  />
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <Pressable
                  onPress={handleEmailLogin}
                  disabled={isAuthenticating}
                  style={({ pressed }) => [{ opacity: pressed || isAuthenticating ? 0.8 : 1, flex: 1 }]}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.button}
                  >
                    {isAuthenticating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="mail" size={20} color="#fff" />
                        <Text style={styles.buttonText}>
                          {language === 'tr' ? 'E-mail ile Bağlan' : 'Sign In with Email'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <Text style={{ color: colors.textMuted, marginHorizontal: spacing.md, fontSize: 12 }}>
                  {language === 'tr' ? 'VEYA' : 'OR'}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>

              <Pressable
                onPress={handleGoogleLogin}
                disabled={isAuthenticating}
                style={({ pressed }) => [{ opacity: pressed || isAuthenticating ? 0.8 : 1 }]}
              >
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {isAuthenticating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="mail" size={20} color="#fff" />
                      <Text style={styles.buttonText}>
                        {language === 'tr' ? 'E-posta ile Bağlan' : 'Sign In with Email'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.xl, textAlign: 'center' }}>
                {language === 'tr'
                  ? 'E-posta adresinizle oturum açarak verilerinizi senkronize edin. Farklı bir cihazdan aynı emaille giriş yapabilirsiniz.'
                  : 'Sign in with your email to sync your data. You can sign in from different devices using the same email.'}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.headerSection}>
                <Text style={styles.emoji}>👤</Text>
                <Text style={styles.pageTitle}>{t(language, 'edit_profile')}</Text>
                <Text style={styles.subtitle}>{loginEmail}</Text>
              </View>

              <View style={styles.formSection}>
                <View style={styles.card}>
                  <Text style={styles.label}>{t(language, 'first_name')}</Text>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder={language === 'tr' ? 'Adınız' : 'Your first name'}
                    placeholderTextColor={colors.textDim}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.card}>
                  <Text style={styles.label}>{t(language, 'last_name')}</Text>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder={language === 'tr' ? 'Soyadınız' : 'Your last name'}
                    placeholderTextColor={colors.textDim}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <Pressable
                  onPress={handleSave}
                  disabled={isResetting}
                  style={({ pressed }) => [{ opacity: pressed || isResetting ? 0.8 : 1, flex: 1 }]}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>
                      {savedFlash ? (language === 'tr' ? 'Kaydedildi' : 'Saved') : t(language, 'save')}
                    </Text>
                    <Ionicons name={savedFlash ? 'checkmark' : 'save'} size={20} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={{ marginTop: spacing.xl * 2, paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Pressable onPress={handleLogout} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <LinearGradient
                    colors={['#f97316', '#ea580c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.button}
                  >
                    <Ionicons name="log-out" size={20} color="#fff" />
                    <Text style={styles.buttonText}>
                      {language === 'tr' ? 'Oturumdan Çık' : 'Sign Out'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={{ marginTop: spacing.xl * 2, paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md }}>
                  {language === 'tr' ? 'Tehlikeli Bölüm' : 'Danger Zone'}
                </Text>
                <Pressable onPress={handleReset} disabled={isResetting} style={({ pressed }) => [{ opacity: pressed || isResetting ? 0.7 : 1 }]}>
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>
                      {isResetting ? (language === 'tr' ? 'Siliniyor...' : 'Deleting...') : language === 'tr' ? 'Sıfırla' : 'Reset All Data'}
                    </Text>
                    <Ionicons name={isResetting ? 'hourglass' : 'trash-bin'} size={20} color="#fff" />
                  </LinearGradient>
                </Pressable>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.md, textAlign: 'center' }}>
                  {language === 'tr'
                    ? 'Uygulamadaki tüm verileri siler. Bu işlem geri alınamaz.'
                    : 'Deletes all data in the app. This action cannot be undone.'}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(colors: typeof import('../../../src/theme').darkColors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: spacing.lg,
      paddingBottom: spacing.xl * 2,
      justifyContent: 'space-between',
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
      marginTop: spacing.lg,
    },
    emoji: {
      fontSize: 64,
      marginBottom: spacing.md,
    },
    pageTitle: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
      marginBottom: spacing.sm,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: '500',
      textAlign: 'center',
    },
    formSection: {
      gap: spacing.md,
      flex: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    input: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      paddingVertical: spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: colors.border,
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
  });
}
