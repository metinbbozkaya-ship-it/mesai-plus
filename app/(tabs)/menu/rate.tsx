import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
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

export default function RateScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const { theme, language } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const [rating, setRating] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(language, 'rate_app'),
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

  const handleRate = async () => {
    if (rating === 0) {
      toast.warning(language === 'tr' ? 'Lütfen bir yıldız seçiniz' : 'Please select a rating');
      return;
    }

    try {
      // Resolve the actual installed package/bundle id at runtime so the link
      // always points at the correct Play/App Store listing.
      const pkg = Application.applicationId || 'com.abacusai.mesaitracker.t1777149488';

      let primary = '';
      let fallback = '';
      let storeName = 'Play Store';

      if (Platform.OS === 'android') {
        primary = `market://details?id=${pkg}`;
        fallback = `https://play.google.com/store/apps/details?id=${pkg}`;
        storeName = 'Play Store';
      } else if (Platform.OS === 'ios') {
        // Mesai+ App Store ID — replace once Apple assigns the final numeric ID.
        const APPSTORE_ID = '0000000000';
        primary = `itms-apps://itunes.apple.com/app/id${APPSTORE_ID}?action=write-review`;
        fallback = `https://apps.apple.com/app/id${APPSTORE_ID}`;
        storeName = 'App Store';
      } else {
        primary = `https://play.google.com/store/apps/details?id=${pkg}`;
        fallback = primary;
      }

      try {
        const can = await Linking.canOpenURL(primary);
        if (can) {
          await Linking.openURL(primary);
          return;
        }
      } catch {}

      // Fall back to web URL
      await Linking.openURL(fallback);
    } catch (error) {
      toast.error(language === 'tr' ? 'Mağaza açılamadı' : 'Could not open the store');
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
          <Text style={styles.title}>{t(language, 'rate_title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Star Emoji */}
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>⭐</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{t(language, 'rate_app_description')}</Text>

        {/* Rating Card */}
        <View style={styles.card}>
          <Text style={styles.ratingLabel}>{t(language, 'rating')}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Text style={styles.star}>{star <= rating ? '⭐' : '☆'}</Text>
              </Pressable>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingText}>
              {rating} {t(language, 'stars')}
            </Text>
          )}
        </View>

        {/* Message based on rating */}
        {rating > 0 && (
          <View style={styles.messageCard}>
            {rating >= 4 ? (
              <>
                <Ionicons name="heart" size={32} color={colors.danger} style={styles.messageIcon} />
                <Text style={styles.messageTitle}>
                  {language === 'tr' ? 'Harika!' : 'Awesome!'}
                </Text>
                <Text style={styles.messageText}>
                  {language === 'tr'
                    ? 'Mesai+\'ye verdiğiniz yüksek puan için teşekkürler!'
                    : 'Thank you for rating Mesai+ highly!'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="bulb" size={32} color={colors.accent} style={styles.messageIcon} />
                <Text style={styles.messageTitle}>
                  {language === 'tr' ? 'Önem Veriyoruz!' : 'We Care!'}
                </Text>
                <Text style={styles.messageText}>
                  {language === 'tr'
                    ? 'Geri bildiriminiz bize çok yardımcı olur. Lütfen önerilerinizi de gönderiniz.'
                    : 'Your feedback is valuable. Please share your suggestions.'}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Rate Button */}
        <Pressable
          onPress={handleRate}
          disabled={rating === 0}
          style={({ pressed }) => [{ opacity: pressed || rating === 0 ? 0.8 : 1 }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.button, rating === 0 && styles.buttonDisabled]}
          >
            <Ionicons name="star" color="#fff" size={18} />
            <Text style={styles.buttonText}>
              {language === 'tr' ? 'Değerlendir' : 'Rate Now'}
            </Text>
          </LinearGradient>
        </Pressable>
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
    emojiContainer: {
      alignItems: 'center',
      marginVertical: spacing.lg,
    },
    emoji: {
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
      padding: spacing.lg,
      alignItems: 'center',
    },
    ratingLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    starsContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      marginVertical: spacing.lg,
    },
    starButton: {
      padding: spacing.sm,
    },
    star: {
      fontSize: 32,
    },
    ratingText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '700',
      marginTop: spacing.md,
    },
    messageCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      alignItems: 'center',
    },
    messageIcon: {
      marginBottom: spacing.md,
    },
    messageTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    messageText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
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
