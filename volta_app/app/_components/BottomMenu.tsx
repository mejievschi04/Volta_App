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
  Easing,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
// Using @expo/vector-icons for classic icons
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { ThemeContext } from '../_context/ThemeContext';
import { UserContext } from '../_context/UserContext';
import { getColors } from './theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;
const isMediumScreen = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 768;
const BOTTOM_MENU_HEIGHT_ESTIMATE = 78; // înălțimea barei (paddingTop + rând + paddingBottom), fără insets
export default function BottomMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);
  const { user, selectedCardPercent } = useContext(UserContext);
  const colors = getColors(theme);

  // Cardul selectat pentru barcode (din user) – fără carduri fictive
  const activeCards = (user?.discount_cards ?? []).filter(
    (c) => !c.expires_at || new Date(c.expires_at) > new Date()
  );
  const selectedCardId = user?.selected_discount_card_id;
  const selectedCard = activeCards.find((c) => c.id === selectedCardId) ?? activeCards[0];
  const hasRealCard = activeCards.length > 0 && selectedCard != null;
  const displayPercent = hasRealCard ? (selectedCard?.discount_value ?? 0) : null;
  const displayCardCode = hasRealCard && user?.id != null
    ? `VOLTA-${user.id}-${selectedCard!.id}`.slice(0, 20)
    : '';
  const displayBarcodeValue = hasRealCard && user?.id != null
    ? `${String(user.id).padStart(6, "0")}${String(selectedCard!.id).padStart(6, "0")}`.slice(0, 12)
    : '';

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
  
  const menuItems = [
    { id: 'acasa', label: 'Acasă', iconName: 'home', route: '/Home' },
    { id: 'catalog', label: 'Catalog', iconName: 'view-grid-outline', route: '/Catalog' },
    { id: 'harta', label: 'Hartă', iconName: 'map', route: '/Harta' },
  ];

  const moreMenuOptions = [
    { id: 'profile', label: 'Profil', iconName: 'person-outline', route: '/Profile' },
    { id: 'cos', label: 'Coș', iconName: 'cart-outline', route: '/Cos' },
    { id: 'promotii', label: 'Promoții', iconName: 'pricetag-outline', route: '/Promotii' },
    { id: 'blog', label: 'Blog', iconName: 'newspaper-outline', route: '/Blog' },
  ];

  // State for discount card modal
  const [showDiscountCard, setShowDiscountCard] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const modalOverlayAnim = useRef(new Animated.Value(0)).current;
  const modalContentScale = useRef(new Animated.Value(0.85)).current;
  const modalContentOpacity = useRef(new Animated.Value(0)).current;

  // Când modalul e deschis: ascunde bara de status ca modalul să acopere tot ecranul. La închidere refă ascunderea (app-ul folosește bare ascunse).
  useEffect(() => {
    if (showDiscountCard) {
      StatusBar.setHidden(true, 'fade');
      if (Platform.OS === 'android') StatusBar.setBackgroundColor('transparent');
    } else {
      // Restabilire: barele rămân ascunse ca în restul app-ului
      StatusBar.setHidden(true, 'fade');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        NavigationBar.setVisibilityAsync('hidden');
      }
    }
    return () => {
      StatusBar.setHidden(true, 'fade');
      if (Platform.OS === 'android') NavigationBar.setVisibilityAsync('hidden');
    };
  }, [showDiscountCard]);

  // Animație deschidere modal – fade + scale cu easing
  useEffect(() => {
    if (showDiscountCard) {
      modalOverlayAnim.setValue(0);
      modalContentScale.setValue(0.88);
      modalContentOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(modalOverlayAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(modalContentOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(modalContentScale, {
          toValue: 1,
          tension: 72,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showDiscountCard]);

  const closeDiscountModal = () => {
    Animated.parallel([
      Animated.timing(modalOverlayAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(modalContentOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(modalContentScale, {
        toValue: 0.92,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setShowDiscountCard(false));
  };

  // Find active item index and animate indicator (only for Acasă, Catalog, Hartă)
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
    const iconColor = isActive ? colors.text : colors.navBarInactive;
    const textColor = isActive ? colors.text : colors.navBarInactive;
    const iconOpacity = isActive ? 1 : 0.88;

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
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityHint={`Navighează la ${label}`}
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
              position: 'relative',
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
                opacity: isActive ? 1 : 0.9,
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
  const menuWidth = SCREEN_WIDTH;
  const menuPaddingH = isSmallScreen ? 6 : 10;
  const totalVisualItems = 5; // Acasă, Card, Catalog, Hartă, More
  const availableWidth = menuWidth - (menuPaddingH * 2);
  const visualItemWidth = availableWidth / totalVisualItems;
  const indicatorWidth = visualItemWidth * 0.8;
  // Indicator only for first 3 items: positions 0 (Acasă), 1 (Catalog), 3 (Hartă) – skip 2 for central card
  const indicatorLeft = activeIndicatorPosition.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 2].map((index) => {
      const visualIndex = index < 2 ? index : 3; // 0->0, 1->1, 2->3
      return menuPaddingH + visualIndex * visualItemWidth + (visualItemWidth - indicatorWidth) / 2;
    }),
  });
  const indicatorWidthAnimated = activeIndicatorPosition.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [indicatorWidth, indicatorWidth, indicatorWidth],
  });

  // Barcode mare pentru modalul card reducere (doar barcode pe fundal negru)
  const renderBarcode = (barHeight: number, barScale: number = 2.5) => (
    <View style={barcodeStyles.container}>
      {Array.from({ length: 44 }).map((_, i) => (
        <View
          key={i}
          style={[
            barcodeStyles.bar,
            {
              width: ((i % 5 === 0 || i % 7 === 0) ? 2 : 1.5) * barScale,
              height: barHeight,
            },
          ]}
        />
      ))}
    </View>
  );
  
  if (!menuVisible) {
    return null;
  }

  return (
    <>
        {/* Meniu Mai mult – overlay sub bara de meniu (z 999), bară z 1000 */}
        {showMoreMenu && (
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 999 }]} pointerEvents="box-none">
            {/* Backdrop – doar zona de deasupra barei; tap aici închide meniul */}
            <TouchableOpacity
              style={[
                moreMenuStyles.overlay,
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: BOTTOM_MENU_HEIGHT_ESTIMATE + Math.max(insetsBottom, 8),
                },
              ]}
              activeOpacity={1}
              onPress={() => setShowMoreMenu(false)}
            />
            {/* Panoul cu opțiuni – separat ca tap pe opțiuni să nu închidă din overlay */}
            <View
              style={[
                moreMenuStyles.container,
                {
                  flex: 1,
                  justifyContent: 'flex-end',
                  paddingBottom: BOTTOM_MENU_HEIGHT_ESTIMATE + Math.max(insetsBottom, 8) - 12,
                  paddingRight: 0,
                  paddingLeft: 16,
                  alignItems: 'flex-end',
                },
              ]}
              pointerEvents="box-none"
            >
              <View
                style={[
                  moreMenuStyles.panel,
                  {
                    backgroundColor: colors.navBarBg,
                    borderColor: colors.navBarBorder,
                  },
                ]}
                onStartShouldSetResponder={() => true}
              >
                {moreMenuOptions.map((opt, i) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      moreMenuStyles.row,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navBarBorder },
                    ]}
                    onPress={() => {
                      setShowMoreMenu(false);
                      router.push(opt.route as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[moreMenuStyles.label, { color: colors.text }]}>{opt.label}</Text>
                    <View style={[moreMenuStyles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
                      <Ionicons name={opt.iconName as any} size={20} color={colors.text} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      <View style={styles.container} pointerEvents="box-none">
      <View style={[styles.menu, { 
        paddingBottom: Math.max(insetsBottom, 8),
        backgroundColor: colors.navBarBg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.navBarBorder,
      }]}>
        <View style={[
          styles.overlay,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' },
        ]} />
        
        <Animated.View
          style={[
            styles.activeIndicator,
            { left: indicatorLeft, width: indicatorWidthAnimated },
          ]}
        />
        
        {/* Stânga: Acasă */}
        {menuItems.slice(0, 1).map((item, index) => (
          <Item
            key={item.id}
            id={item.id}
            label={item.label}
            iconName={item.iconName}
            onPress={() => router.push(item.route as any)}
            index={index}
            route={item.route}
          />
        ))}

        {/* Catalog */}
        {menuItems.slice(1, 2).map((item, index) => (
          <Item
            key={item.id}
            id={item.id}
            label={item.label}
            iconName={item.iconName}
            onPress={() => router.push(item.route as any)}
            index={index + 1}
            route={item.route}
          />
        ))}

        {/* Buton central Card – pe mijloc, galben Volta */}
        <View style={styles.centralButtonContainer}>
          <View style={styles.centralButtonGlow} />
          <TouchableOpacity
            style={[styles.centralButton, { borderColor: colors.navBarBg }]}
            onPress={() => {
              if (hasRealCard) {
                setShowDiscountCard(true);
              } else {
                router.push('/Profile');
              }
            }}
            activeOpacity={0.85}
            accessibilityLabel="Card reducere"
            accessibilityRole="button"
            accessibilityHint={hasRealCard ? "Deschide cardul de reducere" : "Mergi la Profil pentru a adăuga un card"}
          >
            <LinearGradient
              colors={['#FFEE00', '#FFE844', '#FFD700', '#FFC700']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              locations={[0, 0.3, 0.7, 1]}
              style={styles.centralButtonGradient}
            >
              <Ionicons name="card" size={32} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Hartă */}
        {menuItems.slice(2, 3).map((item, index) => (
          <Item
            key={item.id}
            id={item.id}
            label={item.label}
            iconName={item.iconName}
            onPress={() => router.push(item.route as any)}
            index={index + 2}
            route={item.route}
          />
        ))}

        {/* Al 4-lea element: 3 puncte – deschide meniul flotant */}
        <Pressable
          onPress={() => setShowMoreMenu((prev) => !prev)}
          style={styles.item}
          accessibilityLabel="Mai mult"
          accessibilityRole="button"
          accessibilityHint="Deschide meniul cu Profil, Coș, Promoții, Blog"
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name="ellipsis-horizontal"
              size={isSmallScreen ? 20 : isMediumScreen ? 22 : 24}
              color={colors.navBarInactive}
            />
            <Text style={[styles.label, { color: colors.navBarInactive, fontWeight: '400', opacity: 0.9 }]}>
              Mai mult
            </Text>
          </View>
        </Pressable>
        
        {/* Discount Card Modal – animație deschidere/închidere */}
        <Modal
          visible={showDiscountCard}
          transparent={true}
          animationType="none"
          onRequestClose={closeDiscountModal}
          statusBarTranslucent
        >
          {/* Wrapper full-screen – fundal acoperă și bara de sus */}
          <View style={[styles.modalRoot, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#FFFFFF' }]}>
            <View style={styles.modalContainer}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeDiscountModal}
            />
            <Animated.View
              style={[styles.modalOverlay, { opacity: modalOverlayAnim, backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'transparent' }]}
              pointerEvents="none"
            />
            <Animated.View
              style={[
                styles.modalContentWrapper,
                {
                  opacity: modalContentOpacity,
                  transform: [{ scale: modalContentScale }],
                },
              ]}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                style={[styles.modalCloseButton, { top: Math.max(insets.top, 12) + 12 }]}
                onPress={closeDiscountModal}
                activeOpacity={0.8}
                accessibilityLabel="Închide"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.barcodeOnlyContent}>
                {hasRealCard && displayCardCode && displayBarcodeValue && displayPercent != null ? (
                  <>
                    <Text style={[styles.barcodeCodeLabel, { color: colors.textMuted }]}>
                      Reducere {displayPercent}%
                    </Text>
                    <Text style={[styles.barcodeCode, { color: colors.text }]}>
                      {displayCardCode}
                    </Text>
                    <Text style={[styles.barcodeCodeLabel, { color: colors.textMuted, marginBottom: 8 }]}>
                      {displayBarcodeValue}
                    </Text>
                    <View style={styles.barcodeOnlyWrap}>
                      {renderBarcode(100, 2.5)}
                    </View>
                    <Text style={[styles.barcodeOnlyHint, { color: colors.textMuted }]}>Apasă în afară pentru închidere</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.barcodeCodeLabel, { color: colors.textMuted }]}>Nu ai card de reducere</Text>
                    <Text style={[styles.barcodeOnlyHint, { color: colors.textMuted, marginTop: 8 }]}>Adaugă un card din Profil</Text>
                    <TouchableOpacity
                      style={{
                        marginTop: 20,
                        backgroundColor: '#FFEE00',
                        paddingVertical: 14,
                        paddingHorizontal: 24,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => { closeDiscountModal(); router.push('/Profile'); }}
                      activeOpacity={0.85}
                    >
                      <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>Mergi la Profil</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Animated.View>
            </View>
          </View>
        </Modal>

      </View>
    </View>
    </>
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
    width: '100%',
    paddingTop: isSmallScreen ? 12 : 14,
    paddingBottom: isSmallScreen ? 12 : 14,
    paddingHorizontal: isSmallScreen ? 6 : 10,
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
    paddingVertical: isSmallScreen ? 10 : 12,
    marginHorizontal: 2,
    borderRadius: 16,
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'visible',
    minHeight: isSmallScreen ? 56 : isMediumScreen ? 60 : 64,
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
  itemHover: {},
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
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    marginTop: isSmallScreen ? 4 : 5,
    backgroundColor: 'transparent',
    fontWeight: '600',
    letterSpacing: 0.2,
    fontSize: 12,
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
    width: isSmallScreen ? 80 : isMediumScreen ? 88 : 96,
    height: isSmallScreen ? 80 : isMediumScreen ? 88 : 96,
    borderRadius: (isSmallScreen ? 80 : isMediumScreen ? 88 : 96) / 2,
    backgroundColor: '#FFEE00',
    opacity: 0.35,
    marginTop: -42,
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 4,
    zIndex: 1002,
  },
  centralButton: {
    width: isSmallScreen ? 64 : isMediumScreen ? 70 : 76,
    height: isSmallScreen ? 64 : isMediumScreen ? 70 : 76,
    borderRadius: (isSmallScreen ? 64 : isMediumScreen ? 70 : 76) / 2,
    backgroundColor: '#FFEE00',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -42,
    zIndex: 1003,
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 18,
    borderWidth: 4,
    overflow: 'visible',
  },
  centralButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: (isSmallScreen ? 64 : isMediumScreen ? 70 : 76) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  modalRoot: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContentWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCloseButton: {
    position: 'absolute',
    right: 20,
    padding: 10,
    zIndex: 15,
  },
  barcodeOnlyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 340,
  },
  barcodeCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  barcodeCode: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 24,
  },
  barcodeOnlyWrap: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  barcodeOnlyHint: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

const moreMenuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    paddingRight: 0,
  },
  panel: {
    minWidth: 180,
    maxWidth: 280,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const barcodeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
  },
  bar: {
    backgroundColor: '#000',
    borderRadius: 0,
  },
});
