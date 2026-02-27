import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

const NOTIFICATIONS_KEY = ['notifications'] as const;
const NOTIFICATION_IDS_KEY = ['notifications', 'ids'] as const;

async function fetchNotifications() {
  const { data, error } = await apiClient.getNotifications();
  if (error) throw new Error(error);
  const raw = data != null && Array.isArray(data) ? data : (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown[] }).data) ? (data as { data: unknown[] }).data : []);
  if (__DEV__) {
    if (raw.length > 0) console.log('[Notifications] Primite de la server:', raw.length, 'notificări (toate tipurile sunt afișate).');
    else console.log('[Notifications] Serverul a returnat 0 notificări. Verifică EXPO_PUBLIC_API_URL în .env (același server ca admin) și npx expo start -c.');
  }
  return raw;
}

async function fetchNotificationIds() {
  const { data, error } = await apiClient.getNotificationIds();
  if (error) throw new Error(error);
  return Array.isArray(data) ? data : [];
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchNotifications,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
    retryDelay: 1000,
  });
}

export function useNotificationIdsQuery() {
  return useQuery({
    queryKey: NOTIFICATION_IDS_KEY,
    queryFn: fetchNotificationIds,
  });
}

export { NOTIFICATIONS_KEY, NOTIFICATION_IDS_KEY };
