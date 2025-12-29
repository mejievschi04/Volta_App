import React, { useEffect, useRef, useState, useContext, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  NativeSyntheticEvent, NativeScrollEvent,
  Image, ActivityIndicator, Animated, Platform, Linking, Modal, Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { apiClient } from '../lib/apiClient';
import { UserContext } from './context/UserContext';
import { ThemeContext } from './context/ThemeContext';
import { getColors } from './components/theme';
import Screen from './components/Screen';
import { useResponsive, responsiveSize, responsiveWidth, responsiveHeight } from './hooks/useResponsive';
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
  
  // Calculate responsive dimensions
  const CONTAINER_PADDING = 0;
  const MAX_SLIDE_HEIGHT = responsiveHeight(55); // 55% of screen height, max 450px
  const SLIDE_HEIGHT = Math.min(responsiveHeight(55), responsiveSize(450, scale));
  const slideWidth = width; // Full width, already responsive
  const SLIDE_WIDTH_WITH_PADDING = width - (responsiveWidth(5) * 2); // Account for container padding
  
  // Get responsive styles
  const responsiveStyles = useMemo(() => getStyles(isSmallScreen, scale), [isSmallScreen, scale]);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [active, setActive] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [loading, setLoading] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [newMessageNotification, setNewMessageNotification] = useState<{ message: string; id: string | number } | null>(null);
  const lastMessageIdRef = useRef<string | number | null>(null);
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const currentSlide = slides[active] ?? null;
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

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await apiClient.getPromotionsHome();

      if (error) throw new Error(error);
      
      console.log('[Home] Promoții primite:', data);
      const promotionsArray = Array.isArray(data) ? data : [];
      console.log('[Home] Image Home URLs:', promotionsArray.map((p: any) => p.image_home_url));
      
      // Map image_home_url to image_url for Home page slides
      const mappedPromotions = promotionsArray.map((promo: any) => ({
        ...promo,
        image_url: promo.image_home_url || promo.image_url
      }));
      
      // Filter out all expired promotions and sort active ones by deadline
      const now = Date.now();
      const filteredAndSorted = mappedPromotions
        .filter((promo: any) => {
          const deadlineTime = new Date(promo.deadline).getTime();
          return deadlineTime > now; // Keep only active (not expired) promotions
        })
        .sort((a: any, b: any) => {
          const aDeadline = new Date(a.deadline).getTime();
          const bDeadline = new Date(b.deadline).getTime();
          // Sort by deadline (soonest first)
          return aDeadline - bDeadline;
        });
      
      console.log('[Home] Promoții filtrate și sortate:', filteredAndSorted);
      console.log('[Home] Image URLs finale:', filteredAndSorted.map((p: any) => p.image_url));
      
      setSlides(filteredAndSorted);
    } catch (err) {
      console.error('Eroare la preluarea promoțiilor:', err);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [fadeAnim]);

  useEffect(() => {
    fetchPromotions();

    // Configure notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    // Request permissions on mount
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFEE00',
          sound: 'default',
        });
      }
      
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Home] Permisiuni notificări refuzate');
      }
    })();
  }, [fetchPromotions]);

  useEffect(() => {
    if (slides.length === 0) return;

    setTimeLeft(calcLeft(slides[active].deadline));
    const timer = setInterval(() => {
      setTimeLeft(calcLeft(slides[active].deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [active, slides]);

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

  const nextSlide = useCallback(() => {
    if (slides.length === 0) return;
    const nextIndex = (active + 1) % slides.length;
    goToSlide(nextIndex);
  }, [active, slides.length, goToSlide]);

  const prevSlide = useCallback(() => {
    if (slides.length === 0) return;
    const prevIndex = (active - 1 + slides.length) % slides.length;
    goToSlide(prevIndex);
  }, [active, slides.length, goToSlide]);

  const headerHeight = useMemo(() => isSmallScreen ? responsiveSize(70, scale) : responsiveSize(80, scale), [isSmallScreen, scale]);

  // Load unread messages count
  const loadUnreadMessagesCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await apiClient.getMessages(user.id);
      
      if (error) {
        console.error('[Home] Eroare la încărcarea mesajelor pentru badge:', error);
        return;
      }

      if (data && Array.isArray(data)) {
        // Numără mesajele de la admin care nu sunt citite (read = false sau null)
        const unreadCount = data.filter((msg: any) => 
          msg.is_from_admin === true && (msg.read === false || msg.read === null || !msg.read)
        ).length;

        setUnreadMessagesCount(unreadCount);

        // Detectează mesaje noi pentru notificare
        if (data.length > 0) {
          const latestMessage = data[data.length - 1];
          if (latestMessage.is_from_admin && latestMessage.id !== lastMessageIdRef.current) {
            // Mesaj nou de la admin
            if (lastMessageIdRef.current !== null) {
              // Nu trimitem notificare la prima încărcare
              const messageText = latestMessage.message || 'Ai primit un mesaj nou';
              
              setNewMessageNotification({
                message: messageText,
                id: latestMessage.id,
              });
              
              // Trimite notificare push nativă în bara de notificări
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Volta Support',
                  body: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,
                  data: { type: 'message', messageId: latestMessage.id },
                  sound: true,
                },
                trigger: null, // Show immediately
              });
              
              // Animație pentru notificare
              Animated.spring(notificationAnim, {
                toValue: 0,
                tension: 65,
                friction: 8,
                useNativeDriver: true,
              }).start();

              // Ascunde notificarea după 5 secunde
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
      }
    } catch (error) {
      console.error('[Home] Eroare exception la încărcarea mesajelor:', error);
    }
  }, [user?.id, router]);

  // Polling pentru mesaje necitite când ecranul este activ
  useFocusEffect(
    useCallback(() => {
      loadUnreadMessagesCount();
      
      const interval = setInterval(() => {
        if (user?.id) {
          loadUnreadMessagesCount();
        }
      }, 5000); // La fiecare 5 secunde

      return () => clearInterval(interval);
    }, [user?.id, loadUnreadMessagesCount])
  );

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
              }
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
                style={[responsiveStyles.iconBtn, { backgroundColor: isDark ? colors.surface : '#333' }]} 
                onPress={() => router.push('/Notifications')}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={22} color={colors.primaryButton} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[responsiveStyles.iconBtn, { backgroundColor: isDark ? colors.surface : '#333', marginLeft: 8 }]} 
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
              }
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
              <View style={[responsiveStyles.avatarGradient, { backgroundColor: '#000' }]}>
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

        {/* Modern Slider */}
        {isDark ? (
          <Animated.View 
            style={[
              responsiveStyles.slideshowWrap,
              { 
                opacity: fadeAnim,
                minHeight: SLIDE_HEIGHT,
                overflow: 'hidden',
                width: '100%',
                alignSelf: 'center',
              }
            ]}
          >
          {loading ? (
            <View style={responsiveStyles.loadingContainer}>
              <ActivityIndicator color={colors.text} size="large" />
              <Text style={[responsiveStyles.loadingText, { color: colors.text }]}>
                Se încarcă promoțiile...
              </Text>
            </View>
          ) : slides.length === 0 ? (
            <View style={responsiveStyles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
              <Text style={[responsiveStyles.emptyText, { color: colors.textMuted }]}>
                Nu există promoții active momentan.
              </Text>
            </View>
          ) : (
            <>
              <View style={{ position: 'relative', width: '100%', height: SLIDE_HEIGHT }}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  scrollEnabled={false}
                  showsHorizontalScrollIndicator={false}
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  ref={scrollRef}
                  decelerationRate="fast"
                  snapToInterval={slideWidth}
                  snapToAlignment="center"
                  contentContainerStyle={{ alignItems: 'center' }}
                >
                  {slides.map((s, i) => (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.9}
                      onPress={async () => {
                        if (s.link) {
                          try {
                            await openBrowserAsync(s.link, {
                              presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
                            });
                          } catch (error) {
                            console.error('Eroare la deschiderea linkului:', error);
                          }
                        }
                      }}
                      style={[
                        styles.slide, 
                        { 
                          width: slideWidth, 
                          height: SLIDE_HEIGHT,
                          alignSelf: 'center',
                        }
                      ]}
                    >
                      <View style={styles.imageWrap}>
                        <Image
                          source={{ uri: s.image_url }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="contain"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.7)']}
                          style={styles.imageGradient}
                        />
                        <View style={styles.slideOverlay} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {currentSlide && (() => {
                  const tl = calcLeft(currentSlide.deadline);
                  const total = tl.days + tl.hours + tl.minutes;
                  if (total <= 0) return null;
                  
                  return (
                    <View style={responsiveStyles.timerBottomRight}>
                      <View style={responsiveStyles.timerContainer}>
                        <View style={responsiveStyles.timerContent}>
                          {/* Day */}
                          <View style={responsiveStyles.timerUnit}>
                            <View style={responsiveStyles.timerBox}>
                              <View style={responsiveStyles.timerNumberLine} />
                              <Text style={responsiveStyles.timerNumber}>
                                {String(tl.days).padStart(2, '0')}
                              </Text>
                            </View>
                            <Text style={responsiveStyles.timerLabel}>Zi</Text>
                          </View>
                          
                          {/* Separator */}
                          <View style={responsiveStyles.timerSeparator}>
                            <View style={responsiveStyles.timerDot} />
                            <View style={responsiveStyles.timerDot} />
                          </View>
                          
                          {/* Hours */}
                          <View style={responsiveStyles.timerUnit}>
                            <View style={responsiveStyles.timerBox}>
                              <View style={responsiveStyles.timerNumberLine} />
                              <Text style={responsiveStyles.timerNumber}>
                                {String(tl.hours).padStart(2, '0')}
                              </Text>
                            </View>
                            <Text style={responsiveStyles.timerLabel}>Ore</Text>
                          </View>
                          
                          {/* Separator */}
                          <View style={responsiveStyles.timerSeparator}>
                            <View style={responsiveStyles.timerDot} />
                            <View style={responsiveStyles.timerDot} />
                          </View>
                          
                          {/* Minutes */}
                          <View style={responsiveStyles.timerUnit}>
                            <View style={responsiveStyles.timerBox}>
                              <View style={responsiveStyles.timerNumberLine} />
                              <Text style={responsiveStyles.timerNumber}>
                                {String(tl.minutes).padStart(2, '0')}
                              </Text>
                            </View>
                            <Text style={responsiveStyles.timerLabel}>Min</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </View>

              {/* Slider Controls */}
              <View style={responsiveStyles.sliderControls}>
                <TouchableOpacity 
                  style={[responsiveStyles.sliderBtn, styles.sliderBtnDark]}
                  onPress={prevSlide}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={20} color="#FFEE00" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[responsiveStyles.sliderBtn, styles.sliderBtnDark]}
                  onPress={nextSlide}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-forward" size={16} color="#FFEE00" style={{ opacity: 0.6 }} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
        ) : (
          <Animated.View 
            style={[
              responsiveStyles.slideshowWrap,
              { 
                opacity: fadeAnim,
                minHeight: SLIDE_HEIGHT,
                overflow: 'hidden',
                width: '100%',
                alignSelf: 'center',
              }
            ]}
          >
            {loading ? (
              <View style={responsiveStyles.loadingContainer}>
                <ActivityIndicator color={colors.text} size="large" />
                <Text style={[responsiveStyles.loadingText, { color: colors.text }]}>
                  Se încarcă promoțiile...
                </Text>
              </View>
            ) : slides.length === 0 ? (
              <View style={responsiveStyles.emptyContainer}>
                <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
                <Text style={[responsiveStyles.emptyText, { color: colors.textMuted }]}>
                  Nu există promoții active momentan.
                </Text>
              </View>
            ) : (
              <>
                <View style={{ position: 'relative', width: '100%', height: SLIDE_HEIGHT }}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    ref={scrollRef}
                    decelerationRate="fast"
                    snapToInterval={slideWidth}
                    snapToAlignment="center"
                    contentContainerStyle={{ alignItems: 'center' }}
                  >
                    {slides.map((s, i) => (
                      <TouchableOpacity
                        key={s.id}
                        activeOpacity={0.9}
                        onPress={async () => {
                          if (s.link) {
                            try {
                              await openBrowserAsync(s.link, {
                                presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
                              });
                            } catch (error) {
                              console.error('Eroare la deschiderea linkului:', error);
                            }
                          }
                        }}
                        style={[
                          styles.slide, 
                          { 
                            width: slideWidth, 
                            height: SLIDE_HEIGHT,
                            alignSelf: 'center',
                          }
                        ]}
                      >
                        <View style={styles.imageWrap}>
                          <Image
                            source={{ uri: s.image_url }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                            onError={(error) => {
                              console.error('[Home] Eroare la încărcarea imaginii:', s.image_url, error.nativeEvent.error);
                            }}
                            onLoad={() => {
                              console.log('[Home] Imagine încărcată cu succes:', s.image_url);
                            }}
                            onLoadStart={() => {
                              console.log('[Home] Începe încărcarea imaginii:', s.image_url);
                            }}
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.65)']}
                            style={styles.imageGradient}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {currentSlide && (() => {
                    const tl = calcLeft(currentSlide.deadline);
                    const total = tl.days + tl.hours + tl.minutes;
                    if (total <= 0) return null;
                    
                    return (
                      <View style={responsiveStyles.timerBottomRight}>
                        <View style={responsiveStyles.timerContainer}>
                          <View style={responsiveStyles.timerContent}>
                            {/* Day */}
                            <View style={responsiveStyles.timerUnit}>
                              <View style={responsiveStyles.timerBox}>
                                <View style={responsiveStyles.timerNumberLine} />
                                <Text style={responsiveStyles.timerNumber}>
                                  {String(tl.days).padStart(2, '0')}
                                </Text>
                              </View>
                              <Text style={responsiveStyles.timerLabel}>Zi</Text>
                            </View>
                            
                            {/* Separator */}
                            <View style={responsiveStyles.timerSeparator}>
                              <View style={responsiveStyles.timerDot} />
                              <View style={responsiveStyles.timerDot} />
                            </View>
                            
                            {/* Hours */}
                            <View style={responsiveStyles.timerUnit}>
                              <View style={responsiveStyles.timerBox}>
                                <View style={responsiveStyles.timerNumberLine} />
                                <Text style={responsiveStyles.timerNumber}>
                                  {String(tl.hours).padStart(2, '0')}
                                </Text>
                              </View>
                              <Text style={responsiveStyles.timerLabel}>Ore</Text>
                            </View>
                            
                            {/* Separator */}
                            <View style={responsiveStyles.timerSeparator}>
                              <View style={responsiveStyles.timerDot} />
                              <View style={responsiveStyles.timerDot} />
                            </View>
                            
                            {/* Minutes */}
                            <View style={responsiveStyles.timerUnit}>
                              <View style={responsiveStyles.timerBox}>
                                <View style={responsiveStyles.timerNumberLine} />
                                <Text style={responsiveStyles.timerNumber}>
                                  {String(tl.minutes).padStart(2, '0')}
                                </Text>
                              </View>
                              <Text style={responsiveStyles.timerLabel}>Min</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })()}
                </View>

                {/* Slider Controls */}
                <View style={responsiveStyles.sliderControls}>
                  <TouchableOpacity 
                    style={responsiveStyles.sliderBtn}
                    onPress={prevSlide}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chevron-back" size={16} color={colors.text} style={{ opacity: 0.6 }} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={responsiveStyles.sliderBtn}
                    onPress={nextSlide}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.text} style={{ opacity: 0.6 }} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        )}

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
  slideshowWrap: { 
    marginTop: 0,
    marginBottom: responsiveSize(16, scale),
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  timerBottomRight: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 100,
  },
  timerContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 0,
    paddingHorizontal: responsiveSize(16, scale),
    paddingVertical: responsiveSize(8, scale),
    marginBottom: 0,
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveSize(12, scale),
    paddingVertical: 0,
  },
  timerUnit: {
    alignItems: 'center',
    gap: responsiveSize(4, scale),
    flex: 1,
  },
  timerBox: {
    width: '100%',
    height: responsiveSize(40, scale),
    backgroundColor: '#000',
    borderRadius: responsiveSize(6, scale),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveSize(2, scale) },
    shadowOpacity: 0.3,
    shadowRadius: responsiveSize(4, scale),
    elevation: 4,
  },
  timerNumberLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#888',
    zIndex: 1,
  },
  timerNumber: {
    fontSize: responsiveSize(20, scale),
    fontWeight: '700',
    color: '#FFF',
    zIndex: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: 0,
  },
  timerLabel: {
    fontSize: responsiveSize(8, scale),
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: responsiveSize(2, scale),
  },
  timerSeparator: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveSize(2, scale),
    marginBottom: 0,
    paddingVertical: responsiveSize(4, scale),
  },
  timerDot: {
    width: responsiveSize(6, scale),
    height: responsiveSize(6, scale),
    borderRadius: responsiveSize(3, scale),
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveHeight(8),
  },
  loadingText: {
    marginTop: responsiveSize(12, scale),
    fontSize: responsiveSize(14, scale),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveHeight(8),
  },
  emptyText: {
    marginTop: responsiveSize(12, scale),
    fontSize: responsiveSize(15, scale),
    textAlign: 'center',
  },
  slide: { 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    position: 'relative',
  },
  imageWrap: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { 
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    zIndex: 1,
  },
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
  slide: { 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    position: 'relative',
  },
  imageWrap: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { 
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    zIndex: 1,
  },
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
