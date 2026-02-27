import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Dimensions, TouchableOpacity, ScrollView, Linking, Platform, Animated, Image, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from './_components/Screen';
import { getColors, typography } from './_components/theme';
import { ThemeContext } from './_context/ThemeContext';
import { useResponsive, responsiveSize } from './_hooks/useResponsive';
import { useBottomMenuInset } from './_hooks/useBottomMenuInset';

const voltaLogo = require('../assets/icons/Volta Logo 2@300x 1.png');

const stores = [
  { id: 1, name: 'Service Centru', latitude: 47.019253274004505, longitude: 28.864151533617296, hours: 'Luni - Vineri: 09:00 - 18:00\nSâmbătă: 09:00 - 15:00\nDuminică nu se lucrează', phone: '+37360123456' },
  { id: 2, name: 'Volta 1', latitude: 46.980650614582785, longitude: 28.890921593605434, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123457' },
  { id: 3, name: 'Volta 2 "Tools"', latitude: 46.99577603566025, longitude: 28.90237267409418, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123458' },
  { id: 4, name: 'Volta 3', latitude: 47.015576198461154, longitude: 28.873610152122808, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123459' },
  { id: 5, name: 'Volta 4', latitude: 47.05245166859262, longitude: 28.85054384711143, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123460' },
  { id: 6, name: 'Volta 5', latitude: 47.042002129366495, longitude: 28.798525077797365, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123461' },
  { id: 7, name: 'Volta 6', latitude: 46.99437774555062, longitude: 28.81509673970665, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123462' },
  { id: 8, name: 'Volta 7', latitude: 46.83412784551735, longitude: 28.610163620117056, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123463' },
];

export default function Harta() {
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const { width, height, scale, isSmallScreen } = useResponsive();
  const bottomInsetForMenu = useBottomMenuInset();
  const [location, setLocation] = useState<any>(null);
  const [nearest, setNearest] = useState<any>(null);
  const [distances, setDistances] = useState<Record<number, number>>({});
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const mapRef = useRef<MapView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const responsiveLayout = useMemo(() => {
    const storesStripHeight = responsiveSize(12, scale) + responsiveSize(56, scale) + responsiveSize(12, scale);
    const storeButtonWidth = (width - responsiveSize(48, scale)) / 2.2;
    const mapButtonsBottom = bottomInsetForMenu + storesStripHeight + responsiveSize(18, scale);
    const storesMenuBottom = Math.max(0, bottomInsetForMenu - responsiveSize(24, scale));
    return { storesStripHeight, storeButtonWidth, mapButtonsBottom, storesMenuBottom };
  }, [width, scale, bottomInsetForMenu]);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 0,
      paddingBottom: 0,
    },
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Locație', 'Permisiunea pentru locație este necesară pentru a afișa magazinele apropiate.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      const nearestStore = getNearestStore(loc.coords, stores);
      setNearest(nearestStore);
    })();
  }, []);

  useEffect(() => {
    if (!location) return;
    const map: Record<number, number> = {};
    for (const s of stores) {
      map[s.id] = getDistance(location.latitude, location.longitude, s.latitude, s.longitude);
    }
    setDistances(map);
  }, [location]);

  useEffect(() => {
    if (!showInfoPanel) {
      slideAnim.setValue(0);
    }
  }, [showInfoPanel]);

  // useMemo trebuie să fie apelat ÎNTOTDEAUNA, înainte de orice return condițional
  const sortedStores = useMemo(() => {
    // Dacă nu avem distanțe, returnăm ordinea originală
    const withDist = stores.map((s) => ({
      ...s,
      distance: distances[s.id] ?? null,
    }));
    // sortare: cele cu distanță cunoscută crescător, apoi cele fără
    return withDist.sort((a: any, b: any) => {
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
  }, [distances]);

  if (!location)
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primaryButton} />
        <Text style={{ color: colors.text, marginTop: 10 }}>Se obține locația ta...</Text>
      </View>
    );

  const centerToUser = () => {
    mapRef.current?.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  const goToStore = (store: any) => {
    mapRef.current?.animateToRegion({
      latitude: store.latitude,
      longitude: store.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
    setSelectedStoreId(store.id);
  };

  const openNavigation = (store: any) => {
    const { latitude, longitude, name } = store;
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}&dirflg=d`,
      android: `google.navigation:q=${latitude},${longitude}`,
    });

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback la Google Maps web sau Apple Maps
          const fallbackUrl = Platform.select({
            ios: `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
            android: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
          });
          if (fallbackUrl) {
            Linking.openURL(fallbackUrl);
          }
        }
      }).catch(() => {
        // Fallback final
        const fallbackUrl = Platform.select({
          ios: `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
          android: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        });
        if (fallbackUrl) {
          Linking.openURL(fallbackUrl);
        }
      });
    }
  };

  // Calculează interpolările pentru animație (întotdeauna, nu condițional)
  const panelWidth = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [120, width - 32], // De la lățimea butonului la lățimea completă
  });
  const panelHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 200],
  });
  const panelOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1],
  });
  const contentOpacity = slideAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1], // Conținutul apare când panoul se deschide
  });
  const badgeTextOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0], // Textul butonului dispare
  });

  return (
    <Screen padded={false} fullBleedTop>
      <View style={[styles.container, dynamicStyles.container]}>
      {/* Badge Info / Panou Info - apare doar când există magazin selectat */}
      {selectedStoreId && (
        <Animated.View
          style={[
            styles.infoBadgeContainer,
            {
              backgroundColor: colors.primaryButton,
              width: panelWidth,
              height: panelHeight,
              top: insets.top + 16,
              left: 16,
              opacity: panelOpacity,
              borderColor: showInfoPanel ? 'rgba(0,0,0,0.12)' : 'rgba(255, 238, 0, 0.3)',
              shadowColor: '#000',
            },
          ]}
        >
          {!showInfoPanel ? (
            <TouchableOpacity 
              style={styles.infoBadgeButton}
              onPress={() => {
                setShowInfoPanel(true);
                Animated.spring(slideAnim, {
                  toValue: 1,
                  useNativeDriver: false,
                  tension: 50,
                  friction: 7,
                }).start();
              }}
            >
              <Animated.View style={{ opacity: badgeTextOpacity, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="information-circle" size={20} color="#000" />
                <Text style={[styles.badgeText, { color: '#000' }]}>Info</Text>
              </Animated.View>
            </TouchableOpacity>
          ) : null}
        
        {/* Conținutul panoului */}
        {showInfoPanel && (
          <Animated.View
            style={[
              styles.infoPanelContentWrapper,
              {
                opacity: contentOpacity,
              }
            ]}
          >
            {(() => {
              // Dacă există un magazin selectat, afișează informațiile despre el
              if (selectedStoreId) {
                const selectedStore = stores.find(s => s.id === selectedStoreId);
                if (!selectedStore) return null;
                
                return (
                  <View style={styles.infoPanelInner}>
                    <View style={[styles.infoPanelHeader, { borderBottomColor: 'rgba(0,0,0,0.15)' }]}>
                      <View style={styles.infoPanelHeaderLeft}>
                        <View style={[styles.infoPanelIconWrap, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                          <Ionicons name="location" size={18} color="#333" />
                        </View>
                        <Text style={[styles.infoPanelTitle, { color: '#333' }]} numberOfLines={1}>
                          {selectedStore.name}
                        </Text>
                      </View>
                        <TouchableOpacity
                        onPress={() => {
                          Animated.spring(slideAnim, {
                            toValue: 0,
                            useNativeDriver: false,
                            tension: 50,
                            friction: 7,
                          }).start(() => {
                            setShowInfoPanel(false);
                          });
                        }}
                        style={[styles.infoPanelClose, { backgroundColor: 'rgba(0,0,0,0.08)' }]}
                      >
                        <Ionicons name="close" size={22} color="#333" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.infoPanelCompactContent}>
                      <View style={styles.infoPanelSection}>
                        <View style={styles.infoPanelRow}>
                          <View style={[styles.infoPanelIconWrap, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                            <Ionicons name="time-outline" size={18} color="#333" />
                          </View>
                          <Text style={[styles.infoPanelLabel, { color: '#555' }]}>Ore de lucru</Text>
                        </View>
                        <Text style={[styles.infoPanelStoreHours, { color: '#333' }]}>
                          {selectedStore.hours.split('\n').filter(line => !line.includes('Duminică nu se lucrează')).join('\n')}
                        </Text>
                      </View>
                      {selectedStore.phone && (
                        <View style={styles.infoPanelSection}>
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${selectedStore.phone}`)}
                            activeOpacity={0.7}
                            style={[styles.infoPanelRow, styles.infoPanelPhoneRow]}
                          >
                            <View style={[styles.infoPanelIconWrap, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                              <Ionicons name="call" size={18} color="#333" />
                            </View>
                            <Text style={[styles.infoPanelPhone, { color: '#333' }]}>
                              {selectedStore.phone}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              }
              
              // Dacă nu există magazin selectat, afișează lista tuturor magazinelor
              return (
                <View style={styles.infoPanelInner}>
                  <View style={[styles.infoPanelHeader, { borderBottomColor: 'rgba(0,0,0,0.15)' }]}>
                    <View style={styles.infoPanelHeaderLeft}>
                      <View style={[styles.infoPanelIconWrap, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                        <Ionicons name="information-circle" size={18} color="#333" />
                      </View>
                      <Text style={[styles.infoPanelTitle, { color: '#333' }]}>Informații magazine</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Animated.spring(slideAnim, {
                          toValue: 0,
                          useNativeDriver: false,
                          tension: 50,
                          friction: 7,
                        }).start(() => setShowInfoPanel(false));
                      }}
                      style={[styles.infoPanelClose, { backgroundColor: 'rgba(0,0,0,0.08)' }]}
                    >
                      <Ionicons name="close" size={22} color="#333" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.infoPanelCompactContent} showsVerticalScrollIndicator={false}>
                    {stores.map((store) => (
                      <View key={store.id} style={[styles.infoPanelStoreItem, { borderBottomColor: 'rgba(0,0,0,0.12)' }]}>
                        <Text style={[styles.infoPanelStoreName, { color: '#333' }]}>{store.name}</Text>
                        <Text style={[styles.infoPanelStoreHoursSmall, { color: '#555' }]}>{store.hours}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              );
            })()}
          </Animated.View>
        )}
        </Animated.View>
      )}

      {/* Hartă centrată */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          customMapStyle={isDark ? mapStyleDark : mapStyleLight}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsPointsOfInterest={false}
          showsBuildings={false}
          zoomControlEnabled={false}
          toolbarEnabled={false}
          showsCompass={false}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
          {sortedStores.map((store) => (
            <Marker
              key={store.id}
              coordinate={{ latitude: store.latitude, longitude: store.longitude }}
              title={store.name}
              description={store.name === 'Service Centru' ? 'Service Centru Volta' : (store.id === nearest?.id ? 'Cel mai apropiat magazin Volta' : 'Magazin Volta')}
              onPress={() => goToStore(store)}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.markerLogoBack, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.75)' }]}>
                  <Image source={voltaLogo} style={styles.markerLogo} resizeMode="contain" />
                </View>
              </View>
            </Marker>
          ))}
        </MapView>

        <TouchableOpacity 
          style={[
            styles.btnCenter, 
            { 
              backgroundColor: colors.primaryButton, 
              borderColor: colors.primaryButton,
              bottom: responsiveLayout.mapButtonsBottom,
            }
          ]} 
          onPress={centerToUser}
        >
          <Ionicons name="locate" size={22} color="#000" />
        </TouchableOpacity>

        {/* Buton Traseu - apare când un magazin este selectat */}
        {selectedStoreId && (() => {
          const selectedStore = stores.find(s => s.id === selectedStoreId);
          if (!selectedStore) return null;
          
          return (
            <TouchableOpacity
              style={[
                styles.btnRoute, 
                { 
                  backgroundColor: colors.primaryButton, 
                  borderColor: colors.primaryButton,
                  bottom: responsiveLayout.mapButtonsBottom,
                }
              ]}
              onPress={() => openNavigation(selectedStore)}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={22} color="#000" />
            </TouchableOpacity>
          );
        })()}

      </View>

      {/* Butoane magazine (fixat exact deasupra meniului principal) */}
      <View style={[styles.bottomArea, { bottom: responsiveLayout.storesMenuBottom, backgroundColor: isDark ? '#333' : '#FFFFFF' }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
        >
          {sortedStores.map((store) => (
            <TouchableOpacity
              key={store.id}
              style={[
                styles.storeButton,
                { width: responsiveLayout.storeButtonWidth },
                {
                  borderColor: isDark ? '#333' : '#333',
                  backgroundColor: isDark ? '#333' : '#FFFFFF',
                },
                selectedStoreId === store.id && { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
              ]}
              onPress={() => goToStore(store)}
            >
              <View style={styles.storeButtonContent}>
                <View style={styles.storeButtonRow}>
                  <Ionicons name="location" size={16} color={selectedStoreId === store.id ? '#000' : (isDark ? colors.primaryButton : '#333')} />
                  <Text style={[
                    styles.storeText,
                    { color: isDark ? '#fff' : '#000' },
                    selectedStoreId === store.id && styles.storeTextActive
                  ]} numberOfLines={1}>
                    {store.name.replace(' "Tools"', '')}
                  </Text>
                </View>
                <View style={[
                  styles.distancePill,
                  { backgroundColor: isDark ? '#333' : '#F5F5F5' },
                  selectedStoreId === store.id && styles.distancePillActive
                ]}>
                  <Text style={[
                    styles.distanceText,
                    { color: isDark ? '#FFEE00' : '#333' },
                    selectedStoreId === store.id && styles.distanceTextActive
                  ]}>
                    {(distances[store.id] ?? getDistance(location.latitude, location.longitude, store.latitude, store.longitude)).toFixed(1)} km
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      </View>
    </Screen>
  );
}

function getNearestStore(userCoords: any, stores: any[]) {
  const { latitude, longitude } = userCoords;
  let nearest = null;
  let minDist = Infinity;
  for (const store of stores) {
    const dist = getDistance(latitude, longitude, store.latitude, store.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...store, distance: dist };
    }
  }
  return nearest;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Stil hartă pentru dark theme
const mapStyleDark = [
  { elementType: 'geometry', stylers: [{ color: '#3d4550' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#ffee00' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#2d3338' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#4a5460' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#343d48' }] },
  // Ascunde POI-urile și punctele ce nu țin de rețea
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// Stil hartă pentru light theme (alb)
const mapStyleLight = [
  { elementType: 'geometry', stylers: [{ color: '#F5F6F8' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#333333' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#E8EAED' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#DADCE0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#D6E8F5' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#F0F2F5' }] },
  // Ascunde POI-urile și punctele ce nu țin de rețea
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
  },
  pageTitle: { ...typography.title, marginBottom: 8 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapWrapper: {
    flex: 1,
    width: '100%',
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
    marginHorizontal: 0,
    marginBottom: 0,
  },
  map: { width: '100%', height: '100%' },
  infoBadgeContainer: {
    position: 'absolute',
    borderRadius: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 238, 0, 0.3)',
    overflow: 'hidden',
  },
  infoBadgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    height: '100%',
  },
  badgeText: { fontWeight: '700', fontSize: 16 },
  infoPanelContentWrapper: {
    width: '100%',
    height: '100%',
    padding: 16,
  },
  infoPanelInner: {
    width: '100%',
    height: '100%',
  },
  btnCenter: {
    position: 'absolute',
    right: 12,
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 5,
  },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 12,
    zIndex: 999,
  },
  storeButton: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    // width set inline from responsiveLayout.storeButtonWidth
  },
  storeButtonContent: {
    flexDirection: 'column',
    gap: 4,
  },
  storeButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeText: { 
    fontSize: 14, 
    fontWeight: '600', 
    flex: 1,
  },
  storeTextActive: { color: '#000' },
  distancePill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distancePillActive: {
    backgroundColor: '#00000020',
  },
  distanceText: { fontSize: 12, fontWeight: '700' },
  distanceTextActive: { color: '#000', fontWeight: '700' },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  markerDotSelected: {
    backgroundColor: '#FFEE00',
    borderColor: '#000',
  },
  markerLabel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    maxWidth: 200,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLabelText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLogoBack: {
    padding: 3,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 238, 0, 0.4)',
  },
  markerTextAbove: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
    backgroundColor: 'rgba(255, 238, 0, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 150,
  },
  markerLogo: {
    width: 20,
    height: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  btnRoute: {
    position: 'absolute',
    left: 12,
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 5,
  },
  infoPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 238, 0, 0.3)',
    zIndex: 1000,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  infoPanelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  infoPanelIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPanelTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  infoPanelClose: {
    padding: 6,
    borderRadius: 10,
  },
  infoPanelContent: {
    gap: 16,
    marginBottom: 12,
  },
  infoPanelSection: {
    gap: 8,
    marginBottom: 8,
  },
  infoPanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoPanelLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoPanelStoreHours: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 42,
    marginTop: 2,
  },
  infoPanelPhoneRow: {
    justifyContent: 'flex-start',
  },
  infoPanelPhone: {
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  infoPanelCompactContent: {
    maxHeight: 150,
    paddingTop: 4,
  },
  infoPanelStoreItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoPanelStoreName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoPanelStoreHoursSmall: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
