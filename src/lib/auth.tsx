import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "./api";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(api.auth.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (api.auth.isLoggedIn()) {
      api.auth.me()
        .then((res) => setUser(res.user))
        .catch(() => {
          api.auth.logout();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.auth.login({ email, password });
    setUser(result.user);
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const result = await api.auth.register({ name, email, password, phone });
    setUser(result.user);
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isLoggedIn: !!user,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
