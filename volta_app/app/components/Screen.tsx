import React, { useContext } from "react";
import { View, StyleSheet, SafeAreaView, Platform } from "react-native";
import { spacing, getColors } from "./theme";
import { ThemeContext } from "../context/ThemeContext";

type ScreenProps = {
  children: React.ReactNode;
  padded?: boolean;
  withBottomInset?: boolean;
  style?: any;
};

export default function Screen({ children, padded = true, withBottomInset = true, style }: ScreenProps) {
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.container,
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


