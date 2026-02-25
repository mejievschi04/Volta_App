import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from './_context/ThemeContext';
import { getColors } from './_components/theme';

const { width } = Dimensions.get('window');

export default function Loading() {
  const router = useRouter();
  const { theme } = React.useContext(ThemeContext);
  const colors = getColors(theme);
  const gradientColors = theme === 'dark' ? [colors.background, colors.surface] : ['#FFFFFF', '#FAFAFA'];
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animații de intrare
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animație pentru dots
    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dot1Anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(dot2Anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(dot3Anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(dot1Anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animateDots());
    };
    animateDots();

    // Verifică dacă există user salvat pentru auto-login
    const checkUserSession = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          // Verifică dacă user-ul are date valide
          if (user && user.id) {
            // Navighează direct la Home dacă există sesiune
            setTimeout(() => router.replace('/Home'), 1500);
            return;
          }
        }
        // Dacă nu există user, navighează la Login
        setTimeout(() => router.replace('/Login'), 2500);
      } catch (error) {
        console.error('[Loading] Eroare la verificarea sesiunii:', error);
        // În caz de eroare, navighează la Login
        setTimeout(() => router.replace('/Login'), 2500);
      }
    };

    checkUserSession();
  }, [router]);

  const dot1Opacity = dot1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const dot2Opacity = dot2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const dot3Opacity = dot3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Logo animat */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Image
              source={require('../logo/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Modern loading dots */}
          <Animated.View
            style={[
              styles.loadingContainer,
              { opacity: fadeAnim },
            ]}
          >
            <View style={styles.dotsContainer}>
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot1Opacity,
                    transform: [{ scale: dot1Anim }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot2Opacity,
                    transform: [{ scale: dot2Anim }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot3Opacity,
                    transform: [{ scale: dot3Anim }],
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* Powered by - fără border */}
          <Animated.View
            style={[
              styles.poweredByContainer,
              { opacity: fadeAnim },
            ]}
          >
            <Text style={[styles.poweredByText, { color: colors.textMuted }]}>POWERED BY MEJIEVSCHI</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  logoImage: {
    width: 240,
    height: 240,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFEE00',
  },
  poweredByContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  poweredByText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
