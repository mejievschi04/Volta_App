import React, { useEffect, useRef, useState, useContext, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  NativeSyntheticEvent, NativeScrollEvent,
  Image, ActivityIndicator, Animated, Platform, Linking, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { UserContext } from './_context/UserContext';
import { ThemeContext } from './_context/ThemeContext';
import { CartContext } from './_context/CartContext';
import { getColors, spacing } from './_components/theme';
import Screen from './_components/Screen';
import { useResponsive, responsiveSize, responsiveWidth } from './_hooks/useResponsive';
import { usePromotionsHome } from '../hooks/usePromotions';
import { useMessages } from '../hooks/useMessages';
import ApiErrorView from './_components/ApiErrorView';
import { SkeletonPromoSlide } from './_components/Skeleton';
import { resolveImageUrl, getUploadsBaseUrl, apiClient } from '../lib/apiClient';
import Notifications from '../lib/notifications';
import { filterAndSortPromotions, type PromoNormalized } from '../lib/promotions';
import { normalizeProduct } from './Search';
import ProductCard from './_components/ProductCard';
import type { ProductCardProduct } from './_components/ProductCard';

type Slide = PromoNormalized & { link?: string };
type ProductWithCategory = ProductCardProduct & { categorySlug: string };

export default function Home() {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const userName = user?.prenume ?? "Ion";
  const initial = userName?.charAt(0)?.toUpperCase() ?? "I";
  
  // Responsive dimensions
  const { width, height, isSmallScreen, isTablet, scale } = useResponsive();
  
  // Slideshow – lățime full ecran, înălțime redusă
  const slideWidth = Math.round(width);
  const SLIDE_HEIGHT = Math.round(width * 0.9);
  const slideSize = slideWidth;
  const CARD_WIDTH = width;
  
  // Get responsive styles
  const responsiveStyles = useMemo(() => getStyles(isSmallScreen, scale), [isSmallScreen, scale]);

  const [active, setActive] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [newMessageNotification, setNewMessageNotification] = useState<{ message: string; id: string | number } | null>(null);
  const [relevantProducts, setRelevantProducts] = useState<ProductWithCategory[]>([]);
  const [onlineOnlyProducts, setOnlineOnlyProducts] = useState<ProductWithCategory[]>([]);
  const lastMessageIdRef = useRef<string | number | null>(null);
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slidesLenRef = useRef(0);
  const lastInteractionTsRef = useRef(0);

  const { data: promotionsData, isLoading: loading, isError: promotionsError, error: promotionsErrorObj, refetch: refetchPromo } = usePromotionsHome();
  const { data: messagesData, refetch: refetchMessages } = useMessages(user?.id ?? null, { refetchInterval: 20000 });
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    (async () => {
      const res = await apiClient.getShopProducts({ page_size: 10 });
      if (!res.error && res.data?.length) {
        setRelevantProducts((res.data as any[]).map((p: any) => normalizeProduct(p)));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const res = await apiClient.getShopProducts({ page_size: 10, is_online_only: 1 });
      if (!res.error && res.data?.length) {
        setOnlineOnlyProducts((res.data as any[]).map((p: any) => normalizeProduct(p)));
      }
    })();
  }, []);

  const slides = useMemo(() => {
    const raw = Array.isArray(promotionsData) ? promotionsData : [];
    const filtered = filterAndSortPromotions(raw as any);
    const uploadsBase = getUploadsBaseUrl();
    const siteOrigin = uploadsBase.replace(/^(https?:\/\/)api\./, '$1');
    const withLink: Slide[] = filtered.map((p) => {
      const linkRaw = (p as any).button_for_promo_page_link ?? (p as any).link;
      const link = linkRaw
        ? (linkRaw.startsWith('http') ? linkRaw : `${siteOrigin.replace(/\/$/, '')}${linkRaw.startsWith('/') ? '' : '/'}${linkRaw}`)
        : undefined;
      return { ...p, link };
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__ && raw.length > 0) {
      console.log('[Home Promoții] Primite:', raw.length, ', după filtru (neexpirate):', withLink.length);
    }
    return withLink;
  }, [promotionsData]);

  const currentSlide = slides[active] ?? null;
  const activeRef = useRef(0);

  const markInteraction = useCallback(() => {
    lastInteractionTsRef.current = Date.now();
  }, []);
  const calcLeft = useCallback((endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
    const days = Math.floor(diff / (24 * 3600 * 1000));
    const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
    const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
    return { days, hours, minutes };
  }, []);

  const formatDeadline = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, fadeAnim]);

  useEffect(() => {
    if (slides.length === 0) return;
    const slide = slides[active];
    if (!slide?.deadline) return;

    setTimeLeft(calcLeft(slide.deadline));
    const timer = setInterval(() => {
      const s = slides[active];
      if (s?.deadline) setTimeLeft(calcLeft(s.deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [active, slides]);

  // Keep refs in sync for autoplay
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    slidesLenRef.current = slides.length;
  }, [slides.length]);

  // Dacă slides se scurtează, active poate fi out-of-bounds – îl readucem în limite
  useEffect(() => {
    if (slides.length === 0) return;
    if (active >= slides.length) setActive(Math.max(0, slides.length - 1));
  }, [slides.length, active]);

  // Nu prefetchăm toate imaginile – provoacă Pool hard cap pe Android; doar slide-ul activ
  useEffect(() => {
    if (!slides.length || active >= slides.length) return;
    const s = slides[active];
    const uri = resolveImageUrl(s?.image_url);
    if (uri) Image.prefetch(uri).catch(() => {});
  }, [slides, active]);

  const goToSlide = useCallback((index: number) => {
    if (slides.length === 0) return;
    const clampedIndex = Math.min(Math.max(index, 0), slides.length - 1);
    scrollRef.current?.scrollTo({ x: clampedIndex * slideWidth, animated: true });
    setActive(clampedIndex);
  }, [slides.length, slideWidth]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    if (page !== active) setActive(page);
  }, [active, slideWidth]);

  const goToSlideFromUser = useCallback((index: number) => {
    markInteraction();
    goToSlide(index);
  }, [goToSlide, markInteraction]);

  const nextSlide = useCallback(() => {
    if (slides.length === 0) return;
    const nextIndex = (active + 1) % slides.length;
    markInteraction();
    goToSlide(nextIndex);
  }, [active, slides.length, goToSlide, markInteraction]);

  const prevSlide = useCallback(() => {
    if (slides.length === 0) return;
    const prevIndex = (active - 1 + slides.length) % slides.length;
    markInteraction();
    goToSlide(prevIndex);
  }, [active, slides.length, goToSlide, markInteraction]);

  // Autoplay slideshow (pauses after user interaction)
  useEffect(() => {
    if (slides.length < 2) return;

    const AUTOPLAY_INTERVAL_MS = 5000;
    const PAUSE_AFTER_INTERACTION_MS = 8000;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastInteractionTsRef.current < PAUSE_AFTER_INTERACTION_MS) return;
      const len = slidesLenRef.current;
      if (len < 2) return;
      const nextIndex = (activeRef.current + 1) % len;
      goToSlide(nextIndex);
    }, AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [goToSlide, slides.length]);

  const headerHeight = useMemo(() => isSmallScreen ? responsiveSize(70, scale) : responsiveSize(80, scale), [isSmallScreen, scale]);

  useEffect(() => {
    if (!messagesData || !Array.isArray(messagesData)) return;
    const unreadCount = messagesData.filter((msg: any) =>
      msg.is_from_admin === true && (msg.read === false || msg.read === null || !msg.read)
    ).length;
    setUnreadMessagesCount(unreadCount);

    if (messagesData.length > 0) {
      const latestMessage = messagesData[messagesData.length - 1] as { is_from_admin?: boolean; id?: number; message?: string };
      if (latestMessage?.is_from_admin && latestMessage?.id !== lastMessageIdRef.current) {
        if (lastMessageIdRef.current !== null) {
          const messageText = latestMessage?.message || 'Ai primit un mesaj nou';
          setNewMessageNotification({ message: messageText, id: latestMessage?.id ?? 0 });
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Volta Support',
              body: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,
              data: { type: 'message', messageId: latestMessage?.id },
              sound: true,
            },
            trigger: null,
          }).catch(() => {});
          Animated.spring(notificationAnim, {
            toValue: 0,
            tension: 65,
            friction: 8,
            useNativeDriver: true,
          }).start();
          setTimeout(() => {
            Animated.timing(notificationAnim, {
              toValue: -100,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              setNewMessageNotification(null);
            });
          }, 5000);
        }
        lastMessageIdRef.current = latestMessage?.id ?? null;
      }
    }
  }, [messagesData, notificationAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchPromo(), refetchMessages()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPromo, refetchMessages]);

  return (
    <Screen>
      <View style={[responsiveStyles.container, { backgroundColor: colors.background }]}>
        {/* Notificare mesaj nou - Push-up banner */}
        {newMessageNotification && (
          <Animated.View
            style={[
              responsiveStyles.messageNotification,
              {
                backgroundColor: isDark ? colors.surface : '#FFF',
                borderColor: colors.border,
                transform: [{ translateY: notificationAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={responsiveStyles.messageNotificationContent}
              onPress={() => {
                Animated.timing(notificationAnim, {
                  toValue: -100,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  setNewMessageNotification(null);
                  router.push('/Mesaje');
                });
              }}
              activeOpacity={0.9}
            >
              <View style={[responsiveStyles.notificationAvatar, { backgroundColor: '#FFEE00' }]}>
                <Ionicons name="chatbubble-ellipses" size={24} color="#000" />
              </View>
              <View style={responsiveStyles.notificationTextContainer}>
                <Text style={[responsiveStyles.notificationTitle, { color: colors.text }]}>
                  Volta Support
                </Text>
                <Text
                  style={[responsiveStyles.notificationMessage, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {newMessageNotification.message}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Animated.timing(notificationAnim, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => {
                    setNewMessageNotification(null);
                  });
                }}
                style={responsiveStyles.notificationClose}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: responsiveSize(100, scale) }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaryButton}
              colors={[colors.primaryButton]}
              progressBackgroundColor={isDark ? colors.surface : '#FFF'}
            />
          }
          nestedScrollEnabled
        >
          {/* Header compact */}
          {isDark ? (
            <Animated.View
              style={[
                responsiveStyles.headerRow,
                {
                  opacity: fadeAnim,
                  minHeight: headerHeight,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={responsiveStyles.avatarWrap}
                onPress={() => router.push('/Profile')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#FFEE00', '#FFEE00']}
                  style={responsiveStyles.avatarGradient}
                >
                  <Text style={responsiveStyles.avatarInitial}>{initial}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={responsiveStyles.greetingWrap}>
                <Text style={[responsiveStyles.helloText, { color: colors.textMuted }]} numberOfLines={1}>Salut,</Text>
                <Text style={[responsiveStyles.greeting, { color: colors.text }]} numberOfLines={1}>{userName}</Text>
              </View>
              <View style={responsiveStyles.topButtons}>
                <TouchableOpacity style={[responsiveStyles.iconBtn, { backgroundColor: '#000' }]} onPress={() => router.push('/Notifications')} activeOpacity={0.7}>
                  <Ionicons name="notifications-outline" size={22} color={colors.primaryButton} />
                </TouchableOpacity>
                <TouchableOpacity style={[responsiveStyles.iconBtn, { backgroundColor: '#000', marginLeft: 8 }]} onPress={() => router.push('/Settings')} activeOpacity={0.7}>
                  <Ionicons name="settings-outline" size={22} color={colors.primaryButton} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                responsiveStyles.headerRow,
                {
                  opacity: fadeAnim,
                  minHeight: headerHeight,
                  borderColor: 'rgba(0,0,0,0.08)',
                  backgroundColor: '#FFF',
                },
              ]}
            >
              <TouchableOpacity style={responsiveStyles.avatarWrap} onPress={() => router.push('/Profile')} activeOpacity={0.7}>
                <View style={[responsiveStyles.avatarGradient, { backgroundColor: '#000', borderWidth: 1.5, borderColor: '#FFEE00' }]}>
                  <Text style={[responsiveStyles.avatarInitial, { color: '#FFEE00' }]}>{initial}</Text>
                </View>
              </TouchableOpacity>
              <View style={responsiveStyles.greetingWrap}>
                <Text style={[responsiveStyles.helloText, { color: '#666' }]} numberOfLines={1}>Salut,</Text>
                <Text style={[responsiveStyles.greeting, { color: '#000' }]} numberOfLines={1}>{userName}</Text>
              </View>
              <View style={responsiveStyles.topButtons}>
                <TouchableOpacity style={[responsiveStyles.iconBtn, { backgroundColor: '#000' }]} onPress={() => router.push('/Notifications')} activeOpacity={0.7}>
                  <Ionicons name="notifications-outline" size={22} color="#FFEE00" />
                </TouchableOpacity>
                <TouchableOpacity style={[responsiveStyles.iconBtn, { backgroundColor: '#000', marginLeft: 8 }]} onPress={() => router.push('/Settings')} activeOpacity={0.7}>
                  <Ionicons name="settings-outline" size={22} color="#FFEE00" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Bară căutare – deschide ecranul de search */}
          <TouchableOpacity
            style={[responsiveStyles.searchBar, { backgroundColor: isDark ? colors.surface : '#F5F5F5', borderColor: isDark ? colors.border : '#E8E8E8' }]}
            onPress={() => router.push('/Search')}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <Text style={[responsiveStyles.searchPlaceholder, { color: colors.textMuted }]}>Ce cauți? Caută în catalog</Text>
          </TouchableOpacity>

          {/* Banner promoții */}
          <View style={{ width: slideSize, marginHorizontal: -spacing.lg, position: 'relative', marginTop: responsiveSize(8, scale), marginBottom: responsiveSize(20, scale), minHeight: SLIDE_HEIGHT }}>
            <Animated.View
              style={{
                opacity: fadeAnim,
                width: slideSize,
                overflow: 'hidden',
                minHeight: SLIDE_HEIGHT,
              }}
            >
              {loading ? (
              <View style={{ width: slideWidth, height: SLIDE_HEIGHT }}>
                <SkeletonPromoSlide width={slideWidth} height={SLIDE_HEIGHT} />
              </View>
            ) : promotionsError ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
                <ApiErrorView
                  message={promotionsErrorObj?.message ?? undefined}
                  onRetry={() => refetchPromo()}
                />
              </View>
            ) : slides.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
                <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
                <Text style={{ marginTop: 12, fontSize: 15, color: colors.textMuted, textAlign: 'center' }}>Nu există promoții active momentan.</Text>
              </View>
            ) : (
              <>
                <View style={{ width: slideSize, height: SLIDE_HEIGHT }}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    scrollEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={onScroll}
                    onScrollBeginDrag={markInteraction}
                    scrollEventThrottle={16}
                    ref={scrollRef}
                    decelerationRate="fast"
                    snapToInterval={slideWidth}
                    snapToAlignment="start"
                    contentContainerStyle={{ width: slides.length * slideWidth }}
                  >
                    {slides.map((s, i) => {
                      const tl = i === active ? calcLeft(s.deadline) : null;
                      const total = tl ? (tl.days + tl.hours + tl.minutes) : 0;
                      const showTimer = !!tl && total > 0;
                      // Randăm imaginea doar pentru slide-ul vizibil ±1 vecin, ca să nu depășim pool-ul de imagini pe Android
                      const shouldLoadImage = Math.abs(i - active) <= 1;

                      return (
                        <View
                          key={s.id}
                          style={{
                            width: slideWidth,
                            height: SLIDE_HEIGHT,
                            overflow: 'hidden',
                            position: 'relative',
                            backgroundColor: colors.background,
                          }}
                        >
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={async () => {
                              if (s.link) {
                                try {
                                  await openBrowserAsync(s.link, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
                                } catch (e) {
                                  console.error('Eroare link:', e);
                                }
                              }
                            }}
                            style={{
                              width: slideWidth,
                              height: SLIDE_HEIGHT,
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              backgroundColor: colors.background,
                            }}
                          >
                            {shouldLoadImage && (resolveImageUrl(s.image_url) ?? '') ? (
                              <Image
                                source={{ uri: resolveImageUrl(s.image_url) ?? '' }}
                                style={{ width: slideWidth, height: SLIDE_HEIGHT }}
                                resizeMode="contain"
                                onError={(e) => {
                                  if (__DEV__) console.warn('[Home] Imagine indisponibilă:', s.image_url, e.nativeEvent?.error);
                                }}
                              />
                            ) : (
                              <View style={{ width: slideWidth, height: SLIDE_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
                              </View>
                            )}
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.75)']}
                              locations={[0.35, 0.7, 1]}
                              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' }}
                            />
                          </TouchableOpacity>

                          {showTimer && tl && (
                            <View
                              style={{
                                position: 'absolute',
                                bottom: responsiveSize(8, scale),
                                left: responsiveSize(12, scale),
                                right: responsiveSize(12, scale),
                                zIndex: 10,
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: responsiveSize(11, scale),
                                  fontWeight: '600',
                                  color: 'rgba(255,255,255,0.95)',
                                  textShadowColor: 'rgba(0,0,0,0.6)',
                                  textShadowOffset: { width: 0, height: 1 },
                                  textShadowRadius: 2,
                                }}
                              >
                                {tl.days === 0
                                  ? 'Expiră azi'
                                  : tl.days === 1
                                    ? 'Au mai rămas 1 zi'
                                    : `Au mai rămas ${tl.days} zile`}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Dots indicator */}
                <View style={responsiveStyles.dotsWrap}>
                  {slides.map((_, i) => {
                    const isActive = i === active;
                    return (
                      <TouchableOpacity
                        key={`dot-${i}`}
                        onPress={() => goToSlideFromUser(i)}
                        activeOpacity={0.8}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={[
                          responsiveStyles.dot,
                          {
                            backgroundColor: isActive
                              ? (isDark ? '#FFEE00' : '#000')
                              : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.18)'),
                            opacity: isActive ? 1 : (isDark ? 0.7 : 0.85),
                            transform: [{ scale: isActive ? 1.15 : 1 }],
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </>
            )}
          </Animated.View>

          </View>

          {/* Apel și Mesaj */}
          <View style={[responsiveStyles.quickActionsRow, { marginTop: responsiveSize(10, scale) }]}>
            <TouchableOpacity
              style={[
                responsiveStyles.quickActionChip,
                {
                  flex: 1,
                  backgroundColor: colors.primaryButton,
                  borderColor: isDark ? 'rgba(255,238,0,0.4)' : 'rgba(0,0,0,0.12)',
                },
              ]}
              onPress={() => Linking.openURL('tel:+37360535353')}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={20} color="#000" />
              <Text style={[responsiveStyles.quickActionChipTextPrimary, { color: '#000' }]}>Apel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                responsiveStyles.quickActionChip,
                {
                  flex: 1,
                  backgroundColor: isDark ? colors.surface : '#FFF',
                  borderColor: isDark ? colors.border : '#E0E0E0',
                },
              ]}
              onPress={() => router.push('/Mesaje')}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primaryButton} />
              <Text style={[responsiveStyles.quickActionChipTextSecondary, { color: colors.text }]}>Mesaj</Text>
              {unreadMessagesCount > 0 && (
                <View style={responsiveStyles.messageBadge}>
                  <Text style={responsiveStyles.messageBadgeText}>{unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Produse relevante */}
          <TouchableOpacity
            style={[
              responsiveStyles.sectionTitleRow,
              { marginTop: responsiveSize(24, scale) },
            ]}
            onPress={() => router.push('/Catalog')}
            activeOpacity={0.7}
          >
            <Text style={[responsiveStyles.sectionTitle, responsiveStyles.sectionTitleModern, { color: colors.text, paddingHorizontal: 0 }]}>Produse relevante</Text>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[responsiveStyles.productRowContent, { paddingBottom: responsiveSize(24, scale) }]}
          >
            {relevantProducts.map((p) => (
              <View key={p.id} style={responsiveStyles.productCardWrap}>
                <ProductCard
                  product={p}
                  categorySlug={p.categorySlug}
                  onAddToCart={() => addToCart({ id: p.id, name: p.name, price: p.price, currency: p.currency, image_url: p.image_url ?? null }, 1)}
                  variant="compact"
                />
              </View>
            ))}
          </ScrollView>

          {/* Doar Online – fundal galben, ieșim din padding cu margin negativ */}
          <View style={[
            responsiveStyles.doarOnlineSection,
            {
              alignSelf: 'stretch',
              marginLeft: -spacing.lg,
              marginRight: -spacing.lg,
              backgroundColor: '#FFEE00',
              marginTop: responsiveSize(24, scale),
              paddingTop: responsiveSize(12, scale),
              paddingBottom: responsiveSize(14, scale),
              paddingHorizontal: spacing.lg,
            },
          ]}>
            <TouchableOpacity
              style={responsiveStyles.sectionTitleRow}
              onPress={() => router.push('/Catalog')}
              activeOpacity={0.7}
            >
              <Text style={[responsiveStyles.sectionTitle, responsiveStyles.sectionTitleModern, { color: colors.text, marginTop: 0, paddingHorizontal: 0 }]}>Doar Online</Text>
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </TouchableOpacity>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[responsiveStyles.productRowContent, { paddingBottom: responsiveSize(24, scale) }]}
            >
              {onlineOnlyProducts.map((p) => (
                <View key={p.id} style={responsiveStyles.productCardWrap}>
                  <ProductCard
                    product={p}
                    categorySlug={p.categorySlug}
                    onAddToCart={() => addToCart({ id: p.id, name: p.name, price: p.price, currency: p.currency, image_url: p.image_url ?? null }, 1)}
                    variant="compact"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

      </View>
    </Screen>
  );
}

// Create responsive styles function
const CONTENT_PADDING_H = 20; // grid unit pentru aliniere
const getStyles = (isSmallScreen: boolean, scale: number) => StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsiveSize(CONTENT_PADDING_H, scale),
    paddingVertical: responsiveSize(14, scale),
    marginTop: Platform.OS === 'ios' ? responsiveSize(10, scale) : responsiveSize(14, scale),
    marginHorizontal: 0,
    marginBottom: responsiveSize(16, scale),
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsiveSize(14, scale),
    paddingHorizontal: responsiveSize(CONTENT_PADDING_H, scale),
    marginHorizontal: 0,
    marginBottom: responsiveSize(20, scale),
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: responsiveSize(12, scale),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchPlaceholder: {
    fontSize: responsiveSize(15, scale),
    flex: 1,
  },
  sectionTitle: {
    fontSize: responsiveSize(18, scale),
    fontWeight: '700',
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsiveSize(CONTENT_PADDING_H, scale),
    paddingVertical: responsiveSize(6, scale),
  },
  sectionTitleModern: {
    letterSpacing: 0.3,
    fontWeight: '800',
    fontSize: responsiveSize(18, scale),
  },
  productRowContent: {
    paddingHorizontal: responsiveSize(CONTENT_PADDING_H, scale),
    paddingTop: responsiveSize(12, scale),
  },
  productCardWrap: {
    marginRight: responsiveSize(16, scale),
  },
  doarOnlineSection: {
    overflow: 'hidden',
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: responsiveSize(CONTENT_PADDING_H, scale),
    paddingVertical: responsiveSize(6, scale),
    gap: responsiveSize(12, scale),
    marginTop: 0,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveSize(12, scale),
    paddingHorizontal: responsiveSize(14, scale),
    borderRadius: 14,
    borderWidth: 1,
    gap: responsiveSize(8, scale),
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionChipPrimary: {
    backgroundColor: '#FFEE00',
    borderColor: 'rgba(0,0,0,0.08)',
  },
  quickActionChipText: {
    fontSize: responsiveSize(15, scale),
    fontWeight: '700',
    color: '#000',
  },
  quickActionChipTextPrimary: {
    fontSize: responsiveSize(15, scale),
    fontWeight: '700',
  },
  quickActionChipTextSecondary: {
    fontSize: responsiveSize(15, scale),
    fontWeight: '600',
  },
  avatarWrap: {
    marginRight: responsiveSize(12, scale),
  },
  avatarGradient: {
    width: isSmallScreen ? responsiveSize(56, scale) : responsiveSize(64, scale),
    height: isSmallScreen ? responsiveSize(56, scale) : responsiveSize(64, scale),
    borderRadius: isSmallScreen ? responsiveSize(14, scale) : responsiveSize(16, scale),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarInitial: { 
    fontWeight: '700', 
    fontSize: isSmallScreen ? responsiveSize(24, scale) : responsiveSize(28, scale),
    color: '#000',
  },
  greetingWrap: { 
    flex: 1, 
    paddingHorizontal: responsiveSize(8, scale),
  },
  helloText: {
    fontSize: isSmallScreen ? responsiveSize(13, scale) : responsiveSize(14, scale),
    fontWeight: '400',
    marginBottom: responsiveSize(2, scale),
    opacity: 0.82,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSize(6, scale),
  },
  greeting: { 
    fontSize: isSmallScreen ? responsiveSize(20, scale) : responsiveSize(24, scale), 
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  emoji: {
    fontSize: isSmallScreen ? responsiveSize(20, scale) : responsiveSize(24, scale),
  },
  subGreeting: { 
    marginTop: responsiveSize(2, scale), 
    fontSize: isSmallScreen ? responsiveSize(13, scale) : responsiveSize(14, scale),
  },
  topButtons: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  iconBtn: { 
    padding: responsiveSize(10, scale), 
    borderRadius: responsiveSize(12, scale),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  slideTitleText: {
    fontSize: isSmallScreen ? responsiveSize(21, scale) : responsiveSize(23, scale),
    fontWeight: '600',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    lineHeight: responsiveSize(28, scale),
    letterSpacing: -0.15,
  },
  sliderControls: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsiveSize(22, scale),
    gap: responsiveSize(12, scale),
    zIndex: 50,
    transform: [{ translateY: -responsiveSize(30, scale) }],
  },
  sliderBtn: {
    width: responsiveSize(52, scale),
    height: responsiveSize(52, scale),
    borderRadius: responsiveSize(26, scale),
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    opacity: 0.95,
  },
  sliderBtnDark: {
    backgroundColor: '#1a1a1a',
    borderColor: 'rgba(255, 238, 0, 0.35)',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  dotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveSize(10, scale),
    marginTop: responsiveSize(12, scale),
    marginBottom: responsiveSize(4, scale),
  },
  dot: {
    width: responsiveSize(8, scale),
    height: responsiveSize(8, scale),
    borderRadius: responsiveSize(4, scale),
  },
  actionCardsContainer: {
    marginTop: 0,
    marginBottom: responsiveSize(16, scale),
    flexDirection: 'row',
    gap: responsiveSize(16, scale),
    justifyContent: 'space-between',
    paddingHorizontal: responsiveWidth(6),
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveSize(14, scale),
    paddingHorizontal: responsiveSize(16, scale),
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.11,
    shadowRadius: 20,
    elevation: 2,
    gap: responsiveSize(8, scale),
    minWidth: responsiveSize(140, scale),
  },
  actionCardTitle: {
    fontSize: responsiveSize(16, scale),
    fontWeight: '600',
    textAlign: 'center',
    color: '#000',
    opacity: 0.95,
  },
  messageBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF0000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  messageBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  messageNotification: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  messageNotificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveSize(16, scale),
    paddingVertical: responsiveSize(12, scale),
    paddingTop: Platform.OS === 'ios' ? responsiveSize(50, scale) : responsiveSize(12, scale),
  },
  notificationAvatar: {
    width: responsiveSize(40, scale),
    height: responsiveSize(40, scale),
    borderRadius: responsiveSize(20, scale),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsiveSize(12, scale),
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: responsiveSize(14, scale),
    fontWeight: '700',
    marginBottom: responsiveSize(2, scale),
  },
  notificationMessage: {
    fontSize: responsiveSize(13, scale),
  },
  notificationClose: {
    padding: responsiveSize(4, scale),
    marginLeft: responsiveSize(8, scale),
  },
});
