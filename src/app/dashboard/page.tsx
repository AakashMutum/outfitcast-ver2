'use client';

import { useEffect, useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(() => createBrowserSupabase());

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [{ data: wardrobeData }, { data: prefsData }] = await Promise.all([
          supabase.from('wardrobe_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('preferences').select('*').eq('user_id', user.id).single(),
        ]);

        setWardrobeItems(wardrobeData || []);
        if (prefsData) setPreferences(prefsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, supabase]);

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
            <ProfilePanel profile={profile} />
          </div>
          <div className="space-y-6">
            <WeatherSection location={preferences?.location || 'New York'} />
            <OutfitRecommender wardrobeItems={wardrobeItems} location={preferences?.location || 'New York'} />
          </div>
          <div className="space-y-6">
            <WardrobeManager items={wardrobeItems} onItemsChange={refreshWardrobe} />
          </div>
        </div>
      </main>
    </div>
  );
}
