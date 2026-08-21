'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  MapPin, Phone, Mail, Bed, Bath, Maximize, Calendar,
  ChevronLeft, ChevronRight, Menu, X, Facebook,
  Instagram, MessageCircle, Play, ArrowRight, PlayCircle,
  Home, Building2, LandPlot, Store, ArrowUpRight,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
interface PublicPortalProps {
  agentSlug: string;
  onBack?: () => void;
}

interface AgentData {
  businessName: string;
  name: string;
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
  dealsClosed: number;
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
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Helpers ────────────────────────────────────────────────────
function formatPrice(amount: number, currency: string = 'TTD'): string {
  return `$${amount.toLocaleString('en-US')} ${currency}`;
}

function statusColor(status: string) {
  switch (status) {
    case 'available': return 'bg-emerald-500/90';
    case 'pending': return 'bg-amber-500/90';
    case 'sold': return 'bg-red-500/90';
    default: return 'bg-zinc-500/90';
  }
}

function propertyTypeIcon(type: string) {
  switch (type) {
    case 'Apartment': return <Building2 size={14} />;
    case 'Townhouse': return <Home size={14} />;
    case 'Commercial': return <Store size={14} />;
    case 'Land': return <LandPlot size={14} />;
    default: return <Home size={14} />;
  }
}

// ── Animation ──────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function SectionReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Property Card ──────────────────────────────────────────────
function PropertyCard({ property, onClick }: { property: PropertyData; onClick: () => void }) {
  return (
    <motion.article
      variants={fadeUp}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative overflow-hidden aspect-[4/3] bg-stone-900">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-900 to-neutral-950" />
        {property.images?.[0] && (
          <img
            src={property.images[0]}
            alt={property.title}
            className="absolute inset-0 w-full h-full object-cover img-premium"
          />
        )}
        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className={`glass-subtle px-2.5 py-1 text-[10px] font-data tracking-wide-luxury font-medium text-white ${statusColor(property.status)}`}>
            {property.status}
          </span>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500 z-[5]">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <span className="glass-dark px-6 py-2.5 text-[11px] font-data tracking-wide-luxury text-white">
              VIEW DETAILS
            </span>
          </div>
        </div>
      </div>
      <div className="pt-4">
        <h3 className="font-serif-display text-lg leading-tight text-[#0a0a0a] group-hover:text-[#b8956a] transition-colors duration-300">
          {property.title}
        </h3>
        <p className="font-data text-xl font-medium mt-1 text-[#0a0a0a]">
          {formatPrice(property.price, property.currency)}
        </p>
        <p className="font-data text-sm text-[#71717a] mt-1 flex items-center gap-1">
          <MapPin size={12} />
          {[property.neighborhood, property.city, property.country].filter(Boolean).join(', ')}
        </p>
        <div className="flex items-center gap-4 mt-3 text-[#71717a] font-data text-xs tracking-wide">
          {property.bedrooms != null && (
            <span className="flex items-center gap-1"><Bed size={13} /> {property.bedrooms} Beds</span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1"><Bath size={13} /> {property.bathrooms} Baths</span>
          )}
          {property.areaSqm != null && (
            <span className="flex items-center gap-1"><Maximize size={13} /> {property.areaSqm.toLocaleString()} sqft</span>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function PublicPortal({ agentSlug, onBack }: PublicPortalProps) {
  // ── State ──────────────────────────────────────────────────
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [propsLoading, setPropsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterListing, setFilterListing] = useState('');
  const [filterBedrooms, setFilterBedrooms] = useState('');
  const [filterPrice, setFilterPrice] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const propertiesSectionRef = useRef<HTMLDivElement>(null);
  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const contactSectionRef = useRef<HTMLDivElement>(null);

  // ── Tracking ────────────────────────────────────────────────
  const track = useCallback((
    eventType: string,
    extra?: { elementText?: string; propertySlug?: string; page?: string },
  ) => {
    if (!sessionId) return;
    fetch('/api/portal/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentSlug,
        eventType,
        sessionId,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        ...extra,
      }),
    }).catch(() => {});
  }, [agentSlug, sessionId]);

  // ── Session Init ────────────────────────────────────────────
  useEffect(() => {
    let sid = sessionStorage.getItem(`portal_sid_${agentSlug}`);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(`portal_sid_${agentSlug}`, sid);
    }
    setSessionId(sid);
  }, [agentSlug]);

  // ── Fetch Agent ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/portal/agent?slug=${encodeURIComponent(agentSlug)}`);
        if (!res.ok) return;
        const data = await res.json();
        setAgent(data.agent);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    })();
  }, [agentSlug]);

  // ── Fetch Properties ────────────────────────────────────────
  const fetchProperties = useCallback(async (page: number, filters: {
    type?: string; listing?: string; bedrooms?: string; price?: string;
  } = {}) => {
    setPropsLoading(true);
    try {
      const params = new URLSearchParams({ agent: agentSlug, page: String(page), limit: '12' });
      if (filters.type) params.set('type', filters.type);
      if (filters.listing) params.set('listingType', filters.listing);
      if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
      if (filters.price) {
        const [min, max] = filters.price.split('-');
        if (min) params.set('minPrice', min);
        if (max) params.set('maxPrice', max);
      }
      const res = await fetch(`/api/portal/properties?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setProperties(data.properties);
      setPagination(data.pagination);
      // Separate featured from first fetch
      if (page === 1 && !filters.type && !filters.listing) {
        setFeaturedProperties(data.properties.filter((p: PropertyData) => p.isFeatured).slice(0, 3));
      }
    } catch { /* silent */ } finally {
      setPropsLoading(false);
    }
  }, [agentSlug]);

  useEffect(() => {
    fetchProperties(1);
  }, [fetchProperties]);

  // ── Track page view ─────────────────────────────────────────
  useEffect(() => {
    if (sessionId) track('page_view', { page: 'portal_home' });
  }, [sessionId, track]);

  // ── Nav scroll ──────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Scroll spy ──────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.3 },
    );
    const refs = [
      { el: document.getElementById('section-home'), id: 'home' },
      { el: propertiesSectionRef.current, id: 'properties' },
      { el: aboutSectionRef.current, id: 'about' },
      { el: contactSectionRef.current, id: 'contact' },
    ];
    refs.forEach((r) => { if (r.el) observer.observe(r.el); });
    return () => observer.disconnect();
  }, [loading]);

  // ── Filter Handlers ─────────────────────────────────────────
  const applyFilters = useCallback((page = 1) => {
    fetchProperties(page, { type: filterType, listing: filterListing, bedrooms: filterBedrooms, price: filterPrice });
    setCurrentPage(page);
  }, [fetchProperties, filterType, filterListing, filterBedrooms, filterPrice]);

  useEffect(() => { applyFilters(1); }, [filterType, filterListing, filterBedrooms, filterPrice, applyFilters]);

  // ── Open Detail ─────────────────────────────────────────────
  const openDetail = useCallback((property: PropertyData) => {
    setSelectedProperty(property);
    setDetailImageIndex(0);
    setInquirySent(false);
    setInquiryForm({ name: '', email: '', phone: '', message: '' });
    setDetailOpen(true);
    track('property_view', { propertySlug: property.slug });
  }, [track]);

  // ── Submit Inquiry ──────────────────────────────────────────
  const submitInquiry = useCallback(async () => {
    if (!selectedProperty || !inquiryForm.name.trim() || !inquiryForm.email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentSlug,
          propertyId: selectedProperty.id,
          name: inquiryForm.name,
          email: inquiryForm.email,
          phone: inquiryForm.phone,
          message: inquiryForm.message,
        }),
      });
      if (res.ok) {
        setInquirySent(true);
        track('click', { elementText: 'inquiry_submitted', propertySlug: selectedProperty.slug });
      }
    } catch { /* silent */ } finally {
      setSubmitting(false);
    }
  }, [agentSlug, selectedProperty, inquiryForm, track]);

  // ── Scroll To ───────────────────────────────────────────────
  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Loading State ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#b8956a] border-t-transparent animate-spin rounded-full" />
          <p className="font-data text-xs tracking-wide-luxury text-[#71717a]">LOADING</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif-display text-3xl text-[#0a0a0a]">Agent Not Found</h1>
          <p className="font-data text-sm text-[#71717a] mt-3">This portal could not be located.</p>
          {onBack && (
            <button onClick={onBack} className="btn-outline-luxury mt-6">GO BACK</button>
          )}
        </div>
      </div>
    );
  }

  // ── Property type filter options ────────────────────────────
  const propertyTypes = ['All', 'House', 'Apartment', 'Townhouse', 'Commercial', 'Land'];
  const listingTypes = ['For Sale', 'For Rent'];
  const bedroomOptions = ['Any', '1+', '2+', '3+', '4+', '5+'];
  const priceOptions = ['Any', '0-500000', '500000-1000000', '1000000-2000000', '2000000-5000000', '5000000-999999999'];

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0a0a0a]">
      {/* ── NAVIGATION ──────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          navScrolled ? 'glass shadow-soft' : 'bg-transparent'
        }`}
      >
        <div className="container-luxury flex items-center justify-between h-16">
          {/* Logo / Business Name */}
          <button onClick={() => scrollTo('section-home')} className="flex-shrink-0">
            {agent.logo ? (
              <img src={agent.logo} alt={agent.businessName} className="h-8 w-auto" />
            ) : (
              <span className={`font-serif-display text-lg ${navScrolled ? 'text-[#0a0a0a]' : 'text-white'} transition-colors duration-500`}>
                {agent.businessName}
              </span>
            )}
          </button>

          {/* Center Nav Links — Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {['Home', 'Properties', 'About', 'Contact'].map((item) => {
              const sectionId = item === 'Home' ? 'section-home' : `section-${item.toLowerCase()}`;
              const isActive = activeSection === (item === 'Home' ? 'home' : item.toLowerCase());
              return (
                <button
                  key={item}
                  onClick={() => scrollTo(sectionId)}
                  className={`font-data text-[11px] tracking-wide-luxury transition-colors duration-300 pb-0.5 border-b ${
                    isActive
                      ? `${navScrolled ? 'border-[#0a0a0a] text-[#0a0a0a]' : 'border-white text-white'}`
                      : `${navScrolled ? 'border-transparent text-[#71717a] hover:text-[#0a0a0a]' : 'border-transparent text-white/60 hover:text-white'}`
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Right — Phone + WhatsApp — Desktop */}
          <div className="hidden md:flex items-center gap-5">
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className={`font-data text-xs tracking-wide transition-colors duration-300 ${
                  navScrolled ? 'text-[#0a0a0a]' : 'text-white'
                }`}
              >
                {agent.phone}
              </a>
            )}
            {agent.whatsapp && (
              <a
                href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-300 ${
                  navScrolled ? 'text-[#0a0a0a]' : 'text-white'
                }`}
                aria-label="WhatsApp"
              >
                <MessageCircle size={16} />
              </a>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className={`md:hidden ${navScrolled ? 'text-[#0a0a0a]' : 'text-white'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden glass overflow-hidden"
            >
              <div className="container-luxury py-6 flex flex-col gap-4">
                {['Home', 'Properties', 'About', 'Contact'].map((item) => {
                  const sectionId = item === 'Home' ? 'section-home' : `section-${item.toLowerCase()}`;
                  return (
                    <button
                      key={item}
                      onClick={() => scrollTo(sectionId)}
                      className="font-data text-xs tracking-wide-luxury text-[#0a0a0a] text-left py-1"
                    >
                      {item}
                    </button>
                  );
                })}
                <div className="divider-luxury my-2" />
                <div className="flex items-center gap-4">
                  {agent.phone && (
                    <a href={`tel:${agent.phone}`} className="font-data text-sm text-[#0a0a0a]">
                      <Phone size={14} className="inline mr-1.5" />{agent.phone}
                    </a>
                  )}
                  {agent.whatsapp && (
                    <a
                      href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#b8956a]"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO SECTION ────────────────────────────────────── */}
      <section
        id="section-home"
        className="relative h-[75vh] min-h-[500px] max-h-[800px] flex items-end overflow-hidden"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-900 to-neutral-950">
          {agent.heroImage && (
            <img
              src={agent.heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Content Panel */}
        <div className="container-luxury relative z-10 pb-16 md:pb-20">
          <div className="glass-dark p-8 md:p-10 max-w-xl inline-block">
            <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-4">
              LUXURY REAL ESTATE IN {agent.city?.toUpperCase() || 'YOUR CITY'}
            </p>
            <h1 className="font-serif-display text-4xl md:text-5xl text-white leading-tight">
              {agent.name}
            </h1>
            {agent.tagline && (
              <p className="font-data text-white/60 text-sm mt-3">{agent.tagline}</p>
            )}
            <div className="flex items-center gap-2 mt-6 font-data text-xs text-white/70">
              <span className="font-serif-display text-xl text-white">{agent.propertyCount}</span>
              <span className="tracking-wide">Properties</span>
              <span className="text-white/30 mx-1">·</span>
              <span className="font-serif-display text-xl text-white">{agent.dealsClosed}</span>
              <span className="tracking-wide">Deals Closed</span>
            </div>
            <button
              onClick={() => {
                scrollTo('section-properties');
                track('click', { elementText: 'VIEW LISTINGS' });
              }}
              className="btn-outline-luxury mt-8 !border-white/40 !text-white hover:!bg-white hover:!text-[#0a0a0a]"
            >
              VIEW LISTINGS
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURED PROPERTIES ─────────────────────────────── */}
      {featuredProperties.length > 0 && (
        <section className="section-breath bg-[#FAFAF8]">
          <div className="container-luxury">
            <SectionReveal>
              <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-3">
                CURATED SELECTION
              </p>
              <h2 className="font-serif-display text-3xl md:text-4xl text-[#0a0a0a]">
                Featured Properties
              </h2>
            </SectionReveal>

            <motion.div
              variants={stagger}
              initial="hidden"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12"
            >
              {featuredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => openDetail(property)}
                />
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── ABOUT SECTION ───────────────────────────────────── */}
      <section id="section-about" ref={aboutSectionRef} className="section-breath bg-[#FAFAF8]">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-center">
            {/* Left — Photo/Video Placeholder (60%) */}
            <SectionReveal className="lg:col-span-3">
              <div className="relative aspect-[4/3] bg-stone-900 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-900 to-neutral-950" />
                {agent.logo && (
                  <img
                    src={agent.logo}
                    alt={agent.name}
                    className="absolute inset-0 w-full h-full object-cover img-premium opacity-60"
                  />
                )}
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-16 h-16 rounded-full glass-dark flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Play size={24} className="text-white ml-1" fill="white" />
                  </div>
                </div>
              </div>
            </SectionReveal>

            {/* Right — Bio (40%) */}
            <SectionReveal className="lg:col-span-2">
              <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-3">ABOUT</p>
              <h2 className="font-serif-display text-3xl text-[#0a0a0a]">{agent.name}</h2>
              {agent.bio && (
                <p className="font-data text-sm text-[#71717a] mt-5 leading-relaxed">
                  {agent.bio}
                </p>
              )}

              {/* Contact Details */}
              <div className="mt-8 space-y-3">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-3 font-data text-sm text-[#0a0a0a] hover:text-[#b8956a] transition-colors"
                  >
                    <Phone size={15} className="text-[#b8956a]" /> {agent.phone}
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="flex items-center gap-3 font-data text-sm text-[#0a0a0a] hover:text-[#b8956a] transition-colors"
                  >
                    <Mail size={15} className="text-[#b8956a]" /> {agent.email}
                  </a>
                )}
                {agent.city && (
                  <div className="flex items-center gap-3 font-data text-sm text-[#71717a]">
                    <MapPin size={15} className="text-[#b8956a]" />
                    {[agent.city, agent.country].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-4 mt-8">
                {agent.facebook && (
                  <a
                    href={agent.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#71717a] hover:text-[#0a0a0a] transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook size={18} />
                  </a>
                )}
                {agent.instagram && (
                  <a
                    href={agent.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#71717a] hover:text-[#0a0a0a] transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram size={18} />
                  </a>
                )}
                {agent.whatsapp && (
                  <a
                    href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#71717a] hover:text-[#0a0a0a] transition-colors"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle size={18} />
                  </a>
                )}
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ── ALL PROPERTIES SECTION ──────────────────────────── */}
      <section id="section-properties" ref={propertiesSectionRef} className="section-breath bg-[#FAFAF8]">
        <div className="container-luxury">
          <SectionReveal>
            <h2 className="font-serif-display text-3xl md:text-4xl text-[#0a0a0a]">All Properties</h2>
          </SectionReveal>

          {/* ── Filter Bar ──────────────────────────────────── */}
          <SectionReveal className="mt-8">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Property Type Pills */}
              {propertyTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type === 'All' ? '' : type)}
                  className={`px-4 py-2 font-data text-[11px] tracking-wide-luxury transition-all duration-300 ${
                    (type === 'All' && !filterType) || filterType === type
                      ? 'bg-[#0a0a0a] text-[#FAFAF8]'
                      : 'bg-transparent text-[#71717a] hover:text-[#0a0a0a] hover:bg-[#0a0a0a]/5'
                  }`}
                >
                  {type}
                </button>
              ))}

              <span className="w-px h-5 bg-black/10 mx-2 hidden md:block" />

              {/* Listing Type */}
              {listingTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterListing(filterListing === type ? '' : type)}
                  className={`px-4 py-2 font-data text-[11px] tracking-wide-luxury transition-all duration-300 ${
                    filterListing === type
                      ? 'bg-[#0a0a0a] text-[#FAFAF8]'
                      : 'bg-transparent text-[#71717a] hover:text-[#0a0a0a] hover:bg-[#0a0a0a]/5'
                  }`}
                >
                  {type}
                </button>
              ))}

              <span className="w-px h-5 bg-black/10 mx-2 hidden md:block" />

              {/* Bedrooms */}
              <select
                value={filterBedrooms}
                onChange={(e) => setFilterBedrooms(e.target.value)}
                className="font-data text-[11px] tracking-wide-luxury bg-transparent text-[#71717a] cursor-pointer focus:outline-none appearance-none pr-4"
              >
                {bedroomOptions.map((opt, i) => (
                  <option key={opt} value={i === 0 ? '' : String(i)}>
                    {opt === 'Any' ? 'BEDROOMS' : `${opt} BEDS`}
                  </option>
                ))}
              </select>

              {/* Price Range */}
              <select
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
                className="font-data text-[11px] tracking-wide-luxury bg-transparent text-[#71717a] cursor-pointer focus:outline-none appearance-none pr-4"
              >
                {priceOptions.map((opt, i) => (
                  <option key={opt} value={i === 0 ? '' : opt}>
                    {i === 0 ? 'PRICE RANGE' : `${i === 1 ? 'Under $500K' : i === 2 ? '$500K - $1M' : i === 3 ? '$1M - $2M' : i === 4 ? '$2M - $5M' : '$5M+'}`}
                  </option>
                ))}
              </select>
            </div>
          </SectionReveal>

          {/* Results Count */}
          {pagination && (
            <p className="font-data text-xs text-[#71717a] mt-6">
              {pagination.total} {pagination.total === 1 ? 'property' : 'properties'} found
            </p>
          )}

          {/* ── Properties Grid ─────────────────────────────── */}
          {propsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] bg-stone-200" />
                  <div className="mt-4 h-5 bg-stone-200 rounded w-3/4" />
                  <div className="mt-2 h-4 bg-stone-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-serif-display text-xl text-[#0a0a0a]">No Properties Found</p>
              <p className="font-data text-sm text-[#71717a] mt-2">Try adjusting your filters.</p>
            </div>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8"
            >
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => openDetail(property)}
                />
              ))}
            </motion.div>
          )}

          {/* ── Pagination ────────────────────────────────────── */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-12">
              <button
                onClick={() => applyFilters(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-2 text-[#71717a] hover:text-[#0a0a0a] disabled:opacity-30 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => applyFilters(page)}
                  className={`w-9 h-9 font-data text-xs transition-all duration-300 ${
                    page === currentPage
                      ? 'bg-[#0a0a0a] text-[#FAFAF8]'
                      : 'text-[#71717a] hover:text-[#0a0a0a] hover:bg-[#0a0a0a]/5'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => applyFilters(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
                className="p-2 text-[#71717a] hover:text-[#0a0a0a] disabled:opacity-30 transition-colors"
                aria-label="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── CONTACT SECTION ──────────────────────────────────── */}
      <section id="section-contact" ref={contactSectionRef} className="section-breath bg-stone-900">
        <div className="container-luxury">
          <SectionReveal className="text-center max-w-2xl mx-auto">
            <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-3">GET IN TOUCH</p>
            <h2 className="font-serif-display text-3xl md:text-4xl text-white">{agent.name}</h2>
            {agent.tagline && (
              <p className="font-data text-sm text-white/50 mt-3">{agent.tagline}</p>
            )}
            <div className="flex items-center justify-center gap-6 mt-6 font-data text-sm text-white/70">
              {agent.phone && (
                <a href={`tel:${agent.phone}`} className="hover:text-white transition-colors">
                  <Phone size={14} className="inline mr-1.5" />{agent.phone}
                </a>
              )}
              {agent.email && (
                <a href={`mailto:${agent.email}`} className="hover:text-white transition-colors">
                  <Mail size={14} className="inline mr-1.5" />{agent.email}
                </a>
              )}
            </div>
            <button
              onClick={() => {
                if (agent.phone) window.open(`tel:${agent.phone}`);
                track('click', { elementText: 'Schedule a Viewing' });
              }}
              className="btn-outline-luxury !border-white/30 !text-white hover:!bg-white hover:!text-[#0a0a0a] mt-8"
            >
              SCHEDULE A VIEWING
            </button>
          </SectionReveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="bg-[#0a0a0a] py-8">
        <div className="container-luxury flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-serif-display text-sm text-white/60">
            {agent.businessName}
          </span>
          <span className="font-data text-[11px] text-white/30">
            © {new Date().getFullYear()} {agent.businessName}. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            {agent.facebook && (
              <a href={agent.facebook} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/80 transition-colors" aria-label="Facebook">
                <Facebook size={15} />
              </a>
            )}
            {agent.instagram && (
              <a href={agent.instagram} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/80 transition-colors" aria-label="Instagram">
                <Instagram size={15} />
              </a>
            )}
            {agent.whatsapp && (
              <a href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/80 transition-colors" aria-label="WhatsApp">
                <MessageCircle size={15} />
              </a>
            )}
          </div>
        </div>
      </footer>

      
      <AnimatePresence>
        {detailOpen && selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
            onClick={() => setDetailOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
              className="relative z-10 w-full max-w-6xl h-[85vh] md:h-[90vh] bg-white shadow-dramatic overflow-hidden flex flex-col md:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setDetailOpen(false)}
                className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* LEFT — Image Area (60%) */}
              <div className="md:w-[60%] h-[40vh] md:h-full bg-stone-900 relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-900 to-neutral-950" />
                {selectedProperty.images?.[detailImageIndex] && (
                  <img
                    src={selectedProperty.images[detailImageIndex]}
                    alt={selectedProperty.title}
                    className="absolute inset-0 w-full h-full object-cover img-premium"
                  />
                )}

                {/* Image Nav Arrows */}
                {selectedProperty.images && selectedProperty.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setDetailImageIndex((i) => (i > 0 ? i - 1 : selectedProperty.images.length - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 glass-dark flex items-center justify-center hover:bg-white/20 transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={18} className="text-white" />
                    </button>
                    <button
                      onClick={() => setDetailImageIndex((i) => (i < selectedProperty.images.length - 1 ? i + 1 : 0))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 glass-dark flex items-center justify-center hover:bg-white/20 transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight size={18} className="text-white" />
                    </button>
                  </>
                )}

                {/* Image Dots */}
                {selectedProperty.images && selectedProperty.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
                    {selectedProperty.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setDetailImageIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          i === detailImageIndex ? 'bg-white w-6' : 'bg-white/40'
                        }`}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Video Tour Button */}
                {(selectedProperty.videoUrl || selectedProperty.virtualTourUrl) && (
                  <a
                    href={selectedProperty.videoUrl || selectedProperty.virtualTourUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 z-10 glass-dark px-5 py-2.5 flex items-center gap-2 hover:bg-white/20 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PlayCircle size={14} className="text-white" />
                    <span className="font-data text-[10px] tracking-wide-luxury text-white">VIDEO TOUR</span>
                  </a>
                )}
              </div>

              {/* RIGHT — Details Panel (40%) */}
              <div className="md:w-[40%] h-[60vh] md:h-full overflow-y-auto custom-scrollbar flex-shrink-0">
                <div className="p-6 md:p-8">
                  {/* Status + Price */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`inline-block glass-subtle px-2.5 py-1 text-[10px] font-data tracking-wide-luxury font-medium text-white ${statusColor(selectedProperty.status)}`}>
                        {selectedProperty.status}
                      </span>
                    </div>
                    <span className="font-data text-[10px] tracking-wide-luxury text-[#71717a] flex items-center gap-1">
                      {propertyTypeIcon(selectedProperty.propertyType)}
                      {selectedProperty.propertyType}
                    </span>
                  </div>

                  <p className="font-data text-2xl font-medium mt-4 text-[#0a0a0a]">
                    {formatPrice(selectedProperty.price, selectedProperty.currency)}
                  </p>
                  <p className="font-serif-display text-xl text-[#0a0a0a] mt-1">
                    {selectedProperty.title}
                  </p>
                  <p className="font-data text-sm text-[#71717a] mt-1 flex items-center gap-1">
                    <MapPin size={13} />
                    {[selectedProperty.address, selectedProperty.neighborhood, selectedProperty.city, selectedProperty.country].filter(Boolean).join(', ')}
                  </p>

                  <div className="divider-luxury my-6" />

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { label: 'BEDROOMS', value: selectedProperty.bedrooms ?? '—', icon: <Bed size={16} className="text-[#b8956a]" /> },
                      { label: 'BATHROOMS', value: selectedProperty.bathrooms ?? '—', icon: <Bath size={16} className="text-[#b8956a]" /> },
                      { label: 'AREA', value: selectedProperty.areaSqm ? `${selectedProperty.areaSqm.toLocaleString()} sqft` : '—', icon: <Maximize size={16} className="text-[#b8956a]" /> },
                      { label: 'LOT SIZE', value: selectedProperty.lotSizeSqm ? `${selectedProperty.lotSizeSqm.toLocaleString()} sqft` : '—', icon: <LandPlot size={16} className="text-[#b8956a]" /> },
                      { label: 'YEAR BUILT', value: selectedProperty.yearBuilt ?? '—', icon: <Calendar size={16} className="text-[#b8956a]" /> },
                      { label: 'LISTING', value: selectedProperty.listingType, icon: <ArrowUpRight size={16} className="text-[#b8956a]" /> },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="font-data text-[9px] tracking-luxury text-[#71717a] mb-1.5 flex items-center gap-1.5">
                          {item.icon}
                          {item.label}
                        </p>
                        <p className="font-serif-display text-lg text-[#0a0a0a]">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="divider-luxury my-6" />

                  {/* Description */}
                  {selectedProperty.description && (
                    <>
                      <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-3">DESCRIPTION</p>
                      <p className="font-data text-sm text-[#71717a] leading-relaxed">
                        {selectedProperty.description}
                      </p>
                      <div className="divider-luxury my-6" />
                    </>
                  )}

                  {/* Features */}
                  {selectedProperty.features && selectedProperty.features.length > 0 && (
                    <>
                      <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-3">FEATURES</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedProperty.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-3 py-1.5 bg-[#f2f0eb] font-data text-[11px] text-[#0a0a0a] tracking-wide"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      <div className="divider-luxury my-6" />
                    </>
                  )}

                  {/* Inquiry Form */}
                  <div>
                    <p className="font-data text-[10px] tracking-luxury text-[#b8956a] mb-5">INQUIRE ABOUT THIS PROPERTY</p>

                    {inquirySent ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                          <ArrowRight size={20} className="text-emerald-600 rotate-[-45deg]" />
                        </div>
                        <p className="font-serif-display text-lg text-[#0a0a0a]">Inquiry Sent</p>
                        <p className="font-data text-sm text-[#71717a] mt-1">
                          {agent.name} will be in touch soon.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Your Full Name"
                          value={inquiryForm.name}
                          onChange={(e) => setInquiryForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full bg-transparent border-b border-black/10 focus:border-[#b8956a] font-data text-sm text-[#0a0a0a] placeholder:text-[#71717a]/50 pb-3 outline-none transition-colors duration-300"
                        />
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={inquiryForm.email}
                          onChange={(e) => setInquiryForm((f) => ({ ...f, email: e.target.value }))}
                          className="w-full bg-transparent border-b border-black/10 focus:border-[#b8956a] font-data text-sm text-[#0a0a0a] placeholder:text-[#71717a]/50 pb-3 outline-none transition-colors duration-300"
                        />
                        <input
                          type="tel"
                          placeholder="Phone Number"
                          value={inquiryForm.phone}
                          onChange={(e) => setInquiryForm((f) => ({ ...f, phone: e.target.value }))}
                          className="w-full bg-transparent border-b border-black/10 focus:border-[#b8956a] font-data text-sm text-[#0a0a0a] placeholder:text-[#71717a]/50 pb-3 outline-none transition-colors duration-300"
                        />
                        <textarea
                          placeholder="Your Message"
                          rows={3}
                          value={inquiryForm.message}
                          onChange={(e) => setInquiryForm((f) => ({ ...f, message: e.target.value }))}
                          className="w-full bg-transparent border-b border-black/10 focus:border-[#b8956a] font-data text-sm text-[#0a0a0a] placeholder:text-[#71717a]/50 pb-3 outline-none transition-colors duration-300 resize-none"
                        />
                        <button
                          onClick={submitInquiry}
                          disabled={submitting || !inquiryForm.name.trim() || !inquiryForm.email.trim()}
                          className="btn-primary-luxury w-full disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                        >
                          {submitting ? 'SENDING...' : 'SEND INQUIRY'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
