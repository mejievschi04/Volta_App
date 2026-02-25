import React, { useState, useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Modal,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "./theme";
import { ThemeContext } from "../_context/ThemeContext";

interface DiscountCardProps {
  name: string;
  logo?: any; // optional logo image
  discountValue?: number;
  cardCode?: string;
  barcodeValue?: string;
  /** Pe pagina Profil: fără flip automat și fără deschidere automată a barcode */
  profileMode?: boolean;
  /** Variantă vizuală: primary = 10% (galben/negru), secondary = 5% (gri/argintiu) */
  variant?: 'primary' | 'secondary';
  /** Lățime maximă (ex. ca cardul să nu fie tăiat de layout) */
  maxWidth?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_HEIGHT = 186;
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 360);

const DiscountCard: React.FC<DiscountCardProps> = ({ name, logo, discountValue = 10, cardCode = "Card ID: 123456789", barcodeValue, profileMode = false, variant = 'primary', maxWidth }) => {
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();
  const [flipped, setFlipped] = useState(false);
  const [barcodeZoom, setBarcodeZoom] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const entranceScale = useRef(new Animated.Value(0.92)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const zoomOverlayAnim = useRef(new Animated.Value(0)).current;
  const zoomCardScaleAnim = useRef(new Animated.Value(0.88)).current;

  const renderBarcode = (barHeight: number, barScale: number = 1) => (
    <View style={styles.barcodeContainer}>
      {Array.from({ length: 44 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.barcodeBar,
            {
              width: ((i % 5 === 0 || i % 7 === 0) ? 2 : 1.5) * barScale,
              height: barHeight,
            },
          ]}
        />
      ))}
    </View>
  );

  // La montare: intrare fluidă; doar în modul meniu (nu profileMode) se face flip automat + zoom barcode
  useEffect(() => {
    animatedValue.setValue(0);
    entranceScale.setValue(0.92);
    entranceOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(entranceScale, {
        toValue: 1,
        tension: 90,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (profileMode) return;

    const t = setTimeout(() => {
      Animated.timing(animatedValue, {
        toValue: 180,
        duration: 420,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setFlipped(true);
        setBarcodeZoom(true);
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [profileMode]);

  // Zoom modal: animație intrare când se deschide
  useEffect(() => {
    if (!barcodeZoom) return;
    zoomOverlayAnim.setValue(0);
    zoomCardScaleAnim.setValue(0.88);
    Animated.parallel([
      Animated.timing(zoomOverlayAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(zoomCardScaleAnim, {
        toValue: 1,
        tension: 75,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, [barcodeZoom]);

  const closeBarcodeZoom = () => {
    Animated.parallel([
      Animated.timing(zoomOverlayAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(zoomCardScaleAnim, {
        toValue: 0.9,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setBarcodeZoom(false);
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 380,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setFlipped(false));
    });
  };

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const flipCard = () => {
    if (flipped) {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 380,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setFlipped(false));
    } else {
      Animated.timing(animatedValue, {
        toValue: 180,
        duration: 420,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setFlipped(true));
    }
  };

  const isSecondary = variant === 'secondary';
  const gradientColorsFront = theme === 'dark'
    ? (isSecondary ? ['#2a2a2a', '#3a3a3a', '#1a1a1a'] : ['#1a1a1a', '#2a2a00', '#0d0d0d'])
    : (isSecondary ? ['#f5f5f5', '#e8e8e8', '#fafafa'] : ['#fffef5', '#FFEE00', '#fff9cc']);
  const badgeBg = theme === 'dark'
    ? (isSecondary ? '#888' : '#FFEE00')
    : (isSecondary ? '#555' : '#000');
  const badgeFg = theme === 'dark'
    ? (isSecondary ? '#fff' : '#000')
    : (isSecondary ? '#fff' : '#FFEE00');
  const borderColorCard = theme === 'dark'
    ? (isSecondary ? 'rgba(255,255,255,0.12)' : 'rgba(255,238,0,0.25)')
    : (isSecondary ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.08)');

  return (
    <TouchableWithoutFeedback onPress={flipCard}>
      <Animated.View
        style={[
          styles.container,
          maxWidth != null && { width: Math.min(maxWidth, CARD_WIDTH) },
          {
            opacity: entranceOpacity,
            transform: [{ scale: entranceScale }],
          },
        ]}
      >
        {/* Fața – reducere (design modern) */}
        <Animated.View
          style={[
            styles.card,
            { transform: [{ rotateY: frontInterpolate }], borderColor: borderColorCard, shadowColor: '#000' },
          ]}
          pointerEvents={flipped ? 'none' : 'auto'}
        >
          <LinearGradient
            colors={gradientColorsFront}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.frontTop}>
              {logo ? <Image source={logo} style={styles.logo} resizeMode="contain" /> : <Text style={[styles.logoText, { color: colors.text }]}>VOLTA</Text>}
              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.badgeText, { color: badgeFg }]}>{discountValue}%</Text>
                <Text style={[styles.badgeLabel, { color: badgeFg }]}>REDUCERE</Text>
              </View>
            </View>
            <View style={styles.frontBottom}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>{profileMode ? 'Apasă pentru cod' : 'Apasă sau așteaptă pentru cod'}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Spate – barcode (design modern) */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ rotateY: backInterpolate }],
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              borderColor: borderColorCard,
            },
          ]}
        >
          <View style={[styles.backCard, { backgroundColor: theme === 'dark' ? '#141414' : '#f8f8f8' }]}>
            <Text style={[styles.cardCodeLabel, { color: colors.textMuted }]}>Cod card</Text>
            <Text style={[styles.cardCode, { color: colors.text }]}>{cardCode}</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setBarcodeZoom(true)}
              style={[styles.barcodeWrap, { backgroundColor: '#fff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 }]}
            >
              {renderBarcode(56)}
            </TouchableOpacity>
            <Text style={[styles.barcodeHint, { color: colors.textMuted }]}>Apasă pe barcode pentru mărire</Text>
          </View>
        </Animated.View>

        {/* Modal zoom barcode – animație scale + fade */}
        <Modal
          visible={barcodeZoom}
          transparent
          animationType="none"
          onRequestClose={closeBarcodeZoom}
          statusBarTranslucent
        >
          <View
            style={[
              styles.zoomModalContainer,
              {
                marginTop: -Math.max(insets.top, 28),
                paddingTop: Math.max(insets.top, 28),
              },
            ]}
          >
            <View style={[styles.zoomTopBar, { height: Math.max(insets.top, 28) }]} />
            <TouchableOpacity
              activeOpacity={1}
              style={StyleSheet.absoluteFill}
              onPress={closeBarcodeZoom}
            >
              <Animated.View
                style={[styles.zoomOverlay, { opacity: zoomOverlayAnim }]}
                pointerEvents="none"
              />
            </TouchableOpacity>
          <Animated.View
            style={[
              styles.zoomCardWrapper,
              {
                opacity: zoomOverlayAnim,
                transform: [{ scale: zoomCardScaleAnim }],
              },
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[styles.zoomCard, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}
            >
              <Text style={[styles.zoomCodeLabel, { color: colors.textMuted }]}>Cod card</Text>
              <Text style={[styles.zoomCode, { color: colors.text }]}>{cardCode}</Text>
              <View style={styles.zoomBarcodeWrap}>
                {renderBarcode(100, 2.5)}
              </View>
              <Text style={[styles.zoomHint, { color: colors.textMuted }]}>Apasă în afară pentru închidere</Text>
            </TouchableOpacity>
          </Animated.View>
          </View>
        </Modal>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginVertical: 8,
    alignSelf: "center",
  },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    borderWidth: 1,
    backfaceVisibility: "hidden",
    overflow: "hidden",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  gradient: {
    flex: 1,
    borderRadius: 21,
    padding: 20,
    justifyContent: "space-between",
  },
  frontTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: {
    width: 72,
    height: 28,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
    opacity: 0.9,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  badgeText: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 2,
    opacity: 0.9,
  },
  frontBottom: {
    marginTop: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
    opacity: 0.95,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  backCard: {
    flex: 1,
    borderRadius: 21,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cardCodeLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  cardCode: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 16,
  },
  barcodeWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  barcodeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 1,
  },
  barcodeBar: {
    backgroundColor: "#000",
    borderRadius: 0,
  },
  barcodeHint: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  zoomModalContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  zoomTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1a1a1a",
    zIndex: 10,
  },
  zoomOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.78)",
  },
  zoomCardWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  zoomCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  zoomCodeLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  zoomCode: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 20,
  },
  zoomBarcodeWrap: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  zoomHint: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});

export default DiscountCard;
