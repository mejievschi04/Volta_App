import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemeContext } from './_context/ThemeContext';
import { CartContext } from './_context/CartContext';
import { getColors } from './_components/theme';
import Screen from './_components/Screen';
import { useBottomMenuInset } from './_hooks/useBottomMenuInset';
import { useResponsive, responsiveSize } from './_hooks/useResponsive';
import { apiClient } from '../lib/apiClient';
import type { ProductCardProduct } from './_components/ProductCard';
import { normalizeProduct, SearchResultRow } from './Search';

export default function SearchResults() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const { addToCart } = useContext(CartContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const bottomInset = useBottomMenuInset();
  const { scale } = useResponsive();

  const [products, setProducts] = useState<(ProductCardProduct & { categorySlug: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const term = (q || '').trim();
    if (!term) {
      setLoading(false);
      setProducts([]);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.getShopProducts({ search: term, page_size: '100' });
        if (res.error || !res.data) {
          setProducts([]);
          return;
        }
        const list = (res.data as any[]).map((p: any) => normalizeProduct(p));
        setProducts(list);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [q]);

  const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: responsiveSize(16, scale),
      paddingVertical: responsiveSize(12, scale),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? colors.border : '#E8E8E8',
    },
    backBtn: { padding: responsiveSize(8, scale) },
    title: {
      flex: 1,
      fontSize: responsiveSize(18, scale),
      fontWeight: '700',
      color: colors.text,
    },
    list: {
      flex: 1,
      paddingHorizontal: responsiveSize(16, scale),
      paddingTop: responsiveSize(12, scale),
      paddingBottom: bottomInset + responsiveSize(100, scale),
    },
    empty: {
      paddingVertical: responsiveSize(48, scale),
      alignItems: 'center',
    },
    emptyText: {
      fontSize: responsiveSize(15, scale),
      color: colors.textMuted,
      textAlign: 'center',
    },
  });

  if (loading) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Rezultate căutare</Text>
          </View>
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primaryButton} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Se încarcă...</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {q ? `„${q}"` : 'Rezultate căutare'}
          </Text>
        </View>

        {products.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Niciun rezultat.</Text>
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {products.map((p) => (
              <SearchResultRow
                key={p.id}
                product={p}
                onPress={() => router.push(`/catalog/${p.categorySlug}/${encodeURIComponent(p.slug ?? p.id)}`)}
                onAddToCart={() => addToCart({ id: p.id, name: p.name, price: p.price, currency: p.currency, image_url: p.image_url ?? null }, 1)}
                colors={colors}
                isDark={isDark}
                scale={scale}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}
