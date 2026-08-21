'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2 } from 'lucide-react';
import ProposLanding from '@/components/landing/propos-landing';
import LoginPage from '@/components/auth/login-page';
import ControlTower from '@/components/tower/control-tower';
import AgentDashboard from '@/components/agent/agent-dashboard';
import PublicPortal from '@/components/portal/public-portal';

// ── Types ──────────────────────────────────────────────────────
type View = 'landing' | 'login' | 'tower' | 'agent_dashboard' | 'portal_laura';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AgentProfile {
  id: string;
  slug: string;
  businessName: string;
  displayName: string;
  phone: string;
  email: string;
  primaryColor: string;
  accentColor: string;
  commissionRate: number;
  city: string;
  tagline?: string;
  logo?: string;
}

// ── App Router ────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<View>('landing');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then(data => {
        if (data.user) {
          setUser(data.user);
          if (data.user.role === 'platform_owner') {
            setView('tower');
          } else if (data.user.role === 'agent' && data.agent) {
            setAgent(data.agent);
            setView('agent_dashboard');
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = useCallback((u: UserProfile) => {
    setUser(u);
    if (u.role === 'platform_owner') {
      setView('tower');
    } else if (u.role === 'agent') {
      fetch('/api/auth/me').then(r => r.json()).then(data => {
        if (data.agent) {
          setAgent(data.agent);
          setView('agent_dashboard');
        }
      }).catch(() => setView('landing'));
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setAgent(null);
    document.cookie = 'propos-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setView('landing');
  }, []);

  const navigate = useCallback((v: string) => {
    if (v === 'portal_laura' || v === 'tower' || v === 'agent_dashboard') {
      setView(v as View);
    } else {
      setView(v as View);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-[#9A9A9A]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        {view === 'landing' && <ProposLanding onNavigate={navigate} />}
        {view === 'login' && <LoginPage onNavigate={navigate} onLogin={handleLogin} />}
        {view === 'tower' && user && <ControlTower onLogout={handleLogout} onBack={() => setView('landing')} />}
        {view === 'agent_dashboard' && agent && <AgentDashboard agent={agent} onLogout={handleLogout} onBack={() => setView('landing')} />}
        {view === 'portal_laura' && <PublicPortal agentSlug="laura-homes-tt" onBack={() => setView('landing')} />}
      </motion.div>
    </AnimatePresence>
  );
}