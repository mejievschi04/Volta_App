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
import { UserContext } from "./context/UserContext";
import { ThemeContext } from "./context/ThemeContext";
import DiscountCard from "./components/DiscountCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import * as Notifications from 'expo-notifications';
import { Platform } from "react-native";
import Screen from "./components/Screen";
import { getColors } from "./components/theme";
import { useResponsive, responsiveSize, responsiveWidth, responsiveHeight } from "./hooks/useResponsive";

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
  const { user, setUser } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const { isSmallScreen, scale } = useResponsive();
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

    // Configure notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Request permissions
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
      await Notifications.requestPermissionsAsync();
    })();
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
          const notifTitle = notif.title || 'Notificare nouă';
          const notifMessage = notif.message || notif.messsage || '';
          
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
    <Screen>
      <View style={[responsiveStyles.container, { backgroundColor: colors.background }]}>

        <ScrollView
          style={responsiveStyles.scrollView}
          contentContainerStyle={responsiveStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              responsiveStyles.content,
              {
                opacity: fadeAnim,
              },
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
                  }
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
                  }
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

          {/* Discount Card */}
          <View style={styles.cardContainer}>
            <DiscountCard
              name={cardName}
              discountValue={10}
              cardCode={`VOLTA-${displayUserData?.id ? String(displayUserData.id).slice(0, 4).toUpperCase() : "0000"}`}
              barcodeValue={displayUserData?.id ? String(displayUserData.id).slice(0, 12) : "458712345678"}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? colors.surface : 'transparent', borderColor: colors.border }]}
              onPress={() => {
                if (totalNotifications > 0) {
                  router.push("/Notifications");
                }
              }}
              activeOpacity={totalNotifications > 0 ? 0.7 : 1}
              disabled={totalNotifications === 0}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: isDark ? colors.surface : '#333' }]}>
                <Ionicons name="notifications-outline" size={24} color={colors.primaryButton} />
                {unreadCount > 0 && (
                  <View style={[styles.badge, { borderColor: isDark ? colors.background : '#FFFFFF' }]}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[responsiveStyles.actionLabel, { color: isDark ? colors.primaryButton : '#000' }]}>Notificări</Text>
              <Ionicons name="chevron-forward" size={20} color={isDark ? colors.primaryButton : '#000'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? colors.surface : 'transparent', borderColor: colors.border }]}
              onPress={() => router.push("/Settings")}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: isDark ? colors.surface : '#333' }]}>
                <Ionicons name="settings-outline" size={24} color={colors.primaryButton} />
              </View>
              <Text style={[responsiveStyles.actionLabel, { color: isDark ? colors.primaryButton : '#000' }]}>Setări</Text>
              <Ionicons name="chevron-forward" size={20} color={isDark ? colors.primaryButton : '#000'} />
            </TouchableOpacity>
          </View>

          {/* Points Section */}
          <View style={[responsiveStyles.pointsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={responsiveStyles.pointsHeader}>
              <Ionicons name="star" size={24} color={isDark ? colors.primaryButton : '#000'} />
              <Text style={[responsiveStyles.pointsTitle, { color: isDark ? colors.primaryButton : '#000' }]}>
                Puncte totale: {user?.puncte ?? 0}
              </Text>
            </View>
            <Text style={[responsiveStyles.pointsInfo, { color: isDark ? colors.textMuted : '#000' }]}>
              Poți folosi aceste puncte pentru reduceri sau beneficii exclusive.
            </Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity 
            style={responsiveStyles.logoutBtn} 
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FFEE00', '#FFEE00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={responsiveStyles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={22} color="#000" />
              <Text style={responsiveStyles.logoutText}>Deconectare</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    marginBottom: 16,
    gap: 0,
    width: '100%',
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingHorizontal: 20,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    width: '100%',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  badge: {
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
  pointsSection: {
    marginHorizontal: 0,
    padding: responsiveSize(16, scale),
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: responsiveSize(16, scale),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    width: '100%',
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsiveSize(6, scale),
    gap: responsiveSize(10, scale),
  },
  pointsTitle: { 
    fontSize: isSmallScreen ? responsiveSize(16, scale) : responsiveSize(17, scale), 
    fontWeight: "700",
  },
  pointsInfo: { 
    fontSize: isSmallScreen ? responsiveSize(12, scale) : responsiveSize(13, scale),
    lineHeight: responsiveSize(18, scale),
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
});

// Static styles that don't need responsive values
const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 0,
    marginBottom: 16,
    paddingHorizontal: 0,
    width: '100%',
    alignItems: 'center',
  },
  actionsSection: {
    paddingHorizontal: 0,
    marginBottom: 16,
    gap: 0,
    width: '100%',
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingHorizontal: 20,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    width: '100%',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  badge: {
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
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
});
