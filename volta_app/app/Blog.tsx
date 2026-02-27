import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Animated,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { typography, getColors } from "./_components/theme";
import { ThemeContext } from "./_context/ThemeContext";
import { useRouter } from "expo-router";
import { apiClient, resolveImageUrl } from "../lib/apiClient";
import Screen from "./_components/Screen";
import EmptyState from "./_components/EmptyState";
import { useBottomMenuInset } from "./_hooks/useBottomMenuInset";
import { useResponsive, responsiveSize } from "./_hooks/useResponsive";

interface BlogPost {
  id: number;
  title: string;
  excerpt?: string;
  content: string;
  date?: string;
  image_url?: string;
  author?: string;
  created_at?: string;
}

export default function Blog() {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchBlogPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.getBlogPosts();

      if (error) {
        console.error("Eroare la citirea blogurilor:", error);
      } else if (data) {
        const raw = (Array.isArray(data) ? data : []) as Array<{ content?: string; created_at?: string; [key: string]: unknown }>;
        const processed = raw.map((item) => ({
          ...item,
          excerpt:
            (item.content ?? '').slice(0, 100).trim() +
            ((item.content ?? '').length > 100 ? "..." : ""),
          date: item.created_at
            ? new Date(item.created_at as string).toLocaleDateString('ro-RO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : '',
        })) as BlogPost[];
        setPosts(processed);
      }
    } catch (error) {
      console.error("Eroare:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlogPosts();
  }, [fetchBlogPosts]);

  return (
    <Screen>
      <View style={[responsiveStyles.container, { backgroundColor: colors.background }]}>

        {loading ? (
          <View style={responsiveStyles.loadingContainer}>
            <ActivityIndicator color={colors.text} size="large" />
            <Text style={[responsiveStyles.loadingText, { color: colors.text }]}>
              Se încarcă articolele...
            </Text>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ScrollView
              contentContainerStyle={[responsiveStyles.scroll, { paddingBottom: bottomInsetForMenu + 24 }]}
              showsVerticalScrollIndicator={false}
            >
              {posts.length === 0 ? (
                <EmptyState
                  icon="newspaper-outline"
                  title="Nu există articole momentan."
                  style={{ marginTop: 60 }}
                />
              ) : (
                posts.map((p, index) => (
                  <Pressable
                    key={p.id}
                    style={[
                      responsiveStyles.card,
                      { 
                        marginBottom: index < posts.length - 1 ? responsiveSize(20, scale) : 0,
                      }
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "./blog/[id]",
                        params: { id: p.id },
                      })
                    }
                    android_ripple={{ color: 'rgba(255,238,0,0.1)' }}
                  >
                    <View style={responsiveStyles.imageContainer}>
                      {p.image_url ? (
                        <Image 
                          source={{ uri: resolveImageUrl(p.image_url) ?? '' }} 
                          style={responsiveStyles.cardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[responsiveStyles.cardImage, responsiveStyles.imagePlaceholder]}>
                          <Ionicons name="image-outline" size={40} color={colors.textMuted} />
                        </View>
                      )}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.4)']}
                        style={responsiveStyles.imageGradient}
                      />
                    </View>
                    <View style={[responsiveStyles.cardBody, { backgroundColor: colors.surface }]}>
                      <View style={responsiveStyles.cardHeader}>
                        <View style={[responsiveStyles.categoryBadge, { backgroundColor: '#333' }]}>
                          <Text style={[responsiveStyles.categoryText, { color: colors.primaryButton }]}>
                            Blog
                          </Text>
                        </View>
                        <View style={responsiveStyles.dateRow}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                          <Text style={[responsiveStyles.date, { color: colors.textMuted }]}>
                            {p.date}
                          </Text>
                        </View>
                      </View>
                      <Text 
                        style={[responsiveStyles.title, { color: colors.text }]} 
                        numberOfLines={2}
                      >
                        {p.title}
                      </Text>
                      <Text 
                        style={[responsiveStyles.excerpt, { color: colors.textMuted }]} 
                        numberOfLines={3}
                      >
                        {p.excerpt}
                      </Text>
                      <View style={responsiveStyles.cardFooter}>
                        <View style={[responsiveStyles.readMoreContainer, { backgroundColor: '#333' }]}>
                          <Text style={[responsiveStyles.readMore, { color: colors.primaryButton }]}>
                            Citește mai mult
                          </Text>
                          <Ionicons name="arrow-forward" size={16} color={colors.primaryButton} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
              <View style={{ height: 80 }} />
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}

function getStyles(isSmallScreen: boolean, scale: number): {
  container: ViewStyle;
  header: ViewStyle;
  scroll: ViewStyle;
  headerText: TextStyle;
  subtitle: TextStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
  card: ViewStyle;
  imageContainer: ViewStyle;
  cardImage: ImageStyle;
  imagePlaceholder: ViewStyle;
  imageGradient: ViewStyle;
  cardBody: ViewStyle;
  cardHeader: ViewStyle;
  categoryBadge: ViewStyle;
  categoryText: TextStyle;
  title: TextStyle;
  excerpt: TextStyle;
  cardFooter: ViewStyle;
  readMoreContainer: ViewStyle;
  readMore: TextStyle;
  dateRow: ViewStyle;
  date: TextStyle;
} {
  return {
    container: { flex: 1 },
    header: {
      paddingHorizontal: responsiveSize(20, scale),
      paddingTop: responsiveSize(20, scale),
      paddingBottom: responsiveSize(16, scale),
    },
    scroll: {
      paddingHorizontal: 0,
      paddingTop: responsiveSize(20, scale),
      paddingBottom: 100,
    },
    headerText: {
      fontSize: responsiveSize(isSmallScreen ? 28 : 32, scale),
      fontWeight: '800' as const,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: responsiveSize(isSmallScreen ? 14 : 15, scale),
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      marginTop: responsiveSize(60, scale),
    },
    loadingText: {
      marginTop: responsiveSize(12, scale),
      fontSize: responsiveSize(14, scale),
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      marginTop: responsiveSize(60, scale),
      paddingHorizontal: responsiveSize(40, scale),
    },
    emptyText: {
      marginTop: responsiveSize(16, scale),
      fontSize: responsiveSize(15, scale),
      textAlign: "center" as const,
    },
    card: {
      width: '100%',
      backgroundColor: "transparent",
      borderRadius: 0,
      overflow: "hidden" as const,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    imageContainer: {
      position: 'relative' as const,
      width: '100%',
      height: responsiveSize(220, scale),
      overflow: 'hidden' as const,
    },
    cardImage: {
      width: "100%",
      height: "100%",
      backgroundColor: '#1a1a1a',
    },
    imagePlaceholder: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: '#1a1a1a',
    },
    imageGradient: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: '40%',
    },
    cardBody: {
      padding: responsiveSize(20, scale),
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    cardHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between',
      marginBottom: responsiveSize(12, scale),
    },
    categoryBadge: {
      paddingHorizontal: responsiveSize(10, scale),
      paddingVertical: responsiveSize(4, scale),
      borderRadius: responsiveSize(12, scale),
    },
    categoryText: {
      fontSize: responsiveSize(11, scale),
      fontWeight: '700' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    title: {
      fontSize: responsiveSize(isSmallScreen ? 20 : 22, scale),
      fontWeight: "800" as const,
      marginBottom: responsiveSize(10, scale),
      lineHeight: responsiveSize(28, scale),
      letterSpacing: 0.2,
    },
    excerpt: {
      fontSize: responsiveSize(isSmallScreen ? 15 : 16, scale),
      lineHeight: responsiveSize(24, scale),
      marginBottom: responsiveSize(16, scale),
      letterSpacing: 0.1,
    },
    cardFooter: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
    },
    readMoreContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: responsiveSize(14, scale),
      paddingVertical: responsiveSize(8, scale),
      borderRadius: responsiveSize(20, scale),
      gap: responsiveSize(6, scale),
    },
    readMore: {
      fontSize: responsiveSize(13, scale),
      fontWeight: '700' as const,
      letterSpacing: 0.3,
    },
    dateRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: responsiveSize(6, scale),
    },
    date: {
      fontSize: responsiveSize(12, scale),
      fontWeight: '600' as const,
    },
  };
}
