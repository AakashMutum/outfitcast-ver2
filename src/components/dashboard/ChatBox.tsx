'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { WardrobeItem, Preferences } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserSupabase } from '@/lib/supabase-browser';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatBoxProps {
  wardrobeItems?: WardrobeItem[];
  weather?: { temp: number; condition: string; humidity: number; wind_speed: number } | null;
  preferences?: Preferences | null;
}

const FALLBACK = "I'm having trouble right now, try again.";

export function ChatBox({ wardrobeItems = [], weather = null, preferences = null }: ChatBoxProps) {
  const { user } = useAuth();
  const [supabase] = useState(() => createBrowserSupabase());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Load last 20 messages on mount ---
  const loadHistory = useCallback(async () => {
    if (!user) {
      setIsLoadingHistory(false);
      setMessages([{ role: 'assistant', text: "Hi! I'm your OutfitCast assistant 👗 Ask me anything about what to wear today!" }]);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, message, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages(data.map((r) => ({ role: r.role as Message['role'], text: r.message })));
      } else {
        setMessages([{ role: 'assistant', text: "Hi! I'm your OutfitCast assistant 👗 Ask me anything about what to wear today!" }]);
      }
    } catch (err) {
      console.error('[ChatBox] Failed to load history:', err);
      setMessages([{ role: 'assistant', text: "Hi! I'm your OutfitCast assistant 👗 Ask me anything about what to wear today!" }]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user, supabase]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // --- Save a single message to DB ---
  const saveMessage = async (role: Message['role'], text: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('chat_messages')
      .insert({ user_id: user.id, role, message: text });
    if (error) console.error('[ChatBox] Failed to save message:', error);
  };

  // --- Clear chat history ---
  const clearChat = async () => {
    if (!user || isLoading) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      setMessages([{ role: 'assistant', text: "Hi! I'm your OutfitCast assistant 👗 Ask me anything about what to wear today!" }]);
    } catch (err) {
      console.error('[ChatBox] Failed to clear chat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Send message ---
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    const userMsg: Message = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Save user message to DB (non-blocking)
    saveMessage('user', text);

    try {
      // Add a small natural typing delay to feel less robotic
      const typingDelay = 300 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, typingDelay));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          wardrobe: wardrobeItems,
          weather,
          preferences,
        }),
      });

      const data = await res.json();
      const reply = data.reply || FALLBACK;

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);

      // Save AI reply to DB (non-blocking)
      saveMessage('assistant', reply);
    } catch (err) {
      console.error('[ChatBox] Fetch error:', err);
      const fallbackMsg: Message = { role: 'assistant', text: FALLBACK };
      setMessages((prev) => [...prev, fallbackMsg]);
      saveMessage('assistant', FALLBACK);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="glass-card p-6 flex flex-col h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-white">Style Assistant</h2>
            <p className="text-white/50 text-xs">Powered by Gemini · history saved</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          disabled={isLoading || messages.length <= 1}
          title="Clear Chat"
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Message list — min-h-0 is REQUIRED for flex children to scroll correctly */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="text-white/40 animate-spin" />
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.role === 'assistant' ? 'bg-gradient-to-br from-indigo-400 to-purple-400' : 'bg-white/20'
                }`}>
                  {msg.role === 'assistant' ? <Bot size={14} className="text-white" /> : <User size={14} className="text-white" />}
                </div>
                {/* Bubble */}
                <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-white/20 text-white rounded-br-sm'
                    : 'bg-white/10 text-white/90 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-400">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/10 flex items-center gap-1.5">
                  <span className="text-white/60 text-xs">Stylist is thinking</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 mt-4 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your outfit…"
          disabled={isLoading || isLoadingHistory}
          className="flex-1 px-4 py-2.5 rounded-xl glass text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim() || isLoadingHistory}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
