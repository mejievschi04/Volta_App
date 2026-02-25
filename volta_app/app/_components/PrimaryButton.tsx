import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../_context/ThemeContext';
import { getColors } from './theme';

export type PrimaryButtonVariant = 'gradient' | 'solid';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: PrimaryButtonVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  icon,
  variant = 'gradient',
  style,
  textStyle,
}: PrimaryButtonProps) {
  const { theme } = React.useContext(ThemeContext);
  const colors = getColors(theme);
  const primaryColor = colors.primaryButton;

  const content = (
    <>
      {icon && <Ionicons name={icon} size={20} color="#000" style={styles.icon} />}
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </>
  );

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        style={[styles.wrapper, style, disabled && styles.disabled]}
        accessibilityLabel={title}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[primaryColor, primaryColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.solidButton,
        { backgroundColor: primaryColor },
        style,
        disabled && styles.disabled,
      ]}
      accessibilityLabel={title}
      accessibilityRole="button"
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderRadius: 0,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 10,
  },
  solidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 12,
  },
  icon: {
    marginRight: 0,
  },
  text: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});
