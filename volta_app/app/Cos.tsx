import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from './_context/ThemeContext';
import { CartContext } from './_context/CartContext';
import { UserContext } from './_context/UserContext';
import { getColors, formatCurrencyDisplay } from './_components/theme';
import Screen from './_components/Screen';
import { useBottomMenuInset } from './_hooks/useBottomMenuInset';
import { useResponsive, responsiveSize } from './_hooks/useResponsive';
import EmptyState from './_components/EmptyState';
import { apiClient } from '../lib/apiClient';

type DeliveryType = 'courier' | 'pickup';
type PayMethod = 'cash' | 'card';

export default function Cos() {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const { user } = useContext(UserContext);
  const { items, total, setQuantity, removeFromCart, clearCart, isLoadingCart, refreshCart } = useContext(CartContext);
  const [refreshing, setRefreshing] = React.useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('courier');
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [suburb, setSuburb] = useState('');
  const [comment, setComment] = useState('');
  const [step, setStep] = useState(1);
  const prevItemsLength = React.useRef(0);
  const [pickupAddressId, setPickupAddressId] = useState<number | null>(null);
  const [stores, setStores] = useState<Array<{ id: number; name?: string; address?: string }>>([]);

  const TOTAL_STEPS = 4;
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const bottomInsetForMenu = useBottomMenuInset();
  const { isSmallScreen, scale } = useResponsive();
  const styles = useMemo(() => getStyles(isSmallScreen, scale), [isSmallScreen, scale]);

  useEffect(() => {
    if (user) {
      setName(`${user.prenume || ''} ${user.nume || ''}`.trim());
      setPhone(user.telefon || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (items.length > 0 && prevItemsLength.current === 0) setStep(1);
    prevItemsLength.current = items.length;
  }, [items.length]);

  useEffect(() => {
    if (step === 2 && stores.length === 0) {
      apiClient.getStores().then((res) => {
        if (res.error || !res.data) return;
        const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.results ?? [];
        const list = raw.map((s: any) => ({
          id: s.id ?? s.pk,
          name: s.name ?? s.name_in_1c ?? s.address ?? `Magazin ${s.id}`,
          address: s.address ?? s.name,
        }));
        setStores(list);
      });
    }
  }, [step]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshCart();
    setRefreshing(false);
  }, [refreshCart]);

  const handleClearCart = React.useCallback(() => {
    if (items.length === 0) return;
    Alert.alert('Golești coșul?', 'Toate produsele vor fi eliminate din coș.', [
      { text: 'Anulează', style: 'cancel' },
      { text: 'Golește', style: 'destructive', onPress: () => clearCart() },
    ]);
  }, [items.length, clearCart]);

  const handleSubmitOrder = useCallback(async () => {
    if (!user || items.length === 0) return;
    const trimName = name.trim();
    const trimPhone = phone.trim();
    const trimEmail = email.trim();
    const trimAddress = address.trim();
    const trimCity = city.trim();
    if (!trimName || !trimPhone || !trimEmail) {
      Alert.alert('Date incomplete', 'Completează numele, telefonul și emailul.');
      return;
    }
    if (deliveryType === 'courier' && (!trimAddress || !trimCity)) {
      Alert.alert('Date livrare', 'Completează adresa și orașul pentru livrare la domiciliu.');
      return;
    }
    if (deliveryType === 'pickup' && !pickupAddressId) {
      Alert.alert('Ridicare', 'Selectează magazinul de unde vrei să ridici comanda.');
      return;
    }
    setSubmitting(true);
    try {
      const orderProducts = items.map((item) => ({
        product_id: parseInt(item.productId, 10),
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
      }));
      const payload = apiClient.createOrderPayload({
        userId: user.id,
        name: trimName,
        phone: trimPhone,
        email: trimEmail,
        deliveryType,
        payMethod,
        address: deliveryType === 'courier' ? trimAddress : '',
        city: deliveryType === 'courier' ? trimCity : '',
        suburb: suburb.trim() || undefined,
        comment: comment.trim() || undefined,
        pickupAddressId: deliveryType === 'pickup' ? (pickupAddressId ?? undefined) : undefined,
        totalPrice: total,
        totalDiscount: 0,
        costOfDelivery: 0,
        orderProducts,
        lang: 'ro',
      });
      const res = await apiClient.createOrder(payload);
      if (res.error) {
        Alert.alert('Eroare', res.error);
        return;
      }
      clearCart();
      Alert.alert(
        'Comandă înregistrată',
        `Comanda #${res.data?.id ?? ''} a fost trimisă. Vei fi contactat pentru confirmare și livrare.`,
        [{ text: 'OK', onPress: () => router.replace('/Home') }]
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Eroare la trimiterea comenzii.';
      Alert.alert('Eroare', msg);
    } finally {
      setSubmitting(false);
    }
  }, [user, items, total, name, phone, email, address, city, suburb, comment, deliveryType, payMethod, pickupAddressId, clearCart, router]);

  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : colors.surface;
  const inputBorder = colors.border;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : colors.surface }]}>
          <TouchableOpacity
            onPress={step === 1 ? () => router.back() : () => setStep(step - 1)}
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {step === 1 ? 'Coș' : `Pasul ${step}: ${step === 2 ? 'Livrare' : step === 3 ? 'Plată' : 'Confirmare'}`}
          </Text>
          {step === 1 && items.length > 0 ? (
            <TouchableOpacity onPress={handleClearCart} style={[styles.clearBtnWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.clearBtn, { color: colors.textMuted }]}>Golește</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>

        {items.length > 0 && step > 1 && (
          <View style={[styles.stepIndicator, { borderBottomColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)' }]}>
            <View style={styles.stepDots}>
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    { backgroundColor: s <= step ? colors.primaryButton : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)') },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Pasul {step} din {TOTAL_STEPS}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom: items.length > 0
                ? bottomInsetForMenu + (step === 1 ? 140 : step === 4 ? 200 : 100)
                : bottomInsetForMenu + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            items.length > 0 ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryButton} />
            ) : undefined
          }
        >
          {isLoadingCart && items.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primaryButton} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Se încarcă coșul...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="cart-outline"
                title="Coșul tău e gol"
                description="Adaugă produse din Catalog pentru a le vedea aici."
                style={{ paddingVertical: 48 }}
                iconSize={72}
              />
              <TouchableOpacity
                style={[styles.continueShoppingBtn, { backgroundColor: colors.primaryButton }]}
                onPress={() => router.replace('/Catalog')}
                activeOpacity={0.88}
              >
                <Ionicons name="basket-outline" size={22} color="#000" />
                <Text style={styles.continueShoppingText}>Continuă cumpărăturile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Pas 1: Produse */}
              {step === 1 && (
                <>
                  {items.map((item) => (
                    <View
                      key={item.productId}
                      style={[
                        styles.productCard,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                          shadowColor: '#000',
                        },
                      ]}
                    >
                      <View style={[styles.productCardImageWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                        {item.product.image_url ? (
                          <Image source={{ uri: item.product.image_url }} style={styles.productImage} resizeMode="cover" />
                        ) : (
                          <Ionicons name="cube-outline" size={36} color={colors.textMuted} />
                        )}
                      </View>
                      <View style={styles.productCardBody}>
                        <Text style={[styles.productCardName, { color: colors.text }]} numberOfLines={2}>
                          {item.product.name}
                        </Text>
                        <Text style={[styles.productCardPriceLine, { color: colors.textMuted }]}>
                          {item.product.price} {formatCurrencyDisplay(item.product.currency)} × {item.quantity} = {(item.product.price * item.quantity).toFixed(0)} {formatCurrencyDisplay(item.product.currency)}
                        </Text>
                        <View style={styles.productCardActions}>
                          <View style={[styles.stepper, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                            <TouchableOpacity style={[styles.stepperBtn, { borderRightColor: colors.border }]} onPress={() => setQuantity(item.productId, item.quantity - 1)}>
                              <Ionicons name="remove" size={18} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.stepperValue, { color: colors.text }]}>{item.quantity}</Text>
                            <TouchableOpacity style={[styles.stepperBtn, { borderLeftColor: colors.border }]} onPress={() => setQuantity(item.productId, item.quantity + 1)}>
                              <Ionicons name="add" size={18} color={colors.text} />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            onPress={() => removeFromCart(item.productId)}
                            style={[styles.productCardRemove, { backgroundColor: isDark ? 'rgba(255,100,80,0.2)' : 'rgba(200,60,50,0.08)' }]}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                  <View style={{ height: 24 }} />
                </>
              )}

              {/* Pas 2: Livrare */}
              {step === 2 && (
                <View style={styles.step2Wrap}>
                  <Text style={[styles.step2Title, { color: colors.text }]}>Cum vrei să primești comanda?</Text>

                  <TouchableOpacity
                    style={[
                      styles.deliveryOptionCard,
                      { backgroundColor: deliveryType === 'courier' ? colors.primaryButton : (isDark ? 'rgba(255,255,255,0.06)' : colors.surface), borderColor: deliveryType === 'courier' ? colors.primaryButton : colors.border },
                    ]}
                    onPress={() => { setDeliveryType('courier'); setPickupAddressId(null); }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.deliveryOptionIconWrap, { backgroundColor: deliveryType === 'courier' ? 'rgba(0,0,0,0.12)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') }]}>
                      <Ionicons name="car-outline" size={24} color={deliveryType === 'courier' ? '#000' : colors.text} />
                    </View>
                    <View style={styles.deliveryOptionTextWrap}>
                      <Text style={[styles.deliveryOptionTitle, { color: deliveryType === 'courier' ? '#000' : colors.text }]}>Curier</Text>
                      <Text style={[styles.deliveryOptionSub, { color: deliveryType === 'courier' ? 'rgba(0,0,0,0.7)' : colors.textMuted }]}>Livrare la adresa ta</Text>
                    </View>
                    {deliveryType === 'courier' && <Ionicons name="checkmark-circle" size={22} color="#000" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.deliveryOptionCard,
                      { backgroundColor: deliveryType === 'pickup' ? colors.primaryButton : (isDark ? 'rgba(255,255,255,0.06)' : colors.surface), borderColor: deliveryType === 'pickup' ? colors.primaryButton : colors.border },
                    ]}
                    onPress={() => setDeliveryType('pickup')}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.deliveryOptionIconWrap, { backgroundColor: deliveryType === 'pickup' ? 'rgba(0,0,0,0.12)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') }]}>
                      <Ionicons name="storefront-outline" size={24} color={deliveryType === 'pickup' ? '#000' : colors.text} />
                    </View>
                    <View style={styles.deliveryOptionTextWrap}>
                      <Text style={[styles.deliveryOptionTitle, { color: deliveryType === 'pickup' ? '#000' : colors.text }]}>Ridicare</Text>
                      <Text style={[styles.deliveryOptionSub, { color: deliveryType === 'pickup' ? 'rgba(0,0,0,0.7)' : colors.textMuted }]}>Ridici din magazin</Text>
                    </View>
                    {deliveryType === 'pickup' && <Ionicons name="checkmark-circle" size={22} color="#000" />}
                  </TouchableOpacity>

                  {deliveryType === 'courier' && (
                    <View style={[styles.step2Form, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface }]}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>Adresă</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Strada, nr., apartament"
                        placeholderTextColor={colors.textMuted}
                      />
                      <Text style={[styles.label, { color: colors.textMuted }]}>Oraș</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
                        value={city}
                        onChangeText={setCity}
                        placeholder="Chișinău"
                        placeholderTextColor={colors.textMuted}
                      />
                      <Text style={[styles.label, { color: colors.textMuted }]}>Sector (opțional)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
                        value={suburb}
                        onChangeText={setSuburb}
                        placeholder="Centru, Botanica..."
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  )}

                  {deliveryType === 'pickup' && (
                    <View style={[styles.step2Form, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface }]}>
                      <Text style={[styles.step2StoreTitle, { color: colors.text }]}>De unde vrei să ridici?</Text>
                      {stores.length === 0 ? (
                        <Text style={[styles.step2StoreEmpty, { color: colors.textMuted }]}>Se încarcă magazinele...</Text>
                      ) : (
                        stores.map((store) => (
                          <TouchableOpacity
                            key={store.id}
                            style={[
                              styles.storeItem,
                              {
                                backgroundColor: pickupAddressId === store.id ? colors.primaryButton : inputBg,
                                borderColor: pickupAddressId === store.id ? colors.primaryButton : inputBorder,
                              },
                            ]}
                            onPress={() => setPickupAddressId(store.id)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="location-outline"
                              size={20}
                              color={pickupAddressId === store.id ? '#000' : colors.textMuted}
                            />
                            <View style={styles.storeItemText}>
                              <Text style={[styles.storeItemName, { color: pickupAddressId === store.id ? '#000' : colors.text }]} numberOfLines={1}>
                                {store.name}
                              </Text>
                              {store.address ? (
                                <Text style={[styles.storeItemAddress, { color: pickupAddressId === store.id ? 'rgba(0,0,0,0.7)' : colors.textMuted }]} numberOfLines={1}>
                                  {store.address}
                                </Text>
                              ) : null}
                            </View>
                            {pickupAddressId === store.id && <Ionicons name="checkmark-circle" size={22} color="#000" />}
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                  <View style={{ height: 24 }} />
                </View>
              )}

              {/* Pas 3: Plată */}
              {step === 3 && (
                <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Metodă de plată</Text>
                  <View style={styles.rowChannels}>
                    <TouchableOpacity
                      style={[styles.channelBtn, { borderColor: colors.border, backgroundColor: payMethod === 'cash' ? colors.primaryButton : inputBg }]}
                      onPress={() => setPayMethod('cash')}
                    >
                      <Ionicons name="cash-outline" size={20} color={payMethod === 'cash' ? '#000' : colors.text} />
                      <Text style={[styles.channelLabel, { color: payMethod === 'cash' ? '#000' : colors.text }]}>Numerar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.channelBtn, { borderColor: colors.border, backgroundColor: payMethod === 'card' ? colors.primaryButton : inputBg }]}
                      onPress={() => setPayMethod('card')}
                    >
                      <Ionicons name="card-outline" size={20} color={payMethod === 'card' ? '#000' : colors.text} />
                      <Text style={[styles.channelLabel, { color: payMethod === 'card' ? '#000' : colors.text }]}>Card</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 24 }} />
                </View>
              )}

              {/* Pas 4: Date contact + Comentariu */}
              {step === 4 && (
                <>
                  <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Date contact</Text>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Nume complet</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="Nume și prenume"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={[styles.label, { color: colors.textMuted }]}>Telefon</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="060000000"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                    />
                    <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="email@example.com"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                    />
                  </View>
                  <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Comentariu (opțional)</Text>
                    <TextInput
                      style={[styles.input, styles.inputMultiline, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
                      value={comment}
                      onChangeText={setComment}
                      placeholder="Instrucțiuni livrare, oră preferată..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  <View style={{ height: 24 }} />
                </>
              )}
            </>
          )}
        </ScrollView>

        {items.length > 0 && (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                paddingBottom: Math.max(responsiveSize(24, scale), bottomInsetForMenu + responsiveSize(16, scale)),
              },
            ]}
          >
            {step === 4 && (
              <View style={[styles.totalCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.totalValue, { color: colors.primaryButton }]}>
                  {Number(total).toFixed(0)} {formatCurrencyDisplay('MDL')}
                </Text>
              </View>
            )}
            {step < 4 ? (
              <>
                {step === 1 && (
                  <View style={[styles.totalCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                    <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                    <Text style={[styles.totalValue, { color: colors.primaryButton }]}>
                      {Number(total).toFixed(0)} {formatCurrencyDisplay('MDL')}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.checkoutBtn, { backgroundColor: colors.primaryButton, shadowColor: '#000' }]}
                  onPress={() => {
                    if (step === 2 && deliveryType === 'courier' && (!address.trim() || !city.trim())) {
                      Alert.alert('Date livrare', 'Completează adresa și orașul pentru livrare la domiciliu.');
                      return;
                    }
                    if (step === 2 && deliveryType === 'pickup' && !pickupAddressId) {
                      Alert.alert('Ridicare', 'Selectează magazinul de unde vrei să ridici comanda.');
                      return;
                    }
                    setStep(step + 1);
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.checkoutText}>Continuă</Text>
                  <Ionicons name="arrow-forward" size={22} color="#000" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.checkoutBtn, { backgroundColor: colors.primaryButton, shadowColor: '#000', opacity: submitting ? 0.8 : 1 }]}
                onPress={handleSubmitOrder}
                disabled={submitting}
                activeOpacity={0.88}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#000" />
                    <Text style={styles.checkoutText}>Trimite comanda</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  </Screen>
  );
}

function getStyles(isSmallScreen: boolean, scale: number): {
  container: ViewStyle;
  header: ViewStyle;
  backBtn: ViewStyle;
  title: TextStyle;
  clearBtnWrap: ViewStyle;
  clearBtn: TextStyle;
  scroll: ViewStyle;
  card: ViewStyle;
  imageWrap: ViewStyle;
  productImage: ViewStyle;
  body: ViewStyle;
  productName: TextStyle;
  priceLine: TextStyle;
  subtotalLine: TextStyle;
  price: TextStyle;
  priceSub: TextStyle;
  actions: ViewStyle;
  loadingWrap: ViewStyle;
  loadingText: TextStyle;
  emptyWrap: ViewStyle;
  continueShoppingBtn: ViewStyle;
  continueShoppingText: TextStyle;
  stepper: ViewStyle;
  stepperBtn: ViewStyle;
  stepperValue: TextStyle;
  removeWrap: ViewStyle;
  footer: ViewStyle;
  totalCard: ViewStyle;
  totalLabel: TextStyle;
  totalValue: TextStyle;
  checkoutBtn: ViewStyle;
  checkoutText: TextStyle;
  section: ViewStyle;
  sectionTitle: TextStyle;
  label: TextStyle;
  input: ViewStyle;
  inputMultiline: ViewStyle;
  rowChannels: ViewStyle;
  channelBtn: ViewStyle;
  channelLabel: TextStyle;
  stepIndicator: ViewStyle;
  stepDots: ViewStyle;
  stepDot: ViewStyle;
  stepLabel: TextStyle;
  productCard: ViewStyle;
  productCardImageWrap: ViewStyle;
  productCardBody: ViewStyle;
  productCardName: TextStyle;
  productCardPriceLine: TextStyle;
  productCardActions: ViewStyle;
  productCardRemove: ViewStyle;
  step2Wrap: ViewStyle;
  step2Title: TextStyle;
  deliveryOptionCard: ViewStyle;
  deliveryOptionIconWrap: ViewStyle;
  deliveryOptionTextWrap: ViewStyle;
  deliveryOptionTitle: TextStyle;
  deliveryOptionSub: TextStyle;
  step2Form: ViewStyle;
  step2StoreTitle: TextStyle;
  step2StoreEmpty: TextStyle;
  storeItem: ViewStyle;
  storeItemText: ViewStyle;
  storeItemName: TextStyle;
  storeItemAddress: TextStyle;
} {
  const paddingH = responsiveSize(20, scale);
  const r = (n: number) => responsiveSize(n, scale);
  return {
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: paddingH,
      paddingVertical: r(14),
      paddingTop: r(18),
      borderBottomWidth: 1,
      gap: r(12),
    },
    backBtn: {
      width: r(44),
      height: r(44),
      borderRadius: r(22),
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: r(isSmallScreen ? 19 : 21),
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    clearBtnWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: r(14),
      paddingVertical: r(10),
      borderRadius: r(22),
      gap: r(6),
    },
    clearBtn: {
      fontSize: r(13),
      fontWeight: '600',
    },
    scroll: {
      paddingHorizontal: paddingH,
      paddingTop: r(24),
      paddingBottom: 24,
    },
    card: {
      flexDirection: 'row',
      padding: r(16),
      marginBottom: r(14),
      borderRadius: r(20),
      borderWidth: 0,
      overflow: 'hidden',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
      gap: r(14),
      alignItems: 'flex-start',
    },
    imageWrap: {
      width: r(92),
      height: r(92),
      minWidth: r(92),
      borderRadius: r(16),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
    },
    productImage: {
      width: '100%',
      height: '100%',
    },
    body: { flex: 1, minWidth: 0 },
    productName: {
      fontSize: r(15),
      fontWeight: '600',
      lineHeight: r(21),
      marginBottom: r(6),
      letterSpacing: 0.1,
    },
    priceLine: {
      fontSize: r(12),
      marginBottom: r(2),
      opacity: 0.85,
    },
    subtotalLine: {
      fontSize: r(16),
      fontWeight: '800',
      marginBottom: r(12),
      letterSpacing: -0.2,
    },
    price: {
      fontSize: r(16),
      fontWeight: '800',
      marginBottom: r(12),
    },
    priceSub: {
      fontSize: r(13),
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: r(12),
      flexWrap: 'wrap',
      flexShrink: 0,
      marginBottom: r(8),
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: r(14),
      overflow: 'hidden',
      flexShrink: 0,
    },
    stepperBtn: {
      paddingHorizontal: r(14),
      paddingVertical: r(10),
    },
    stepperValue: {
      fontSize: r(15),
      fontWeight: '700',
      minWidth: r(36),
      textAlign: 'center',
    },
    removeWrap: {
      padding: r(10),
      borderRadius: r(12),
      alignSelf: 'flex-start',
    },
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
      gap: r(20),
    },
    loadingText: {
      fontSize: r(16),
      fontWeight: '500',
    },
    emptyWrap: {
      paddingVertical: r(40),
      alignItems: 'center',
      gap: r(32),
    },
    continueShoppingBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: r(18),
      paddingHorizontal: r(32),
      borderRadius: r(16),
      gap: r(12),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    continueShoppingText: {
      fontSize: r(16),
      fontWeight: '700',
      color: '#000',
      letterSpacing: 0.2,
    },
    footer: {
      paddingHorizontal: paddingH,
      paddingTop: r(18),
      paddingBottom: r(24),
      borderTopWidth: 1,
    },
    totalCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: r(16),
      paddingHorizontal: r(20),
      borderRadius: r(16),
      borderWidth: 0,
      marginBottom: r(14),
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    totalLabel: {
      fontSize: r(16),
      fontWeight: '600',
    },
    totalValue: {
      fontSize: r(24),
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    checkoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: r(12),
      borderRadius: r(14),
      gap: r(10),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 5,
    },
    checkoutText: {
      fontSize: r(17),
      fontWeight: '800',
      color: '#000',
      letterSpacing: 0.3,
    },
    section: {
      padding: r(20),
      borderRadius: r(20),
      borderWidth: 0,
      marginBottom: r(16),
      gap: r(10),
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: r(17),
      fontWeight: '700',
      marginBottom: r(8),
      letterSpacing: -0.2,
    },
    label: {
      fontSize: r(13),
      fontWeight: '500',
      marginTop: r(8),
    },
    input: {
      borderWidth: 1,
      borderRadius: r(14),
      paddingHorizontal: r(16),
      paddingVertical: r(14),
      fontSize: r(15),
    },
    inputMultiline: {
      minHeight: r(88),
      textAlignVertical: 'top',
    },
    rowChannels: {
      flexDirection: 'row',
      gap: r(12),
      marginTop: r(8),
    },
    channelBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: r(10),
      paddingVertical: r(16),
      borderRadius: r(16),
      borderWidth: 2,
    },
    channelLabel: {
      fontSize: r(14),
      fontWeight: '700',
    },
    stepIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: paddingH,
      paddingVertical: r(14),
      borderBottomWidth: 1,
      gap: r(12),
    },
    stepDots: {
      flexDirection: 'row',
      gap: r(10),
    },
    stepDot: {
      width: r(10),
      height: r(10),
      borderRadius: r(5),
    },
    stepLabel: {
      fontSize: r(13),
      fontWeight: '700',
    },
    productCard: {
      flexDirection: 'row',
      padding: r(14),
      marginBottom: r(12),
      borderRadius: r(18),
      overflow: 'hidden',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 3,
      gap: r(14),
      alignItems: 'center',
    },
    productCardImageWrap: {
      width: r(80),
      height: r(80),
      borderRadius: r(14),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
    },
    productCardBody: { flex: 1, minWidth: 0 },
    productCardName: {
      fontSize: r(15),
      fontWeight: '600',
      lineHeight: r(20),
      marginBottom: r(4),
    },
    productCardPriceLine: {
      fontSize: r(13),
      marginBottom: r(10),
    },
    productCardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: r(10),
    },
    productCardRemove: {
      padding: r(10),
      borderRadius: r(10),
    },
    step2Wrap: { gap: r(12) },
    step2Title: {
      fontSize: r(16),
      fontWeight: '700',
      marginBottom: r(4),
    },
    deliveryOptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: r(12),
      borderRadius: r(14),
      borderWidth: 2,
      gap: r(12),
    },
    deliveryOptionIconWrap: {
      width: r(42),
      height: r(42),
      borderRadius: r(12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    deliveryOptionTextWrap: { flex: 1 },
    deliveryOptionTitle: { fontSize: r(15), fontWeight: '700' },
    deliveryOptionSub: { fontSize: r(12), marginTop: r(1) },
    step2Form: {
      padding: r(14),
      borderRadius: r(14),
      gap: r(8),
    },
    step2StoreTitle: {
      fontSize: r(14),
      fontWeight: '600',
      marginBottom: r(10),
    },
    step2StoreEmpty: {
      fontSize: r(13),
      paddingVertical: r(8),
    },
    storeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: r(12),
      borderRadius: r(12),
      borderWidth: 2,
      marginBottom: r(8),
      gap: r(10),
    },
    storeItemText: { flex: 1, minWidth: 0 },
    storeItemName: { fontSize: r(15), fontWeight: '600' },
    storeItemAddress: { fontSize: r(12), marginTop: r(2) },
  };
}
