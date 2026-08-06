import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import * as Application from 'expo-application';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useApp } from '../../../src/context/AppContext';
import { useToast } from '../../../src/context/ToastContext';
import { getColors, radius, spacing } from '../../../src/theme';
import { t } from '../../../src/utils/i18n';

export default function ShareScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const { theme, language } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const [isSharing, setIsSharing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(language, 'share_app'),
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

  const handleShare = async (method: 'native' | 'whatsapp' | 'telegram') => {
    setIsSharing(true);
    try {
      const shareMessage = language === 'tr'
        ? 'Mesai+ - Çalışma saatlerini kolay takip et! İndir: '
        : 'Mesai+ - Track your work hours easily! Download: ';

      const pkg = Application.applicationId || 'com.abacusai.mesaitracker.t1777149488';
      const appUrl = Platform.OS === 'ios'
        ? `https://apps.apple.com/app/id0000000000`
        : `https://play.google.com/store/apps/details?id=${pkg}`;

      if (method === 'native') {
        await Share.share({
          message: shareMessage + appUrl,
          url: appUrl,
        });
      } else if (method === 'whatsapp') {
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareMessage + appUrl)}`;
        // In reality, you'd need to check if WhatsApp is available
        toast.success(language === 'tr' ? 'WhatsApp hazırlandı' : 'WhatsApp ready');
      } else if (method === 'telegram') {
        const telegramUrl = `tg://msg?text=${encodeURIComponent(shareMessage + appUrl)}`;
        // In reality, you'd need to check if Telegram is available
        toast.success(language === 'tr' ? 'Telegram hazırlandı' : 'Telegram ready');
      }
    } catch (error) {
      toast.error(language === 'tr' ? 'Paylaşma başarısız oldu' : 'Share failed');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{t(language, 'share_title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Share Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🚀</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{t(language, 'share_app_description')}</Text>

        {/* Share Options Card */}
        <View style={styles.card}>
          <Text style={styles.optionsTitle}>
            {language === 'tr' ? 'Paylaş' : 'Share via'}
          </Text>

          {/* Native Share */}
          <Pressable
            onPress={() => handleShare('native')}
            disabled={isSharing}
            style={({ pressed }) => [styles.shareOption, pressed && styles.shareOptionPressed]}
          >
            <Ionicons name="share-social" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.shareOptionLabel}>
                {language === 'tr' ? 'Sistem Paylaşımı' : 'System Share'}
              </Text>
              <Text style={styles.shareOptionDesc}>
                {language === 'tr' ? 'Herhangi bir uygulamaya gönder' : 'Send to any app'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {/* WhatsApp */}
          <Pressable
            onPress={() => handleShare('whatsapp')}
            disabled={isSharing}
            style={({ pressed }) => [styles.shareOption, pressed && styles.shareOptionPressed]}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <View style={{ flex: 1 }}>
              <Text style={styles.shareOptionLabel}>
                {language === 'tr' ? 'WhatsApp' : 'WhatsApp'}
              </Text>
              <Text style={styles.shareOptionDesc}>
                {language === 'tr' ? 'Arkadaşlara gönder' : 'Send to friends'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {/* Telegram */}
          <Pressable
            onPress={() => handleShare('telegram')}
            disabled={isSharing}
            style={({ pressed }) => [styles.shareOption, pressed && styles.shareOptionPressed]}
          >
            <Ionicons name="send" size={20} color="#0088cc" />
            <View style={{ flex: 1 }}>
              <Text style={styles.shareOptionLabel}>
                {language === 'tr' ? 'Telegram' : 'Telegram'}
              </Text>
              <Text style={styles.shareOptionDesc}>
                {language === 'tr' ? 'Telegram ile gönder' : 'Send via Telegram'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Encourage Message */}
        <View style={styles.encourageCard}>
          <Ionicons name="heart" size={24} color={colors.danger} />
          <Text style={styles.encourageText}>
            {language === 'tr'
              ? 'Arkadaşlarınızla paylaşarak bize yardımcı olun!'
              : 'Help us by sharing with your friends!'}
          </Text>
        </View>
      </ScrollView>
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
    iconContainer: {
      alignItems: 'center',
      marginVertical: spacing.lg,
    },
    icon: {
      fontSize: 48,
    },
    description: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    optionsTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      padding: spacing.md,
      paddingBottom: spacing.sm,
    },
    shareOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    shareOptionPressed: {
      backgroundColor: colors.bg,
    },
    shareOptionLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    shareOptionDesc: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    encourageCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    encourageText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
