'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Building2,
  Home,
  Users,
  DollarSign,
  Search,
  MapPin,
  Phone,
  Mail,
  Globe,
  Heart,
  Share2,
  Bed,
  Bath,
  Maximize,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Facebook,
  Instagram,
  MessageCircle,
  ArrowRight,
  Star,
  Check,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────
interface PublicPortalProps {
  agentSlug: string;
  onBack?: () => void;
}

interface AgentData {
  id: string;
  businessName: string;
  displayName: string;
  tagline: string | null;
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  facebook: string | null;
  instagram: string | null;
  logo: string | null;
  heroImage: string | null;
  primaryColor: string;
  accentColor: string;
  city: string | null;
  country: string | null;
  propertyCount: number;
  tratosCerrados: number;
}

interface PropertyData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  propertyType: string;
  listingType: string;
  status: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  lotSizeSqm: number | null;
  yearBuilt: number | null;
  address: string | null;
  city: string;
  neighborhood: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  features: string[];
  images: string[];
  isFeatured: boolean;
  virtualTourUrl: string | null;
  videoUrl: string | null;
  publishedAt: string | null;
}

interface PaginationData {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

interface Filters {
  search: string;
  propertyType: string;
  listingType: string;
  bedrooms: string;
  priceRange: string;
}

// ── Helpers ────────────────────────────────────────────────────
function formatPrice(amount: number, currency: string = 'TTD'): string {
  return `$${amount.toLocaleString('en-TT')} ${currency}`;
}

// ── Animation variants ─────────────────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// ── Custom scrollbar styles ────────────────────────────────────
const scrollbarStyles = `
  .portal-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
  .portal-scroll::-webkit-scrollbar-track { background: transparent; }
  .portal-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
  .portal-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
`;

// ── Component ──────────────────────────────────────────────────
export default function PublicPortal({ agentSlug, onBack }: PublicPortalProps) {
  // State
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    propertyType: '',
    listingType: '',
    bedrooms: '',
    priceRange: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionId, setSessionId] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [inquiryProperty, setInquiryProperty] = useState<PropertyData | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [heroSearch, setHeroSearch] = useState('');
  const [heroListingType, setHeroListingType] = useState('');

  const dwellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dwellStartRef = useRef<number>(Date.now());

  // ── Tracking ─────────────────────────────────────────────────
  const track = useCallback(
    (eventType: string, extra?: { elementId?: string; elementText?: string; propertySlug?: string; page?: string }) => {
      const payload = {
        agentSlug,
        eventType,
        page: extra?.page || 'portal',
        sessionId,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        ...extra,
      };
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/portal/track',
          new Blob([JSON.stringify(payload)], { type: 'application/json' })
        );
      } else {
        fetch('/api/portal/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
    },
    [agentSlug, sessionId]
  );

  // ── Fetch agent ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/portal/agent?slug=${encodeURIComponent(agentSlug)}`);
        if (!res.ok) return;
        const data = await res.json();
        const a = data.agente;
        setAgent({
          id: a.nombreComercial || '',
          businessName: a.nombreComercial || '',
          displayName: a.nombre || '',
          tagline: a.eslogan || null,
          bio: a.biografia || null,
          phone: a.telefono || null,
          whatsapp: a.whatsapp || null,
          email: a.correo || null,
          facebook: a.facebook || null,
          instagram: a.instagram || null,
          logo: a.logo || null,
          heroImage: a.imagenPortada || null,
          primaryColor: a.colorPrimario || '#2D6A4F',
          accentColor: a.colorAcento || '#D4A373',
          city: a.ciudad || null,
          country: a.pais || null,
          propertyCount: a.cantidadPropiedades || 0,
          tratosCerrados: a.tratosCerrados || 0,
        });
      } catch (err) {
        console.error('Error fetching agent:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
  }, [agentSlug]);

  // ── Session ID ───────────────────────────────────────────────
  useEffect(() => {
    let sid = '';
    if (typeof sessionStorage !== 'undefined') {
      sid = sessionStorage.getItem('portal_session_id') || '';
      if (!sid) {
        sid = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        sessionStorage.setItem('portal_session_id', sid);
      }
    }
    setSessionId(sid);
  }, []);

  // ── Track page_view on mount ──────────────────────────────────
  useEffect(() => {
    if (sessionId) {
      track('page_view', { page: 'portal' });
    }
  }, [sessionId, track]);

  // ── Dwell time tracking ──────────────────────────────────────
  useEffect(() => {
    dwellStartRef.current = Date.now();
    dwellIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - dwellStartRef.current;
      if (sessionId) {
        track('dwell_time_ms', { page: 'portal' });
        // We send dwell_time_ms as part of metadata-like approach
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/portal/track',
            new Blob(
              [JSON.stringify({ agentSlug, eventType: 'dwell_time_ms', sessionId, page: 'portal', dwellTimeMs: elapsed, referrer: typeof document !== 'undefined' ? document.referrer : '' })],
              { type: 'application/json' }
            )
          );
        }
      }
    }, 5000);
    return () => {
      if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current);
    };
  }, [agentSlug, sessionId, track]);

  // ── Fetch properties ─────────────────────────────────────────
  const fetchProperties = useCallback(
    async (page = 1, overrideFilters?: Partial<Filters>) => {
      setPropertiesLoading(true);
      try {
        const f = { ...filters, ...overrideFilters };
        const params = new URLSearchParams({
          agent: agentSlug,
          status: 'available',
          page: page.toString(),
          limit: '12',
        });
        if (f.search) params.set('search', f.search);
        if (f.propertyType) params.set('type', f.propertyType);
        if (f.listingType) params.set('listingType', f.listingType);
        if (f.bedrooms) params.set('bedrooms', f.bedrooms);
        if (f.priceRange) {
          if (f.priceRange === '500000') params.set('maxPrice', '500000');
          else if (f.priceRange === '1000000') params.set('maxPrice', '1000000');
          else if (f.priceRange === '2000000') params.set('maxPrice', '2000000');
          else if (f.priceRange === '2000001') params.set('minPrice', '2000001');
        }

        const res = await fetch(`/api/portal/properties?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setProperties(data.propiedades || []);
        setPagination(data.paginacion || null);
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setPropertiesLoading(false);
      }
    },
    [agentSlug, filters]
  );

  // ── Fetch featured ───────────────────────────────────────────
  const fetchFeatured = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        agent: agentSlug,
        status: 'available',
        page: '1',
        limit: '6',
      });
      const res = await fetch(`/api/portal/properties?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const featured = (data.propiedades || []).filter((p: PropertyData) => p.isFeatured);
      setFeaturedProperties(featured);
    } catch (err) {
      console.error('Error fetching featured:', err);
    }
  }, [agentSlug]);

  useEffect(() => {
    fetchProperties(1);
    fetchFeatured();
  }, [fetchProperties, fetchFeatured]);

  // ── Filter change handler ────────────────────────────────────
  const handleFilterChange = useCallback(
    (key: keyof Filters, value: string) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      setCurrentPage(1);
      fetchProperties(1, newFilters);
    },
    [filters, fetchProperties]
  );

  // ── Reset filters ────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    const empty: Filters = { search: '', propertyType: '', listingType: '', bedrooms: '', priceRange: '' };
    setFilters(empty);
    setCurrentPage(1);
    fetchProperties(1, empty);
  }, [fetchProperties]);

  // ── Hero search ──────────────────────────────────────────────
  const handleHeroSearch = useCallback(() => {
    const newFilters = { ...filters, search: heroSearch, listingType: heroListingType };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchProperties(1, newFilters);
    track('search', { elementId: 'hero_search', elementText: heroSearch });
    setTimeout(() => {
      document.getElementById('propiedades-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [heroSearch, heroListingType, filters, fetchProperties, track]);

  // ── Open detail ──────────────────────────────────────────────
  const openDetail = useCallback(
    (property: PropertyData) => {
      setSelectedProperty(property);
      setDetailOpen(true);
      track('property_view', { propertySlug: property.slug, elementId: `property_${property.slug}`, elementText: property.title });
    },
    [track]
  );

  // ── Open inquiry ─────────────────────────────────────────────
  const openInquiry = useCallback(
    (property: PropertyData) => {
      setInquiryProperty(property);
      setInquiryForm({ name: '', email: '', phone: '', message: '' });
      setInquiryOpen(true);
      track('inquiry_start', { propertySlug: property.slug, elementId: `inquiry_${property.slug}`, elementText: property.title });
    },
    [track]
  );

  // ── Submit inquiry ───────────────────────────────────────────
  const submitInquiry = useCallback(async () => {
    if (!inquiryProperty) return;
    if (!inquiryForm.name.trim() || !inquiryForm.email.trim()) {
      toast.error('Please enter your name and email address.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentSlug,
          propertyId: inquiryProperty.id,
          name: inquiryForm.name,
          email: inquiryForm.email,
          phone: inquiryForm.phone,
          message: inquiryForm.message,
        }),
      });
      if (!res.ok) {
        throw new Error('Error sending inquiry');
      }
      toast.success('Your inquiry has been sent successfully! We will get in touch soon.');
      setInquiryOpen(false);
      track('inquiry_submit', { propertySlug: inquiryProperty.slug, elementId: `inquiry_submit_${inquiryProperty.slug}` });
    } catch (err) {
      toast.error('There was an error sending your inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [inquiryProperty, inquiryForm, agentSlug, track]);

  // ── Toggle favorite ──────────────────────────────────────────
  const toggleFavorite = useCallback(
    (propertyId: string, propertySlug: string, propertyTitle: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(propertyId)) next.delete(propertyId);
        else next.add(propertyId);
        return next;
      });
      track('favorite_toggle', { propertySlug, elementId: `fav_${propertySlug}`, elementText: propertyTitle });
    },
    [track]
  );

  // ── Scroll to section ────────────────────────────────────────
  const scrollToSection = useCallback(
    (sectionId: string, label: string) => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
      track('nav_click', { elementId: `nav_${sectionId}`, elementText: label });
    },
    [track]
  );

  // ── Pagination ───────────────────────────────────────────────
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      fetchProperties(page);
      document.getElementById('propiedades-section')?.scrollIntoView({ behavior: 'smooth' });
    },
    [fetchProperties]
  );

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Skeleton className="w-16 h-16 rounded-2xl mx-auto mb-4" />
          <Skeleton className="w-48 h-6 mx-auto mb-2" />
          <Skeleton className="w-32 h-4 mx-auto" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Agent not found</p>
          {onBack && (
            <Button variant="outline" className="mt-4" onClick={onBack}>
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  const primaryColor = agent.primaryColor || '#2D6A4F';
  const accentColor = agent.accentColor || '#D4A373';

  return (
    <div className="min-h-screen flex flex-col bg-white" style={scrollbarStyles as React.CSSProperties}>
      <style>{scrollbarStyles}</style>

      {/* ── Navigation Bar ─────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 bg-white border-b shadow-sm"
        style={{ borderColor: `${primaryColor}15` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand */}
            <div className="flex items-center gap-3">
              {agent.logo ? (
                <img src={agent.logo} alt={agent.businessName} className="h-8 object-contain" />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {agent.businessName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-bold text-lg hidden sm:block" style={{ color: primaryColor }}>
                {agent.businessName}
              </span>
            </div>

            {/* Center: Nav links (desktop) */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('hero-section', 'Home')}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: primaryColor }}
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('propiedades-section', 'Properties')}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: primaryColor }}
              >
                Properties
              </button>
              <button
                onClick={() => scrollToSection('contacto-section', 'Contact')}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: primaryColor }}
              >
                Contact
              </button>
            </div>

            {/* Right: Phone + WhatsApp + Hamburger */}
            <div className="flex items-center gap-3">
              {agent.phone && (
                <a
                  href={`tel:${agent.phone}`}
                  className="hidden sm:flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: primaryColor }}
                  onClick={() => track('phone_click', { elementId: 'nav_phone', elementText: agent.phone! })}
                >
                  <Phone className="w-4 h-4" />
                  {agent.phone}
                </a>
              )}
              {agent.whatsapp && (
                <a
                  href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                  onClick={() => track('whatsapp_click', { elementId: 'nav_whatsapp', elementText: 'WhatsApp' })}
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              {/* Mobile hamburger */}
              <button
                className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                style={{ color: primaryColor }}
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu Sheet ──────────────────────────────────── */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle style={{ color: primaryColor }}>{agent.businessName}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => scrollToSection('hero-section', 'Home')}
              className="text-left px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{ color: primaryColor }}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('propiedades-section', 'Properties')}
              className="text-left px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{ color: primaryColor }}
            >
              Properties
            </button>
            <button
              onClick={() => scrollToSection('contacto-section', 'Contact')}
              className="text-left px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{ color: primaryColor }}
            >
              Contact
            </button>
            <Separator className="my-2" />
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                style={{ color: primaryColor }}
              >
                <Phone className="w-4 h-4" />
                {agent.phone}
              </a>
            )}
            {agent.email && (
              <a
                href={`mailto:${agent.email}`}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                style={{ color: primaryColor }}
              >
                <Mail className="w-4 h-4" />
                {agent.email}
              </a>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Hero Section ───────────────────────────────────────── */}
      <section
        id="hero-section"
        className="relative w-full"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}ee 0%, ${primaryColor}cc 50%, ${accentColor}88 100%)`,
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              {agent.tagline || agent.businessName}
            </h1>
            {agent.bio && (
              <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto mb-8">
                {agent.bio.length > 150 ? agent.bio.substring(0, 150) + '...' : agent.bio}
              </p>
            )}

            {/* Search bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by name, city..."
                    className="pl-10 h-12 bg-white rounded-lg text-base"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleHeroSearch()}
                  />
                </div>
                <Select value={heroListingType} onValueChange={setHeroListingType}>
                  <SelectTrigger className="h-12 w-full sm:w-40 bg-white rounded-lg">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="sale">For Sale</SelectItem>
                    <SelectItem value="rent">For Rent</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleHeroSearch}
                  className="h-12 px-8 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: accentColor }}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>

            {/* Stats row */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-white/90"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <span className="text-sm sm:text-base font-medium">{agent.propertyCount} Properties</span>
              </div>
              <span className="hidden sm:inline text-white/50">•</span>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span className="text-sm sm:text-base font-medium">{agent.tratosCerrados} Deals Closed</span>
              </div>
              <span className="hidden sm:inline text-white/50">•</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span className="text-sm sm:text-base font-medium">
                  {[agent.city, agent.country].filter(Boolean).join(', ') || 'Trinidad y Tobago'}
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Featured Properties ────────────────────────────────── */}
      {featuredProperties.length > 0 && (
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: primaryColor }}>
                Featured Properties
              </h2>
            </motion.div>

            {/* Horizontal scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory portal-scroll">
              {featuredProperties.map((property) => (
                <motion.div
                  key={property.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeInUp}
                  transition={{ duration: 0.4 }}
                  className="flex-none w-72 sm:w-80 snap-start"
                >
                  <Card
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                    onClick={() => openDetail(property)}
                  >
                    {/* Image placeholder */}
                    <div
                      className="relative h-48 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}22, ${accentColor}22)`,
                      }}
                    >
                      <Home className="w-12 h-12" style={{ color: `${primaryColor}40` }} />
                      {property.isFeatured && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-yellow-400 text-yellow-900 text-xs font-semibold">
                            <Star className="w-3 h-3 mr-1" />
Featured
                          </Badge>
                        </div>
                      )}
                      <Badge
                        className="absolute top-2 left-2 text-xs"
                        style={{
                          backgroundColor: property.listingType === 'sale' ? primaryColor : accentColor,
                          color: 'white',
                        }}
                      >
                        {property.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:underline">
                        {property.title}
                      </h3>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                        <MapPin className="w-3.5 h-3.5" />
                        {[property.city, property.neighborhood].filter(Boolean).join(', ')}
                      </div>
                      <p className="font-bold text-lg mb-3" style={{ color: primaryColor }}>
                        {formatPrice(property.price, property.currency)}
                      </p>
                      <div className="flex items-center gap-3 text-gray-500 text-sm mb-3">
                        {property.bedrooms != null && (
                          <span className="flex items-center gap-1">
                            <Bed className="w-4 h-4" /> {property.bedrooms}
                          </span>
                        )}
                        {property.bathrooms != null && (
                          <span className="flex items-center gap-1">
                            <Bath className="w-4 h-4" /> {property.bathrooms}
                          </span>
                        )}
                        {property.areaSqm != null && (
                          <span className="flex items-center gap-1">
                            <Maximize className="w-4 h-4" /> {property.areaSqm} m²
                          </span>
                        )}
                      </div>
                      <Button
                        className="w-full text-white text-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── All Properties Section ─────────────────────────────── */}
      <section id="propiedades-section" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: primaryColor }}>
              Our Properties
            </h2>
          </motion.div>

          {/* Filter bar */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            transition={{ duration: 0.4 }}
            className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  className="pl-9 h-10 bg-white"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              {/* Property Type */}
              <Select
                value={filters.propertyType}
                onValueChange={(v) => handleFilterChange('propertyType', v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="h-10 w-full bg-white">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                </SelectContent>
              </Select>
              {/* Listing Type */}
              <Select
                value={filters.listingType}
                onValueChange={(v) => handleFilterChange('listingType', v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="h-10 w-full bg-white">
                  <SelectValue placeholder="For Sale / For Rent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="rent">For Rent</SelectItem>
                </SelectContent>
              </Select>
              {/* Bedrooms */}
              <Select
                value={filters.bedrooms}
                onValueChange={(v) => handleFilterChange('bedrooms', v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="h-10 w-full bg-white">
                  <SelectValue placeholder="Bedrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                  <SelectItem value="4">4+</SelectItem>
                </SelectContent>
              </Select>
              {/* Price Range */}
              <Select
                value={filters.priceRange}
                onValueChange={(v) => handleFilterChange('priceRange', v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="h-10 w-full bg-white">
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="500000">Up to $500k</SelectItem>
                  <SelectItem value="1000000">Up to $1M</SelectItem>
                  <SelectItem value="2000000">Up to $2M</SelectItem>
                  <SelectItem value="2000001">Over $2M</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Properties grid */}
          {propertiesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-2/3" />
                    <div className="flex gap-3">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-center py-16"
            >
              <Home className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No properties found with these filters
              </h3>
              <p className="text-gray-400 mb-6">
                Try adjusting the filters to see more results.
              </p>
              <Button
                variant="outline"
                onClick={resetFilters}
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                Clear Filters
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-30px' }}
                    variants={fadeInUp}
                    transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.2) }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full flex flex-col">
                      {/* Image area */}
                      <div
                        className="relative h-48 flex items-center justify-center cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}18, ${accentColor}18)`,
                        }}
                        onClick={() => openDetail(property)}
                      >
                        <Home className="w-12 h-12" style={{ color: `${primaryColor}30` }} />

                        {/* Status badge */}
                        <Badge
                          className={cn(
                            'absolute top-2 left-2 text-xs font-medium text-white',
                            property.status === 'available'
                              ? 'bg-green-500'
                              : 'bg-yellow-500'
                          )}
                        >
                          {property.status === 'available' ? 'Available' : 'Pending'}
                        </Badge>

                        {/* Listing type badge */}
                        <Badge
                          className="absolute top-2 right-2 text-xs text-white"
                          style={{
                            backgroundColor: property.listingType === 'sale' ? primaryColor : accentColor,
                          }}
                        >
                          {property.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                        </Badge>

                        {/* Featured star */}
                        {property.isFeatured && (
                          <div className="absolute bottom-2 left-2">
                            <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center">
                              <Star className="w-3.5 h-3.5 text-yellow-900" fill="currentColor" />
                            </div>
                          </div>
                        )}

                        {/* Favorite button */}
                        <button
                          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(property.id, property.slug, property.title);
                          }}
                        >
                          <Heart
                            className={cn(
                              'w-4 h-4 transition-colors',
                              favorites.has(property.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'
                            )}
                          />
                        </button>
                      </div>

                      <CardContent className="p-4 flex flex-col flex-1">
                        <h3
                          className="font-semibold text-gray-900 mb-1 line-clamp-1 cursor-pointer hover:underline"
                          onClick={() => openDetail(property)}
                        >
                          {property.title}
                        </h3>
                        <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
                          <MapPin className="w-3.5 h-3.5 flex-none" />
                          <span className="line-clamp-1">
                            {[property.city, property.neighborhood].filter(Boolean).join(', ')}
                          </span>
                        </div>
                        <p className="font-bold text-lg mb-3" style={{ color: primaryColor }}>
                          {formatPrice(property.price, property.currency)}
                        </p>
                        <div className="flex items-center gap-4 text-gray-500 text-sm mb-4">
                          {property.bedrooms != null && (
                            <span className="flex items-center gap-1">
                              <Bed className="w-4 h-4" /> {property.bedrooms}
                            </span>
                          )}
                          {property.bathrooms != null && (
                            <span className="flex items-center gap-1">
                              <Bath className="w-4 h-4" /> {property.bathrooms}
                            </span>
                          )}
                          {property.areaSqm != null && (
                            <span className="flex items-center gap-1">
                              <Maximize className="w-4 h-4" /> {property.areaSqm} m²
                            </span>
                          )}
                        </div>
                        <div className="mt-auto flex gap-2">
                          <Button
                            className="flex-1 text-white text-sm h-9"
                            style={{ backgroundColor: primaryColor }}
                            onClick={() => openDetail(property)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            className="text-sm h-9"
                            style={{ borderColor: accentColor, color: accentColor }}
                            onClick={() => openInquiry(property)}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPaginas > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => goToPage(currentPage - 1)}
                    style={{ borderColor: primaryColor, color: currentPage <= 1 ? undefined : primaryColor }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: pagination.totalPaginas }, (_, i) => i + 1)
                    .filter((p) => {
                      if (pagination.totalPaginas <= 7) return true;
                      if (p === 1 || p === pagination.totalPaginas) return true;
                      if (Math.abs(p - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev != null && p - prev > 1;
                      return (
                        <span key={p} className="flex items-center gap-1">
                          {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                          <Button
                            variant={p === currentPage ? 'default' : 'outline'}
                            size="sm"
                            className="w-9 h-9"
                            style={
                              p === currentPage
                                ? { backgroundColor: primaryColor, color: 'white' }
                                : { borderColor: primaryColor, color: primaryColor }
                            }
                            onClick={() => goToPage(p)}
                          >
                            {p}
                          </Button>
                        </span>
                      );
                    })}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= pagination.totalPaginas}
                    onClick={() => goToPage(currentPage + 1)}
                    style={{ borderColor: primaryColor, color: currentPage >= pagination.totalPaginas ? undefined : primaryColor }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Property Detail Dialog ─────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="max-w-3xl w-full max-h-[90vh] overflow-y-auto portal-scroll sm:rounded-xl"
          style={{
            maxWidth: '100vw',
            marginLeft: '0',
            marginTop: '5vh',
            height: '90vh',
          }}
        >
          {selectedProperty && (
            <>
              {/* Image area */}
              <div
                className="relative h-56 sm:h-72 -mx-6 -mt-6 mb-4 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}25, ${accentColor}25)`,
                }}
              >
                <Home className="w-16 h-16" style={{ color: `${primaryColor}35` }} />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge
                    className={cn(
                      'text-white text-sm',
                      selectedProperty.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
                    )}
                  >
                    {selectedProperty.status === 'available' ? 'Available' : 'Pending'}
                  </Badge>
                  <Badge
                    className="text-white text-sm"
                    style={{
                      backgroundColor: selectedProperty.listingType === 'sale' ? primaryColor : accentColor,
                    }}
                  >
                    {selectedProperty.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-700 text-sm">
                    {selectedProperty.propertyType === 'residential'
                      ? 'Residential'
                      : selectedProperty.propertyType === 'commercial'
                        ? 'Commercial'
                        : selectedProperty.propertyType === 'land'
                          ? 'Land'
                          : selectedProperty.propertyType}
                  </Badge>
                </div>
                {selectedProperty.isFeatured && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-yellow-400 text-yellow-900 text-sm font-semibold">
                      <Star className="w-3.5 h-3.5 mr-1" fill="currentColor" />
                      Featured
                    </Badge>
                  </div>
                )}
              </div>

              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                  {selectedProperty.title}
                </DialogTitle>
              </DialogHeader>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                <MapPin className="w-4 h-4" />
                {[selectedProperty.city, selectedProperty.neighborhood, selectedProperty.address]
                  .filter(Boolean)
                  .join(', ')}
              </div>

              {/* Price */}
              <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                {formatPrice(selectedProperty.price, selectedProperty.currency)}
              </p>

              <Separator />

              {/* Description */}
              {selectedProperty.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                    {selectedProperty.description}
                  </p>
                </div>
              )}

              {/* Features grid */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Features</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedProperty.bedrooms != null && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Bed className="w-5 h-5" style={{ color: primaryColor }} />
                      <div>
                        <p className="text-xs text-gray-500">Bedrooms</p>
                        <p className="font-semibold text-gray-900">{selectedProperty.bedrooms}</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.bathrooms != null && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Bath className="w-5 h-5" style={{ color: primaryColor }} />
                      <div>
                        <p className="text-xs text-gray-500">Bathrooms</p>
                        <p className="font-semibold text-gray-900">{selectedProperty.bathrooms}</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.areaSqm != null && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Maximize className="w-5 h-5" style={{ color: primaryColor }} />
                      <div>
                        <p className="text-xs text-gray-500">Area</p>
                        <p className="font-semibold text-gray-900">{selectedProperty.areaSqm} m²</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.lotSizeSqm != null && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Globe className="w-5 h-5" style={{ color: primaryColor }} />
                      <div>
                        <p className="text-xs text-gray-500">Lot Size</p>
                        <p className="font-semibold text-gray-900">{selectedProperty.lotSizeSqm} m²</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.yearBuilt != null && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5" style={{ color: primaryColor }} />
                      <div>
                        <p className="text-xs text-gray-500">Year Built</p>
                        <p className="font-semibold text-gray-900">{selectedProperty.yearBuilt}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Features list from JSON */}
              {selectedProperty.features && selectedProperty.features.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Amenities & Extras</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProperty.features.map((feature, i) => (
                      <Badge key={i} variant="secondary" className="text-sm">
                        <Check className="w-3 h-3 mr-1" style={{ color: primaryColor }} />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Agent contact card */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-semibold text-gray-900 mb-3">Contact Agent</h4>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {agent.businessName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{agent.businessName}</p>
                    <p className="text-sm text-gray-500">
                      {[agent.city, agent.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {agent.phone && (
                    <a
                      href={`tel:${agent.phone}`}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg border text-sm hover:bg-gray-50 transition-colors"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                  )}
                  {agent.email && (
                    <a
                      href={`mailto:${agent.email}`}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg border text-sm hover:bg-gray-50 transition-colors"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                  )}
                  {agent.whatsapp && (
                    <a
                      href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Inquiry form in dialog */}
              <div className="p-4 rounded-xl border" style={{ borderColor: `${primaryColor}20` }}>
                <h4 className="font-semibold text-gray-900 mb-4">Interested in this property?</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label htmlFor="detail-name" className="text-sm text-gray-600">Name *</Label>
                    <Input
                      id="detail-name"
                      placeholder="Your name"
                      className="mt-1"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="detail-email" className="text-sm text-gray-600">Email *</Label>
                    <Input
                      id="detail-email"
                      type="email"
                      placeholder="you@email.com"
                      className="mt-1"
                      value={inquiryForm.email}
                      onChange={(e) => setInquiryForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <Label htmlFor="detail-phone" className="text-sm text-gray-600">Phone</Label>
                  <Input
                    id="detail-phone"
                    placeholder="Your phone number"
                    className="mt-1"
                    value={inquiryForm.phone}
                    onChange={(e) => setInquiryForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="mb-4">
                  <Label htmlFor="detail-message" className="text-sm text-gray-600">Message</Label>
                  <Textarea
                    id="detail-message"
                    placeholder={`Hello, I am interested in ${selectedProperty.title}...`}
                    className="mt-1"
                    rows={3}
                    value={inquiryForm.message}
                    onChange={(e) => setInquiryForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full text-white h-11"
                  style={{ backgroundColor: primaryColor }}
                  disabled={submitting}
                  onClick={() => {
                    setInquiryProperty(selectedProperty);
                    submitInquiry();
                  }}
                >
                  {submitting ? 'Sending...' : 'Send Inquiry'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Inquiry Dialog (from card button) ──────────────────── */}
      <Dialog open={inquiryOpen} onOpenChange={setInquiryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold" style={{ color: primaryColor }}>
              Inquire About Property
            </DialogTitle>
          </DialogHeader>
          {inquiryProperty && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900 text-sm">{inquiryProperty.title}</p>
                <p className="text-sm font-bold" style={{ color: primaryColor }}>
                  {formatPrice(inquiryProperty.price, inquiryProperty.currency)}
                </p>
              </div>
              <div>
                <Label htmlFor="inq-name" className="text-sm">Name *</Label>
                <Input
                  id="inq-name"
                  placeholder="Your name"
                  className="mt-1"
                  value={inquiryForm.name}
                  onChange={(e) => setInquiryForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="inq-email" className="text-sm">Email *</Label>
                <Input
                  id="inq-email"
                  type="email"
                  placeholder="you@email.com"
                  className="mt-1"
                  value={inquiryForm.email}
                  onChange={(e) => setInquiryForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="inq-phone" className="text-sm">Phone</Label>
                <Input
                  id="inq-phone"
                  placeholder="Your phone number"
                  className="mt-1"
                  value={inquiryForm.phone}
                  onChange={(e) => setInquiryForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="inq-message" className="text-sm">Message</Label>
                <Textarea
                  id="inq-message"
                  placeholder={`Hello, I am interested in ${inquiryProperty.title}...`}
                  className="mt-1"
                  rows={3}
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm((f) => ({ ...f, message: e.target.value }))}
                />
              </div>
              <Button
                className="w-full text-white h-11"
                style={{ backgroundColor: primaryColor }}
                disabled={submitting}
                onClick={submitInquiry}
              >
                {submitting ? 'Sending...' : 'Send Inquiry'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Contact Section ────────────────────────────────────── */}
      <section id="contacto-section" className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: primaryColor }}>
              Contact
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Agent info card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-4 mb-6">
                {agent.logo ? (
                  <img src={agent.logo} alt={agent.businessName} className="w-16 h-16 rounded-xl object-contain" />
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {agent.businessName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{agent.businessName}</h3>
                  {agent.displayName && (
                    <p className="text-sm text-gray-500">{agent.displayName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() => track('phone_click', { elementId: 'contact_phone', elementText: agent.phone! })}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}10` }}
                    >
                      <Phone className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <span className="text-sm">{agent.phone}</span>
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() => track('email_click', { elementId: 'contact_email', elementText: agent.email! })}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}10` }}
                    >
                      <Mail className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <span className="text-sm">{agent.email}</span>
                  </a>
                )}
                {agent.city && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}10` }}
                    >
                      <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <span className="text-sm">{[agent.city, agent.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Social links */}
              {(agent.facebook || agent.instagram) && (
                <div className="flex items-center gap-3">
                  {agent.facebook && (
                    <a
                      href={agent.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                      onClick={() => track('social_click', { elementId: 'contact_facebook', elementText: 'Facebook' })}
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                  {agent.instagram && (
                    <a
                      href={agent.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                      onClick={() => track('social_click', { elementId: 'contact_instagram', elementText: 'Instagram' })}
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}
            </motion.div>

            {/* Map placeholder + WhatsApp CTA */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Map placeholder */}
              <div
                className="w-full h-48 bg-gray-200 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)`,
                }}
              >
                <div className="text-center">
                  <MapPin className="w-8 h-8 mx-auto mb-2" style={{ color: `${primaryColor}40` }} />
                  <p className="text-sm text-gray-400">
                    {[agent.city, agent.country].filter(Boolean).join(', ') || 'Location'}
                  </p>
                </div>
              </div>

              {/* WhatsApp CTA */}
              {agent.whatsapp && (
                <a
                  href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-lg transition-colors"
                  onClick={() => track('whatsapp_click', { elementId: 'contact_whatsapp_cta', elementText: 'WhatsApp CTA' })}
                >
                  <MessageCircle className="w-6 h-6" />
                  Message us on WhatsApp
                </a>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer
        className="mt-auto py-8 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="font-bold text-lg">{agent.businessName}</p>
              <p className="text-white/70 text-sm">
                {[agent.city, agent.country].filter(Boolean).join(', ') || 'Trinidad y Tobago'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {agent.facebook && (
                <a
                  href={agent.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {agent.instagram && (
                <a
                  href={agent.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {agent.email && (
                <a
                  href={`mailto:${agent.email}`}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
          <Separator className="my-6 bg-white/20" />
          <p className="text-center text-white/60 text-sm">
            © {new Date().getFullYear()} {agent.businessName}. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── Floating WhatsApp Button ───────────────────────────── */}
      {agent.whatsapp && (
        <a
          href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all"
          onClick={() => track('whatsapp_click', { elementId: 'floating_whatsapp', elementText: 'WhatsApp' })}
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      )}
    </div>
  );
}
