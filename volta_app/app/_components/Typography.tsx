import React from 'react';
import { Text, TextProps } from 'react-native';
import { ThemeContext } from '../_context/ThemeContext';
import { getColors } from './theme';
import { textVariants, type TextVariant } from './theme';

interface TypographyProps extends TextProps {
  variant?: TextVariant;
  /** Override text color; default from theme (text or textMuted for Caption) */
  color?: string;
  children: React.ReactNode;
}

export default function Typography({
  variant = 'Body',
  color,
  style,
  children,
  ...rest
}: TypographyProps) {
  const { theme } = React.useContext(ThemeContext);
  const colors = getColors(theme);
  const variantStyle = textVariants[variant];
  const defaultColor =
    variant === 'Caption' || variant === 'CaptionStrong' ? colors.textMuted : colors.text;
  return (
    <Text
      style={[
        variantStyle,
        { color: color ?? defaultColor },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
