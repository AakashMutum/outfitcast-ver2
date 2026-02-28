export interface User {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Preferences {
  id: string;
  user_id: string;
  location: string | null;
  gender: string | null;
  style: string | null;
  updated_at: string;
}

export interface WardrobeItem {
  id: string;
  user_id: string;
  category: 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessories';
  color: string;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'all';
  name?: string;
  image_url?: string;
  created_at: string;
}

export interface WeatherData {
  current: {
    temp: number;
    condition: string;
    icon: string;
    humidity: number;
    wind_speed: number;
    feels_like: number;
  };
  forecast: Array<{
    date: string;
    temp_high: number;
    temp_low: number;
    condition: string;
    icon: string;
  }>;
}

export interface OutfitRecommendation {
  top: WardrobeItem | null;
  bottom: WardrobeItem | null;
  shoes: WardrobeItem | null;
  outerwear: WardrobeItem | null;
  accessories: WardrobeItem[];
  explanation: string;
}

export type Mood = 'happy' | 'chill' | 'formal' | 'sporty' | 'cozy' | 'adventurous';
export type Occasion = 'work' | 'casual' | 'date' | 'workout' | 'party' | 'travel';
