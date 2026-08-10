import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

function warn(...args: unknown[]) {
  if (__DEV__) console.warn('[secureStorage]', ...args);
}

/**
 * Reads `key` from SecureStore. If it's not there yet, checks the legacy
 * AsyncStorage value under the same key name and migrates it in place:
 * write to SecureStore, read back to verify, and only then remove the
 * legacy AsyncStorage entry. On any error the legacy value is left untouched,
 * so the migration can safely retry on a later call.
 */
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      warn('getItem (web) failed', key, e);
      return null;
    }
  }

  let secureValue: string | null = null;
  try {
    secureValue = await SecureStore.getItemAsync(key);
  } catch (e) {
    warn('SecureStore getItem failed', key, e);
    return null;
  }
  if (secureValue !== null) return secureValue;

  try {
    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue === null) return null;

    await SecureStore.setItemAsync(key, legacyValue);
    const verify = await SecureStore.getItemAsync(key);
    if (verify === legacyValue) {
      await AsyncStorage.removeItem(key);
    } else {
      warn('SecureStore verification mismatch during migration, keeping legacy value', key);
    }
    return legacyValue;
  } catch (e) {
    warn('Legacy AsyncStorage migration failed, keeping legacy value', key, e);
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    warn('setItem failed', key, e);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
    // Clean up a leftover legacy copy too, if migration never ran for this key.
    await AsyncStorage.removeItem(key);
  } catch (e) {
    warn('removeItem failed', key, e);
  }
}
