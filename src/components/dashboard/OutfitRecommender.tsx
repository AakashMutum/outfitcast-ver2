'use client';

import { useState } from 'react';
import { WardrobeItem, Mood, Occasion, Preferences } from '@/types';
import { LocationCoords } from '@/app/dashboard/page';
import {
  Sparkles, Shirt, Footprints, Wind, CircleDot,
  RefreshCw, CheckCircle2, XCircle, Umbrella, Thermometer,
} from 'lucide-react';

interface OutfitRecommenderProps {
  wardrobeItems: WardrobeItem[];
  coords: LocationCoords | null;
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

// ─── Weather helpers ──────────────────────────────────────────────────────────

async function fetchCurrentWeather(coords: LocationCoords | null) {
  const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
  if (!API_KEY || !coords) {
    return { temp: 25, condition: 'Clear', humidity: 50, wind_speed: 10, feels_like: 25 };
  }
  try {
    const { lat, lon } = coords;
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    if (!res.ok) throw new Error('failed');
    const data = await res.json();
    return {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].main as string,
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed * 3.6),
      feels_like: Math.round(data.main.feels_like),
    };
  } catch {
    return { temp: 25, condition: 'Clear', humidity: 50, wind_speed: 10, feels_like: 25 };
  }
}

// ─── Outfit suggestion types ──────────────────────────────────────────────────

interface SuggestedSlot {
  label: string;         // e.g. "Top"
  icon: React.ReactNode;
  found: WardrobeItem | null;   // null = not in wardrobe
  reason?: string;       // e.g. "jacket recommended – cold weather"
  special?: string;      // e.g. "🌂 Bring an umbrella"
}

// ─── Core rule engine ─────────────────────────────────────────────────────────

function getTemperatureCategory(temp: number) {
  if (temp < 10) return "very_cold";
  if (temp < 18) return "chilly";
  if (temp < 26) return "comfortable";
  if (temp < 32) return "warm";
  return "hot";
}

function generateSuggestion(
  weather: { temp: number; condition: string },
  wardrobeItems: WardrobeItem[],
  mood: Mood,
  occasion: Occasion
): { slots: SuggestedSlot[]; summary: string } {
  const byCategory = (cat: WardrobeItem['category']) =>
    wardrobeItems.filter((i) => i.category === cat);

  const tempCategory = getTemperatureCategory(weather.temp);
  const isCold = tempCategory === "very_cold";
  const isChilly = tempCategory === "chilly";
  const isComfortable = tempCategory === "comfortable";
  const isWarm = tempCategory === "warm";
  const isHot = tempCategory === "hot";

  const isRaining = /rain|drizzle|thunderstorm/i.test(weather.condition);
  const isSnowing = /snow|sleet/i.test(weather.condition);
  const isWorkout = occasion === 'workout' || mood === 'sporty';
  const isFormal = occasion === 'work' || occasion === 'date' || mood === 'formal';

  // Rank items within a category (higher score = better match)
  const rank = (items: WardrobeItem[]): WardrobeItem | null => {
    if (!items.length) return null;
    const scored = items.map((item) => {
      let score = 0;
      const nameLower = (item.name || '').toLowerCase();

      // Season match
      if ((isCold || isChilly) && (item.season === 'winter' || item.season === 'fall')) score += 3;
      if ((isWarm || isHot) && (item.season === 'summer' || item.season === 'spring')) score += 3;
      if (item.season === 'all') score += 1;

      // Occasion/mood hints from name
      if (isWorkout && /sport|gym|athletic|jogger|track|running/i.test(nameLower)) score += 4;
      if (isFormal && /shirt|blazer|trouser|formal|dress|suit|oxford|heel/i.test(nameLower)) score += 4;
      if ((isCold || isChilly) && /thermal|sweater|hoodie|fleece|knit|wool/i.test(nameLower)) score += 3;
      if (isRaining && /boot|waterproof/i.test(nameLower)) score += 2;

      return { item, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].item;
  };

  // Outerwear logic – only suggest if cold/chilly/rainy/snowy
  const outerItems = byCategory('outerwear');
  let outerFound: WardrobeItem | null = null;
  let outerReason = '';

  if (isCold || isChilly || isRaining || isSnowing) {
    if (isSnowing) {
      outerFound = outerItems.find((i) => /jacket|coat|puffer|parka|overcoat/i.test(i.name || '')) || rank(outerItems);
      outerReason = "It's snowing – a warm coat is essential";
    } else if (isRaining) {
      outerFound = outerItems.find((i) => /rain|trench|waterproof/i.test(i.name || '')) || rank(outerItems);
      outerReason = "It's raining – grab a waterproof layer";
    } else if (isCold) {
      outerFound = outerItems.find((i) => /jacket|coat|puffer|parka|overcoat/i.test(i.name || '')) || rank(outerItems);
      outerReason = "It's really cold, layering is important";
    } else if (isChilly) {
      outerFound = outerItems.find((i) => /jacket|cardigan|sweatshirt|hoodie|light/i.test(i.name || '')) || rank(outerItems);
      outerReason = "A light layer will keep you comfortable";
    }
  }

  // Shoes logic
  const shoeItems = byCategory('shoes');
  let shoesFound: WardrobeItem | null = null;
  if (isRaining || isSnowing) {
    shoesFound = shoeItems.find((i) => /boot|rain|waterproof/i.test(i.name || '')) || rank(shoeItems);
  } else if (isWorkout) {
    shoesFound = shoeItems.find((i) => /sneaker|trainer|running|sport/i.test(i.name || '')) || rank(shoeItems);
  } else if (isFormal) {
    shoesFound = shoeItems.find((i) => /oxford|heel|loafer|formal|dress/i.test(i.name || '')) || rank(shoeItems);
  } else {
    shoesFound = rank(shoeItems);
  }

  // Build weather summary line
  let tempLabel = 'Nice and comfortable weather';
  if (isCold) tempLabel = "It's freezing out";
  else if (isChilly) tempLabel = "A bit cool today";
  else if (isWarm) tempLabel = "It's getting warm";
  else if (isHot) tempLabel = "It's quite hot today";

  const rainNote = isRaining ? ', rainy' : isSnowing ? ', snowy' : '';
  const summary = `${tempLabel} (${weather.temp}°C${rainNote}) · ${mood} mood · ${occasion}`;

  const slots: SuggestedSlot[] = [
    {
      label: 'Top',
      icon: <Shirt size={20} />,
      found: rank(byCategory('top')),
      reason: isCold ? 'Thick top for the cold' : isChilly ? 'Warm top for cool weather' : (isWarm || isHot) ? 'Light top for the heat' : 'Everyday top',
    },
    {
      label: 'Bottom',
      icon: <CircleDot size={20} />,
      found: rank(byCategory('bottom')),
      reason: isFormal ? 'Smart bottoms for the occasion' : isWorkout ? 'Comfortable bottoms for activity' : 'Casual bottoms',
    },
    {
      label: 'Shoes',
      icon: <Footprints size={20} />,
      found: shoesFound,
      reason: isRaining || isSnowing ? 'Waterproof footwear for wet weather' : isFormal ? 'Formal footwear' : 'Comfortable shoes',
    },
    {
      label: 'Outerwear',
      icon: <Wind size={20} />,
      found: outerFound,
      reason: outerReason,
    },
    {
      label: 'Accessories',
      icon: <Sparkles size={20} />,
      found: rank(byCategory('accessories')),
      reason: 'Complete your look',
      special: isRaining ? '🌂 Carry an umbrella' : isSnowing ? '🧣 Scarf & gloves recommended' : undefined,
    },
  ];

  return { slots, summary };
}

// ─── Color swatch helper ──────────────────────────────────────────────────────

function colorClass(color: string) {
  const map: Record<string, string> = {
    Black: 'bg-gray-900', White: 'bg-white border border-white/30', Gray: 'bg-gray-500',
    Navy: 'bg-blue-900', Blue: 'bg-blue-500', Red: 'bg-red-500', Green: 'bg-green-500',
    Yellow: 'bg-yellow-400', Pink: 'bg-pink-400', Purple: 'bg-purple-500',
    Orange: 'bg-orange-500', Brown: 'bg-amber-700', Beige: 'bg-amber-200',
    Silver: 'bg-gray-300', Gold: 'bg-yellow-500',
  };
  return map[color] || 'bg-gray-400';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OutfitRecommender({ wardrobeItems, coords, preferences, onOutfitSaved }: OutfitRecommenderProps) {
  const [selectedMood, setSelectedMood] = useState<Mood>('happy');
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion>('casual');
  const [slots, setSlots] = useState<SuggestedSlot[] | null>(null);
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suppress unused warning – kept for future use
  void preferences;
  void onOutfitSaved;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setSlots(null);
    try {
      const weather = await fetchCurrentWeather(coords);
      const result = generateSuggestion(weather, wardrobeItems, selectedMood, selectedOccasion);
      setSlots(result.slots);
      setSummary(result.summary);
    } catch {
      setError('Could not generate outfit. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h2 className="font-serif text-xl text-white">Outfit Recommender</h2>
          <p className="text-white/60 text-sm">Smart suggestions based on your wardrobe & weather</p>
        </div>
      </div>

      {/* Mood selector */}
      <div className="mb-4">
        <label className="text-white/70 text-sm mb-2 block">How are you feeling today?</label>
        <div className="flex flex-wrap gap-2">
          {moods.map((m) => (
            <button
              key={m.value}
              onClick={() => setSelectedMood(m.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${selectedMood === m.value ? 'bg-white/30 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
            >
              <span>{m.emoji}</span>
              <span className="text-sm">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Occasion selector */}
      <div className="mb-6">
        <label className="text-white/70 text-sm mb-2 block">What&apos;s the occasion?</label>
        <select
          value={selectedOccasion}
          onChange={(e) => setSelectedOccasion(e.target.value as Occasion)}
          className="w-full px-4 py-3 rounded-xl glass text-white"
        >
          {occasions.map((o) => (
            <option key={o.value} value={o.value} className="bg-sky-800">{o.label}</option>
          ))}
        </select>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || wardrobeItems.length === 0}
        className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isGenerating
          ? <><RefreshCw size={20} className="animate-spin" /> Generating…</>
          : <><Sparkles size={20} /> Generate Outfit</>}
      </button>

      {wardrobeItems.length === 0 && (
        <p className="text-white/50 text-sm text-center mt-3">Add items to your wardrobe first</p>
      )}

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
          {error}
        </div>
      )}

      {/* Results */}
      {slots && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg text-white">Today&apos;s Outfit</h3>
            <span className="flex items-center gap-1 text-white/50 text-xs">
              <Thermometer size={12} /> {summary.split('·')[0].trim()}
            </span>
          </div>

          <div className="space-y-2">
            {slots.map((slot) => {
              const available = slot.found !== null;
              // Only show outerwear row if it was actually recommended (has a reason)
              if (slot.label === 'Outerwear' && !slot.reason) return null;

              return (
                <div
                  key={slot.label}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${available
                    ? 'bg-green-500/10 border-green-500/25'
                    : 'bg-white/5 border-white/10'
                    }`}
                >
                  {/* Category icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${available ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/40'
                    }`}>
                    {slot.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white/50 text-xs mb-0.5">{slot.label}</div>
                    {available && slot.found ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colorClass(slot.found.color)}`} />
                        <span className="text-white text-sm font-medium truncate">
                          {slot.found.name || slot.found.color}
                        </span>
                      </div>
                    ) : (
                      <span className="text-white/40 text-sm italic">Not in your wardrobe</span>
                    )}
                    {slot.reason && (
                      <p className="text-white/40 text-xs mt-0.5 truncate">{slot.reason}</p>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {available
                      ? <CheckCircle2 size={18} className="text-green-400" />
                      : <XCircle size={18} className="text-white/25" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Special tip (umbrella etc.) */}
          {slots.find((s) => s.special) && (
            <div className="mt-3 p-3 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center gap-2">
              <Umbrella size={16} className="text-blue-300 flex-shrink-0" />
              <p className="text-blue-200 text-sm">{slots.find((s) => s.special)?.special}</p>
            </div>
          )}

          {/* Context line */}
          <p className="text-white/30 text-xs text-center mt-4">{summary}</p>
        </div>
      )}
    </div>
  );
}
