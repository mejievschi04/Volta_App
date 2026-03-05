import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from './_context/ThemeContext';
import { CartContext } from './_context/CartContext';
import { getColors, formatCurrencyDisplay } from './_components/theme';
import Screen from './_components/Screen';
import { useBottomMenuInset } from './_hooks/useBottomMenuInset';
import { useResponsive, responsiveSize } from './_hooks/useResponsive';
import { apiClient, resolveImageUrl } from '../lib/apiClient';
import type { ProductCardProduct } from './_components/ProductCard';

const DEBOUNCE_MS = 400;
const ROW_IMAGE_SIZE = 72;
const SEARCH_PREVIEW_COUNT = 9;

export function normalizeProduct(p: any): ProductCardProduct & { categorySlug: string } {
  const categorySlug = typeof p.category?.slug === 'string' ? p.category.slug : (p.category__slug ?? 'catalog');
  const priceRaw = p.promotion_price ?? p.price ?? 0;
  const oldPriceRaw = p.promotion_price != null && p.price != null ? p.price : (p.old_price ?? p.oldPrice);
  return {
    id: String(p.id ?? p.pk ?? p.slug ?? ''),
    slug: typeof p.slug === 'string' ? p.slug : undefined,
    name: p.name ?? p.title ?? 'Produs',
    price: Number(priceRaw) || 0,
    currency: p.currency ?? 'MDL',
    image_url: p.image_url ?? p.image ?? (p.product_gallery?.[0]?.image ?? null),
    oldPrice: oldPriceRaw != null ? Number(oldPriceRaw) : undefined,
    inStock: p.is_stock ?? p.in_stock,
    sku: p.sku ?? p.code,
    brand: typeof p.brand === 'object' && p.brand?.name ? p.brand.name : (p.brand__name_ro ?? p.brand__name ?? p.brand_name),
    categorySlug,
  };
}

export function SearchResultRow({
  product,
  onPress,
  onAddToCart,
  colors,
  isDark,
  scale,
}: {
  product: ProductCardProduct & { categorySlug: string };
  onPress: () => void;
  onAddToCart: () => void;
  colors: ReturnType<typeof getColors>;
  isDark: boolean;
  scale: number;
}) {
  const imageUri = resolveImageUrl(product.image_url ?? null);
  const showOldPrice = product.oldPrice != null && product.oldPrice > product.price;
  const inStock = product.inStock !== false;
  const r = (n: number) => responsiveSize(n, scale);
  const imgSize = r(ROW_IMAGE_SIZE);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF',
        borderRadius: r(12),
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? colors.border : '#E8E8E8',
        marginBottom: r(10),
      }}
    >
      <View style={{ width: imgSize, height: imgSize, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' }}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: imgSize, height: imgSize }} resizeMode="cover" />
        ) : (
          <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
        )}
      </View>
      <View style={{ flex: 1, paddingHorizontal: r(12), paddingVertical: r(10), justifyContent: 'center' }}>
        <Text style={{ fontSize: r(14), fontWeight: '600', color: colors.text }} numberOfLines={2}>{product.name}</Text>
        {showOldPrice && (
          <Text style={{ fontSize: r(11), color: colors.textMuted, textDecorationLine: 'line-through', marginTop: r(2) }}>
            {product.oldPrice} {formatCurrencyDisplay(product.currency)}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: r(6) }}>
          <Text style={{ fontSize: r(15), fontWeight: '800', color: colors.primaryButton }}>
            {product.price} {formatCurrencyDisplay(product.currency)}
          </Text>
          <TouchableOpacity
            onPress={onAddToCart}
            style={{ width: r(36), height: r(36), borderRadius: r(10), backgroundColor: colors.primaryButton, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.85}
            disabled={!inStock}
          >
            <Ionicons name="cart" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Search() {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const { addToCart } = useContext(CartContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const bottomInset = useBottomMenuInset();
  const { scale } = useResponsive();

  const [query, setQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [products, setProducts] = useState<(ProductCardProduct & { categorySlug: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const term = (q || '').trim();
    if (!term) {
      setProducts([]);
      setSearched(true);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await apiClient.getShopProducts({ search: term, page_size: '50' });
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
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!inputValue.trim()) {
      setQuery('');
      setProducts([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setQuery(inputValue.trim());
      runSearch(inputValue.trim());
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, runSearch]);

  const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: responsiveSize(16, scale),
      paddingVertical: responsiveSize(12, scale),
      gap: responsiveSize(10, scale),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? colors.border : '#E8E8E8',
    },
    backBtn: {
      padding: responsiveSize(8, scale),
    },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.surface : '#F5F5F5',
      borderRadius: 12,
      paddingHorizontal: responsiveSize(14, scale),
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E8E8E8',
    },
    input: {
      flex: 1,
      paddingVertical: responsiveSize(12, scale),
      paddingHorizontal: responsiveSize(8, scale),
      fontSize: responsiveSize(16, scale),
      color: colors.text,
    },
    list: {
      flex: 1,
      paddingHorizontal: responsiveSize(16, scale),
      paddingTop: responsiveSize(12, scale),
    },
    empty: {
      flex: 1,
      paddingVertical: responsiveSize(48, scale),
      alignItems: 'center',
    },
    emptyText: {
      fontSize: responsiveSize(15, scale),
      color: colors.textMuted,
      textAlign: 'center',
    },
    veziToateBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: responsiveSize(12, scale),
      paddingTop: responsiveSize(8, scale),
      backgroundColor: 'transparent',
    },
    veziToateText: {
      fontSize: responsiveSize(15, scale),
      fontWeight: '600',
      color: colors.textMuted,
    },
  });

  return (
    <Screen>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Caută produse..."
              placeholderTextColor={colors.textMuted}
              value={inputValue}
              onChangeText={setInputValue}
              returnKeyType="search"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            {inputValue.length > 0 && (
              <TouchableOpacity onPress={() => { setInputValue(''); setQuery(''); setProducts([]); setSearched(false); }} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primaryButton} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Se caută...</Text>
          </View>
        ) : searched && products.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>
              {query ? 'Niciun rezultat. Încearcă alte cuvinte.' : 'Scrie pentru a căuta în catalog.'}
            </Text>
          </View>
        ) : products.length > 0 ? (
          <View style={{ flex: 1 }}>
            <ScrollView
              style={styles.list}
              contentContainerStyle={{ paddingBottom: responsiveSize(8, scale) }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {products.slice(0, SEARCH_PREVIEW_COUNT).map((p) => (
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
            <TouchableOpacity
              style={[styles.veziToateBtn, { paddingBottom: bottomInset + responsiveSize(8, scale) }]}
              onPress={() => router.push({ pathname: '/SearchResults', params: { q: query } })}
              activeOpacity={0.7}
            >
              <Text style={styles.veziToateText}>Vezi toate</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Caută produse după nume, cod sau brand</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
