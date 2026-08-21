'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, ArrowRight, BarChart3, Eye, Smartphone,
  DollarSign, Users, Globe, Check, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

const features = [
  {
    icon: BarChart3,
    title: 'Personal Dashboard',
    description: 'Complete dashboard with property inventory, visitor metrics, and tax obligation tracking all in one place.'
  },
  {
    icon: Eye,
    title: 'Visitor Analytics',
    description: 'Know where they click, how many times they view each property, and how much time they spend. Real data to better serve your prospects.'
  },
  {
    icon: Smartphone,
    title: 'Works Offline',
    description: 'Offline-first PWA. Review your inventory, clients, and key data even without a connection. Syncs when you are back online.'
  },
  {
    icon: Globe,
    title: 'White-Label Portal',
    description: 'Your brand, your colors, your name. Your clients will never know you use a platform. It looks like your own website.'
  },
  {
    icon: DollarSign,
    title: 'Tax Management',
    description: 'Keep track of BIR, property tax, NIS and more. Due date alerts and digital receipts.'
  },
  {
    icon: Users,
    title: 'Client Management',
    description: 'Integrated CRM with inquiry history, deal tracking, and lead-to-client conversion.'
  }
];

const stats = [
  { value: '100%', label: 'Your Brand' },
  { value: '24/7', label: 'Available' },
  { value: 'TTD', label: 'Local Currency' },
  { value: '0', label: 'Hidden Fees' }
];

export default function ProposLanding({ onNavigate }: LandingPageProps) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-[#1B4332] text-lg">PROPOS</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-[#6B7280] hover:text-[#1B4332] transition-colors">Features</button>
            <button onClick={() => onNavigate('portal_laura')} className="text-sm text-[#6B7280] hover:text-[#1B4332] transition-colors">View Demo</button>
            <Button onClick={() => onNavigate('login')} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white">
              Sign In
            </Button>
          </div>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-[#1B4332]">
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-[#f0ece4] p-4 space-y-3">
            <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenu(false); }} className="block w-full text-left py-2 text-sm text-[#6B7280]">Features</button>
            <button onClick={() => { onNavigate('portal_laura'); setMobileMenu(false); }} className="block w-full text-left py-2 text-sm text-[#6B7280]">View Demo</button>
            <Button onClick={() => { onNavigate('login'); setMobileMenu(false); }} className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white">Sign In</Button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <Badge className="mb-6 bg-[#1B4332]/10 text-[#1B4332] hover:bg-[#1B4332]/15 border-0 px-4 py-1.5 text-sm font-medium">
              Designed for Trinidad & the Caribbean
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-[#1a1a1a] leading-tight mb-6">
              Your real estate business,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1B4332] to-[#D4A373]">
                powered by data
              </span>
            </h1>
            <p className="text-lg md:text-xl text-[#6B7280] max-w-2xl mx-auto mb-10 leading-relaxed">
              The SaaS platform that gives you a personal dashboard, real-time visitor analytics, a white-label portal, and full control over your properties and clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => onNavigate('login')}
                size="lg"
                className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white h-13 px-8 text-base"
              >
                Get Started Now <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={() => onNavigate('portal_laura')}
                variant="outline"
                size="lg"
                className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332]/5 h-13 px-8 text-base"
              >
                View Example Portal
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-[#1B4332]">{stat.value}</div>
                <div className="text-sm text-[#9A9A9A] mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-4">Everything you need</h2>
            <p className="text-[#6B7280] max-w-xl mx-auto">Professional tools designed specifically for real estate agents in the Caribbean.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="border-0 shadow-md shadow-black/5 hover:shadow-lg hover:shadow-black/10 transition-all duration-300 h-full bg-white">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-[#1B4332]/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-[#1B4332]" />
                    </div>
                    <h3 className="font-semibold text-[#1a1a1a] text-lg mb-2">{feature.title}</h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] rounded-3xl p-10 md:p-16 text-center text-white">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Start managing your business better</h2>
              <p className="text-white/80 mb-8 max-w-lg mx-auto">Join real estate professionals who already use PROPOS to grow their portfolio and better serve their clients.</p>
              <Button
                onClick={() => onNavigate('login')}
                size="lg"
                className="bg-white text-[#1B4332] hover:bg-white/90 h-13 px-8 text-base font-medium"
              >
                Create My Account <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#f0ece4] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[#1B4332] text-sm">PROPOS</span>
          </div>
          <p className="text-xs text-[#9A9A9A]">SaaS platform for real estate professionals in Trinidad & Tobago</p>
        </div>
      </footer>
    </div>
  );
}