'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { WardrobeItem, OutfitRecommendation, Mood, Occasion, Preferences } from '@/types';
import { Sparkles, Shirt, Footprints, Wind, CircleDot, Sparkle, RefreshCw, Save, Check } from 'lucide-react';

interface OutfitRecommenderProps {
  wardrobeItems: WardrobeItem[];
  location: string;
  preferences?: Preferences | null;
  onOutfitSaved?: () => void;
}

const moods: { value: Mood; label: string; emoji: string }[] = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'chill', label: 'Chill', emoji: '😌' },
  { value: 'formal', label: 'Formal', emoji: '👔' },
  { value: 'sporty', label: 'Sporty', emoji: '⚡' },
  { value: 'cozy', label: 'Cozy', emoji: '🧸' },
  { value: 'adventurous', label: 'Adventurous', emoji: '🏔️' },
];

const occasions: { value: Occasion; label: string }[] = [
  { value: 'casual', label: 'Casual Day' },
  { value: 'work', label: 'Work' },
  { value: 'date', label: 'Date Night' },
  { value: 'workout', label: 'Workout' },
  { value: 'party', label: 'Party' },
  { value: 'travel', label: 'Travel' },
];

async function fetchCurrentWeather(location: string) {
  const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
  if (!API_KEY) {
    return { temp: 25, condition: 'Clear', humidity: 50, wind_speed: 10, feels_like: 25 };
  }
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${API_KEY}&units=metric`
    );
    if (!response.ok) throw new Error('Weather fetch failed');
    const data = await response.json();
    return {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].main,
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed * 3.6),
      feels_like: Math.round(data.main.feels_like),
    };
  } catch {
    return { temp: 25, condition: 'Clear', humidity: 50, wind_speed: 10, feels_like: 25 };
  }
}

export function OutfitRecommender({ wardrobeItems, location, preferences, onOutfitSaved }: OutfitRecommenderProps) {
  const [selectedMood, setSelectedMood] = useState<Mood>('happy');
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion>('casual');
  const [recommendation, setRecommendation] = useState<(OutfitRecommendation & { explanation: string }) | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastWeather, setLastWeather] = useState<{ temp: number; condition: string } | null>(null);
  const { user } = useAuth();
  const [supabase] = useState(() => createBrowserSupabase());

  const handleGenerate = async () => {
    if (wardrobeItems.length === 0) return;
    setIsGenerating(true);
    setError(null);
    setIsSaved(false);

    try {
      const weather = await fetchCurrentWeather(location);
      setLastWeather({ temp: weather.temp, condition: weather.condition });

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wardrobeItems: wardrobeItems.map(item => ({
            id: item.id,
            category: item.category,
            color: item.color,
            season: item.season,
            name: item.name,
          })),
          weather,
          preferences: {
            gender: preferences?.gender || null,
            style: preferences?.style || null,
            location: preferences?.location || location,
          },
          mood: selectedMood,
          occasion: selectedOccasion,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate recommendation');
      }

      const result = await response.json();
      setRecommendation(result);

      // Auto-save the outfit to the outfits table
      if (user) {
        try {
          const { error: saveError } = await supabase.from('outfits').insert({
            user_id: user.id,
            top_id: result.top?.id || null,
            bottom_id: result.bottom?.id || null,
            shoes_id: result.shoes?.id || null,
            outerwear_id: result.outerwear?.id || null,
            accessory_ids: result.accessories?.map((a: WardrobeItem) => a.id) || [],
            explanation: result.explanation,
            mood: selectedMood,
            occasion: selectedOccasion,
            weather_temp: weather.temp,
            weather_condition: weather.condition,
          });

          if (!saveError) {
            setIsSaved(true);
            onOutfitSaved?.();
          } else {
            console.error('Error saving outfit:', saveError);
          }
        } catch (saveErr) {
          console.error('Error saving outfit:', saveErr);
        }
      }
    } catch (err) {
      console.error('Recommendation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate recommendation');
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'top': return <Shirt size={20} />;
      case 'bottom': return <CircleDot size={20} />;
      case 'shoes': return <Footprints size={20} />;
      case 'outerwear': return <Wind size={20} />;
      case 'accessories': return <Sparkle size={20} />;
      default: return <Shirt size={20} />;
    }
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      'Black': 'bg-gray-900', 'White': 'bg-white', 'Gray': 'bg-gray-500', 'Navy': 'bg-blue-900',
      'Blue': 'bg-blue-500', 'Red': 'bg-red-500', 'Green': 'bg-green-500', 'Yellow': 'bg-yellow-400',
      'Pink': 'bg-pink-400', 'Purple': 'bg-purple-500', 'Orange': 'bg-orange-500', 'Brown': 'bg-amber-700',
      'Beige': 'bg-amber-200', 'Silver': 'bg-gray-300', 'Gold': 'bg-yellow-500',
    };
    return colorMap[color] || 'bg-gray-400';
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h2 className="font-serif text-xl text-white">AI Outfit Recommender</h2>
          <p className="text-white/60 text-sm">Powered by smart style AI</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-white/70 text-sm mb-2 block">How are you feeling today?</label>
        <div className="flex flex-wrap gap-2">
          {moods.map((m) => (
            <button key={m.value} onClick={() => setSelectedMood(m.value)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${selectedMood === m.value ? 'bg-white/30 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
              <span>{m.emoji}</span>
              <span className="text-sm">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-white/70 text-sm mb-2 block">What&apos;s the occasion?</label>
        <select value={selectedOccasion} onChange={(e) => setSelectedOccasion(e.target.value as Occasion)} className="w-full px-4 py-3 rounded-xl glass text-white">
          {occasions.map((o) => (<option key={o.value} value={o.value} className="bg-sky-800">{o.label}</option>))}
        </select>
      </div>

      <button onClick={handleGenerate} disabled={isGenerating || wardrobeItems.length === 0} className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {isGenerating ? <><RefreshCw size={20} className="animate-spin" /> Generating...</> : <><Sparkles size={20} /> Generate Outfit</>}
      </button>

      {wardrobeItems.length === 0 && <p className="text-white/50 text-sm text-center mt-3">Add items to your wardrobe first</p>}

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
          {error}
        </div>
      )}

      {recommendation && (
        <div className="mt-6 p-4 rounded-xl bg-white/10 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg text-white">Your Perfect Outfit</h3>
            {isSaved && (
              <span className="flex items-center gap-1 text-green-300 text-xs">
                <Check size={14} /> Saved
              </span>
            )}
          </div>
          <div className="space-y-3">
            {recommendation.top && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70">{getCategoryIcon('top')}</div>
                <div className="flex-1">
                  <div className="text-white/60 text-xs">Top</div>
                  <div className="text-white flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getColorClass(recommendation.top.color)}`} />
                    {recommendation.top.name || recommendation.top.color}
                  </div>
                </div>
              </div>
            )}
            {recommendation.bottom && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70">{getCategoryIcon('bottom')}</div>
                <div className="flex-1">
                  <div className="text-white/60 text-xs">Bottom</div>
                  <div className="text-white flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getColorClass(recommendation.bottom.color)}`} />
                    {recommendation.bottom.name || recommendation.bottom.color}
                  </div>
                </div>
              </div>
            )}
            {recommendation.shoes && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70">{getCategoryIcon('shoes')}</div>
                <div className="flex-1">
                  <div className="text-white/60 text-xs">Shoes</div>
                  <div className="text-white flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getColorClass(recommendation.shoes.color)}`} />
                    {recommendation.shoes.name || recommendation.shoes.color}
                  </div>
                </div>
              </div>
            )}
            {recommendation.outerwear && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70">{getCategoryIcon('outerwear')}</div>
                <div className="flex-1">
                  <div className="text-white/60 text-xs">Outerwear</div>
                  <div className="text-white flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getColorClass(recommendation.outerwear.color)}`} />
                    {recommendation.outerwear.name || recommendation.outerwear.color}
                  </div>
                </div>
              </div>
            )}
            {recommendation.accessories.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70">{getCategoryIcon('accessories')}</div>
                <div className="flex-1">
                  <div className="text-white/60 text-xs">Accessories</div>
                  <div className="text-white flex items-center gap-2 flex-wrap">
                    {recommendation.accessories.map((acc, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${getColorClass(acc.color)}`} />
                        {acc.name || acc.color}{i < recommendation.accessories.length - 1 && ','}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="text-purple-300 mt-0.5 flex-shrink-0" />
              <p className="text-purple-200 text-sm">{recommendation.explanation}</p>
            </div>
          </div>
          {lastWeather && (
            <p className="text-white/40 text-xs mt-3 text-center">
              Generated for {lastWeather.temp}°C, {lastWeather.condition} • {selectedMood} mood • {selectedOccasion}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
