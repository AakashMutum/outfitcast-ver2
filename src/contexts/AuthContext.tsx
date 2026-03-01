'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { Profile } from '@/types';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabase());

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [supabase]);

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // MOCK AUTHENTICATION FOR DEVELOPMENT
    const mockUser: SupabaseUser = {
      id: 'mock-user-1',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'demo@outfitcast.com',
    } as SupabaseUser;

    const mockProfile: Profile = {
      id: 'mock-user-1',
      username: 'Demo User',
      email: 'demo@outfitcast.com',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      location: 'New York, NY',
      style_preference: 'casual'
    } as Profile;

    setSession({} as Session);
    setUser(mockUser);
    setProfile(mockProfile);
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    router.push('/dashboard');
    return { error: null };
  };

  const signUp = async (email: string, password: string, username: string) => {
    router.push('/dashboard');
    return { error: null };
  };

  const signOut = async () => {
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, isLoading, signIn, signUp, signOut, refreshProfile }}>
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
