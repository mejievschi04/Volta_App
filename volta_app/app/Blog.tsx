import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { typography, getColors } from "./_components/theme";
import { ThemeContext } from "./_context/ThemeContext";
import { useRouter } from "expo-router";
import { apiClient, resolveImageUrl } from "../lib/apiClient";
import Screen from "./_components/Screen";
import EmptyState from "./_components/EmptyState";

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

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
        const processed = data.map((item) => ({
          ...item,
          excerpt:
            item.content?.slice(0, 100).trim() +
            (item.content?.length > 100 ? "..." : ""),
          date: new Date(item.created_at).toLocaleDateString('ro-RO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
        }));
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.text} size="large" />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Se încarcă articolele...
            </Text>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ScrollView
              contentContainerStyle={styles.scroll}
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
                      styles.card,
                      { 
                        marginBottom: index < posts.length - 1 ? 20 : 0,
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
                    <View style={styles.imageContainer}>
                      {p.image_url ? (
                        <Image 
                          source={{ uri: resolveImageUrl(p.image_url) ?? '' }} 
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.cardImage, styles.imagePlaceholder]}>
                          <Ionicons name="image-outline" size={40} color={colors.textMuted} />
                        </View>
                      )}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.4)']}
                        style={styles.imageGradient}
                      />
                    </View>
                    <View style={[styles.cardBody, { backgroundColor: colors.surface }]}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.categoryBadge, { backgroundColor: '#333' }]}>
                          <Text style={[styles.categoryText, { color: colors.primaryButton }]}>
                            Blog
                          </Text>
                        </View>
                        <View style={styles.dateRow}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.date, { color: colors.textMuted }]}>
                            {p.date}
                          </Text>
                        </View>
                      </View>
                      <Text 
                        style={[styles.title, { color: colors.text }]} 
                        numberOfLines={2}
                      >
                        {p.title}
                      </Text>
                      <Text 
                        style={[styles.excerpt, { color: colors.textMuted }]} 
                        numberOfLines={3}
                      >
                        {p.excerpt}
                      </Text>
                      <View style={styles.cardFooter}>
                        <View style={[styles.readMoreContainer, { backgroundColor: '#333' }]}>
                          <Text style={[styles.readMore, { color: colors.primaryButton }]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  scroll: {
    paddingHorizontal: 0,
    paddingTop: 20,
    paddingBottom: 100,
  },
  headerText: {
    fontSize: isSmallScreen ? 28 : 32,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: isSmallScreen ? 14 : 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    textAlign: "center",
  },
  card: {
    width: '100%',
    backgroundColor: "transparent",
    borderRadius: 0,
    overflow: "hidden",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    overflow: 'hidden',
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: '#1a1a1a',
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#1a1a1a',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  cardBody: {
    padding: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: isSmallScreen ? 20 : 22,
    fontWeight: "800",
    marginBottom: 10,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  excerpt: {
    fontSize: isSmallScreen ? 15 : 16,
    lineHeight: 24,
    marginBottom: 16,
    letterSpacing: 0.1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  readMore: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
  },
});
