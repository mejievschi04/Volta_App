// context/UserContext.tsx
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const UserContext = createContext<any>({
  user: null,
  setUser: (u: any) => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // la mount, încercăm să luăm userul din AsyncStorage
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('[UserContext] Eroare la încărcarea user-ului:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Wrapper pentru setUser care salvează automat în AsyncStorage
  const setUserWithStorage = async (userData: any) => {
    setUser(userData);
    if (userData) {
      try {
        await AsyncStorage.setItem("user", JSON.stringify(userData));
      } catch (error) {
        console.error('[UserContext] Eroare la salvarea user-ului:', error);
      }
    } else {
      // Dacă userData este null, șterge din storage
      try {
        await AsyncStorage.removeItem("user");
      } catch (error) {
        console.error('[UserContext] Eroare la ștergerea user-ului:', error);
      }
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser: setUserWithStorage, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};
