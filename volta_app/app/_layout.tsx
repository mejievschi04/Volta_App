import React, { useContext, useEffect, useRef } from 'react';
import { Slot, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, StatusBar, Platform, AppState } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import BottomMenu from './components/BottomMenu';
import { UserProvider } from './context/UserContext'; // import contextul global
import { ThemeProvider, ThemeContext } from './context/ThemeContext';
import { getColors } from './components/theme';

function ThemedLayout() {
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const pathname = usePathname();
  const appState = useRef(AppState.currentState);

  // Rute unde BottomMenu nu trebuie afișat
  const hideMenuRoutes = ['/Login', '/Loading'];
  const shouldShowMenu = pathname && pathname !== '/' && !hideMenuRoutes.includes(pathname);

  // Function to hide status bar and navigation bar
  const hideBars = () => {
    StatusBar.setHidden(true, 'fade');
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
  };

  // Hide status bar and navigation bar on mount and pathname change
  useEffect(() => {
    hideBars();
  }, [pathname]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground, hide bars again with a small delay
        // to ensure the app is fully in foreground
        setTimeout(() => {
          hideBars();
        }, 100);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Initial hide on mount
  useEffect(() => {
    hideBars();

    return () => {
      // Restore status bar and navigation bar when component unmounts
      StatusBar.setHidden(false, 'fade');
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible');
      }
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: 0, paddingBottom: shouldShowMenu ? 80 : 0 }]}>
      <StatusBar hidden={true} />
      <Slot />
      {shouldShowMenu && <BottomMenu />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UserProvider>
          <ThemedLayout />
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
