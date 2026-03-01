'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Shirt, Settings, LogOut, User } from 'lucide-react';

export function DashboardNav() {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/wardrobe', label: 'Wardrobe', icon: Shirt },
    { href: '/preferences', label: 'Preferences', icon: Settings },
  ];

  return (
    <nav className="glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-white font-serif text-xl font-semibold">OutfitCast</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.username || 'User'} width={32} height={32} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User size={16} className="text-white" />
                )}
              </div>
              <span className="text-white/80 text-sm">{profile?.username || 'User'}</span>
            </div>
            <button onClick={handleSignOut} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all" title="Sign out">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden border-t border-white/10">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
                <Icon size={20} />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
