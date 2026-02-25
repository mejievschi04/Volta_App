import React, { useState, useContext, useRef, useCallback, useMemo, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView, 
  Animated, 
  Dimensions, 
  Image, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Modal,
  Keyboard
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../lib/apiClient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserContext } from "./_context/UserContext";
import { ThemeContext } from "./_context/ThemeContext";
import Screen from "./_components/Screen";
import { getColors } from "./_components/theme";

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;

// Componenta InputField optimizată cu memo și animații
interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address" | "numeric";
  icon?: keyof typeof Ionicons.glyphMap;
  maxLength?: number;
  focusedInput: string | null;
  setFocusedInput: (value: string | null) => void;
  scrollViewRef?: React.RefObject<ScrollView>;
  colors: { primaryButton: string; textMuted: string; background: string; border: string; text: string };
  error?: string;
}

const InputField = React.memo<InputFieldProps>(({ 
  placeholder, 
  value, 
  onChangeText, 
  secureTextEntry = false, 
  keyboardType = "default",
  icon,
  maxLength,
  focusedInput,
  setFocusedInput,
  scrollViewRef,
  colors,
  error,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isFocused = focusedInput === placeholder;
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleFocus = useCallback(() => {
    setFocusedInput(placeholder);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
    
    // Scroll to show password field when focused (gentle scroll)
    if (scrollViewRef?.current && (placeholder === "Parolă" || placeholder.includes("telefon"))) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 280, animated: true });
      }, 200);
    }
  }, [placeholder, setFocusedInput, scaleAnim, scrollViewRef]);

  const handleBlur = useCallback(() => {
    setFocusedInput(null);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [setFocusedInput, scaleAnim]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <Animated.View 
      style={[
        styles.inputWrapper,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused, { backgroundColor: colors.background, borderColor: isFocused ? colors.primaryButton : colors.border }]}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={isSmallScreen ? 18 : 20} 
            color={isFocused ? colors.primaryButton : colors.textMuted} 
            style={styles.inputIcon} 
          />
        )}
        <TextInput
          ref={inputRef}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[styles.input, secureTextEntry && styles.inputWithToggle, { color: colors.text }]}
          autoCapitalize={secureTextEntry ? "none" : "words"}
          autoCorrect={!secureTextEntry}
          accessibilityLabel={placeholder}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.passwordToggle}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={isSmallScreen ? 20 : 22} 
              color={isFocused ? colors.primaryButton : colors.textMuted} 
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={[styles.inputError, { color: '#E53935' }]}>{error}</Text>
      ) : null}
    </Animated.View>
  );
});

InputField.displayName = 'InputField';

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { setUser, setToken } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);

  const [nume, setNume] = useState("");
  const [prenume, setPrenume] = useState("");
  const [telefon, setTelefon] = useState("+373");
  const [dataNasterii, setDataNasterii] = useState("");
  const [sex, setSex] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1, 2, sau 3
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Monitor keyboard visibility
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        // Reset scroll when keyboard hides
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const PHONE_PREFIX = "+373";
  
  const handleTelefonChange = useCallback((text: string) => {
    setFieldErrors((e) => ({ ...e, telefon: '' }));
    const onlyDigits = text.replace(/[^\d]/g, "");
    let rest = onlyDigits.startsWith("373") ? onlyDigits.slice(3) : onlyDigits;
    const limitedRest = rest.slice(0, 8);
    setTelefon(PHONE_PREFIX + limitedRest);
  }, []);

  // Funcție pentru a genera zilele disponibile în funcție de lună și an
  const getDaysInMonth = useCallback((month: number, year: number): number => {
    return new Date(year, month, 0).getDate();
  }, []);

  // Funcție pentru a actualiza data nașterii când se schimbă zi/lună/an
  const updateBirthDate = useCallback((day: number | null, month: number | null, year: number | null) => {
    if (day && month && year) {
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      setDataNasterii(`${year}-${monthStr}-${dayStr}`);
    } else {
      setDataNasterii("");
    }
  }, []);

  // Generare ani (de la 1950 până la anul curent - 13 pentru vârsta minimă)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Ianuarie' },
    { value: 2, label: 'Februarie' },
    { value: 3, label: 'Martie' },
    { value: 4, label: 'Aprilie' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Iunie' },
    { value: 7, label: 'Iulie' },
    { value: 8, label: 'August' },
    { value: 9, label: 'Septembrie' },
    { value: 10, label: 'Octombrie' },
    { value: 11, label: 'Noiembrie' },
    { value: 12, label: 'Decembrie' },
  ];

  const handleSignup = useCallback(async () => {
    setFieldErrors({});
    // Validare pas 3: Telefon și Parolă
    if (!telefon || !password) {
      const next: Record<string, string> = {};
      if (!telefon) next.telefon = 'Completează numărul de telefon.';
      if (!password) next.password = 'Completează parola.';
      setFieldErrors(next);
      return;
    }

    const phoneRegex = /^\+373[0-9]{8}$/;
    if (!phoneRegex.test(telefon)) {
      setFieldErrors({ telefon: 'Numărul trebuie să fie în format +373XXXXXXXX.' });
      return;
    }

    if (password.length < 6) {
      setFieldErrors({ password: 'Parola trebuie să aibă minim 6 caractere.' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await apiClient.signup({
        nume,
        prenume,
        telefon,
        data_nasterii: dataNasterii,
        sex: sex.toUpperCase(),
        parola: password,
      });

      if (error) {
        Alert.alert('Eroare la înregistrare', error);
      } else if (data) {
        const userObj = data.user ?? data;
        const tokenObj = data.token ?? null;
        if (tokenObj) await setToken(tokenObj);
        setUser(userObj);
        setIsSignup(false);
        setSignupStep(1);
        setNume(""); 
        setPrenume(""); 
        setTelefon(PHONE_PREFIX); 
        setDataNasterii(""); 
        setSex("");
        setSelectedDay(null);
        setSelectedMonth(null);
        setSelectedYear(null);
        setPassword("");
        router.replace("/Home");
      }
    } catch (error: any) {
      Alert.alert('Eroare', error.message || 'Ceva nu a mers bine. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  }, [nume, prenume, telefon, dataNasterii, sex, password, setUser, setToken, router]);

  const handleLogin = useCallback(async () => {
    setFieldErrors({});
    if (!telefon || !password) {
      const next: Record<string, string> = {};
      if (!telefon) next.telefon = 'Introdu numărul de telefon.';
      if (!password) next.password = 'Introdu parola.';
      setFieldErrors(next);
      return;
    }

    setIsLoading(true);
    try {
      console.log('[Login] Începând login cu:', { telefon: telefon.trim(), passwordLength: password.length });
      const { data, error } = await apiClient.login(telefon.trim(), password);
      
      console.log('[Login] Răspuns API:', { hasData: !!data, hasError: !!error, data, error });

      if (error) {
        Alert.alert('Autentificare eșuată', error);
        return;
      }

      const userObj = data?.user ?? data;
      if (!userObj) {
        Alert.alert('Eroare', 'Nu s-au primit date de la server. Încearcă din nou.');
        return;
      }

      const tokenObj = data?.token ?? null;
      if (tokenObj) await setToken(tokenObj);
      setUser(userObj);
      // setUser salvează automat în AsyncStorage
      
      const prenume = userObj.prenume || userObj.nume || 'Utilizator';
      setNotificationMessage(`Bun venit, ${prenume}!`);
      setShowNotification(true);
      Animated.spring(notificationAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        Animated.timing(notificationAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowNotification(false);
          console.log('[Login] Navigare către Home...');
          router.replace("/Home");
        });
      }, 2500);
    } catch (error: any) {
      Alert.alert('Eroare', error.message || 'Nu s-a putut conecta. Verifică conexiunea și încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  }, [telefon, password, setUser, setToken, router]);

  const toggleSignup = useCallback(() => {
    setIsSignup(!isSignup);
    setSignupStep(1);
    setFocusedInput(null);
    setFieldErrors({});
  }, [isSignup]);

  const nextStep = useCallback(() => {
    setFieldErrors({});
    if (signupStep === 1) {
      // Validare pas 1: Nume și Prenume
      if (!nume || !prenume) {
        const next: Record<string, string> = {};
        if (!nume) next.nume = 'Completează numele.';
        if (!prenume) next.prenume = 'Completează prenumele.';
        setFieldErrors(next);
        return;
      }
      const nameRegex = /^[A-Za-zăîâșțĂÎÂȘȚ]+$/;
      if (!nameRegex.test(nume) || !nameRegex.test(prenume)) {
        const next: Record<string, string> = {};
        if (!nameRegex.test(nume)) next.nume = 'Doar litere.';
        if (!nameRegex.test(prenume)) next.prenume = 'Doar litere.';
        setFieldErrors(next);
        return;
      }
      setSignupStep(2);
    } else if (signupStep === 2) {
      // Validare pas 2: Data nașterii și Sex
      if (!selectedDay || !selectedMonth || !selectedYear) {
        setFieldErrors({ dataNasterii: 'Completează data nașterii (zi, lună, an).' });
        return;
      }
      if (!sex) {
        setFieldErrors({ sex: 'Selectează sexul.' });
        return;
      }
      if (!(sex.toUpperCase() === "M" || sex.toUpperCase() === "F")) {
        setFieldErrors({ sex: "Sexul trebuie să fie 'M' sau 'F'." });
        return;
      }
      const date = new Date(selectedYear, selectedMonth - 1, selectedDay);
      if (date.getFullYear() !== selectedYear || date.getMonth() !== selectedMonth - 1 || date.getDate() !== selectedDay) {
        setFieldErrors({ dataNasterii: 'Data nașterii nu este validă.' });
        return;
      }
      setSignupStep(3);
    }
  }, [signupStep, nume, prenume, selectedDay, selectedMonth, selectedYear, sex]);

  const prevStep = useCallback(() => {
    if (signupStep > 1) {
      setSignupStep(signupStep - 1);
    }
  }, [signupStep]);

  const logoSize = useMemo(() => {
    if (isSmallScreen) return 280;
    if (isLargeScreen) return 380;
    return 320;
  }, []);

  const titleSize = useMemo(() => {
    if (isSmallScreen) return 24;
    if (isLargeScreen) return 32;
    return 28;
  }, []);

  return (
    <View style={[styles.gradientContainer, { backgroundColor: colors.background }]}>
      <Screen style={{ backgroundColor: colors.background }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <ScrollView 
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(300, height * 0.35) }
            ]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            scrollEnabled={isKeyboardVisible}
          >
            <Animated.View
              style={[
                styles.animatedContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Logo modern cu animație */}
              <Animated.View 
                style={[
                  styles.logoContainer,
                  { transform: [{ scale: logoScale }] }
                ]}
              >
                <Image
                  source={require('../logo/logo.png')}
                  style={[styles.logoImage, { width: logoSize, height: logoSize }]}
                  resizeMode="contain"
                />
              </Animated.View>

              {/* Title Section */}
              <View style={styles.titleSection}>
                <Text style={[styles.title, { fontSize: titleSize, color: colors.text }]}>
                  {isSignup ? "Creează cont nou" : "Bine ai revenit"}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {isSignup 
                    ? "Completează formularul pentru a începe" 
                    : "Autentifică-te pentru a continua"}
                </Text>
              </View>

              {/* Form Container */}
              <View style={styles.formContainer}>
                {isSignup && (
                  <>
                    {/* Progress Indicator */}
                    <View style={[styles.progressContainer, { borderColor: colors.border }]}>
                      {[1, 2, 3].map((step) => (
                        <View key={step} style={styles.progressStepContainer}>
                          <View
                            style={[
                              styles.progressStep,
                              signupStep >= step && [styles.progressStepActive, { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton }],
                              signupStep < step && { backgroundColor: colors.surface, borderColor: colors.border },
                            ]}
                          />
                          {step < 3 && (
                            <View
                              style={[
                                styles.progressLine,
                                { backgroundColor: colors.border },
                                signupStep > step && [styles.progressLineActive, { backgroundColor: colors.primaryButton }],
                              ]}
                            />
                          )}
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.stepText, { color: colors.textMuted }]}>
                      Pasul {signupStep} din 3
                    </Text>

                    {/* Step 1: Informații personale */}
                    {signupStep === 1 && (
                      <>
                        <InputField
                          placeholder="Nume"
                          value={nume}
                          onChangeText={(t) => { setFieldErrors((e) => ({ ...e, nume: '' })); setNume(t); }}
                          icon="person-outline"
                          focusedInput={focusedInput}
                          setFocusedInput={setFocusedInput}
                          scrollViewRef={scrollViewRef}
                          colors={colors}
                          error={fieldErrors.nume}
                        />
                        <InputField
                          placeholder="Prenume"
                          value={prenume}
                          onChangeText={(t) => { setFieldErrors((e) => ({ ...e, prenume: '' })); setPrenume(t); }}
                          icon="person-outline"
                          focusedInput={focusedInput}
                          setFocusedInput={setFocusedInput}
                          scrollViewRef={scrollViewRef}
                          colors={colors}
                          error={fieldErrors.prenume}
                        />
                      </>
                    )}

                    {/* Step 2: Date personale */}
                    {signupStep === 2 && (
                      <>
                        {/* Buton pentru Data Nașterii */}
                        <TouchableOpacity
                          style={[styles.dateButton, { backgroundColor: colors.background, borderColor: fieldErrors.dataNasterii ? '#E53935' : colors.border }]}
                          onPress={() => { setFieldErrors((e) => ({ ...e, dataNasterii: '' })); setShowDatePicker(true); }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.dateButtonContent}>
                            <Ionicons 
                              name="calendar-outline" 
                              size={20} 
                              color={dataNasterii ? colors.text : colors.textMuted} 
                              style={styles.dateButtonIcon}
                            />
                            <View style={styles.dateButtonTextContainer}>
                              <Text style={[
                                styles.dateButtonLabel,
                                !dataNasterii && styles.dateButtonLabelPlaceholder,
                                { color: dataNasterii ? colors.text : colors.textMuted }
                              ]}>
                                {dataNasterii 
                                  ? `${selectedDay || ''} ${selectedMonth ? months.find(m => m.value === selectedMonth)?.label : ''} ${selectedYear || ''}`
                                  : 'Selectează data nașterii'
                                }
                              </Text>
                              {dataNasterii && (
                                <Text style={[styles.dateButtonSubLabel, { color: colors.textMuted }]}>
                                  {dataNasterii}
                                </Text>
                              )}
                            </View>
                            <Ionicons 
                              name="chevron-forward" 
                              size={20} 
                              color={colors.textMuted} 
                            />
                          </View>
                        </TouchableOpacity>
                        {fieldErrors.dataNasterii ? (
                          <Text style={[styles.inputError, { color: '#E53935', marginBottom: 6 }]}>{fieldErrors.dataNasterii}</Text>
                        ) : null}

                        {/* Modal pentru Date Picker */}
                        <Modal
                          visible={showDatePicker}
                          transparent={true}
                          animationType="slide"
                          onRequestClose={() => setShowDatePicker(false)}
                        >
                          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Selectează data nașterii</Text>
                                <TouchableOpacity
                                  onPress={() => setShowDatePicker(false)}
                                  style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
                                >
                                  <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                              </View>

                              <View style={[styles.datePickerRow, { backgroundColor: colors.surface }]}>
                                {/* Zi */}
                                <View style={styles.datePickerColumn}>
                                  <Text style={[styles.datePickerSubLabel, { color: colors.textMuted }]}>Zi</Text>
                                  <ScrollView 
                                    style={styles.datePickerScroll}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                  >
                                    {selectedMonth && selectedYear ? (
                                      Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1).map((day) => (
                                        <TouchableOpacity
                                          key={day}
                                          style={[
                                            styles.datePickerOption,
                                            selectedDay === day && styles.datePickerOptionSelected,
                                            { backgroundColor: selectedDay === day ? colors.primaryButton : colors.background },
                                          ]}
                                          onPress={() => {
                                            setSelectedDay(day);
                                            updateBirthDate(day, selectedMonth, selectedYear);
                                          }}
                                        >
                                          <Text style={[
                                            styles.datePickerOptionText,
                                            selectedDay === day && styles.datePickerOptionTextSelected,
                                            { color: selectedDay === day ? '#000' : colors.textMuted },
                                          ]}>
                                            {day}
                                          </Text>
                                        </TouchableOpacity>
                                      ))
                                    ) : (
                                      <Text style={[styles.datePickerHint, { color: colors.textMuted }]}>Selectează luna și anul</Text>
                                    )}
                                  </ScrollView>
                                </View>

                                {/* Lună */}
                                <View style={styles.datePickerColumn}>
                                  <Text style={[styles.datePickerSubLabel, { color: colors.textMuted }]}>Lună</Text>
                                  <ScrollView 
                                    style={styles.datePickerScroll}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                  >
                                    {months.map((month) => (
                                      <TouchableOpacity
                                        key={month.value}
                                        style={[
                                          styles.datePickerOption,
                                          selectedMonth === month.value && styles.datePickerOptionSelected,
                                          { backgroundColor: selectedMonth === month.value ? colors.primaryButton : colors.background },
                                        ]}
                                        onPress={() => {
                                          setSelectedMonth(month.value);
                                          if (selectedDay && selectedYear) {
                                            const maxDays = getDaysInMonth(month.value, selectedYear);
                                            const day = selectedDay > maxDays ? maxDays : selectedDay;
                                            setSelectedDay(day);
                                            updateBirthDate(day, month.value, selectedYear);
                                          } else {
                                            updateBirthDate(selectedDay, month.value, selectedYear);
                                          }
                                        }}
                                      >
                                        <Text style={[
                                          styles.datePickerOptionText,
                                          selectedMonth === month.value && styles.datePickerOptionTextSelected,
                                          { color: selectedMonth === month.value ? '#000' : colors.textMuted },
                                        ]}>
                                          {month.label.substring(0, 3)}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>

                                {/* An */}
                                <View style={styles.datePickerColumn}>
                                  <Text style={[styles.datePickerSubLabel, { color: colors.textMuted }]}>An</Text>
                                  <ScrollView 
                                    style={styles.datePickerScroll}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                  >
                                    {years.map((year) => (
                                      <TouchableOpacity
                                        key={year}
                                        style={[
                                          styles.datePickerOption,
                                          selectedYear === year && styles.datePickerOptionSelected,
                                          { backgroundColor: selectedYear === year ? colors.primaryButton : colors.background },
                                        ]}
                                        onPress={() => {
                                          setSelectedYear(year);
                                          if (selectedDay && selectedMonth) {
                                            const maxDays = getDaysInMonth(selectedMonth, year);
                                            const day = selectedDay > maxDays ? maxDays : selectedDay;
                                            setSelectedDay(day);
                                            updateBirthDate(day, selectedMonth, year);
                                          } else {
                                            updateBirthDate(selectedDay, selectedMonth, year);
                                          }
                                        }}
                                      >
                                        <Text style={[
                                          styles.datePickerOptionText,
                                          selectedYear === year && styles.datePickerOptionTextSelected,
                                          { color: selectedYear === year ? '#000' : colors.textMuted },
                                        ]}>
                                          {year}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              </View>

                              <TouchableOpacity
                                style={styles.modalConfirmButton}
                                onPress={() => setShowDatePicker(false)}
                                activeOpacity={0.8}
                              >
                                <LinearGradient
                                  colors={['#FFEE00', '#FFEE00']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 0 }}
                                  style={styles.modalConfirmButtonGradient}
                                >
                                  <Text style={styles.modalConfirmButtonText}>Confirmă</Text>
                                </LinearGradient>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </Modal>

                        {/* Butoane pentru Sex */}
                        <View style={styles.sexSelectorContainer}>
                          <Text style={[styles.sexSelectorLabel, { color: colors.textMuted }]}>Sex</Text>
                          <View style={styles.sexButtonsRow}>
                            <TouchableOpacity
                              style={[
                                styles.sexButton,
                                sex === 'M' && styles.sexButtonSelected,
                                { backgroundColor: sex === 'M' ? colors.primaryButton : colors.background, borderColor: sex === 'M' ? colors.primaryButton : colors.border },
                              ]}
                              onPress={() => { setFieldErrors((e) => ({ ...e, sex: '' })); setSex('M'); }}
                              activeOpacity={0.7}
                            >
                              <Ionicons 
                                name="male" 
                                size={24} 
                                color={sex === 'M' ? '#000' : colors.textMuted} 
                              />
                              <Text style={[
                                styles.sexButtonText,
                                sex === 'M' && styles.sexButtonTextSelected,
                                { color: sex === 'M' ? '#000' : colors.textMuted },
                              ]}>
                                Masculin
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.sexButton,
                                sex === 'F' && styles.sexButtonSelected,
                                { backgroundColor: sex === 'F' ? colors.primaryButton : colors.background, borderColor: sex === 'F' ? colors.primaryButton : colors.border },
                              ]}
                              onPress={() => { setFieldErrors((e) => ({ ...e, sex: '' })); setSex('F'); }}
                              activeOpacity={0.7}
                            >
                              <Ionicons 
                                name="female" 
                                size={24} 
                                color={sex === 'F' ? '#000' : colors.textMuted} 
                              />
                              <Text style={[
                                styles.sexButtonText,
                                sex === 'F' && styles.sexButtonTextSelected,
                                { color: sex === 'F' ? '#000' : colors.textMuted },
                              ]}>
                                Feminin
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {fieldErrors.sex ? (
                            <Text style={[styles.inputError, { color: '#E53935', marginTop: 4 }]}>{fieldErrors.sex}</Text>
                          ) : null}
                        </View>
                      </>
                    )}

                    {/* Step 3: Autentificare */}
                    {signupStep === 3 && (
                      <>
                        <InputField
                          placeholder="Număr de telefon (+373...)"
                          value={telefon}
                          onChangeText={handleTelefonChange}
                          keyboardType="phone-pad"
                          maxLength={12}
                          icon="call-outline"
                          focusedInput={focusedInput}
                          setFocusedInput={setFocusedInput}
                          scrollViewRef={scrollViewRef}
                          colors={colors}
                          error={fieldErrors.telefon}
                        />
                        <InputField
                          placeholder="Parolă"
                          value={password}
                          onChangeText={(t) => { setFieldErrors((e) => ({ ...e, password: '' })); setPassword(t); }}
                          secureTextEntry
                          icon="lock-closed-outline"
                          focusedInput={focusedInput}
                          setFocusedInput={setFocusedInput}
                          scrollViewRef={scrollViewRef}
                          colors={colors}
                          error={fieldErrors.password}
                        />
                      </>
                    )}

                    {/* Navigation Buttons */}
                    <View style={styles.navigationButtons}>
                      {signupStep > 1 && (
                        <TouchableOpacity
                          onPress={prevStep}
                          style={[styles.navButton, styles.navButtonSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="arrow-back" size={18} color={colors.textMuted} />
                          <Text style={[styles.navButtonTextSecondary, { color: colors.textMuted }]}>Înapoi</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={signupStep < 3 ? nextStep : handleSignup}
                        style={[
                          styles.navButton,
                          styles.navButtonPrimary,
                          signupStep === 1 && signupStep < 3 && styles.navButtonFullWidth,
                        ]}
                        activeOpacity={0.85}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <>
                            <Text style={styles.navButtonTextPrimary}>
                              {signupStep < 3 ? "Continuă" : "Finalizează"}
                            </Text>
                            <Ionicons
                              name={signupStep < 3 ? "arrow-forward" : "checkmark"}
                              size={18}
                              color="#000"
                            />
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {!isSignup && (
                  <>
                    <InputField
                      placeholder="Număr de telefon (+373...)"
                      value={telefon}
                      onChangeText={handleTelefonChange}
                      keyboardType="phone-pad"
                      maxLength={12}
                      icon="call-outline"
                      focusedInput={focusedInput}
                      setFocusedInput={setFocusedInput}
                      scrollViewRef={scrollViewRef}
                      colors={colors}
                      error={fieldErrors.telefon}
                    />
                    <InputField
                      placeholder="Parolă"
                      value={password}
                      onChangeText={(t) => { setFieldErrors((e) => ({ ...e, password: '' })); setPassword(t); }}
                      secureTextEntry
                      icon="lock-closed-outline"
                      focusedInput={focusedInput}
                      setFocusedInput={setFocusedInput}
                      scrollViewRef={scrollViewRef}
                      colors={colors}
                      error={fieldErrors.password}
                    />

                    {/* Button */}
                    <TouchableOpacity
                      onPress={handleLogin}
                      style={styles.button}
                      activeOpacity={0.85}
                      disabled={isLoading}
                    >
                      <LinearGradient
                        colors={['#FFEE00', '#FFEE00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <>
                            <Text style={styles.buttonText}>Autentifică-te</Text>
                            <Ionicons
                              name="arrow-forward"
                              size={isSmallScreen ? 18 : 20}
                              color="#000"
                              style={styles.buttonIcon}
                            />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}

                {/* Switch Button */}
                <TouchableOpacity 
                  onPress={toggleSignup}
                  style={styles.switchButton}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.switchText, { color: colors.textMuted }]}>
                    {isSignup ? "Ai deja cont? " : "Nu ai cont? "}
                    <Text style={[styles.switchTextBold, { color: colors.primaryButton }]}>
                      {isSignup ? "Loghează-te" : "Creează unul"}
                    </Text>
                  </Text>
                </TouchableOpacity>

              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
        
        {/* Modern Notification */}
        {showNotification && (
          <Animated.View
            style={[
              styles.notificationContainer,
              {
                transform: [{ translateY: notificationAnim }],
                opacity: notificationAnim.interpolate({
                  inputRange: [-100, 0],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={['#FFEE00', '#FFEE00', '#FFEE00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.notificationGradient}
            >
              <View style={styles.notificationContent}>
                <LinearGradient
                  colors={['rgba(0, 0, 0, 0.15)', 'rgba(0, 0, 0, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.notificationIconWrapper}
                >
                  <Ionicons name="checkmark-circle" size={28} color="#000" />
                </LinearGradient>
                <View style={styles.notificationTextContainer}>
                  <Text style={styles.notificationTitle}>Succes!</Text>
                  <Text style={styles.notificationText}>{notificationMessage}</Text>
                </View>
                <View style={styles.notificationDecorative}>
                  <View style={styles.notificationDot} />
                  <View style={[styles.notificationDot, styles.notificationDotSmall]} />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}
      </Screen>
    </View>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: Math.max(20, width * 0.06),
    paddingTop: Platform.OS === 'ios' ? 10 : 5,
    paddingBottom: 100,
  },
  animatedContainer: {
    width: '100%',
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logoImage: {
    aspectRatio: 1,
  },
  titleSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: { 
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: isSmallScreen ? 13 : 15,
    fontWeight: "400",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  formContainer: {
    width: "100%",
  },
  inputWrapper: {
    marginBottom: 14,
  },
  inputError: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E8E8E8",
    paddingHorizontal: 18,
    paddingVertical: 6,
    minHeight: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerFocused: {
    borderColor: "#FFEE00",
    shadowColor: "#FFEE00",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    backgroundColor: "#FFFEF9",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: { 
    flex: 1,
    paddingVertical: 14,
    fontSize: isSmallScreen ? 15 : 16,
    color: "#1a1a1a",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  inputWithToggle: {
    paddingRight: 10,
  },
  passwordToggle: {
    padding: 4,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#FFEE00",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  buttonText: { 
    color: "#000", 
    fontWeight: "700",
    fontSize: isSmallScreen ? 15 : 16,
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  switchButton: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  switchText: { 
    textAlign: "center", 
    color: "#666",
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: "400",
    lineHeight: 20,
  },
  switchTextBold: {
    color: "#FFEE00",
    fontWeight: "700",
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  progressStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStep: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E8E8E8',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  progressStepActive: {
    backgroundColor: '#FFEE00',
    borderColor: '#FFEE00',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#FFEE00',
  },
  stepText: {
    textAlign: 'center',
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    minHeight: 50,
    gap: 8,
  },
  navButtonFullWidth: {
    flex: 1,
  },
  navButtonPrimary: {
    backgroundColor: '#FFEE00',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navButtonSecondary: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  navButtonTextPrimary: {
    color: '#000',
    fontWeight: '700',
    fontSize: isSmallScreen ? 15 : 16,
  },
  navButtonTextSecondary: {
    color: '#666',
    fontWeight: '600',
    fontSize: isSmallScreen ? 15 : 16,
  },
  notificationContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 1000,
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  notificationGradient: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 2.5,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  notificationIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  notificationTextContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  notificationTitle: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  notificationText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 22,
  },
  notificationDecorative: {
    position: 'absolute',
    right: 12,
    top: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginBottom: 4,
  },
  notificationDotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: 0,
  },
  dateButton: {
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 52,
  },
  dateButtonIcon: {
    marginRight: 12,
  },
  dateButtonTextContainer: {
    flex: 1,
  },
  dateButtonLabel: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  dateButtonLabelPlaceholder: {
    color: '#999',
    fontWeight: '500',
  },
  dateButtonSubLabel: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666',
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: isSmallScreen ? 20 : 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    minHeight: 280,
    maxHeight: 320,
  },
  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  datePickerSubLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePickerScroll: {
    width: '100%',
    maxHeight: 240,
  },
  datePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginVertical: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  datePickerOptionSelected: {
    backgroundColor: '#FFEE00',
    borderColor: '#FFEE00',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ scale: 1.05 }],
  },
  datePickerOptionText: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    color: '#666',
  },
  datePickerOptionTextSelected: {
    color: '#000',
    fontWeight: '800',
  },
  modalConfirmButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButtonText: {
    color: '#000',
    fontSize: isSmallScreen ? 16 : 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  datePickerHint: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  sexSelectorContainer: {
    marginBottom: 20,
  },
  sexSelectorLabel: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sexButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sexButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    gap: 10,
    minHeight: 54,
  },
  sexButtonSelected: {
    borderColor: '#FFEE00',
    backgroundColor: '#FFEE00',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sexButtonText: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#666',
  },
  sexButtonTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
});

export default LoginScreen;
