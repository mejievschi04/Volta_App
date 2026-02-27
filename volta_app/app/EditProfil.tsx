import React, { useState, useContext, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { UserContext } from './_context/UserContext'; // contextul global
import { ThemeContext } from './_context/ThemeContext';
import { getColors } from './_components/theme';
import { apiClient } from '../lib/apiClient';
import { useBottomMenuInset } from './_hooks/useBottomMenuInset';
import { useResponsive, responsiveSize } from './_hooks/useResponsive';

export default function EditProfil() {
  const router = useRouter();
  const { user, setUser } = useContext(UserContext); // preluăm userul și funcția setUser
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
  const bottomInsetForMenu = useBottomMenuInset();
  const { isSmallScreen, scale } = useResponsive();
  const responsiveStyles = useMemo(() => StyleSheet.create(getStyles(isSmallScreen, scale)), [isSmallScreen, scale]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // populăm datele inițiale la mount
  useEffect(() => {
    if (user) {
      setName(`${user.nume} ${user.prenume}`);
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!name || !email) {
      Alert.alert('Date incomplete', 'Completează numele și emailul.', [{ text: 'OK' }]);
      return;
    }
    if (!user) return;

    // separăm nume și prenume din câmpul complet
    const nameParts = name.trim().split(' ');
    const nume = nameParts[0];
    const prenume = nameParts.slice(1).join(' ') || '';

    try {
      // actualizăm în API
      const updates: any = { nume, prenume, email };
      if (password) updates.parola = password; // doar dacă a introdus parola

      const { data, error } = await apiClient.updateUser(user.id, updates);

      if (error) throw new Error(error);
      if (data) {
        await setUser(data);
      }

      router.back();
    } catch (err: any) {
      const message = err?.message || 'Nu s-a putut salva. Verifică datele și încearcă din nou.';
      Alert.alert('Eroare la salvare', message, [{ text: 'OK' }]);
    }
  };

  return (
    <View style={[responsiveStyles.container, { backgroundColor: colors.background, paddingBottom: bottomInsetForMenu + 24 }]}>
      <Text style={[responsiveStyles.title, { color: colors.text }]}>Editează Profilul</Text>

      <View style={responsiveStyles.form}>
        <Text style={[responsiveStyles.label, { color: colors.text }]}>Nume</Text>
        <TextInput
          style={[responsiveStyles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={name}
          onChangeText={setName}
          placeholder="Introdu numele"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[responsiveStyles.label, { color: colors.text }]}>Email</Text>
        <TextInput
          style={[responsiveStyles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={email}
          onChangeText={setEmail}
          placeholder="Introdu emailul"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
        />

        <Text style={[responsiveStyles.label, { color: colors.text }]}>Parolă nouă</Text>
        <TextInput
          style={[responsiveStyles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Lasă gol dacă nu vrei să o schimbi"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <TouchableOpacity style={[responsiveStyles.saveBtn, { backgroundColor: colors.primaryButton }]} onPress={handleSave}>
          <Ionicons name="save-outline" size={20} color="#000" />
          <Text style={responsiveStyles.saveText}>Salvează</Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={responsiveStyles.backButtonWrapper}
        >
          <LinearGradient
            colors={['#FFEE00', '#FFEE00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={responsiveStyles.backButton}
          >
            <Ionicons name="arrow-back" size={18} color="#000" />
            <Text style={responsiveStyles.backButtonText}>Înapoi</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getStyles(isSmallScreen: boolean, scale: number): {
  container: ViewStyle;
  title: TextStyle;
  form: ViewStyle;
  label: TextStyle;
  input: TextStyle;
  saveBtn: ViewStyle;
  saveText: TextStyle;
  backButtonWrapper: ViewStyle;
  backButton: ViewStyle;
  backButtonText: TextStyle;
} {
  return {
    container: {
      flex: 1,
      padding: responsiveSize(20, scale),
      paddingTop: responsiveSize(40, scale),
    },
    title: {
      fontSize: responsiveSize(isSmallScreen ? 24 : 26, scale),
      fontWeight: '700' as const,
      marginBottom: responsiveSize(20, scale),
      textAlign: 'center' as const,
    },
    form: { marginTop: responsiveSize(10, scale) },
    label: {
      fontSize: responsiveSize(16, scale),
      marginBottom: responsiveSize(6, scale),
    },
    input: {
      backgroundColor: 'transparent',
      borderRadius: responsiveSize(8, scale),
      padding: responsiveSize(12, scale),
      marginBottom: responsiveSize(16, scale),
      borderWidth: 1,
    },
    saveBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: responsiveSize(10, scale),
      paddingVertical: responsiveSize(12, scale),
    },
    saveText: {
      color: '#000',
      fontSize: responsiveSize(16, scale),
      fontWeight: '600' as const,
      marginLeft: responsiveSize(6, scale),
    },
    backButtonWrapper: {
      marginTop: responsiveSize(20, scale),
      marginBottom: responsiveSize(12, scale),
      borderRadius: 0,
      overflow: 'hidden' as const,
      shadowColor: '#FFEE00',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    backButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: responsiveSize(16, scale),
      paddingHorizontal: responsiveSize(24, scale),
      gap: responsiveSize(10, scale),
      borderWidth: 1.5,
      borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    backButtonText: {
      color: '#000',
      fontSize: responsiveSize(isSmallScreen ? 15 : 16, scale),
      fontWeight: '700' as const,
      textAlign: 'center' as const,
      letterSpacing: 0.3,
    },
  };
}
