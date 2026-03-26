'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { Profile, Preferences, WardrobeItem } from '@/types';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  preferences: Preferences | null;
  wardrobeItems: WardrobeItem[] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[] | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabaseRef = useRef(createBrowserSupabase());
  const supabase = supabaseRef.current;

  // Fetch user data (profile, preferences, wardrobe) — non-blocking for auth loading
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fire all three in parallel, don't block each other
      const [profileResult, prefsResult, wardrobeResult] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('preferences').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('wardrobe_items').select('*').eq('user_id', userId),
      ]);

      if (profileResult.status === 'fulfilled' && profileResult.value.data) {
        setProfile(profileResult.value.data as Profile);
      }
      if (prefsResult.status === 'fulfilled') {
        if (prefsResult.value.data) {
          setPreferences(prefsResult.value.data as Preferences);
        } else if (!prefsResult.value.error) {
          // No preferences row exists, create a default one
          const { data: newPrefs } = await supabase
            .from('preferences')
            .insert({ user_id: userId })
            .select()
            .maybeSingle();
          if (newPrefs) setPreferences(newPrefs as Preferences);
        }
      }
      if (wardrobeResult.status === 'fulfilled' && wardrobeResult.value.data) {
        setWardrobeItems(wardrobeResult.value.data as WardrobeItem[]);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  }, [user?.id, fetchUserData]);

  useEffect(() => {
    let mounted = true;

    // Safety timeout — always stop loading after 8 seconds no matter what
    const timeout = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 8000);

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Resolve loading immediately after session check — don't wait for profile/prefs/wardrobe
        setIsLoading(false);

        // Fetch user data in background (non-blocking)
        if (currentSession?.user) {
          fetchUserData(currentSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Fetch in background, don't block
          fetchUserData(newSession.user.id);
        } else {
          setProfile(null);
          setPreferences(null);
          setWardrobeItems(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserData]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setPreferences(null);
      setWardrobeItems(null);
      setSession(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, isLoading, signIn, signUp, signOut, refreshProfile, preferences, wardrobeItems }}>
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
