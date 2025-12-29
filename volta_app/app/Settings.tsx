import React, { useContext, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from './context/UserContext';
import { ThemeContext } from './context/ThemeContext';
import { getColors } from './components/theme';
import Screen from './components/Screen';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

export default function Settings() {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const colors = getColors(theme);
  
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        <Animated.View
          style={[
            { flex: 1 },
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <ScrollView 
            contentContainerStyle={styles.scroll} 
            showsVerticalScrollIndicator={false}
          >
            {/* Profil utilizator */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Profil</Text>
              <TouchableOpacity 
                style={styles.profileRow} 
                onPress={() => router.push('/EditProfil')}
                activeOpacity={0.7}
              >
                <View style={[styles.profileIconContainer, { backgroundColor: isDark ? colors.surface : '#333' }]}>
                  <Ionicons name="person-circle-outline" size={32} color={colors.primaryButton} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {user?.nume} {user?.prenume}
                  </Text>
                  <Text style={[styles.email, { color: colors.textMuted }]}>
                    {user?.email || user?.telefon}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Tema */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Aparență</Text>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.surface : '#333' }]}>
                    <Ionicons 
                      name={isDark ? "moon" : "sunny-outline"} 
                      size={22} 
                      color={colors.primaryButton} 
                    />
                  </View>
                  <Text style={[styles.optionText, { color: colors.text }]}>
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

            {/* Despre aplicație */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Despre aplicație</Text>
              <View style={styles.aboutContainer}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.aboutText, { color: colors.textMuted }]}>
                  Versiune: 1.0.0{"\n"}
                  Aplicația Volta te ajută să fii mereu conectat cu cele mai noi promoții și oferte.
                </Text>
              </View>
            </View>

            {/* Back Button */}
            <TouchableOpacity 
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={styles.backButtonWrapper}
            >
              <LinearGradient
                colors={['#FFEE00', '#FFEE00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={18} color="#000" />
                <Text style={styles.backButtonText}>Înapoi</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: { 
    fontSize: isSmallScreen ? 28 : 32,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: isSmallScreen ? 14 : 15,
  },
  scroll: { 
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 100,
  },
  section: {
    borderRadius: 0,
    padding: 20,
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
    width: '100%',
  },
  sectionTitle: { 
    fontSize: isSmallScreen ? 19 : 20, 
    fontWeight: '700', 
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  profileRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  profileIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: { 
    fontSize: isSmallScreen ? 18 : 19, 
    fontWeight: '700',
    marginBottom: 4,
  },
  email: { 
    fontSize: isSmallScreen ? 15 : 16,
  },
  switchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionText: { 
    fontSize: isSmallScreen ? 16 : 17,
  },
  aboutContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  aboutText: { 
    flex: 1,
    fontSize: isSmallScreen ? 13 : 14, 
    lineHeight: 20,
  },
  backButtonWrapper: {
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButtonText: {
    color: '#000',
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
