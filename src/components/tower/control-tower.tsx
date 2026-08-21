'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  Home,
  TrendingUp,
  DollarSign,
  Eye,
  Activity,
  Search,
  Plus,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Settings,
  Shield,
  Clock,
  Globe,
  ChevronLeft,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// ── Types ──────────────────────────────────────────────────────────

interface MetricsData {
  agents: { total: number; active: number; inactive: number };
  properties: {
    available: number;
    pending: number;
    sold: number;
    rented: number;
    total: number;
  };
  clients: { total: number };
  deals: { pending: number; closed: number; total: number };
  revenue: {
    monthly: number;
    byPlan: { plan: string; amount: number }[];
  };
  visitors: { last7d: number; last30d: number };
  topAgentsByDeals: {
    agentId: string;
    businessName: string;
    closedDeals: number;
  }[];
  topAgentsByTraffic: {
    agentId: string;
    businessName: string;
    visits: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    agentName: string;
    createdAt: string;
  }[];
}

interface AgentData {
  id: string;
  slug: string;
  businessName: string;
  displayName: string;
  phone: string;
  email: string;
  city: string;
  primaryColor: string;
  accentColor: string;
  status: string;
  commissionRate: number;
  createdAt: string;
  subscription: {
    plan: { name: string; price: number };
  };
  _count: {
    properties: number;
    clients: number;
    deals: number;
    visitorEvents: number;
  };
}

interface AgentsResponse {
  agents: AgentData[];
  totals: { total: number; active: number; suspended: number };
}

interface PlanData {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  maxProperties: number;
  maxClients: number;
  features: string[];
  isActive: boolean;
  _count: { subscriptions: number };
}

interface PlansResponse {
  plans: PlanData[];
}

interface ControlTowerProps {
  onLogout: () => void;
  onBack: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-TT', {
    style: 'currency',
    currency: 'TTD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-TT').format(n);
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-TT', { day: 'numeric', month: 'short' });
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'deal_closed': return <DollarSign className="w-3.5 h-3.5 text-[#b8956a]" />;
    case 'new_property': return <Home className="w-3.5 h-3.5 text-foreground" />;
    case 'new_client': return <Users className="w-3.5 h-3.5 text-foreground" />;
    case 'subscription': return <Shield className="w-3.5 h-3.5 text-[#b8956a]" />;
    case 'visitor': return <Eye className="w-3.5 h-3.5 text-muted-foreground" />;
    default: return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Animation ──────────────────────────────────────────────────────

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

// ── Component ──────────────────────────────────────────────────────

export default function ControlTower({ onLogout, onBack }: ControlTowerProps) {
  // State: data
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [agentsResp, setAgentsResp] = useState<AgentsResponse | null>(null);
  const [plans, setPlans] = useState<PlanData[] | null>(null);

  // State: UI
  const [loading, setLoading] = useState(true);
  const [agentSearch, setAgentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [agentDetailOpen, setAgentDetailOpen] = useState(false);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('overview');

  // State: new plan form
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: '',
    interval: 'monthly',
    maxProperties: '',
    maxClients: '',
    features: '',
  });

  // ── Data fetching ────────────────────────────────────────────────

  const loadMetrics = useCallback(() => {
    fetch('/api/tower/metrics')
      .then((res) => { if (res.ok) return res.json(); })
      .then((data) => { if (data) setMetrics(data); })
      .catch(() => {});
  }, []);

  const loadPlans = useCallback(() => {
    fetch('/api/tower/plans')
      .then((res) => { if (res.ok) return res.json(); })
      .then((data: PlansResponse) => { if (data) setPlans(data.plans); })
      .catch(() => {});
  }, []);

  const loadAgents = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (agentSearch) params.set('search', agentSearch);
    fetch(`/api/tower/agents?${params.toString()}`)
      .then((res) => { if (res.ok) return res.json(); })
      .then((data) => { if (data) setAgentsResp(data); })
      .catch(() => {});
  }, [statusFilter, agentSearch]);

  useEffect(() => {
    const promises = [
      fetch('/api/tower/metrics')
        .then((res) => { if (res.ok) return res.json(); })
        .then((data) => { if (data) setMetrics(data); })
        .catch(() => {}),
      fetch('/api/tower/agents')
        .then((res) => { if (res.ok) return res.json(); })
        .then((data) => { if (data) setAgentsResp(data); })
        .catch(() => {}),
      fetch('/api/tower/plans')
        .then((res) => { if (res.ok) return res.json(); })
        .then((data: PlansResponse) => { if (data) setPlans(data.plans); })
        .catch(() => {}),
    ];
    Promise.all(promises).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) loadAgents();
  }, [statusFilter, agentSearch, loading, loadAgents]);

  // ── Computed ──────────────────────────────────────────────────────

  const filteredAgents = useMemo(() => {
    if (!agentsResp) return [];
    return agentsResp.agents;
  }, [agentsResp]);

  const maxDeals = useMemo(() => {
    if (!metrics?.topAgentsByDeals.length) return 1;
    return Math.max(...metrics.topAgentsByDeals.map((a) => a.closedDeals));
  }, [metrics]);

  const maxVisits = useMemo(() => {
    if (!metrics?.topAgentsByTraffic.length) return 1;
    return Math.max(...metrics.topAgentsByTraffic.map((a) => a.visits));
  }, [metrics]);

  // ── Handlers ──────────────────────────────────────────────────────

  const openAgentDetail = (agent: AgentData) => {
    setSelectedAgent(agent);
    setAgentDetailOpen(true);
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await fetch(`/api/tower/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      loadAgents();
      loadMetrics();
      if (selectedAgent?.id === agentId) {
        setSelectedAgent((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch { /* silently fail */ }
  };

  const handleCreatePlan = async () => {
    try {
      const body = {
        name: newPlan.name,
        price: Number(newPlan.price) || 0,
        interval: newPlan.interval,
        maxProperties: Number(newPlan.maxProperties) || 0,
        maxClients: Number(newPlan.maxClients) || 0,
        features: newPlan.features
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
      };
      await fetch('/api/tower/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setNewPlanOpen(false);
      setNewPlan({ name: '', price: '', interval: 'monthly', maxProperties: '', maxClients: '', features: '' });
      loadPlans();
    } catch { /* silently fail */ }
  };

  const togglePlanStatus = async (planId: string, isActive: boolean) => {
    try {
      await fetch(`/api/tower/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      loadPlans();
    } catch { /* silently fail */ }
  };

  // ── Render: Loading Skeleton ──────────────────────────────────────

  const renderSkeletons = () => (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Top bar skeleton */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 md:px-8">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      {/* Content skeleton */}
      <div className="container-luxury py-8">
        <Skeleton className="h-6 w-48 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    </div>
  );

  // ── Render: KPI Cards ─────────────────────────────────────────────

  const renderKPIs = () => {
    if (!metrics) return null;
    const kpis = [
      {
        label: 'Active Agents',
        value: formatNumber(metrics.agents.active),
        subtitle: `of ${formatNumber(metrics.agents.total)} total`,
        icon: Users,
        trend: metrics.agents.active > 0 ? 'up' as const : 'down' as const,
      },
      {
        label: 'Properties',
        value: formatNumber(metrics.properties.total),
        subtitle: `${formatNumber(metrics.properties.available)} available`,
        icon: Home,
        trend: metrics.properties.total > 0 ? 'up' as const : 'down' as const,
      },
      {
        label: 'Monthly Revenue',
        value: formatCurrency(metrics.revenue.monthly),
        subtitle: metrics.revenue.byPlan.length > 0
          ? `${metrics.revenue.byPlan.length} plans active`
          : 'No data',
        icon: DollarSign,
        trend: metrics.revenue.monthly > 0 ? 'up' as const : 'down' as const,
        accent: true,
      },
      {
        label: 'Visitors',
        value: formatNumber(metrics.visitors.last30d),
        subtitle: `${formatNumber(metrics.visitors.last7d)} last 7 days`,
        icon: Eye,
        trend: metrics.visitors.last7d > 0 ? 'up' as const : 'down' as const,
      },
    ];

    return (
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              variants={fadeUp}
              className={cn(
                'glass-card rounded-lg p-5 md:p-6 group transition-all duration-500 hover:shadow-elevated',
                kpi.accent && 'border-l-2 border-l-[#b8956a]',
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground">
                  {kpi.label}
                </span>
                <Icon className="w-4 h-4 text-muted-foreground/40 group-hover:text-[#b8956a] transition-colors duration-500" />
              </div>
              <div className="flex items-end gap-2 mb-1.5">
                <span className="text-2xl md:text-3xl font-data font-semibold tracking-tight text-foreground">
                  {kpi.value}
                </span>
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#b8956a] mb-1" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-muted-foreground/40 mb-1" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-data truncate">
                {kpi.subtitle}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  // ── Render: Section Label ─────────────────────────────────────────

  const SectionLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('flex items-center gap-4 mb-5', className)}>
      <h2 className="text-[11px] font-data font-medium tracking-wide-luxury text-muted-foreground whitespace-nowrap">
        {children}
      </h2>
      <div className="flex-1 divider-luxury" />
    </div>
  );

  // ── Render: Agents Table ──────────────────────────────────────────

  const renderAgentsTable = () => {
    const agents = filteredAgents;

    return (
      <motion.div variants={fadeUp}>
        <div className="glass-card rounded-lg overflow-hidden">
          {/* Header bar */}
          <div className="px-5 md:px-6 py-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="font-serif-display text-lg text-foreground">
                Agent Directory
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <Input
                    placeholder="Search..."
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    className="pl-9 h-8 w-44 md:w-52 text-xs font-data bg-[#FAFAF8] border-border focus:border-[#b8956a]/40 focus:ring-[#b8956a]/10 rounded"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-28 text-xs font-data bg-[#FAFAF8] border-border rounded">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table */}
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-data">No agents found</p>
              <p className="text-xs mt-1 text-muted-foreground/60">Try adjusting your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground pl-5 md:pl-6">
                      Agent
                    </TableHead>
                    <TableHead className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground text-center">
                      Properties
                    </TableHead>
                    <TableHead className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground text-center">
                      Clients
                    </TableHead>
                    <TableHead className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground text-center">
                      Deals
                    </TableHead>
                    <TableHead className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground hidden md:table-cell">
                      Plan
                    </TableHead>
                    <TableHead className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground text-center hidden lg:table-cell">
                      Visits
                    </TableHead>
                    <TableHead className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground text-right pr-5 md:pr-6">

                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent, idx) => (
                    <motion.tr
                      key={agent.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03, duration: 0.3 }}
                      className="border-b border-border/50 cursor-pointer transition-colors duration-200 hover:bg-[#FAFAF8] group"
                      onClick={() => openAgentDetail(agent)}
                    >
                      <TableCell className="pl-5 md:pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 shrink-0 rounded" style={{ backgroundColor: agent.primaryColor || '#0a0a0a' }}>
                            <AvatarFallback className="text-white text-[10px] font-data font-semibold rounded">
                              {getInitials(agent.businessName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-data font-medium text-foreground truncate group-hover:text-[#b8956a] transition-colors">
                              {agent.businessName}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                              <Globe className="w-2.5 h-2.5" />
                              {agent.city}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-[10px] font-data font-medium tracking-wide-luxury',
                          agent.status === 'active' ? 'text-foreground' : 'text-muted-foreground/50',
                        )}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            agent.status === 'active' ? 'bg-emerald-500' : 'bg-red-400',
                          )} />
                          {agent.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-center text-sm font-data text-foreground">
                        {agent._count.properties}
                      </TableCell>
                      <TableCell className="py-3.5 text-center text-sm font-data text-foreground">
                        {agent._count.clients}
                      </TableCell>
                      <TableCell className="py-3.5 text-center text-sm font-data text-foreground">
                        {agent._count.deals}
                      </TableCell>
                      <TableCell className="py-3.5 hidden md:table-cell">
                        <span className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground bg-secondary px-2.5 py-1">
                          {agent.subscription?.plan?.name || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-center text-sm font-data text-foreground hidden lg:table-cell">
                        {formatNumber(agent._count.visitorEvents)}
                      </TableCell>
                      <TableCell className="py-3.5 text-right pr-5 md:pr-6">
                        <div
                          className="flex items-center justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className={cn(
                              'p-1.5 rounded transition-colors duration-200',
                              agent.status === 'active'
                                ? 'text-muted-foreground/40 hover:text-red-500 hover:bg-red-50'
                                : 'text-muted-foreground/40 hover:text-emerald-600 hover:bg-emerald-50',
                            )}
                            onClick={() => toggleAgentStatus(agent.id, agent.status)}
                            aria-label={agent.status === 'active' ? 'Suspend agent' : 'Activate agent'}
                          >
                            {agent.status === 'active' ? (
                              <ToggleRight className="w-4.5 h-4.5" />
                            ) : (
                              <ToggleLeft className="w-4.5 h-4.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer */}
          {agentsResp && (
            <div className="px-5 md:px-6 py-3 border-t border-border bg-[#FAFAF8]/50">
              <p className="text-[11px] font-data text-muted-foreground">
                {agents.length} of {agentsResp.totals.total} agents
                <span className="mx-2 text-border">|</span>
                <span className="text-emerald-600 font-medium">{agentsResp.totals.active} active</span>
                <span className="mx-2 text-border">|</span>
                <span className="text-red-500 font-medium">{agentsResp.totals.suspended} suspended</span>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ── Render: Top Performers ────────────────────────────────────────

  const renderTopPerformers = () => {
    if (!metrics) return null;

    return (
      <motion.div className="space-y-4" variants={fadeUp}>
        {/* Top by Deals */}
        <div className="glass-card rounded-lg p-5">
          <h4 className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground mb-4">
            Top by Closed Deals
          </h4>
          {metrics.topAgentsByDeals.length === 0 ? (
            <p className="text-xs font-data text-muted-foreground/50 text-center py-6">
              No closed deals yet
            </p>
          ) : (
            <div className="space-y-3.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {metrics.topAgentsByDeals.map((agent, idx) => (
                <div key={agent.agentId} className="group/row">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[10px] font-data font-semibold text-[#b8956a] w-4 text-center">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-data font-medium text-foreground truncate flex-1 group-hover/row:text-[#b8956a] transition-colors">
                      {agent.businessName}
                    </span>
                    <span className="text-xs font-data font-semibold text-foreground tabular-nums">
                      {agent.closedDeals}
                    </span>
                  </div>
                  <div className="ml-7 w-full h-[3px] bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#b8956a] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(agent.closedDeals / maxDeals) * 100}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] as const }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top by Traffic */}
        <div className="glass-card rounded-lg p-5">
          <h4 className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground mb-4">
            Top by Visitor Traffic
          </h4>
          {metrics.topAgentsByTraffic.length === 0 ? (
            <p className="text-xs font-data text-muted-foreground/50 text-center py-6">
              No visitor data yet
            </p>
          ) : (
            <div className="space-y-3.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {metrics.topAgentsByTraffic.map((agent, idx) => (
                <div key={agent.agentId} className="group/row">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[10px] font-data font-semibold text-foreground/30 w-4 text-center">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-data font-medium text-foreground truncate flex-1 group-hover/row:text-[#b8956a] transition-colors">
                      {agent.businessName}
                    </span>
                    <span className="text-xs font-data font-semibold text-[#b8956a] tabular-nums">
                      {formatNumber(agent.visits)}
                    </span>
                  </div>
                  <div className="ml-7 w-full h-[3px] bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-foreground/20 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(agent.visits / maxVisits) * 100}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] as const }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ── Render: Recent Activity ───────────────────────────────────────

  const renderRecentActivity = () => {
    if (!metrics) return null;
    const activities = metrics.recentActivity;

    return (
      <motion.div variants={fadeUp}>
        <div className="glass-card rounded-lg p-5">
          <h4 className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground mb-4">
            Recent Activity
          </h4>
          {activities.length === 0 ? (
            <p className="text-xs font-data text-muted-foreground/50 text-center py-6">
              No recent activity
            </p>
          ) : (
            <div className="space-y-0 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {activities.slice(0, 12).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0"
                >
                  <div className="w-7 h-7 rounded bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-data text-foreground leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-data font-medium text-[#b8956a]">
                        {item.agentName}
                      </span>
                      <span className="text-[10px] text-border">·</span>
                      <span className="text-[10px] font-data text-muted-foreground/50 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ── Render: Plans Section ─────────────────────────────────────────

  const renderPlansSection = () => (
    <motion.div variants={fadeUp}>
      <SectionLabel>Subscription Plans</SectionLabel>

      {!plans || plans.length === 0 ? (
        <div className="glass-card rounded-lg p-12 flex flex-col items-center justify-center text-muted-foreground">
          <Shield className="w-8 h-8 mb-3 opacity-20" />
          <p className="text-sm font-data">No plans configured</p>
          <p className="text-xs mt-1 text-muted-foreground/50">Create your first subscription plan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: plan.isActive ? 1 : 0.5, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.4 }}
              className={cn(
                'glass-card rounded-lg p-5 transition-all duration-300 group',
                !plan.isActive && 'opacity-50 grayscale-[30%]',
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-sm font-serif-display text-foreground">
                    {plan.name}
                  </h4>
                  <p className="text-xl font-data font-semibold text-foreground mt-1 tracking-tight">
                    {formatCurrency(plan.price)}
                    <span className="text-[10px] font-data font-normal text-muted-foreground ml-1 tracking-wide-luxury">
                      /{plan.interval === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </p>
                </div>
                <Switch
                  checked={plan.isActive}
                  onCheckedChange={() => togglePlanStatus(plan.id, plan.isActive)}
                  className="data-[state=checked]:bg-[#b8956a]"
                />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs font-data">
                  <span className="text-muted-foreground">Max Properties</span>
                  <span className="font-medium text-foreground">{plan.maxProperties}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-data">
                  <span className="text-muted-foreground">Max Clients</span>
                  <span className="font-medium text-foreground">{plan.maxClients}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-data">
                  <span className="text-muted-foreground">Subscribers</span>
                  <span className="font-medium text-[#b8956a]">{plan._count.subscriptions}</span>
                </div>
              </div>

              {plan.features.length > 0 && (
                <>
                  <div className="divider-luxury mb-3" />
                  <div className="space-y-1.5">
                    {plan.features.slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] font-data text-muted-foreground">
                        <span className="w-1 h-1 rounded-full bg-[#b8956a] shrink-0" />
                        {f}
                      </div>
                    ))}
                    {plan.features.length > 4 && (
                      <p className="text-[10px] font-data text-muted-foreground/40 pl-3">
                        +{plan.features.length - 4} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Create plan button */}
      <Dialog open={newPlanOpen} onOpenChange={setNewPlanOpen}>
        <DialogTrigger asChild>
          <button className="mt-4 btn-outline-luxury text-[10px]">
            <Plus className="w-3.5 h-3.5 inline-block mr-2 -mt-px" />
            Create Plan
          </button>
        </DialogTrigger>
        <DialogContent className="bg-background max-w-md rounded-lg border-border">
          <DialogHeader>
            <DialogTitle className="font-serif-display text-xl text-foreground">
              New Subscription Plan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-1">
            <div>
              <Label className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground">
                Plan Name
              </Label>
              <Input
                value={newPlan.name}
                onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Professional"
                className="mt-2 h-10 text-sm font-data bg-secondary border-border rounded focus:border-[#b8956a]/40 focus:ring-[#b8956a]/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground">
                  Price (TTD)
                </Label>
                <Input
                  type="number"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan((p) => ({ ...p, price: e.target.value }))}
                  placeholder="0"
                  className="mt-2 h-10 text-sm font-data bg-secondary border-border rounded focus:border-[#b8956a]/40 focus:ring-[#b8956a]/10"
                />
              </div>
              <div>
                <Label className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground">
                  Interval
                </Label>
                <Select
                  value={newPlan.interval}
                  onValueChange={(v) => setNewPlan((p) => ({ ...p, interval: v }))}
                >
                  <SelectTrigger className="mt-2 h-10 text-sm font-data bg-secondary border-border rounded">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground">
                  Max Properties
                </Label>
                <Input
                  type="number"
                  value={newPlan.maxProperties}
                  onChange={(e) => setNewPlan((p) => ({ ...p, maxProperties: e.target.value }))}
                  placeholder="0"
                  className="mt-2 h-10 text-sm font-data bg-secondary border-border rounded focus:border-[#b8956a]/40 focus:ring-[#b8956a]/10"
                />
              </div>
              <div>
                <Label className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground">
                  Max Clients
                </Label>
                <Input
                  type="number"
                  value={newPlan.maxClients}
                  onChange={(e) => setNewPlan((p) => ({ ...p, maxClients: e.target.value }))}
                  placeholder="0"
                  className="mt-2 h-10 text-sm font-data bg-secondary border-border rounded focus:border-[#b8956a]/40 focus:ring-[#b8956a]/10"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground">
                Features (comma-separated)
              </Label>
              <Input
                value={newPlan.features}
                onChange={(e) => setNewPlan((p) => ({ ...p, features: e.target.value }))}
                placeholder="e.g. Public Portal, Custom Domain"
                className="mt-2 h-10 text-sm font-data bg-secondary border-border rounded focus:border-[#b8956a]/40 focus:ring-[#b8956a]/10"
              />
            </div>
            <button
              onClick={handleCreatePlan}
              disabled={!newPlan.name}
              className="btn-primary-luxury w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create Plan
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );

  // ── Render: Agent Detail Dialog ───────────────────────────────────

  const renderAgentDetail = () => {
    if (!selectedAgent) return null;
    const a = selectedAgent;

    return (
      <Dialog open={agentDetailOpen} onOpenChange={setAgentDetailOpen}>
        <DialogContent className="bg-background max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar rounded-lg border-border">
          <DialogHeader>
            <DialogTitle className="font-serif-display text-xl text-foreground">
              Agent Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-1">
            {/* Agent header with branding */}
            <div className="flex items-center gap-4">
              <Avatar
                className="w-14 h-14 rounded"
                style={{ backgroundColor: a.primaryColor || '#0a0a0a' }}
              >
                <AvatarFallback className="text-white text-base font-data font-bold rounded">
                  {getInitials(a.businessName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-serif-display text-foreground truncate">
                  {a.businessName}
                </h3>
                <p className="text-sm font-data text-muted-foreground">{a.displayName}</p>
                <p className="text-[11px] font-data text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                  <Globe className="w-3 h-3" />
                  {a.city}
                </p>
              </div>
              <span className={cn(
                'inline-flex items-center gap-1.5 text-[10px] font-data font-medium tracking-wide-luxury shrink-0',
                a.status === 'active' ? 'text-foreground' : 'text-muted-foreground/50',
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  a.status === 'active' ? 'bg-emerald-500' : 'bg-red-400',
                )} />
                {a.status === 'active' ? 'Active' : 'Suspended'}
              </span>
            </div>

            <div className="divider-luxury" />

            {/* Visual Identity */}
            <div>
              <h5 className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground mb-3">
                Visual Identity
              </h5>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded border border-border shadow-soft"
                    style={{ backgroundColor: a.primaryColor || '#0a0a0a' }}
                  />
                  <span className="text-[11px] font-data text-muted-foreground">Primary</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded border border-border shadow-soft"
                    style={{ backgroundColor: a.accentColor || '#b8956a' }}
                  />
                  <span className="text-[11px] font-data text-muted-foreground">Accent</span>
                </div>
              </div>
            </div>

            <div className="divider-luxury" />

            {/* Contact Information */}
            <div>
              <h5 className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground mb-3">
                Contact Information
              </h5>
              <div className="space-y-2.5">
                {[
                  { label: 'Email', value: a.email },
                  { label: 'Phone', value: a.phone },
                  { label: 'Slug', value: a.slug, mono: true },
                  { label: 'Commission', value: `${a.commissionRate}%` },
                  { label: 'Member Since', value: new Date(a.createdAt).toLocaleDateString('en-TT', { year: 'numeric', month: 'long', day: 'numeric' }) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-[11px] font-data text-muted-foreground">{row.label}</span>
                    <span className={cn(
                      'text-xs font-data text-foreground text-right max-w-[60%] truncate',
                      row.mono && 'font-mono text-[11px]',
                    )}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="divider-luxury" />

            {/* Stats grid */}
            <div>
              <h5 className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground mb-3">
                Portfolio Statistics
              </h5>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Properties', value: a._count.properties },
                  { label: 'Clients', value: a._count.clients },
                  { label: 'Deals', value: a._count.deals, accent: true },
                  { label: 'Visitors', value: a._count.visitorEvents },
                ].map((stat) => (
                  <div key={stat.label} className="bg-secondary/50 rounded-lg p-3.5">
                    <p className={cn(
                      'text-xl font-data font-semibold tracking-tight',
                      stat.accent ? 'text-[#b8956a]' : 'text-foreground',
                    )}>
                      {formatNumber(stat.value)}
                    </p>
                    <p className="text-[10px] font-data text-muted-foreground tracking-wide-luxury mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Plan */}
            <div>
              <h5 className="text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground mb-3">
                Current Plan
              </h5>
              <div className="bg-secondary/50 rounded-lg p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#b8956a]/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#b8956a]" />
                  </div>
                  <div>
                    <p className="text-sm font-data font-medium text-foreground">
                      {a.subscription?.plan?.name || 'No plan'}
                    </p>
                    <p className="text-[11px] font-data text-muted-foreground">
                      {a.subscription?.plan?.price
                        ? formatCurrency(a.subscription.plan.price) + '/mo'
                        : 'Free'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="divider-luxury" />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                className={cn(
                  'flex-1 h-10 text-xs font-data font-medium tracking-wide-luxury transition-all duration-300 border',
                  a.status === 'active'
                    ? 'border-border text-muted-foreground hover:border-red-300 hover:text-red-600 hover:bg-red-50'
                    : 'border-border text-muted-foreground hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50',
                )}
                onClick={() => toggleAgentStatus(a.id, a.status)}
              >
                {a.status === 'active' ? 'Suspend Agent' : 'Activate Agent'}
              </button>
              <button className="flex-1 h-10 btn-outline-luxury text-[10px]">
                Change Plan
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Render: Mobile Tabbed Content ─────────────────────────────────

  const renderMobileContent = () => (
    <div className="md:hidden">
      <Tabs value={mobileTab} onValueChange={setMobileTab}>
        <TabsList className="w-full bg-secondary/50 rounded-none h-10 p-0.5 gap-0.5">
          {['overview', 'agents', 'activity', 'plans'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 text-[9px] font-data font-medium tracking-wide-luxury rounded-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-soft capitalize"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {renderKPIs()}
          {renderTopPerformers()}
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          {renderAgentsTable()}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          {renderRecentActivity()}
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          {renderPlansSection()}
        </TabsContent>
      </Tabs>
    </div>
  );

  // ── Render: Desktop Content ───────────────────────────────────────

  const renderDesktopContent = () => (
    <div className="hidden md:block">
      {/* KPIs */}
      <div className="mb-8">{renderKPIs()}</div>

      {/* Main grid: Agents + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <SectionLabel>Agent Management</SectionLabel>
          {renderAgentsTable()}
        </div>
        <div className="space-y-6">
          <div>
            <SectionLabel>Performance</SectionLabel>
            {renderTopPerformers()}
          </div>
          {renderRecentActivity()}
        </div>
      </div>

      {/* Plans */}
      <div className="mb-8">
        {renderPlansSection()}
      </div>
    </div>
  );

  // ── Main Render ───────────────────────────────────────────────────

  if (loading) return renderSkeletons();

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* ── Ultra-thin Top Bar ─────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
        className="sticky top-0 z-30 border-b border-border"
      >
        <div className="glass">
          <div className="container-luxury flex items-center justify-between h-12 md:h-14">
            {/* Left: Branding */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                <span className="font-serif-display text-base md:text-lg text-foreground tracking-tight">
                  PROPOS
                </span>
                <span className="hidden sm:inline text-[9px] font-data font-medium tracking-luxury text-muted-foreground ml-1">
                  Control Tower
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                  <Shield className="w-3 h-3 text-background" />
                </div>
                <span className="text-[10px] font-data font-medium text-muted-foreground">
                  Administrator
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-data font-medium tracking-wide-luxury text-muted-foreground hover:text-red-500 transition-colors duration-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="flex-1 container-luxury py-6 md:py-8">
        {/* Page Title */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mb-8 md:mb-10"
        >
          <motion.h1
            variants={fadeUp}
            className="font-serif-display text-2xl md:text-3xl text-foreground tracking-tight"
          >
            Platform Overview
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-xs font-data text-muted-foreground mt-1.5"
          >
            {metrics ? (
              <>
                {formatNumber(metrics.agents.active)} active agents
                <span className="mx-2 text-border">·</span>
                {formatNumber(metrics.properties.total)} listings
                <span className="mx-2 text-border">·</span>
                {formatCurrency(metrics.revenue.monthly)} MRR
              </>
            ) : (
              'Loading platform data...'
            )}
          </motion.p>
        </motion.div>

        {/* Tabbed mobile / Full desktop */}
        {renderMobileContent()}
        {renderDesktopContent()}
      </main>

      {/* ── Minimal Footer ──────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-auto"
      >
        <div className="divider-luxury" />
        <div className="container-luxury py-4 flex items-center justify-between">
          <p className="text-[10px] font-data text-muted-foreground/40 tracking-wide-luxury">
            PROPOS Platform
          </p>
          <p className="text-[10px] font-data text-muted-foreground/40">
            Admin Panel v1.0
          </p>
        </div>
      </motion.footer>

      {/* ── Agent Detail Dialog ─────────────────────────────────── */}
      {renderAgentDetail()}
    </div>
  );
}
