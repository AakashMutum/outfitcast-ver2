'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { MapPin, User, Palette, Save, Check } from 'lucide-react';
import { Preferences } from '@/types';

const styles = ['Casual', 'Professional', 'Sporty', 'Bohemian', 'Minimalist', 'Preppy', 'Streetwear'];
const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function PreferencesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabase());
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [location, setLocation] = useState('');
  const [gender, setGender] = useState('');
  const [style, setStyle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase.from('preferences').select('*').eq('user_id', user.id).single();
        if (error && error.code !== 'PGRST116') console.error('Error fetching preferences:', error);
        else if (data) {
          setPreferences(data);
          setLocation(data.location || '');
          setGender(data.gender || '');
          setStyle(data.style || '');
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
  }, [user, supabase]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const payload = { user_id: user.id, location: location || null, gender: gender || null, style: style || null, updated_at: new Date().toISOString() };
      if (preferences) {
        await supabase.from('preferences').update(payload).eq('id', preferences.id);
      } else {
        await supabase.from('preferences').insert(payload);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error:', error);
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

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen sky-gradient">
      <DashboardNav />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card p-6 sm:p-8">
            <h1 className="font-serif text-3xl text-white mb-2">Preferences</h1>
            <p className="text-white/70 mb-8">Customize your OutfitCast experience</p>

            <div className="mb-6">
              <label className="flex items-center gap-2 text-white/80 text-sm mb-3">
                <MapPin size={18} /> Your Location
              </label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., New York, NY" className="w-full px-4 py-3 rounded-xl glass text-white placeholder-white/50" />
              <p className="text-white/50 text-xs mt-2">Used for weather forecasts and local recommendations</p>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2 text-white/80 text-sm mb-3">
                <User size={18} /> Gender
              </label>
              <div className="flex flex-wrap gap-2">
                {genders.map((g) => (
                  <button key={g} onClick={() => setGender(g)} className={`px-4 py-2 rounded-lg transition-colors ${gender === g ? 'bg-white/30 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="flex items-center gap-2 text-white/80 text-sm mb-3">
                <Palette size={18} /> Preferred Style
              </label>
              <div className="flex flex-wrap gap-2">
                {styles.map((s) => (
                  <button key={s} onClick={() => setStyle(s)} className={`px-4 py-2 rounded-lg transition-colors ${style === s ? 'bg-white/30 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="w-full py-3 px-6 bg-white text-sky-700 rounded-xl font-semibold hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isSaving ? <div className="spinner" /> : saveSuccess ? <><Check size={20} /> Saved!</> : <><Save size={20} /> Save Preferences</>}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
