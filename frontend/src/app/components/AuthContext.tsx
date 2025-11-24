// frontend/src/app/components/AuthContext.tsx
'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

interface User {
  id: number;
  f_name: string;
  l_name: string;
  email: string;
  affiliation: string;
  group_id: number;
  class: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      console.log("Attempting to fetch user data from API...");
      const response = await fetch(`${API_BASE_URL}/auth/user`, { 
        credentials: "include" 
      });
      
      if (response.ok) {
        console.log("User data fetched successfully.");
        const userData = await response.json();
        setUser(userData);
        console.log("User data:", userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      console.log("loading complete.");
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Fetching user data...");
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refetchUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}