import React, { useContext } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, getColors } from "./theme";
import { ThemeContext } from "../_context/ThemeContext";

type ScreenProps = {
  children: React.ReactNode;
  padded?: boolean;
  withBottomInset?: boolean;
  /** Harta etc.: conținutul se extinde sub bara de status (fără padding top) */
  fullBleedTop?: boolean;
  style?: any;
};

export default function Screen({ children, padded = true, withBottomInset = true, fullBleedTop = false, style }: ScreenProps) {
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView 
      style={[styles.safe, { backgroundColor: colors.background }]} 
      edges={['left', 'right', 'bottom']}
    >
      <View
        style={[
          styles.container,
          { paddingTop: fullBleedTop ? 0 : insets.top },
          padded && styles.padded,
          withBottomInset && styles.bottomInset,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  bottomInset: {
    paddingBottom: Platform.select({ ios: spacing.xl, android: spacing.lg, default: spacing.lg }),
  },
});


