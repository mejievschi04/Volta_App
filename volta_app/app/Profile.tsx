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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../lib/apiClient";
import { getDiscountCardStatus, type DiscountCardStatusResponse } from "../lib/discountCardApi";
import { UserContext } from "./_context/UserContext";
import { ThemeContext } from "./_context/ThemeContext";
import DiscountCard from "./_components/DiscountCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import Notifications from "../lib/notifications";
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

  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [addCardCode, setAddCardCode] = useState("");
  const [addCardLoading, setAddCardLoading] = useState(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);
  const [addCardResult, setAddCardResult] = useState<DiscountCardStatusResponse | null>(null);
  
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
      if (!user?.id && user !== null) {
        if (user) setUserData(user);
        setLoading(false);
        return;
      }
      const { data: meData, error: meError } = await apiClient.getMe();
      if (meError) {
        if (user) setUserData(user);
        setLoading(false);
        return;
      }
      if (meData) {
        // Folosim doar discount_cards din getMe() – nu mai încărcăm lista din getUserDiscountCards,
        // ca să nu apară multe carduri; utilizatorul vede doar cardurile pe care le-a adăugat (returnate de getMe).
        const cardsFromMe = Array.isArray((meData as any).discount_cards) ? (meData as any).discount_cards : [];
        const normalizedRaw = cardsFromMe.map((c: any) => {
          const pct = c.max_discount_percent != null ? Number(c.max_discount_percent) : (c.discount_value != null ? Number(c.discount_value) : 10);
          const discount_value = Math.max(0, Math.min(100, Math.round(pct)));
          return {
            id: c.id,
            discount_value,
            expires_at: c.expires_at ?? null,
            barcode: c.barcode ?? c.code,
          };
        });
        const seenIds = new Set<number>();
        const normalized = normalizedRaw.filter((c: { id: number }) => {
          if (seenIds.has(c.id)) return false;
          seenIds.add(c.id);
          return true;
        });
        const merged = { ...meData, discount_cards: normalized };
        setUserData(merged);
        setUser(merged as any);
      } else if (user) {
        setUserData(user);
      }
    } catch (err) {
      if (user) setUserData(user);
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

      if (__DEV__) {
        console.log('[Profile] Fetching notification IDs...');
      }
      const { data, error } = await apiClient.getNotificationIds();
      
      const notificationIds = Array.isArray(data) ? data : [];
      if (__DEV__) {
        console.log('[Profile] Notification IDs response:', { hasData: !!data, hasError: !!error, dataLength: notificationIds.length });
      }

      if (error) {
        // Pe noul backend endpoint-ul /notifications poate să nu existe (404) – tratăm ca „fără notificări”
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
      if (__DEV__) {
        console.warn('[Profile] Notificări indisponibile:', err);
      }
      setUnreadCount(0);
      setTotalNotifications(0);
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
            await apiClient.logout();
          } catch (_) {
            // ignoră eroare la logout (token invalid etc.)
          }
          setUser(null);
          router.replace("/Login");
        },
      },
    ]);
  }, [setUser, router]);

  const openAddCardModal = useCallback(() => {
    setAddCardCode("");
    setAddCardError(null);
    setAddCardResult(null);
    setShowAddCardModal(true);
  }, []);

  const closeAddCardModal = useCallback(() => {
    setShowAddCardModal(false);
    setAddCardLoading(false);
    setAddCardError(null);
    setAddCardResult(null);
  }, []);

  const handleVerifyCard = useCallback(async () => {
    const code = addCardCode.trim();
    if (!code) {
      setAddCardError("Introdu codul de pe card.");
      return;
    }
    const phone = (userData || user)?.telefon?.trim() ?? "";
    if (!phone) {
      setAddCardError("Completează numărul de telefon în Profil (Editare profil), apoi încearcă din nou.");
      return;
    }
    setAddCardError(null);
    setAddCardResult(null);
    setAddCardLoading(true);
    try {
      const { data, error } = await getDiscountCardStatus(code, phone);
      if (error) {
        setAddCardError(error);
        return;
      }
      if (data) {
        setAddCardResult(data);
      }
    } finally {
      setAddCardLoading(false);
    }
  }, [addCardCode, userData, user]);

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
            {/* User card */}
            {isDark ? (
              <Animated.View
                style={[
                  responsiveStyles.userSection,
                  {
                    opacity: fadeAnim,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: StyleSheet.hairlineWidth,
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
                    <Ionicons name="call-outline" size={18} color={colors.textMuted} />
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
                    backgroundColor: '#FFF',
                    borderColor: 'rgba(0,0,0,0.08)',
                    borderWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={responsiveStyles.avatarContainer}>
                  <View style={[responsiveStyles.avatarGradient, { backgroundColor: '#000', borderWidth: 2, borderColor: '#FFEE00' }]}>
                    <Text style={[responsiveStyles.avatarInitial, { color: '#FFEE00' }]}>{avatarInitial}</Text>
                  </View>
                </View>
                <View style={responsiveStyles.userInfo}>
                  <Text style={[responsiveStyles.userName, { color: '#1a1a1a' }]} numberOfLines={1}>
                    {fullName}
                  </Text>
                  <View style={responsiveStyles.phoneRow}>
                    <Ionicons name="call-outline" size={18} color="#666" />
                    <Text style={[responsiveStyles.userPhone, { color: '#666' }]}>
                      {displayUserData?.telefon || user?.telefon || ''}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}

          {/* Buton Adaugă card */}
          <TouchableOpacity
            style={[
              responsiveStyles.addCardButton,
              {
                backgroundColor: isDark ? colors.surface : '#F8F8F8',
                borderColor: isDark ? colors.border : 'rgba(0,0,0,0.1)',
              },
            ]}
            onPress={openAddCardModal}
            activeOpacity={0.8}
          >
            <Ionicons name="card-outline" size={responsiveSize(22, scale)} color={colors.primaryButton} />
            <Text style={[responsiveStyles.addCardButtonText, { color: colors.text }]}>Adaugă card de reducere</Text>
            <Ionicons name="add-circle-outline" size={responsiveSize(20, scale)} color={colors.primaryButton} />
          </TouchableOpacity>

          {/* Carduri reducere – aspect ca înainte; date din API, un singur card selectat pentru barcode */}
          {(() => {
            const cards = (displayUserData as any)?.discount_cards as { id: number; discount_value: number; expires_at: string | null; barcode?: string }[] | undefined;
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
                  {activeCards.map((card, index) => {
                    const isSelected = card.id === selectedCard?.id;
                    const uniqueKey = card.id != null ? `card-${card.id}` : `card-fallback-${index}`;
                    const cardCodeDisplay = card.barcode ?? (displayUserData?.id != null && card.id != null ? `VOLTA-${displayUserData.id}-${card.id}`.slice(0, 20) : '—');
                    const barcodeDisplay = card.barcode ?? (displayUserData?.id != null && card.id != null ? `${String(displayUserData.id).padStart(6, '0')}${String(card.id).padStart(6, '0')}`.slice(0, 12) : undefined);
                    return (
                      <View key={uniqueKey} style={[responsiveStyles.cardPage, { width: pageWidth }]}>
                        <DiscountCard
                          name={cardName}
                          discountValue={card.discount_value}
                          cardCode={cardCodeDisplay}
                          barcodeValue={barcodeDisplay}
                          profileMode
                          variant={card.discount_value <= 5 ? 'secondary' : 'primary'}
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
                              const { data } = await apiClient.getMe();
                              if (data) {
                                const mergedUser = {
                                  ...data,
                                  discount_cards: (displayUserData as any)?.discount_cards ?? (data as any)?.discount_cards ?? [],
                                  selected_discount_card_id: (data as any)?.selected_discount_card_id ?? card.id,
                                };
                                setUserData(mergedUser);
                                setUser(mergedUser as any);
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
                  backgroundColor: isDark ? colors.surface : '#FFF',
                  borderColor: isDark ? colors.border : 'rgba(0,0,0,0.08)',
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
                  { backgroundColor: isDark ? '#1a1a1a' : '#1a1a1a' },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={responsiveSize(20, scale)}
                  color={colors.primaryButton}
                />
                {unreadCount > 0 && (
                  <View style={[responsiveStyles.badge, { borderColor: isDark ? colors.surface : '#FFF' }]}>
                    <Text style={responsiveStyles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[responsiveStyles.actionLabel, { color: colors.text }]} numberOfLines={1}>
                Notificări
              </Text>
              <Ionicons name="chevron-forward" size={responsiveSize(18, scale)} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                responsiveStyles.actionButton,
                {
                  backgroundColor: isDark ? colors.surface : '#FFF',
                  borderColor: isDark ? colors.border : 'rgba(0,0,0,0.08)',
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
                  { backgroundColor: isDark ? '#1a1a1a' : '#1a1a1a' },
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={responsiveSize(20, scale)}
                  color={colors.primaryButton}
                />
              </View>
              <Text style={[responsiveStyles.actionLabel, { color: colors.text }]} numberOfLines={1}>
                Setări
              </Text>
              <Ionicons name="chevron-forward" size={responsiveSize(18, scale)} color={colors.textMuted} />
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

      {/* Modal Adaugă card */}
      <Modal
        visible={showAddCardModal}
        transparent
        animationType="fade"
        onRequestClose={closeAddCardModal}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[modalStyles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={closeAddCardModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={modalStyles.modalKeyboardWrap}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[modalStyles.modalBox, { backgroundColor: colors.background }]}>
              <View style={[modalStyles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[modalStyles.modalTitle, { color: colors.text }]}>Adaugă card de reducere</Text>
                <TouchableOpacity onPress={closeAddCardModal} style={[modalStyles.modalCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={modalStyles.modalScroll}>
                {!addCardResult ? (
                  <>
                    <Text style={[modalStyles.modalLabel, { color: colors.textMuted }]}>Numărul de pe card</Text>
                    <TextInput
                      style={[modalStyles.modalInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border, color: colors.text }]}
                      placeholder="Ex: 121717"
                      placeholderTextColor={colors.textMuted}
                      value={addCardCode}
                      onChangeText={(t) => { setAddCardCode(t); setAddCardError(null); }}
                      keyboardType="number-pad"
                      maxLength={20}
                    />
                    <Text style={[modalStyles.modalHint, { color: colors.textMuted }]}>
                      Se verifică automat cu numărul de telefon din cont.
                    </Text>
                    {addCardError ? (
                      <View style={[modalStyles.modalErrorWrap, { backgroundColor: isDark ? 'rgba(220,50,50,0.15)' : 'rgba(220,50,50,0.1)' }]}>
                        <Ionicons name="warning-outline" size={18} color="#c62828" />
                        <Text style={modalStyles.modalErrorText}>{addCardError}</Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={[modalStyles.modalVerifyBtn, { backgroundColor: colors.primaryButton }]}
                      onPress={handleVerifyCard}
                      disabled={addCardLoading}
                      activeOpacity={0.85}
                    >
                      {addCardLoading ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={22} color="#000" />
                          <Text style={modalStyles.modalVerifyBtnText}>Verifică card</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={[modalStyles.modalSuccessCard, { backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)', borderColor: '#22c55e' }]}>
                      <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
                      <Text style={[modalStyles.modalSuccessTitle, { color: colors.text }]}>Card valid</Text>
                      <Text style={[modalStyles.modalSuccessRow, { color: colors.text }]}>Titular: {addCardResult.card_owner}</Text>
                      <Text style={[modalStyles.modalSuccessRow, { color: colors.textMuted }]}>Reducere max: {addCardResult.max_discount_percent}%</Text>
                      {addCardResult.cashback_percent != null && addCardResult.cashback_percent > 0 ? (
                        <Text style={[modalStyles.modalSuccessRow, { color: colors.textMuted }]}>Cashback: {addCardResult.cashback_percent}%</Text>
                      ) : null}
                      <Text style={[modalStyles.modalSuccessRow, { color: colors.textMuted }]}>Barcode: {addCardResult.barcode}</Text>
                    </View>
                    <Text style={[modalStyles.modalSuccessHint, { color: colors.textMuted }]}>
                      Cardul este activ și legat de acest telefon. Îl poți folosi la magazin.
                    </Text>
                    <TouchableOpacity
                      style={[modalStyles.modalVerifyBtn, { backgroundColor: colors.primaryButton }]}
                      onPress={closeAddCardModal}
                      activeOpacity={0.85}
                    >
                      <Text style={modalStyles.modalVerifyBtnText}>Închide</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
};

export default ProfileScreen;

// Create responsive styles function
const PROFILE_PADDING_H = 20;
const getStyles = (isSmallScreen: boolean, scale: number) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: responsiveSize(PROFILE_PADDING_H, scale),
    paddingTop: responsiveSize(16, scale),
    paddingBottom: responsiveSize(8, scale),
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsiveSize(PROFILE_PADDING_H, scale),
    paddingVertical: responsiveSize(20, scale),
    marginBottom: responsiveSize(20, scale),
    marginHorizontal: responsiveSize(PROFILE_PADDING_H, scale),
    width: undefined,
    alignSelf: 'stretch',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
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
    paddingTop: responsiveSize(8, scale),
    paddingBottom: responsiveSize(80, scale),
    paddingHorizontal: 0,
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
    marginRight: responsiveSize(18, scale),
  },
  avatarGradient: {
    width: isSmallScreen ? responsiveSize(64, scale) : responsiveSize(72, scale),
    height: isSmallScreen ? responsiveSize(64, scale) : responsiveSize(72, scale),
    borderRadius: isSmallScreen ? responsiveSize(20, scale) : responsiveSize(22, scale),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarInitial: {
    fontSize: isSmallScreen ? responsiveSize(26, scale) : responsiveSize(28, scale),
    fontWeight: "700",
    color: '#000',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: isSmallScreen ? responsiveSize(19, scale) : responsiveSize(22, scale),
    fontWeight: "700",
    marginBottom: responsiveSize(6, scale),
    letterSpacing: 0.2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSize(8, scale),
  },
  userPhone: {
    fontSize: isSmallScreen ? responsiveSize(14, scale) : responsiveSize(15, scale),
  },
  cardContainer: {
    marginHorizontal: responsiveSize(PROFILE_PADDING_H, scale),
    marginBottom: responsiveSize(20, scale),
    paddingHorizontal: 0,
    width: undefined,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  actionsSection: {
    paddingHorizontal: responsiveSize(PROFILE_PADDING_H, scale),
    marginBottom: responsiveSize(24, scale),
    gap: responsiveSize(12, scale),
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsiveSize(12, scale),
    paddingHorizontal: responsiveSize(14, scale),
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
    minHeight: 52,
  },
  actionIconContainer: {
    width: responsiveSize(40, scale),
    height: responsiveSize(40, scale),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsiveSize(12, scale),
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
    paddingHorizontal: 5,
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
    fontSize: isSmallScreen ? responsiveSize(15, scale) : responsiveSize(16, scale),
    fontWeight: '600',
  },
  logoutBtn: {
    marginHorizontal: responsiveSize(PROFILE_PADDING_H, scale),
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    width: undefined,
    alignSelf: 'stretch',
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: responsiveSize(16, scale),
    paddingHorizontal: responsiveSize(24, scale),
    gap: responsiveSize(10, scale),
  },
  logoutText: {
    color: "#000",
    fontSize: isSmallScreen ? responsiveSize(15, scale) : responsiveSize(16, scale),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardsSwipeContainer: {
    width: '100%',
    marginBottom: responsiveSize(24, scale),
    alignItems: 'center',
  },
  cardsSwipeContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveSize(20, scale),
    paddingHorizontal: 0,
  },
  cardDots: {
    flexDirection: 'row' as const,
    justifyContent: 'center',
    alignItems: 'center',
    gap: responsiveSize(10, scale),
    marginTop: responsiveSize(12, scale),
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
    gap: responsiveSize(8, scale),
    marginTop: responsiveSize(12, scale),
    paddingVertical: responsiveSize(10, scale),
    paddingHorizontal: responsiveSize(20, scale),
    borderRadius: responsiveSize(24, scale),
    borderWidth: 1.5,
  },
  cardSelectButtonSelected: {
    opacity: 0.9,
  },
  cardSelectButtonText: {
    fontSize: responsiveSize(14, scale),
    fontWeight: '600' as const,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveSize(16, scale),
    paddingHorizontal: responsiveSize(20, scale),
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: responsiveSize(20, scale),
    marginHorizontal: responsiveSize(PROFILE_PADDING_H, scale),
    gap: responsiveSize(12, scale),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addCardButtonText: {
    fontSize: responsiveSize(16, scale),
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalKeyboardWrap: {
    width: '100%',
    maxWidth: 400,
  },
  modalBox: {
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  modalHint: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  modalErrorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  modalErrorText: {
    flex: 1,
    fontSize: 14,
    color: '#c62828',
    fontWeight: '500',
  },
  modalVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
    gap: 8,
  },
  modalVerifyBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  modalSuccessCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSuccessTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  modalSuccessRow: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSuccessHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
});
