// src/app/contexts/AuthContext.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "../utils/api";

// Define user type
export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
};

// Define auth context type
type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  loading: false,
  error: null,
});

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Logout function
  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");

    // Reset state
    setToken(null);
    setUser(null);

    // Redirect to login
    router.push("/login");
  }, [router]);

  // Check if user is logged in on initial load
  // Check if user is logged in on initial load
  useEffect(() => {
    const initAuth = async () => {
      // On initial load, check localStorage for token and user data
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          // Parse user data
          const userData = JSON.parse(storedUser);

          // Set state with stored values
          setToken(storedToken);
          setUser(userData);

          // Validate token with backend using API client
          try {
            // This will use the stored token automatically
            await api.get("/profile");

            // If we get here, token is valid
            // Check current path to determine if redirect needed
            const currentPath = window.location.pathname;

            // If user is at login page or root, redirect to appropriate dashboard
            if (currentPath === "/login" || currentPath === "/") {
              const role = userData.role;
              if (role === "management") {
                router.push("/management/dashboard");
              } else if (role === "planner") {
                router.push("/planner/route-plan");
              } else if (role === "driver") {
                router.push("/driver/route");
              }
            }
          } catch (apiError) {
            // If API call fails (token invalid), logout
            console.error("Token validation failed:", apiError);
            throw new Error("Session expired. Please login again.");
          }
        } catch (error) {
          // Handle errors (e.g., invalid JSON, expired token)
          console.error("Auth initialization error:", error);
          logout();
        }
      }

      setLoading(false);
    };

    initAuth();
  }, [router, logout]);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // Gunakan API client untuk melakukan request
      const response = await api.post(
        "/auth/login",
        { email, password },
        { requireAuth: false }
      );

      // Response sudah dihandle oleh API client, langsung akses data
      const userData = response.data.user;
      const token = response.data.token;

      // Simpan di localStorage dan state
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("userId", userData.id.toString());

      setToken(token);
      setUser(userData);

      // Handle redirect berdasarkan role
      const role = userData.role;
      if (role === "management") {
        router.push("/management/dashboard");
      } else if (role === "planner") {
        router.push("/planner/route-plan");
      } else if (role === "driver") {
        router.push("/driver/route");
      } else {
        // Fallback jika role tidak dikenal
        router.push("/");
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    token,
    login,
    logout,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
