'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { WardrobeItem } from '@/types';
import { Plus, X, Shirt, Footprints, CircleDot, Wind, Sparkles, Trash2 } from 'lucide-react';

interface WardrobeManagerProps {
  items: WardrobeItem[];
  onItemsChange: () => void;
}

const categories = [
  { value: 'top', label: 'Top', icon: Shirt },
  { value: 'bottom', label: 'Bottom', icon: CircleDot },
  { value: 'shoes', label: 'Shoes', icon: Footprints },
  { value: 'outerwear', label: 'Outerwear', icon: Wind },
  { value: 'accessories', label: 'Accessories', icon: Sparkles },
] as const;

const colors = ['Black', 'White', 'Gray', 'Navy', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Beige', 'Silver', 'Gold'];
const seasons = [
  { value: 'all', label: 'All Seasons' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
] as const;

export function WardrobeManager({ items, onItemsChange }: WardrobeManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState<WardrobeItem['category']>('top');
  const [color, setColor] = useState('Black');
  const [season, setSeason] = useState<WardrobeItem['season']>('all');
  const [name, setName] = useState('');
  const { user } = useAuth();
  const [supabase] = useState(() => createBrowserSupabase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('wardrobe_items').insert({
        user_id: user.id,
        category,
        color,
        season,
        name: name || `${color} ${category}`,
      });
      if (!error) {
        setName('');
        setCategory('top');
        setColor('Black');
        setSeason('all');
        setIsModalOpen(false);
        onItemsChange();
      }
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await supabase.from('wardrobe_items').delete().eq('id', id).eq('user_id', user.id);
      onItemsChange();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const getColorClass = (c: string) => {
    const colorMap: Record<string, string> = {
      'Black': 'bg-gray-900', 'White': 'bg-white', 'Gray': 'bg-gray-500', 'Navy': 'bg-blue-900',
      'Blue': 'bg-blue-500', 'Red': 'bg-red-500', 'Green': 'bg-green-500', 'Yellow': 'bg-yellow-400',
      'Pink': 'bg-pink-400', 'Purple': 'bg-purple-500', 'Orange': 'bg-orange-500', 'Brown': 'bg-amber-700',
      'Beige': 'bg-amber-200', 'Silver': 'bg-gray-300', 'Gold': 'bg-yellow-500',
    };
    return colorMap[c] || 'bg-gray-400';
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, WardrobeItem[]>);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl text-white">Your Wardrobe</h2>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-colors">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Shirt size={24} className="text-white/50" />
          </div>
          <p className="text-white/60 text-sm">Your wardrobe is empty</p>
          <p className="text-white/40 text-xs mt-1">Add items to get outfit recommendations</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {categories.map((cat) => {
            const catItems = groupedItems[cat.value] || [];
            if (catItems.length === 0) return null;
            return (
              <div key={cat.value}>
                <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                  <cat.icon size={14} /> {cat.label} <span className="text-white/40">({catItems.length})</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {catItems.map((item) => (
                    <div key={item.id} className="group relative p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${getColorClass(item.color)} border border-white/20`} />
                        <span className="text-white text-sm truncate flex-1">{item.name || item.color}</span>
                        <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="text-white/40 text-xs mt-1 capitalize">{item.season}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl text-white">Add Wardrobe Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Name (optional)</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Blue Denim Jacket" className="w-full px-4 py-3 rounded-xl glass text-white placeholder-white/50" />
              </div>

              <div>
                <label className="text-white/70 text-sm mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button key={cat.value} type="button" onClick={() => setCategory(cat.value)} className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${category === cat.value ? 'bg-white/30 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                      <cat.icon size={20} />
                      <span className="text-xs">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/70 text-sm mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full ${getColorClass(c)} border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent hover:border-white/50'}`} title={c} />
                  ))}
                </div>
                <p className="text-white/50 text-xs mt-2">Selected: {color}</p>
              </div>

              <div>
                <label className="text-white/70 text-sm mb-2 block">Season</label>
                <select value={season} onChange={(e) => setSeason(e.target.value as WardrobeItem['season'])} className="w-full px-4 py-3 rounded-xl glass text-white">
                  {seasons.map((s) => (<option key={s.value} value={s.value} className="bg-sky-800">{s.label}</option>))}
                </select>
              </div>

              <button type="submit" disabled={isLoading} className="w-full py-3 px-6 bg-white text-sky-700 rounded-xl font-semibold hover:bg-white/90 transition-all disabled:opacity-50">
                {isLoading ? <div className="spinner mx-auto" /> : 'Add Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
