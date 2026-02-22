'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'admin@soar.com': {
    password: 'admin123',
    user: {
      id: '1',
      email: 'admin@soar.com',
      name: 'Security Admin',
      role: 'admin',
      avatar: '👨‍💼'
    }
  },
  'analyst@soar.com': {
    password: 'analyst123',
    user: {
      id: '2',
      email: 'analyst@soar.com',
      name: 'Security Analyst',
      role: 'analyst',
      avatar: '👩‍💻'
    }
  },
  'viewer@soar.com': {
    password: 'viewer123',
    user: {
      id: '3',
      email: 'viewer@soar.com',
      name: 'Security Viewer',
      role: 'viewer',
      avatar: '👤'
    }
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('soar-x-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('soar-x-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Simulate network delay - reduced to 400ms for faster feedback
    await new Promise((resolve) => setTimeout(resolve, 400));

    const userCredentials = MOCK_USERS[email];

    if (!userCredentials || userCredentials.password !== password) {
      setIsLoading(false);
      throw new Error('Invalid email or password');
    }

    const userData = userCredentials.user;
    setUser(userData);
    localStorage.setItem('soar-x-user', JSON.stringify(userData));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('soar-x-user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
