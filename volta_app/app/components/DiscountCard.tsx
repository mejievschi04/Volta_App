import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getColors } from "./theme";
import { ThemeContext } from "../context/ThemeContext";

interface DiscountCardProps {
  name: string;
  logo?: any; // optional logo image
  discountValue?: number;
  cardCode?: string;
  barcodeValue?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_HEIGHT = 170;
const CARD_WIDTH = SCREEN_WIDTH * 0.88; // 85% din lățimea ecranului

const DiscountCard: React.FC<DiscountCardProps> = ({ name, logo, discountValue = 10, cardCode = "Card ID: 123456789", barcodeValue }) => {
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const [flipped, setFlipped] = useState(false);
  const animatedValue = useState(new Animated.Value(0))[0];

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
      Animated.spring(animatedValue, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(animatedValue, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    }
    setFlipped(!flipped);
  };

  return (
    <TouchableWithoutFeedback onPress={flipCard}>
      <View style={styles.container}>
        {/* Fața cardului */}
        <Animated.View
          style={[
            styles.card,
            { transform: [{ rotateY: frontInterpolate }], borderColor: colors.primaryButton, shadowColor: theme === 'dark' ? '#000' : '#000' },
          ]}
        >
          <LinearGradient
            colors={theme === 'dark' ? ["#1c1c1c", "#333300", "#000"] : ["#F5F5F5", "#FFEE00", "#FFFFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Colț stânga sus: procent */}
            <View style={[styles.corner, { backgroundColor: colors.primaryButton }]}>
              <Text style={styles.discountText}>{`${discountValue}%`}</Text>
            </View>

            {/* Logo Volta dreapta sus */}
            <View style={styles.logoContainer}>
              {logo && (
                <Image source={logo} style={styles.logo} resizeMode="contain" />
              )}
              {!logo && <Text style={[styles.logoText, { color: colors.text }]}>VOLTA</Text>}
            </View>

            {/* Nume jos */}
            <View style={styles.nameContainer}>
              <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Spatele cardului */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ rotateY: backInterpolate }],
              position: "absolute",
              top: 0,
              borderColor: colors.primaryButton,
            },
          ]}
        >
          <View style={[styles.backCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.barcodeText, { color: colors.text }]}>{cardCode}</Text>
            <View style={styles.barcodeContainer}>
              {/* Linii barcode */}
              {Array.from({ length: 40 }).map((_, i) => {
                const barWidth = Math.random() > 0.5 ? 2 : 3;
                return (
                  <View
                    key={i}
                    style={{
                      width: barWidth,
                      height: 80,
                      backgroundColor: colors.text,
                      marginRight: 2,
                    }}
                  />
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
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
    borderRadius: 16,
    borderWidth: 1,
    backfaceVisibility: "hidden",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
  },
  corner: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  logoContainer: {
    position: "absolute",
    top: 12,
    right: 16,
    alignItems: "flex-end",
  },
  logo: {
    width: 80,
    height: 32,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  nameContainer: {
    position: "absolute",
    bottom: 12,
    right: 16,
    alignItems: "flex-end",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 1,
  },
  backCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  barcodeText: {
    position: "absolute",
    top: 16,
    fontSize: 12,
  },
  barcodeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginTop: 40,
  },
});

export default DiscountCard;
