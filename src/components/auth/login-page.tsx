'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (view: string) => void;
  onLogin: (user: { id: string; email: string; name: string; role: string }) => void;
}

export default function LoginPage({ onNavigate, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error signing in'); return; }
      onLogin(data.user);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Visual Panel (60%) ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="hidden lg:flex lg:w-[60%] relative bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 items-end p-16"
      >
        {/* Subtle gold radial glow */}
        <div className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse at 30% 60%, rgba(184,149,106,0.3), transparent 70%)' }}
        />
        <div className="relative z-10 max-w-lg">
          <p className="tracking-luxury text-[#b8956a] text-[10px] mb-4">PREMIUM REAL ESTATE PLATFORM</p>
          <h2 className="font-serif-display text-4xl xl:text-5xl text-white/90 leading-tight mb-6">
            Where Excellence Meets Opportunity
          </h2>
          <p className="text-white/40 font-data text-sm leading-relaxed max-w-md">
            Trusted by elite agents across the Caribbean to manage listings, nurture clients, and close with confidence.
          </p>
        </div>
      </motion.div>

      {/* ── Right: Login Form (40%) ──────────────────────── */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 md:p-16 bg-[#FAFAF8]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="mb-12">
            <button
              onClick={() => onNavigate('landing')}
              className="font-serif-display text-2xl tracking-luxury text-[#0a0a0a] hover:text-[#b8956a] transition-colors duration-300"
            >
              PROPOS
            </button>
          </div>

          {/* Heading */}
          <p className="tracking-wide-luxury text-[10px] text-[#b8956a] mb-3">SIGN IN</p>
          <h1 className="font-serif-display text-3xl text-[#0a0a0a] mb-2">Welcome Back</h1>
          <p className="font-data text-sm text-[#71717a] mb-10">
            Access your management dashboard
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50/80 backdrop-blur-sm text-red-700 px-4 py-3 text-xs font-data"
              >
                {error}
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="block tracking-wide-luxury text-[9px] text-[#71717a] mb-2">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-[rgba(0,0,0,0.12)] focus:border-[#0a0a0a] outline-none py-3 font-data text-sm text-[#0a0a0a] placeholder:text-[#71717a]/50 transition-colors duration-300"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block tracking-wide-luxury text-[9px] text-[#71717a] mb-2">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-[rgba(0,0,0,0.12)] focus:border-[#0a0a0a] outline-none py-3 font-data text-sm text-[#0a0a0a] placeholder:text-[#71717a]/50 transition-colors duration-300 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#0a0a0a] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary-luxury w-full flex items-center justify-center gap-3 mt-8 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Bottom link */}
          <div className="mt-12 pt-8 border-t border-[rgba(0,0,0,0.06)]">
            <button
              onClick={() => onNavigate('portal_laura')}
              className="font-data text-xs text-[#71717a] hover:text-[#b8956a] transition-colors duration-300"
            >
              View example agent portal &rarr;
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
