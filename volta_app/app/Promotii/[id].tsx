import React, { useEffect, useState, useContext, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../_context/ThemeContext';
import { CartContext } from '../_context/CartContext';
import { getColors, spacing, formatCurrencyDisplay } from '../_components/theme';
import { apiClient, resolveImageUrl } from '../../lib/apiClient';
import StyledHtmlText from '../_components/StyledHtmlText';
import Screen from '../_components/Screen';
import { useResponsive, responsiveSize } from '../_hooks/useResponsive';
import { getProductById, MOCK_CATEGORIES, MOCK_PRODUCTS } from '../../data/catalogMock';
import type { CatalogProduct } from '../../data/catalogMock';

const DESCRIERE_FICTIVA = 'Oferta limitată. Beneficiați de prețuri avantajoase pe produsele selectate până la data limită. Condițiile complete sunt afișate în magazin.';

function getCategorySlugByCategoryId(categoryId: string): string {
  const cat = MOCK_CATEGORIES.find((c) => c.id === categoryId);
  return cat?.slug ?? 'iluminare';
}

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

interface Promotion {
  id: number;
  title: string;
  image?: string;
  image_url?: string;
  deadline: string;
  created_at?: string;
  description?: string | null;
  product_ids?: string[] | null;
}

export default function PromotieDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const { addToCart } = useContext(CartContext);
  const isDark = theme === 'dark';
  const { scale } = useResponsive();
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (id) fetchPromo();
  }, [id]);

  const fetchPromo = async () => {
    setLoading(true);
    try {
      const promoId = typeof id === 'string' ? id : String(id);
      const { data, error } = await apiClient.getSliderPromotionBySlug(promoId);
      if (error) {
        const fallback = await apiClient.getPromotion(promoId);
        if (fallback.data) setPromo(fallback.data as Promotion);
        else setPromo(null);
      } else if (data) {
        setPromo(data as Promotion);
        setImageError(false);
      } else {
        setPromo(null);
      }
    } catch (err) {
      setPromo(null);
    } finally {
      setLoading(false);
    }
  };

  const imageUri = (promo?.image_url ? resolveImageUrl(promo.image_url) : null) || (promo?.image ? resolveImageUrl(promo.image) : null);
  const deadlineTime = promo?.deadline ? new Date(promo.deadline).getTime() : 0;
  const now = Date.now();
  const isExpired = deadlineTime <= now;
  const daysLeft =
    !isExpired && deadlineTime
      ? Math.floor((deadlineTime - now) / (1000 * 60 * 60 * 24))
      : 0;

  useEffect(() => {
    if (!promo || isExpired) return;
    const update = () => {
      const n = Date.now();
      const dist = deadlineTime - n;
      if (dist <= 0) {
        setTimer({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimer({
        days: Math.floor(dist / (1000 * 60 * 60 * 24)),
        hours: Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((dist % 60000) / 1000),
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [promo, deadlineTime, isExpired]);

  const promoProducts = useMemo(() => {
    const ids = promo?.product_ids;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      return ids
        .map((productId) => getProductById(String(productId)))
        .filter((p): p is CatalogProduct => p != null);
    }
    return MOCK_PRODUCTS.slice(0, 4);
  }, [promo?.product_ids]);

  const descriptionToShow = (promo?.description && promo.description.trim()) ? promo.description : DESCRIERE_FICTIVA;

  const productCardWidth = useMemo(() => {
    const paddingH = 20;
    const gap = 10;
    const fullWidth = (width - paddingH * 2 - gap) / 2;
    return Math.floor(fullWidth * 0.8);
  }, [width]);

  const productCardStyles = useMemo(() => ({
    card: {
      marginRight: 10,
      borderRadius: responsiveSize(12, scale),
      borderWidth: 0,
      overflow: 'hidden' as const,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    imageWrap: {
      width: '100%' as const,
      aspectRatio: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      position: 'relative' as const,
      flexShrink: 0,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    },
    discountBadge: {
      position: 'absolute' as const,
      top: responsiveSize(8, scale),
      left: responsiveSize(8, scale),
      paddingHorizontal: responsiveSize(8, scale),
      paddingVertical: responsiveSize(6, scale),
      borderRadius: responsiveSize(6, scale),
      backgroundColor: '#B71C1C',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    discountBadgeText: {
      fontSize: responsiveSize(9, scale),
      fontWeight: '800' as const,
      color: '#fff',
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    discountBadgePercent: {
      fontSize: responsiveSize(10, scale),
      fontWeight: '800' as const,
      color: '#fff',
      marginTop: 1,
    },
    body: {
      padding: responsiveSize(14, scale),
      flex: 1,
      minWidth: 0,
      gap: responsiveSize(4, scale),
      flexShrink: 0,
    },
    brand: {
      fontSize: responsiveSize(10, scale),
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginBottom: responsiveSize(2, scale),
    },
    name: {
      fontSize: responsiveSize(14, scale),
      fontWeight: '600' as const,
      lineHeight: responsiveSize(20, scale),
      marginBottom: responsiveSize(6, scale),
      flexShrink: 1,
    },
    footer: {
      flexDirection: 'column' as const,
      alignItems: 'flex-start' as const,
      gap: responsiveSize(8, scale),
      flexShrink: 0,
      marginTop: responsiveSize(6, scale),
    },
    priceBlock: {
      flexDirection: 'column' as const,
      alignItems: 'flex-start' as const,
      gap: responsiveSize(2, scale),
      minWidth: 0,
      flexShrink: 0,
    },
    price: {
      fontSize: responsiveSize(16, scale),
      fontWeight: '800' as const,
      flexShrink: 0,
    },
    oldPrice: {
      fontSize: responsiveSize(11, scale),
      textDecorationLine: 'line-through' as const,
      flexShrink: 0,
    },
    pricePlaceholder: {
      height: responsiveSize(14, scale),
      width: 1,
    },
  }), [scale, isDark, colors.primaryButton]);

  if (loading) {
    return (
      <Screen>
        <View style={[styles.loader, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.text} size="large" />
          <Text style={{ color: colors.text, marginTop: 8, fontSize: 16 }}>Se încarcă...</Text>
        </View>
      </Screen>
    );
  }

  if (!promo) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorText, { color: colors.text }]}>Promoția nu a fost găsită.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <LinearGradient colors={['#FFEE00', '#FFEE00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.backBtnGradient}>
              <Ionicons name="arrow-back" size={20} color="#000" />
              <Text style={styles.backText}>Înapoi</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Poza (ca pe pagina promoții, fără text pe ea) */}
        {imageUri && !imageError ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          </View>
        ) : (
          <View style={[styles.imageContainer, styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
            <Ionicons name="image-outline" size={64} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.contentWrapper}>
          {/* 2. Titlu */}
          <Text style={[styles.title, { color: colors.text }]}>{promo.title}</Text>

          {/* 3. Timer full width (zile, ore, min) */}
          <View style={styles.timerBox}>
            {!isExpired && timer ? (
              <View style={styles.timerRow}>
                <View style={styles.timerBlock}>
                  <Text style={styles.timerValue}>{timer.days}</Text>
                  <Text style={styles.timerUnit}>{timer.days === 1 ? 'zi' : 'zile'}</Text>
                </View>
                <Text style={styles.timerSeparator}> : </Text>
                <View style={styles.timerBlock}>
                  <Text style={styles.timerValue}>{String(timer.hours).padStart(2, '0')}</Text>
                  <Text style={styles.timerUnit}>ore</Text>
                </View>
                <Text style={styles.timerSeparator}> : </Text>
                <View style={styles.timerBlock}>
                  <Text style={styles.timerValue}>{String(timer.minutes).padStart(2, '0')}</Text>
                  <Text style={styles.timerUnit}>min</Text>
                </View>
              </View>
            ) : isExpired ? (
              <Text style={[styles.timerBoxTextExpired, { textAlign: 'center' }]}>EXPIRATĂ</Text>
            ) : null}
          </View>

          {/* 4. Descriere (sau text fictiv până există date reale) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Descriere</Text>
            <StyledHtmlText
              html={descriptionToShow}
              baseStyle={styles.description}
              color={colors.text}
            />
          </View>

          {/* 5. Lista de produse – carduri pe orizontala (ca în catalog) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Produse incluse</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productScrollContent}
            >
              {promoProducts.map((product) => (
                <View
                  key={product.id}
                  style={[
                    styles.productCard,
                    productCardStyles.card,
                    { width: productCardWidth, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', shadowColor: '#000' },
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={0.88}
                    onPress={() => {
                      const categorySlug = getCategorySlugByCategoryId(product.categoryId);
                      router.push({
                        pathname: '/catalog/[category]/[productId]',
                        params: { category: categorySlug, productId: product.id },
                      } as any);
                    }}
                  >
                  <View style={productCardStyles.imageWrap}>
                    {product.image_url ? (
                      <Image source={{ uri: product.image_url }} style={styles.productCardImage} resizeMode="cover" />
                    ) : (
                      <Ionicons name="cube-outline" size={44} color={colors.textMuted} />
                    )}
                    {product.oldPrice != null && product.oldPrice > product.price && (
                      <View style={productCardStyles.discountBadge}>
                        <Text style={productCardStyles.discountBadgeText}>REDUCERE</Text>
                        <Text style={productCardStyles.discountBadgePercent}>
                          -{Math.round((1 - product.price / product.oldPrice) * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={productCardStyles.body}>
                    {product.brand ? (
                      <Text style={[productCardStyles.brand, { color: colors.textMuted }]} numberOfLines={1}>{product.brand}</Text>
                    ) : null}
                    {product.sku ? (
                      <Text style={[styles.productCardSku, { color: colors.textMuted }]} numberOfLines={1}>Cod: {product.sku}</Text>
                    ) : null}
                    <Text style={[productCardStyles.name, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
                    {product.inStockLabel ? (
                      <View style={[styles.stockBadge, product.inStock !== false ? { backgroundColor: isDark ? 'rgba(0,200,100,0.2)' : 'rgba(0,160,80,0.12)' } : { backgroundColor: isDark ? 'rgba(255,100,0,0.2)' : 'rgba(200,80,0,0.12)' }]}>
                        <Ionicons
                          name={product.inStock !== false ? 'checkmark-circle' : 'alert-circle'}
                          size={16}
                          color={product.inStock !== false ? '#0d8050' : '#c45a11'}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.stockBadgeText, { color: colors.text }]} numberOfLines={1}>{product.inStockLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                  </TouchableOpacity>
                  <View style={[styles.productFooterRow, { borderTopColor: colors.border }]}>
                    <View style={productCardStyles.priceBlock}>
                      {product.oldPrice != null && product.oldPrice > product.price ? (
                        <Text style={[productCardStyles.oldPrice, { color: colors.textMuted }]}>{product.oldPrice} {formatCurrencyDisplay(product.currency)}</Text>
                      ) : (
                        <View style={productCardStyles.pricePlaceholder} />
                      )}
                      <Text style={[productCardStyles.price, { color: colors.primaryButton || '#FFEE00' }]}>
                        {product.price} {formatCurrencyDisplay(product.currency)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.addToCartBtn, { backgroundColor: colors.primaryButton || '#FFEE00' }]}
                      onPress={() => addToCart({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        currency: product.currency,
                        image_url: product.image_url || null,
                      })}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="cart" size={20} color="#000" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <LinearGradient colors={['#FFEE00', '#FFD700']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.backBtnGradient}>
            <Ionicons name="arrow-back" size={20} color="#000" />
            <Text style={styles.backText}>Înapoi la promoții</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { textAlign: 'center', marginTop: 50, fontSize: 16, marginBottom: 24 },
  imageContainer: {
    width: width,
    marginTop: spacing.lg,
    height: 180,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  contentWrapper: { paddingHorizontal: 20, paddingTop: 20 },
  title: {
    fontSize: isSmallScreen ? 22 : 26,
    fontWeight: '800',
    marginBottom: 16,
    lineHeight: 32,
    letterSpacing: 0.3,
  },
  timerBox: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: '#FFEB3B',
    borderWidth: 0,
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    gap: 4,
  },
  timerBlock: {
    alignItems: 'center',
  },
  timerValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  timerUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
    opacity: 0.9,
  },
  timerSeparator: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginHorizontal: 6,
  },
  timerBoxTextExpired: {
    fontSize: 13,
    fontWeight: '800',
    color: '#666',
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: isSmallScreen ? 15 : 16,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  productScrollContent: {
    paddingRight: 20,
  },
  productCard: {},
  productCardImage: {
    width: '100%',
    height: '100%',
  },
  productCardSku: {
    fontSize: 11,
    marginBottom: 6,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addToCartBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  backBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  backText: {
    color: '#000',
    fontWeight: '700',
    fontSize: isSmallScreen ? 15 : 16,
    letterSpacing: 0.5,
  },
});
