'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Building2, Users, Handshake, CalendarDays, Receipt,
  BarChart3, MessageSquare, Palette, LogOut, Menu, X, Plus, Search,
  Camera, Bed, Bath, Ruler, MapPin, Phone, Mail, ChevronRight,
  Eye, Clock, ArrowUpRight, TrendingUp, DollarSign, Star, Image,
  Video, Upload, Filter, MoreHorizontal, Check, ExternalLink,
  Home, CircleDot, ChevronLeft, ChevronDown, User, Globe,
  Instagram, Twitter, Facebook, Linkedin, Pencil, Trash2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentProfile {
  id: string; slug: string; businessName: string; displayName: string;
  phone: string; email: string; primaryColor: string; accentColor: string;
  commissionRate: number; city: string; tagline?: string; logo?: string;
}

interface AgentDashboardProps {
  agent: AgentProfile;
  onLogout: () => void;
  onBack: () => void;
}

interface Property {
  id: string; title: string; slug: string; propertyType: string;
  listingType: string; status: string; price: number; currency: string;
  bedrooms: number; bathrooms: number; areaSqm: number; city: string;
  neighborhood: string; images: string[]; isFeatured: boolean;
  publishedAt: string; description?: string; _count: { inquiries: number };
}

interface Client {
  id: string; firstName: string; lastName: string; email: string;
  phone: string; source: string; status: string; lastContactAt: string;
  notes?: string; _count: { inquiries: number; deals: number };
}

interface Deal {
  id: string; dealType: string; status: string; totalPrice: number;
  commission: number; closeDate: string;
  property: { title: string };
  client: { firstName: string; lastName: string };
}

interface Tax {
  id: string; taxType: string; description: string; period: string;
  dueDate: string; amount: number; currency: string; status: string;
  paidAt: string;
}

interface Inquiry {
  id: string; name: string; email: string; phone: string;
  message: string; status: string; isRead: boolean;
  createdAt: string; property: { title: string };
}

interface DailyVisit { date: string; count: number; }
interface TopProperty { propertySlug: string; title: string; views: number; }
interface Referrer { referrer: string; count: number; }

interface Analytics {
  visits: { last7d: number; last30d: number };
  dailyVisits: DailyVisit[]; topProperties: TopProperty[];
  referrers: Referrer[];
  avgDwellTime: number; recentInquiries: number; conversionRate: number;
  pages: { page: string; count: number }[];
}

interface CalendarEvent {
  id: string; title: string; date: string; time: string;
  property?: string; client?: string;
  type: 'Showing' | 'Closing' | 'Meeting' | 'Follow-up';
}

type TabId =
  | 'dashboard' | 'properties' | 'clients' | 'deals'
  | 'calendar' | 'taxes' | 'analytics' | 'inquiries' | 'portal';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (n: number) => `$${n.toLocaleString()}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtShort = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
const ACCENT = '#b8956a';

const NAV: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'clients',   label: 'Clients',   icon: Users },
  { id: 'deals',     label: 'Deals',     icon: Handshake },
  { id: 'calendar',  label: 'Calendar',  icon: CalendarDays },
  { id: 'taxes',     label: 'Taxes',     icon: Receipt },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'inquiries', label: 'Inquiries', icon: MessageSquare },
  { id: 'portal',    label: 'Portal Template', icon: Palette },
];

/* ------------------------------------------------------------------ */
/*  Fade variants                                                      */
/* ------------------------------------------------------------------ */
const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 } };

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function AgentDashboard({ agent, onLogout }: AgentDashboardProps) {
  /* ---- state ---- */
  const [tab, setTab] = useState<TabId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // data
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // loading
  const [loading, setLoading] = useState(true);

  // dialogs
  const [propDetail, setPropDetail] = useState<Property | null>(null);
  const [clientDetail, setClientDetail] = useState<Client | null>(null);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [showPortalCustomize, setShowPortalCustomize] = useState(false);

  // filters
  const [propSearch, setPropSearch] = useState('');
  const [propFilter, setPropFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [inquiryFilter, setInquiryFilter] = useState('All');

  // portal customization (local)
  const [portalConfig, setPortalConfig] = useState({
    primaryColor: agent.primaryColor || '#0a0a0a',
    accentColor: agent.accentColor || '#b8956a',
    tagline: agent.tagline || '',
    bio: '',
    instagram: '', twitter: '', facebook: '', linkedin: '',
  });

  /* ---- fetch ---- */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, d, t, a, i] = await Promise.all([
        fetch('/api/agent/properties').then(r => r.json()),
        fetch('/api/agent/clients').then(r => r.json()),
        fetch('/api/agent/deals').then(r => r.json()),
        fetch('/api/agent/taxes').then(r => r.json()),
        fetch('/api/agent/analytics').then(r => r.json()),
        fetch('/api/agent/inquiries').then(r => r.json()),
      ]);
      setProperties(Array.isArray(p) ? p : []);
      setClients(Array.isArray(c) ? c : []);
      setDeals(Array.isArray(d) ? d : []);
      setTaxes(Array.isArray(t) ? t : []);
      if (a && !a.error) setAnalytics(a);
      setInquiries(Array.isArray(i) ? i : []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ---- derived ---- */
  const activeProps = properties.filter(p => p.status === 'published');
  const newInquiries = inquiries.filter(i => !i.isRead).length;
  const pendingDeals = deals.filter(d => d.status === 'pending').length;
  const convRate = analytics?.conversionRate ?? 0;
  const maxVisit = Math.max(1, ...(analytics?.dailyVisits?.map(v => v.count) ?? [1]));

  const filteredProps = properties.filter(p => {
    if (propSearch && !p.title.toLowerCase().includes(propSearch.toLowerCase())) return false;
    if (propFilter === 'For Sale' && p.listingType !== 'sale') return false;
    if (propFilter === 'For Rent' && p.listingType !== 'rent') return false;
    if (propFilter === 'Featured' && !p.isFeatured) return false;
    return true;
  });

  const filteredClients = clients.filter(c => clientFilter === 'All' || c.status === clientFilter.toLowerCase());
  const filteredInquiries = inquiries.filter(i => {
    if (inquiryFilter === 'All') return true;
    if (inquiryFilter === 'New') return !i.isRead;
    if (inquiryFilter === 'Read') return i.isRead && i.status !== 'responded';
    if (inquiryFilter === 'Responded') return i.status === 'responded';
    return true;
  });

  const pipelineDeals = (status: string) => deals.filter(d => d.status === status);

  /* ---- handlers ---- */
  const markInquiryRead = async (id: string) => {
    await fetch(`/api/agent/inquiries`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isRead: true }) });
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i));
  };

  const markTaxPaid = async (id: string) => {
    await fetch(`/api/agent/taxes`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'paid' }) });
    setTaxes(prev => prev.map(t => t.id === id ? { ...t, status: 'paid', paidAt: new Date().toISOString() } : t));
  };

  const handleAddEvent = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ev: CalendarEvent = {
      id: uid(), title: fd.get('title') as string, date: fd.get('date') as string,
      time: fd.get('time') as string, property: fd.get('property') as string || undefined,
      client: fd.get('client') as string || undefined, type: fd.get('type') as CalendarEvent['type'],
    };
    setEvents(prev => [...prev, ev]);
    setShowEventForm(false);
  };

  const handleCreateDeal = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch('/api/agent/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealType: fd.get('dealType'), totalPrice: Number(fd.get('totalPrice')), closeDate: fd.get('closeDate') }),
    });
    setShowDealForm(false);
    fetchAll();
  };

  const handleCreateTax = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch('/api/agent/taxes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxType: fd.get('taxType'), description: fd.get('description'), period: fd.get('period'), dueDate: fd.get('dueDate'), amount: Number(fd.get('amount')) }),
    });
    setShowTaxForm(false);
    fetchAll();
  };

  const switchTab = (t: TabId) => { setTab(t); setSidebarOpen(false); };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="flex h-screen w-full bg-[#FAFAF8] overflow-hidden">

      {/* ---- MOBILE SIDEBAR OVERLAY ---- */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ---- SIDEBAR ---- */}
      <aside className={
        `fixed md:relative z-50 h-full w-64 flex-shrink-0 bg-white/95 backdrop-blur-xl shadow-soft transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
      }>
        <div className="flex flex-col h-full pt-6">
          {/* Logo area */}
          <div className="px-6 mb-8">
            <h2 className="font-serif-display text-xl tracking-wide">PROPOS</h2>
            <p className="font-data text-[10px] tracking-luxury text-[#71717a] mt-1 uppercase">Agent Workspace</p>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 space-y-0.5 custom-scrollbar overflow-y-auto">
            {NAV.map(item => {
              const active = tab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => switchTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-data tracking-wide transition-all duration-200 group
                    ${active
                      ? 'bg-[#FAFAF8] text-[#0a0a0a] shadow-soft border-l-2 border-[#b8956a]'
                      : 'text-[#71717a] hover:bg-[#FAFAF8]/60 hover:text-[#0a0a0a]'
                    }`}
                >
                  <Icon size={18} strokeWidth={active ? 1.8 : 1.4} className={active ? 'text-[#b8956a]' : ''} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Agent info bottom */}
          <div className="px-6 py-5 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <p className="font-data text-xs tracking-wide-luxury uppercase text-[#71717a]">Agent</p>
            <p className="font-serif-display text-sm mt-1 text-[#0a0a0a]">{agent.displayName}</p>
            <p className="font-data text-[11px] text-[#71717a] mt-0.5">{agent.city}</p>
          </div>
        </div>
      </aside>

      {/* ---- MAIN AREA ---- */}
      <div className="flex-1 flex flex-col min-w-0 h-full">

        {/* ---- TOP BAR ---- */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <button className="md:hidden p-1" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <h1 className="font-data text-xs tracking-luxury uppercase text-[#0a0a0a] hidden md:block">
            {agent.businessName || agent.displayName}
          </h1>

          <nav className="hidden lg:flex items-center gap-6">
            {['Properties', 'Clients', 'Deals', 'Analytics'].map(label => (
              <button key={label} onClick={() => switchTab(label.toLowerCase() as TabId)}
                className="font-data text-[11px] tracking-luxury uppercase text-[#71717a] hover:text-[#0a0a0a] transition-colors">
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={onLogout}
              className="font-data text-[11px] tracking-luxury uppercase text-[#71717a] hover:text-[#0a0a0a] transition-colors flex items-center gap-1.5">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        {/* ---- CONTENT ---- */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <AnimatePresence mode="wait">

            {/* ============ DASHBOARD ============ */}
            {tab === 'dashboard' && (
              <motion.div key="dashboard" {...fade} className="space-y-8">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Active Properties', value: activeProps.length, icon: Building2 },
                    { label: 'New Inquiries', value: newInquiries, icon: MessageSquare },
                    { label: 'Pending Deals', value: pendingDeals, icon: Handshake },
                    { label: 'Conversion Rate', value: `${convRate}%`, icon: TrendingUp },
                  ].map(kpi => (
                    <div key={kpi.label} className="glass-card rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">{kpi.label}</span>
                        <kpi.icon size={16} className="text-[#b8956a]" />
                      </div>
                      <p className="font-data text-2xl lg:text-3xl font-semibold text-[#0a0a0a]">{kpi.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart + Recent Inquiries */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Bar Chart - Daily Visits */}
                  <div className="lg:col-span-3 glass-card rounded-xl p-6">
                    <h3 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-6">Daily Visits — Last 7 Days</h3>
                    <div className="flex items-end gap-3 h-40">
                      {(analytics?.dailyVisits ?? []).map((v, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <span className="font-data text-[10px] text-[#71717a]">{v.count}</span>
                          <div className="w-full bg-[#0a0a0a] rounded-t-sm transition-all duration-500"
                            style={{ height: `${Math.max(4, (v.count / maxVisit) * 120)}px` }} />
                          <span className="font-data text-[10px] text-[#71717a]">
                            {new Date(v.date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Inquiries */}
                  <div className="lg:col-span-2 glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">Recent Inquiries</h3>
                      <button onClick={() => switchTab('inquiries')} className="font-data text-[10px] tracking-wide text-[#b8956a] hover:underline">View All</button>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                      {inquiries.slice(0, 6).map(inq => (
                        <div key={inq.id} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!inq.isRead ? 'bg-[#b8956a]' : 'bg-[#d4d4d8]'}`} />
                          <div className="min-w-0">
                            <p className="font-data text-sm text-[#0a0a0a] truncate">{inq.name}</p>
                            <p className="font-data text-[11px] text-[#71717a] truncate">{inq.property?.title}</p>
                          </div>
                          <span className="font-data text-[10px] text-[#71717a] flex-shrink-0 ml-auto">{fmtShort(inq.createdAt)}</span>
                        </div>
                      ))}
                      {inquiries.length === 0 && <p className="font-data text-sm text-[#71717a]">No inquiries yet</p>}
                    </div>
                  </div>
                </div>

                {/* Most Viewed Properties */}
                <div>
                  <h3 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-4">Most Viewed Properties</h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {(analytics?.topProperties ?? []).slice(0, 5).map((tp, i) => (
                      <div key={i} className="glass-card rounded-xl min-w-[260px] w-[260px] flex-shrink-0 overflow-hidden">
                        <div className="aspect-[4/3] bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] relative flex items-center justify-center">
                          <Home size={32} className="text-white/20" />
                          <span className="absolute bottom-3 left-3 font-data text-[10px] tracking-luxury uppercase text-white/60">{tp.views} views</span>
                        </div>
                        <div className="p-4">
                          <p className="font-serif-display text-sm text-[#0a0a0a]">{tp.title}</p>
                        </div>
                      </div>
                    ))}
                    {(!analytics?.topProperties?.length) && (
                      <div className="glass-card rounded-xl p-8 text-center">
                        <Eye size={24} className="mx-auto mb-2 text-[#d4d4d8]" />
                        <p className="font-data text-sm text-[#71717a]">No view data yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============ PROPERTIES ============ */}
            {tab === 'properties' && (
              <motion.div key="properties" {...fade} className="space-y-6">
                {/* Search + Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
                    <input type="text" placeholder="Search properties..." value={propSearch} onChange={e => setPropSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft focus:shadow-elevated transition-shadow" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                  </div>
                  <div className="flex gap-2">
                    {['All', 'For Sale', 'For Rent', 'Featured'].map(f => (
                      <button key={f} onClick={() => setPropFilter(f)}
                        className={`px-4 py-2 rounded-lg font-data text-[11px] tracking-wide-luxury uppercase transition-all
                          ${propFilter === f ? 'bg-[#0a0a0a] text-white shadow-elevated' : 'bg-white text-[#71717a] shadow-soft hover:bg-[#f4f4f2]'}`}
                      >{f}</button>
                    ))}
                  </div>
                </div>

                {/* Property Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredProps.map(p => (
                    <div key={p.id} onClick={() => setPropDetail(p)}
                      className="glass-card rounded-xl overflow-hidden cursor-pointer group hover:shadow-elevated transition-shadow duration-300">
                      <div className="aspect-[4/3] bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] relative flex flex-col items-center justify-center gap-2">
                        {p.images?.length ? (
                          <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera size={28} className="text-white/20" />
                            <span className="font-data text-[10px] tracking-luxury uppercase text-white/40">Add Photos</span>
                          </>
                        )}
                        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded font-data text-[9px] tracking-luxury uppercase
                          ${p.status === 'published' ? 'bg-white/90 text-[#0a0a0a]' : 'bg-[#b8956a]/90 text-white'}`}>
                          {p.status}
                        </span>
                        {p.isFeatured && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#b8956a] font-data text-[9px] tracking-luxury uppercase text-white">Featured</span>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="font-serif-display text-base text-[#0a0a0a] group-hover:text-[#b8956a] transition-colors">{p.title}</h3>
                        <p className="font-data text-xl font-semibold text-[#0a0a0a]">{fmt(p.price)}</p>
                        <div className="flex items-center gap-4 font-data text-[11px] text-[#71717a] tracking-wide">
                          <span className="flex items-center gap-1"><Bed size={13} /> {p.bedrooms} bd</span>
                          <span className="flex items-center gap-1"><Bath size={13} /> {p.bathrooms} ba</span>
                          <span className="flex items-center gap-1"><Ruler size={13} /> {p.areaSqm} m²</span>
                        </div>
                        <div className="flex items-center gap-1 font-data text-[11px] text-[#71717a]">
                          <MapPin size={12} /> {p.neighborhood}, {p.city}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredProps.length === 0 && !loading && (
                  <div className="text-center py-16"><Building2 size={40} className="mx-auto mb-3 text-[#d4d4d8]" /><p className="font-data text-sm text-[#71717a]">No properties found</p></div>
                )}
              </motion.div>
            )}

            {/* ============ CLIENTS ============ */}
            {tab === 'clients' && (
              <motion.div key="clients" {...fade} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h2 className="font-serif-display text-2xl text-[#0a0a0a]">Clients</h2>
                  <div className="flex gap-2">
                    {['All', 'Active', 'Inactive', 'Lead'].map(f => (
                      <button key={f} onClick={() => setClientFilter(f)}
                        className={`px-4 py-2 rounded-lg font-data text-[11px] tracking-wide-luxury uppercase transition-all
                          ${clientFilter === f ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#71717a] shadow-soft'}`}>{f}</button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="grid grid-cols-5 gap-4 px-5 py-3 font-data text-[10px] tracking-luxury uppercase text-[#71717a] border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <span>Name</span><span>Phone</span><span>Source</span><span>Status</span><span>Last Contact</span>
                  </div>
                  <div className="divide-y max-h-[500px] overflow-y-auto custom-scrollbar" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                    {filteredClients.map(c => (
                      <button key={c.id} onClick={() => setClientDetail(c)}
                        className="grid grid-cols-5 gap-4 px-5 py-3.5 w-full text-left hover:bg-[#FAFAF8]/80 transition-colors">
                        <span className="font-data text-sm text-[#0a0a0a]">{c.firstName} {c.lastName}</span>
                        <span className="font-data text-sm text-[#71717a]">{c.phone}</span>
                        <span className="font-data text-sm text-[#71717a]">{c.source}</span>
                        <span>
                          <span className={`inline-block px-2 py-0.5 rounded font-data text-[10px] tracking-wide uppercase
                            ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : c.status === 'lead' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}>
                            {c.status}
                          </span>
                        </span>
                        <span className="font-data text-sm text-[#71717a]">{fmtShort(c.lastContactAt)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============ DEALS ============ */}
            {tab === 'deals' && (
              <motion.div key="deals" {...fade} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif-display text-2xl text-[#0a0a0a]">Deal Pipeline</h2>
                  <button onClick={() => setShowDealForm(true)}
                    className="btn-primary-luxury px-5 py-2.5 font-data text-[11px] tracking-wide-luxury uppercase flex items-center gap-2">
                    <Plus size={14} /> New Deal
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {(['pending', 'closed', 'cancelled'] as const).map(status => (
                    <div key={status}>
                      <div className="flex items-center gap-2 mb-4">
                        <CircleDot size={14} className={status === 'pending' ? 'text-amber-500' : status === 'closed' ? 'text-emerald-500' : 'text-red-400'} />
                        <h3 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">{status} ({pipelineDeals(status).length})</h3>
                      </div>
                      <div className="space-y-3">
                        {pipelineDeals(status).map(d => (
                          <div key={d.id} className="glass-card rounded-xl p-4 space-y-3">
                            <p className="font-serif-display text-sm text-[#0a0a0a]">{d.property?.title || 'Untitled'}</p>
                            <p className="font-data text-xs text-[#71717a]">{d.client?.firstName} {d.client?.lastName}</p>
                            <div className="flex items-center justify-between">
                              <span className="font-data text-lg font-semibold text-[#0a0a0a]">{fmt(d.totalPrice)}</span>
                              <span className="font-data text-[11px] text-[#b8956a]">Comm: {fmt(d.commission)}</span>
                            </div>
                            {d.closeDate && (
                              <p className="font-data text-[10px] text-[#71717a] flex items-center gap-1"><Clock size={10} /> Close: {fmtShort(d.closeDate)}</p>
                            )}
                          </div>
                        ))}
                        {pipelineDeals(status).length === 0 && (
                          <div className="glass-card rounded-xl p-6 text-center">
                            <p className="font-data text-xs text-[#71717a]">No {status} deals</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ============ CALENDAR ============ */}
            {tab === 'calendar' && (
              <motion.div key="calendar" {...fade} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif-display text-2xl text-[#0a0a0a]">Calendar</h2>
                  <button onClick={() => setShowEventForm(true)}
                    className="btn-primary-luxury px-5 py-2.5 font-data text-[11px] tracking-wide-luxury uppercase flex items-center gap-2">
                    <Plus size={14} /> Add Event
                  </button>
                </div>

                {/* Mini calendar month view placeholder */}
                <div className="glass-card rounded-xl p-6">
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <span key={d} className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] py-2">{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }, (_, i) => {
                      const day = i - 2;
                      const date = new Date();
                      date.setDate(day);
                      const isToday = day === new Date().getDate() && new Date().getMonth() === date.getMonth();
                      const hasEvent = events.some(e => new Date(e.date).getDate() === day);
                      return (
                        <div key={i} className={`h-10 rounded-lg flex items-center justify-center relative font-data text-sm transition-colors
                          ${isToday ? 'bg-[#0a0a0a] text-white' : 'hover:bg-[#f4f4f2] text-[#0a0a0a]'}
                          ${day < 1 || day > 31 ? 'text-[#d4d4d8]' : ''}`}>
                          {day >= 1 && day <= 31 ? day : ''}
                          {hasEvent && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#b8956a]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming events list */}
                <div>
                  <h3 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-4">Upcoming Events</h3>
                  <div className="space-y-3">
                    {events.length === 0 && (
                      <div className="glass-card rounded-xl p-8 text-center">
                        <CalendarDays size={32} className="mx-auto mb-2 text-[#d4d4d8]" />
                        <p className="font-data text-sm text-[#71717a]">No events scheduled</p>
                      </div>
                    )}
                    {events.map(ev => (
                      <div key={ev.id} className="glass-card rounded-xl p-4 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[#0a0a0a] flex flex-col items-center justify-center flex-shrink-0">
                          <span className="font-data text-[10px] tracking-luxury uppercase text-[#b8956a]">{new Date(ev.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="font-data text-base font-semibold text-white leading-none mt-0.5">
                            {new Date(ev.date).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-data text-sm font-medium text-[#0a0a0a]">{ev.title}</p>
                          <p className="font-data text-[11px] text-[#71717a] mt-0.5">{ev.time} · {ev.type}</p>
                          {ev.property && <p className="font-data text-[11px] text-[#71717a]">{ev.property}</p>}
                          {ev.client && <p className="font-data text-[11px] text-[#71717a]">with {ev.client}</p>}
                        </div>
                        <span className={`px-2.5 py-1 rounded font-data text-[9px] tracking-wide-luxury uppercase
                          ${ev.type === 'Showing' ? 'bg-blue-50 text-blue-700' : ev.type === 'Closing' ? 'bg-emerald-50 text-emerald-700' : ev.type === 'Follow-up' ? 'bg-purple-50 text-purple-700' : 'bg-zinc-100 text-zinc-600'}`}>
                          {ev.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============ TAXES ============ */}
            {tab === 'taxes' && (
              <motion.div key="taxes" {...fade} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif-display text-2xl text-[#0a0a0a]">Tax Obligations</h2>
                  <button onClick={() => setShowTaxForm(true)}
                    className="btn-primary-luxury px-5 py-2.5 font-data text-[11px] tracking-wide-luxury uppercase flex items-center gap-2">
                    <Plus size={14} /> Add Tax
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-card rounded-xl p-5">
                    <span className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">Total Pending</span>
                    <p className="font-data text-2xl font-semibold text-[#0a0a0a] mt-2">
                      {fmt(taxes.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0))}
                    </p>
                  </div>
                  <div className="glass-card rounded-xl p-5">
                    <span className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">Total Paid</span>
                    <p className="font-data text-2xl font-semibold text-emerald-700 mt-2">
                      {fmt(taxes.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0))}
                    </p>
                  </div>
                </div>

                {/* Tax List */}
                <div className="space-y-3">
                  {taxes.map(t => (
                    <div key={t.id} className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-data text-sm font-medium text-[#0a0a0a]">{t.taxType} — {t.description}</p>
                        <p className="font-data text-[11px] text-[#71717a]">Period: {t.period} · Due: {fmtDate(t.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-data text-lg font-semibold text-[#0a0a0a]">{fmt(t.amount)}</span>
                        {t.status === 'pending' ? (
                          <button onClick={() => markTaxPaid(t.id)}
                            className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 font-data text-[11px] tracking-wide-luxury uppercase hover:bg-emerald-100 transition-colors">
                            Mark Paid
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 font-data text-[11px] text-emerald-600"><Check size={12} /> Paid</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {taxes.length === 0 && !loading && (
                    <div className="text-center py-16"><Receipt size={40} className="mx-auto mb-3 text-[#d4d4d8]" /><p className="font-data text-sm text-[#71717a]">No tax records</p></div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ============ ANALYTICS ============ */}
            {tab === 'analytics' && (
              <motion.div key="analytics" {...fade} className="space-y-8">
                <h2 className="font-serif-display text-2xl text-[#0a0a0a]">Analytics</h2>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Visitors', value: analytics?.visits?.last30d ?? 0, icon: Eye },
                    { label: 'Avg Dwell Time', value: `${analytics?.avgDwellTime ?? 0}s`, icon: Clock },
                    { label: 'Bounce Rate', value: `${Math.round(100 - (analytics?.conversionRate ?? 0) * 10)}%`, icon: TrendingUp },
                    { label: 'Top Source', value: analytics?.referrers?.[0]?.referrer ?? 'Direct', icon: Globe },
                  ].map(m => (
                    <div key={m.label} className="glass-card rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <m.icon size={16} className="text-[#b8956a]" />
                        <span className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">{m.label}</span>
                      </div>
                      <p className="font-data text-2xl font-semibold text-[#0a0a0a]">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Traffic Sources */}
                <div className="glass-card rounded-xl p-6">
                  <h3 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-5">Traffic Sources</h3>
                  <div className="space-y-3">
                    {(analytics?.referrers ?? []).slice(0, 5).map((r, i) => {
                      const max = Math.max(1, (analytics?.referrers ?? [])[0]?.count ?? 1);
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <span className="font-data text-xs text-[#0a0a0a] w-32 truncate">{r.referrer || 'Direct'}</span>
                          <div className="flex-1 h-2 bg-[#f4f4f2] rounded-full overflow-hidden">
                            <div className="h-full bg-[#0a0a0a] rounded-full transition-all duration-700" style={{ width: `${(r.count / max) * 100}%` }} />
                          </div>
                          <span className="font-data text-xs text-[#71717a] w-10 text-right">{r.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Conversion Funnel */}
                <div className="glass-card rounded-xl p-6">
                  <h3 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-6">Conversion Funnel</h3>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    {[
                      { label: 'Visitors', value: analytics?.visits?.last30d ?? 0 },
                      { label: 'Property Views', value: analytics?.pages?.reduce((s, p) => s + p.count, 0) ?? 0 },
                      { label: 'Inquiries', value: analytics?.recentInquiries ?? 0 },
                      { label: 'Deals', value: deals.length },
                    ].map((step, i, arr) => (
                      <div key={step.label} className="flex-1 text-center">
                        <div className="bg-[#0a0a0a] rounded-xl p-4 mb-2" style={{ opacity: 1 - i * 0.15 }}>
                          <p className="font-data text-xl font-semibold text-white">{step.value}</p>
                        </div>
                        <p className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">{step.label}</p>
                        {i < arr.length - 1 && <ChevronRight size={16} className="hidden sm:block text-[#d4d4d8] mx-auto mt-3" />}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============ INQUIRIES ============ */}
            {tab === 'inquiries' && (
              <motion.div key="inquiries" {...fade} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h2 className="font-serif-display text-2xl text-[#0a0a0a]">Inquiries</h2>
                  <div className="flex gap-2">
                    {['All', 'New', 'Read', 'Responded'].map(f => (
                      <button key={f} onClick={() => setInquiryFilter(f)}
                        className={`px-4 py-2 rounded-lg font-data text-[11px] tracking-wide-luxury uppercase transition-all
                          ${inquiryFilter === f ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#71717a] shadow-soft'}`}>{f}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredInquiries.map(inq => (
                    <div key={inq.id} className="glass-card rounded-xl p-5 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {!inq.isRead && <span className="w-2 h-2 rounded-full bg-[#b8956a]" />}
                            <p className="font-data text-sm font-medium text-[#0a0a0a]">{inq.name}</p>
                          </div>
                          <p className="font-data text-[11px] text-[#71717a]">{inq.email} · {inq.phone}</p>
                          <p className="font-data text-[11px] text-[#b8956a]">Re: {inq.property?.title}</p>
                        </div>
                        <span className="font-data text-[10px] text-[#71717a] flex-shrink-0">{fmtDate(inq.createdAt)}</span>
                      </div>
                      <p className="font-data text-sm text-[#0a0a0a]/80 leading-relaxed">{inq.message}</p>
                      <div className="flex items-center gap-3 pt-1">
                        {!inq.isRead && (
                          <button onClick={() => markInquiryRead(inq.id)}
                            className="font-data text-[10px] tracking-wide-luxury uppercase text-[#71717a] hover:text-[#0a0a0a] transition-colors">
                            Mark Read
                          </button>
                        )}
                        <a href={`https://wa.me/${inq.phone?.replace(/[^0-9]/g, '')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="ml-auto px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 font-data text-[11px] tracking-wide-luxury uppercase hover:bg-emerald-100 transition-colors flex items-center gap-1.5">
                          <Phone size={12} /> Reply via WhatsApp
                        </a>
                      </div>
                    </div>
                  ))}
                  {filteredInquiries.length === 0 && (
                    <div className="text-center py-16"><MessageSquare size={40} className="mx-auto mb-3 text-[#d4d4d8]" /><p className="font-data text-sm text-[#71717a]">No inquiries</p></div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ============ PORTAL TEMPLATE ============ */}
            {tab === 'portal' && (
              <motion.div key="portal" {...fade} className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif-display text-2xl text-[#0a0a0a]">Portal Template</h2>
                    <p className="font-data text-sm text-[#71717a] mt-1">Choose and customize your client-facing portal</p>
                  </div>
                  <button onClick={() => setShowPortalCustomize(true)}
                    className="btn-primary-luxury px-5 py-2.5 font-data text-[11px] tracking-wide-luxury uppercase flex items-center gap-2">
                    <Pencil size={14} /> Customize Portal
                  </button>
                </div>

                {/* Template Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { name: 'Classic Estate', desc: 'Dark & gold sophistication', bg: 'from-[#0a0a0a] to-[#1a1a1a]', accent: '#b8956a' },
                    { name: 'Modern Minimal', desc: 'Clean white & warm neutrals', bg: 'from-[#FAFAF8] to-[#f0ece6]', accent: '#0a0a0a' },
                    { name: 'Coastal Luxury', desc: 'Ocean blues & warm sand', bg: 'from-[#1a3a4a] to-[#2a5a6a]', accent: '#d4c5a9' },
                  ].map(tmpl => (
                    <div key={tmpl.name} className="glass-card rounded-xl overflow-hidden group cursor-pointer hover:shadow-elevated transition-shadow duration-300">
                      <div className={`aspect-[4/3] bg-gradient-to-br ${tmpl.bg} relative flex flex-col items-center justify-center p-6`}>
                        <div className="w-16 h-1 rounded-full mb-4" style={{ backgroundColor: tmpl.accent }} />
                        <h3 className="font-serif-display text-xl text-white text-center">{tmpl.name}</h3>
                        <p className="font-data text-[11px] tracking-wide-luxury uppercase mt-2" style={{ color: `${tmpl.accent}99` }}>{tmpl.desc}</p>
                        {/* Mock layout lines */}
                        <div className="absolute bottom-4 left-4 right-4 space-y-2">
                          <div className="h-1 rounded-full bg-white/10 w-3/4" />
                          <div className="h-1 rounded-full bg-white/10 w-1/2" />
                          <div className="h-1 rounded-full bg-white/10 w-2/3" />
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <span className="font-data text-[11px] tracking-wide-luxury uppercase text-[#71717a]">Preview</span>
                        <ArrowUpRight size={16} className="text-[#b8956a] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* =========================== DIALOGS =========================== */}

      {/* ---- PROPERTY DETAIL DIALOG ---- */}
      <AnimatePresence>
        {propDetail && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPropDetail(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-dramatic max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Image area */}
              <div className="aspect-[16/9] bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] relative flex flex-col items-center justify-center rounded-t-2xl">
                {propDetail.images?.length ? (
                  <img src={propDetail.images[0]} alt={propDetail.title} className="w-full h-full object-cover rounded-t-2xl" />
                ) : (
                  <>
                    <Camera size={40} className="text-white/20 mb-2" />
                    <span className="font-data text-sm tracking-luxury uppercase text-white/40">Add Photos</span>
                  </>
                )}
                <button onClick={() => setPropDetail(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 lg:p-8 space-y-6">
                <div>
                  <h2 className="font-serif-display text-2xl text-[#0a0a0a]">{propDetail.title}</h2>
                  <p className="font-data text-[11px] text-[#71717a] mt-1 flex items-center gap-1"><MapPin size={12} /> {propDetail.neighborhood}, {propDetail.city}</p>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="font-data text-3xl font-semibold text-[#0a0a0a]">{fmt(propDetail.price)}</span>
                  <span className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">{propDetail.listingType}</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[{ icon: Bed, label: 'Bedrooms', value: propDetail.bedrooms },
                    { icon: Bath, label: 'Bathrooms', value: propDetail.bathrooms },
                    { icon: Ruler, label: 'Area', value: `${propDetail.areaSqm} m²` }].map(item => (
                    <div key={item.label} className="glass-card rounded-lg p-3 text-center">
                      <item.icon size={18} className="mx-auto text-[#b8956a] mb-1" />
                      <p className="font-data text-lg font-semibold text-[#0a0a0a]">{item.value}</p>
                      <p className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">{item.label}</p>
                    </div>
                  ))}
                </div>

                {propDetail.description && (
                  <div>
                    <h4 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-2">Description</h4>
                    <p className="font-data text-sm text-[#0a0a0a]/80 leading-relaxed">{propDetail.description}</p>
                  </div>
                )}

                {/* Image Upload Zone */}
                <div>
                  <h4 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-2">Photos</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {propDetail.images?.map((img, i) => (
                      <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-[#f4f4f2]">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <div className="aspect-[4/3] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-[#f4f4f2] transition-colors" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
                      <Upload size={20} className="text-[#71717a]" />
                      <span className="font-data text-[10px] text-[#71717a]">Upload</span>
                    </div>
                  </div>
                </div>

                {/* Video Tour Section */}
                <div>
                  <h4 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-2">Video Tour</h4>
                  <div className="aspect-video rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] flex flex-col items-center justify-center gap-2 border-2 border-dashed cursor-pointer hover:from-[#222] hover:to-[#333] transition-colors" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
                    <Video size={32} className="text-white/20" />
                    <span className="font-data text-[11px] tracking-wide-luxury uppercase text-white/40">Upload Video Tour</span>
                  </div>
                </div>

                {/* Property meta */}
                <div className="grid grid-cols-2 gap-3 font-data text-xs text-[#71717a]">
                  <div><span className="tracking-luxury uppercase block text-[10px] mb-1">Type</span>{propDetail.propertyType}</div>
                  <div><span className="tracking-luxury uppercase block text-[10px] mb-1">Status</span>{propDetail.status}</div>
                  <div><span className="tracking-luxury uppercase block text-[10px] mb-1">Featured</span>{propDetail.isFeatured ? 'Yes' : 'No'}</div>
                  <div><span className="tracking-luxury uppercase block text-[10px] mb-1">Inquiries</span>{propDetail._count?.inquiries ?? 0}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- CLIENT DETAIL DIALOG ---- */}
      <AnimatePresence>
        {clientDetail && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setClientDetail(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-dramatic max-w-lg w-full max-h-[85vh] overflow-y-auto custom-scrollbar p-6 lg:p-8"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-serif-display text-xl text-[#0a0a0a]">{clientDetail.firstName} {clientDetail.lastName}</h2>
                  <span className={`inline-block mt-2 px-2.5 py-0.5 rounded font-data text-[10px] tracking-wide-luxury uppercase
                    ${clientDetail.status === 'active' ? 'bg-emerald-50 text-emerald-700' : clientDetail.status === 'lead' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}>
                    {clientDetail.status}
                  </span>
                </div>
                <button onClick={() => setClientDetail(null)} className="p-1 hover:bg-[#f4f4f2] rounded-lg transition-colors">
                  <X size={18} className="text-[#71717a]" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1">Email</span><span className="font-data text-sm text-[#0a0a0a]">{clientDetail.email}</span></div>
                  <div><span className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1">Phone</span><span className="font-data text-sm text-[#0a0a0a]">{clientDetail.phone}</span></div>
                  <div><span className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1">Source</span><span className="font-data text-sm text-[#0a0a0a]">{clientDetail.source}</span></div>
                  <div><span className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1">Last Contact</span><span className="font-data text-sm text-[#0a0a0a]">{fmtDate(clientDetail.lastContactAt)}</span></div>
                </div>

                {clientDetail.notes && (
                  <div>
                    <span className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1">Notes</span>
                    <p className="font-data text-sm text-[#0a0a0a]/80 leading-relaxed">{clientDetail.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="glass-card rounded-lg p-3 text-center">
                    <p className="font-data text-lg font-semibold text-[#0a0a0a]">{clientDetail._count?.inquiries ?? 0}</p>
                    <p className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">Inquiries</p>
                  </div>
                  <div className="glass-card rounded-lg p-3 text-center">
                    <p className="font-data text-lg font-semibold text-[#0a0a0a]">{clientDetail._count?.deals ?? 0}</p>
                    <p className="font-data text-[10px] tracking-luxury uppercase text-[#71717a]">Deals</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- CREATE DEAL DIALOG ---- */}
      <AnimatePresence>
        {showDealForm && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowDealForm(false)}
          >
            <motion.form
              onSubmit={handleCreateDeal}
              className="bg-white rounded-2xl shadow-dramatic max-w-md w-full p-6 lg:p-8 space-y-5"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif-display text-xl text-[#0a0a0a]">New Deal</h2>
                <button type="button" onClick={() => setShowDealForm(false)} className="p-1 hover:bg-[#f4f4f2] rounded-lg transition-colors">
                  <X size={18} className="text-[#71717a]" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Deal Type</label>
                  <select name="dealType" required className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                    <option value="sale">Sale</option><option value="rent">Rent</option>
                  </select>
                </div>
                <div>
                  <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Total Price</label>
                  <input type="number" name="totalPrice" required placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft focus:shadow-elevated transition-shadow" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>
                <div>
                  <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Close Date</label>
                  <input type="date" name="closeDate" required
                    className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] outline-none shadow-soft focus:shadow-elevated transition-shadow" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>
              </div>
              <button type="submit" className="btn-primary-luxury w-full py-3 font-data text-[11px] tracking-wide-luxury uppercase">Create Deal</button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- CREATE EVENT DIALOG ---- */}
      <AnimatePresence>
        {showEventForm && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowEventForm(false)}
          >
            <motion.form
              onSubmit={handleAddEvent}
              className="bg-white rounded-2xl shadow-dramatic max-w-md w-full p-6 lg:p-8 space-y-5"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif-display text-xl text-[#0a0a0a]">Add Event</h2>
                <button type="button" onClick={() => setShowEventForm(false)} className="p-1 hover:bg-[#f4f4f2] rounded-lg transition-colors">
                  <X size={18} className="text-[#71717a]" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Title</label>
                  <input type="text" name="title" required placeholder="Property showing..."
                    className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Date</label>
                    <input type="date" name="date" required
                      className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                  </div>
                  <div>
                    <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Time</label>
                    <input type="time" name="time" required
                      className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                  </div>
                </div>
                <div>
                  <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Property</label>
                  <input type="text" name="property" placeholder="Property name"
                    className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>
                <div>
                  <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Client</label>
                  <input type="text" name="client" placeholder="Client name"
                    className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>
                <div>
                  <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Type</label>
                  <select name="type" required className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                    <option value="Showing">Showing</option><option value="Closing">Closing</option>
                    <option value="Meeting">Meeting</option><option value="Follow-up">Follow-up</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary-luxury w-full py-3 font-data text-[11px] tracking-wide-luxury uppercase">Add Event</button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- CREATE TAX DIALOG ---- */}
      <AnimatePresence>
        {showTaxForm && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowTaxForm(false)}
          >
            <motion.form
              onSubmit={handleCreateTax}
              className="bg-white rounded-2xl shadow-dramatic max-w-md w-full p-6 lg:p-8 space-y-5"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif-display text-xl text-[#0a0a0a]">Add Tax Obligation</h2>
                <button type="button" onClick={() => setShowTaxForm(false)} className="p-1 hover:bg-[#f4f4f2] rounded-lg transition-colors">
                  <X size={18} className="text-[#71717a]" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Tax Type</label>
                  <input type="text" name="taxType" required placeholder="Income Tax"
                    className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>
                <div>
                  <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Description</label>
                  <input type="text" name="description" placeholder="Q4 2024"
                    className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Period</label>
                    <input type="text" name="period" required placeholder="Q4 2024"
                      className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                  </div>
                  <div>
                    <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Due Date</label>
                    <input type="date" name="dueDate" required
                      className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                  </div>
                </div>
                <div>
                  <label className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] block mb-1.5">Amount</label>
                  <input type="number" name="amount" required placeholder="0.00" step="0.01"
                    className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>
              </div>
              <button type="submit" className="btn-primary-luxury w-full py-3 font-data text-[11px] tracking-wide-luxury uppercase">Add Tax</button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- PORTAL CUSTOMIZE DIALOG ---- */}
      <AnimatePresence>
        {showPortalCustomize && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPortalCustomize(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-dramatic max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 lg:p-8"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif-display text-xl text-[#0a0a0a]">Customize Portal</h2>
                <button onClick={() => setShowPortalCustomize(false)} className="p-1 hover:bg-[#f4f4f2] rounded-lg transition-colors">
                  <X size={18} className="text-[#71717a]" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Brand Colors */}
                <div>
                  <h4 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-3">Brand Colors</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-data text-xs text-[#0a0a0a] block mb-1.5">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={portalConfig.primaryColor}
                          onChange={e => setPortalConfig(p => ({ ...p, primaryColor: e.target.value }))}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                        <span className="font-data text-xs text-[#71717a]">{portalConfig.primaryColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="font-data text-xs text-[#0a0a0a] block mb-1.5">Accent Color</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={portalConfig.accentColor}
                          onChange={e => setPortalConfig(p => ({ ...p, accentColor: e.target.value }))}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                        <span className="font-data text-xs text-[#71717a]">{portalConfig.accentColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <h4 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-2">Logo</h4>
                  <div className="w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-[#f4f4f2] transition-colors" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
                    <Upload size={20} className="text-[#71717a]" />
                    <span className="font-data text-[11px] text-[#71717a]">Upload Logo</span>
                  </div>
                </div>

                {/* Tagline */}
                <div>
                  <h4 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-1.5">Tagline</h4>
                  <input type="text" value={portalConfig.tagline}
                    onChange={e => setPortalConfig(p => ({ ...p, tagline: e.target.value }))}
                    placeholder="Your tagline..."
                    className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>

                {/* Bio */}
                <div>
                  <h4 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-1.5">Bio</h4>
                  <textarea value={portalConfig.bio}
                    onChange={e => setPortalConfig(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell your clients about yourself..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft resize-none" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>

                {/* Social Media Links */}
                <div>
                  <h4 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-3">Social Media</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'instagram' as const, icon: Instagram, placeholder: 'Instagram URL' },
                      { key: 'twitter' as const, icon: Twitter, placeholder: 'X / Twitter URL' },
                      { key: 'facebook' as const, icon: Facebook, placeholder: 'Facebook URL' },
                      { key: 'linkedin' as const, icon: Linkedin, placeholder: 'LinkedIn URL' },
                    ].map(s => (
                      <div key={s.key} className="flex items-center gap-3">
                        <s.icon size={16} className="text-[#71717a] flex-shrink-0" />
                        <input type="url" value={portalConfig[s.key]}
                          onChange={e => setPortalConfig(p => ({ ...p, [s.key]: e.target.value }))}
                          placeholder={s.placeholder}
                          className="flex-1 px-4 py-2 rounded-lg bg-white font-data text-sm text-[#0a0a0a] placeholder:text-[#a1a1aa] outline-none shadow-soft" style={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <h4 className="font-data text-[10px] tracking-luxury uppercase text-[#71717a] mb-3">Preview</h4>
                  <div className="rounded-xl overflow-hidden shadow-soft">
                    <div className="p-6 text-center" style={{ backgroundColor: portalConfig.primaryColor }}>
                      {portalConfig.tagline ? (
                        <p className="font-data text-[11px] tracking-luxury uppercase" style={{ color: portalConfig.accentColor }}>{portalConfig.tagline}</p>
                      ) : (
                        <p className="font-data text-[11px] tracking-luxury uppercase text-white/60">Your Tagline Here</p>
                      )}
                      <p className="font-serif-display text-xl text-white mt-2">{agent.businessName || agent.displayName}</p>
                      {portalConfig.bio && <p className="font-data text-xs text-white/60 mt-2 max-w-xs mx-auto">{portalConfig.bio}</p>}
                    </div>
                    <div className="p-4 bg-white flex items-center justify-center gap-4">
                      {(['instagram', 'twitter', 'facebook', 'linkedin'] as const).filter(k => portalConfig[k]).map(k => (
                        <div key={k} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${portalConfig.accentColor}15` }}>
                          <span className="font-data text-[9px] tracking-luxury uppercase" style={{ color: portalConfig.accentColor }}>{k.slice(0, 2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowPortalCustomize(false)}
                  className="btn-primary-luxury w-full py-3 font-data text-[11px] tracking-wide-luxury uppercase">Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
