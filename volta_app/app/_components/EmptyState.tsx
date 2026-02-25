import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../_context/ThemeContext';
import { getColors } from './theme';
import Typography from './Typography';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  style?: ViewStyle;
  iconSize?: number;
}

export default function EmptyState({
  icon = 'folder-open-outline',
  title,
  description,
  style,
  iconSize = 64,
}: EmptyStateProps) {
  const { theme } = React.useContext(ThemeContext);
  const colors = getColors(theme);

  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={iconSize} color={colors.textMuted} />
      <Typography variant="H4" color={colors.textMuted} style={styles.title}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="Caption" color={colors.textMuted} style={styles.description}>
          {description}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  title: {
    marginTop: 16,
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    textAlign: 'center',
  },
});
