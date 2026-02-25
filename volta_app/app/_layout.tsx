import React, { useContext, useEffect, useRef } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, StatusBar, Platform, AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as NavigationBar from 'expo-navigation-bar';
import BottomMenu from './_components/BottomMenu';
import { UserProvider, UserContext } from './_context/UserContext';
import { ThemeProvider, ThemeContext } from './_context/ThemeContext';
import { getColors } from './_components/theme';
import { setOnUnauthorized } from '../lib/apiClient';
import { useNotifications } from '../hooks/useNotifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

function ThemedLayout() {
  const { theme } = useContext(ThemeContext);
  const { setUser, setToken } = useContext(UserContext);
  const router = useRouter();
  const colors = getColors(theme);
  const pathname = usePathname();
  const appState = useRef(AppState.currentState);

  useNotifications();

  // La 401 (token invalid/expirat): logout și redirect la Login
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      setToken(null);
      router.replace('/Login');
    });
    return () => setOnUnauthorized(null);
  }, [setUser, setToken, router]);

  // Rute unde BottomMenu nu trebuie afișat
  const hideMenuRoutes = ['/Login', '/Loading'];
  const shouldShowMenu = pathname && pathname !== '/' && !hideMenuRoutes.includes(pathname);

  // Ascunde bara de status și bara de navigare (sistem) când ești în app
  const hideSystemBars = () => {
    StatusBar.setHidden(true, 'fade');
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
  };

  const showSystemBars = () => {
    StatusBar.setHidden(false, 'fade');
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('visible');
    }
  };

  useEffect(() => {
    hideSystemBars();
    return () => showSystemBars();
  }, []);

  useEffect(() => {
    hideSystemBars();
  }, [pathname]);

  // Când revii în app din background, ascunde din nou barele
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        setTimeout(hideSystemBars, 100);
      }
      appState.current = nextAppState;
    });
    return () => subscription?.remove();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar hidden />
      <Slot />
      {shouldShowMenu && <BottomMenu />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <UserProvider>
            <ThemedLayout />
          </UserProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
