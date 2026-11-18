import { useState, useEffect, useCallback } from 'react';
import { api, setTokens, User } from '../api';

export function useAuth(showToast: (message: string, type?: 'success' | 'error' | 'info') => void) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Initial user check
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const refreshToken =
        localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

      if (!token && !refreshToken) {
        await Promise.resolve();
        setUser(null);
        setLoadingUser(false);
        return;
      }

      try {
        const { user } = await api.auth.me();
        setUser(user);
      } catch {
        setTokens({ token: null, refreshToken: null });
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setTokens({ token: null, refreshToken: null });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignoruj ewentualny błąd sieci
    }
    setTokens({ token: null, refreshToken: null });
    setUser(null);
    showToast('Wylogowano pomyślnie', 'info');
  }, [showToast]);

  return {
    user,
    setUser,
    loadingUser,
    handleLogout,
  };
}
