import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// End WebBrowser when done (only on native platforms)
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Initialize Google Sign-In
 */
export async function initializeGoogleSignIn(): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await WebBrowser.warmUpAsync();
    }
  } catch (e) {
    console.warn('Google Sign-In init:', e);
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'mesaiplus',
      path: 'oauth',
    });

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
    });

    const discovery = await AuthSession.fetchDiscoveryAsync(
      'https://accounts.google.com'
    );

    const result = await request.promptAsync(discovery);

    if (result.type === 'success' && result.authentication) {
      const idToken = result.authentication.idToken;
      if (idToken) {
        try {
          // Decode JWT to get email
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const decoded = JSON.parse(
              Buffer.from(parts[1], 'base64').toString('utf-8')
            );

            const email = decoded.email?.toLowerCase().trim();
            if (email) {
              await AsyncStorage.setItem('mesai.google.idToken.v1', idToken);
              return email;
            }
          }
        } catch (e) {
          console.error('Token decode error:', e);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Google Sign-In error:', error);
    return null;
  } finally {
    if (Platform.OS !== 'web') {
      await WebBrowser.coolDownAsync();
    }
  }
}

/**
 * Sign out from Google
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await AsyncStorage.removeItem('mesai.google.idToken.v1');
  } catch (e) {
    console.warn('Google sign-out error:', e);
  }
}

/**
 * Check if user is signed in to Google
 */
export async function isGoogleSignedIn(): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem('mesai.google.idToken.v1');
    return !!token;
  } catch (e) {
    return false;
  }
}
