import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../_context/ThemeContext';
import { CartContext } from '../_context/CartContext';
import { getColors } from './theme';

const BOTTOM_MENU_HEIGHT = 80;

export default function FloatingCartButton() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);
  const { count } = useContext(CartContext);
  const colors = getColors(theme);

  if (count <= 0) return null;
  if (pathname === '/Cos' || pathname === '/Checkout') return null;

  const bottom = Math.max(insets.bottom, 8) + BOTTOM_MENU_HEIGHT + 12;

  return (
    <TouchableOpacity
      style={[styles.fab, { bottom, backgroundColor: colors.primaryButton }]}
      onPress={() => router.push('/Cos')}
      activeOpacity={0.9}
      accessibilityLabel="Deschide coșul"
      accessibilityRole="button"
    >
      <Ionicons name="cart" size={26} color="#000" />
      <View style={styles.badge}>
        <Text style={styles.badgeText} numberOfLines={1}>
          {count > 99 ? '99+' : count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFEE00',
    fontSize: 12,
    fontWeight: '800',
  },
});
