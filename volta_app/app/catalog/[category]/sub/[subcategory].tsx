import React, { useContext, useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
  Platform,
  StatusBar,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemeContext } from '../../../_context/ThemeContext';
import { CartContext } from '../../../_context/CartContext';
import { getColors, formatCurrencyDisplay } from '../../../_components/theme';
import Screen from '../../../_components/Screen';
import { useBottomMenuInset } from '../../../_hooks/useBottomMenuInset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive, responsiveSize } from '../../../_hooks/useResponsive';
import { apiClient } from '../../../../lib/apiClient';
import {
  getCategoryBySlug,
  getSubcategoriesByCategoryId,
  getProductsByCategoryId,
} from '../../../../data/catalogMock';
import type { CatalogProduct } from '../../../../data/catalogMock';
import EmptyState from '../../../_components/EmptyState';
import ProductCard from '../../../_components/ProductCard';

const PAGE_SIZE = 14;

function normalizeApiProduct(p: any, index: number): CatalogProduct {
  const id = String(p.id ?? p.pk ?? p.slug ?? index + 1);
  const priceRaw = p.promotion_price ?? p.price ?? 0;
  const oldPriceRaw = p.promotion_price != null && p.price != null ? p.price : (p.old_price ?? p.oldPrice);
  const brandObj = typeof p.brand === 'object' && p.brand ? p.brand : null;
  const brandName = brandObj?.name ?? p.brand__name_ro ?? p.brand__name ?? p.brand_name ?? (typeof p.brand === 'string' ? p.brand : undefined);
  const brandSlug = brandObj?.slug ?? p.brand_slug ?? (typeof p.brand === 'string' ? undefined : undefined);
  return {
    id,
    slug: typeof p.slug === 'string' ? p.slug : undefined,
    name: p.name ?? p.title ?? 'Produs',
    price: Number(priceRaw) || 0,
    currency: p.currency ?? 'MDL',
    image_url: p.image_url ?? p.image ?? (p.product_gallery?.[0]?.image ?? null),
    categoryId: String(p.category?.id ?? p.category_id ?? p.categoryId ?? ''),
    subcategoryId: String(p.subcategory?.id ?? p.subcategory_id ?? p.subcategoryId ?? ''),
    description: p.description,
    inStock: p.is_stock ?? p.in_stock ?? p.inStock,
    sku: p.sku ?? p.code,
    brand: brandName,
    brandSlug: typeof brandSlug === 'string' ? brandSlug : undefined,
    oldPrice: oldPriceRaw != null ? Number(oldPriceRaw) : undefined,
    inStockLabel: p.in_stock_label ?? p.inStockLabel,
    warranty: p.warranty,
    deliveryInfo: p.delivery_info ?? p.deliveryInfo,
    specs: p.specs,
  };
}

export default function CatalogProductsScreen() {
  const { category: categorySlug, subcategory: subcategorySlug } = useLocalSearchParams<{ category: string; subcategory: string }>();
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const { addToCart } = useContext(CartContext);
  const isDark = theme === 'dark';
  const bottomInsetForMenu = useBottomMenuInset();
  const insets = useSafeAreaInsets();
  const { isSmallScreen, scale } = useResponsive();
  const [category, setCategory] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [subcategoryName, setSubcategoryName] = useState<string>('');
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name_asc' | 'stock_first'>('price_asc');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedBrandSlug, setSelectedBrandSlug] = useState<string | null>(null);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [brands, setBrands] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [filtersMenuOpen, setFiltersMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!categorySlug || !subcategorySlug) {
      setLoading(false);
      return;
    }
    const orderingMap = { price_asc: 'price', price_desc: '-price', name_asc: 'name', stock_first: '' } as const;
    const params: Record<string, string | number> = {
      category__slug: categorySlug,
      subcategory__slug: subcategorySlug,
      page_size: PAGE_SIZE,
      page: 1,
    };
    if (orderingMap[sortBy]) params.ordering = orderingMap[sortBy];
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedBrandSlug) params.brand__slug = selectedBrandSlug;
    if (onlyDiscounted) params.discount__gt = 0;
    const pMin = priceMin.trim() ? Number(priceMin.replace(/,/g, '.')) : undefined;
    const pMax = priceMax.trim() ? Number(priceMax.replace(/,/g, '.')) : undefined;
    if (pMin != null && !Number.isNaN(pMin)) params.price__gte = pMin;
    if (pMax != null && !Number.isNaN(pMax)) params.price__lte = pMax;

    let cancelled = false;
    (async () => {
      setLoading(true);
      const mockCat = getCategoryBySlug(categorySlug) ?? getCategoryBySlug(categorySlug.replace(/-si-/g, '-'));
      const mockSubs = mockCat ? getSubcategoriesByCategoryId(mockCat.id) : [];
      const mockSub = mockSubs.find((s) => s.slug === subcategorySlug || s.id === subcategorySlug);

      const catRes = await apiClient.getShopCategoryBySlug(categorySlug);
      if (catRes.data && typeof catRes.data === 'object') {
        const c = catRes.data as any;
        setCategory({ id: String(c.id ?? ''), name: c.name ?? c.title ?? categorySlug, slug: c.slug ?? categorySlug });
        const subs = Array.isArray(c.category_in_subcategory) ? (c.category_in_subcategory as any[]) : [];
        const sub = subs.find((s: any) => (s.slug === subcategorySlug) || String(s.id) === subcategorySlug);
        if (sub) setSubcategoryName(sub.name ?? subcategorySlug);
      } else if (mockCat) {
        setCategory({ id: mockCat.id, name: mockCat.name, slug: mockCat.slug });
        if (mockSub) setSubcategoryName(mockSub.name);
      }

      const prodsRes = await apiClient.getShopProducts(params);
      if (cancelled) return;
      const productsArray = Array.isArray(prodsRes.data) ? prodsRes.data : (prodsRes.data as any)?.products?.results;
      const nextPage = (prodsRes as { next?: string | null }).next;
      if (productsArray && productsArray.length > 0) {
        const list = productsArray.map((p: any, i: number) => normalizeApiProduct(p, i));
      setProducts(list);
        setHasMore(!!nextPage || productsArray.length >= PAGE_SIZE);
        setPage(1);
      } else if (mockCat && mockSub && !searchQuery && !selectedBrandSlug && !onlyDiscounted && !priceMin && !priceMax) {
        const allMock = getProductsByCategoryId(mockCat.id);
        setProducts(allMock.filter((p) => p.subcategoryId === mockSub.id));
        setHasMore(false);
        setPage(1);
      } else {
        setProducts([]);
        setHasMore(false);
        setPage(1);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [categorySlug, subcategorySlug, sortBy, searchQuery, selectedBrandSlug, onlyDiscounted, priceMin, priceMax]);

  useEffect(() => {
    searchDebounceRef.current = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchInput]);

  useEffect(() => {
    (async () => {
      const res = await apiClient.getShopBrands();
      if (res.data && Array.isArray(res.data)) {
        const list = (res.data as any[]).map((b: any) => ({
          id: b.id ?? b.pk ?? 0,
          name: b.name ?? b.title ?? '',
          slug: b.slug ?? String(b.id ?? ''),
        })).filter((b) => b.slug);
        setBrands(list);
      }
    })();
  }, []);

  useEffect(() => {
    if (!categorySlug || !subcategorySlug) return;
    (async () => {
      const res = await apiClient.getShopProductAttributes({
        category__slug: categorySlug,
        subcategory__slug: subcategorySlug,
      });
      const d = res.data as any;
      if (d && typeof d === 'object' && (d.min_price != null || d.max_price != null)) {
        setPriceRange({
          min: Number(d.min_price) || 0,
          max: Number(d.max_price) || 999999,
        });
      }
    })();
  }, [categorySlug, subcategorySlug]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const closeFiltersMenu = () => {
    Animated.timing(menuSlideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setFiltersMenuOpen(false));
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || loading || !categorySlug || !subcategorySlug) return;
    const orderingMap = { price_asc: 'price', price_desc: '-price', name_asc: 'name', stock_first: '' } as const;
    const params: Record<string, string | number> = {
      category__slug: categorySlug,
      subcategory__slug: subcategorySlug,
      page_size: PAGE_SIZE,
      page: page + 1,
    };
    if (orderingMap[sortBy]) params.ordering = orderingMap[sortBy];
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedBrandSlug) params.brand__slug = selectedBrandSlug;
    if (onlyDiscounted) params.discount__gt = 0;
    const pMin = priceMin.trim() ? Number(priceMin.replace(/,/g, '.')) : undefined;
    const pMax = priceMax.trim() ? Number(priceMax.replace(/,/g, '.')) : undefined;
    if (pMin != null && !Number.isNaN(pMin)) params.price__gte = pMin;
    if (pMax != null && !Number.isNaN(pMax)) params.price__lte = pMax;
    setLoadingMore(true);
    const prodsRes = await apiClient.getShopProducts(params);
    setLoadingMore(false);
    const productsArray = Array.isArray(prodsRes.data) ? prodsRes.data : (prodsRes.data as any)?.products?.results;
    const nextPage = (prodsRes as { next?: string | null }).next;
    if (productsArray && productsArray.length > 0) {
      const list = productsArray.map((p: any, i: number) => normalizeApiProduct(p, products.length + i));
      setProducts((prev) => [...prev, ...list]);
      setHasMore(!!nextPage || productsArray.length >= PAGE_SIZE);
      setPage((p) => p + 1);
    } else {
      setHasMore(false);
    }
  };

  useEffect(() => {
    if (filtersMenuOpen) {
      Animated.spring(menuSlideAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
      StatusBar.setHidden(true, 'fade');
    } else {
      StatusBar.setHidden(true, 'fade');
    }
  }, [filtersMenuOpen]);

  const responsiveStyles = useMemo(() => StyleSheet.create(getStyles(isSmallScreen, scale)), [isSmallScreen, scale]);

  const filteredAndSortedProducts = useMemo(() => {
    let list = onlyInStock ? products.filter((p) => p.inStock !== false) : [...products];
    switch (sortBy) {
      case 'price_asc':
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ro'));
        break;
      case 'stock_first':
        list = [...list].sort((a, b) => (a.inStock === true ? 0 : 1) - (b.inStock === true ? 0 : 1));
        break;
      default:
        break;
    }
    return list;
  }, [products, sortBy, onlyInStock]);

  /** Număr produse în stoc per brand: după nume și după slug (din lista curentă de produse). Numără doar când inStock === true. */
  const { inStockCountByBrandName, inStockCountByBrandSlug } = useMemo(() => {
    const byName: Record<string, number> = {};
    const bySlug: Record<string, number> = {};
    products.forEach((p) => {
      if (p.inStock !== true) return;
      const nameKey = (typeof p.brand === 'string' ? p.brand : '').trim() || '(fără brand)';
      byName[nameKey] = (byName[nameKey] ?? 0) + 1;
      if (p.brandSlug) {
        const slug = String(p.brandSlug).trim();
        if (slug) bySlug[slug] = (bySlug[slug] ?? 0) + 1;
      }
    });
    return { inStockCountByBrandName: byName, inStockCountByBrandSlug: bySlug };
  }, [products]);

  /** Pentru afișare: count pentru un brand (după slug sau nume). */
  const getBrandInStockCount = (brandName: string, brandSlug?: string) => {
    if (brandSlug && (inStockCountByBrandSlug[brandSlug] ?? 0) > 0)
      return inStockCountByBrandSlug[brandSlug]!;
    return inStockCountByBrandName[brandName.trim()] ?? inStockCountByBrandName[brandName] ?? 0;
  };

  /** Branduri care au cel puțin un produs în stoc (potrivire după slug sau nume). Dacă niciunul nu se potrivește, derivăm lista din produsele în stoc. */
  const brandsInStock = useMemo(() => {
    const fromApi = brands.filter((b) => getBrandInStockCount(b.name, b.slug) > 0);
    if (fromApi.length > 0) return fromApi;
    // Fallback: branduri unice din produsele în stoc (când API nu trimite brand pe listă sau numele diferă)
    const seen = new Set<string>();
    const derived: Array<{ id: number; name: string; slug: string; count: number }> = [];
    products.forEach((p) => {
      if (p.inStock !== true) return;
      const slug = (p.brandSlug ?? '').trim();
      const name = (typeof p.brand === 'string' ? p.brand : '').trim();
      if (!name && !slug) return;
      const key = slug || name;
      if (seen.has(key)) {
        const existing = derived.find((d) => d.slug === key || d.name === key);
        if (existing) existing.count += 1;
        return;
      }
      seen.add(key);
      derived.push({
        id: derived.length,
        name: name || slug,
        slug: slug || key.replace(/\s+/g, '-').toLowerCase(),
        count: 1,
      });
    });
    return derived;
  }, [brands, products, inStockCountByBrandName, inStockCountByBrandSlug]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={{ color: colors.textMuted, marginTop: 12 }}>Se încarcă produsele...</Text>
        </View>
      </Screen>
    );
  }

  const title = subcategoryName || subcategorySlug;
  const showCategory = category?.name;

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
              <Text style={[responsiveStyles.title, { color: colors.text }]} numberOfLines={2}>
                {showCategory ? `${showCategory} › ${title}` : title}
              </Text>
              <TouchableOpacity
                onPress={() => setFiltersMenuOpen(true)}
                style={[responsiveStyles.filterHeaderBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}
                accessibilityLabel="Deschide filtre"
                accessibilityRole="button"
              >
                <Ionicons name="options" size={22} color={colors.text} />
                <Text style={[responsiveStyles.filterHeaderBtnText, { color: colors.text }]}>Filtre</Text>
              </TouchableOpacity>
            </View>

            {/* Căutare pe pagină */}
            <View style={[responsiveStyles.searchRow, { borderBottomColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[responsiveStyles.searchInput, { color: colors.text, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
                placeholder="Caută produs..."
                placeholderTextColor={colors.textMuted}
                value={searchInput}
                onChangeText={setSearchInput}
                returnKeyType="search"
              />
              {searchInput.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchInput('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={responsiveStyles.productGrid}>
              {filteredAndSortedProducts.length === 0 ? (
                <EmptyState
                  icon={onlyInStock ? "checkmark-circle-outline" : "cube-outline"}
                  title={products.length === 0 ? "Niciun produs" : onlyInStock ? "Niciun produs în stoc" : "Niciun rezultat"}
                  description={products.length === 0 ? "Nu există produse în această subcategorie." : (searchQuery || selectedBrandSlug || onlyDiscounted || priceMin || priceMax) ? "Schimbă filtrele sau căutarea." : onlyInStock ? "Dezactivează filtrul „Doar în stoc”." : "Încearcă alte filtre sau sortări."}
                  style={{ paddingVertical: 48 }}
                />
              ) : (
                filteredAndSortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      id: product.id,
                      slug: product.slug,
                      name: product.name,
                      price: product.price,
                      currency: product.currency,
                      image_url: product.image_url,
                      brand: product.brand,
                      sku: product.sku,
                      oldPrice: product.oldPrice,
                      inStock: product.inStock,
                      inStockLabel: product.inStockLabel,
                    }}
                    categorySlug={categorySlug ?? ''}
                    onAddToCart={() => addToCart({ id: product.id, name: product.name, price: product.price, currency: product.currency, image_url: product.image_url || null })}
                    variant="grid"
                  />
                ))
              )}
            </View>
            {hasMore && filteredAndSortedProducts.length > 0 && (
              <View style={{ paddingHorizontal: responsiveSize(20, scale), paddingVertical: responsiveSize(16, scale), alignItems: 'center' }}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primaryButton || colors.text} />
                ) : (
                  <TouchableOpacity
                    style={[responsiveStyles.menuApplyBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)', paddingVertical: responsiveSize(12, scale), paddingHorizontal: responsiveSize(24, scale) }]}
                    onPress={loadMore}
                  >
                    <Text style={[responsiveStyles.filterChipText, { color: colors.text }]}>Încarcă mai multe</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={{ height: 80 }} />
          </ScrollView>

          {/* Meniu lateral Filtre (deschide din stânga) */}
          <Modal
            visible={filtersMenuOpen}
            transparent
            animationType="none"
            onRequestClose={closeFiltersMenu}
            statusBarTranslucent
            {...(Platform.OS === 'android' && { navigationBarTranslucent: true })}
          >
            <View style={responsiveStyles.menuOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFiltersMenu} />
              <Animated.View
                style={[
                  responsiveStyles.menuPanel,
                  { backgroundColor: colors.background },
                  {
                    transform: [{
                      translateX: menuSlideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-Dimensions.get('window').width * 0.85, 0],
                      }),
                    }],
                  },
                ]}
              >
                <View style={[responsiveStyles.menuPanelHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[responsiveStyles.menuTitle, { color: colors.text }]}>Filtre</Text>
                  <TouchableOpacity onPress={closeFiltersMenu} style={responsiveStyles.menuCloseBtn}>
                    <Ionicons name="close" size={26} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={responsiveStyles.menuPanelScroll} contentContainerStyle={responsiveStyles.menuPanelContent} showsVerticalScrollIndicator={true}>
                  <View style={responsiveStyles.menuSection}>
                    <Text style={[responsiveStyles.menuSectionTitle, { color: colors.textMuted }]}>Sortare</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: responsiveSize(8, scale) }}>
                      {(['price_asc', 'price_desc', 'name_asc', 'stock_first'] as const).map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={[responsiveStyles.filterChip, sortBy === key && responsiveStyles.filterChipActive, { borderColor: colors.border, backgroundColor: sortBy === key ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)') : 'transparent' }]}
                          onPress={() => setSortBy(key)}
                        >
                          <Text style={[responsiveStyles.filterChipText, { color: sortBy === key ? colors.text : colors.textMuted }]}>
                            {key === 'price_asc' ? 'Preț ↑' : key === 'price_desc' ? 'Preț ↓' : key === 'name_asc' ? 'Nume' : 'Stoc'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={responsiveStyles.menuSection}>
                    <Text style={[responsiveStyles.menuSectionTitle, { color: colors.textMuted }]}>Brand (doar cu produse în stoc)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: responsiveSize(8, scale) }}>
                      <TouchableOpacity
                        style={[responsiveStyles.filterChip, !selectedBrandSlug && responsiveStyles.filterChipActive, { borderColor: colors.border, backgroundColor: !selectedBrandSlug ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)') : 'transparent' }]}
                        onPress={() => setSelectedBrandSlug(null)}
                      >
                        <Text style={[responsiveStyles.filterChipText, { color: !selectedBrandSlug ? colors.text : colors.textMuted }]}>Toate</Text>
                      </TouchableOpacity>
                      {brandsInStock.map((b) => {
                        const count = 'count' in b && typeof (b as { count?: number }).count === 'number'
                          ? (b as { count: number }).count
                          : getBrandInStockCount(b.name, b.slug);
                        return (
                          <TouchableOpacity
                            key={b.slug}
                            style={[responsiveStyles.filterChip, responsiveStyles.filterChipBrand, selectedBrandSlug === b.slug && responsiveStyles.filterChipActive, { borderColor: colors.border, backgroundColor: selectedBrandSlug === b.slug ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)') : 'transparent' }]}
                            onPress={() => setSelectedBrandSlug(selectedBrandSlug === b.slug ? null : b.slug)}
                          >
                            <Text style={[responsiveStyles.filterChipText, { color: selectedBrandSlug === b.slug ? colors.text : colors.textMuted }]} numberOfLines={1}>{b.name}</Text>
                            <View style={[responsiveStyles.brandCountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                              <Text style={[responsiveStyles.brandCountText, { color: colors.textMuted }]}>{count}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <View style={responsiveStyles.menuSection}>
                    <TouchableOpacity
                      style={[responsiveStyles.filterChip, responsiveStyles.filterChipWide, onlyDiscounted && responsiveStyles.filterChipActive, { borderColor: colors.border, backgroundColor: onlyDiscounted ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)') : 'transparent' }]}
                      onPress={() => setOnlyDiscounted(!onlyDiscounted)}
                    >
                      <Ionicons name="pricetag" size={14} color={onlyDiscounted ? colors.primaryButton : colors.textMuted} />
                      <Text style={[responsiveStyles.filterChipText, { color: onlyDiscounted ? colors.text : colors.textMuted }]}>Cu reducere</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={responsiveStyles.menuSection}>
                    <TouchableOpacity
                      style={[responsiveStyles.filterChip, responsiveStyles.filterChipWide, onlyInStock && responsiveStyles.filterChipActive, { borderColor: colors.border, backgroundColor: onlyInStock ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)') : 'transparent' }]}
                      onPress={() => setOnlyInStock(!onlyInStock)}
                    >
                      <Ionicons name="funnel" size={14} color={onlyInStock ? colors.primaryButton : colors.textMuted} />
                      <Text style={[responsiveStyles.filterChipText, { color: onlyInStock ? colors.text : colors.textMuted }]}>Doar în stoc</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={responsiveStyles.menuSection}>
                    <Text style={[responsiveStyles.menuSectionTitle, { color: colors.textMuted }]}>Preț (lei)</Text>
                    <View style={responsiveStyles.priceFilterRow}>
                      <TextInput
                        style={[responsiveStyles.priceInput, { color: colors.text, borderColor: colors.border }]}
                        placeholder={priceRange ? `Min ${priceRange.min}` : 'Min'}
                        placeholderTextColor={colors.textMuted}
                        value={priceMin}
                        onChangeText={setPriceMin}
                        keyboardType="numeric"
                      />
                      <Text style={{ color: colors.textMuted, marginHorizontal: 4 }}>–</Text>
                      <TextInput
                        style={[responsiveStyles.priceInput, { color: colors.text, borderColor: colors.border }]}
                        placeholder={priceRange ? `Max ${priceRange.max}` : 'Max'}
                        placeholderTextColor={colors.textMuted}
                        value={priceMax}
                        onChangeText={setPriceMax}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </ScrollView>
                <View style={[responsiveStyles.menuPanelFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[responsiveStyles.menuApplyBtn, { backgroundColor: colors.primaryButton || '#FFEE00' }]}
                    onPress={closeFiltersMenu}
                  >
                    <Text style={responsiveStyles.menuApplyBtnText}>Aplică filtre</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </Modal>
        </Animated.View>
      </View>
    </Screen>
  );
}

function getStyles(isSmallScreen: boolean, scale: number): Record<string, ViewStyle | TextStyle> {
  const paddingH = responsiveSize(20, scale);
  const gap = responsiveSize(12, scale);
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
    title: { flex: 1, fontSize: responsiveSize(isSmallScreen ? 18 : 20, scale), fontWeight: '700' },
    filterHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: responsiveSize(8, scale),
      paddingHorizontal: responsiveSize(12, scale),
      borderRadius: responsiveSize(10, scale),
      gap: responsiveSize(6, scale),
    },
    filterHeaderBtnText: { fontSize: responsiveSize(14, scale), fontWeight: '600' },
    filtersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: responsiveSize(10, scale),
      paddingHorizontal: paddingH,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: responsiveSize(10, scale),
    },
    filtersScroll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: responsiveSize(8, scale),
      paddingRight: responsiveSize(8, scale),
    },
    filtersLabel: { fontSize: responsiveSize(13, scale), fontWeight: '600', marginRight: responsiveSize(4, scale) },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: responsiveSize(8, scale),
      paddingHorizontal: responsiveSize(12, scale),
      borderRadius: responsiveSize(10, scale),
      borderWidth: StyleSheet.hairlineWidth,
      gap: responsiveSize(4, scale),
    },
    filterChipActive: {},
    filterChipText: { fontSize: responsiveSize(13, scale), fontWeight: '600' },
    filterChipBrand: { justifyContent: 'space-between', gap: responsiveSize(6, scale) },
    brandCountBadge: {
      paddingHorizontal: responsiveSize(6, scale),
      paddingVertical: responsiveSize(2, scale),
      borderRadius: responsiveSize(6, scale),
      minWidth: responsiveSize(20, scale),
      alignItems: 'center',
    },
    brandCountText: { fontSize: responsiveSize(11, scale), fontWeight: '700' },
    filterChipWide: { flexShrink: 0 },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: responsiveSize(8, scale),
      paddingHorizontal: paddingH,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: responsiveSize(8, scale),
    },
    searchInput: {
      flex: 1,
      fontSize: responsiveSize(15, scale),
      paddingVertical: responsiveSize(10, scale),
      paddingHorizontal: responsiveSize(12, scale),
      borderRadius: responsiveSize(10, scale),
    },
    filtersRow2: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: responsiveSize(10, scale),
      paddingHorizontal: paddingH,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: responsiveSize(10, scale),
    },
    priceFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      flexWrap: 'wrap',
      gap: responsiveSize(6, scale),
    },
    priceInput: {
      width: responsiveSize(72, scale),
      fontSize: responsiveSize(13, scale),
      paddingVertical: responsiveSize(6, scale),
      paddingHorizontal: responsiveSize(8, scale),
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: responsiveSize(8, scale),
    },
    menuOverlay: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    menuPanel: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: Dimensions.get('window').width * 0.85,
      maxWidth: 340,
    },
    menuPanelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: paddingH,
      paddingVertical: responsiveSize(16, scale),
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuTitle: { fontSize: responsiveSize(20, scale), fontWeight: '700' },
    menuCloseBtn: { padding: responsiveSize(8, scale) },
    menuPanelScroll: { flex: 1 },
    menuPanelContent: { padding: paddingH, paddingBottom: responsiveSize(24, scale) },
    menuSection: { marginBottom: responsiveSize(20, scale) },
    menuSectionTitle: { fontSize: responsiveSize(12, scale), fontWeight: '700', marginBottom: responsiveSize(8, scale), textTransform: 'uppercase', letterSpacing: 0.5 },
    menuPanelFooter: {
      paddingHorizontal: paddingH,
      paddingVertical: responsiveSize(16, scale),
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    menuApplyBtn: {
      paddingVertical: responsiveSize(14, scale),
      borderRadius: responsiveSize(12, scale),
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuApplyBtnText: { fontSize: responsiveSize(16, scale), fontWeight: '700', color: '#000' },
    productGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: paddingH,
      paddingTop: responsiveSize(20, scale),
      gap,
    },
  };
}
