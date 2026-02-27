import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  Alert,
  Animated,
  Platform,
  RefreshControl,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoNotifications from 'expo-notifications';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemeContext } from './_context/ThemeContext';
import { useNotificationsQuery } from '../hooks/useNotificationsApi';
import { getApiBaseUrlExport } from '../lib/apiClient';
import Screen from './_components/Screen';
import ApiErrorView from './_components/ApiErrorView';
import EmptyState from './_components/EmptyState';
import { getColors } from './_components/theme';
import { useBottomMenuInset } from './_hooks/useBottomMenuInset';
import { useResponsive, responsiveSize } from './_hooks/useResponsive';

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type?: string;
  created_at?: string;
};

export default function Notifications() {
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const [selected, setSelected] = useState<Notification | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const bottomInsetForMenu = useBottomMenuInset();
  const { isSmallScreen, scale } = useResponsive();
  const responsiveStyles = useMemo(() => StyleSheet.create(getStyles(isSmallScreen, scale)), [isSmallScreen, scale]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const READ_IDS_KEY = 'notifications_read_ids';
  const DELETED_IDS_KEY = 'notifications_deleted_ids';

  const { data: apiNotifications, isLoading: isLoadingApi, isError: notificationsError, error: notificationsErrorObj, refetch, isFetching } = useNotificationsQuery();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  useEffect(() => {
    (async () => {
      try {
        const r = await AsyncStorage.getItem(READ_IDS_KEY);
        setReadIds(r ? new Set(JSON.parse(r) as string[]) : new Set());
        const d = await AsyncStorage.getItem(DELETED_IDS_KEY);
        setDeletedIds(d ? new Set(JSON.parse(d) as string[]) : new Set());
      } catch {}
    })();
  }, []);

  const notifications = useMemo(() => {
    const raw = Array.isArray(apiNotifications) ? apiNotifications : [];
    const filtered = raw.filter((n: any) => !deletedIds.has(String(n?.id ?? '')));
    return filtered.map((n: any) => ({
      id: String(n?.id ?? ''),
      title: n?.title ?? '',
      message: n?.message ?? '',
      read: readIds.has(String(n?.id ?? '')),
      type: n?.type,
      created_at: n?.created_at,
    })) as Notification[];
  }, [apiNotifications, readIds, deletedIds]);

  function getDateGroup(created_at?: string): string {
    if (!created_at) return 'Săptămâna trecută';
    const d = new Date(created_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dDate.getTime() === today.getTime()) return 'Astăzi';
    if (dDate.getTime() === yesterday.getTime()) return 'Ieri';
    return 'Săptămâna trecută';
  }

  const notificationsByDate = useMemo(() => {
    const order = ['Astăzi', 'Ieri', 'Săptămâna trecută'];
    const groups: Record<string, Notification[]> = { Astăzi: [], Ieri: [], 'Săptămâna trecută': [] };
    notifications.forEach((n) => {
      const key = getDateGroup(n.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return order.map((key) => ({ key, items: groups[key] || [] })).filter((g) => g.items.length > 0);
  }, [notifications]);

  const isLoading = isLoadingApi;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const saveReadIds = useCallback(async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(ids)));
    } catch {}
  }, []);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, [saveReadIds]);

  const markAllAsRead = useCallback(async () => {
    const { apiClient } = await import('../lib/apiClient');
    const { data } = await apiClient.getNotificationIds();
    const allIds = new Set((data ?? []).map((n: any) => String(n?.id ?? '')));
    notifications.forEach(n => allIds.add(n.id));
    setReadIds(allIds);
    await saveReadIds(allIds);
  }, [notifications, saveReadIds]);

  const deleteAllNotifications = useCallback(() => {
    Alert.alert('Confirmare', 'Ascunzi toate notificările din listă. Poți trage în jos pentru a reîncărca notificări noi de la server.', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Ascunde tot',
        style: 'destructive',
        onPress: async () => {
          const toDelete = new Set(notifications.map(n => n.id));
          setDeletedIds(prev => {
            const next = new Set(prev);
            toDelete.forEach(id => next.add(id));
            AsyncStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(next))).catch(() => {});
            return next;
          });
        },
      },
    ]);
  }, [notifications]);

  const handleOpen = useCallback((notif: Notification) => {
    markAsRead(notif.id);
    setSelected(notif);
  }, [markAsRead]);

  return (
    <Screen>
      <View style={[responsiveStyles.container, { backgroundColor: colors.background }]}>
        {/* Notifications List */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView 
            style={responsiveStyles.scroll} 
            contentContainerStyle={{ paddingBottom: bottomInsetForMenu + 24, paddingTop: Platform.OS === 'ios' ? 60 : 50 }} 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} colors={[colors.primaryButton]} tintColor={colors.primaryButton} />}
          >
            {/* Action Buttons */}
            {notifications.length > 0 && (
              <Animated.View
                style={[
                  responsiveStyles.actionsRow,
                  {
                    opacity: fadeAnim,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[responsiveStyles.actionButton, { backgroundColor: isDark ? '#000' : '#333', borderColor: colors.border }]}
                  onPress={markAllAsRead}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-done" size={18} color={colors.primaryButton} />
                  <Text style={[responsiveStyles.actionText, { color: colors.primaryButton }]}>Toate citite</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[responsiveStyles.actionButton, { backgroundColor: isDark ? '#000' : '#333', borderColor: colors.border }]}
                  onPress={deleteAllNotifications}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.primaryButton} />
                  <Text style={[responsiveStyles.actionText, { color: colors.primaryButton }]}>Ascunde tot</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            {notificationsError ? (
              <View style={{ paddingHorizontal: responsiveSize(20, scale), paddingTop: 24 }}>
                <ApiErrorView
                  message={notificationsErrorObj?.message ?? undefined}
                  onRetry={() => refetch()}
                />
              </View>
            ) : isLoading ? (
              <View style={responsiveStyles.emptyContainer}>
                <Text style={[responsiveStyles.emptyText, { color: colors.textMuted }]}>
                  Se încarcă notificările...
                </Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={{ flex: 1 }}>
                <EmptyState
                  icon="notifications-off-outline"
                  title="Nu ai notificări momentan"
                  description="Notificările create în admin apar aici automat."
                  style={{ paddingVertical: 40 }}
                />
                {__DEV__ ? (
                  <View style={{ paddingHorizontal: 20, marginTop: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 4 }}>
                      Conectare la: {getApiBaseUrlExport()}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>
                      EXPO_PUBLIC_API_URL=http://IP_PC:3000/api · npx expo start -c
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              notificationsByDate.map(({ key: groupKey, items }) => (
                <View key={groupKey} style={responsiveStyles.section}>
                  <Text style={[responsiveStyles.sectionHeader, { color: colors.textMuted }]}>{groupKey}</Text>
                  {items.map((notif, index) => (
                    <TouchableOpacity
                      key={notif.id}
                      style={[
                        responsiveStyles.notification,
                        { 
                          backgroundColor: colors.surface,
                          borderColor: notif.read ? colors.border : colors.primaryButton,
                          marginBottom: index < items.length - 1 ? responsiveSize(12, scale) : 0,
                        },
                        !notif.read && responsiveStyles.notificationUnread,
                      ]}
                      onPress={() => handleOpen(notif)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        responsiveStyles.notificationIcon,
                        { backgroundColor: isDark ? '#000' : '#333' }
                      ]}>
                        <Ionicons 
                          name={notif.read ? "notifications-outline" : "notifications"} 
                          size={20} 
                          color={colors.primaryButton} 
                        />
                      </View>
                      <View style={responsiveStyles.notificationContent}>
                        <Text 
                          style={[
                            responsiveStyles.notifTitle,
                            { color: notif.read ? colors.text : colors.text }
                          ]}
                          numberOfLines={1}
                        >
                          {notif.title}
                        </Text>
                        <Text
                          style={[
                            responsiveStyles.notifMessage,
                            { color: notif.read ? colors.textMuted : colors.text }
                          ]}
                          numberOfLines={2}
                        >
                          {notif.message}
                        </Text>
                      </View>
                      {!notif.read && (
                        <View style={[responsiveStyles.unreadDot, { backgroundColor: colors.primaryButton }]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}

            {/* Back Button */}
            <TouchableOpacity 
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={responsiveStyles.backButtonWrapper}
            >
              <LinearGradient
                colors={['#FFEE00', '#FFEE00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={responsiveStyles.backButton}
              >
                <Ionicons name="arrow-back" size={18} color="#000" />
                <Text style={responsiveStyles.backButtonText}>Înapoi</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {/* Modal */}
        <Modal
          visible={!!selected}
          transparent
          animationType="fade"
          onRequestClose={() => setSelected(null)}
        >
          <View style={responsiveStyles.modalOverlay}>
            <View style={[responsiveStyles.modalBox, { backgroundColor: colors.surface, borderColor: colors.primaryButton }]}>
              <View style={responsiveStyles.modalHeader}>
                <Text style={[responsiveStyles.modalTitle, { color: colors.text }]}>
                  {selected?.title}
                </Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[responsiveStyles.modalMessage, { color: colors.text }]}>
                {selected?.message}
              </Text>
              <TouchableOpacity
                style={responsiveStyles.closeButton}
                onPress={() => setSelected(null)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#FFEE00', '#FFEE00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={responsiveStyles.closeButtonGradient}
                >
                  <Text style={responsiveStyles.closeText}>Închide</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

function getStyles(isSmallScreen: boolean, scale: number): {
  container: ViewStyle;
  backButtonWrapper: ViewStyle;
  backButton: ViewStyle;
  backButtonText: TextStyle;
  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  actionsRow: ViewStyle;
  actionButton: ViewStyle;
  actionText: TextStyle;
  scroll: ViewStyle;
  section: ViewStyle;
  sectionHeader: TextStyle;
  notification: ViewStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
  notificationUnread: ViewStyle;
  notificationIcon: ViewStyle;
  notificationContent: ViewStyle;
  notifTitle: TextStyle;
  notifMessage: TextStyle;
  unreadDot: ViewStyle;
  modalOverlay: ViewStyle;
  modalBox: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  modalMessage: TextStyle;
  closeButton: ViewStyle;
  closeButtonGradient: ViewStyle;
  closeText: TextStyle;
} {
  return {
    container: { flex: 1 },
    backButtonWrapper: {
      marginTop: responsiveSize(20, scale),
      marginBottom: responsiveSize(12, scale),
      borderRadius: 0,
      overflow: 'hidden' as const,
      shadowColor: '#FFEE00',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    backButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: responsiveSize(16, scale),
      paddingHorizontal: responsiveSize(24, scale),
      gap: responsiveSize(10, scale),
      borderWidth: 1.5,
      borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    backButtonText: {
      color: '#000',
      fontSize: responsiveSize(isSmallScreen ? 15 : 16, scale),
      fontWeight: '700' as const,
      textAlign: 'center' as const,
      letterSpacing: 0.3,
    },
    header: {
      paddingHorizontal: responsiveSize(20, scale),
      paddingTop: responsiveSize(12, scale),
      paddingBottom: responsiveSize(12, scale),
    },
    title: { 
      fontSize: responsiveSize(isSmallScreen ? 28 : 32, scale),
      fontWeight: '800' as const,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: responsiveSize(isSmallScreen ? 14 : 15, scale),
    },
    actionsRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      paddingHorizontal: 0,
      marginBottom: 0,
      gap: 0,
      width: '100%',
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 0,
      paddingHorizontal: responsiveSize(16, scale),
      paddingVertical: responsiveSize(14, scale),
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderRightWidth: 1,
      gap: responsiveSize(8, scale),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    actionText: {
      fontSize: responsiveSize(isSmallScreen ? 15 : 16, scale),
      fontWeight: '600' as const,
    },
    scroll: { 
      flex: 1,
      paddingHorizontal: 0,
      paddingTop: 0,
    },
    section: {
      marginBottom: responsiveSize(20, scale),
    },
    sectionHeader: {
      fontSize: responsiveSize(13, scale),
      fontWeight: '600' as const,
      marginBottom: responsiveSize(10, scale),
      paddingHorizontal: responsiveSize(20, scale),
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    notification: {
      flexDirection: 'row' as const,
      borderWidth: 0,
      borderRadius: 0,
      padding: responsiveSize(18, scale),
      marginHorizontal: 0,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      width: '100%',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: responsiveSize(40, scale),
    },
    emptyText: {
      marginTop: responsiveSize(16, scale),
      fontSize: responsiveSize(15, scale),
      textAlign: 'center' as const,
    },
    notificationUnread: {
      borderWidth: 2,
    },
    notificationIcon: {
      width: responsiveSize(50, scale),
      height: responsiveSize(50, scale),
      borderRadius: responsiveSize(14, scale),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: responsiveSize(14, scale),
    },
    notificationContent: {
      flex: 1,
    },
    notifTitle: {
      fontSize: responsiveSize(isSmallScreen ? 18 : 19, scale),
      fontWeight: '700' as const,
      marginBottom: responsiveSize(6, scale),
    },
    notifMessage: {
      fontSize: responsiveSize(isSmallScreen ? 15 : 16, scale),
      lineHeight: responsiveSize(22, scale),
    },
    unreadDot: {
      width: responsiveSize(8, scale),
      height: responsiveSize(8, scale),
      borderRadius: responsiveSize(4, scale),
      marginLeft: responsiveSize(8, scale),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: responsiveSize(20, scale),
    },
    modalBox: {
      width: '100%',
      borderRadius: responsiveSize(16, scale),
      padding: responsiveSize(24, scale),
      borderWidth: 2,
      shadowColor: '#FFEE00',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: responsiveSize(16, scale),
    },
    modalTitle: {
      fontSize: responsiveSize(isSmallScreen ? 20 : 22, scale),
      fontWeight: '800' as const,
      flex: 1,
      marginRight: responsiveSize(12, scale),
    },
    modalMessage: {
      fontSize: responsiveSize(isSmallScreen ? 15 : 16, scale),
      lineHeight: responsiveSize(24, scale),
      marginBottom: responsiveSize(24, scale),
    },
    closeButton: {
      borderRadius: responsiveSize(12, scale),
      overflow: 'hidden' as const,
    },
    closeButtonGradient: {
      paddingVertical: responsiveSize(14, scale),
      paddingHorizontal: responsiveSize(24, scale),
      alignItems: 'center',
    },
    closeText: { 
      color: '#000', 
      fontWeight: '700' as const,
      fontSize: responsiveSize(isSmallScreen ? 15 : 16, scale),
    },
  };
}
