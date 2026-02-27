import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    typeof window !== 'undefined' ? window.sessionStorage.getItem('adminKey') : null
  );
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    if (!token) {
      setChecking(false);
      return false;
    }
    try {
      const res = await api('/admin/verify');
      if (res.ok) {
        setChecking(false);
        return true;
      }
    } catch (e) {}
    setToken(null);
    if (typeof window !== 'undefined') window.sessionStorage.removeItem('adminKey');
    setChecking(false);
    return false;
  }, [token]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handler = () => setToken(null);
    window.addEventListener('admin-unauthorized', handler);
    return () => window.removeEventListener('admin-unauthorized', handler);
  }, []);

  const login = async (username, password) => {
    const base = typeof window !== 'undefined' ? window.location.origin + '/api' : '/api';
    const res = await fetch(`${base}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) {
      setToken(data.token);
      window.sessionStorage.setItem('adminKey', data.token);
      return { ok: true };
    }
    return { ok: false, error: data.error || 'Utilizator sau parolă incorectă' };
  };

  const logout = () => {
    setToken(null);
    window.sessionStorage.removeItem('adminKey');
  };

  return (
    <AuthContext.Provider value={{ token, loggedIn: !!token, checking, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
