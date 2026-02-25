import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../_context/ThemeContext';
import { getColors, spacing } from './theme';

type ApiErrorViewProps = {
  message?: string;
  onRetry: () => void;
  /** Compact banner style (inline) or full block (default) */
  variant?: 'banner' | 'block';
};

const DEFAULT_MESSAGE = 'Nu s-au putut încărca datele. Verifică conexiunea la internet.';

export default function ApiErrorView({ message, onRetry, variant = 'block' }: ApiErrorViewProps) {
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const text = message || DEFAULT_MESSAGE;

  if (variant === 'banner') {
    return (
      <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="cloud-offline-outline" size={20} color={colors.textMuted} />
        <Text style={[styles.bannerText, { color: colors.text }]} numberOfLines={2}>{text}</Text>
        <TouchableOpacity
          onPress={onRetry}
          style={[styles.retryButtonBanner, { backgroundColor: colors.primaryButton }]}
          activeOpacity={0.85}
          accessibilityLabel="Încearcă din nou"
          accessibilityRole="button"
          accessibilityHint="Reîncarcă conținutul"
        >
          <Text style={styles.retryButtonText}>Încearcă din nou</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
      </View>
      <Text style={[styles.blockTitle, { color: colors.text }]}>Eroare la încărcare</Text>
      <Text style={[styles.blockMessage, { color: colors.textMuted }]}>{text}</Text>
      <TouchableOpacity
        onPress={onRetry}
        style={[styles.retryButton, { backgroundColor: colors.primaryButton }]}
        activeOpacity={0.85}
        accessibilityLabel="Încearcă din nou"
        accessibilityRole="button"
        accessibilityHint="Reîncarcă conținutul"
      >
        <Ionicons name="refresh" size={18} color="#000" />
        <Text style={styles.retryButtonText}>Încearcă din nou</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
  },
  retryButtonBanner: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  block: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xl,
    padding: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  blockTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  blockMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
});
