import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import { useRouter, useNavigation } from 'expo-router';
import { useApp } from '../../../src/context/AppContext';
import { useToast } from '../../../src/context/ToastContext';
import { getColors, radius, spacing } from '../../../src/theme';
import { t } from '../../../src/utils/i18n';

export default function FeedbackScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const { theme, language, settings } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const [feedback, setFeedback] = useState('');
  const [isSending, setIsSending] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(language, 'feedback'),
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

  const handleSendFeedback = async () => {
    if (!feedback.trim()) {
      toast.warning(t(language, 'feedback_placeholder'));
      return;
    }

    setIsSending(true);
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        toast.error(language === 'tr' ? 'E-posta uygulaması yüklü değil' : 'Email app not available');
        return;
      }

      await MailComposer.composeAsync({
        recipients: ['support@mesaiplus.app'],
        subject: language === 'tr' ? 'Mesai+ Geri Bildirimi' : 'Mesai+ Feedback',
        body: `${feedback}\n\n---\n${settings?.firstName ?? 'User'} (${settings?.email ?? 'no-email'})`,
      });

      toast.success(t(language, 'feedback_sent'));
      setFeedback('');
    } catch (e) {
      toast.error(t(language, 'feedback_error'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>{t(language, 'feedback_title')}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Description */}
          <Text style={styles.description}>{t(language, 'feedback_description')}</Text>

          {/* Feedback Input */}
          <View style={styles.card}>
            <TextInput
              value={feedback}
              onChangeText={setFeedback}
              placeholder={t(language, 'feedback_placeholder')}
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={10}
              style={styles.input}
              editable={!isSending}
              textAlignVertical="top"
            />
          </View>

          {/* Character Count */}
          <Text style={styles.charCount}>
            {feedback.length} {language === 'tr' ? 'karakter' : 'characters'}
          </Text>

          {/* Send Button */}
          <Pressable
            onPress={handleSendFeedback}
            disabled={isSending || !feedback.trim()}
            style={({ pressed }) => [{ opacity: pressed || isSending ? 0.8 : 1 }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.button, (!feedback.trim() || isSending) && styles.buttonDisabled]}
            >
              <Ionicons name="send" color="#fff" size={18} />
              <Text style={styles.buttonText}>
                {isSending ? t(language, 'sending_report') : t(language, 'send_feedback')}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(colors: typeof import('../../../src/theme').darkColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xl * 2,
      gap: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    backButton: {
      padding: spacing.sm,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      flex: 1,
      textAlign: 'center',
    },
    description: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    input: {
      color: colors.text,
      fontSize: 14,
      minHeight: 200,
    },
    charCount: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'right',
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      marginTop: spacing.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
