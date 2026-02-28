'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { WardrobeManager } from '@/components/dashboard/WardrobeManager';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { WardrobeItem } from '@/types';

export default function WardrobePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabase());
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWardrobe = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('wardrobe_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) console.error('Error fetching wardrobe:', error);
      else setWardrobeItems(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchWardrobe();
  }, [user, supabase]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen sky-gradient flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-white/70">Loading your wardrobe...</p>
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="font-serif text-3xl text-white mb-2">Your Wardrobe</h1>
            <p className="text-white/70">Manage your clothes for better outfit recommendations</p>
          </div>

          <WardrobeManager items={wardrobeItems} onItemsChange={fetchWardrobe} />

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
            {['top', 'bottom', 'shoes', 'outerwear', 'accessories'].map((category) => {
              const count = wardrobeItems.filter(item => item.category === category).length;
              return (
                <div key={category} className="glass-card p-4 text-center">
                  <div className="font-serif text-2xl text-white">{count}</div>
                  <div className="text-white/50 text-sm capitalize">{category}s</div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
