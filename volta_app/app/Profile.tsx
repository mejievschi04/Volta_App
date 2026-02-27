import React, { useEffect, useState, useContext, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../lib/apiClient";
import { UserContext } from "./_context/UserContext";
import { ThemeContext } from "./_context/ThemeContext";
import DiscountCard from "./_components/DiscountCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import * as Notifications from 'expo-notifications';
import Screen from "./_components/Screen";
import { getColors, spacing } from "./_components/theme";
import { useResponsive, responsiveSize, responsiveWidth, responsiveHeight } from "./_hooks/useResponsive";
import PrimaryButton from "./_components/PrimaryButton";

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type?: string;
  created_at?: string;
};

const ProfileScreen = () => {
  const router = useRouter();
  const { user, setUser, selectedCardPercent, setSelectedCardPercent } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const { isSmallScreen, scale, width: screenWidth } = useResponsive();
  const [cardIndex, setCardIndex] = useState(0);
  const cardsScrollRef = useRef<ScrollView>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const lastNotificationIdsRef = useRef<Set<string>>(new Set());
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      console.log('[Profile] Fetching user data, user:', user);
      if (!user?.id) {
        console.warn('[Profile] User ID not found, using user data from context');
        // Dacă nu avem ID, folosim datele din context
        if (user) {
          setUserData(user);
        }
        setLoading(false);
        return;
      }
      console.log('[Profile] Requesting user data for ID:', user.id);
      const { data, error } = await apiClient.getUser(user.id);
      
      console.log('[Profile] User data response:', { hasData: !!data, hasError: !!error, error });

      if (error) {
        console.error('[Profile] Error fetching user data:', error);
        // Dacă există o eroare, folosim datele din context
        if (user) {
          setUserData(user);
        }
        return;
      }
      if (data) {
        console.log('[Profile] User data received:', data);
        setUserData(data);
      } else if (user) {
        // Dacă nu primim date, folosim datele din context
        console.log('[Profile] No data received, using context user data');
        setUserData(user);
      }
    } catch (err) {
      console.error("[Profile] Eroare la preluarea datelor utilizatorului:", err);
      // În caz de eroare, folosim datele din context
      if (user) {
        setUserData(user);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const READ_IDS_KEY = 'notifications_read_ids';
      const DELETED_IDS_KEY = 'notifications_deleted_ids';
      
      const getReadIds = async (): Promise<Set<string>> => {
        try {
          const raw = await AsyncStorage.getItem(READ_IDS_KEY);
          if (!raw) return new Set();
          const arr = JSON.parse(raw) as string[];
          return new Set(arr);
        } catch {
          return new Set();
        }
      };

      const getDeletedIds = async (): Promise<Set<string>> => {
        try {
          const raw = await AsyncStorage.getItem(DELETED_IDS_KEY);
          if (!raw) return new Set();
          const arr = JSON.parse(raw) as string[];
          return new Set(arr);
        } catch {
          return new Set();
        }
      };

      console.log('[Profile] Fetching notification IDs...');
      const { data, error } = await apiClient.getNotificationIds();
      
      const notificationIds = Array.isArray(data) ? data : [];
      console.log('[Profile] Notification IDs response:', { hasData: !!data, hasError: !!error, dataLength: notificationIds.length, error });

      if (error) {
        console.error('[Profile] Eroare la preluarea notificărilor:', error);
        // Setăm valori default în caz de eroare
        setUnreadCount(0);
        setTotalNotifications(0);
        return;
      }

      const readIds = await getReadIds();
      const deletedIds = await getDeletedIds();
      
      // Filter out deleted notifications first
      const notDeleted = notificationIds.filter((n: any) => {
        const idStr = String(n?.id ?? '');
        return !deletedIds.has(idStr);
      });
      
      setTotalNotifications(notDeleted.length);
      
      // Convert all IDs to strings for consistent comparison
      const unread = notDeleted.filter((n: any) => {
        const idStr = String(n?.id ?? '');
        return !readIds.has(idStr);
      });
      
      setUnreadCount(unread.length);

      // Detectează notificări noi pentru push notification
      const currentNotificationIds = new Set(notDeleted.map((n: any) => String(n?.id ?? '')));
      const newNotifications = notDeleted.filter((n: any) => {
        const idStr = String(n?.id ?? '');
        return !lastNotificationIdsRef.current.has(idStr) && !readIds.has(idStr);
      });

      // Trimite notificări push pentru notificări noi
      if (newNotifications.length > 0 && lastNotificationIdsRef.current.size > 0) {
        // Nu trimitem notificare la prima încărcare
        for (const notif of newNotifications) {
          const n = notif as { id: number; title?: string; message?: string; messsage?: string };
          const notifTitle = n.title || 'Notificare nouă';
          const notifMessage = n.message || n.messsage || '';
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notifTitle,
              body: notifMessage.length > 100 ? notifMessage.substring(0, 100) + '...' : notifMessage,
              data: { type: 'notification', notificationId: String(notif.id) },
              sound: true,
            },
            trigger: null, // Show immediately
          });
        }
      }

      // Actualizează setul de ID-uri cunoscute
      lastNotificationIdsRef.current = currentNotificationIds;
    } catch (err) {
      console.error('Eroare la numărarea notificărilor:', err);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // Re-check when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );

  const handleLogout = useCallback(() => {
    Alert.alert("Deconectare", "Sigur vrei să te deconectezi?", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Da",
        style: "destructive",
        onPress: async () => {
          try {
            setUser(null); // setUser șterge automat din AsyncStorage
            router.replace("/Login");
          } catch (e) {
            console.error("Logout error:", e);
          }
        },
      },
    ]);
  }, [setUser, router]);

  const fullName = useMemo(() => {
    const data = userData || user;
    return `${data?.nume || ""} ${data?.prenume || ""}`.trim();
  }, [userData, user]);

  const cardName = useMemo(() => {
    return fullName.toUpperCase() || "VOLTA USER";
  }, [fullName]);

  const avatarInitial = useMemo(() => {
    const data = userData || user;
    return ((data?.prenume || data?.nume || "V").charAt(0) || "V").toUpperCase();
  }, [userData, user]);
  
  // Get responsive styles
  const responsiveStyles = useMemo(() => getStyles(isSmallScreen, scale), [isSmallScreen, scale]);

  if (loading) {
    return (
      <Screen>
        <View style={[responsiveStyles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[responsiveStyles.loadingText, { color: colors.text }]}>
            Se încarcă...
          </Text>
        </View>
      </Screen>
    );
  }

  // Dacă nu avem userData, folosim datele din context
  const displayUserData = userData || user;
  
  if (!displayUserData) {
    return (
      <Screen>
        <View style={[responsiveStyles.loadingContainer, { backgroundColor: colors.background }]}>
          <Text style={[responsiveStyles.loadingText, { color: colors.text }]}>
            Nu sunt disponibile date utilizator
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ overflow: 'visible' }}>
      <View style={[responsiveStyles.container, { backgroundColor: colors.background }]}>

        <ScrollView
          style={responsiveStyles.scrollView}
          contentContainerStyle={responsiveStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              responsiveStyles.content,
              { opacity: fadeAnim, overflow: 'visible' },
            ]}
          >
            {/* Modern User Section */}
            {isDark ? (
              <Animated.View
                style={[
                  responsiveStyles.userSection,
                  {
                    opacity: fadeAnim,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    backgroundColor: colors.surface,
                    overflow: 'hidden',
                  },
                ]}
              >
                <View style={responsiveStyles.avatarContainer}>
                  <LinearGradient
                    colors={['#FFEE00', '#FFEE00']}
                    style={responsiveStyles.avatarGradient}
                  >
                    <Text style={responsiveStyles.avatarInitial}>{avatarInitial}</Text>
                  </LinearGradient>
                </View>
                <View style={responsiveStyles.userInfo}>
                  <Text style={[responsiveStyles.userName, { color: colors.text }]} numberOfLines={1}>
                    {fullName}
                  </Text>
                  <View style={responsiveStyles.phoneRow}>
                    <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                    <Text style={[responsiveStyles.userPhone, { color: colors.textMuted }]}>
                      {displayUserData?.telefon || user?.telefon || ''}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ) : (
              <Animated.View
                style={[
                  responsiveStyles.userSection,
                  {
                    opacity: fadeAnim,
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
                <View style={responsiveStyles.avatarContainer}>
                  <View style={[responsiveStyles.avatarGradient, { backgroundColor: '#000', borderWidth: 1.5, borderColor: '#FFEE00' }]}>
                    <Text style={[responsiveStyles.avatarInitial, { color: '#FFEE00' }]}>{avatarInitial}</Text>
                  </View>
                </View>
                <View style={responsiveStyles.userInfo}>
                  <Text style={[responsiveStyles.userName, { color: '#000' }]} numberOfLines={1}>
                    {fullName}
                  </Text>
                  <View style={responsiveStyles.phoneRow}>
                    <Ionicons name="call-outline" size={16} color="#000" />
                    <Text style={[responsiveStyles.userPhone, { color: '#000' }]}>
                      {displayUserData?.telefon || user?.telefon || ''}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}

          {/* Carduri reducere – aspect ca înainte; date din API, un singur card selectat pentru barcode */}
          {(() => {
            const cards = (displayUserData as any)?.discount_cards as { id: number; discount_value: 5 | 10; expires_at: string | null }[] | undefined;
            const activeCards = Array.isArray(cards) ? cards.filter((c) => !c.expires_at || new Date(c.expires_at) > new Date()) : [];
            const selectedId = (displayUserData as any)?.selected_discount_card_id as number | null | undefined;
            const selectedCard = activeCards.find((c) => c.id === selectedId) || activeCards[0];
            if (activeCards.length === 0) return null;
            const pageWidth = screenWidth - 2 * spacing.lg;
            return (
              <View style={responsiveStyles.cardsSwipeContainer}>
                <ScrollView
                  ref={cardsScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={pageWidth}
                  snapToAlignment="center"
                  contentContainerStyle={responsiveStyles.cardsSwipeContent}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
                    setCardIndex(idx);
                  }}
                >
                  {activeCards.map((card) => {
                    const isSelected = card.id === selectedCard?.id;
                    return (
                      <View key={card.id} style={[responsiveStyles.cardPage, { width: pageWidth }]}>
                        <DiscountCard
                          name={cardName}
                          discountValue={card.discount_value}
                          cardCode={`VOLTA-${displayUserData?.id ?? ''}-${card.id}`.slice(0, 20) || "VOLTA-0000"}
                          barcodeValue={displayUserData?.id != null && card.id != null
                            ? `${String(displayUserData.id).padStart(6, '0')}${String(card.id).padStart(6, '0')}`.slice(0, 12)
                            : "458712345678"}
                          profileMode
                          variant={card.discount_value === 5 ? 'secondary' : 'primary'}
                          maxWidth={pageWidth - 16}
                        />
                        {isSelected ? (
                          <View style={[responsiveStyles.cardSelectButton, responsiveStyles.cardSelectButtonSelected, { borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                            <Text style={[responsiveStyles.cardSelectButtonText, { color: '#22c55e' }]}>Selectat</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[responsiveStyles.cardSelectButton, { borderColor: isDark ? colors.primaryButton : '#000' }]}
                            onPress={async () => {
                              if (!displayUserData?.id) return;
                              const { error } = await apiClient.setSelectedCard(displayUserData.id, card.id);
                              if (error) return;
                              const { data } = await apiClient.getUser(displayUserData.id);
                              if (data) {
                                setUserData(data);
                                setUser(data);
                                setSelectedCardPercent(card.discount_value);
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[responsiveStyles.cardSelectButtonText, { color: isDark ? colors.primaryButton : '#000' }]}>Selectează</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={responsiveStyles.cardDots}>
                  {activeCards.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        responsiveStyles.cardDot,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' },
                        cardIndex === idx && responsiveStyles.cardDotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            );
          })()}

          {/* Action Buttons */}
          <View style={responsiveStyles.actionsSection}>
            <TouchableOpacity
              style={[
                responsiveStyles.actionButton,
                {
                  backgroundColor: isDark ? colors.surface : colors.surface,
                  borderColor: isDark ? colors.border : colors.border,
                },
              ]}
              onPress={() => router.push("/Notifications")}
              activeOpacity={0.7}
              accessibilityLabel="Notificări"
              accessibilityRole="button"
              accessibilityHint="Deschide lista de notificări"
            >
              <View
                style={[
                  responsiveStyles.actionIconContainer,
                  {
                    backgroundColor: isDark ? '#000' : '#1a1a1a',
                  },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={responsiveSize(22, scale)}
                  color={colors.primaryButton}
                />
                {unreadCount > 0 && (
                  <View style={[responsiveStyles.badge, { borderColor: colors.surface }]}>
                    <Text style={responsiveStyles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[responsiveStyles.actionLabel, { color: colors.text }]} numberOfLines={1}>
                Notificări
              </Text>
              <Ionicons name="chevron-forward" size={responsiveSize(20, scale)} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                responsiveStyles.actionButton,
                {
                  backgroundColor: isDark ? colors.surface : colors.surface,
                  borderColor: isDark ? colors.border : colors.border,
                },
              ]}
              onPress={() => router.push("/Settings")}
              activeOpacity={0.7}
              accessibilityLabel="Setări"
              accessibilityRole="button"
              accessibilityHint="Deschide ecranul de setări"
            >
              <View
                style={[
                  responsiveStyles.actionIconContainer,
                  {
                    backgroundColor: isDark ? '#000' : '#1a1a1a',
                  },
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={responsiveSize(22, scale)}
                  color={colors.primaryButton}
                />
              </View>
              <Text style={[responsiveStyles.actionLabel, { color: colors.text }]} numberOfLines={1}>
                Setări
              </Text>
              <Ionicons name="chevron-forward" size={responsiveSize(20, scale)} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <PrimaryButton
            title="Deconectare"
            onPress={handleLogout}
            icon="log-out-outline"
            style={responsiveStyles.logoutBtn}
          />
          </Animated.View>
        </ScrollView>
      </View>
    </Screen>
  );
};

export default ProfileScreen;

// Create responsive styles function
const getStyles = (isSmallScreen: boolean, scale: number) => StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    paddingHorizontal: responsiveWidth(5),
    paddingTop: responsiveSize(12, scale),
    paddingBottom: responsiveSize(12, scale),
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsiveWidth(5),
    paddingVertical: responsiveSize(16, scale),
    marginBottom: responsiveSize(16, scale),
    marginHorizontal: 0,
    width: '100%',
  },
  title: { 
    fontSize: isSmallScreen ? responsiveSize(28, scale) : responsiveSize(32, scale),
    fontWeight: '800',
    marginBottom: responsiveSize(4, scale),
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: isSmallScreen ? responsiveSize(14, scale) : responsiveSize(15, scale),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: responsiveSize(70, scale),
  },
  content: {
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: responsiveSize(12, scale),
    fontSize: responsiveSize(14, scale),
  },
  avatarContainer: {
    marginRight: responsiveSize(16, scale),
  },
  avatarGradient: {
    width: isSmallScreen ? responsiveSize(70, scale) : responsiveSize(75, scale),
    height: isSmallScreen ? responsiveSize(70, scale) : responsiveSize(75, scale),
    borderRadius: isSmallScreen ? responsiveSize(35, scale) : responsiveSize(37.5, scale),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarInitial: { 
    fontSize: isSmallScreen ? responsiveSize(28, scale) : responsiveSize(30, scale), 
    fontWeight: "700",
    color: '#000',
  },
  userInfo: { 
    flex: 1,
  },
  userName: { 
    fontSize: isSmallScreen ? responsiveSize(20, scale) : responsiveSize(24, scale), 
    fontWeight: "700", 
    marginBottom: responsiveSize(4, scale),
    letterSpacing: 0.3,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSize(6, scale),
  },
  userPhone: { 
    fontSize: isSmallScreen ? responsiveSize(15, scale) : responsiveSize(16, scale),
  },
  cardContainer: {
    marginHorizontal: 0,
    marginBottom: 16,
    paddingHorizontal: 0,
    width: '100%',
    alignItems: 'center',
  },
  actionsSection: {
    paddingHorizontal: 0,
    marginBottom: responsiveSize(20, scale),
    gap: responsiveSize(10, scale),
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsiveSize(14, scale),
    paddingHorizontal: responsiveSize(16, scale),
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: responsiveSize(10, scale),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
    minHeight: 56,
  },
  actionIconContainer: {
    width: responsiveSize(44, scale),
    height: responsiveSize(44, scale),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsiveSize(14, scale),
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: isSmallScreen ? responsiveSize(16, scale) : responsiveSize(17, scale),
    fontWeight: '600',
  },
  logoutBtn: {
    marginHorizontal: 0,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    width: '100%',
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: responsiveSize(14, scale),
    paddingHorizontal: responsiveSize(24, scale),
    gap: responsiveSize(10, scale),
  },
  logoutText: { 
    color: "#000", 
    fontSize: isSmallScreen ? responsiveSize(15, scale) : responsiveSize(16, scale), 
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // Card swipe section – responsive
  cardsSwipeContainer: {
    width: '100%',
    marginBottom: responsiveSize(20, scale),
    alignItems: 'center',
  },
  cardsSwipeContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveSize(16, scale),
    paddingHorizontal: 0,
  },
  cardDots: {
    flexDirection: 'row' as const,
    justifyContent: 'center',
    alignItems: 'center',
    gap: responsiveSize(8, scale),
    marginTop: responsiveSize(8, scale),
  },
  cardDot: {
    width: responsiveSize(8, scale),
    height: responsiveSize(8, scale),
    borderRadius: responsiveSize(4, scale),
  },
  cardDotActive: {
    backgroundColor: '#FFEE00',
    width: responsiveSize(10, scale),
    height: responsiveSize(10, scale),
    borderRadius: responsiveSize(5, scale),
  },
  cardSelectButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveSize(6, scale),
    marginTop: responsiveSize(10, scale),
    paddingVertical: responsiveSize(8, scale),
    paddingHorizontal: responsiveSize(16, scale),
    borderRadius: responsiveSize(20, scale),
    borderWidth: 1.5,
  },
  cardSelectButtonSelected: {
    opacity: 0.9,
  },
  cardSelectButtonText: {
    fontSize: responsiveSize(13, scale),
    fontWeight: '600' as const,
  },
});
