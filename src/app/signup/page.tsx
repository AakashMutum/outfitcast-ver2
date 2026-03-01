'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Cloud, Sun, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await signUp(email, password, username);
      if (signUpError) {
        setError(signUpError.message || 'Failed to create account');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen sky-gradient flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Cloud className="absolute text-white/20 w-32 h-16 top-20 left-10 animate-float" />
        <Cloud className="absolute text-white/15 w-24 h-12 top-40 right-20 animate-float" style={{ animationDelay: '1s' }} />
        <Sun className="absolute text-yellow-300/30 w-20 h-20 top-10 right-10 animate-pulse" />
      </div>

      <div className="glass-card w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-white mb-2">Create Account</h1>
          <p className="text-white/70">Start dressing smarter today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              className="w-full px-4 py-3 rounded-xl glass text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              required
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl glass text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              required
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl glass text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-white/50 text-xs mt-1">Must be at least 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-6 bg-white text-sky-700 rounded-xl font-semibold hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <div className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-white/50 text-sm">or</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        <p className="text-center text-white/70">
          Already have an account?{' '}
          <Link href="/login" className="text-white font-semibold hover:underline">Sign in</Link>
        </p>

        <p className="text-center mt-4">
          <Link href="/" className="text-white/50 text-sm hover:text-white/70">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
