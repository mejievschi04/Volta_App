import React, { useContext, useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  LayoutAnimation,
  UIManager,
  Modal,
  PanResponder,
  StatusBar as RNStatusBar,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../../_context/ThemeContext';
import { CartContext } from '../../_context/CartContext';
import { getColors, formatCurrencyDisplay } from '../../_components/theme';
import Screen from '../../_components/Screen';
import { useBottomMenuInset } from '../../_hooks/useBottomMenuInset';
import { useResponsive, responsiveSize } from '../../_hooks/useResponsive';
import { apiClient, resolveImageUrl } from '../../../lib/apiClient';
import { getProductById } from '../../../data/catalogMock';
import ApiErrorView from '../../_components/ApiErrorView';
import StyledHtmlText from '../../_components/StyledHtmlText';
import ProductCard from '../../_components/ProductCard';
import * as NavigationBar from 'expo-navigation-bar';

/** Produs din API shop/product/{slug} */
type ApiProduct = {
  id?: number;
  name?: string;
  slug?: string;
  model?: string;
  code?: string;
  discount?: number;
  cashback?: number;
  price?: string | number;
  promotion_price?: string | number | null;
  is_active?: boolean;
  is_top?: boolean;
  product_gallery?: Array<{ id?: number; product?: number; image?: string; image_order?: number }>;
  label?: Array<{ id?: number; name?: string; font?: string; font_color?: string; bg_color?: string; sort?: number; url?: string | null }>;
  is_stock?: boolean;
  measure?: string;
  product_balance?: Array<{
    id?: number;
    balance?: number;
    store?: { id?: number; name?: string; address?: string; map_link?: string; phone_mobile?: string };
    updated?: string;
  }>;
  category?: { id?: number; name?: string; slug?: string };
  subcategory?: { id?: number; name?: string; slug?: string };
  subsubcategory?: { id?: number; name?: string; slug?: string } | null;
  description?: string;
  /** Accesorii / produse asociate (din API) */
  accessories?: Array<{ id?: number; slug?: string; name?: string; price?: string | number; promotion_price?: string | number; product_gallery?: Array<{ image?: string }> }>;
  related_products?: ApiProduct[];
  product_accessories?: ApiProduct[];
  [key: string]: unknown;
};

type NormalizedRelatedProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  inStock: boolean;
};

function normalizeProduct(p: ApiProduct | null): {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  currency: string;
  imageUrls: string[];
  brand: string;
  code: string;
  model: string;
  inStock: boolean;
  measure: string;
  categoryName: string;
  subcategoryName: string;
  categorySlug: string;
  subcategorySlug: string;
  labels: Array<{ name: string; bg_color?: string; font_color?: string }>;
  description: string;
  balanceByStore: Array<{ storeName: string; balance: number; address?: string }>;
  accessories: NormalizedRelatedProduct[];
} {
  if (!p) {
    return {
      id: '', slug: '', name: 'Produs', price: 0, oldPrice: null, currency: 'MDL',
      imageUrls: [], brand: '', code: '', model: '', inStock: false, measure: 'buc',
      categoryName: '', subcategoryName: '', categorySlug: '', subcategorySlug: '',
      labels: [], description: '', balanceByStore: [], accessories: [],
    };
  }
  const priceNum = (v: string | number | null | undefined) => (v != null ? Number(v) : 0);
  const promoPrice = priceNum(p.promotion_price);
  const basePrice = priceNum(p.price);
  const price = promoPrice > 0 ? promoPrice : basePrice;
  const oldPrice = promoPrice > 0 && basePrice > promoPrice ? basePrice : null;
  const gallery = Array.isArray(p.product_gallery) ? p.product_gallery : [];
  const imageUrls = gallery
    .sort((a, b) => (a.image_order ?? 0) - (b.image_order ?? 0))
    .map((g) => g.image)
    .filter((url): url is string => Boolean(url));
  if (imageUrls.length === 0 && (p as any).image) imageUrls.push((p as any).image);
  const balanceByStore = (p.product_balance ?? []).map((pb) => ({
    storeName: pb.store?.name ?? 'Magazin',
    balance: pb.balance ?? 0,
    address: pb.store?.address,
  }));
  const rawAccessories = p.accessories ?? p.related_products ?? p.product_accessories ?? [];
  const accessories: NormalizedRelatedProduct[] = (Array.isArray(rawAccessories) ? rawAccessories : []).slice(0, 20).map((a: any) => {
    const img = a.product_gallery?.[0]?.image ?? a.image ?? a.image_url;
    const priceNum = (v: string | number) => (v != null ? Number(v) : 0);
    const price = priceNum(a.promotion_price ?? a.price) || priceNum(a.price);
    return {
      id: String(a.id ?? a.slug ?? ''),
      slug: String(a.slug ?? a.id ?? ''),
      name: a.name ?? a.title ?? 'Produs',
      price,
      imageUrl: img ?? null,
      inStock: a.is_stock ?? a.in_stock !== false,
    };
  });
  return {
    id: String(p.id ?? p.slug ?? ''),
    slug: String(p.slug ?? ''),
    name: p.name ?? p.title ?? 'Produs',
    price, oldPrice, currency: (p as any).currency ?? 'MDL', imageUrls,
    brand: typeof (p as any).brand === 'object' ? (p as any).brand?.name : (p as any).brand ?? '',
    code: p.code ?? '', model: p.model ?? '', inStock: p.is_stock ?? true, measure: p.measure ?? 'buc',
    categoryName: p.category?.name ?? '', subcategoryName: p.subcategory?.name ?? '',
    categorySlug: p.category?.slug ?? '', subcategorySlug: p.subcategory?.slug ?? '',
    labels: (p.label ?? []).map((l) => ({ name: l.name ?? '', bg_color: l.bg_color, font_color: l.font_color })),
    description: typeof p.description === 'string' ? p.description : '', balanceByStore, accessories,
  };
}

const HERO_ASPECT = 1.05;
const SHEET_RADIUS = 28;
/** Când există miniaturi, sheet-ul pornește mai jos ca să nu le acopere. */
const SHEET_MARGIN_WHEN_THUMBS = 12;

export default function CatalogProductScreen() {
  const { category: categorySlug, productId } = useLocalSearchParams<{ category: string; productId: string }>();
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const bottomInsetForMenu = useBottomMenuInset();
  const { isSmallScreen, scale } = useResponsive();
  const { addToCart } = useContext(CartContext);
  const insets = useSafeAreaInsets();
  const safeTop = insets.top + 8;

  const [product, setProduct] = useState<ReturnType<typeof normalizeProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message?: string } | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [fullscreenImageOpen, setFullscreenImageOpen] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<NormalizedRelatedProduct[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const imageCountRef = useRef(0);

  const toggleDescription = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 320,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setDescriptionExpanded((prev) => !prev);
  }, []);

  useEffect(() => {
    if (product) imageCountRef.current = product.imageUrls.length;
  }, [product]);

  useEffect(() => {
    if (fullscreenImageOpen) {
      RNStatusBar.setHidden(true, 'fade');
      if (Platform.OS === 'android') {
        RNStatusBar.setBackgroundColor('#000000');
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      }
    } else {
      RNStatusBar.setHidden(true, 'fade');
      if (Platform.OS === 'android') {
        RNStatusBar.setBackgroundColor('transparent');
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      }
    }
  }, [fullscreenImageOpen]);

  const openFullscreen = useCallback(() => setFullscreenImageOpen(true), []);
  const closeFullscreen = useCallback(() => setFullscreenImageOpen(false), []);

  const onFullscreenModalShow = useCallback(() => {
    RNStatusBar.setHidden(true, 'fade');
    if (Platform.OS === 'android') NavigationBar.setVisibilityAsync('hidden').catch(() => {});
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
        onPanResponderRelease: (_, g) => {
          const n = imageCountRef.current;
          if (n <= 1) {
            openFullscreen();
            return;
          }
          if (g.dx > 45) setGalleryIndex((i) => Math.max(0, i - 1));
          else if (g.dx < -45) setGalleryIndex((i) => Math.min(n - 1, i + 1));
          else openFullscreen();
        },
      }),
    [openFullscreen]
  );

  const fullscreenPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
        onPanResponderRelease: (_, g) => {
          const n = imageCountRef.current;
          if (n <= 1) {
            closeFullscreen();
            return;
          }
          if (g.dx > 45) setGalleryIndex((i) => Math.max(0, i - 1));
          else if (g.dx < -45) setGalleryIndex((i) => Math.min(n - 1, i + 1));
          else closeFullscreen();
        },
      }),
    [closeFullscreen]
  );

  const fetchRef = useRef<() => void>(() => {});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslate = useRef(new Animated.Value(30)).current;
  const { width } = Dimensions.get('window');
  const heroHeight = width * HERO_ASPECT;

  const slugOrId = productId ? decodeURIComponent(String(productId)) : '';

  useEffect(() => {
    if (!slugOrId) {
      setLoading(false);
      setError({ message: 'Lipsește identificatorul produsului.' });
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      setProduct(null);
      setGalleryIndex(0);
      const res = await apiClient.getShopProductBySlug(slugOrId);
      if (cancelled) return;
      if (res.error) {
        const msg = (res.error as any)?.message ?? (res.error as any)?.detail ?? 'Produsul nu a putut fi încărcat.';
        const is404 = (res.error as any)?.status === 404 || String(msg).toLowerCase().includes('not found');
        if (is404) {
          const mockProduct = getProductById(slugOrId);
          if (mockProduct) {
            setProduct({
              id: mockProduct.id, slug: mockProduct.slug ?? mockProduct.id, name: mockProduct.name,
              price: mockProduct.price, oldPrice: mockProduct.oldPrice ?? null, currency: mockProduct.currency,
              imageUrls: mockProduct.image_url ? [mockProduct.image_url] : [], brand: mockProduct.brand ?? '',
              code: mockProduct.sku ?? '', model: '', inStock: mockProduct.inStock !== false, measure: 'buc',
              categoryName: '', subcategoryName: '', categorySlug: categorySlug ?? '', subcategorySlug: '',
              labels: [], description: mockProduct.description ?? '', balanceByStore: [], accessories: [],
            });
            setError(null);
          } else setError({ message: 'Produs negăsit.' });
        } else setError({ message: msg });
      } else if (res.data && typeof res.data === 'object') {
        setProduct(normalizeProduct(res.data as ApiProduct));
        setError(null);
      } else setError({ message: 'Răspuns invalid de la server.' });
      setLoading(false);
    };
    fetchRef.current = run;
    run();
    return () => { cancelled = true; };
  }, [slugOrId]);

  useEffect(() => {
    if (!product?.categorySlug || !product?.subcategorySlug || !product.id) {
      setSimilarProducts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSimilarLoading(true);
      const res = await apiClient.getShopProducts({
        category__slug: product.categorySlug,
        subcategory__slug: product.subcategorySlug,
        page_size: 14,
        page: 1,
      });
      if (cancelled) return;
      const list = Array.isArray(res.data) ? res.data : [];
      const normalized: NormalizedRelatedProduct[] = list
        .filter((p: any) => String(p.id ?? p.slug) !== product.id && String(p.slug) !== product.slug)
        .slice(0, 14)
        .map((p: any) => {
          const img = p.product_gallery?.[0]?.image ?? p.image ?? p.image_url;
          const priceNum = (v: string | number) => (v != null ? Number(v) : 0);
          const price = priceNum(p.promotion_price ?? p.price) || priceNum(p.price);
          return {
            id: String(p.id ?? p.slug ?? ''),
            slug: String(p.slug ?? p.id ?? ''),
            name: p.name ?? p.title ?? 'Produs',
            price,
            imageUrl: img ?? null,
            inStock: p.is_stock ?? p.in_stock !== false,
          };
        });
      setSimilarProducts(normalized);
      setSimilarLoading(false);
    })();
    return () => { cancelled = true; };
  }, [product?.id, product?.slug, product?.categorySlug, product?.subcategorySlug]);

  useEffect(() => {
    if (!loading && product) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.spring(sheetTranslate, { toValue: 0, damping: 20, stiffness: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, product, fadeAnim, sheetTranslate]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    addToCart({
      id: product.id, name: product.name, price: product.price, currency: product.currency,
      image_url: product.imageUrls[0] ?? null,
    });
  }, [product, addToCart]);

  const styles = useMemo(() => getStyles(isSmallScreen, scale, width), [isSmallScreen, scale, width]);

  if (loading) {
    return (
      <Screen>
        <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
          <View style={[styles.loadingCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff', borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primaryButton} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Se încarcă produsul...</Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (error && !product) {
    return (
      <Screen>
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
          <View style={[styles.errorCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff', borderColor: colors.border }]}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
            <ApiErrorView message={error.message} onRetry={() => fetchRef.current()} />
            <TouchableOpacity onPress={() => router.back()} style={[styles.primaryLink, { backgroundColor: colors.primaryButton }]}>
              <Text style={styles.primaryLinkText}>Înapoi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen>
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
          <View style={[styles.errorCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff', borderColor: colors.border }]}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.notFoundTitle, { color: colors.text }]}>Produs negăsit</Text>
            <Text style={[styles.notFoundSubtitle, { color: colors.textMuted }]}>Verifică link-ul sau caută în catalog.</Text>
            <TouchableOpacity onPress={() => router.back()} style={[styles.primaryLink, { backgroundColor: colors.primaryButton }]}>
              <Text style={styles.primaryLinkText}>Înapoi la catalog</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    );
  }

  const mainImageUri = resolveImageUrl(product.imageUrls[galleryIndex] ?? product.imageUrls[0]) ?? '';
  const discountPct = product.oldPrice != null && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;

  return (
    <Screen fullBleedTop padded={false}>
      <View style={[styles.container, { backgroundColor: isDark ? '#0d0d0d' : '#f0f0f0' }]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomInsetForMenu + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero image full-bleed */}
          <View style={[styles.heroWrap, { height: heroHeight }]}>
            <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
              {mainImageUri ? (
                <Image source={{ uri: mainImageUri }} style={styles.heroImage} resizeMode="contain" />
              ) : (
                <View style={[styles.heroPlaceholder, { backgroundColor: isDark ? '#1f1f1f' : '#e8e8e8' }]}>
                  <Ionicons name="cube-outline" size={80} color={colors.textMuted} />
                </View>
              )}
            </View>
            {/* Floating back */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.floatingBack, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', top: safeTop }]}
              activeOpacity={0.8}
              accessibilityLabel="Înapoi"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            {/* Labels on image */}
            {product.labels.length > 0 && (
              <View style={[styles.heroLabels, { top: safeTop }]}>
                {product.labels.map((l, i) => (
                  <View key={i} style={[styles.heroLabelPill, { backgroundColor: l.bg_color ?? '#333' }]}>
                    <Text style={[styles.heroLabelText, { color: l.font_color ?? '#fff' }]}>{l.name}</Text>
                  </View>
                ))}
              </View>
            )}
            {discountPct > 0 && (
              <View style={styles.heroDiscountPill}>
                <Text style={styles.heroDiscountText}>−{discountPct}%</Text>
              </View>
            )}
            {/* Thumb strip */}
            {product.imageUrls.length > 1 && (
              <View style={[styles.thumbStrip, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.85)' }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbStripContent}>
                  {product.imageUrls.map((url, i) => {
                    const uri = resolveImageUrl(url) ?? '';
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setGalleryIndex(i)}
                        style={[styles.thumbStripItem, galleryIndex === i && styles.thumbStripItemActive]}
                      >
                        {uri ? (
                          <Image source={{ uri }} style={styles.thumbStripImg} resizeMode="cover" />
                        ) : (
                          <View style={[styles.thumbStripImg, styles.thumbStripPlaceholder]}>
                            <Ionicons name="image-outline" size={18} color={colors.textMuted} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Content sheet – mai jos când sunt miniaturi, ca să nu le acopere */}
          <Animated.View
              style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                marginTop: SHEET_MARGIN_WHEN_THUMBS,
              },
              { transform: [{ translateY: sheetTranslate }] },
            ]}
          >
            {/* Sheet handle */}
            <View style={[styles.sheetHandleWrap, { backgroundColor: colors.background }]}>
              <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />
            </View>
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Meta chips */}
              {(product.brand || product.code || product.model) && (
                <View style={styles.metaChips}>
                  {product.brand ? (
                    <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                      <Text style={[styles.chipText, { color: colors.textMuted }]}>{product.brand}</Text>
                    </View>
                  ) : null}
                  {product.code ? (
                    <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                      <Text style={[styles.chipText, { color: colors.textMuted }]}>Cod {product.code}</Text>
                    </View>
                  ) : null}
                  {product.model ? (
                    <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                      <Text style={[styles.chipText, { color: colors.textMuted }]}>{product.model}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Title */}
              <Text style={[styles.productTitle, { color: colors.text }]}>{product.name}</Text>

              {/* Preț */}
              <View style={styles.priceBlock}>
                <Text style={[styles.price, { color: colors.primaryButton }]}>
                  {product.price.toFixed(2)} <Text style={[styles.currency, { color: colors.textMuted }]}>{formatCurrencyDisplay(product.currency)}</Text>
                </Text>
                {product.oldPrice != null && product.oldPrice > product.price && (
                  <Text style={[styles.oldPrice, { color: colors.textMuted }]}>
                    {product.oldPrice.toFixed(2)} {formatCurrencyDisplay(product.currency)}
                  </Text>
                )}
              </View>

              {/* Unitate + Stoc – o linie ordonată */}
              <View style={styles.unitAndStockRow}>
                {product.measure ? (
                  <Text style={[styles.measureInline, { color: colors.textMuted }]}>Unitate: {product.measure}</Text>
                ) : null}
                <View style={[
                  styles.stockPill,
                  product.inStock ? (isDark ? styles.stockIn : styles.stockInLight) : (isDark ? styles.stockOut : styles.stockOutLight),
                ]}>
                  <Ionicons name={product.inStock ? 'checkmark-circle' : 'close-circle'} size={14} color={product.inStock ? '#0d8050' : '#c45a11'} />
                  <Text style={[styles.stockPillText, { color: product.inStock ? '#0d8050' : '#c45a11' }]}>
                    {product.inStock ? 'În stoc' : 'Stoc epuizat'}
                  </Text>
                </View>
              </View>

              {/* Buton Adaugă în coș – lățime completă */}
              <TouchableOpacity
                style={[styles.actionButton, styles.addToCartBtn, !product.inStock && styles.addToCartBtnDisabled]}
                onPress={handleAddToCart}
                activeOpacity={0.88}
                disabled={!product.inStock}
                accessibilityLabel={product.inStock ? 'Adaugă în coș' : 'Produs indisponibil'}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={product.inStock ? ['#FFEE00', '#FFD600'] : [isDark ? '#444' : '#ccc', isDark ? '#3a3a3a' : '#bbb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="cart" size={18} color={product.inStock ? '#000' : colors.textMuted} />
                <Text style={[styles.addToCartBtnText, { color: product.inStock ? '#000' : colors.textMuted }]}>
                  {product.inStock ? 'Adaugă în coș' : 'Indisponibil'}
                </Text>
              </TouchableOpacity>

              {product.balanceByStore.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.availabilityButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.28)' : '#e5e5e5' }]}
                  onPress={() => setAvailabilityModalOpen(true)}
                  activeOpacity={0.88}
                  accessibilityLabel="Vezi disponibilitatea în magazine"
                  accessibilityRole="button"
                >
                  <Ionicons name="storefront-outline" size={20} color={isDark ? '#ddd' : '#555'} />
                  <Text style={[styles.availabilityButtonText, { color: isDark ? '#f0f0f0' : '#333' }]}>Vezi disponibilitatea</Text>
                  <Ionicons name="chevron-forward" size={18} color={isDark ? '#ddd' : '#555'} />
                </TouchableOpacity>
              )}

              {product.description ? (
                <View style={styles.descSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Descriere</Text>
                  <Text
                    numberOfLines={descriptionExpanded ? undefined : 6}
                    style={styles.descWrapper}
                  >
                    <StyledHtmlText
                      html={product.description}
                      baseStyle={styles.description}
                      color={colors.textMuted}
                    />
                  </Text>
                  <TouchableOpacity
                    style={[styles.descShowMore, { borderColor: colors.border }]}
                    onPress={toggleDescription}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.descShowMoreText, { color: colors.textMuted }]}>
                      {descriptionExpanded ? 'Afișează mai puțin' : 'Descriere completă'}
                    </Text>
                    <Ionicons
                      name={descriptionExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Accesorii */}
              {product.accessories.length > 0 && (
                <View style={styles.relatedSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Accesorii</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScrollContent}>
                    {product.accessories.map((item) => (
                      <ProductCard
                        key={item.id}
                        product={{
                          id: item.id,
                          slug: item.slug,
                          name: item.name,
                          price: item.price,
                          currency: product.currency,
                          image_url: item.imageUrl,
                          inStock: item.inStock,
                          inStockLabel: item.inStock ? 'În stoc' : 'Stoc epuizat',
                        }}
                        categorySlug={categorySlug ?? product.categorySlug}
                        onAddToCart={() => {
                          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                          addToCart({ id: item.id, name: item.name, price: item.price, currency: product.currency, image_url: item.imageUrl });
                        }}
                        variant="compact"
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Produse similare */}
              {(similarProducts.length > 0 || similarLoading) && (
                <View style={styles.relatedSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Produse similare</Text>
                  {similarLoading ? (
                    <View style={styles.relatedLoading}>
                      <ActivityIndicator size="small" color={colors.primaryButton} />
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScrollContent}>
                      {similarProducts.map((item) => (
                        <ProductCard
                          key={item.id}
                          product={{
                            id: item.id,
                            slug: item.slug,
                            name: item.name,
                            price: item.price,
                            currency: product.currency,
                            image_url: item.imageUrl,
                            inStock: item.inStock,
                            inStockLabel: item.inStock ? 'În stoc' : 'Stoc epuizat',
                          }}
                          categorySlug={categorySlug ?? product.categorySlug ?? ''}
                          onAddToCart={() => {
                            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                            addToCart({ id: item.id, name: item.name, price: item.price, currency: product.currency, image_url: item.imageUrl });
                          }}
                          variant="compact"
                        />
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </Animated.View>
          </Animated.View>
        </ScrollView>

        {/* Fullscreen image modal */}
        <Modal
          visible={fullscreenImageOpen}
          transparent
          animationType="fade"
          onRequestClose={closeFullscreen}
          onShow={onFullscreenModalShow}
          statusBarTranslucent
          {...(Platform.OS === 'android' && { navigationBarTranslucent: true })}
        >
          <View style={[styles.fullscreenModalBackdrop, { marginTop: -insets.top, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={StyleSheet.absoluteFill} {...fullscreenPanResponder.panHandlers}>
              {mainImageUri ? (
                <Image source={{ uri: mainImageUri }} style={styles.fullscreenImage} resizeMode="contain" />
              ) : null}
            </View>
            <TouchableOpacity
              onPress={closeFullscreen}
              style={[styles.fullscreenCloseBtn, { top: safeTop }]}
              activeOpacity={0.8}
              accessibilityLabel="Închide"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {product && product.imageUrls.length > 1 && (
              <View style={styles.fullscreenPager}>
                <Text style={styles.fullscreenPagerText}>{galleryIndex + 1} / {product.imageUrls.length}</Text>
              </View>
            )}
          </View>
        </Modal>

        {/* Modal disponibilitate – fără overlay, stoc sortat de la mare la mic */}
        <Modal
          visible={availabilityModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setAvailabilityModalOpen(false)}
          statusBarTranslucent
          {...(Platform.OS === 'android' && { navigationBarTranslucent: true })}
        >
          <View style={[styles.availabilityModalRoot, { marginTop: -insets.top, paddingTop: insets.top }]}>
            <TouchableOpacity
              style={styles.availabilityModalBackdrop}
              activeOpacity={1}
              onPress={() => setAvailabilityModalOpen(false)}
            />
            <View style={[styles.availabilityModalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.availabilityModalHandleWrap, { backgroundColor: colors.background }]}>
                <View style={[styles.availabilityModalHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />
              </View>
              <View style={[styles.availabilityModalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.availabilityModalTitle, { color: colors.text }]}>Disponibilitate în magazine</Text>
                <TouchableOpacity
                  onPress={() => setAvailabilityModalOpen(false)}
                  style={[styles.availabilityModalClose, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                  accessibilityLabel="Închide"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.availabilityModalList}
                contentContainerStyle={styles.availabilityModalListContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {product && [...product.balanceByStore]
                  .sort((a, b) => b.balance - a.balance)
                  .map((b, i) => (
                    <View
                      key={i}
                      style={[
                        styles.availabilityRow,
                        { borderBottomColor: colors.border, backgroundColor: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') },
                        i === product.balanceByStore.length - 1 && styles.availabilityRowLast,
                      ]}
                    >
                      <Text style={[styles.availabilityStore, { color: colors.text }]} numberOfLines={1}>
                        {b.storeName}
                      </Text>
                      <View style={[styles.availabilityQtyBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                        <Text style={[styles.availabilityQty, { color: colors.text }]}>
                          {b.balance} {product.measure}
                        </Text>
                      </View>
                    </View>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

function getStyles(isSmallScreen: boolean, scale: number, width: number): Record<string, ViewStyle | TextStyle> {
  const r = (n: number) => responsiveSize(n, scale);
  const padH = r(20);
  return {
    container: { flex: 1 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    loadingCard: {
      paddingVertical: r(32),
      paddingHorizontal: r(28),
      borderRadius: r(20),
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      minWidth: 200,
    },
    loadingText: { marginTop: r(14), fontSize: r(15), fontWeight: '500' },
    errorCard: {
      paddingVertical: r(28),
      paddingHorizontal: r(24),
      borderRadius: r(20),
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      maxWidth: 320,
    },
    backLink: { marginTop: r(18), padding: r(12) },
    primaryLink: {
      marginTop: r(20),
      paddingVertical: r(14),
      paddingHorizontal: r(24),
      borderRadius: r(14),
      alignSelf: 'stretch',
    },
    primaryLinkText: { fontSize: r(15), fontWeight: '700', color: '#000' },
    notFoundTitle: { fontSize: r(18), fontWeight: '700', marginTop: r(12), textAlign: 'center' },
    notFoundSubtitle: { fontSize: r(14), marginTop: r(6), textAlign: 'center' },

    heroWrap: { width, position: 'relative', overflow: 'hidden' },
    heroImage: { width: '100%', height: '100%' },
    heroPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    floatingBack: {
      position: 'absolute',
      left: padH,
      width: r(44),
      height: r(44),
      borderRadius: r(22),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    heroLabels: {
      position: 'absolute',
      right: padH,
      flexDirection: 'row',
      gap: r(6),
    },
    heroLabelPill: {
      paddingHorizontal: r(10),
      paddingVertical: r(6),
      borderRadius: r(8),
    },
    heroLabelText: { fontSize: r(11), fontWeight: '800', letterSpacing: 0.5 },
    heroDiscountPill: {
      position: 'absolute',
      bottom: r(14),
      right: padH,
      paddingHorizontal: r(12),
      paddingVertical: r(8),
      borderRadius: r(10),
      backgroundColor: '#B71C1C',
    },
    heroDiscountText: { fontSize: r(13), fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

    thumbStrip: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingVertical: r(10),
      paddingHorizontal: padH,
    },
    thumbStripContent: { flexDirection: 'row', gap: r(8) },
    thumbStripItem: {
      width: r(48),
      height: r(48),
      borderRadius: r(10),
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    thumbStripItemActive: { borderColor: '#FFEE00' },
    thumbStripImg: { width: '100%', height: '100%' },
    thumbStripPlaceholder: { backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' },

    fullscreenModalBackdrop: {
      flex: 1,
      backgroundColor: '#000',
    },
    fullscreenImage: {
      width: '100%',
      height: '100%',
    },
    fullscreenCloseBtn: {
      position: 'absolute',
      right: padH,
      width: r(44),
      height: r(44),
      borderRadius: r(22),
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullscreenPager: {
      position: 'absolute',
      bottom: r(24) + 34,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    fullscreenPagerText: {
      fontSize: r(14),
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '600',
    },

    sheet: {
      borderTopLeftRadius: SHEET_RADIUS,
      borderTopRightRadius: SHEET_RADIUS,
      paddingHorizontal: padH,
      paddingTop: r(12),
      paddingBottom: r(32),
      minHeight: 260,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16 },
        android: { elevation: 12 },
      }),
    },
    sheetHandleWrap: { alignItems: 'center', paddingBottom: r(8) },
    sheetHandle: { width: r(36), height: r(4), borderRadius: 2 },
    metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: r(8), marginBottom: r(14) },
    chip: {
      paddingHorizontal: r(12),
      paddingVertical: r(8),
      borderRadius: r(20),
    },
    chipText: { fontSize: r(12), fontWeight: '600' },
    productTitle: {
      fontSize: r(isSmallScreen ? 22 : 24),
      fontWeight: '800',
      letterSpacing: -0.6,
      lineHeight: r(30),
      marginBottom: r(16),
    },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: r(10), marginBottom: r(8) },
    priceBlock: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: r(10),
      marginBottom: r(12),
    },
    price: { fontSize: r(32), fontWeight: '800', letterSpacing: -0.8 },
    currency: { fontSize: r(18), fontWeight: '600' },
    oldPrice: { fontSize: r(16), textDecorationLine: 'line-through', marginTop: 2 },
    unitAndStockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: r(14),
      gap: r(12),
    },
    measureInline: { fontSize: r(14), fontWeight: '500' },
    stockAndCta: { flexDirection: 'row', alignItems: 'center', gap: r(8), flexShrink: 0 },
    stockPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: r(10),
      paddingVertical: r(6),
      borderRadius: r(18),
      gap: r(4),
    },
    stockIn: { backgroundColor: 'rgba(13,128,80,0.18)' },
    stockInLight: { backgroundColor: 'rgba(13,128,80,0.12)' },
    stockOut: { backgroundColor: 'rgba(196,90,17,0.18)' },
    stockOutLight: { backgroundColor: 'rgba(196,90,17,0.12)' },
    stockPillText: { fontSize: r(12), fontWeight: '700' },
    actionButton: {
      alignSelf: 'stretch',
      height: r(48),
      borderRadius: r(12),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: r(8),
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
        android: { elevation: 4 },
      }),
    },
    addToCartBtn: {},
    addToCartBtnDisabled: { opacity: 0.85 },
    addToCartBtnText: { fontSize: r(15), fontWeight: '700', letterSpacing: 0.2 },
    measure: { fontSize: r(13), marginBottom: r(20) },
    sectionTitle: { fontSize: r(14), fontWeight: '700', letterSpacing: 0.3, marginBottom: r(10) },
    descSection: { marginTop: r(20), marginBottom: r(24) },
    descWrapper: { marginBottom: 0 },
    descShowMore: {
      marginTop: r(12),
      paddingVertical: r(12),
      paddingHorizontal: r(16),
      borderWidth: 1,
      borderRadius: r(12),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: r(8),
    },
    descShowMoreText: { fontSize: r(15), fontWeight: '700' },
    description: { fontSize: r(15), lineHeight: r(24), fontWeight: '400' },
    availabilityButton: { marginTop: r(20) },
    availabilityButtonText: { fontSize: r(15), fontWeight: '700', letterSpacing: 0.2 },
    availabilitySection: {
      marginTop: r(20),
      padding: r(16),
      borderRadius: r(16),
      borderWidth: StyleSheet.hairlineWidth,
    },
    availabilityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: r(14),
      paddingHorizontal: padH,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    availabilityRowLast: { borderBottomWidth: 0 },
    availabilityStore: { fontSize: r(15), flex: 1, fontWeight: '500' },
    availabilityQty: { fontSize: r(14), fontWeight: '700' },
    availabilityQtyBadge: {
      paddingHorizontal: r(12),
      paddingVertical: r(6),
      borderRadius: r(10),
      minWidth: r(72),
      alignItems: 'flex-end',
    },
    availabilityModalRoot: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },
    availabilityModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    availabilityModalContent: {
      borderTopLeftRadius: r(24),
      borderTopRightRadius: r(24),
      maxHeight: '72%',
      paddingBottom: r(28),
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20 },
        android: { elevation: 16 },
      }),
    },
    availabilityModalHandleWrap: {
      alignItems: 'center',
      paddingVertical: r(10),
      paddingBottom: r(4),
    },
    availabilityModalHandle: {
      width: r(40),
      height: r(4),
      borderRadius: 2,
    },
    availabilityModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: padH,
      paddingVertical: r(18),
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    availabilityModalTitle: { fontSize: r(18), fontWeight: '700', letterSpacing: -0.3 },
    availabilityModalClose: {
      width: r(40),
      height: r(40),
      borderRadius: r(20),
      alignItems: 'center',
      justifyContent: 'center',
    },
    availabilityModalList: { maxHeight: 320 },
    availabilityModalListContent: { paddingBottom: r(20) },
    relatedSection: { marginTop: r(24), marginBottom: r(24) },
    relatedScrollContent: { flexDirection: 'row', gap: r(12), paddingRight: padH, paddingBottom: r(20) },
    relatedLoading: { paddingVertical: r(24), alignItems: 'center' },
  };
}
