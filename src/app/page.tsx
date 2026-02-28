'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Cloud, Sun, Wind } from 'lucide-react';

function CloudSVG({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 100" className={className} style={style} fill="currentColor">
      <path d="M25,60 Q35,40 55,45 Q65,25 90,30 Q105,15 130,25 Q155,20 165,45 Q185,50 175,75 Q170,90 145,85 L45,85 Q20,85 25,60Z" />
    </svg>
  );
}

function FlyingBird({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 40" className={className} style={style} fill="currentColor">
      <path d="M30,20 Q20,10 5,15 Q15,5 30,12 Q45,5 55,15 Q40,10 30,20Z" />
      <path d="M30,20 Q25,25 15,28 Q22,22 30,20 Q38,22 45,28 Q35,25 30,20Z" opacity="0.7" />
    </svg>
  );
}

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleGetForecast = () => {
    if (user) router.push('/dashboard');
    else router.push('/login');
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #8B9DC3 0%, #A8B8D8 20%, #C4D0E8 45%, #D4A5C4 75%, #E8B4D0 90%, #8B9DC3 100%)',
    }}>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-white font-serif text-xl font-semibold">OutfitCast</span>
            </Link>

            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="spinner" />
              ) : user ? (
                <>
                  <Link href="/dashboard" className="px-4 py-2 text-white/90 hover:text-white transition-colors text-sm font-medium">Dashboard</Link>
                  <Link href="/dashboard" className="px-5 py-2.5 bg-white text-sky-700 rounded-full text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg">My Forecast</Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-2 text-white/90 hover:text-white transition-colors text-sm font-medium">Sign In</Link>
                  <Link href="/signup" className="px-5 py-2.5 bg-white text-sky-700 rounded-full text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <CloudSVG className="absolute text-[#E8B4D0]/80 w-[500px] h-[250px]" style={{ bottom: '-5%', left: '-10%', animation: 'float 8s ease-in-out infinite' }} />
        <CloudSVG className="absolute text-[#E8B4D0]/70 w-[400px] h-[200px]" style={{ bottom: '0%', left: '20%', animation: 'float 10s ease-in-out infinite 1s' }} />
        <CloudSVG className="absolute text-[#E8B4D0]/60 w-[450px] h-[225px]" style={{ bottom: '-3%', right: '10%', animation: 'float 9s ease-in-out infinite 0.5s' }} />
        <CloudSVG className="absolute text-[#E8B4D0]/75 w-[350px] h-[175px]" style={{ bottom: '5%', right: '-5%', animation: 'float 7s ease-in-out infinite 1.5s' }} />
        <CloudSVG className="absolute text-white/30 w-[200px] h-[100px]" style={{ top: '30%', left: '5%', animation: 'drift 40s linear infinite' }} />
        <CloudSVG className="absolute text-white/25 w-[180px] h-[90px]" style={{ top: '20%', right: '15%', animation: 'drift 35s linear infinite 5s' }} />
        <FlyingBird className="absolute text-amber-700/80 w-16 h-10" style={{ top: '15%', animation: 'fly 25s linear infinite' }} />
        <FlyingBird className="absolute text-amber-700/60 w-12 h-8" style={{ top: '25%', animation: 'fly 30s linear infinite 3s' }} />
        <FlyingBird className="absolute text-amber-700/70 w-14 h-9" style={{ top: '10%', animation: 'fly 28s linear infinite 8s' }} />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center pt-20">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-6 drop-shadow-lg">
            Dress for the
            <br />
            Atmosphere.
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            OutfitCast uses hyper-local weather data and your style preferences to recommend the perfect outfit every day.
          </p>
          <button onClick={handleGetForecast} className="group inline-flex items-center gap-3 px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white font-semibold transition-all duration-300 border border-white/30 hover:border-white/50 shadow-lg">
            {user ? 'Go to Dashboard' : 'Get Your First Forecast'}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <Cloud size={24} className="text-white" />
              </div>
              <h3 className="font-serif text-xl text-white mb-2">Weather Smart</h3>
              <p className="text-white/70 text-sm">Real-time weather analysis for perfect outfit choices</p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <Sun size={24} className="text-white" />
              </div>
              <h3 className="font-serif text-xl text-white mb-2">AI Powered</h3>
              <p className="text-white/70 text-sm">Personalized recommendations based on your style</p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <Wind size={24} className="text-white" />
              </div>
              <h3 className="font-serif text-xl text-white mb-2">Your Wardrobe</h3>
              <p className="text-white/70 text-sm">Manage your clothes and get smart outfit ideas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to top, #8B9DC3, transparent)' }} />
    </div>
  );
}
