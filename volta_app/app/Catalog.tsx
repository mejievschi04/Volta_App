import React, { useContext, useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from './_context/ThemeContext';
import { getColors } from './_components/theme';
import Screen from './_components/Screen';
import { useBottomMenuInset } from './_hooks/useBottomMenuInset';
import { useResponsive, responsiveSize } from './_hooks/useResponsive';
import { apiClient } from '../lib/apiClient';
import { MOCK_CATEGORIES } from '../data/catalogMock';

type CategoryItem = { id: string; name: string; slug: string; sort?: number };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[ăâîșț]/g, (m) => ({ ă: 'a', â: 'a', î: 'i', ș: 's', ț: 't' }[m] ?? m))
    .replace(/[^a-z0-9-]/g, '');
}

function normalizeCategory(c: any, index: number): CategoryItem {
  const id = String(c.id ?? c.pk ?? index + 1);
  const name = c.name ?? c.title ?? `Categoria ${id}`;
  const slug = c.slug ?? (slugify(name) || id);
  const sort = typeof c.sort === 'number' ? c.sort : index;
  return { id, name, slug, sort };
}

const ICON_PENTRU_CATEGORIE: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Iluminare': 'bulb-outline',
  'Cablu': 'flash-outline',
  'Întreruptoare, prize și contactoare': 'flash-outline',
  'Panouri evidență și aparate de măsură': 'speedometer-outline',
  'Scule electrice și echipament de sudat': 'construct-outline',
  'Generatoare, compresoare și pompe': 'water-outline',
  'Stabilizatoare, transformatoare și UPS': 'battery-charging-outline',
  'Grădinărit și inventar agricol': 'leaf-outline',
  'Ventilare, climă și instalații sanitare': 'snow-outline',
  'Motoare și utilaj pentru construcții': 'hardware-chip-outline',
  'Scule manuale': 'hammer-outline',
  'Elemente de fixare și consumabile': 'git-branch-outline',
  'Haine și echipament de protecție': 'shield-checkmark-outline',
  'Sisteme de securitate': 'lock-closed-outline',
  'Transport și accesorii auto': 'car-outline',
  'Marfuri și tehnică de uz casnic': 'home-outline',
  'Panouri fotovoltaice și accesorii': 'sunny-outline',
  'Odihnă și camping': 'bed-outline',
};
const DEFAULT_ICON: keyof typeof Ionicons.glyphMap = 'grid-outline';

export default function Catalog() {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const bottomInsetForMenu = useBottomMenuInset();
  const { isSmallScreen, scale } = useResponsive();
  const [categories, setCategories] = useState<CategoryItem[]>(MOCK_CATEGORIES);
  const responsiveStyles = useMemo(() => StyleSheet.create(getStyles(isSmallScreen, scale)), [isSmallScreen, scale]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { data, error } = await apiClient.getShopCategories();
      if (!error && Array.isArray(data) && data.length > 0) {
        const list = data.map((c: any, i: number) => normalizeCategory(c, i));
        list.sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999));
        setCategories(list);
      }
    })();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Screen>
      <View style={[responsiveStyles.container, { backgroundColor: colors.background }]}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            contentContainerStyle={[responsiveStyles.scroll, { paddingBottom: bottomInsetForMenu + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={responsiveStyles.hero}>
              <Text style={[responsiveStyles.heroTitle, { color: colors.text }]}>Catalog</Text>
              <Text style={[responsiveStyles.heroSubtitle, { color: colors.textMuted }]}>
                Alege categoria
              </Text>
            </View>
            <View style={responsiveStyles.cardList}>
              {categories.map((cat, index) => {
                const iconName = ICON_PENTRU_CATEGORIE[cat.name] ?? DEFAULT_ICON;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      responsiveStyles.card,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                        borderColor: colors.border,
                        shadowColor: '#000',
                      },
                    ]}
                    onPress={() => router.push(`/catalog/${cat.slug}`)}
                    activeOpacity={0.85}
                  >
                    <View style={[responsiveStyles.cardIconWrap, { backgroundColor: isDark ? 'rgba(255,238,0,0.15)' : 'rgba(0,0,0,0.06)' }]}>
                      <Ionicons name={iconName} size={24} color={isDark ? colors.primaryButton : colors.textMuted} />
                    </View>
                    <Text style={[responsiveStyles.cardLabel, { color: colors.text }]} numberOfLines={2}>
                      {cat.name}
                    </Text>
                    <View style={[responsiveStyles.cardArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: 80 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Screen>
  );
}

function getStyles(isSmallScreen: boolean, scale: number): {
  container: ViewStyle;
  scroll: ViewStyle;
  hero: ViewStyle;
  heroTitle: TextStyle;
  heroSubtitle: TextStyle;
  cardList: ViewStyle;
  card: ViewStyle;
  cardIconWrap: ViewStyle;
  cardLabel: TextStyle;
  cardArrow: ViewStyle;
} {
  const paddingH = responsiveSize(20, scale);
  return {
    container: { flex: 1 },
    scroll: {
      paddingHorizontal: paddingH,
      paddingTop: responsiveSize(8, scale),
      paddingBottom: 100,
    },
    hero: {
      marginBottom: responsiveSize(24, scale),
    },
    heroTitle: {
      fontSize: responsiveSize(isSmallScreen ? 26 : 28, scale),
      fontWeight: '800',
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    heroSubtitle: {
      fontSize: responsiveSize(14, scale),
      fontWeight: '500',
    },
    cardList: {
      gap: responsiveSize(12, scale),
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: responsiveSize(16, scale),
      paddingHorizontal: responsiveSize(16, scale),
      borderRadius: responsiveSize(16, scale),
      borderWidth: StyleSheet.hairlineWidth,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
      gap: responsiveSize(14, scale),
    },
    cardIconWrap: {
      width: responsiveSize(48, scale),
      height: responsiveSize(48, scale),
      borderRadius: responsiveSize(14, scale),
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardLabel: {
      flex: 1,
      fontSize: responsiveSize(isSmallScreen ? 15 : 16, scale),
      fontWeight: '600',
      lineHeight: responsiveSize(22, scale),
    },
    cardArrow: {
      width: responsiveSize(36, scale),
      height: responsiveSize(36, scale),
      borderRadius: responsiveSize(10, scale),
      alignItems: 'center',
      justifyContent: 'center',
    },
  };
}
