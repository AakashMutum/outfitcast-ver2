'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProfilePanel } from '@/components/dashboard/ProfilePanel';
import { WeatherSection } from '@/components/dashboard/WeatherSection';
import { WardrobeManager } from '@/components/dashboard/WardrobeManager';
import { OutfitRecommender } from '@/components/dashboard/OutfitRecommender';
import { ChatBox } from '@/components/dashboard/ChatBox';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { WardrobeItem, Preferences } from '@/types';

// Shared location object passed to weather components
export interface LocationCoords {
  lat: number;
  lon: number;
  cityName: string;
}

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [outfitCount, setOutfitCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(() => createBrowserSupabase());
  const [coords, setCoords] = useState<LocationCoords | null>(null);

  interface WeatherSnapshot {
    temp: number;
    condition: string;
    humidity: number;
    wind_speed: number;
  }
  const [weatherSnapshot, setWeatherSnapshot] = useState<WeatherSnapshot | null>(null);

  const fetchOutfitCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('outfits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setOutfitCount(count || 0);
    } catch { setOutfitCount(0); }
  }, [user, supabase]);

  // Fetch weather snapshot using lat/lon
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
    if (!API_KEY) return;
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );
      if (!res.ok) return;
      const data = await res.json();
      setWeatherSnapshot({
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        humidity: data.main.humidity,
        wind_speed: Math.round(data.wind.speed * 3.6),
      });
    } catch { /* ignore */ }
  }, []);

  // Auto-detect via browser geolocation → reverse-geocode city name
  const detectLocation = useCallback(async (): Promise<void> => {
    if (!navigator.geolocation) return;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          let cityName = '';
          const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
          if (API_KEY) {
            try {
              const r = await fetch(
                `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
              );
              const d = await r.json();
              cityName = d?.[0]?.name || '';
            } catch { /* ignore */ }
          }
          setCoords({ lat, lon, cityName });
          fetchWeather(lat, lon);
          resolve();
        },
        () => resolve()
      );
    });
  }, [fetchWeather]);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [wardrobeResult, prefsResult] = await Promise.allSettled([
          supabase.from('wardrobe_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('preferences').select('*').eq('user_id', user.id).maybeSingle(),
        ]);

        if (wardrobeResult.status === 'fulfilled' && wardrobeResult.value.data) {
          setWardrobeItems(wardrobeResult.value.data);
        }

        if (prefsResult.status === 'fulfilled' && prefsResult.value.data) {
          const prefs = prefsResult.value.data;
          setPreferences(prefs);

          if (prefs.latitude != null && prefs.longitude != null) {
            // Use stored lat/lon from preferences
            const c: LocationCoords = {
              lat: prefs.latitude,
              lon: prefs.longitude,
              cityName: prefs.location || '',
            };
            setCoords(c);
            fetchWeather(prefs.latitude, prefs.longitude);
          } else {
            // No saved coords → fall back to browser geolocation
            detectLocation();
          }
        } else {
          detectLocation();
        }

        fetchOutfitCount();
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, supabase, fetchOutfitCount, detectLocation, fetchWeather]);

  const refreshWardrobe = async () => {
    if (!user) return;
    const { data } = await supabase.from('wardrobe_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
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

  if (!user) { router.push('/login'); return null; }

  return (
    <div className="min-h-screen sky-gradient">
      <DashboardNav />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="dashboard-grid max-w-7xl mx-auto">
          {/* Column 1 – Profile + Chat */}
          <div className="space-y-6">
            <ProfilePanel profile={profile} outfitCount={outfitCount} wardrobeCount={wardrobeItems.length} />
            <ChatBox wardrobeItems={wardrobeItems} weather={weatherSnapshot} preferences={preferences} />
          </div>

          {/* Column 2 – Weather + Outfit Recommender */}
          <div className="space-y-6">
            <WeatherSection coords={coords} />
            <OutfitRecommender
              wardrobeItems={wardrobeItems}
              coords={coords}
              preferences={preferences}
              onOutfitSaved={fetchOutfitCount}
            />
          </div>

          {/* Column 3 – Wardrobe */}
          <div className="space-y-6">
            <WardrobeManager items={wardrobeItems} onItemsChange={refreshWardrobe} />
          </div>
        </div>
      </main>
    </div>
  );
}
