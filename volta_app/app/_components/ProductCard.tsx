/**
 * Card produs partajat – aceeași imagine pe toate paginile (listă catalog, accesorii, produse similare).
 */
import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../_context/ThemeContext';
import { getColors, formatCurrencyDisplay } from '../_components/theme';
import { resolveImageUrl } from '../../lib/apiClient';
import { useResponsive, responsiveSize } from '../_hooks/useResponsive';

export interface ProductCardProduct {
  id: string;
  slug?: string;
  name: string;
  price: number;
  currency: string;
  image_url?: string | null;
  imageUrl?: string | null;
  brand?: string;
  sku?: string;
  oldPrice?: number | null;
  inStock?: boolean;
  inStockLabel?: string;
}

export interface ProductCardProps {
  product: ProductCardProduct;
  categorySlug: string;
  onAddToCart: () => void;
  variant?: 'grid' | 'compact';
}

export default function ProductCard({ product, categorySlug, onAddToCart, variant = 'grid' }: ProductCardProps) {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const { scale } = useResponsive();
  const styles = getStyles(scale, variant);

  const imageUri = resolveImageUrl(product.image_url ?? product.imageUrl ?? null);
  const slug = product.slug ?? product.id;
  const inStock = product.inStock !== false;
  const showOldPrice = product.oldPrice != null && product.oldPrice > product.price;
  const discountPct = showOldPrice ? Math.round((1 - product.price / product.oldPrice!) * 100) : 0;

  const handlePress = () => {
    router.push(`/catalog/${categorySlug}/${encodeURIComponent(slug)}`);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', shadowColor: '#000' },
      ]}
    >
      <TouchableOpacity style={{ flex: 1 }} onPress={handlePress} activeOpacity={0.88}>
        <View style={[styles.imageWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <Ionicons name="cube-outline" size={variant === 'compact' ? 32 : 44} color={colors.textMuted} />
          )}
          {showOldPrice && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>REDUCERE</Text>
              <Text style={styles.discountBadgePercent}>-{discountPct}%</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          {product.brand ? (
            <Text style={[styles.brand, { color: colors.textMuted }]} numberOfLines={1}>{product.brand}</Text>
          ) : null}
          {product.sku ? (
            <Text style={[styles.sku, { color: colors.textMuted }]} numberOfLines={1}>Cod: {product.sku}</Text>
          ) : null}
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
          {product.inStockLabel != null && product.inStockLabel !== '' ? (
            <View style={[styles.stockBadge, inStock ? { backgroundColor: isDark ? 'rgba(0,200,100,0.2)' : 'rgba(0,160,80,0.12)' } : { backgroundColor: isDark ? 'rgba(255,100,0,0.2)' : 'rgba(200,80,0,0.12)' }]}>
              <Ionicons name={inStock ? 'checkmark-circle' : 'alert-circle'} size={16} color={inStock ? '#0d8050' : '#c45a11'} style={{ marginRight: 6 }} />
              <Text style={[styles.stockBadgeText, { color: colors.text }]} numberOfLines={1}>{product.inStockLabel}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={styles.priceBlock}>
          {showOldPrice ? (
            <Text style={[styles.oldPrice, { color: colors.textMuted }]}>{product.oldPrice} {formatCurrencyDisplay(product.currency)}</Text>
          ) : (
            <View style={styles.pricePlaceholder} />
          )}
          <Text style={[styles.price, { color: colors.textMuted }]}>{product.price} {formatCurrencyDisplay(product.currency)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToCartBtn, { backgroundColor: colors.primaryButton || '#FFEE00' }]}
          onPress={onAddToCart}
          activeOpacity={0.85}
          disabled={!inStock}
        >
          <Ionicons name="cart" size={variant === 'compact' ? 16 : 20} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getStyles(scale: number, variant: 'grid' | 'compact'): Record<string, ViewStyle | Record<string, unknown>> {
  const r = (n: number) => responsiveSize(n, scale);
  const isCompact = variant === 'compact';
  return {
    card: {
      width: isCompact ? r(140) : '47%',
      marginBottom: isCompact ? 0 : r(12),
      borderRadius: r(12),
      overflow: 'hidden',
      borderWidth: 0,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    imageWrap: {
      width: '100%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      flexShrink: 0,
    },
    image: { width: '100%', height: '100%' },
    discountBadge: {
      position: 'absolute',
      top: r(8),
      left: r(8),
      paddingHorizontal: r(8),
      paddingVertical: r(6),
      borderRadius: r(6),
      backgroundColor: '#B71C1C',
      alignItems: 'center',
      justifyContent: 'center',
    },
    discountBadgeText: { fontSize: r(9), fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
    discountBadgePercent: { fontSize: r(10), fontWeight: '800', color: '#fff', marginTop: 1 },
    body: {
      padding: r(isCompact ? 8 : 14),
      minWidth: 0,
      gap: r(4),
      flexShrink: 0,
    },
    brand: { fontSize: r(10), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: r(2) },
    sku: { fontSize: r(11), marginBottom: r(4) },
    name: {
      fontSize: r(isCompact ? 12 : 14),
      fontWeight: '600',
      lineHeight: r(isCompact ? 16 : 20),
      marginBottom: r(2),
      flexShrink: 1,
    },
    stockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: r(4),
      marginBottom: r(4),
      paddingHorizontal: r(8),
      paddingVertical: r(4),
      borderRadius: r(6),
      flexShrink: 0,
      alignSelf: 'flex-start',
    },
    stockBadgeText: { fontSize: r(10), fontWeight: '600' },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: r(isCompact ? 8 : 14),
      paddingVertical: r(isCompact ? 8 : 10),
      gap: r(8),
      flexShrink: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    priceBlock: { flexDirection: 'column', alignItems: 'flex-start', gap: r(2), minWidth: 0, flexShrink: 0 },
    price: { fontSize: r(isCompact ? 14 : 16), fontWeight: '800', flexShrink: 0 },
    oldPrice: { fontSize: r(11), textDecorationLine: 'line-through', flexShrink: 0 },
    pricePlaceholder: { height: r(14), width: 1 },
    addToCartBtn: {
      width: r(isCompact ? 36 : 44),
      height: r(isCompact ? 36 : 44),
      borderRadius: r(10),
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
  };
}
