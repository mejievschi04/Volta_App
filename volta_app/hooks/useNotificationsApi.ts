import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

const NOTIFICATIONS_KEY = ['notifications'] as const;
const NOTIFICATION_IDS_KEY = ['notifications', 'ids'] as const;

async function fetchNotifications() {
  const { data, error } = await apiClient.getNotifications();
  if (error) throw new Error(error);
  return Array.isArray(data) ? data : [];
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
  });
}

export function useNotificationIdsQuery() {
  return useQuery({
    queryKey: NOTIFICATION_IDS_KEY,
    queryFn: fetchNotificationIds,
  });
}

export { NOTIFICATIONS_KEY, NOTIFICATION_IDS_KEY };
