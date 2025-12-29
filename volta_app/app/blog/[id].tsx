import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../context/ThemeContext";
import { getColors } from "../components/theme";
import { apiClient } from "../../lib/apiClient";
import Screen from "../components/Screen";

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

interface BlogPost {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  author?: string;
  created_at?: string;
}

export default function BlogDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchPost();
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const postId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(postId)) {
        console.error("ID invalid:", id);
        setLoading(false);
        return;
      }
      
      const { data, error } = await apiClient.getBlogPost(postId);

      if (error) {
        console.error("Eroare la citirea articolului:", error);
        setPost(null);
      } else if (data) {
        setPost(data);
      }
    } catch (err) {
      console.error("Eroare:", err);
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={[styles.loader, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.text} size="large" />
          <Text style={{ color: colors.text, marginTop: 8, fontSize: 16 }}>Se încarcă...</Text>
        </View>
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Articolul nu a fost găsit.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#FFEE00', '#FFEE00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.backBtnGradient}
            >
              <Ionicons name="arrow-back" size={20} color="#000" />
              <Text style={styles.backText}>Înapoi</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const formattedDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString('ro-RO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  return (
    <Screen>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {post.image_url && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: post.image_url }} 
              style={styles.image}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={styles.imageGradient}
            />
          </View>
        )}

        <View style={styles.contentWrapper}>
          <View style={[styles.categoryBadge, { backgroundColor: '#333' }]}>
            <Text style={[styles.categoryText, { color: colors.primaryButton }]}>
              Blog
            </Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>

          <View style={styles.metaContainer}>
            {post.author && (
              <View style={[styles.metaItem, { backgroundColor: colors.surface }]}>
                <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {post.author}
                </Text>
              </View>
            )}
            {formattedDate && (
              <View style={[styles.metaItem, { backgroundColor: colors.surface }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {formattedDate}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.content, { color: colors.text }]}>
            {post.content}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#FFEE00', '#FFD700']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.backBtnGradient}
          >
            <Ionicons name="arrow-back" size={20} color="#000" />
            <Text style={styles.backText}>Înapoi la articole</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    overflow: 'hidden',
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  contentWrapper: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: isSmallScreen ? 26 : 30,
    fontWeight: "800",
    marginBottom: 20,
    lineHeight: 38,
    letterSpacing: 0.3,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  meta: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginBottom: 28,
  },
  content: {
    fontSize: isSmallScreen ? 17 : 18,
    lineHeight: 28,
    marginBottom: 32,
    letterSpacing: 0.2,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    marginBottom: 24,
  },
  backBtn: {
    marginHorizontal: 20,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  backText: {
    color: "#000",
    fontWeight: "700",
    fontSize: isSmallScreen ? 15 : 16,
    letterSpacing: 0.5,
  },
});
