import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

export const NotificationsPrefContext = createContext<{
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => Promise<void>;
}>({
  notificationsEnabled: true,
  setNotificationsEnabled: async () => {},
});

export const NotificationsPrefProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY).then((v) => {
      if (v !== null) setNotificationsEnabledState(v === 'true');
    });
  }, []);

  const setNotificationsEnabled = async (value: boolean) => {
    setNotificationsEnabledState(value);
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(value));
  };

  return (
    <NotificationsPrefContext.Provider value={{ notificationsEnabled, setNotificationsEnabled }}>
      {children}
    </NotificationsPrefContext.Provider>
  );
};
