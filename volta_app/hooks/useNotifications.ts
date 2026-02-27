import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { apiClient } from '../lib/apiClient';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = (userId: string | number | null, enabled: boolean = true) => {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    if (!userId || !enabled) return;
    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) {
        if (__DEV__) console.warn('[Notifications] Nu s-a putut obține token push (permisiuni sau projectId).');
        return;
      }
      if (__DEV__) console.log('[Notifications] Token push obținut, trimit la backend...');
      const { error } = await apiClient.setPushToken(userId, token);
      if (error) {
        console.warn('[Notifications] Nu s-a putut înregistra token-ul push:', error);
      } else if (__DEV__) {
        console.log('[Notifications] Token push înregistrat la backend.');
      }
    });
  }, [userId, enabled]);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // Notificare primită în foreground
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string };
      if (data?.type === 'notification') {
        router.push('/Notifications');
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  return {
    scheduleNotification: async (title: string, body: string, data?: Record<string, unknown>) => {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: data || {}, sound: true },
        trigger: null,
      });
    },
  };
};

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFEE00',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const expoConfig = Constants.expoConfig as { projectId?: string; extra?: { eas?: { projectId?: string } } } | null;
    const projectId =
      expoConfig?.projectId ??
      expoConfig?.extra?.eas?.projectId ??
      (typeof process !== 'undefined' ? (process.env as NodeJS.ProcessEnv)?.EXPO_PUBLIC_PROJECT_ID : undefined);
    if (!projectId) {
      if (__DEV__) {
        console.warn(
          '[Notifications] projectId lipsă: adaugă în app.json "expo": { "projectId": "ID" } (rulează "eas init") sau EXPO_PUBLIC_PROJECT_ID în .env.'
        );
      }
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData?.data ?? null;
  } catch (e) {
    console.warn('[Notifications] getExpoPushTokenAsync error:', e);
    return null;
  }
}

