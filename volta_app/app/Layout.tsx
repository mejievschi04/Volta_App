import { Slot } from 'expo-router';
import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemeContext } from './context/ThemeContext';
import { getColors } from './components/theme';

export default function Layout() {
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // pentru notch / status bar
  },
});
