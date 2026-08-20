'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Home, Users, DollarSign, Eye, TrendingUp, Search, Plus,
  Bell, BellRing, FileText, Calendar, Clock, MapPin, Phone, Mail, Globe,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, LogOut, ChevronRight,
  LayoutDashboard, Briefcase, Receipt, AlertTriangle, CheckCircle, XCircle,
  Image, Heart, Share2, ExternalLink, Menu,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';

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
  publishedAt: string; _count: { inquiries: number };
}

interface Client {
  id: string; firstName: string; lastName: string; email: string;
  phone: string; source: string; status: string; lastContactAt: string;
  _count: { inquiries: number; deals: number };
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

interface DailyVisit { date: string; count: number; }
interface TopProperty { propertySlug: string; title: string; views: number; }
interface TopClick { elementId: string; elementText: string; count: number; }
interface Referrer { referrer: string; count: number; }
interface PageView { page: string; count: number; }

interface Analytics {
  visits: { last7d: number; last30d: number };
  dailyVisits: DailyVisit[]; topProperties: TopProperty[];
  topClicks: TopClick[]; referrers: Referrer[]; pages: PageView[];
  avgDwellTime: number; recentInquiries: number; conversionRate: number;
}

interface Inquiry {
  id: string; name: string; email: string; phone: string;
  message: string; status: string; isRead: boolean;
  createdAt: string; property: { title: string };
}

type NavTab = 'panel' | 'propiedades' | 'clientes' | 'tratos' | 'impuestos' | 'analiticas' | 'consultas';

function formatTTD(amount: number): string {
  return `$${amount.toLocaleString('es-TT')} TTD`;
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'ahora mismo';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHr < 24) return `hace ${diffHr} hora${diffHr > 1 ? 's' : ''}`;
  if (diffDay === 1) return 'ayer';
  if (diffDay < 30) return `hace ${diffDay} d\u00edas`;
  return `hace ${Math.floor(diffDay / 30)} mes(es)`;
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['Dom', 'Lun', 'Mar', 'Mi\u00e9', 'Jue', 'Vie', 'S\u00e1b'][d.getDay()];
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

export default function AgentDashboard({ agent, onLogout, onBack }: AgentDashboardProps) {
  const [activeTab, setActiveTab] = useState<NavTab>('panel');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [propertyStatus, setPropertyStatus] = useState('all');
  const [propertyType, setPropertyType] = useState('all');
  const [listingType, setListingType] = useState('all');
  const [clientStatus, setClientStatus] = useState('all');
  const [dealStatus, setDealStatus] = useState('all');
  const [taxStatus, setTaxStatus] = useState('all');
  const [inquiryFilter, setInquiryFilter] = useState('all');
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [newProperty, setNewProperty] = useState({
    title: '', description: '', propertyType: 'casa', listingType: 'sale',
    price: '', bedrooms: '', bathrooms: '', areaSqm: '', address: '',
    city: '', neighborhood: '', features: '', isFeatured: false,
  });
  const [newClient, setNewClient] = useState({
    firstName: '', lastName: '', email: '', phone: '', source: 'directo',
  });
  const [newDeal, setNewDeal] = useState({
    dealType: 'venta', status: 'pendiente', totalPrice: '',
    commission: '', closeDate: '', propertyId: '', clientId: '',
  });
  const [newTax, setNewTax] = useState({
    taxType: 'impuesto', description: '', period: '', dueDate: '', amount: '',
  });
  const [expandedInquiry, setExpandedInquiry] = useState<string | null>(null);

  const brand = agent.primaryColor;
  const accent = agent.accentColor;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, d, t, a, i] = await Promise.all([
        fetch('/api/agent/properties').then(r => r.json()),
        fetch('/api/agent/clients').then(r => r.json()),
        fetch('/api/agent/deals').then(r => r.json()),
        fetch('/api/agent/taxes').then(r => r.json()),
        fetch('/api/agent/analytics').then(r => r.json()),
        fetch('/api/agent/inquiries?status=new&unread=true').then(r => r.json()),
      ]);
      setProperties(p.properties || []);
      setClients(c.clients || []);
      setDeals(d.deals || []);
      setTaxes(t.taxes || []);
      setAnalytics(a);
      setInquiries(i.inquiries || []);
    } catch (err) { console.error('Error fetching data:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeProperties = properties.filter(p => p.status === 'disponible' || p.status === 'available').length;
  const newInquiries = inquiries.filter(i => i.status === 'new' || !i.isRead).length;
  const pendingDeals = deals.filter(d => d.status === 'pendiente' || d.status === 'pending').length;
  const visitors7d = analytics?.visits?.last7d || 0;
  const conversionRate = analytics?.conversionRate || 0;
  const unreadCount = inquiries.filter(i => !i.isRead).length;

  const handleCreateProperty = async () => {
    try {
      await fetch('/api/agent/properties', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProperty, price: Number(newProperty.price) || 0, bedrooms: Number(newProperty.bedrooms) || 0, bathrooms: Number(newProperty.bathrooms) || 0, areaSqm: Number(newProperty.areaSqm) || 0 }),
      });
      setPropertyDialogOpen(false);
      setNewProperty({ title: '', description: '', propertyType: 'casa', listingType: 'sale', price: '', bedrooms: '', bathrooms: '', areaSqm: '', address: '', city: '', neighborhood: '', features: '', isFeatured: false });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleCreateClient = async () => {
    try {
      await fetch('/api/agent/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newClient) });
      setClientDialogOpen(false);
      setNewClient({ firstName: '', lastName: '', email: '', phone: '', source: 'directo' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleCreateDeal = async () => {
    try {
      await fetch('/api/agent/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newDeal, totalPrice: Number(newDeal.totalPrice) || 0, commission: Number(newDeal.commission) || 0 }) });
      setDealDialogOpen(false);
      setNewDeal({ dealType: 'venta', status: 'pendiente', totalPrice: '', commission: '', closeDate: '', propertyId: '', clientId: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleCreateTax = async () => {
    try {
      await fetch('/api/agent/taxes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newTax, amount: Number(newTax.amount) || 0 }) });
      setTaxDialogOpen(false);
      setNewTax({ taxType: 'impuesto', description: '', period: '', dueDate: '', amount: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleMarkTaxPaid = async (taxId: string) => {
    try {
      await fetch('/api/agent/taxes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: taxId, status: 'pagado' }) });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleExpandInquiry = async (inqId: string) => {
    setExpandedInquiry(expandedInquiry === inqId ? null : inqId);
    const inq = inquiries.find(i => i.id === inqId);
    if (inq && !inq.isRead) {
      try {
        await fetch(`/api/agent/inquiries/${inqId}/read`, { method: 'POST' });
        setInquiries(prev => prev.map(i => i.id === inqId ? { ...i, isRead: true } : i));
      } catch { /* silent */ }
    }
  };

  const filteredProperties = properties.filter(p => {
    if (propertyStatus !== 'all' && p.status !== propertyStatus) return false;
    if (propertyType !== 'all' && p.propertyType !== propertyType) return false;
    if (listingType !== 'all' && p.listingType !== listingType) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const filteredClients = clients.filter(c => {
    if (clientStatus !== 'all' && c.status !== clientStatus) return false;
    if (searchQuery && !`${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const filteredDeals = deals.filter(d => dealStatus === 'all' || d.status === dealStatus);
  const filteredTaxes = taxes.filter(t => taxStatus === 'all' || t.status === taxStatus);
  const filteredInquiries = inquiries.filter(i => {
    if (inquiryFilter === 'new' && i.status !== 'new') return false;
    return true;
  });

  const navItems: { key: NavTab; label: string; icon: React.ReactNode }[] = [
    { key: 'panel', label: 'Panel Principal', icon: <LayoutDashboard size={20} /> },
    { key: 'propiedades', label: 'Propiedades', icon: <Building2 size={20} /> },
    { key: 'clientes', label: 'Clientes', icon: <Users size={20} /> },
    { key: 'tratos', label: 'Tratos', icon: <Briefcase size={20} /> },
    { key: 'impuestos', label: 'Impuestos', icon: <Receipt size={20} /> },
    { key: 'analiticas', label: 'Anal\u00edticas', icon: <BarChart3 size={20} /> },
    { key: 'consultas', label: 'Consultas', icon: <Mail size={20} /> },
  ];

  const pageTitles: Record<NavTab, string> = {
    panel: 'Panel Principal', propiedades: 'Propiedades', clientes: 'Clientes',
    tratos: 'Tratos', impuestos: 'Impuestos', analiticas: 'Anal\u00edticas', consultas: 'Consultas',
  };

  function statusBadge(status: string, type: 'property' | 'deal' | 'tax') {
    const maps: Record<string, Record<string, { label: string; cls: string }>> = {
      property: {
        disponible: { label: 'Disponible', cls: 'bg-emerald-100 text-emerald-800' },
        available: { label: 'Disponible', cls: 'bg-emerald-100 text-emerald-800' },
        pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
        pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
        vendida: { label: 'Vendida', cls: 'bg-sky-100 text-sky-800' },
        sold: { label: 'Vendida', cls: 'bg-sky-100 text-sky-800' },
        alquilada: { label: 'Alquilada', cls: 'bg-teal-100 text-teal-800' },
        rented: { label: 'Alquilada', cls: 'bg-teal-100 text-teal-800' },
      },
      deal: {
        pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
        pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
        cerrado: { label: 'Cerrado', cls: 'bg-emerald-100 text-emerald-800' },
        closed: { label: 'Cerrado', cls: 'bg-emerald-100 text-emerald-800' },
        cancelado: { label: 'Cancelado', cls: 'bg-red-100 text-red-800' },
      },
      tax: {
        pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
        pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
        pagado: { label: 'Pagado', cls: 'bg-emerald-100 text-emerald-800' },
        paid: { label: 'Pagado', cls: 'bg-emerald-100 text-emerald-800' },
        vencido: { label: 'Vencido', cls: 'bg-red-100 text-red-800' },
        overdue: { label: 'Vencido', cls: 'bg-red-100 text-red-800' },
      },
    };
    const s = maps[type]?.[status] || { label: status, cls: 'bg-gray-100 text-gray-800' };
    return <Badge className={cn('text-xs', s.cls)}>{s.label}</Badge>;
  }

  // ─── PANEL PRINCIPAL ─────────────────────────────────────────────────

  const renderPanel = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="min-w-[180px] flex-shrink-0">
                <CardContent className="p-4"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-20" /></CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          </div>
        </div>
      );
    }
    const dailyVisits = analytics?.dailyVisits || [];
    const maxVisits = Math.max(...dailyVisits.map(d => d.count), 1);
    const recentInq = inquiries.slice(0, 5);
    const topProps = analytics?.topProperties || [];
    const maxViews = Math.max(...topProps.map(p => p.views), 1);

    return (
      <motion.div {...fadeIn} className="space-y-6">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          <Card className="min-w-[180px] flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Building2 size={16} className="text-emerald-600" /><span className="text-xs text-gray-500">Propiedades Activas</span></div>
              <p className="text-2xl font-bold" style={{ color: brand }}>{activeProperties}</p>
              <div className="flex items-center gap-1 text-xs text-emerald-600"><ArrowUpRight size={12} /> en línea</div>
            </CardContent>
          </Card>
          <Card className="min-w-[180px] flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Mail size={16} className="text-amber-600" /><span className="text-xs text-gray-500">Nuevas Consultas</span></div>
              <p className="text-2xl font-bold text-amber-600">{newInquiries}</p>
              <div className="flex items-center gap-1 text-xs text-amber-600"><BellRing size={12} /> sin leer</div>
            </CardContent>
          </Card>
          <Card className="min-w-[180px] flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Briefcase size={16} className="text-orange-600" /><span className="text-xs text-gray-500">Tratos Pendientes</span></div>
              <p className="text-2xl font-bold text-orange-600">{pendingDeals}</p>
              <div className="flex items-center gap-1 text-xs text-orange-500"><Clock size={12} /> en proceso</div>
            </CardContent>
          </Card>
          <Card className="min-w-[180px] flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Eye size={16} className="text-teal-600" /><span className="text-xs text-gray-500">Visitantes (7d)</span></div>
              <p className="text-2xl font-bold text-teal-600">{visitors7d}</p>
              <div className="flex items-center gap-1 text-xs text-teal-600"><TrendingUp size={12} /> esta semana</div>
            </CardContent>
          </Card>
          <Card className="min-w-[180px] flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} style={{ color: accent }} /><span className="text-xs text-gray-500">Tasa de Conversión</span></div>
              <p className="text-2xl font-bold" style={{ color: accent }}>{conversionRate.toFixed(1)}%</p>
              <div className="flex items-center gap-1 text-xs text-gray-500"><PieChart size={12} /> consultas → tratos</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Visitas Diarias (últimos 7 días)</CardTitle></CardHeader>
            <CardContent className="p-4">
              {dailyVisits.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No hay datos de visitas aún</p>
              ) : (
                <div className="flex items-end gap-2 h-48">
                  {dailyVisits.map(d => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-600">{d.count}</span>
                      <div className="w-full rounded-t-md transition-all duration-300" style={{ height: `${Math.max((d.count / maxVisits) * 140, 4)}px`, backgroundColor: brand, opacity: 0.85 }} />
                      <span className="text-xs text-gray-400">{getDayName(d.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Consultas Recientes</CardTitle>
                <button onClick={() => setActiveTab('consultas')} className="text-xs font-medium hover:underline" style={{ color: accent }}>Ver todas</button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-48 overflow-y-auto scrollbar-thin">
              {recentInq.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No hay consultas recientes</p>
              ) : (
                recentInq.map(inq => (
                  <div key={inq.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => { setActiveTab('consultas'); setExpandedInquiry(inq.id); }}>
                    <div className="relative mt-1">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-gray-100 text-gray-600">{inq.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                      {!inq.isRead && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{inq.name}</p>
                      <p className="text-xs text-gray-500 truncate">{inq.property?.title || 'Sin propiedad'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(inq.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Propiedades Más Vistas</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3">
              {topProps.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No hay datos aún</p>
              ) : (
                topProps.slice(0, 5).map((p, idx) => (
                  <div key={p.propertySlug} className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white" style={{ backgroundColor: idx < 3 ? brand : '#9CA3AF' }}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(p.views / maxViews) * 100}%`, backgroundColor: accent }} /></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">{p.views}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Acciones Rápidas</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3">
              <Button className="w-full justify-start gap-3 text-sm" style={{ backgroundColor: brand }} onClick={() => { setActiveTab('propiedades'); setTimeout(() => setPropertyDialogOpen(true), 100); }}><Plus size={16} /> Nueva Propiedad</Button>
              <Button className="w-full justify-start gap-3 text-sm" variant="outline" onClick={() => { setActiveTab('clientes'); setTimeout(() => setClientDialogOpen(true), 100); }}><Plus size={16} /> Nuevo Cliente</Button>
              <Button className="w-full justify-start gap-3 text-sm" variant="outline" onClick={() => window.open(`/${agent.slug}`, '_blank')}><ExternalLink size={16} /> Ver Portal Público</Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  };

  // ─── PROPIEDADES ─────────────────────────────────────────────────────

  const renderPropiedades = () => (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Buscar propiedades..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={propertyStatus} onValueChange={setPropertyStatus}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="vendida">Vendida</SelectItem>
              <SelectItem value="alquilada">Alquilada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem><SelectItem value="casa">Casa</SelectItem><SelectItem value="apartamento">Apartamento</SelectItem><SelectItem value="terreno">Terreno</SelectItem><SelectItem value="comercial">Comercial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={listingType} onValueChange={setListingType}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Lista" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem><SelectItem value="sale">Venta</SelectItem><SelectItem value="rent">Renta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" style={{ backgroundColor: brand }} onClick={() => setPropertyDialogOpen(true)} className="whitespace-nowrap"><Plus size={16} className="mr-1" /> Nueva Propiedad</Button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => (<Card key={i}><Skeleton className="h-40 rounded-t-lg" /><CardContent className="p-4 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>))}</div>
      ) : filteredProperties.length === 0 ? (
        <Card className="py-16 text-center"><Home size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">No se encontraron propiedades</p><p className="text-sm text-gray-400 mt-1">Crea tu primera propiedad para comenzar</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProperties.map(prop => (
            <Card key={prop.id} className="overflow-hidden group">
              <div className="relative h-40 bg-gray-100 flex items-center justify-center">
                {prop.images && prop.images.length > 0 ? (<img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />) : (<Home size={32} className="text-gray-300" />)}
                <div className="absolute top-2 left-2">{statusBadge(prop.status, 'property')}</div>
                {prop.isFeatured && (<div className="absolute top-2 right-2"><Badge className="bg-amber-500 text-white text-xs"><Heart size={10} className="mr-1" /> Destacada</Badge></div>)}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-800 truncate">{prop.title}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><MapPin size={12} /><span className="truncate">{prop.neighborhood}, {prop.city}</span></div>
                <p className="text-lg font-bold mt-2" style={{ color: brand }}>{formatTTD(prop.price)}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Building2 size={14} /> {prop.bedrooms} hab.</span>
                  <span className="flex items-center gap-1"><DollarSign size={14} /> {prop.bathrooms} baños</span>
                  <span className="flex items-center gap-1"><Globe size={14} /> {prop.areaSqm} m²</span>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs"><Mail size={10} className="mr-1" />{prop._count?.inquiries || 0} consultas</Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500 hover:text-gray-700"><Share2 size={14} /></Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500 hover:text-red-600"><XCircle size={14} /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={propertyDialogOpen} onOpenChange={setPropertyDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Propiedad</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={newProperty.title} onChange={e => setNewProperty({ ...newProperty, title: e.target.value })} placeholder="Ej: Casa moderna en Maraval" /></div>
            <div className="space-y-2"><Label>Descripción</Label><Textarea value={newProperty.description} onChange={e => setNewProperty({ ...newProperty, description: e.target.value })} placeholder="Describe la propiedad..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Tipo de Propiedad</Label><Select value={newProperty.propertyType} onValueChange={v => setNewProperty({ ...newProperty, propertyType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="casa">Casa</SelectItem><SelectItem value="apartamento">Apartamento</SelectItem><SelectItem value="terreno">Terreno</SelectItem><SelectItem value="comercial">Comercial</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Tipo de Lista</Label><Select value={newProperty.listingType} onValueChange={v => setNewProperty({ ...newProperty, listingType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">Venta</SelectItem><SelectItem value="rent">Renta</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Precio (TTD)</Label><Input type="number" value={newProperty.price} onChange={e => setNewProperty({ ...newProperty, price: e.target.value })} placeholder="850000" /></div>
              <div className="space-y-2"><Label>Área (m²)</Label><Input type="number" value={newProperty.areaSqm} onChange={e => setNewProperty({ ...newProperty, areaSqm: e.target.value })} placeholder="200" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Habitaciones</Label><Input type="number" value={newProperty.bedrooms} onChange={e => setNewProperty({ ...newProperty, bedrooms: e.target.value })} placeholder="3" /></div>
              <div className="space-y-2"><Label>Baños</Label><Input type="number" value={newProperty.bathrooms} onChange={e => setNewProperty({ ...newProperty, bathrooms: e.target.value })} placeholder="2" /></div>
            </div>
            <div className="space-y-2"><Label>Dirección</Label><Input value={newProperty.address} onChange={e => setNewProperty({ ...newProperty, address: e.target.value })} placeholder="12 Calle Principal" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Ciudad</Label><Input value={newProperty.city} onChange={e => setNewProperty({ ...newProperty, city: e.target.value })} placeholder="Port of Spain" /></div>
              <div className="space-y-2"><Label>Barrio</Label><Input value={newProperty.neighborhood} onChange={e => setNewProperty({ ...newProperty, neighborhood: e.target.value })} placeholder="Maraval" /></div>
            </div>
            <div className="space-y-2"><Label>Características (separadas por coma)</Label><Input value={newProperty.features} onChange={e => setNewProperty({ ...newProperty, features: e.target.value })} placeholder="piscina, estacionamiento, jardín" /></div>
            <div className="flex items-center gap-2"><Checkbox checked={newProperty.isFeatured} onCheckedChange={c => setNewProperty({ ...newProperty, isFeatured: c === true })} /><Label className="text-sm">Marcar como destacada</Label></div>
            <Button className="w-full" style={{ backgroundColor: brand }} onClick={handleCreateProperty} disabled={!newProperty.title || !newProperty.price}>Crear Propiedad</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );

  // ─── CLIENTES ────────────────────────────────────────────────────────

  const renderClientes = () => (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Buscar clientes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={clientStatus} onValueChange={setClientStatus}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="activo">Activo</SelectItem><SelectItem value="inactivo">Inactivo</SelectItem><SelectItem value="nuevo">Nuevo</SelectItem></SelectContent>
        </Select>
        <Button size="sm" style={{ backgroundColor: brand }} onClick={() => setClientDialogOpen(true)} className="whitespace-nowrap"><Plus size={16} className="mr-1" /> Nuevo Cliente</Button>
      </div>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (<Card key={i}><CardContent className="p-4 flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></CardContent></Card>))}</div>
      ) : filteredClients.length === 0 ? (
        <Card className="py-16 text-center"><Users size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">No se encontraron clientes</p><p className="text-sm text-gray-400 mt-1">Agrega tu primer cliente para comenzar</p></Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Teléfono</TableHead><TableHead>Fuente</TableHead><TableHead>Estado</TableHead><TableHead>Último Contacto</TableHead><TableHead className="text-right">Consultas / Tratos</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredClients.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium"><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarFallback className="text-xs" style={{ backgroundColor: accent + '20', color: accent }}>{c.firstName.charAt(0)}{c.lastName.charAt(0)}</AvatarFallback></Avatar>{c.firstName} {c.lastName}</div></TableCell>
                      <TableCell className="text-gray-500 text-sm">{c.email}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{c.phone}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{c.source}</Badge></TableCell>
                      <TableCell><Badge className={cn('text-xs capitalize', c.status === 'activo' ? 'bg-emerald-100 text-emerald-800' : c.status === 'nuevo' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800')}>{c.status}</Badge></TableCell>
                      <TableCell className="text-sm text-gray-500">{c.lastContactAt ? formatRelativeTime(c.lastContactAt) : 'Nunca'}</TableCell>
                      <TableCell className="text-right text-sm"><span className="font-medium">{c._count?.inquiries || 0}</span>{' / '}<span className="font-medium">{c._count?.deals || 0}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
          <div className="md:hidden space-y-3">
            {filteredClients.map(c => (
              <Card key={c.id}><CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar><AvatarFallback className="text-xs" style={{ backgroundColor: accent + '20', color: accent }}>{c.firstName.charAt(0)}{c.lastName.charAt(0)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className="font-medium text-gray-800">{c.firstName} {c.lastName}</p><p className="text-xs text-gray-500">{c.email}</p></div>
                  <Badge className={cn('text-xs capitalize', c.status === 'activo' ? 'bg-emerald-100 text-emerald-800' : c.status === 'nuevo' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800')}>{c.status}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Phone size={12} /> {c.phone}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {c.lastContactAt ? formatRelativeTime(c.lastContactAt) : 'Nunca'}</span>
                </div>
                <div className="mt-2 flex gap-2 text-xs"><Badge variant="secondary">{c._count?.inquiries || 0} consultas</Badge><Badge variant="secondary">{c._count?.deals || 0} tratos</Badge><Badge variant="outline" className="capitalize">{c.source}</Badge></div>
              </CardContent></Card>
            ))}
          </div>
        </>
      )}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Nombre</Label><Input value={newClient.firstName} onChange={e => setNewClient({ ...newClient, firstName: e.target.value })} placeholder="Juan" /></div>
            <div className="space-y-2"><Label>Apellido</Label><Input value={newClient.lastName} onChange={e => setNewClient({ ...newClient, lastName: e.target.value })} placeholder="Pérez" /></div>
          </div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="juan@email.com" /></div>
          <div className="space-y-2"><Label>Teléfono</Label><Input value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} placeholder="1-868-123-4567" /></div>
          <div className="space-y-2"><Label>Fuente</Label><Select value={newClient.source} onValueChange={v => setNewClient({ ...newClient, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="directo">Directo</SelectItem><SelectItem value="portal">Portal</SelectItem><SelectItem value="referido">Referido</SelectItem><SelectItem value="redes_sociales">Redes Sociales</SelectItem><SelectItem value="otro">Otro</SelectItem></SelectContent></Select></div>
          <Button className="w-full" style={{ backgroundColor: brand }} onClick={handleCreateClient} disabled={!newClient.firstName || !newClient.lastName}>Crear Cliente</Button>
        </div></DialogContent>
      </Dialog>
    </motion.div>
  );

  // ─── TRATOS ───────────────────────────────────────────────────────────

  const renderTratos = () => (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2">
          {[['all', 'Todos'], ['pendiente', 'Pendientes'], ['cerrado', 'Cerrados'], ['cancelado', 'Cancelados']].map(([val, label]) => (
            <Button key={val} variant={dealStatus === val ? 'default' : 'outline'} size="sm" className={cn('text-xs', dealStatus === val && 'text-white')} style={dealStatus === val ? { backgroundColor: brand } : undefined} onClick={() => setDealStatus(val)}>{label}</Button>
          ))}
        </div>
        <div className="sm:ml-auto"><Button size="sm" style={{ backgroundColor: brand }} onClick={() => setDealDialogOpen(true)}><Plus size={16} className="mr-1" /> Nuevo Trato</Button></div>
      </div>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-32" /></CardContent></Card>))}</div>
      ) : filteredDeals.length === 0 ? (
        <Card className="py-16 text-center"><Briefcase size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">No hay tratos</p><p className="text-sm text-gray-400 mt-1">Crea tu primer trato para comenzar</p></Card>
      ) : (
        <div className="space-y-3">
          {filteredDeals.map(deal => (
            <Card key={deal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><h3 className="font-semibold text-gray-800">{deal.property?.title || 'Sin propiedad'}</h3>{statusBadge(deal.status, 'deal')}</div>
                    <p className="text-sm text-gray-500 mt-1">Cliente: {deal.client?.firstName} {deal.client?.lastName}</p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">Tipo: {deal.dealType}</p>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div><p className="text-xs text-gray-500">Precio Total</p><p className="font-bold text-gray-800">{formatTTD(deal.totalPrice)}</p></div>
                    <div><p className="text-xs text-gray-500">Comisión</p><p className="font-bold" style={{ color: accent }}>{formatTTD(deal.commission)}</p></div>
                    {deal.closeDate && (<div><p className="text-xs text-gray-500">Cierre</p><p className="text-sm text-gray-600 flex items-center gap-1"><Calendar size={12} /> {deal.closeDate}</p></div>)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Nuevo Trato</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Tipo de Trato</Label><Select value={newDeal.dealType} onValueChange={v => setNewDeal({ ...newDeal, dealType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="venta">Venta</SelectItem><SelectItem value="renta">Renta</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Estado</Label><Select value={newDeal.status} onValueChange={v => setNewDeal({ ...newDeal, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="cerrado">Cerrado</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Propiedad</Label><Select value={newDeal.propertyId} onValueChange={v => setNewDeal({ ...newDeal, propertyId: v })}><SelectTrigger><SelectValue placeholder="Seleccionar propiedad" /></SelectTrigger><SelectContent>{properties.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Cliente</Label><Select value={newDeal.clientId} onValueChange={v => setNewDeal({ ...newDeal, clientId: v })}><SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger><SelectContent>{clients.map(c => (<SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>))}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Precio Total (TTD)</Label><Input type="number" value={newDeal.totalPrice} onChange={e => setNewDeal({ ...newDeal, totalPrice: e.target.value })} placeholder="850000" /></div>
            <div className="space-y-2"><Label>Comisión (TTD)</Label><Input type="number" value={newDeal.commission} onChange={e => setNewDeal({ ...newDeal, commission: e.target.value })} placeholder="25000" /></div>
          </div>
          <div className="space-y-2"><Label>Fecha de Cierre</Label><Input type="date" value={newDeal.closeDate} onChange={e => setNewDeal({ ...newDeal, closeDate: e.target.value })} /></div>
          <Button className="w-full" style={{ backgroundColor: brand }} onClick={handleCreateDeal} disabled={!newDeal.propertyId || !newDeal.clientId}>Crear Trato</Button>
        </div></DialogContent>
      </Dialog>
    </motion.div>
  );

  // ─── IMPUESTOS ─────────────────────────────────────────────────────────

  const renderImpuestos = () => {
    const totalPending = taxes.filter(t => t.status !== 'pagado' && t.status !== 'paid').reduce((s, t) => s + t.amount, 0);
    const totalPaid = taxes.filter(t => t.status === 'pagado' || t.status === 'paid').reduce((s, t) => s + t.amount, 0);

    return (
      <motion.div {...fadeIn} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center"><AlertTriangle size={20} className="text-amber-600" /></div><div><p className="text-xs text-gray-500">Total Pendiente</p><p className="text-lg font-bold text-amber-600">{formatTTD(totalPending)}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle size={20} className="text-emerald-600" /></div><div><p className="text-xs text-gray-500">Total Pagado</p><p className="text-lg font-bold text-emerald-600">{formatTTD(totalPaid)}</p></div></CardContent></Card>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-2">
            {[['all', 'Todos'], ['pendiente', 'Pendientes'], ['pagado', 'Pagados']].map(([val, label]) => (
              <Button key={val} variant={taxStatus === val ? 'default' : 'outline'} size="sm" className={cn('text-xs', taxStatus === val && 'text-white')} style={taxStatus === val ? { backgroundColor: brand } : undefined} onClick={() => setTaxStatus(val)}>{label}</Button>
            ))}
          </div>
          <div className="sm:ml-auto"><Button size="sm" style={{ backgroundColor: brand }} onClick={() => setTaxDialogOpen(true)}><Plus size={16} className="mr-1" /> Nueva Obligación</Button></div>
        </div>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Card key={i}><CardContent className="p-4 flex items-center gap-4"><Skeleton className="h-10 w-10 rounded" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></CardContent></Card>))}</div>
        ) : filteredTaxes.length === 0 ? (
          <Card className="py-16 text-center"><Receipt size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">No hay obligaciones fiscales</p><p className="text-sm text-gray-400 mt-1">Agrega tu primera obligación fiscal</p></Card>
        ) : (
          <div className="space-y-3">
            {filteredTaxes.map(tax => {
              const isPaid = tax.status === 'pagado' || tax.status === 'paid';
              const overdue = !isPaid && isOverdue(tax.dueDate);
              return (
                <Card key={tax.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0', isPaid ? 'bg-emerald-100' : overdue ? 'bg-red-100' : 'bg-amber-100')}>
                        <FileText size={20} className={cn(isPaid ? 'text-emerald-600' : overdue ? 'text-red-600' : 'text-amber-600')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><h3 className="font-semibold text-gray-800">{tax.description}</h3>{statusBadge(tax.status, 'tax')}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          <span className="capitalize">{tax.taxType}</span><span>{tax.period}</span>
                          <span className={cn('flex items-center gap-1', overdue && 'text-red-600 font-medium')}><Calendar size={12} /> Vence: {tax.dueDate}{overdue && ' (Vencido)'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-gray-800">{formatTTD(tax.amount)}</p>
                        {!isPaid && (<Button size="sm" variant="outline" className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => handleMarkTaxPaid(tax.id)}><CheckCircle size={14} className="mr-1" /> Marcar Pagado</Button>)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        <Dialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen}>
          <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Nueva Obligación Fiscal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Tipo de Impuesto</Label><Select value={newTax.taxType} onValueChange={v => setNewTax({ ...newTax, taxType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="impuesto_propiedad">Impuesto a la Propiedad</SelectItem><SelectItem value="impuesto_renta">Impuesto a la Renta</SelectItem><SelectItem value="iva">IVA</SelectItem><SelectItem value="otros">Otros</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Descripción</Label><Input value={newTax.description} onChange={e => setNewTax({ ...newTax, description: e.target.value })} placeholder="Descripción de la obligación" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Período</Label><Input value={newTax.period} onChange={e => setNewTax({ ...newTax, period: e.target.value })} placeholder="Q1 2025" /></div>
              <div className="space-y-2"><Label>Fecha de Vencimiento</Label><Input type="date" value={newTax.dueDate} onChange={e => setNewTax({ ...newTax, dueDate: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Monto (TTD)</Label><Input type="number" value={newTax.amount} onChange={e => setNewTax({ ...newTax, amount: e.target.value })} placeholder="5000" /></div>
            <Button className="w-full" style={{ backgroundColor: brand }} onClick={handleCreateTax} disabled={!newTax.description || !newTax.amount}>Crear Obligación</Button>
          </div></DialogContent>
        </Dialog>
      </motion.div>
    );
  };

  // ─── ANALÍTICAS ──────────────────────────────────────────────────────

  const renderAnaliticas = () => {
    if (loading) {
      return (<div className="space-y-6"><Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card><Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card></div></div>);
    }
    const dailyVisits = analytics?.dailyVisits || [];
    const maxVisits = Math.max(...dailyVisits.map(d => d.count), 1);
    const topClicks = analytics?.topClicks || [];
    const referrers = analytics?.referrers || [];
    const pages = analytics?.pages || [];
    const totalVisits = analytics?.visits?.last30d || 0;
    const totalPropertyViews = analytics?.topProperties?.reduce((s, p) => s + p.views, 0) || 0;
    const totalInq = analytics?.recentInquiries || 0;
    const totalDealsCount = deals.length;

    return (
      <motion.div {...fadeIn} className="space-y-6">
        <Card>
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold text-gray-700">Visitas Diarias (últimos 7 días)</CardTitle><div className="flex items-center gap-2 text-xs text-gray-500"><Eye size={14} /><span>Total 30d: {analytics?.visits?.last30d || 0}</span></div></div></CardHeader>
          <CardContent className="p-4">
            {dailyVisits.length === 0 ? (<p className="text-sm text-gray-400 text-center py-12">No hay datos de visitas aún</p>) : (
              <div className="flex items-end gap-3 h-56">{dailyVisits.map(d => (<div key={d.date} className="flex-1 flex flex-col items-center gap-1"><span className="text-xs font-medium text-gray-600">{d.count}</span><div className="w-full rounded-t-md transition-all duration-300 hover:opacity-100" style={{ height: `${Math.max((d.count / maxVisits) * 180, 4)}px`, backgroundColor: brand, opacity: 0.75 }} /><span className="text-xs text-gray-400">{getDayName(d.date)}</span></div>))}</div>
            )}
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Elementos Más Clicados</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
              {topClicks.length === 0 ? (<p className="text-sm text-gray-400 text-center py-4">No hay datos aún</p>) : (topClicks.map((click, idx) => { const maxC = Math.max(...topClicks.map(c => c.count), 1); return (<div key={click.elementId} className="flex items-center gap-3"><span className="text-xs font-bold text-gray-400 w-4 text-right">{idx + 1}</span><div className="flex-1 min-w-0"><p className="text-sm text-gray-700 truncate">{click.elementText}</p><Progress value={(click.count / maxC) * 100} className="h-1.5 mt-1" /></div><span className="text-xs font-medium text-gray-600">{click.count}</span></div>); }))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Fuentes de Tráfico</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
              {referrers.length === 0 ? (<p className="text-sm text-gray-400 text-center py-4">No hay datos aún</p>) : (referrers.map((ref, idx) => { const maxR = Math.max(...referrers.map(r => r.count), 1); return (<div key={idx} className="flex items-center gap-3"><Globe size={14} className="text-gray-400" /><div className="flex-1 min-w-0"><p className="text-sm text-gray-700 truncate">{ref.referrer}</p><Progress value={(ref.count / maxR) * 100} className="h-1.5 mt-1" /></div><span className="text-xs font-medium text-gray-600">{ref.count}</span></div>); }))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Vistas de Página</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
              {pages.length === 0 ? (<p className="text-sm text-gray-400 text-center py-4">No hay datos aún</p>) : (pages.map((page, idx) => { const maxP = Math.max(...pages.map(p => p.count), 1); return (<div key={idx} className="flex items-center gap-3"><FileText size={14} className="text-gray-400" /><div className="flex-1 min-w-0"><p className="text-sm text-gray-700 truncate">{page.page}</p><Progress value={(page.count / maxP) * 100} className="h-1.5 mt-1" /></div><span className="text-xs font-medium text-gray-600">{page.count}</span></div>); }))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Métricas Clave</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Tiempo Promedio de Estadía</span>
                <span className="font-semibold text-gray-800">{analytics?.avgDwellTime ? `${Math.floor(analytics.avgDwellTime / 60)}m ${analytics.avgDwellTime % 60}s` : 'N/A'}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Embudo de Conversión</p>
                <div className="space-y-2">
                  {[
                    { label: 'Visitantes', count: totalVisits, color: '#059669' },
                    { label: 'Vistas de Propiedad', count: totalPropertyViews, color: '#D97706' },
                    { label: 'Consultas', count: totalInq, color: '#DC2626' },
                    { label: 'Tratos', count: totalDealsCount, color: brand },
                  ].map((step, idx) => {
                    const prevCount = idx === 0 ? step.count : [totalVisits, totalPropertyViews, totalInq, totalDealsCount][idx - 1];
                    const rate = prevCount > 0 ? ((step.count / prevCount) * 100).toFixed(1) : '0';
                    return (
                      <div key={step.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{step.label}</span>
                          <div className="flex items-center gap-2"><span className="font-medium">{step.count}</span>{idx > 0 && (<span className="text-xs text-gray-400">({rate}%)</span>)}</div>
                        </div>
                        <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalVisits > 0 ? (step.count / totalVisits) * 100 : 0}%`, backgroundColor: step.color }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  };

  // ─── CONSULTAS ───────────────────────────────────────────────────────

  const renderConsultas = () => (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2">
          {[['all', 'Todas'], ['new', 'Nuevas'], ['read', 'Leídas']].map(([val, label]) => (
            <Button key={val} variant={inquiryFilter === val ? 'default' : 'outline'} size="sm" className={cn('text-xs', inquiryFilter === val && 'text-white')} style={inquiryFilter === val ? { backgroundColor: brand } : undefined} onClick={() => setInquiryFilter(val)}>{label}</Button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (<Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-64" /><Skeleton className="h-3 w-24" /></CardContent></Card>))}</div>
      ) : filteredInquiries.length === 0 ? (
        <Card className="py-16 text-center"><Mail size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">No hay consultas</p><p className="text-sm text-gray-400 mt-1">Las consultas de tus propiedades aparecerán aquí</p></Card>
      ) : (
        <div className="space-y-3">
          {filteredInquiries.map(inq => {
            const isExpanded = expandedInquiry === inq.id;
            return (
              <Card key={inq.id} className={cn('cursor-pointer transition-all hover:shadow-md', !inq.isRead && 'border-l-4 border-l-amber-500')} onClick={() => handleExpandInquiry(inq.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-gray-100 text-gray-600">{inq.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn('text-sm', !inq.isRead && 'font-bold text-gray-900', inq.isRead && 'font-medium text-gray-700')}>{inq.name}</h3>
                        {!inq.isRead && (<span className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />)}
                        <Badge className={cn('text-xs', inq.status === 'new' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600')}>{inq.status === 'new' ? 'Nueva' : inq.status === 'read' ? 'Leída' : inq.status === 'responded' ? 'Respondida' : inq.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{inq.email} · {inq.phone}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Propiedad: {inq.property?.title || 'N/A'} · {formatRelativeTime(inq.createdAt)}</p>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{inq.message}</p>
                            </div>
                            <div className="mt-2 flex gap-2">
                              <a
                                href={`https://wa.me/${agent.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${inq.name}, gracias por tu consulta sobre ${inq.property?.title || 'la propiedad'}. Me pondré en contacto contigo pronto.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md text-white"
                                style={{ backgroundColor: '#25D366' }}
                              >
                                <Phone size={12} /> Responder por WhatsApp
                              </a>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <ChevronRight size={16} className={cn('text-gray-400 flex-shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );

  // ─── TAB CONTENT ROUTER ──────────────────────────────────────────────

  const renderContent = () => {
    switch (activeTab) {
      case 'panel': return renderPanel();
      case 'propiedades': return renderPropiedades();
      case 'clientes': return renderClientes();
      case 'tratos': return renderTratos();
      case 'impuestos': return renderImpuestos();
      case 'analiticas': return renderAnaliticas();
      case 'consultas': return renderConsultas();
      default: return renderPanel();
    }
  };

  // ─── MAIN RENDER ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 z-30" style={{ backgroundColor: brand }}>
        <div className="p-5 flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white/30">
            <AvatarFallback className="text-sm font-bold text-white" style={{ backgroundColor: accent }}>{agent.businessName.charAt(0)}{agent.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="font-bold text-white text-sm truncate">{agent.businessName}</h2>
            {agent.tagline && <p className="text-white/60 text-xs truncate">{agent.tagline}</p>}
          </div>
        </div>
        <Separator className="bg-white/10" />
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                activeTab === item.key
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
              {item.key === 'consultas' && unreadCount > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">{unreadCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10">
            <Badge className="text-xs text-white border-white/30" style={{ backgroundColor: accent, borderColor: accent + '50' }}>Plan Pro</Badge>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pb-16 lg:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-[#FDFBF7]/95 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center justify-between h-14 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="lg:hidden text-gray-500 hover:text-gray-700"><ChevronRight size={20} className="rotate-180" /></button>
              <h1 className="text-lg font-bold text-gray-800">{pageTitles[activeTab]}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-48 h-8 text-sm" />
              </div>
              <button onClick={() => setActiveTab('consultas')} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                {unreadCount > 0 ? <BellRing size={20} className="text-amber-600" /> : <Bell size={20} className="text-gray-500" />}
                {unreadCount > 0 && (<span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>)}
              </button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-medium" style={{ backgroundColor: brand + '20', color: brand }}>{agent.displayName.charAt(0)}{agent.displayName.split(' ')[1]?.charAt(0) || ''}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <div key={activeTab}>{renderContent()}</div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around h-16 px-1">
          {[
            { key: 'panel' as NavTab, label: 'Panel', icon: <LayoutDashboard size={18} /> },
            { key: 'propiedades' as NavTab, label: 'Propiedades', icon: <Building2 size={18} /> },
            { key: 'clientes' as NavTab, label: 'Clientes', icon: <Users size={18} /> },
            { key: 'analiticas' as NavTab, label: 'Analíticas', icon: <BarChart3 size={18} /> },
          ].map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)} className={cn('flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors min-w-0', activeTab === item.key ? 'text-gray-900' : 'text-gray-400')}>
              <div className="relative">{item.icon}{item.key === 'consultas' && unreadCount > 0 && (<span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />)}</div>
              <span className="text-[10px] font-medium truncate">{item.label}</span>
              {activeTab === item.key && (<div className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: brand }} />)}
            </button>
          ))}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className={cn('flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors', mobileMenuOpen ? 'text-gray-900' : 'text-gray-400')}>
                <Menu size={18} /><span className="text-[10px] font-medium">Más</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh]">
              <SheetHeader className="pb-2"><SheetTitle className="text-left">Más Opciones</SheetTitle></SheetHeader>
              <div className="space-y-1">
                {[navItems[3], navItems[4], navItems[6]].map(item => (
                  <button key={item.key} onClick={() => { setActiveTab(item.key); setMobileMenuOpen(false); }} className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors text-left', activeTab === item.key ? 'font-medium' : 'text-gray-600')}>
                    {item.icon}{item.label}
                    {item.key === 'consultas' && unreadCount > 0 && (<Badge className="ml-auto bg-red-500 text-white text-xs">{unreadCount}</Badge>)}
                  </button>
                ))}
                <Separator className="my-2" />
                <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                  <LogOut size={20} /> Cerrar Sesión
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}
