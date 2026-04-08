'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
  avatar?: string;
}

export interface LoginNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  notifications: LoginNotification[];
  unreadNotificationCount: number;
  markAllNotificationsRead: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  supabaseClient: typeof supabase;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LOGIN_EVENT_KEY = 'soar-x-login-event';

const getNotificationsStorageKey = (userId: string) => `soar-x-notifications-${userId}`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<LoginNotification[]>([]);
  const tabSessionIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const ensureSupabaseClient = () => {
    if (!supabase) {
      throw new Error(supabaseConfigError || 'Supabase client is not configured.');
    }
    return supabase;
  };

  // Initialize auth state from Supabase on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            role: session.user.user_metadata?.role || 'viewer',
            avatar: session.user.user_metadata?.avatar || '👤',
          };
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          role: session.user.user_metadata?.role || 'viewer',
          avatar: session.user.user_metadata?.avatar || '👤',
        };
        setUser(userData);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Listen for login events from other tabs and notify currently logged-in user.
  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LOGIN_EVENT_KEY || !event.newValue) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue) as {
          userId: string;
          email: string;
          timestamp: string;
          sessionId: string;
        };

        if (payload.userId !== user.id) {
          return;
        }

        if (payload.sessionId === tabSessionIdRef.current) {
          return;
        }

        const newNotification: LoginNotification = {
          id: `${payload.timestamp}-${payload.sessionId}`,
          title: 'New Login Detected',
          description: `A new login was detected for ${payload.email}.`,
          timestamp: payload.timestamp,
          read: false,
        };

        setNotifications((prev) => {
          const next = [newNotification, ...prev].slice(0, 20);
          localStorage.setItem(getNotificationsStorageKey(user.id), JSON.stringify(next));
          return next;
        });

        toast({
          title: newNotification.title,
          description: `${newNotification.description} ${new Date(payload.timestamp).toLocaleString()}`,
        });
      } catch {
        // Ignore malformed payloads from storage.
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [user]);

  // Load saved notifications for the currently authenticated user.
  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      setNotifications([]);
      return;
    }

    try {
      const stored = localStorage.getItem(getNotificationsStorageKey(user.id));
      if (!stored) {
        setNotifications([]);
        return;
      }
      const parsed = JSON.parse(stored) as LoginNotification[];
      setNotifications(Array.isArray(parsed) ? parsed : []);
    } catch {
      setNotifications([]);
    }
  }, [user]);

  const markAllNotificationsRead = () => {
    if (!user || typeof window === 'undefined') {
      return;
    }

    setNotifications((prev) => {
      const next = prev.map((item) => ({ ...item, read: true }));
      localStorage.setItem(getNotificationsStorageKey(user.id), JSON.stringify(next));
      return next;
    });
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const client = ensureSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem(
          LOGIN_EVENT_KEY,
          JSON.stringify({
            userId: data.user.id,
            email: data.user.email || email,
            timestamp: new Date().toISOString(),
            sessionId: tabSessionIdRef.current,
          })
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const client = ensureSupabaseClient();
      const { error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'viewer',
            avatar: '👤',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (!supabase) {
        setUser(null);
        setNotifications([]);
        return;
      }
      await supabase.auth.signOut();
      setUser(null);
      setNotifications([]);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        notifications,
        unreadNotificationCount: notifications.filter((item) => !item.read).length,
        markAllNotificationsRead,
        login,
        signup,
        logout,
        supabaseClient: supabase
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
