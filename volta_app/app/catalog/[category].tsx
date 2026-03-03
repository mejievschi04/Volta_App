import React, { useContext, useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemeContext } from '../_context/ThemeContext';
import { getColors } from '../_components/theme';
import Screen from '../_components/Screen';
import { useBottomMenuInset } from '../_hooks/useBottomMenuInset';
import { useResponsive, responsiveSize } from '../_hooks/useResponsive';
import { apiClient } from '../../lib/apiClient';
import { getCategoryBySlug, getSubcategoriesByCategoryId } from '../../data/catalogMock';
import EmptyState from '../_components/EmptyState';

type SubcategoryItem = { id: string; name: string; slug: string; categoryId: string; sort?: number };

export default function CatalogCategoryScreen() {
  const { category: categorySlug } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const bottomInsetForMenu = useBottomMenuInset();
  const { isSmallScreen, scale } = useResponsive();
  const [category, setCategory] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!categorySlug) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const mockCat = getCategoryBySlug(categorySlug) ?? getCategoryBySlug(categorySlug.replace(/-si-/g, '-'));
      const catRes = await apiClient.getShopCategoryBySlug(categorySlug);

      if (catRes.data && typeof catRes.data === 'object') {
        const c = catRes.data as any;
        setCategory({
          id: String(c.id ?? c.pk ?? ''),
          name: c.name ?? c.title ?? categorySlug,
          slug: c.slug ?? categorySlug,
        });
        const fromCategory = Array.isArray(c.category_in_subcategory)
          ? (c.category_in_subcategory as any[]).map((s: any, i: number) => ({
              id: String(s.id ?? s.pk ?? i + 1),
              name: s.name ?? s.title ?? '',
              slug: s.slug ?? String(s.id ?? s.pk ?? i + 1),
              categoryId: categorySlug,
              sort: typeof s.sort === 'number' ? s.sort : typeof s.sorted === 'number' ? s.sorted : i,
            }))
          : [];
        if (fromCategory.length > 0) {
          fromCategory.sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999));
          setSubcategories(fromCategory);
        } else {
          const subcatsRes = await apiClient.getShopSubcategories({ category: categorySlug });
          if (subcatsRes.data && Array.isArray(subcatsRes.data)) {
            const list = (subcatsRes.data as any[]).map((s: any, i: number) => ({
              id: String(s.id ?? s.pk ?? i + 1),
              name: s.name ?? s.title ?? '',
              slug: s.slug ?? String(s.id ?? s.pk ?? i + 1),
              categoryId: categorySlug,
              sort: typeof s.sort === 'number' ? s.sort : typeof s.sorted === 'number' ? s.sorted : i,
            }));
            list.sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999));
            setSubcategories(list);
          } else {
            setSubcategories([]);
          }
        }
      } else if (mockCat) {
        setCategory({ id: mockCat.id, name: mockCat.name, slug: mockCat.slug });
        setSubcategories(getSubcategoriesByCategoryId(mockCat.id));
      } else {
        setCategory(null);
        setSubcategories([]);
      }
      setLoading(false);
    })();
  }, [categorySlug]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const responsiveStyles = useMemo(() => StyleSheet.create(getStyles(isSmallScreen, scale)), [isSmallScreen, scale]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={{ color: colors.textMuted, marginTop: 12 }}>Se încarcă...</Text>
        </View>
      </Screen>
    );
  }

  if (!category) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <EmptyState icon="grid-outline" title="Categoria nu există" description="Verifică link-ul sau alege din catalog." />
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, padding: 12 }}>
            <Text style={{ color: colors.primaryButton, fontWeight: '600' }}>Înapoi</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[responsiveStyles.container, { backgroundColor: colors.background }]}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            contentContainerStyle={[responsiveStyles.scroll, { paddingBottom: bottomInsetForMenu + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[responsiveStyles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => router.back()} style={responsiveStyles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[responsiveStyles.title, { color: colors.text }]} numberOfLines={1}>
                {category.name}
              </Text>
            </View>

            <Text style={[responsiveStyles.sectionLabel, { color: colors.textMuted }]}>Alege subcategoria</Text>
            <View style={responsiveStyles.list}>
              {subcategories.length === 0 ? (
                <View style={responsiveStyles.emptyWrap}>
                  <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
                  <Text style={[responsiveStyles.emptyText, { color: colors.textMuted }]}>Nu există subcategorii</Text>
                </View>
              ) : (
                subcategories.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[
                      responsiveStyles.row,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => router.push(`/catalog/${categorySlug}/sub/${sub.slug}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={[responsiveStyles.rowLabel, { color: colors.text }]} numberOfLines={1}>
                      {sub.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                ))
              )}
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
  header: ViewStyle;
  backBtn: ViewStyle;
  title: TextStyle;
  sectionLabel: TextStyle;
  list: ViewStyle;
  row: ViewStyle;
  rowLabel: TextStyle;
  emptyWrap: ViewStyle;
  emptyText: TextStyle;
} {
  const paddingH = responsiveSize(20, scale);
  return {
    container: { flex: 1 },
    scroll: { paddingBottom: 100 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: paddingH,
      paddingVertical: responsiveSize(14, scale),
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: responsiveSize(12, scale),
    },
    backBtn: { padding: 4 },
    title: {
      flex: 1,
      fontSize: responsiveSize(isSmallScreen ? 18 : 20, scale),
      fontWeight: '700',
    },
    sectionLabel: {
      fontSize: responsiveSize(13, scale),
      fontWeight: '600',
      marginTop: responsiveSize(16, scale),
      marginBottom: responsiveSize(10, scale),
      paddingHorizontal: paddingH,
    },
    list: {
      paddingHorizontal: paddingH,
      gap: responsiveSize(10, scale),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: responsiveSize(16, scale),
      paddingHorizontal: responsiveSize(16, scale),
      borderRadius: responsiveSize(12, scale),
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: responsiveSize(10, scale),
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    rowLabel: {
      fontSize: responsiveSize(16, scale),
      fontWeight: '600',
      flex: 1,
    },
    emptyWrap: {
      alignItems: 'center',
      paddingVertical: responsiveSize(48, scale),
      gap: responsiveSize(12, scale),
    },
    emptyText: {
      fontSize: responsiveSize(15, scale),
    },
  };
}
