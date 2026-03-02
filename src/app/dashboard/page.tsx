'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProfilePanel } from '@/components/dashboard/ProfilePanel';
import { WeatherSection } from '@/components/dashboard/WeatherSection';
import { WardrobeManager } from '@/components/dashboard/WardrobeManager';
import { OutfitRecommender } from '@/components/dashboard/OutfitRecommender';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { WardrobeItem, Preferences } from '@/types';

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [outfitCount, setOutfitCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(() => createBrowserSupabase());

  const fetchOutfitCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('outfits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setOutfitCount(count || 0);
    } catch {
      // outfits table may not exist yet — that's fine
      setOutfitCount(0);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [wardrobeResult, prefsResult] = await Promise.allSettled([
          supabase.from('wardrobe_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('preferences').select('*').eq('user_id', user.id).single(),
        ]);

        if (wardrobeResult.status === 'fulfilled' && wardrobeResult.value.data) {
          setWardrobeItems(wardrobeResult.value.data);
        }
        if (prefsResult.status === 'fulfilled' && prefsResult.value.data) {
          setPreferences(prefsResult.value.data);
        }

        // Non-blocking
        fetchOutfitCount();
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, supabase, fetchOutfitCount]);

  const refreshWardrobe = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setWardrobeItems(data);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen sky-gradient flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-white/70">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen sky-gradient">
      <DashboardNav />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="dashboard-grid max-w-7xl mx-auto">
          <div className="space-y-6">
            <ProfilePanel profile={profile} outfitCount={outfitCount} wardrobeCount={wardrobeItems.length} />
          </div>
          <div className="space-y-6">
            <WeatherSection location={preferences?.location || 'New York'} />
            <OutfitRecommender
              wardrobeItems={wardrobeItems}
              location={preferences?.location || 'New York'}
              preferences={preferences}
              onOutfitSaved={fetchOutfitCount}
            />
          </div>
          <div className="space-y-6">
            <WardrobeManager items={wardrobeItems} onItemsChange={refreshWardrobe} />
          </div>
        </div>
      </main>
    </div>
  );
}
