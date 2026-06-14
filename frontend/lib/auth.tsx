"use client";

/**
 * AuthProvider — état d'authentification global (token + utilisateur).
 *
 * - En mode démo (NEXT_PUBLIC_API_URL absent) : aucun appel réseau, `user`
 *   reste null et les pages affichent l'utilisateur de démo (lib/demo.ts).
 * - En mode live : au montage, si un token est présent dans le localStorage,
 *   on hydrate l'utilisateur via GET /api/auth/me. login()/register()
 *   stockent le token (lib/api.setToken) et renseignent l'utilisateur.
 *
 * Tolérant aux pannes : si /auth/me échoue (token expiré, backend hors ligne),
 * on nettoie le token et on retombe silencieusement en mode démo.
 */

import * as React from "react";
import {
  api,
  apiEnabled,
  getToken,
  setToken,
  type ApiUser,
} from "@/lib/api";

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  /** API configurée et donc mode live possible. */
  apiEnabled: boolean;
  /** True tant que l'hydratation initiale (auth/me) n'est pas terminée. */
  loading: boolean;
  /** True quand un utilisateur réel est authentifié. */
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<ApiUser | null>(null);
  const [token, setTokenState] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(apiEnabled());

  // Hydratation initiale : seulement en mode live et si un token est stocké.
  React.useEffect(() => {
    if (!apiEnabled()) {
      setLoading(false);
      return;
    }
    const stored = getToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    setTokenState(stored);
    let cancelled = false;
    api
      .me()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        // Token invalide / backend indisponible : on repasse en mode démo.
        if (!cancelled) {
          setToken(null);
          setTokenState(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuth = React.useCallback(
    (nextToken: string, nextUser: ApiUser) => {
      setToken(nextToken);
      setTokenState(nextToken);
      setUser(nextUser);
    },
    [],
  );

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      applyAuth(res.token, res.user);
    },
    [applyAuth],
  );

  const register = React.useCallback(
    async (email: string, username: string, password: string) => {
      const res = await api.register({ email, username, password });
      applyAuth(res.token, res.user);
    },
    [applyAuth],
  );

  const logout = React.useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      apiEnabled: apiEnabled(),
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, token, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans un <AuthProvider>.");
  }
  return ctx;
}
