import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { ThemeContext } from '../_context/ThemeContext';
import { getColors } from './theme';

interface SkeletonProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const { theme } = React.useContext(ThemeContext);
  const colors = getColors(theme);
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const bgColor = theme === 'dark' ? colors.surface : colors.border;

  return (
    <Animated.View
      style={[
        { width: width as number, height: height as number, borderRadius, backgroundColor: bgColor, opacity } as any,
        style,
      ]}
    />
  );
}

/** Skeleton for a promo/card slide: image area + bottom bar */
export function SkeletonPromoSlide({ width, height }: { width: number; height: number }) {
  const { theme } = React.useContext(ThemeContext);
  const colors = getColors(theme);
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const bg = theme === 'dark' ? colors.surface : colors.border;
  const barH = 36;

  return (
    <View style={[styles.slideWrap, { width, height }]}>
      <Animated.View style={[styles.slideImage, { width, height: height - barH, backgroundColor: bg, opacity }]} />
      <Animated.View style={[styles.slideBar, { width: width - 24, height: barH - 12, backgroundColor: bg, opacity, borderRadius: 8 }]} />
    </View>
  );
}

/** Skeleton for a list card (e.g. promo card in list) */
export function SkeletonCard({ width, height }: { width: number; height: number }) {
  const { theme } = React.useContext(ThemeContext);
  const colors = getColors(theme);
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const bg = theme === 'dark' ? colors.surface : colors.border;

  return (
    <View style={[styles.cardWrap, { width, height }]}>
      <Animated.View style={[styles.cardImage, { width, height: height - 52, backgroundColor: bg, opacity }]} />
      <Animated.View style={[styles.cardLine, { width: width * 0.7, height: 14, backgroundColor: bg, opacity, borderRadius: 6 }]} />
      <Animated.View style={[styles.cardLine, { width: width * 0.4, height: 12, backgroundColor: bg, opacity, borderRadius: 6, marginTop: 8 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  slideWrap: {
    overflow: 'hidden',
    alignItems: 'center',
  },
  slideImage: {
    borderRadius: 0,
  },
  slideBar: {
    position: 'absolute',
    bottom: 10,
    left: 12,
  },
  cardWrap: {
    overflow: 'hidden',
    marginBottom: 20,
  },
  cardImage: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardLine: {
    marginTop: 12,
    marginHorizontal: 0,
  },
});
