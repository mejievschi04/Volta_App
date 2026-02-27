// context/UserContext.tsx
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken } from "../../lib/apiClient";
import type { User, UserOrNull } from "../../types/User";

const USER_KEY = "user";
const TOKEN_KEY = "auth_token";

export interface UserContextValue {
  user: UserOrNull;
  setUser: (u: UserOrNull) => Promise<void>;
  token: string | null;
  setToken: (t: string | null) => Promise<void>;
  isLoading: boolean;
  selectedCardPercent: 10 | 5;
  setSelectedCardPercent: (p: 10 | 5) => void;
}

export const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: async () => {},
  token: null,
  setToken: async () => {},
  selectedCardPercent: 10,
  setSelectedCardPercent: () => {},
  isLoading: true,
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserOrNull>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCardPercent, setSelectedCardPercent] = useState<10 | 5>(10);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [userData, tokenData] = await Promise.all([
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(TOKEN_KEY),
        ]);
        if (userData) {
          const parsedUser = JSON.parse(userData) as User;
          setUserState(parsedUser);
          // Sincronizează procentul cardului selectat din datele user-ului
          const cards = parsedUser.discount_cards ?? [];
          const selectedId = parsedUser.selected_discount_card_id;
          const selected = cards.find((c) => c.id === selectedId) ?? cards[0];
          if (selected) setSelectedCardPercent(selected.discount_value);
        }
        if (tokenData) {
          setTokenState(tokenData);
          setAuthToken(tokenData);
        }
      } catch (error) {
        if (__DEV__) console.error('[UserContext] Eroare la încărcarea auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, []);

  const setToken = async (newToken: string | null) => {
    setTokenState(newToken);
    setAuthToken(newToken);
    try {
      if (newToken) {
        await AsyncStorage.setItem(TOKEN_KEY, newToken);
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      if (__DEV__) console.error('[UserContext] Eroare la salvarea token:', error);
    }
  };

  const setUserWithStorage = async (userData: UserOrNull) => {
    setUserState(userData);
    if (userData) {
      // Sincronizează procentul cardului selectat
      const cards = userData.discount_cards ?? [];
      const selectedId = userData.selected_discount_card_id;
      const selected = cards.find((c) => c.id === selectedId) ?? cards[0];
      if (selected) setSelectedCardPercent(selected.discount_value);
      try {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      } catch (error) {
        if (__DEV__) console.error('[UserContext] Eroare la salvarea user-ului:', error);
      }
    } else {
      try {
        await AsyncStorage.removeItem(USER_KEY);
        await setToken(null);
      } catch (error) {
        if (__DEV__) console.error('[UserContext] Eroare la ștergerea user-ului:', error);
      }
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser: setUserWithStorage, token, setToken, isLoading, selectedCardPercent, setSelectedCardPercent }}>
      {children}
    </UserContext.Provider>
  );
};
