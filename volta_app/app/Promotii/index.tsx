import React, { useEffect, useState, useContext, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../_context/ThemeContext';
import Screen from '../_components/Screen';
import { getColors } from '../_components/theme';
import { usePromotions } from '../../hooks/usePromotions';
import ApiErrorView from '../_components/ApiErrorView';
import EmptyState from '../_components/EmptyState';
import { SkeletonCard } from '../_components/Skeleton';
import { useResponsive, responsiveSize, responsiveWidth, responsiveHeight } from '../_hooks/useResponsive';
import { resolveImageUrl } from '../../lib/apiClient';
import { filterAndSortPromotions, type PromoNormalized } from '../../lib/promotions';

type Promo = PromoNormalized & { title?: string; created_at?: string };

export default function Promotii() {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const { width, height, isSmallScreen, scale } = useResponsive();
  const [timers, setTimers] = useState<Record<string, { days: number; hours: number; minutes: number; expired: boolean; expiredDays: number }>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const { data: rawPromos, isLoading: loading, isError: promotionsError, error: promotionsErrorObj, refetch: refetchPromotions } = usePromotions();

  const promos = useMemo(() => filterAndSortPromotions((rawPromos ?? []) as any), [rawPromos]);

  const ITEM_HEIGHT = useMemo(() => {
    const pad = responsiveSize(4, scale) * 2;
    const cardWidth = width - pad;
    return Math.round(cardWidth / 2.4);
  }, [width, scale]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (promos.length === 0) return;
    const now = Date.now();
    const initialTimers: Record<string, { days: number; hours: number; minutes: number; expired: boolean; expiredDays: number }> = {};
    promos.forEach((promo: Promo) => {
      const deadlineTime = new Date(promo.deadline).getTime();
      const distance = deadlineTime - now;
      if (distance <= 0) {
        const expiredDays = Math.floor((now - deadlineTime) / (1000 * 60 * 60 * 24));
        initialTimers[promo.id] = { days: 0, hours: 0, minutes: 0, expired: true, expiredDays };
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        initialTimers[promo.id] = { days, hours, minutes, expired: false, expiredDays: 0 };
      }
    });
    setTimers(initialTimers);
  }, [promos]);

  useEffect(() => {
    if (promos.length === 0) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const updated: Record<string, { days: number; hours: number; minutes: number; expired: boolean; expiredDays: number }> = {};
      promos.forEach((promo: Promo) => {
        const deadlineTime = new Date(promo.deadline).getTime();
        const distance = deadlineTime - now;
        if (distance <= 0) {
          const expiredDays = Math.floor((now - deadlineTime) / (1000 * 60 * 60 * 24));
          if (expiredDays < 1) {
            updated[promo.id] = { days: 0, hours: 0, minutes: 0, expired: true, expiredDays };
          }
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          updated[promo.id] = { days, hours, minutes, expired: false, expiredDays: 0 };
        }
      });
      setTimers(updated as any);
    }, 1000);
    return () => clearInterval(interval);
  }, [promos]);

  const getImageUri = useCallback((promo: Promo) => resolveImageUrl(promo.image) || '', []);

  const responsiveStyles = useMemo(() => getStyles(isSmallScreen, scale, width), [isSmallScreen, scale, width]);

  const sortedPromos = useMemo(() => {
    const now = Date.now();
    return [...promos].sort((a, b) => {
      const aTimer = timers[a.id];
      const bTimer = timers[b.id];
      const aExpired = aTimer?.expired ?? (new Date(a.deadline).getTime() <= now);
      const bExpired = bTimer?.expired ?? (new Date(b.deadline).getTime() <= now);
      if (!aExpired && bExpired) return -1;
      if (aExpired && !bExpired) return 1;
      if (!aExpired && !bExpired) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [promos, timers]);

  return (
    <Screen>
      <View style={[responsiveStyles.container, { backgroundColor: colors.background }]}>
        {promotionsError ? (
          <View style={[responsiveStyles.emptyContainer, { justifyContent: 'center', paddingVertical: 40 }]}>
            <ApiErrorView
              message={promotionsErrorObj?.message ?? undefined}
              onRetry={() => refetchPromotions()}
            />
          </View>
        ) : loading ? (
          <ScrollView contentContainerStyle={responsiveStyles.list} showsVerticalScrollIndicator={false}>
            <SkeletonCard width={width - 40} height={ITEM_HEIGHT} />
            <SkeletonCard width={width - 40} height={ITEM_HEIGHT} />
            <SkeletonCard width={width - 40} height={ITEM_HEIGHT} />
          </ScrollView>
        ) : promos.length === 0 ? (
          <EmptyState
            icon="pricetag-outline"
            title={(rawPromos?.length ?? 0) > 0 ? 'Toate promoțiile au expirat.' : 'Momentan nu există promoții active.'}
          />
        ) : promos.length > 0 && promos.some(p => !timers[p.id]) ? (
          <View style={responsiveStyles.loadingContainer}>
            <ActivityIndicator color={colors.text} size="large" />
            <Text style={[responsiveStyles.loadingText, { color: colors.text }]}>Se încarcă promoțiile...</Text>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ScrollView contentContainerStyle={responsiveStyles.list} showsVerticalScrollIndicator={false}>
              {sortedPromos.map((p, index) => {
                const imageUri = getImageUri(p);
                const timeLeft = timers[p.id];
                const isExpired = timeLeft?.expired || false;
                const daysLeft = timeLeft && !timeLeft.expired ? timeLeft.days : 0;

                const openPromo = () => {
                  router.push({ pathname: '/Promotii/[id]', params: { id: String(p.id) } } as any);
                };

                return (
                  <View
                    key={p.id}
                    pointerEvents="box-none"
                    style={[responsiveStyles.promoItemWrapper, { marginBottom: index < sortedPromos.length - 1 ? 24 : 0 }]}
                  >
                    <TouchableOpacity
                      style={[responsiveStyles.cardImageWrap, { height: ITEM_HEIGHT }]}
                      activeOpacity={0.9}
                      onPress={openPromo}
                    >
                      <View style={styles.imageContainer}>
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" onError={() => {}} />
                        ) : (
                          <View style={[styles.image, styles.imagePlaceholder]}>
                            <Ionicons name="image-outline" size={48} color={colors.textMuted} />
                          </View>
                        )}
                      </View>
                      {!isExpired && timeLeft && (
                        <View style={[responsiveStyles.daysBanner, { borderColor: '#E65100' }]}>
                          <Text style={[responsiveStyles.daysBannerText, { color: '#E65100' }]}>
                            {daysLeft > 0 ? `VA MAI DURA ${daysLeft} ${daysLeft === 1 ? 'ZI' : 'ZILE'}` : 'EXPIRĂ AZI'}
                          </Text>
                        </View>
                      )}
                      {isExpired && (
                        <View style={responsiveStyles.daysBannerExpired}>
                          <Text style={responsiveStyles.daysBannerTextExpired}>EXPIRATĂ</Text>
                        </View>
                      )}
                      {isExpired && <View style={styles.expiredMask} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[responsiveStyles.textBlockBelow, { backgroundColor: colors.background, borderColor: colors.border }]}
                      activeOpacity={0.85}
                      onPress={openPromo}
                    >
                      <Text style={[responsiveStyles.textBlockTitle, { color: colors.text }]} numberOfLines={3}>
                        {p.title}
                      </Text>
                      <View style={responsiveStyles.moreDetailsRow}>
                        <Text style={[responsiveStyles.moreDetailsText, { color: colors.text }]}>Mai multe detalii</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.text} />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <View style={{ height: 32 }} />
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}

const getStyles = (isSmallScreen: boolean, scale: number, width: number) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: responsiveWidth(5), paddingTop: responsiveSize(12, scale), paddingBottom: responsiveSize(12, scale) },
    list: {
      paddingHorizontal: responsiveSize(4, scale),
      paddingTop: responsiveSize(20, scale),
      paddingBottom: responsiveSize(20, scale) + 88,
    },
    promoItemWrapper: {
      width: '100%',
      marginBottom: 0,
      borderRadius: responsiveSize(12, scale),
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
    cardImageWrap: {
      width: '100%',
      backgroundColor: '#111',
      borderTopLeftRadius: responsiveSize(12, scale),
      borderTopRightRadius: responsiveSize(12, scale),
      overflow: 'hidden',
      position: 'relative',
    },
    daysBanner: {
      position: 'absolute',
      bottom: responsiveSize(10, scale),
      left: responsiveSize(10, scale),
      backgroundColor: '#FFEB3B',
      paddingVertical: responsiveSize(6, scale),
      paddingHorizontal: responsiveSize(10, scale),
      borderWidth: 1.5,
      borderRadius: 0,
    },
    daysBannerText: { fontSize: responsiveSize(11, scale), fontWeight: '800', letterSpacing: 0.3 },
    daysBannerExpired: {
      position: 'absolute',
      bottom: responsiveSize(10, scale),
      left: responsiveSize(10, scale),
      backgroundColor: 'rgba(100,100,100,0.9)',
      paddingVertical: responsiveSize(6, scale),
      paddingHorizontal: responsiveSize(10, scale),
      borderRadius: 0,
    },
    daysBannerTextExpired: { color: '#999', fontSize: responsiveSize(11, scale), fontWeight: '700' },
    textBlockBelow: {
      paddingVertical: responsiveSize(14, scale),
      paddingHorizontal: responsiveSize(16, scale),
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderRadius: 0,
    },
    textBlockTitle: {
      fontSize: isSmallScreen ? responsiveSize(16, scale) : responsiveSize(17, scale),
      fontWeight: '700',
      marginBottom: responsiveSize(8, scale),
      lineHeight: responsiveSize(22, scale),
    },
    moreDetailsRow: { flexDirection: 'row', alignItems: 'center', gap: responsiveSize(4, scale) },
    moreDetailsText: { fontSize: responsiveSize(14, scale), fontWeight: '500' },
    timerRowAbove: { alignSelf: 'stretch', alignItems: 'stretch', marginBottom: 0, backgroundColor: '#1a1a1a', paddingVertical: responsiveSize(10, scale), paddingHorizontal: responsiveSize(14, scale), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255, 255, 255, 0.08)' },
    timerInlinePill: { backgroundColor: 'transparent', borderRadius: 0, paddingVertical: 0, paddingHorizontal: 0, borderWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    timerInlinePillExpired: { backgroundColor: 'transparent', borderColor: 'transparent' },
    title: { fontSize: isSmallScreen ? responsiveSize(28, scale) : responsiveSize(32, scale), fontWeight: '800', marginBottom: responsiveSize(4, scale), letterSpacing: 0.5 },
    subtitle: { fontSize: isSmallScreen ? responsiveSize(14, scale) : responsiveSize(15, scale) },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: responsiveHeight(8) },
    loadingText: { marginTop: responsiveSize(12, scale), fontSize: responsiveSize(14, scale) },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: responsiveHeight(8), paddingHorizontal: responsiveWidth(10) },
    emptyText: { marginTop: responsiveSize(16, scale), fontSize: responsiveSize(15, scale), textAlign: 'center', lineHeight: responsiveSize(22, scale) },
    card: { width: '100%', backgroundColor: '#111', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: responsiveSize(20, scale), borderBottomRightRadius: responsiveSize(20, scale), overflow: 'hidden', justifyContent: 'flex-end', shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0, marginHorizontal: 0 },
    imageContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: 1 },
    image: { width: '100%', height: '100%', zIndex: 1 },
    imagePlaceholder: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
    imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', zIndex: 2 },
    activeBadge: { position: 'absolute', top: responsiveSize(12, scale), right: responsiveSize(12, scale), zIndex: 25 },
    activeBadgeInner: { backgroundColor: '#333', paddingHorizontal: responsiveSize(8, scale), paddingVertical: responsiveSize(5, scale), borderRadius: responsiveSize(10, scale), borderWidth: 1.5, borderColor: '#FFEE00' },
    activeBadgeText: { color: '#FFEE00', fontSize: responsiveSize(9, scale), fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
    expiredMask: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(100, 100, 100, 0.6)', zIndex: 10 },
    overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', justifyContent: 'flex-end' },
    overlayContent: { padding: responsiveSize(16, scale), paddingBottom: responsiveSize(20, scale) },
    arrowButton: { position: 'absolute', bottom: responsiveSize(16, scale), right: responsiveSize(16, scale), zIndex: 30 },
    cardTitle: { color: '#FFEE00', fontSize: isSmallScreen ? responsiveSize(22, scale) : responsiveSize(24, scale), fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, lineHeight: responsiveSize(30, scale), letterSpacing: 0.3 },
    cardTitleExpired: { color: '#999' },
    timerBubble: { paddingHorizontal: responsiveSize(10, scale), paddingVertical: responsiveSize(4, scale), borderRadius: responsiveSize(10, scale), flexDirection: 'row', alignItems: 'center', gap: responsiveSize(6, scale), flex: 1, minHeight: responsiveSize(28, scale), shadowColor: '#FFEE00', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6, borderWidth: 1.5, borderColor: 'rgba(255, 238, 0, 0.4)', overflow: 'hidden' },
    timerIconWrapper: { width: responsiveSize(20, scale), height: responsiveSize(20, scale), borderRadius: responsiveSize(10, scale), backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFEE00', shadowColor: '#FFEE00', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
    expiredBubble: { paddingHorizontal: responsiveSize(10, scale), paddingVertical: responsiveSize(4, scale), borderRadius: responsiveSize(10, scale), flexDirection: 'row', alignItems: 'center', gap: responsiveSize(6, scale), flex: 1, minHeight: responsiveSize(28, scale), backgroundColor: 'rgba(100, 100, 100, 0.85)', borderWidth: 1.5, borderColor: 'rgba(153, 153, 153, 0.4)' },
    timerIconWrapperExpired: { width: responsiveSize(20, scale), height: responsiveSize(20, scale), borderRadius: responsiveSize(10, scale), backgroundColor: 'rgba(153, 153, 153, 0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(153, 153, 153, 0.5)' },
    timerContent: { flexDirection: 'row', alignItems: 'center', gap: responsiveSize(6, scale), flex: 1 },
    timerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    timerNumber: { color: '#FFEE00', fontWeight: '800', fontSize: responsiveSize(12, scale), letterSpacing: 0, lineHeight: responsiveSize(14, scale), textShadowColor: 'rgba(255, 238, 0, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4 },
    timerUnit: { color: 'rgba(255, 238, 0, 0.8)', fontWeight: '700', fontSize: responsiveSize(9, scale), letterSpacing: 0.3, marginRight: 0 },
    timerSeparator: { width: 1, height: responsiveSize(8, scale), backgroundColor: 'rgba(255, 238, 0, 0.3)', marginHorizontal: responsiveSize(2, scale), alignSelf: 'center' },
    timerLabel: { color: 'rgba(255, 238, 0, 0.65)', fontWeight: '600', fontSize: responsiveSize(10, scale), letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 0 },
    timerLabelExpired: { color: 'rgba(153, 153, 153, 0.6)', fontWeight: '600', fontSize: responsiveSize(7, scale), letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 0 },
    timerValueExpired: { color: '#999', fontWeight: '700', fontSize: responsiveSize(10, scale), letterSpacing: 0.3 },
  });

const styles = StyleSheet.create({
  imageContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: 1 },
  image: { width: '100%', height: '100%', zIndex: 1 },
  imagePlaceholder: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', zIndex: 2 },
  expiredMask: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(100, 100, 100, 0.6)', zIndex: 15 },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', justifyContent: 'flex-end', zIndex: 20 },
  timerContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
