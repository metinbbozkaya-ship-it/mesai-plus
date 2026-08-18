import React, { useRef, useState, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../src/context/AppContext';
import { usePro } from '../../../src/context/ProContext';
import { getColors, radius, spacing } from '../../../src/theme';
import { ProGate } from '../../../src/components/ProGate';
import {
  generateResponse,
  getSuggestedQuestions,
  ChatMessage,
} from '../../../src/utils/taxAdvisor';

export default function TaxAdvisorScreen() {
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

  // Pure render helper — shared by the welcome card and regular bot messages.
  // Reads msg.suggestions as-is; never touches message state/AI logic.
  const renderSuggestions = (suggestions?: string[]) => {
    if (!suggestions || suggestions.length === 0) return null;
    return (
      <View style={{ marginTop: spacing.xs, gap: 8 }}>
        <Text style={styles.suggestLabel}>{isTr ? 'Önerilen Sorular' : 'Suggested Questions'}</Text>
        {suggestions.map(s => (
          <Pressable key={s} onPress={() => send(s)} style={styles.suggestion}>
            <View style={styles.suggestionIconWrap}>
              <Ionicons name="sparkles-outline" size={12} color={colors.accent} />
            </View>
            <Text style={styles.suggestionText} numberOfLines={2}>{s}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    );
  };

  if (!isPro) {
    return (
      <ProGate
        icon="chatbubbles"
        title={isTr ? '🤖 AI Vergi Danışmanı' : '🤖 AI Tax Advisor'}
        subtitle={isTr
          ? 'SGK, gelir vergisi, kıdem tazminatı ve daha fazlası hakkında AI danışmanınıza istediğiniz zaman sorabilirsiniz.'
          : 'Ask your AI advisor anything about tax, social security, severance, and more.'}
        features={[
          isTr ? '✅ 20+ konu bilgi tabanı' : '✅ 20+ topic knowledge base',
          isTr ? '✅ Türkçe vergi ve SGK bilgisi' : '✅ Turkish tax & SGK knowledge',
          isTr ? '✅ Öneriler ve hızlı sorular' : '✅ Suggestions & quick questions',
        ]}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient colors={[colors.bg, colors.bg2]} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.headerIcon}
        >
          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{isTr ? 'AI Vergi Danışmanı' : 'AI Tax Advisor'}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{isTr ? 'Sorularını yapay zekâ ile yanıtla' : 'AI-powered assistant'}</Text>
        </View>
      </View>

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
          {messages.map(msg => {
            if (msg.id === 'welcome') {
              // Render-only split for typography (disclaimer de-emphasized) —
              // msg.content itself is untouched, this only affects layout.
              const marker = '\n\n⚠️';
              const idx = msg.content.indexOf(marker);
              const mainText = idx >= 0 ? msg.content.slice(0, idx) : msg.content;
              const disclaimerText = idx >= 0 ? msg.content.slice(idx + 2) : null;
              return (
                <View key={msg.id} style={styles.welcomeCard}>
                  <LinearGradient
                    colors={[colors.primary, colors.accent]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.welcomeAvatar}
                  >
                    <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.welcomeText}>{mainText}</Text>
                  {disclaimerText ? <Text style={styles.welcomeDisclaimer}>{disclaimerText}</Text> : null}
                  {renderSuggestions(msg.suggestions)}
                </View>
              );
            }
            return (
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
                      {renderSuggestions(msg.suggestions)}
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
            );
          })}
        </ScrollView>

        <View style={styles.inputBar}>
          <View style={styles.composer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={isTr ? 'Vergi/SGK sorunuzu yazın...' : 'Ask your tax question...'}
              placeholderTextColor={colors.textMuted}
              style={styles.composerInput}
              multiline
              maxLength={300}
              onSubmitEditing={() => send(input)}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={() => send(input)}
              disabled={!input.trim()}
              hitSlop={8}
              style={{ opacity: input.trim() ? 1 : 0.5 }}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.sendBtn}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerIcon: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
    headerSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
    welcomeCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    welcomeAvatar: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    welcomeText: { color: colors.text, fontSize: 14, lineHeight: 21 },
    welcomeDisclaimer: {
      color: colors.textMuted, fontSize: 11, lineHeight: 16,
      marginTop: spacing.sm, fontStyle: 'italic',
    },
    suggestLabel: {
      color: colors.textMuted, fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
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
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    suggestionIconWrap: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: colors.accent + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    suggestionText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    inputBar: {
      padding: spacing.md,
      backgroundColor: colors.bg2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingLeft: 14,
      paddingRight: 6,
      paddingVertical: 6,
    },
    composerInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      maxHeight: 100,
      paddingVertical: 8,
    },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
  });
