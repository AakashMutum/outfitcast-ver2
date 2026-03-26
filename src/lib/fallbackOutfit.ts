import { WardrobeItem } from '@/types';

interface WeatherParams {
  temp?: number;
  condition?: string;
  feels_like?: number;
}

interface FallbackParams {
  wardrobe: WardrobeItem[];
  weather: WeatherParams;
  mood?: string;
  occasion?: string;
  preferences?: { style?: string; gender?: string };
}

interface FallbackResult {
  outfit: {
    top: WardrobeItem | null;
    bottom: WardrobeItem | null;
    shoes: WardrobeItem | null;
    outerwear: WardrobeItem | null;
    accessories: WardrobeItem[];
  };
  explanation: string;
}

export function generateFallbackOutfit({
  wardrobe,
  weather,
  mood,
  occasion,
  preferences,
}: FallbackParams): FallbackResult {
  const temp = weather.feels_like ?? weather.temp ?? 22; // Default to moderate if not provided
  const condition = (weather.condition || 'Clear').toLowerCase();
  
  const isCold = temp < 18;
  const isHot = temp > 28;
  const isRaining = condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunderstorm');
  const isSnowing = condition.includes('snow');

  const byCategory = (cat: string) => wardrobe.filter((item) => item.category === cat);

  // Simple scoring system
  const rank = (items: WardrobeItem[], rules: (i: WardrobeItem) => number): WardrobeItem | null => {
    if (!items || items.length === 0) return null;
    const scored = items.map((item) => ({ item, score: rules(item) }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].item;
  };

  const top = rank(byCategory('top'), (item) => {
    let score = 0;
    const name = (item.name || '').toLowerCase();
    
    if (isCold && (item.season === 'winter' || item.season === 'fall' || name.includes('sweater') || name.includes('long sleeve'))) score += 3;
    if (isHot && (item.season === 'summer' || name.includes('t-shirt') || name.includes('tank'))) score += 3;
    
    if (occasion === 'work' && (name.includes('shirt') || name.includes('blouse'))) score += 2;
    if (mood === 'sporty' && name.includes('athletic')) score += 2;
    
    return score;
  });

  const bottom = rank(byCategory('bottom'), (item) => {
    let score = 0;
    const name = (item.name || '').toLowerCase();
    
    if (isCold && (name.includes('jeans') || name.includes('pants') || name.includes('trousers'))) score += 3;
    if (isHot && (name.includes('shorts') || name.includes('skirt'))) score += 3;
    
    if (occasion === 'work' && name.includes('trousers')) score += 2;
    if (mood === 'cozy' && name.includes('sweatpants')) score += 2;
    
    return score;
  });

  const shoes = rank(byCategory('shoes'), (item) => {
    let score = 0;
    const name = (item.name || '').toLowerCase();
    
    if (isRaining && (name.includes('boot') || name.includes('waterproof'))) score += 4;
    if (isHot && name.includes('sandal')) score += 2;
    if (occasion === 'work') score += 1;
    
    return score;
  });

  const outerwear = isCold || isRaining || isSnowing ? rank(byCategory('outerwear'), (item) => {
    let score = 0;
    const name = (item.name || '').toLowerCase();
    
    if (isSnowing && (name.includes('coat') || name.includes('puffer'))) score += 3;
    if (isRaining && (name.includes('rain') || name.includes('waterproof') || name.includes('jacket'))) score += 3;
    if (isCold && name.includes('jacket')) score += 2;
    
    return score;
  }) : null;

  const accessories = byCategory('accessories').filter((item) => {
    const name = (item.name || '').toLowerCase();
    if (isCold && name.includes('scarf')) return true;
    if (isHot && (name.includes('sunglasses') || name.includes('hat'))) return true;
    if (isRaining && name.includes('umbrella')) return true;
    return false;
  }).slice(0, 2);

  let explanation = '';
  if (isCold) explanation += 'It is cold outside, so I prioritized warm clothing and layers. ';
  else if (isHot) explanation += 'It is hot today, so I went with light, breathable clothes. ';
  else explanation += 'The weather is moderate, so I chose a comfortable balanced outfit. ';

  if (isRaining) explanation += 'Since it might rain, I suggested suitable footwear or outerwear. ';

  return {
    outfit: { top, bottom, shoes, outerwear, accessories },
    explanation: explanation.trim()
  };
}
