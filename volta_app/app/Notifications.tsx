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
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoNotifications from 'expo-notifications';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemeContext } from './_context/ThemeContext';
import { useNotificationsQuery } from '../hooks/useNotificationsApi';
import Screen from './_components/Screen';
import ApiErrorView from './_components/ApiErrorView';
import EmptyState from './_components/EmptyState';
import { getColors } from './_components/theme';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

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
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const READ_IDS_KEY = 'notifications_read_ids';
  const DELETED_IDS_KEY = 'notifications_deleted_ids';

  const { data: apiNotifications, isLoading: isLoadingApi, isError: notificationsError, error: notificationsErrorObj, refetch } = useNotificationsQuery();

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
      message: n?.messsage ?? n?.message ?? '',
      read: readIds.has(String(n?.id ?? '')),
      type: n?.type,
      created_at: n?.created_at,
    })) as Notification[];
  }, [apiNotifications, readIds, deletedIds]);

  function getDateGroup(created_at?: string): string {
    if (!created_at) return 'Mai devreme';
    const d = new Date(created_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dDate.getTime() === today.getTime()) return 'Astăzi';
    if (dDate.getTime() === yesterday.getTime()) return 'Ieri';
    return 'Mai devreme';
  }

  const notificationsByDate = useMemo(() => {
    const order = ['Astăzi', 'Ieri', 'Mai devreme'];
    const groups: Record<string, Notification[]> = { Astăzi: [], Ieri: [], 'Mai devreme': [] };
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
    Alert.alert('Confirmare', 'Ești sigur că vrei să ștergi toate notificările?', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Șterge',
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Notifications List */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView 
            style={styles.scroll} 
            contentContainerStyle={{ paddingBottom: 16, paddingTop: Platform.OS === 'ios' ? 60 : 50 }} 
            showsVerticalScrollIndicator={false}
          >
            {/* Action Buttons */}
            {notifications.length > 0 && (
              <Animated.View
                style={[
                  styles.actionsRow,
                  {
                    opacity: fadeAnim,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: isDark ? colors.surface : '#333', borderColor: colors.border }]}
                  onPress={markAllAsRead}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-done" size={18} color={colors.primaryButton} />
                  <Text style={[styles.actionText, { color: colors.primaryButton }]}>Toate citite</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: isDark ? colors.surface : '#333', borderColor: colors.border }]}
                  onPress={deleteAllNotifications}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.primaryButton} />
                  <Text style={[styles.actionText, { color: colors.primaryButton }]}>Șterge tot</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            {notificationsError ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
                <ApiErrorView
                  message={notificationsErrorObj?.message ?? undefined}
                  onRetry={() => refetch()}
                />
              </View>
            ) : isLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Se încarcă notificările...
                </Text>
              </View>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon="notifications-off-outline"
                title="Nu ai notificări momentan"
                style={{ paddingVertical: 40 }}
              />
            ) : (
              notificationsByDate.map(({ key: groupKey, items }) => (
                <View key={groupKey} style={styles.section}>
                  <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{groupKey}</Text>
                  {items.map((notif, index) => (
                    <TouchableOpacity
                      key={notif.id}
                      style={[
                        styles.notification,
                        { 
                          backgroundColor: colors.surface,
                          borderColor: notif.read ? colors.border : colors.primaryButton,
                          marginBottom: index < items.length - 1 ? 12 : 0,
                        },
                        !notif.read && styles.notificationUnread,
                      ]}
                      onPress={() => handleOpen(notif)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.notificationIcon,
                        { backgroundColor: isDark ? colors.surface : '#333' }
                      ]}>
                        <Ionicons 
                          name={notif.read ? "notifications-outline" : "notifications"} 
                          size={20} 
                          color={colors.primaryButton} 
                        />
                      </View>
                      <View style={styles.notificationContent}>
                        <Text 
                          style={[
                            styles.notifTitle,
                            { color: notif.read ? colors.text : colors.text }
                          ]}
                          numberOfLines={1}
                        >
                          {notif.title}
                        </Text>
                        <Text
                          style={[
                            styles.notifMessage,
                            { color: notif.read ? colors.textMuted : colors.text }
                          ]}
                          numberOfLines={2}
                        >
                          {notif.message}
                        </Text>
                      </View>
                      {!notif.read && (
                        <View style={[styles.unreadDot, { backgroundColor: colors.primaryButton }]} />
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
              style={styles.backButtonWrapper}
            >
              <LinearGradient
                colors={['#FFEE00', '#FFEE00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={18} color="#000" />
                <Text style={styles.backButtonText}>Înapoi</Text>
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
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.primaryButton }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selected?.title}
                </Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalMessage, { color: colors.text }]}>
                {selected?.message}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelected(null)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#FFEE00', '#FFEE00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.closeButtonGradient}
                >
                  <Text style={styles.closeText}>Închide</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  backButtonWrapper: {
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButtonText: {
    color: '#000',
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: { 
    fontSize: isSmallScreen ? 28 : 32,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: isSmallScreen ? 14 : 15,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 0,
    gap: 0,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  actionText: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '600',
  },
  scroll: { 
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notification: {
    flexDirection: 'row',
    borderWidth: 0,
    borderRadius: 0,
    padding: 18,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    textAlign: 'center',
  },
  notificationUnread: {
    borderWidth: 2,
  },
  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: isSmallScreen ? 18 : 19,
    fontWeight: '700',
    marginBottom: 6,
  },
  notifMessage: {
    fontSize: isSmallScreen ? 15 : 16,
    lineHeight: 22,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: isSmallScreen ? 20 : 22,
    fontWeight: '800',
    flex: 1,
    marginRight: 12,
  },
  modalMessage: {
    fontSize: isSmallScreen ? 15 : 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  closeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  closeText: { 
    color: '#000', 
    fontWeight: '700',
    fontSize: isSmallScreen ? 15 : 16,
  },
});
