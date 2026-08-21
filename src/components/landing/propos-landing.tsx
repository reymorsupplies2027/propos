'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Globe, BarChart3, GitBranch, Calculator, Users, WifiOff,
  Menu, X, Check, Instagram, Linkedin, Twitter
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

const features = [
  { icon: Globe, title: 'White-Label Portal', description: 'Your brand, your domain, your identity. Clients see only your name and logo.' },
  { icon: BarChart3, title: 'Visitor Analytics', description: 'Track every property view, click, and inquiry with real-time behavioral data.' },
  { icon: GitBranch, title: 'Deal Pipeline', description: 'Visualize your entire sales funnel from first inquiry to closing day.' },
  { icon: Calculator, title: 'Tax Management', description: 'Automated tracking for property tax, BIR filings, and compliance deadlines.' },
  { icon: Users, title: 'Client CRM', description: 'Deep client profiles with interaction history, preferences, and follow-up cues.' },
  { icon: WifiOff, title: 'Offline Ready', description: 'Full access to properties, clients, and data — even without a connection.' },
];

const stats = [
  { value: '150+', label: 'Agents' },
  { value: '$2.4B', label: 'In Listings' },
  { value: '12', label: 'Countries' },
  { value: '99.9%', label: 'Uptime' },
];

const navLinks = [
  { label: 'Properties', href: '#platform' },
  { label: 'Platform', href: '#platform' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#cta' },
];

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const }} className={className}>
      {children}
    </motion.div>
  );
}

export default function ProposLanding({ onNavigate }: LandingPageProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ─── Nav ─── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'glass shadow-soft' : ''}`}>
        <div className="container-luxury flex items-center justify-between h-14 md:h-16">
          <span className="font-serif-display tracking-luxury text-sm md:text-base cursor-pointer" onClick={() => onNavigate('login')}>PROPOS</span>
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="font-data text-[11px] tracking-wide-luxury text-[#71717a] hover:text-[#0a0a0a] transition-colors duration-300">{l.label}</a>
            ))}
            <button onClick={() => onNavigate('login')} className="font-data text-[11px] tracking-wide-luxury text-[#0a0a0a] hover:text-[#b8956a] transition-colors duration-300">Sign In</button>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-[#0a0a0a]" aria-label="Menu">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="md:hidden glass border-t border-white/20">
            <div className="container-luxury py-6 flex flex-col gap-4">
              {navLinks.map((l) => (
                <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="font-data text-xs tracking-wide-luxury text-[#71717a]">{l.label}</a>
              ))}
              <button onClick={() => { onNavigate('login'); setMobileOpen(false); }} className="font-data text-xs tracking-wide-luxury text-[#0a0a0a] text-left">Sign In</button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-[70vh] md:min-h-[75vh] flex items-end pb-12 md:pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,149,106,0.12),transparent_60%)]" />
        <div className="relative container-luxury w-full">
          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] as const }} className="glass-dark max-w-xl md:max-w-2xl p-8 md:p-12">
            <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-5">For Real Estate Professionals</p>
            <h1 className="font-serif-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white leading-[1.1] mb-5">Elevate Your Practice</h1>
            <p className="font-data text-sm md:text-base text-white/60 leading-relaxed mb-8 max-w-md">The premium platform that transforms how real estate agents manage, market, and close.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => onNavigate('login')} className="btn-primary-luxury">Get Started</button>
              <button onClick={() => onNavigate('portal_laura')} className="font-data text-xs tracking-wide-luxury font-medium px-8 py-3 rounded-none border border-white/30 text-white bg-transparent hover:bg-white hover:text-[#0a0a0a] transition-all duration-300">View Demo</button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Trust Bar ─── */}
      <section className="border-y border-[rgba(0,0,0,0.06)]">
        <div className="container-luxury">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} className={`py-8 md:py-10 text-center ${i > 0 ? 'border-l border-[rgba(0,0,0,0.06)]' : ''} ${i === 1 ? 'col-start-1 md:col-start-auto border-l-0 md:border-l md:border-[rgba(0,0,0,0.06)]' : ''}`}>
                <FadeIn delay={i * 0.1}>
                  <p className="font-serif-display text-2xl md:text-3xl lg:text-4xl text-[#0a0a0a]">{s.value}</p>
                  <p className="font-data text-[10px] tracking-luxury text-[#71717a] mt-2">{s.label}</p>
                </FadeIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The Platform ─── */}
      <section id="platform" className="section-breath">
        <div className="container-luxury">
          <FadeIn className="text-center mb-14 md:mb-20">
            <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-4">Capabilities</p>
            <h2 className="font-serif-display text-3xl md:text-4xl lg:text-5xl text-[#0a0a0a]">The Platform</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.08}>
                <div className="glass-card p-6 md:p-8 h-full group hover:shadow-elevated transition-shadow duration-500">
                  <f.icon size={20} strokeWidth={1.5} className="text-[#b8956a] mb-5" />
                  <h3 className="font-serif-display text-lg md:text-xl text-[#0a0a0a] mb-3">{f.title}</h3>
                  <p className="font-data text-sm text-[#71717a] leading-relaxed">{f.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Split Section ─── */}
      <section id="about" className="section-breath">
        <div className="container-luxury">
          <div className="grid lg:grid-cols-5 gap-6 md:gap-8 items-stretch min-h-[400px] md:min-h-[520px]">
            <FadeIn className="lg:col-span-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(184,149,106,0.15),transparent_50%)]" />
            </FadeIn>
            <FadeIn delay={0.15} className="lg:col-span-2 flex flex-col justify-center py-10 lg:py-0 lg:pl-8">
              <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-4">White-Label</p>
              <h2 className="font-serif-display text-2xl sm:text-3xl md:text-4xl text-[#0a0a0a] leading-tight mb-5">Your Brand, Your Portal</h2>
              <p className="font-data text-sm text-[#71717a] leading-relaxed mb-8 max-w-sm">Every client touchpoint — from the portal URL to email templates — carries your agency identity. No PROPOS branding, no third-party references.</p>
              <ul className="space-y-3">
                {['Custom domain & branding', 'Branded email communications', 'Client-facing mobile experience', 'SEO-optimized listing pages'].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check size={16} strokeWidth={1.5} className="text-[#b8956a] mt-0.5 shrink-0" />
                    <span className="font-data text-sm text-[#0a0a0a]">{item}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="cta" className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,149,106,0.08),transparent_60%)]" />
        <FadeIn className="relative container-luxury text-center">
          <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-5">Begin Today</p>
          <h2 className="font-serif-display text-3xl md:text-4xl lg:text-5xl text-white mb-5">Ready to Elevate?</h2>
          <p className="font-data text-sm md:text-base text-white/50 max-w-md mx-auto mb-10 leading-relaxed">Join the agents who refuse to settle. Start your free trial — no credit card required.</p>
          <button onClick={() => onNavigate('login')} className="font-data text-xs tracking-wide-luxury font-medium px-8 py-3 rounded-none border border-white/20 text-white bg-white/10 hover:bg-white/20 transition-all duration-300">Create My Account</button>
        </FadeIn>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[rgba(0,0,0,0.06)]">
        <div className="container-luxury flex items-center justify-between h-16">
          <span className="font-serif-display tracking-luxury text-[10px] md:text-xs text-[#0a0a0a]">PROPOS</span>
          <span className="font-data text-[11px] text-[#71717a] hidden sm:block">© {new Date().getFullYear()} All Rights Reserved</span>
          <div className="flex items-center gap-5">
            {[Instagram, Linkedin, Twitter].map((Icon, i) => (
              <button key={i} className="text-[#71717a] hover:text-[#0a0a0a] transition-colors duration-300" aria-label="Social">
                <Icon size={15} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
