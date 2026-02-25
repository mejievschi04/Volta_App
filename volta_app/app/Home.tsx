import React, { useEffect, useRef, useState, useContext, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  NativeSyntheticEvent, NativeScrollEvent,
  Image, ActivityIndicator, Animated, Platform, Linking, Modal, Alert, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { UserContext } from './_context/UserContext';
import { ThemeContext } from './_context/ThemeContext';
import { getColors, spacing } from './_components/theme';
import Screen from './_components/Screen';
import { useResponsive, responsiveSize, responsiveWidth, responsiveHeight } from './_hooks/useResponsive';
import { usePromotionsHome } from '../hooks/usePromotions';
import { useMessages } from '../hooks/useMessages';
import ApiErrorView from './_components/ApiErrorView';
import { SkeletonPromoSlide } from './_components/Skeleton';
import { resolveImageUrl } from '../lib/apiClient';
import * as Notifications from 'expo-notifications';

type Slide = { id: string; title: string; image_url: string; deadline: string; link?: string; created_at?: string };

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
  
  // Slideshow full width of screen (no side padding)
  const slideWidth = width;
  const CARD_WIDTH = width;
  const CARD_RADIUS = 0; // edge-to-edge, no rounded corners
  const SLIDE_HEIGHT = Math.round(width); // square banner
  
  // Get responsive styles
  const responsiveStyles = useMemo(() => getStyles(isSmallScreen, scale), [isSmallScreen, scale]);

  const [active, setActive] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [newMessageNotification, setNewMessageNotification] = useState<{ message: string; id: string | number } | null>(null);
  const lastMessageIdRef = useRef<string | number | null>(null);
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slidesLenRef = useRef(0);
  const lastInteractionTsRef = useRef(0);

  const { data: promotionsData, isLoading: loading, isError: promotionsError, error: promotionsErrorObj, refetch: refetchPromo } = usePromotionsHome();
  const { data: messagesData, refetch: refetchMessages } = useMessages(user?.id ?? null, { refetchInterval: 20000 });

  const slides = useMemo(() => {
    const promotionsArray = Array.isArray(promotionsData) ? promotionsData : [];
    const mapped = promotionsArray.map((promo: any) => ({
      ...promo,
      image_url: promo.image_home_url || promo.image_url,
    }));
    const now = Date.now();
    return mapped
      .filter((p: any) => new Date(p.deadline).getTime() > now)
      .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
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

    setTimeLeft(calcLeft(slides[active].deadline));
    const timer = setInterval(() => {
      setTimeLeft(calcLeft(slides[active].deadline));
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

  // Prefetch first images for smoother carousel
  useEffect(() => {
    if (!slides.length) return;
    slides.slice(0, 5).forEach((s) => {
      const uri = resolveImageUrl(s?.image_url);
      if (uri) Image.prefetch(uri).catch(() => {});
    });
  }, [slides]);

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

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    if (page !== active) setActive(page);
  }, [active, slideWidth]);

  const goToSlide = useCallback((index: number) => {
    if (slides.length === 0) return;
    const clampedIndex = Math.min(Math.max(index, 0), slides.length - 1);
    scrollRef.current?.scrollTo({ x: clampedIndex * slideWidth, animated: true });
    setActive(clampedIndex);
  }, [slides.length, slideWidth]);

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

  const headerHeight = useMemo(() => isSmallScreen ? responsiveSize(70, scale) : responsiveSize(80, scale), [isSmallScreen, scale]);

  useEffect(() => {
    if (!messagesData || !Array.isArray(messagesData)) return;
    const unreadCount = messagesData.filter((msg: any) =>
      msg.is_from_admin === true && (msg.read === false || msg.read === null || !msg.read)
    ).length;
    setUnreadMessagesCount(unreadCount);

    if (messagesData.length > 0) {
      const latestMessage = messagesData[messagesData.length - 1];
      if (latestMessage.is_from_admin && latestMessage.id !== lastMessageIdRef.current) {
        if (lastMessageIdRef.current !== null) {
          const messageText = latestMessage.message || 'Ai primit un mesaj nou';
          setNewMessageNotification({ message: messageText, id: latestMessage.id });
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Volta Support',
              body: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,
              data: { type: 'message', messageId: latestMessage.id },
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
        lastMessageIdRef.current = latestMessage.id;
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
          contentContainerStyle={{ paddingBottom: responsiveSize(24, scale) }}
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
          {/* Modern Header */}
          {isDark ? (
            <Animated.View
              style={[
                responsiveStyles.headerRow,
                {
                  opacity: fadeAnim,
                  minHeight: headerHeight,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  overflow: 'hidden',
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
                <Text
                  style={[responsiveStyles.helloText, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  Salut,
                </Text>
                <Text
                  style={[responsiveStyles.greeting, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {userName}
                </Text>
              </View>

              <View style={responsiveStyles.topButtons}>
                <TouchableOpacity
                  style={[responsiveStyles.iconBtn, { backgroundColor: colors.surface }]}
                  onPress={() => router.push('/Notifications')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={22} color={colors.primaryButton} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[responsiveStyles.iconBtn, { backgroundColor: colors.surface, marginLeft: 8 }]}
                  onPress={() => router.push('/Settings')}
                  activeOpacity={0.7}
                >
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
                  borderWidth: 1,
                  borderColor: '#FFEE00',
                  borderRadius: 16,
                  overflow: 'hidden',
                },
              ]}
            >
              <LinearGradient
                colors={['#FFEE00', '#FFEE00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <TouchableOpacity
                style={responsiveStyles.avatarWrap}
                onPress={() => router.push('/Profile')}
                activeOpacity={0.7}
              >
                <View style={[responsiveStyles.avatarGradient, { backgroundColor: '#000', borderWidth: 1.5, borderColor: '#FFEE00' }]}>
                  <Text style={[responsiveStyles.avatarInitial, { color: '#FFEE00' }]}>{initial}</Text>
                </View>
              </TouchableOpacity>

              <View style={responsiveStyles.greetingWrap}>
                <Text
                  style={[responsiveStyles.helloText, { color: '#666' }]}
                  numberOfLines={1}
                >
                  Salut,
                </Text>
                <Text
                  style={[responsiveStyles.greeting, { color: '#000' }]}
                  numberOfLines={1}
                >
                  {userName}
                </Text>
              </View>

              <View style={responsiveStyles.topButtons}>
                <TouchableOpacity
                  style={[responsiveStyles.iconBtn, { backgroundColor: '#000' }]}
                  onPress={() => router.push('/Notifications')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={22} color="#FFEE00" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[responsiveStyles.iconBtn, { backgroundColor: '#000', marginLeft: 8 }]}
                  onPress={() => router.push('/Settings')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="settings-outline" size={22} color="#FFEE00" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Slideshow + imagine + timer – de la 0, doar inline */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              marginTop: 28,
              marginBottom: 16,
              width: width,
              marginHorizontal: -spacing.lg,
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
                <View style={{ width: width, height: SLIDE_HEIGHT }}>
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
                  >
                    {slides.map((s, i) => {
                      const tl = i === active ? calcLeft(s.deadline) : null;
                      const total = tl ? (tl.days + tl.hours + tl.minutes) : 0;
                      const showTimer = !!tl && total > 0;

                      return (
                        <View
                          key={s.id}
                          style={{
                            width: slideWidth,
                            height: SLIDE_HEIGHT,
                            overflow: 'hidden',
                            position: 'relative',
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
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              width: slideWidth,
                              height: SLIDE_HEIGHT,
                              overflow: 'hidden',
                            }}
                          >
                            <Image
                              source={{ uri: resolveImageUrl(s.image_url) ?? '' }}
                              style={{ position: 'absolute', left: 0, top: 0, width: slideWidth, height: SLIDE_HEIGHT }}
                              resizeMode="cover"
                              onError={(e) => console.error('[Home] Eroare imagine:', s.image_url, e.nativeEvent?.error)}
                            />
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
                                bottom: 0,
                                left: 0,
                                right: 0,
                                paddingHorizontal: 14,
                                paddingBottom: 10,
                                paddingTop: 12,
                                zIndex: 10,
                              }}
                            >
                              <View
                                style={{
                                  width: '100%',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'rgba(0,0,0,0.6)',
                                  borderRadius: 10,
                                  paddingVertical: 6,
                                  paddingHorizontal: 12,
                                  gap: 4,
                                  borderWidth: 1,
                                  borderColor: 'rgba(255,255,255,0.15)',
                                }}
                              >
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFEE00' }}>{String(tl.days).padStart(2, '0')}</Text>
                                  <Text style={{ fontSize: 8, fontWeight: '600', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', marginTop: 1 }}>Zile</Text>
                                </View>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginHorizontal: 2 }}>:</Text>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFEE00' }}>{String(tl.hours).padStart(2, '0')}</Text>
                                  <Text style={{ fontSize: 8, fontWeight: '600', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', marginTop: 1 }}>Ore</Text>
                                </View>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginHorizontal: 2 }}>:</Text>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFEE00' }}>{String(tl.minutes).padStart(2, '0')}</Text>
                                  <Text style={{ fontSize: 8, fontWeight: '600', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', marginTop: 1 }}>Min</Text>
                                </View>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Slider Controls */}
                <View style={responsiveStyles.sliderControls}>
                  <TouchableOpacity 
                    style={isDark ? [responsiveStyles.sliderBtn, styles.sliderBtnDark] : responsiveStyles.sliderBtn}
                    onPress={prevSlide}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={isDark ? '#FFEE00' : colors.text}
                      style={isDark ? undefined : { opacity: 0.7 }}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={isDark ? [responsiveStyles.sliderBtn, styles.sliderBtnDark] : responsiveStyles.sliderBtn}
                    onPress={nextSlide}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isDark ? '#FFEE00' : colors.text}
                      style={isDark ? { opacity: 0.75 } : { opacity: 0.7 }}
                    />
                  </TouchableOpacity>
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

          {/* Toate Promoțiile Button */}
          <View style={[responsiveStyles.actionCardsContainer, { paddingHorizontal: responsiveWidth(5) }]}>
            <TouchableOpacity
              style={[responsiveStyles.allPromosButton, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/Promotii')}
              activeOpacity={0.8}
            >
              <Text style={[responsiveStyles.allPromosText, { color: colors.text }]}>Toate Promoțiile</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Action Cards Section - Apel and Mesaj */}
          <View style={[responsiveStyles.actionCardsContainer, { paddingHorizontal: responsiveWidth(5) }]}>
            {/* Apel Card */}
            <TouchableOpacity
              style={[
                responsiveStyles.actionCard,
                { 
                  backgroundColor: '#FFEE00',
                  borderColor: 'rgba(0, 0, 0, 0.1)',
                  shadowColor: '#FFEE00',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                }
              ]}
              onPress={() => {
                Linking.openURL('tel:+37360535353');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={24} color="#000" />
              <Text style={[responsiveStyles.actionCardTitle, { color: '#000' }]}>Apel</Text>
            </TouchableOpacity>

            {/* Mesaj Card */}
            <TouchableOpacity
              style={[
                responsiveStyles.actionCard,
                { 
                  backgroundColor: '#FFEE00',
                  borderColor: 'rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                }
              ]}
              onPress={() => router.push('/Mesaje')}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color="#000" />
              <Text style={[responsiveStyles.actionCardTitle, { color: '#000' }]}>Mesaj</Text>
              {unreadMessagesCount > 0 && (
                <View style={responsiveStyles.messageBadge}>
                  <Text style={responsiveStyles.messageBadgeText}>
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

      </View>
    </Screen>
  );
}

// Create responsive styles function
const getStyles = (isSmallScreen: boolean, scale: number) => StyleSheet.create({
  container: { 
    flex: 1,
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: responsiveWidth(5),
    paddingVertical: responsiveSize(10, scale),
    marginTop: Platform.OS === 'ios' ? responsiveSize(8, scale) : responsiveSize(12, scale),
    marginBottom: responsiveSize(16, scale),
    marginHorizontal: 0,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    paddingHorizontal: responsiveSize(12, scale),
    gap: responsiveSize(12, scale),
    zIndex: 50,
    transform: [{ translateY: -responsiveSize(24, scale) }],
  },
  sliderBtn: {
    width: responsiveSize(42, scale),
    height: responsiveSize(42, scale),
    borderRadius: responsiveSize(21, scale),
    borderWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ scale: 0.8 }],
    opacity: 0.6,
  },
  sliderBtnDark: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderColor: 'rgba(255, 238, 0, 0.3)',
    shadowColor: '#FFEE00',
    shadowOpacity: 0.2,
  },
  dotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveSize(8, scale),
    marginTop: responsiveSize(10, scale),
    marginBottom: responsiveSize(2, scale),
  },
  dot: {
    width: responsiveSize(7, scale),
    height: responsiveSize(7, scale),
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
  allPromosButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveSize(14, scale),
    paddingHorizontal: responsiveSize(20, scale),
    borderRadius: responsiveSize(14, scale),
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.11,
    shadowRadius: 20,
    elevation: 2,
    gap: responsiveSize(8, scale),
  },
  allPromosText: { 
    fontWeight: '600', 
    fontSize: responsiveSize(16, scale),
    letterSpacing: 0.3,
  },
  allPromosBtn: {
    marginTop: responsiveSize(12, scale),
    marginBottom: responsiveSize(12, scale),
    borderRadius: responsiveSize(14, scale),
    overflow: 'hidden',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: responsiveSize(16, scale),
    paddingHorizontal: responsiveSize(24, scale),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Static styles that don't need responsive values
const styles = StyleSheet.create({
  slideTitleWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 20,
  },
  slideOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 18,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    pointerEvents: 'none',
  },
  timerTopWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  timerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 16,
    zIndex: 100,
  },
  timerTopGradient: {
    borderRadius: 18,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 238, 0, 0.25)',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 238, 0, 0.35)',
    alignSelf: 'flex-start',
  },
  timerPillText: {
    color: '#FFEE00',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.6,
    textShadowColor: 'rgba(255, 238, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  timerPillStandalone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  timerIconWrap: {
    backgroundColor: 'rgba(255, 238, 0, 0.15)',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 238, 0, 0.3)',
  },
  timerBorder: {
    height: 2,
    backgroundColor: '#000',
    width: '100%',
  },
  titleBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  sliderBtnDark: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderColor: 'rgba(255, 238, 0, 0.3)',
    shadowColor: '#FFEE00',
    shadowOpacity: 0.2,
  },
});
