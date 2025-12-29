import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
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
import { ThemeContext } from './context/ThemeContext';
import { apiClient } from '../lib/apiClient';
import Screen from './components/Screen';
import { getColors } from './components/theme';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  
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

  const demoNotifications: Notification[] = [
    {
      id: '1',
      title: 'Reducere specială!',
      message: 'Ai 10% reducere la următoarea achiziție Volta!',
      read: false,
    },
    {
      id: '2',
      title: 'Program nou magazin',
      message: 'Volta Centru este deschis acum până la ora 20:00!',
      read: true,
    },
  ];

  useEffect(() => {
    loadNotifications();
  }, []);

  // Re-load notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const READ_IDS_KEY = 'notifications_read_ids';

  const getReadIds = useCallback(async (): Promise<Set<string>> => {
    try {
      const raw = await AsyncStorage.getItem(READ_IDS_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  }, []);

  const saveReadIds = useCallback(async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(ids)));
    } catch {}
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const DELETED_IDS_KEY = 'notifications_deleted_ids';
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

      const { data, error } = await apiClient.getNotifications();

      if (error) {
        console.error('Eroare API:', error);
        const stored = await AsyncStorage.getItem('notifications');
        if (stored) {
          setNotifications(JSON.parse(stored) as Notification[]);
        } else {
          await AsyncStorage.setItem('notifications', JSON.stringify(demoNotifications));
          setNotifications(demoNotifications);
        }
        return;
      }

      const readIds = await getReadIds();
      const deletedIds = await getDeletedIds();
      
      // Filter out deleted notifications
      const filtered = (data ?? []).filter((n: any) => {
        const idStr = String(n?.id ?? '');
        return !deletedIds.has(idStr);
      });

      const mapped = filtered.map((n: any) => {
        const msg = n?.messsage ?? n?.message ?? '';
        const idStr = String(n?.id ?? '');
        return {
          id: idStr,
          title: n?.title ?? '',
          message: msg,
          read: readIds.has(idStr),
          type: n?.type,
          created_at: n?.created_at,
        } as Notification;
      });

      setNotifications(mapped);
      await AsyncStorage.setItem('notifications', JSON.stringify(mapped));
    } catch (error) {
      console.error('Eroare la încărcarea notificărilor:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getReadIds]);

  const saveNotifications = useCallback(async (data: Notification[]) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(data));
    } catch (error) {
      console.error('Eroare la salvare:', error);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    saveNotifications(updated);

    const ids = await getReadIds();
    ids.add(id);
    await saveReadIds(ids);
  }, [notifications, saveNotifications, getReadIds, saveReadIds]);

  const markAllAsRead = useCallback(async () => {
    // Get all notifications from API to mark all as read
    try {
      const { data, error } = await apiClient.getNotificationIds();

      if (!error && data) {
        // Mark all notification IDs as read
        const allIds = new Set(data.map((n: any) => String(n?.id ?? '')));
        await saveReadIds(allIds);
      }
    } catch (err) {
      console.error('Eroare la marcarea tuturor ca citite:', err);
    }

    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
    
    // Also mark current notifications as read
    const currentIds = new Set(updated.map((n) => n.id));
    const existingIds = await getReadIds();
    const allIds = new Set([...existingIds, ...currentIds]);
    await saveReadIds(allIds);
  }, [notifications, saveNotifications, saveReadIds, getReadIds]);

  const deleteAllNotifications = useCallback(() => {
    Alert.alert('Confirmare', 'Ești sigur că vrei să ștergi toate notificările?', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          // Save all notification IDs as deleted
          const deletedIds = notifications.map(n => n.id);
          const DELETED_IDS_KEY = 'notifications_deleted_ids';
          try {
            const existing = await AsyncStorage.getItem(DELETED_IDS_KEY);
            const existingIds = existing ? JSON.parse(existing) : [];
            const allDeleted = [...new Set([...existingIds, ...deletedIds])];
            await AsyncStorage.setItem(DELETED_IDS_KEY, JSON.stringify(allDeleted));
          } catch (err) {
            console.error('Eroare la salvare notificări șterse:', err);
          }
          
          setNotifications([]);
          await AsyncStorage.removeItem('notifications');
          await AsyncStorage.removeItem(READ_IDS_KEY);
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
            {isLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Se încarcă notificările...
                </Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Nu ai notificări momentan
                </Text>
              </View>
            ) : (
              notifications.map((notif, index) => (
                <TouchableOpacity
                  key={notif.id}
                  style={[
                    styles.notification,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: notif.read ? colors.border : colors.primaryButton,
                      marginBottom: index < notifications.length - 1 ? 12 : 0,
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
