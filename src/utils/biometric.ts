import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as secureStorage from './secureStorage';

export const BIOMETRIC_KEY = 'mesai.biometric.enabled.v1';

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    if (!hasHw) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const v = await secureStorage.getItem(BIOMETRIC_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    await secureStorage.setItem(BIOMETRIC_KEY, enabled ? 'true' : 'false');
  } catch {}
}

export async function authenticate(reason: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'İptal',
      disableDeviceFallback: false,
      fallbackLabel: 'Şifre Kullan',
    });
    return !!res.success;
  } catch {
    return false;
  }
}

export async function getBiometricTypeLabel(language: 'tr' | 'en'): Promise<string> {
  if (Platform.OS === 'web') return '';
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : (language === 'tr' ? 'Yüz Tanıma' : 'Face Recognition');
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : (language === 'tr' ? 'Parmak İzi' : 'Fingerprint');
    }
    return language === 'tr' ? 'Biyometrik' : 'Biometric';
  } catch {
    return language === 'tr' ? 'Biyometrik' : 'Biometric';
  }
}
