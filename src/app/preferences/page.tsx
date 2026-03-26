'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { MapPin, User, Palette, Save, Check, Navigation, Thermometer, Target, Sun } from 'lucide-react';
import { Preferences } from '@/types';

const styles = ['Casual', 'Professional', 'Sporty', 'Bohemian', 'Minimalist', 'Preppy', 'Streetwear'];
const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const tempSensitivities = [
  { value: 'runs_hot', label: '🥵 Feels Hot' },
  { value: 'neutral', label: '😊 Neutral' },
  { value: 'runs_cold', label: '🥶 Feels Cold' },
];
const stylePrefOptions = [
  { value: 'casual', label: 'Casual' },
  { value: 'streetwear', label: 'Streetwear' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'formal', label: 'Formal' },
];
const outfitGoalOptions = [
  { value: 'comfort', label: '😌 Comfort' },
  { value: 'style', label: '✨ Style' },
  { value: 'balanced', label: '⚖️ Balanced' },
];
const colorPrefOptions = [
  { value: 'light', label: '☀️ Light' },
  { value: 'dark', label: '🌙 Dark' },
  { value: 'neutral', label: '🪨 Neutral' },
  { value: 'vibrant', label: '🌈 Vibrant' },
];
const occasionFreqOptions = [
  { value: 'work', label: '💼 Work' },
  { value: 'college', label: '🎓 College' },
  { value: 'gym', label: '🏋️ Gym' },
  { value: 'social', label: '🥂 Social' },
];

function SelectChips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            value === o.value
              ? 'bg-white/30 text-white font-medium'
              : 'bg-white/5 text-white/70 hover:bg-white/15'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PreferencesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabase());
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gender, setGender] = useState('');
  const [style, setStyle] = useState('');
  const [tempSensitivity, setTempSensitivity] = useState('');
  const [stylePref, setStylePref] = useState('');
  const [outfitGoal, setOutfitGoal] = useState('');
  const [colorPref, setColorPref] = useState('');
  const [occasionFreq, setOccasionFreq] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) { console.error('Error fetching preferences:', error); return; }

        if (data) {
          setPreferences(data);
          setLocation(data.location || '');
          setLatitude(data.latitude ?? null);
          setLongitude(data.longitude ?? null);
          setGender(data.gender || '');
          setStyle(data.style || '');
          setTempSensitivity(data.temp_sensitivity || '');
          setStylePref(data.style_pref || '');
          setOutfitGoal(data.outfit_goal || '');
          setColorPref(data.color_pref || '');
          setOccasionFreq(data.occasion_freq || '');
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
  }, [user, supabase]);

  const handleDetectLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setIsDetecting(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { latitude: lat, longitude: lon } = pos.coords;
      setLatitude(lat);
      setLongitude(lon);
      const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
      if (API_KEY) {
        const res = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setLocation(data[0].name || '');
        }
      }
    } catch { /* User denied or timeout */ } finally {
      setIsDetecting(false);
    }
  }, []);

  const geocodeCity = async (cityName: string): Promise<{ lat: number; lon: number } | null> => {
    const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
    if (!API_KEY || !cityName.trim()) return null;
    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${API_KEY}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return { lat: data[0].lat, lon: data[0].lon };
    } catch { /* ignore */ }
    return null;
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      let lat = latitude;
      let lon = longitude;
      if (location.trim() && (lat === null || lon === null)) {
        const coords = await geocodeCity(location);
        if (coords) { lat = coords.lat; lon = coords.lon; }
      }

      const payload = {
        user_id: user.id,
        location: location || null,
        latitude: lat,
        longitude: lon,
        gender: gender || null,
        style: style || null,
        temp_sensitivity: tempSensitivity || null,
        style_pref: stylePref || null,
        outfit_goal: outfitGoal || null,
        color_pref: colorPref || null,
        occasion_freq: occasionFreq || null,
        updated_at: new Date().toISOString(),
      };

      if (preferences) {
        await supabase.from('preferences').update(payload).eq('id', preferences.id);
      } else {
        const { data } = await supabase.from('preferences').insert(payload).select().maybeSingle();
        if (data) setPreferences(data);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen sky-gradient flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) { router.push('/login'); return null; }

  return (
    <div className="min-h-screen sky-gradient">
      <DashboardNav />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card p-6 sm:p-8">
            <h1 className="font-serif text-3xl text-white mb-2">Preferences</h1>
            <p className="text-white/60 mb-8">Tell us about yourself so we can style you better.</p>

            {/* Location */}
            <section className="mb-7">
              <label className="flex items-center gap-2 text-white/80 text-sm font-medium mb-3">
                <MapPin size={16} /> Your Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setLatitude(null); setLongitude(null); }}
                  placeholder="e.g., Chennai, India"
                  className="flex-1 px-4 py-3 rounded-xl glass text-white placeholder-white/40 text-sm"
                />
                <button
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  title="Detect my location"
                  className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDetecting ? <div className="spinner" /> : <Navigation size={16} />}
                </button>
              </div>
              {latitude !== null && longitude !== null && (
                <p className="text-white/30 text-xs mt-1">📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
              )}
              <p className="text-white/40 text-xs mt-1">Used for real-time weather and outfit recommendations</p>
            </section>

            {/* Gender */}
            <section className="mb-7">
              <label className="flex items-center gap-2 text-white/80 text-sm font-medium mb-3">
                <User size={16} /> Gender
              </label>
              <div className="flex flex-wrap gap-2">
                {genders.map((g) => (
                  <button key={g} onClick={() => setGender(g)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${gender === g ? 'bg-white/30 text-white font-medium' : 'bg-white/5 text-white/70 hover:bg-white/15'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </section>

            {/* Style */}
            <section className="mb-7">
              <label className="flex items-center gap-2 text-white/80 text-sm font-medium mb-3">
                <Palette size={16} /> Preferred Style
              </label>
              <div className="flex flex-wrap gap-2">
                {styles.map((s) => (
                  <button key={s} onClick={() => setStyle(s)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${style === s ? 'bg-white/30 text-white font-medium' : 'bg-white/5 text-white/70 hover:bg-white/15'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </section>

            <hr className="border-white/10 mb-7" />

            {/* Temperature Sensitivity */}
            <section className="mb-7">
              <label className="flex items-center gap-2 text-white/80 text-sm font-medium mb-3">
                <Thermometer size={16} /> Temperature Sensitivity
              </label>
              <SelectChips options={tempSensitivities} value={tempSensitivity} onChange={setTempSensitivity} />
            </section>

            {/* Style Preference */}
            <section className="mb-7">
              <label className="flex items-center gap-2 text-white/80 text-sm font-medium mb-3">
                <Palette size={16} /> Style Preference
              </label>
              <SelectChips options={stylePrefOptions} value={stylePref} onChange={setStylePref} />
            </section>

            {/* Outfit Goal */}
            <section className="mb-7">
              <label className="flex items-center gap-2 text-white/80 text-sm font-medium mb-3">
                <Target size={16} /> Outfit Goal
              </label>
              <SelectChips options={outfitGoalOptions} value={outfitGoal} onChange={setOutfitGoal} />
            </section>

            {/* Color Preference */}
            <section className="mb-7">
              <label className="flex items-center gap-2 text-white/80 text-sm font-medium mb-3">
                <Sun size={16} /> Color Preference
              </label>
              <SelectChips options={colorPrefOptions} value={colorPref} onChange={setColorPref} />
            </section>

            {/* Occasion Frequency */}
            <section className="mb-8">
              <label className="flex items-center gap-2 text-white/80 text-sm font-medium mb-3">
                <Target size={16} /> Most Common Occasion
              </label>
              <SelectChips options={occasionFreqOptions} value={occasionFreq} onChange={setOccasionFreq} />
            </section>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3 px-6 bg-white text-sky-700 rounded-xl font-semibold hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <div className="spinner" /> : saveSuccess ? <><Check size={20} /> Saved!</> : <><Save size={20} /> Save Preferences</>}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
