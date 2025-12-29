import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
// Using @expo/vector-icons for classic icons
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import { UserContext } from '../context/UserContext';
import { getColors } from './theme';
import DiscountCard from './DiscountCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;
const isMediumScreen = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 768;

export default function BottomMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);
  const { user } = useContext(UserContext);
  const colors = getColors(theme);

  const insetsBottom = Math.max(8, insets.bottom);
  const pathname = usePathname();

  // track hover state for web (Pressable)
  const [hovered, setHovered] = useState<string | null>(null);
  
  // Auto-hide menu when navigation bar appears
  const [menuVisible, setMenuVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // Reset timer whenever safe area bottom changes (navigation bar appears/disappears)
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    
    // If navigation bar is visible (insets.bottom > 8), start auto-hide timer
    if (insets.bottom > 8) {
      hideTimerRef.current = setTimeout(() => {
        setMenuVisible(false);
      }, 3000); // Hide after 3 seconds
    } else {
      // If navigation bar is hidden, show menu again
      setMenuVisible(true);
    }
    
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [insets.bottom]);
  
  // Active indicator position animation
  const activeIndicatorPosition = useRef(new Animated.Value(0)).current;
  
  // Menu items configuration (removed Promoții, will have central discount card button)
  const menuItems = [
    { id: 'acasa', label: 'Acasă', iconName: 'home', route: '/Home' },
    { id: 'profile', label: 'Profil', iconName: 'account', route: '/Profile' },
    { id: 'blog', label: 'Blog', iconName: 'newspaper-variant-outline', route: '/Blog' },
    { id: 'harta', label: 'Hartă', iconName: 'map', route: '/Harta' },
  ];

  // State for discount card modal
  const [showDiscountCard, setShowDiscountCard] = useState(false);
  
  // Find active item index and animate indicator
  useEffect(() => {
    const activeIndex = menuItems.findIndex(item => 
      pathname && pathname.startsWith(item.route)
    );
    
    if (activeIndex !== -1) {
      Animated.spring(activeIndicatorPosition, {
        toValue: activeIndex,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  }, [pathname]);

  const Item = ({
    id,
    label,
    onPress,
    iconName,
    index,
    route,
  }: {
    id: string;
    label: string;
    onPress: () => void;
    iconName: string;
    index: number;
    route: string;
  }) => {
    const isHovered = hovered === id;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const iconScaleAnim = useRef(new Animated.Value(1)).current;
    const slideLineScaleY = useRef(new Animated.Value(0)).current;
    const slideLineOpacity = useRef(new Animated.Value(0)).current;
    
    const isActive = Boolean(pathname && route && pathname.startsWith(route));
    const isDark = theme === 'dark';
    const iconColor = isActive ? colors.text : '#4D4D4D';
    const textColor = isActive ? colors.text : '#4D4D4D';
    const iconOpacity = isActive ? 1 : 0.72;

    // Hover animation - slide line from bottom
    useEffect(() => {
      if (isHovered && !isActive) {
        Animated.parallel([
          Animated.spring(slideLineScaleY, {
            toValue: 1,
            tension: 150,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(slideLineOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(slideLineScaleY, {
            toValue: 0,
            tension: 200,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(slideLineOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isHovered, isActive]);

    const handlePressIn = () => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.92,
          useNativeDriver: true,
        }),
        Animated.spring(iconScaleAnim, {
          toValue: 1.15,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const handlePressOut = () => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const iconSize = isSmallScreen ? 20 : isMediumScreen ? 22 : 24;
    const labelSize = isSmallScreen ? 11 : isMediumScreen ? 12 : 13;
    
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onHoverIn={() => Platform.OS === 'web' && setHovered(id)}
        onHoverOut={() => Platform.OS === 'web' && setHovered(null)}
        style={({ pressed }) => [
          styles.item,
          isHovered && styles.itemHover,
        ]}
        android_ripple={{ color: 'rgba(255,238,0,0.1)', borderless: false }}
      >
        {/* Slide line indicator for hover */}
        <Animated.View
          style={[
            styles.slideLine,
            {
              transform: [{ scaleY: slideLineScaleY }],
              opacity: slideLineOpacity,
            },
          ]}
        />
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Animated.View
            style={{
              transform: [{ scale: iconScaleAnim }],
            }}
          >
            <MaterialCommunityIcons
              name={iconName as any}
              size={iconSize}
              color={iconColor}
            />
          </Animated.View>
          <Text
            style={[
              styles.label,
              { 
                color: textColor, 
                backgroundColor: 'transparent',
                fontSize: labelSize,
                fontWeight: isActive ? '600' : '400',
                opacity: isActive ? 1 : 0.75,
              },
            ]}
          >
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    );
  };

  const isDark = theme === 'dark';
  
  // Calculate indicator position - accounting for menu padding and item margins
  // Note: We have 4 menu items + 1 central button, so we need to account for 5 positions visually
  // But indicator only moves between the 4 menu items
  const menuPaddingH = isSmallScreen ? 8 : isMediumScreen ? 12 : 16;
  const itemMarginH = isSmallScreen ? 3 : isMediumScreen ? 4 : 6;
  const totalVisualItems = 5; // 4 menu items + 1 central button
  const availableWidth = SCREEN_WIDTH - (menuPaddingH * 2);
  const visualItemWidth = availableWidth / totalVisualItems;
  const indicatorWidth = visualItemWidth * 0.8; // 80% of item width to cover the element
  const indicatorLeft = activeIndicatorPosition.interpolate({
    inputRange: menuItems.map((_, index) => index),
    outputRange: menuItems.map((_, index) => {
      // Map index: 0->0, 1->1, 2->3, 3->4 (skip position 2 for central button)
      const visualIndex = index < 2 ? index : index + 1;
      // Center the indicator exactly on the item: menu padding + item start + (item width - indicator width) / 2
      return menuPaddingH + visualIndex * visualItemWidth + (visualItemWidth - indicatorWidth) / 2;
    }),
  });
  const indicatorWidthAnimated = activeIndicatorPosition.interpolate({
    inputRange: menuItems.map((_, index) => index),
    outputRange: menuItems.map(() => indicatorWidth),
  });
  
  if (!menuVisible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={[styles.menu, { 
        marginBottom: 0,
        paddingBottom: Math.max(insetsBottom, 8),
        backgroundColor: colors.surface,
        borderColor: colors.primaryButton,
        shadowColor: colors.primaryButton,
      }]}>
        {/* Subtle overlay for modern glass effect */}
        <View style={[
          styles.overlay,
          { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.03)' 
              : 'rgba(0, 0, 0, 0.02)',
          }
        ]} />
        
        {/* Active indicator that slides between items - centered on icon */}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              left: indicatorLeft,
              width: indicatorWidthAnimated,
            },
          ]}
        />
        
        {/* Left side menu items */}
        {menuItems.slice(0, 2).map((item, index) => (
          <Item
            key={item.id}
            id={item.id}
            label={item.label}
            iconName={item.iconName}
            onPress={() => router.push(item.route)}
            index={index}
            route={item.route}
          />
        ))}
        
        {/* Central discount card button */}
        <View style={styles.centralButtonContainer}>
          {/* Glow effect behind button */}
          <View style={styles.centralButtonGlow} />
          <TouchableOpacity
            style={[styles.centralButton, { borderColor: colors.surface }]}
            onPress={() => setShowDiscountCard(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FFEE00', '#FFE844', '#FFD700', '#FFC700']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              locations={[0, 0.3, 0.7, 1]}
              style={styles.centralButtonGradient}
            >
              <Ionicons name="card" size={28} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Right side menu items */}
        {menuItems.slice(2).map((item, index) => (
          <Item
            key={item.id}
            id={item.id}
            label={item.label}
            iconName={item.iconName}
            onPress={() => router.push(item.route)}
            index={index + 2}
            route={item.route}
          />
        ))}
        
        {/* Discount Card Modal */}
        <Modal
          visible={showDiscountCard}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDiscountCard(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDiscountCard(false)}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDiscountCard(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <DiscountCard
                name={user?.prenume && user?.nume ? `${user.prenume} ${user.nume}`.toUpperCase() : "VOLTA USER"}
                discountValue={10}
                cardCode={`VOLTA-${user?.id ? String(user.id).slice(0, 4).toUpperCase() : "0000"}`}
                barcodeValue={user?.id ? String(user.id).slice(0, 12) : "458712345678"}
              />
            </Pressable>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 1000,
    overflow: 'visible',
  },
  menu: {
    flexDirection: 'row',
    paddingTop: isSmallScreen ? 12 : isMediumScreen ? 14 : 16,
    paddingBottom: isSmallScreen ? 12 : isMediumScreen ? 14 : 16,
    paddingHorizontal: isSmallScreen ? 8 : isMediumScreen ? 12 : 16,
    borderTopLeftRadius: isSmallScreen ? 20 : isMediumScreen ? 22 : 24,
    borderTopRightRadius: isSmallScreen ? 20 : isMediumScreen ? 22 : 24,
    width: '100%',
    maxWidth: 1100,
    borderWidth: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
    marginHorizontal: 0,
    position: 'relative',
    overflow: 'visible',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallScreen ? 8 : isMediumScreen ? 10 : 12,
    marginHorizontal: isSmallScreen ? 3 : isMediumScreen ? 4 : 6,
    borderRadius: 14,
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'visible',
    minHeight: isSmallScreen ? 60 : isMediumScreen ? 65 : 70,
  },
  diamondBackground: {
    position: 'absolute',
    width: isSmallScreen ? 45 : isMediumScreen ? 50 : 55,
    height: isSmallScreen ? 45 : isMediumScreen ? 50 : 55,
    backgroundColor: '#FFEE00',
    borderRadius: 10,
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  glowEffect: {
    position: 'absolute',
    width: isSmallScreen ? 60 : isMediumScreen ? 70 : 80,
    height: isSmallScreen ? 60 : isMediumScreen ? 70 : 80,
    backgroundColor: '#FFEE00',
    borderRadius: 20,
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  itemHover: {
    // Hover effect is now handled by animations
  },
  slideLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FFEE00',
    borderRadius: 2,
    transformOrigin: 'bottom',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: '#FFEE00',
    borderRadius: 2,
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    marginTop: isSmallScreen ? 4 : 6,
    backgroundColor: 'transparent',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  centralButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1001,
  },
  centralButtonGlow: {
    position: 'absolute',
    width: isSmallScreen ? 70 : isMediumScreen ? 75 : 80,
    height: isSmallScreen ? 70 : isMediumScreen ? 75 : 80,
    borderRadius: (isSmallScreen ? 70 : isMediumScreen ? 75 : 80) / 2,
    backgroundColor: '#FFEE00',
    opacity: 0.4,
    marginTop: -28,
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 0,
    zIndex: 1002,
  },
  centralButton: {
    width: isSmallScreen ? 56 : isMediumScreen ? 60 : 64,
    height: isSmallScreen ? 56 : isMediumScreen ? 60 : 64,
    borderRadius: (isSmallScreen ? 56 : isMediumScreen ? 60 : 64) / 2,
    backgroundColor: '#FFEE00',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28, // Button aligned with navbar bottom, half outside
    zIndex: 1003,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 4,
    overflow: 'visible',
  },
  centralButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: (isSmallScreen ? 56 : isMediumScreen ? 60 : 64) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
  },
});
