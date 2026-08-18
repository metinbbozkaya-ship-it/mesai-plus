import React, { useEffect, useRef, useState } from 'react';
import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider, useApp } from '../src/context/AppContext';
import { ProProvider } from '../src/context/ProContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { getPaperTheme, getColors } from '../src/theme';
import { ONBOARDING_KEY } from '../src/storage/db';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { widgetTaskHandler } = require('../src/widgets/widgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (e) {
    console.warn('[widget] register failed', e);
  }
}

function RootLayoutContent() {
  const { theme, ready } = useApp();
  const colors = getColors(theme);
  const paperTheme = getPaperTheme(theme);
  const segments = useSegments();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const visitedOnboarding = useRef(false);

  // Track if user has ever been on onboarding screen
  useEffect(() => {
    if (segments[0] === 'onboarding') {
      visitedOnboarding.current = true;
    }
  }, [segments[0]]);

  // Read onboarding flag once on mount
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingDone(v === 'true');
      } catch {
        setOnboardingDone(true);
      }
    })();
  }, []);

  if (!ready || onboardingDone === null) {
    return (
      <PaperProvider theme={paperTheme}>
        <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </PaperProvider>
    );
  }

  // Only redirect to onboarding if:
  // 1. onboardingDone is false (AsyncStorage says not done)
  // 2. We're not already on onboarding
  // 3. User hasn't already visited onboarding this session (prevents the double-show bug)
  const shouldRedirectToOnboarding =
    !onboardingDone && segments[0] !== 'onboarding' && !visitedOnboarding.current;

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {shouldRedirectToOnboarding && <Redirect href="/onboarding" />}
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'slide_from_right',
          animationDuration: 260,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="upgrade"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <ProProvider>
            <ToastProvider>
              <RootLayoutContent />
            </ToastProvider>
          </ProProvider>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}