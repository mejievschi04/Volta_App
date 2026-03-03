/**
 * Wrapper peste expo-notifications care NU încarcă modulul în Expo Go (SDK 53+),
 * pentru a evita eroarea "Android Push notifications was removed from Expo Go".
 * În Expo Go exportă stub-uri; în development build încarcă modulul real.
 */
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

type NotificationsModule = typeof import('expo-notifications');

let NotificationsReal: NotificationsModule | null = null;

function getNotifications(): NotificationsModule {
  if (NotificationsReal) return NotificationsReal;
  if (isExpoGo) {
    return {
      setNotificationHandler: () => {},
      addNotificationReceivedListener: () => ({ remove: () => {} }),
      addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
      removeNotificationSubscription: () => {},
      scheduleNotificationAsync: async () => '',
      getPermissionsAsync: async () => ({ status: 'undetermined', expires: 'never' }),
      requestPermissionsAsync: async () => ({ status: 'undetermined', expires: 'never' }),
      setNotificationChannelAsync: async () => {},
      getExpoPushTokenAsync: async () => ({ data: '' }),
      getDevicePushTokenAsync: async () => ({ type: 'android', data: '' }),
      AndroidImportance: { DEFAULT: 3, HIGH: 4, LOW: 2, MAX: 5, MIN: 1, NONE: 0 },
    } as unknown as NotificationsModule;
  }
  NotificationsReal = require('expo-notifications');
  return NotificationsReal;
}

export const Notifications = new Proxy({} as NotificationsModule, {
  get(_, prop) {
    return getNotifications()[prop as keyof NotificationsModule];
  },
});

export default Notifications;
