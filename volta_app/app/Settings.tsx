import React, { useContext, useRef, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from './_context/UserContext';
import { ThemeContext } from './_context/ThemeContext';
import { NotificationsPrefContext } from './_context/NotificationsPrefContext';
import { getColors } from './_components/theme';
import Screen from './_components/Screen';
import { useBottomMenuInset } from './_hooks/useBottomMenuInset';
import { useResponsive, responsiveSize } from './_hooks/useResponsive';

export default function Settings() {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { notificationsEnabled, setNotificationsEnabled } = useContext(NotificationsPrefContext);
  const isDark = theme === 'dark';
  const colors = getColors(theme);
  const bottomInsetForMenu = useBottomMenuInset();
  const { isSmallScreen, scale } = useResponsive();
  const responsiveStyles = useMemo(() => StyleSheet.create(getStyles(isSmallScreen, scale)), [isSmallScreen, scale]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Screen>
      <View style={[responsiveStyles.container, { backgroundColor: colors.background }]}>

        <Animated.View
          style={[
            { flex: 1 },
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <ScrollView 
            contentContainerStyle={[responsiveStyles.scroll, { paddingBottom: bottomInsetForMenu + 24 }]} 
            showsVerticalScrollIndicator={false}
          >
            {/* Profil utilizator */}
            <View style={[responsiveStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[responsiveStyles.sectionTitle, { color: colors.text }]}>Profil</Text>
              <TouchableOpacity 
                style={responsiveStyles.profileRow} 
                onPress={() => router.push('/EditProfil')}
                activeOpacity={0.7}
              >
                <View style={[responsiveStyles.profileIconContainer, { backgroundColor: isDark ? '#000' : '#333' }]}>
                  <Ionicons name="person-circle-outline" size={32} color={colors.primaryButton} />
                </View>
                <View style={responsiveStyles.profileTextContainer}>
                  <Text style={[responsiveStyles.name, { color: colors.text }]}>
                    {user?.nume} {user?.prenume}
                  </Text>
                  <Text style={[responsiveStyles.email, { color: colors.textMuted }]}>
                    {user?.email || user?.telefon}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Tema */}
            <View style={[responsiveStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[responsiveStyles.sectionTitle, { color: colors.text }]}>Aparență</Text>
              <View style={responsiveStyles.switchRow}>
                <View style={responsiveStyles.switchLabelContainer}>
                  <View style={[responsiveStyles.iconContainer, { backgroundColor: isDark ? '#000' : '#333' }]}>
                    <Ionicons
                      name={isDark ? "moon" : "sunny-outline"}
                      size={22}
                      color={colors.primaryButton}
                    />
                  </View>
                  <Text style={[responsiveStyles.optionText, { color: colors.text }]}>
                    Mod întunecat
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: colors.primaryButton }}
                  thumbColor={isDark ? '#000' : '#fff'}
                  ios_backgroundColor={colors.border}
                />
              </View>
            </View>

            {/* Notificări push */}
            <View style={[responsiveStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[responsiveStyles.sectionTitle, { color: colors.text }]}>Notificări</Text>
              <View style={responsiveStyles.switchRow}>
                <View style={responsiveStyles.switchLabelContainer}>
                  <View style={[responsiveStyles.iconContainer, { backgroundColor: isDark ? '#000' : '#333' }]}>
                    <Ionicons name="notifications-outline" size={22} color={colors.primaryButton} />
                  </View>
                  <Text style={[responsiveStyles.optionText, { color: colors.text }]}>
                    Notificări push
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: colors.border, true: colors.primaryButton }}
                  thumbColor={notificationsEnabled ? '#000' : '#fff'}
                  ios_backgroundColor={colors.border}
                />
              </View>
            </View>

            {/* Despre aplicație */}
            <View style={[responsiveStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[responsiveStyles.sectionTitle, { color: colors.text }]}>Despre aplicație</Text>
              <View style={responsiveStyles.aboutContainer}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
                <Text style={[responsiveStyles.aboutText, { color: colors.textMuted }]}>
                  Versiune: 1.0.0{"\n"}
                  Aplicația Volta te ajută să fii mereu conectat cu cele mai noi promoții și oferte.
                </Text>
              </View>
            </View>

            {/* Back Button */}
            <TouchableOpacity 
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={responsiveStyles.backButtonWrapper}
            >
              <LinearGradient
                colors={['#FFEE00', '#FFEE00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={responsiveStyles.backButton}
              >
                <Ionicons name="arrow-back" size={18} color="#000" />
                <Text style={responsiveStyles.backButtonText}>Înapoi</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Screen>
  );
}

function getStyles(isSmallScreen: boolean, scale: number): {
  container: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  scroll: ViewStyle;
  section: ViewStyle;
  sectionTitle: TextStyle;
  profileRow: ViewStyle;
  profileTextContainer: ViewStyle;
  profileIconContainer: ViewStyle;
  iconContainer: ViewStyle;
  name: TextStyle;
  email: TextStyle;
  switchRow: ViewStyle;
  switchLabelContainer: ViewStyle;
  optionText: TextStyle;
  aboutContainer: ViewStyle;
  aboutText: TextStyle;
  backButtonWrapper: ViewStyle;
  backButton: ViewStyle;
  backButtonText: TextStyle;
} {
  return {
    container: { flex: 1 },
    header: {
      paddingHorizontal: responsiveSize(20, scale),
      paddingTop: responsiveSize(20, scale),
      paddingBottom: responsiveSize(16, scale),
    },
    title: { 
      fontSize: responsiveSize(isSmallScreen ? 28 : 32, scale),
      fontWeight: '800' as const,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: responsiveSize(isSmallScreen ? 14 : 15, scale),
    },
    scroll: { 
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 100,
    },
    section: {
      borderRadius: 0,
      padding: responsiveSize(20, scale),
      marginBottom: 0,
      marginHorizontal: 0,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      width: '100%' as const,
    },
    sectionTitle: { 
      fontSize: responsiveSize(isSmallScreen ? 19 : 20, scale), 
      fontWeight: '700' as const, 
      marginBottom: responsiveSize(16, scale),
      letterSpacing: 0.3,
    },
    profileRow: { 
      flexDirection: 'row' as const, 
      alignItems: 'center' as const,
    },
    profileTextContainer: {
      flex: 1,
      marginLeft: responsiveSize(12, scale),
    },
    profileIconContainer: {
      width: responsiveSize(56, scale),
      height: responsiveSize(56, scale),
      borderRadius: responsiveSize(12, scale),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconContainer: {
      width: responsiveSize(40, scale),
      height: responsiveSize(40, scale),
      borderRadius: responsiveSize(10, scale),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: responsiveSize(12, scale),
    },
    name: { 
      fontSize: responsiveSize(isSmallScreen ? 18 : 19, scale), 
      fontWeight: '700' as const,
      marginBottom: 4,
    },
    email: { 
      fontSize: responsiveSize(isSmallScreen ? 15 : 16, scale),
    },
    switchRow: { 
      flexDirection: 'row' as const, 
      alignItems: 'center', 
      justifyContent: 'space-between',
    },
    switchLabelContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: responsiveSize(12, scale),
      flex: 1,
    },
    optionText: { 
      fontSize: responsiveSize(isSmallScreen ? 16 : 17, scale),
    },
    aboutContainer: {
      flexDirection: 'row' as const,
      gap: responsiveSize(12, scale),
      alignItems: 'flex-start',
    },
    aboutText: { 
      flex: 1,
      fontSize: responsiveSize(isSmallScreen ? 13 : 14, scale), 
      lineHeight: responsiveSize(20, scale),
    },
    backButtonWrapper: {
      marginTop: responsiveSize(20, scale),
      marginBottom: responsiveSize(12, scale),
      borderRadius: 0,
      overflow: 'hidden' as const,
      shadowColor: '#FFEE00',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    backButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: responsiveSize(16, scale),
      paddingHorizontal: responsiveSize(24, scale),
      gap: responsiveSize(10, scale),
      borderWidth: 1.5,
      borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    backButtonText: {
      color: '#000',
      fontSize: responsiveSize(isSmallScreen ? 15 : 16, scale),
      fontWeight: '700' as const,
      textAlign: 'center' as const,
      letterSpacing: 0.3,
    },
  };
}
