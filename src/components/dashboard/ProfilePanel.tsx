'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { uploadImage } from '@/lib/storage';
import { User, Camera, Edit2, Check, X, Loader2 } from 'lucide-react';
import { Profile } from '@/types';

interface ProfilePanelProps {
  profile: Profile | null;
  outfitCount?: number;
  wardrobeCount?: number;
}

export function ProfilePanel({ profile, outfitCount = 0, wardrobeCount = 0 }: ProfilePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { user, refreshProfile } = useAuth();
  const [supabase] = useState(() => createBrowserSupabase());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ username }).eq('id', user.id);
      if (!error) {
        await refreshProfile();
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    if (!user) return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const { url, error: uploadErr } = await uploadImage(supabase, file, user.id, 'avatars');

      if (uploadErr || !url) {
        setUploadError(uploadErr || 'Upload failed');
        return;
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      if (updateErr) {
        setUploadError('Failed to save avatar');
        return;
      }

      await refreshProfile();
    } catch {
      setUploadError('Failed to upload avatar');
    } finally {
      setIsUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="glass-card p-6">
      <h2 className="font-serif text-xl text-white mb-6">Your Profile</h2>

      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30">
            {isUploading ? (
              <Loader2 size={32} className="text-white/70 animate-spin" />
            ) : profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username || 'User'} width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-white/70" />
            )}
          </div>
          <button
            onClick={handleAvatarClick}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors border border-white/30 disabled:opacity-50"
            title="Change avatar"
          >
            <Camera size={14} className="text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        {uploadError && (
          <p className="text-red-300 text-xs mt-2">{uploadError}</p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-white/60 text-xs uppercase tracking-wider">Username</label>
          {isEditing ? (
            <div className="mt-1 space-y-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg glass text-white text-sm"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button onClick={handleSave} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm transition-colors">
                  {isLoading ? <div className="spinner w-4 h-4" /> : <><Check size={14} /> Save</>}
                </button>
                <button onClick={() => { setUsername(profile?.username || ''); setIsEditing(false); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm transition-colors">
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-1">
              <span className="text-white font-medium">{profile?.username || 'Not set'}</span>
              <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-white/60 text-xs uppercase tracking-wider">Email</label>
          <p className="text-white/80 text-sm mt-1 truncate">{profile?.email || user?.email}</p>
        </div>

        <div>
          <label className="text-white/60 text-xs uppercase tracking-wider">Member Since</label>
          <p className="text-white/80 text-sm mt-1">
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Just now'}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className="font-serif text-2xl text-white">{outfitCount}</div>
            <div className="text-white/50 text-xs">Outfits</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className="font-serif text-2xl text-white">{wardrobeCount}</div>
            <div className="text-white/50 text-xs">Wardrobe</div>
          </div>
        </div>
      </div>
    </div>
  );
}
