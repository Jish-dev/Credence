import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { ProviderUser } from "../types/auth";
import { providerLogin } from "../services/authService";

interface AuthContextType {
  user: ProviderUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<ProviderUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("provider_user");
    const token = localStorage.getItem("provider_token");

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser) as ProviderUser);
      } catch {
        localStorage.removeItem("provider_user");
        localStorage.removeItem("provider_token");
      }
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await providerLogin({ email, password });

    if (!response.success || !response.token || !response.user) {
      throw new Error(response.message || "Login failed");
    }

    localStorage.setItem("provider_token", response.token);
    localStorage.setItem("provider_user", JSON.stringify(response.user));

    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("provider_token");
    localStorage.removeItem("provider_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}