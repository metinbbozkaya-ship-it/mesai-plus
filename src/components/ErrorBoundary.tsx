import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing } from '../theme';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: unknown) { console.error('App error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Bir hata oluştu</Text>
          <Text style={styles.msg}>
            {__DEV__
              ? (this.state.error?.message ?? 'Bilinmeyen hata')
              : 'Beklenmedik bir sorun oluştu. Lütfen uygulamayı yeniden başlatıp tekrar deneyin. Sorun devam ederse bizimle iletişime geçin.'}
          </Text>
          {__DEV__ && !!this.state.error?.stack && <Text style={styles.stack}>{this.state.error.stack}</Text>}
        </ScrollView>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  title: { color: colors.danger, fontSize: 22, fontWeight: '700', marginBottom: spacing.md },
  msg: { color: colors.text, fontSize: 16, marginBottom: spacing.md },
  stack: { color: colors.textMuted, fontSize: 12 },
});
