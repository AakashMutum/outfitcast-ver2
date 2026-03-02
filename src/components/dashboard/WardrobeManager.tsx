'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { uploadImage } from '@/lib/storage';
import { WardrobeItem } from '@/types';
import Image from 'next/image';
import { Plus, X, Shirt, Footprints, CircleDot, Wind, Sparkles, Trash2, ImagePlus, Loader2 } from 'lucide-react';

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { user } = useAuth();
  const [supabase] = useState(() => createBrowserSupabase());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setCategory('top');
    setColor('Black');
    setSeason('all');
    setImageFile(null);
    setImagePreview(null);
    setUploadError(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('File must be an image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    setUploadError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    setUploadError(null);

    try {
      let imageUrl: string | null = null;

      // Upload image if selected
      if (imageFile) {
        const { url, error: uploadErr } = await uploadImage(supabase, imageFile, user.id, 'wardrobe');
        if (uploadErr) {
          setUploadError(uploadErr);
          setIsLoading(false);
          return;
        }
        imageUrl = url;
      }

      const { error } = await supabase.from('wardrobe_items').insert({
        user_id: user.id,
        category,
        color,
        season,
        name: name || `${color} ${category}`,
        image_url: imageUrl,
      });

      if (error) {
        setUploadError(error.message);
      } else {
        resetForm();
        setIsModalOpen(false);
        onItemsChange();
      }
    } catch (error) {
      console.error('Error adding item:', error);
      setUploadError('Failed to add item');
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
                      {item.image_url && (
                        <div className="w-full h-20 rounded-lg overflow-hidden mb-2">
                          <Image src={item.image_url} alt={item.name || item.color} width={160} height={80} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${getColorClass(item.color)} border border-white/20 flex-shrink-0`} />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setIsModalOpen(false); resetForm(); }}>
          <div className="w-full max-w-md p-6 rounded-2xl border border-white/20 max-h-[90vh] overflow-y-auto" style={{ background: 'rgba(30, 40, 70, 0.95)', backdropFilter: 'blur(20px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl text-white">Add Wardrobe Item</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Image Upload */}
              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Photo (optional)</label>
                {imagePreview ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/20">
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center gap-2 text-white/50 hover:text-white/70 transition-colors"
                  >
                    <ImagePlus size={24} />
                    <span className="text-xs">Click to add photo</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Name (optional)</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Blue Denim Jacket" className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }} />
              </div>

              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button key={cat.value} type="button" onClick={() => setCategory(cat.value)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-150 ${category === cat.value ? 'bg-white/25 text-white ring-2 ring-white/40 shadow-lg' : 'bg-white/8 text-white/60 hover:bg-white/15 hover:text-white/90'}`}>
                      <cat.icon size={20} />
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button key={c} type="button" onClick={() => setColor(c)} className={`w-9 h-9 rounded-full ${getColorClass(c)} transition-all duration-150 ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'border border-white/20 hover:border-white/50 hover:scale-105'}`} title={c} />
                  ))}
                </div>
                <p className="text-white/60 text-xs mt-2">Selected: <span className="text-white font-medium">{color}</span></p>
              </div>

              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Season</label>
                <select value={season} onChange={(e) => setSeason(e.target.value as WardrobeItem['season'])} className="w-full px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {seasons.map((s) => (<option key={s.value} value={s.value} className="bg-slate-800 text-white">{s.label}</option>))}
                </select>
              </div>

              {uploadError && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
                  {uploadError}
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full py-3 px-6 bg-white text-sky-800 rounded-xl font-semibold hover:bg-white/90 active:bg-white/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2">
                {isLoading ? <><Loader2 size={20} className="animate-spin" /> Uploading...</> : 'Add Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
