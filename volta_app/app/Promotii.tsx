import React, { useEffect, useState, useContext, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Animated 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { ThemeContext } from './context/ThemeContext';
import Screen from './components/Screen';
import { getColors } from './components/theme';
import { apiClient } from '../lib/apiClient';
import { useResponsive, responsiveSize, responsiveWidth, responsiveHeight } from './hooks/useResponsive';

type Promo = { 
  id: string; 
  title: string; 
  image: string; 
  deadline: string; 
  link?: string;
  created_at: string;
};

export default function Promotii() {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const { width, height, isSmallScreen, scale } = useResponsive();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [timers, setTimers] = useState<Record<string, { days: number; hours: number; minutes: number; expired: boolean; expiredDays: number }>>({});
  const [loading, setLoading] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  const ITEM_HEIGHT = useMemo(() => Math.round(responsiveHeight(28)), [height]);

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

  const fetchPromos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await apiClient.getPromotions();

      if (error) throw new Error(error);
      
      // Map image_url to image for compatibility and include link
      const mappedData = (data || []).map((promo: any) => ({
        ...promo,
        image: promo.image_url || promo.image,
        link: promo.link,
      }));
      
      console.log('[Promotii] Promoții primite:', mappedData);
      console.log('[Promotii] Image URLs:', mappedData.map((p: any) => p.image || p.image_url));

      // Filter out promotions expired more than 1 day ago and sort active ones first
      const now = Date.now();
      const filteredAndSorted = mappedData
        .filter((promo) => {
          const deadlineTime = new Date(promo.deadline).getTime();
          const isExpired = deadlineTime <= now;
          if (!isExpired) return true; // Keep active promotions
          const expiredDays = Math.floor((now - deadlineTime) / (1000 * 60 * 60 * 24));
          return expiredDays < 1; // Keep expired only if less than 1 day
        })
        .sort((a, b) => {
          const aDeadline = new Date(a.deadline).getTime();
          const bDeadline = new Date(b.deadline).getTime();
          const aExpired = aDeadline <= now;
          const bExpired = bDeadline <= now;
          
          // Active promotions first
          if (!aExpired && bExpired) return -1;
          if (aExpired && !bExpired) return 1;
          
          // If both active, sort by deadline (soonest first)
          if (!aExpired && !bExpired) {
            return aDeadline - bDeadline;
          }
          
          // If both expired, sort by created_at (newest first)
          const aCreated = new Date(a.created_at || 0).getTime();
          const bCreated = new Date(b.created_at || 0).getTime();
          return bCreated - aCreated;
        });
      
      // Calculate initial timers immediately
      const initialTimers: Record<string, { days: number; hours: number; minutes: number; expired: boolean; expiredDays: number }> = {};
      filteredAndSorted.forEach((promo) => {
        const deadlineTime = new Date(promo.deadline).getTime();
        const distance = deadlineTime - now;
        if (distance <= 0) {
          const expiredDays = Math.floor((now - deadlineTime) / (1000 * 60 * 60 * 24));
          initialTimers[promo.id] = { days: 0, hours: 0, minutes: 0, expired: true, expiredDays };
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          initialTimers[promo.id] = { days, hours, minutes, expired: false, expiredDays: 0 };
        }
      });
      
      setPromos(filteredAndSorted);
      setTimers(initialTimers);
    } catch (err) {
      console.error('Eroare la preluarea promoțiilor:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  useEffect(() => {
    if (promos.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const updated: Record<string, { days: number; hours: number; minutes: number; expired: boolean; expiredDays: number }> = {};
      const promosToKeep: Promo[] = [];
      
      promos.forEach((promo: Promo) => {
        const deadlineTime = new Date(promo.deadline).getTime();
        const distance = deadlineTime - now;
        if (distance <= 0) {
          // Calculate how many days ago it expired
          const expiredDays = Math.floor((now - deadlineTime) / (1000 * 60 * 60 * 24));
          // Only keep if expired less than 1 day ago
          if (expiredDays < 1) {
            updated[promo.id] = { days: 0, hours: 0, minutes: 0, expired: true, expiredDays };
            promosToKeep.push(promo);
          }
          // If expired more than 1 day, don't add to updated or promosToKeep (will be filtered out)
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          updated[promo.id] = { days, hours, minutes, expired: false, expiredDays: 0 };
          promosToKeep.push(promo);
        }
      });
      
      // Remove promotions expired more than 1 day
      if (promosToKeep.length !== promos.length) {
        setPromos(promosToKeep);
      }
      
      setTimers(updated as any);
    }, 1000);

    return () => clearInterval(interval);
  }, [promos]);

  const getImageUri = useCallback((promo: Promo) => {
    return promo.image || '';
  }, []);

  // Get responsive styles
  const responsiveStyles = useMemo(() => getStyles(isSmallScreen, scale, width), [isSmallScreen, scale, width]);
  
  // Promos are already filtered and sorted in fetchPromos, but we keep them sorted by timer updates
  const sortedPromos = useMemo(() => {
    const now = Date.now();
    return [...promos].sort((a, b) => {
      const aTimer = timers[a.id];
      const bTimer = timers[b.id];
      
      // If timers not yet calculated, use deadline directly
      const aExpired = aTimer?.expired ?? (new Date(a.deadline).getTime() <= now);
      const bExpired = bTimer?.expired ?? (new Date(b.deadline).getTime() <= now);
      
      // Active promotions first
      if (!aExpired && bExpired) return -1;
      if (aExpired && !bExpired) return 1;
      
      // If both active, sort by deadline (soonest first)
      if (!aExpired && !bExpired) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      
      // If both expired, sort by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [promos, timers]);

  return (
    <Screen>
      <View style={[responsiveStyles.container, { backgroundColor: colors.background }]}>

        {loading ? (
          <View style={responsiveStyles.loadingContainer}>
            <ActivityIndicator color={colors.text} size="large" />
            <Text style={[responsiveStyles.loadingText, { color: colors.text }]}>
              Se încarcă promoțiile...
            </Text>
          </View>
        ) : promos.length === 0 ? (
          <View style={responsiveStyles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={64} color={colors.textMuted} />
            <Text style={[responsiveStyles.emptyText, { color: colors.textMuted }]}>
              Momentan nu există promoții active.
            </Text>
          </View>
        ) : promos.length > 0 && promos.some(p => !timers[p.id]) ? (
          <View style={responsiveStyles.loadingContainer}>
            <ActivityIndicator color={colors.text} size="large" />
            <Text style={[responsiveStyles.loadingText, { color: colors.text }]}>
              Se încarcă promoțiile...
            </Text>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ScrollView 
              contentContainerStyle={responsiveStyles.list} 
              showsVerticalScrollIndicator={false}
            >
              {sortedPromos.map((p, index) => {
                const imageUri = getImageUri(p);
                const timeLeft = timers[p.id];
                const isExpired = timeLeft?.expired || false;
                
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      responsiveStyles.card,
                      { 
                        height: ITEM_HEIGHT, 
                        marginBottom: index < sortedPromos.length - 1 ? 20 : 0,
                      }
                    ]}
                    activeOpacity={0.85}
                    onPress={async () => {
                      if (p.link) {
                        try {
                          await openBrowserAsync(p.link, {
                            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
                          });
                        } catch (error) {
                          console.error('Eroare la deschiderea linkului:', error);
                        }
                      } else {
                        router.push({ 
                          pathname: "/Promotii/[id]", 
                          params: { id: String(p.id) } 
                        } as any);
                      }
                    }}
                  >
                    <View style={styles.imageContainer}>
                      {imageUri ? (
                        <Image 
                          source={{ uri: imageUri }} 
                          style={styles.image}
                          resizeMode="cover"
                          onError={(error) => {
                            console.error('[Promotii] Eroare la încărcarea imaginii:', imageUri, error.nativeEvent.error);
                          }}
                          onLoad={(e) => {
                            const { width: imgWidth, height: imgHeight } = e.nativeEvent.source;
                            console.log('[Promotii] Imagine încărcată cu succes:', imageUri);
                            console.log('[Promotii] Dimensiuni imagine sursă:', imgWidth, 'x', imgHeight);
                            console.log('[Promotii] Dimensiuni container:', ITEM_HEIGHT);
                          }}
                          onLoadStart={() => {
                            console.log('[Promotii] Începe încărcarea imaginii:', imageUri);
                          }}
                        />
                      ) : (
                        <View style={[styles.image, styles.imagePlaceholder]}>
                          <Ionicons name="image-outline" size={48} color={colors.textMuted} />
                        </View>
                      )}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.5)']}
                        style={styles.imageGradient}
                      />
                    </View>
                    
                    {/* Badge pentru promoții active */}
                    {!isExpired && (
                      <View style={responsiveStyles.activeBadge}>
                        <View style={responsiveStyles.activeBadgeInner}>
                          <Text style={responsiveStyles.activeBadgeText}>ACTIVĂ</Text>
                        </View>
                      </View>
                    )}
                    
                    {/* Gray mask for expired promotions */}
                    {isExpired && (
                      <View style={styles.expiredMask} />
                    )}
                    
                    <View style={responsiveStyles.timerWrap}>
                      {!isExpired && timeLeft ? (
                        <LinearGradient
                          colors={['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.8)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={responsiveStyles.timerBubble}
                        >
                          <View style={responsiveStyles.timerIconWrapper}>
                            <Ionicons name="time-outline" size={18} color="#FFEE00" />
                          </View>
                          <View style={styles.timerContent}>
                            <Text style={responsiveStyles.timerLabel}>timp rămas</Text>
                            <View style={styles.timerValueRow}>
                              {timeLeft.days > 0 && (
                                <>
                                  <Text style={responsiveStyles.timerNumber}>{timeLeft.days}</Text>
                                  <Text style={responsiveStyles.timerUnit}>z</Text>
                                  <View style={responsiveStyles.timerSeparator} />
                                </>
                              )}
                              <Text style={responsiveStyles.timerNumber}>{String(timeLeft.hours).padStart(2, '0')}</Text>
                              <Text style={responsiveStyles.timerUnit}>h</Text>
                              <View style={responsiveStyles.timerSeparator} />
                              <Text style={responsiveStyles.timerNumber}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
                              <Text style={responsiveStyles.timerUnit}>m</Text>
                            </View>
                          </View>
                        </LinearGradient>
                      ) : (
                        <View style={responsiveStyles.expiredBubble}>
                          <View style={responsiveStyles.timerIconWrapperExpired}>
                            <Ionicons name="time-outline" size={16} color="#999" />
                          </View>
                          <View style={styles.timerContent}>
                            <Text style={responsiveStyles.timerLabelExpired}>promoție</Text>
                            <Text style={responsiveStyles.timerValueExpired}>expirată</Text>
                          </View>
                        </View>
                      )}
                    </View>
                    
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.9)']}
                      style={styles.overlay}
                    >
                      <View style={responsiveStyles.overlayContent}>
                        <Text 
                          style={[
                            responsiveStyles.cardTitle,
                            isExpired && responsiveStyles.cardTitleExpired
                          ]} 
                          numberOfLines={2}
                        >
                          {p.title}
                        </Text>
                      </View>
                    </LinearGradient>
                    
                    {/* Arrow button in bottom right */}
                    <View style={responsiveStyles.arrowButton}>
                      <Ionicons name="arrow-forward-circle" size={32} color={isExpired ? '#999' : '#FFEE00'} />
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 12 }} />
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}

// Create responsive styles function
const getStyles = (isSmallScreen: boolean, scale: number, width: number) => StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    paddingHorizontal: responsiveWidth(5),
    paddingTop: responsiveSize(12, scale),
    paddingBottom: responsiveSize(12, scale),
  },
  list: { 
    paddingHorizontal: responsiveSize(8, scale),
    paddingTop: responsiveSize(20, scale),
    paddingBottom: responsiveSize(20, scale),
  },
  title: { 
    fontSize: isSmallScreen ? responsiveSize(28, scale) : responsiveSize(32, scale),
    fontWeight: '800',
    marginBottom: responsiveSize(4, scale),
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: isSmallScreen ? responsiveSize(14, scale) : responsiveSize(15, scale),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveHeight(8),
  },
  loadingText: {
    marginTop: responsiveSize(12, scale),
    fontSize: responsiveSize(14, scale),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveHeight(8),
    paddingHorizontal: responsiveWidth(10),
  },
  emptyText: {
    marginTop: responsiveSize(16, scale),
    fontSize: responsiveSize(15, scale),
    textAlign: 'center',
    lineHeight: responsiveSize(22, scale),
  },
  card: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: responsiveSize(20, scale),
    overflow: 'hidden',
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    marginHorizontal: 0,
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  imagePlaceholder: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    zIndex: 2,
  },
  activeBadge: {
    position: 'absolute',
    top: responsiveSize(12, scale),
    right: responsiveSize(12, scale),
    zIndex: 25,
  },
  activeBadgeInner: {
    backgroundColor: '#333',
    paddingHorizontal: responsiveSize(8, scale),
    paddingVertical: responsiveSize(5, scale),
    borderRadius: responsiveSize(10, scale),
    borderWidth: 1.5,
    borderColor: '#FFEE00',
  },
  activeBadgeText: {
    color: '#FFEE00',
    fontSize: responsiveSize(9, scale),
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  expiredMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(100, 100, 100, 0.6)',
    zIndex: 10,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    justifyContent: 'flex-end',
  },
  overlayContent: {
    padding: responsiveSize(16, scale),
    paddingBottom: responsiveSize(20, scale),
  },
  arrowButton: {
    position: 'absolute',
    bottom: responsiveSize(16, scale),
    right: responsiveSize(16, scale),
    zIndex: 30,
  },
  cardTitle: { 
    color: '#FFEE00', 
    fontSize: isSmallScreen ? responsiveSize(22, scale) : responsiveSize(24, scale), 
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    lineHeight: responsiveSize(30, scale),
    letterSpacing: 0.3,
  },
  cardTitleExpired: {
    color: '#999',
  },
  timerWrap: { 
    position: 'absolute', 
    top: responsiveSize(12, scale),
    left: responsiveSize(12, scale),
    zIndex: 20,
    maxWidth: width - responsiveSize(48, scale),
  },
  timerBubble: { 
    paddingHorizontal: responsiveSize(12, scale), 
    paddingVertical: responsiveSize(10, scale), 
    borderRadius: responsiveSize(14, scale),
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSize(10, scale),
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 238, 0, 0.4)',
    overflow: 'hidden',
  },
  timerIconWrapper: {
    width: responsiveSize(28, scale),
    height: responsiveSize(28, scale),
    borderRadius: responsiveSize(14, scale),
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFEE00',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  expiredBubble: {
    paddingHorizontal: responsiveSize(12, scale),
    paddingVertical: responsiveSize(10, scale),
    borderRadius: responsiveSize(14, scale),
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSize(10, scale),
    backgroundColor: 'rgba(100, 100, 100, 0.85)',
    borderWidth: 2,
    borderColor: 'rgba(153, 153, 153, 0.4)',
  },
  timerIconWrapperExpired: {
    width: responsiveSize(28, scale),
    height: responsiveSize(28, scale),
    borderRadius: responsiveSize(14, scale),
    backgroundColor: 'rgba(153, 153, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(153, 153, 153, 0.5)',
  },
  timerContent: {
    flexDirection: 'column',
    gap: 2,
  },
  timerValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  timerNumber: {
    color: '#FFEE00', 
    fontWeight: '900',
    fontSize: responsiveSize(15, scale),
    letterSpacing: 0,
    lineHeight: responsiveSize(18, scale),
    textShadowColor: 'rgba(255, 238, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  timerUnit: {
    color: 'rgba(255, 238, 0, 0.8)', 
    fontWeight: '700',
    fontSize: responsiveSize(11, scale),
    letterSpacing: 0.5,
    marginRight: responsiveSize(1, scale),
  },
  timerSeparator: {
    width: 1,
    height: responsiveSize(10, scale),
    backgroundColor: 'rgba(255, 238, 0, 0.3)',
    marginHorizontal: responsiveSize(3, scale),
    alignSelf: 'center',
  },
  timerLabel: {
    color: 'rgba(255, 238, 0, 0.65)', 
    fontWeight: '600',
    fontSize: responsiveSize(8, scale),
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: responsiveSize(1, scale),
  },
  timerLabelExpired: {
    color: 'rgba(153, 153, 153, 0.6)', 
    fontWeight: '600',
    fontSize: responsiveSize(8, scale),
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: responsiveSize(1, scale),
  },
  timerValueExpired: {
    color: '#999', 
    fontWeight: '800',
    fontSize: responsiveSize(12, scale),
    letterSpacing: 0.5,
  },
});

// Static styles that don't need responsive values
const styles = StyleSheet.create({
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  imagePlaceholder: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    zIndex: 2,
  },
  expiredMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(100, 100, 100, 0.6)',
    zIndex: 15,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  timerContent: {
    flexDirection: 'column',
    gap: 2,
  },
  timerValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
});
