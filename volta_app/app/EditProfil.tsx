import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { UserContext } from './_context/UserContext'; // contextul global
import { ThemeContext } from './_context/ThemeContext';
import { getColors } from './_components/theme';
import { apiClient } from '../lib/apiClient';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

export default function EditProfil() {
  const router = useRouter();
  const { user, updateUser } = useContext(UserContext); // preluăm userul și funcția update
  const { theme } = useContext(ThemeContext);
  const colors = getColors(theme);
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
        // actualizăm contextul
        updateUser(data);
      }

      router.back();
    } catch (err: any) {
      const message = err?.message || 'Nu s-a putut salva. Verifică datele și încearcă din nou.';
      Alert.alert('Eroare la salvare', message, [{ text: 'OK' }]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Editează Profilul</Text>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Nume</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={name}
          onChangeText={setName}
          placeholder="Introdu numele"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={email}
          onChangeText={setEmail}
          placeholder="Introdu emailul"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
        />

        <Text style={[styles.label, { color: colors.text }]}>Parolă nouă</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Lasă gol dacă nu vrei să o schimbi"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primaryButton }]} onPress={handleSave}>
          <Ionicons name="save-outline" size={20} color="#000" />
          <Text style={styles.saveText}>Salvează</Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={styles.backButtonWrapper}
        >
          <LinearGradient
            colors={['#FFEE00', '#FFEE00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={18} color="#000" />
            <Text style={styles.backButtonText}>Înapoi</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 40 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  form: { marginTop: 10 },
  label: { fontSize: 16, marginBottom: 6 },
  input: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
  },
  saveText: { color: '#000', fontSize: 16, fontWeight: '600', marginLeft: 6 },
  backButtonWrapper: {
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButtonText: {
    color: '#000',
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
