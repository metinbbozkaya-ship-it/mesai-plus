import React, { useLayoutEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../src/context/AppContext';
import { usePro } from '../../../src/context/ProContext';
import { getColors, radius, spacing } from '../../../src/theme';
import {
  generateResponse,
  getSuggestedQuestions,
  ChatMessage,
} from '../../../src/utils/taxAdvisor';

export default function TaxAdvisorScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const { theme, language, settings } = useApp();
  const { isPro } = usePro();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const isTr = language === 'tr';

  const scrollRef = useRef<ScrollView | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const name = settings?.firstName?.trim();
    const greeting = name
      ? `👋 Merhaba ${name}! Ben Mesai+ AI Vergi Danışmanı.`
      : '👋 Merhaba! Ben Mesai+ AI Vergi Danışmanı.';
    return [{
      id: 'welcome',
      role: 'bot',
      timestamp: Date.now(),
      content: `${greeting}\n\nSGK, gelir vergisi, fazla mesai, kıdem tazminatı, işsizlik maaşı gibi konularda sorularını yanıtlayabilirim.\n\n⚠️ *Not: Verdiğim bilgiler genel bilgilendirme amaçlıdır; kesin durumlar için mali müşavir/muhasebeci ile görüşün.*`,
      suggestions: getSuggestedQuestions(4),
    }];
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isTr ? 'AI Vergi Danışmanı' : 'AI Tax Advisor',
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors, isTr]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    scrollToBottom();

    // Simulate thinking delay
    setTimeout(() => {
      const { content, suggestions } = generateResponse(trimmed);
      const botMsg: ChatMessage = {
        id: `b_${Date.now()}`,
        role: 'bot',
        content,
        timestamp: Date.now(),
        suggestions,
      };
      setMessages(prev => [...prev, botMsg]);
      scrollToBottom();
    }, 350);
  }, [scrollToBottom]);

  if (!isPro) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={[colors.bg, colors.bg2]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.gateWrap}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.gateIcon}
          >
            <Ionicons name="chatbubbles" size={44} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.gateTitle}>
            {isTr ? '🤖 AI Vergi Danışmanı' : '🤖 AI Tax Advisor'}
          </Text>
          <Text style={styles.gateSubtitle}>
            {isTr
              ? 'SGK, gelir vergisi, kıdem tazminatı ve daha fazlası hakkında AI danışmanınıza istediğiniz zaman sorabilirsiniz.'
              : 'Ask your AI advisor anything about tax, social security, severance, and more.'}
          </Text>
          <View style={styles.gateFeatures}>
            {[
              isTr ? '✅ 20+ konu bilgi tabanı' : '✅ 20+ topic knowledge base',
              isTr ? '✅ Türkçe vergi ve SGK bilgisi' : '✅ Turkish tax & SGK knowledge',
              isTr ? '✅ Öneriler ve hızlı sorular' : '✅ Suggestions & quick questions',
            ].map(f => (
              <Text key={f} style={styles.gateFeature}>{f}</Text>
            ))}
          </View>
          <Pressable onPress={() => router.push('/upgrade')}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.gateBtn}
            >
              <Ionicons name="star" size={18} color="#FFFFFF" />
              <Text style={styles.gateBtnText}>
                {isTr ? 'Pro’ya Yükselt' : 'Upgrade to Pro'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient colors={[colors.bg, colors.bg2]} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.lg }}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map(msg => (
            <View key={msg.id}>
              {msg.role === 'bot' ? (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <LinearGradient
                    colors={[colors.primary, colors.accent]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={styles.botBubble}>
                      <Text style={styles.botText}>{msg.content}</Text>
                    </View>
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <View style={{ gap: 6 }}>
                        {msg.suggestions.map(s => (
                          <Pressable
                            key={s}
                            onPress={() => send(s)}
                            style={styles.suggestion}
                          >
                            <Ionicons name="arrow-forward-circle" size={14} color={colors.accent} />
                            <Text style={styles.suggestionText}>{s}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View style={{ alignItems: 'flex-end' }}>
                  <LinearGradient
                    colors={[colors.accent, colors.primary]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.userBubble}
                  >
                    <Text style={styles.userText}>{msg.content}</Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={isTr ? 'Vergi/SGK sorunuzu yazın...' : 'Ask your tax question...'}
            placeholderTextColor={colors.textDim}
            style={styles.input}
            multiline
            maxLength={300}
            onSubmitEditing={() => send(input)}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim()}
            style={{ opacity: input.trim() ? 1 : 0.5 }}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.sendBtn}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    avatar: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
      marginTop: 2,
    },
    botBubble: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderTopLeftRadius: 4,
      padding: 12,
    },
    botText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
    },
    userBubble: {
      maxWidth: '85%',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.lg,
      borderBottomRightRadius: 4,
    },
    userText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '500',
    },
    suggestion: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.accent + '55',
      borderRadius: radius.md,
      paddingVertical: 8,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    suggestionText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      padding: spacing.md,
      backgroundColor: colors.bg2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      maxHeight: 100,
    },
    sendBtn: {
      width: 42, height: 42, borderRadius: 21,
      alignItems: 'center', justifyContent: 'center',
    },
    gateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    gateIcon: {
      width: 96, height: 96, borderRadius: 48,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    gateTitle: {
      color: colors.text, fontSize: 24, fontWeight: '800',
    },
    gateSubtitle: {
      color: colors.textMuted, fontSize: 14, textAlign: 'center',
      lineHeight: 20, maxWidth: 320,
    },
    gateFeatures: {
      gap: 8, marginVertical: spacing.md,
    },
    gateFeature: {
      color: colors.text, fontSize: 13, fontWeight: '500',
    },
    gateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: radius.full,
    },
    gateBtnText: {
      color: '#FFFFFF', fontSize: 15, fontWeight: '700',
    },
  });
