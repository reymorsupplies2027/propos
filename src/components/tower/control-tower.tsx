'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  MoreVertical,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Settings,
  Shield,
  Calendar,
  Clock,
  Globe,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

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
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-TT', { day: 'numeric', month: 'short' });
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'deal_closed': return <DollarSign className="w-4 h-4 text-[#2D6A4F]" />;
    case 'new_property': return <Home className="w-4 h-4 text-[#D4A373]" />;
    case 'new_client': return <Users className="w-4 h-4 text-[#1B4332]" />;
    case 'subscription': return <Shield className="w-4 h-4 text-[#6B7280]" />;
    case 'visitor': return <Eye className="w-4 h-4 text-[#9CA3AF]" />;
    default: return <Activity className="w-4 h-4 text-[#D4A373]" />;
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

// ── Custom Scrollbar Styles ───────────────────────────────────────

const scrollbarStyles = `
  .tower-scroll::-webkit-scrollbar { width: 5px; }
  .tower-scroll::-webkit-scrollbar-track { background: transparent; }
  .tower-scroll::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 9999px; }
  .tower-scroll::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
`;

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

  const loadMetrics = () => {
    fetch('/api/tower/metrics')
      .then((res) => { if (res.ok) return res.json(); })
      .then((data) => { if (data) setMetrics(data); })
      .catch(() => {});
  };

  const loadPlans = () => {
    fetch('/api/tower/plans')
      .then((res) => { if (res.ok) return res.json(); })
      .then((data: PlansResponse) => { if (data) setPlans(data.plans); })
      .catch(() => {});
  };

  const loadAgents = () => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (agentSearch) params.set('search', agentSearch);
    fetch(`/api/tower/agents?${params.toString()}`)
      .then((res) => { if (res.ok) return res.json(); })
      .then((data) => { if (data) setAgentsResp(data); })
      .catch(() => {});
  };

  // Initial load
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

  // Re-fetch agents when search/filter changes
  useEffect(() => {
    if (!loading) loadAgents();
  }, [statusFilter, agentSearch, loading]);

  // ── Computed values ──────────────────────────────────────────────

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

  // ── Handlers ─────────────────────────────────────────────────────

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
    } catch {
      /* silently fail */
    }
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
    } catch {
      /* silently fail */
    }
  };

  const togglePlanStatus = async (planId: string, isActive: boolean) => {
    try {
      await fetch(`/api/tower/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      loadPlans();
    } catch {
      /* silently fail */
    }
  };

  // ── Render helpers ───────────────────────────────────────────────

  const renderSkeletons = () => (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  const renderKPIs = () => {
    if (!metrics) return null;
    const kpis = [
      {
        label: 'Active Agents',
        value: formatNumber(metrics.agents.active),
        subtitle: `of ${formatNumber(metrics.agents.total)} total`,
        icon: Users,
        trend: 'up' as const,
        color: '#2D6A4F',
        bgColor: '#ECFDF5',
      },
      {
        label: 'Published Properties',
        value: formatNumber(metrics.properties.total),
        subtitle: `${formatNumber(metrics.properties.available)} avail. · ${formatNumber(metrics.properties.sold)} sold · ${formatNumber(metrics.properties.rented)} rented`,
        icon: Home,
        trend: 'up' as const,
        color: '#1B4332',
        bgColor: '#F0FDF4',
      },
      {
        label: 'Monthly Revenue',
        value: formatCurrency(metrics.revenue.monthly),
        subtitle:
          metrics.revenue.byPlan
            .map((p) => `${p.plan}: ${formatCurrency(p.amount)}`)
            .join(' · ') || 'No data by plan',
        icon: DollarSign,
        trend: 'up' as const,
        color: '#D4A373',
        bgColor: '#FFF7ED',
      },
      {
        label: 'Visitors (30d)',
        value: formatNumber(metrics.visitors.last30d),
        subtitle: `${formatNumber(metrics.visitors.last7d)} in the last 7 days`,
        icon: Eye,
        trend: metrics.visitors.last7d > 0 ? ('up' as const) : ('down' as const),
        color: '#6B7280',
        bgColor: '#F9FAFB',
      },
    ];

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
                      {kpi.label}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: kpi.bgColor }}
                    >
                      <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl md:text-3xl font-bold text-[#1B4332]">
                      {kpi.value}
                    </span>
                    {kpi.trend === 'up' ? (
                      <ArrowUpRight className="w-4 h-4 text-[#2D6A4F] mb-1" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-[#DC2626] mb-1" />
                    )}
                  </div>
                  <p className="text-xs text-[#9A9A9A] mt-1 truncate" title={kpi.subtitle}>
                    {kpi.subtitle}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderAgentsTable = () => {
    const agents = filteredAgents;

    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg font-bold text-[#1B4332]">
              <Users className="w-5 h-5 inline-block mr-2" />
              Agents
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A]" />
                <Input
                  placeholder="Search agent..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="pl-9 h-9 w-48 md:w-56 text-sm bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#D4A373]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-32 text-sm bg-[#F9FAFB] border-[#E5E7EB]">
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
        </CardHeader>
        <CardContent className="p-0">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#9A9A9A]">
              <Users className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No agents found</p>
              <p className="text-xs mt-1">Try adjusting the search filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#F3F4F6] hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide pl-4 md:pl-5">
                      Agent
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide text-center">
                      Prop.
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide text-center">
                      Clients
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide text-center">
                      Deals
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                      Plan
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide text-center">
                      Visits
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide text-right pr-4 md:pr-5">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow
                      key={agent.id}
                      className="border-b border-[#F9FAFB] cursor-pointer hover:bg-[#FAFAF8] transition-colors"
                      onClick={() => openAgentDetail(agent)}
                    >
                      <TableCell className="pl-4 md:pl-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 shrink-0" style={{ backgroundColor: agent.primaryColor || '#1B4332' }}>
                            <AvatarFallback className="text-white text-xs font-semibold">
                              {getInitials(agent.businessName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1B4332] truncate">
                              {agent.businessName}
                            </p>
                            <p className="text-xs text-[#9A9A9A] flex items-center gap-1 truncate">
                              <Globe className="w-3 h-3" />
                              {agent.city}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full border-0',
                            agent.status === 'active'
                              ? 'bg-[#ECFDF5] text-[#2D6A4F]'
                              : 'bg-[#FEF2F2] text-[#DC2626]',
                          )}
                        >
                          {agent.status === 'active' ? 'Active' : 'Suspended'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-center text-sm font-medium text-[#374151]">
                        {agent._count.properties}
                      </TableCell>
                      <TableCell className="py-3 text-center text-sm font-medium text-[#374151]">
                        {agent._count.clients}
                      </TableCell>
                      <TableCell className="py-3 text-center text-sm font-medium text-[#374151]">
                        {agent._count.deals}
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-xs font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded">
                          {agent.subscription?.plan?.name || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-center text-sm font-medium text-[#374151]">
                        {agent._count.visitorEvents}
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4 md:pr-5">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-[#F3F4F6]"
                            onClick={() => openAgentDetail(agent)}
                          >
                            <Eye className="w-4 h-4 text-[#6B7280]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'h-8 w-8 p-0',
                              agent.status === 'active'
                                ? 'hover:bg-[#FEF2F2]'
                                : 'hover:bg-[#ECFDF5]',
                            )}
                            onClick={() => toggleAgentStatus(agent.id, agent.status)}
                          >
                            {agent.status === 'active' ? (
                              <Shield className="w-4 h-4 text-[#DC2626]" />
                            ) : (
                              <Shield className="w-4 h-4 text-[#2D6A4F]" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {agentsResp && (
            <div className="px-4 md:px-5 py-3 border-t border-[#F3F4F6]">
              <p className="text-xs text-[#9A9A9A]">
                Showing {agents.length} of {agentsResp.totals.total} agents
                {' · '}
                <span className="text-[#2D6A4F] font-medium">
                  {agentsResp.totals.active} active
                </span>
                {' · '}
                <span className="text-[#DC2626] font-medium">
                  {agentsResp.totals.suspended} suspended
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTopPerformers = () => {
    if (!metrics) return null;

    return (
      <div className="space-y-4">
        {/* Top by Deals */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[#1B4332]">
              <BarChart3 className="w-4 h-4 inline-block mr-2" />
              Top by Deals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {metrics.topAgentsByDeals.length === 0 ? (
              <p className="text-sm text-[#9A9A9A] text-center py-4">
                No closed deals data
              </p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto tower-scroll">
                {metrics.topAgentsByDeals.map((agent, idx) => (
                  <div key={agent.agentId} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#D4A373] w-4 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#374151] truncate">
                          {agent.businessName}
                        </span>
                        <span className="text-xs font-bold text-[#1B4332] ml-2">
                          {agent.closedDeals}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#2D6A4F] to-[#40916C] transition-all duration-500"
                          style={{
                            width: `${(agent.closedDeals / maxDeals) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top by Traffic */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[#1B4332]">
              <PieChart className="w-4 h-4 inline-block mr-2" />
              Top by Traffic
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {metrics.topAgentsByTraffic.length === 0 ? (
              <p className="text-sm text-[#9A9A9A] text-center py-4">
                No visitor data
              </p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto tower-scroll">
                {metrics.topAgentsByTraffic.map((agent, idx) => (
                  <div key={agent.agentId} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#D4A373] w-4 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#374151] truncate">
                          {agent.businessName}
                        </span>
                        <span className="text-xs font-bold text-[#D4A373] ml-2">
                          {formatNumber(agent.visits)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#D4A373] to-[#E9C46A] transition-all duration-500"
                          style={{
                            width: `${(agent.visits / maxVisits) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRecentActivity = () => {
    if (!metrics) return null;
    const activities = metrics.recentActivity;

    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#1B4332]">
            <Activity className="w-4 h-4 inline-block mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {activities.length === 0 ? (
            <p className="text-sm text-[#9A9A9A] text-center py-4">
              No recent activity
            </p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto tower-scroll">
              {activities.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2.5 border-b border-[#F9FAFB] last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F9FAFB] flex items-center justify-center shrink-0 mt-0.5">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#374151] leading-snug">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-[#D4A373]">
                        {item.agentName}
                      </span>
                      <span className="text-[#D1D5DB]">·</span>
                      <span className="text-xs text-[#9A9A9A] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPlansSection = () => {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.3 }}>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-[#1B4332]">
                <Shield className="w-5 h-5 inline-block mr-2" />
                Subscription Plans
              </CardTitle>
              <Dialog open={newPlanOpen} onOpenChange={setNewPlanOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-medium"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-[#1B4332]">Create New Plan</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <Label className="text-sm font-medium text-[#374151]">Plan name</Label>
                      <Input
                        value={newPlan.name}
                        onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Professional"
                        className="mt-1 bg-[#F9FAFB] border-[#E5E7EB]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-[#374151]">Price (TTD)</Label>
                        <Input
                          type="number"
                          value={newPlan.price}
                          onChange={(e) => setNewPlan((p) => ({ ...p, price: e.target.value }))}
                          placeholder="0"
                          className="mt-1 bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-[#374151]">Interval</Label>
                        <Select
                          value={newPlan.interval}
                          onValueChange={(v) => setNewPlan((p) => ({ ...p, interval: v }))}
                        >
                          <SelectTrigger className="mt-1 bg-[#F9FAFB] border-[#E5E7EB]">
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
                        <Label className="text-sm font-medium text-[#374151]">Max. Properties</Label>
                        <Input
                          type="number"
                          value={newPlan.maxProperties}
                          onChange={(e) => setNewPlan((p) => ({ ...p, maxProperties: e.target.value }))}
                          placeholder="0"
                          className="mt-1 bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-[#374151]">Max. Clients</Label>
                        <Input
                          type="number"
                          value={newPlan.maxClients}
                          onChange={(e) => setNewPlan((p) => ({ ...p, maxClients: e.target.value }))}
                          placeholder="0"
                          className="mt-1 bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[#374151]">
                        Features (comma-separated)
                      </Label>
                      <Input
                        value={newPlan.features}
                        onChange={(e) => setNewPlan((p) => ({ ...p, features: e.target.value }))}
                        placeholder="e.g. Public Portal, Custom Domain"
                        className="mt-1 bg-[#F9FAFB] border-[#E5E7EB]"
                      />
                    </div>
                    <Button
                      onClick={handleCreatePlan}
                      disabled={!newPlan.name}
                      className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
                    >
                      Create Plan
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-5 pt-0">
            {!plans || plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#9A9A9A]">
                <Shield className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">No plans configured</p>
                <p className="text-xs mt-1">Create your first subscription plan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      'rounded-xl border p-4 transition-all duration-200',
                      plan.isActive
                        ? 'border-[#E5E7EB] bg-white hover:shadow-md'
                        : 'border-[#F3F4F6] bg-[#F9FAFB] opacity-60',
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-[#1B4332]">{plan.name}</h4>
                        <p className="text-lg font-bold text-[#D4A373] mt-0.5">
                          {formatCurrency(plan.price)}
                          <span className="text-xs font-normal text-[#9A9A9A]">
                            /{plan.interval === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full border-0',
                          plan.isActive ? 'bg-[#ECFDF5] text-[#2D6A4F]' : 'bg-[#F3F4F6] text-[#6B7280]',
                        )}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6B7280]">Max. Properties</span>
                        <span className="font-semibold text-[#374151]">{plan.maxProperties}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6B7280]">Max. Clients</span>
                        <span className="font-semibold text-[#374151]">{plan.maxClients}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6B7280]">Subscribers</span>
                        <span className="font-semibold text-[#D4A373]">
                          {plan._count.subscriptions}
                        </span>
                      </div>
                    </div>
                    {plan.features.length > 0 && (
                      <div className="space-y-1 mb-4">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-[#6B7280]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A373] shrink-0" />
                            {f}
                          </div>
                        ))}
                        {plan.features.length > 4 && (
                          <p className="text-xs text-[#9A9A9A] pl-3.5">
                            +{plan.features.length - 4} more...
                          </p>
                        )}
                      </div>
                    )}
                    <Separator className="my-3" />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'flex-1 text-xs h-8 border-[#E5E7EB] hover:border-[#D4A373] hover:text-[#D4A373]',
                          !plan.isActive && 'opacity-50',
                        )}
                        disabled={!plan.isActive}
                      >
                        <Settings className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'flex-1 text-xs h-8 border-[#E5E7EB]',
                          plan.isActive
                            ? 'hover:border-[#DC2626] hover:text-[#DC2626]'
                            : 'hover:border-[#2D6A4F] hover:text-[#2D6A4F]',
                        )}
                        onClick={() => togglePlanStatus(plan.id, plan.isActive)}
                      >
                        {plan.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderAgentDetail = () => {
    if (!selectedAgent) return null;
    const a = selectedAgent;

    return (
      <Dialog open={agentDetailOpen} onOpenChange={setAgentDetailOpen}>
        <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto tower-scroll">
          <DialogHeader>
            <DialogTitle className="text-[#1B4332] text-lg">Agent Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Agent branding header */}
            <div className="flex items-center gap-4">
              <Avatar
                className="w-14 h-14"
                style={{ backgroundColor: a.primaryColor || '#1B4332' }}
              >
                <AvatarFallback className="text-white text-lg font-bold">
                  {getInitials(a.businessName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-[#1B4332] truncate">{a.businessName}</h3>
                <p className="text-sm text-[#6B7280]">{a.displayName}</p>
                <p className="text-xs text-[#9A9A9A] flex items-center gap-1 mt-0.5">
                  <Globe className="w-3 h-3" />
                  {a.city}
                </p>
              </div>
              <Badge
                className={cn(
                  'text-[10px] font-semibold px-2.5 py-1 rounded-full border-0 shrink-0',
                  a.status === 'active' ? 'bg-[#ECFDF5] text-[#2D6A4F]' : 'bg-[#FEF2F2] text-[#DC2626]',
                )}
              >
                {a.status === 'active' ? 'Active' : 'Suspended'}
              </Badge>
            </div>

            {/* Branding colors */}
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                Visual Identity
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg border border-[#E5E7EB] shadow-sm"
                    style={{ backgroundColor: a.primaryColor || '#1B4332' }}
                  />
                  <span className="text-xs text-[#6B7280]">Primary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg border border-[#E5E7EB] shadow-sm"
                    style={{ backgroundColor: a.accentColor || '#D4A373' }}
                  />
                  <span className="text-xs text-[#6B7280]">Accent</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact info */}
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                Contact Information
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#9A9A9A] w-16">Email:</span>
                  <span className="text-[#374151] truncate">{a.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#9A9A9A] w-16">Phone:</span>
                  <span className="text-[#374151]">{a.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#9A9A9A] w-16">Slug:</span>
                  <span className="text-[#374151] font-mono text-xs">{a.slug}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#9A9A9A] w-16">Commission:</span>
                  <span className="text-[#374151]">{a.commissionRate}%</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#9A9A9A] w-16">Since:</span>
                  <span className="text-[#374151]">
                    {new Date(a.createdAt).toLocaleDateString('en-TT', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Stats summary */}
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                Statistics Summary
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Properties', value: a._count.properties, icon: Home, color: '#2D6A4F' },
                  { label: 'Clients', value: a._count.clients, icon: Users, color: '#1B4332' },
                  { label: 'Deals', value: a._count.deals, icon: TrendingUp, color: '#D4A373' },
                  { label: 'Visitors', value: a._count.visitorEvents, icon: Eye, color: '#6B7280' },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="bg-[#F9FAFB] rounded-xl p-3 flex items-center gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${stat.color}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: stat.color }} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[#1B4332]">{stat.value}</p>
                        <p className="text-[10px] text-[#9A9A9A] uppercase tracking-wide">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan info */}
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                Current Plan
              </p>
              <div className="bg-[#F9FAFB] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FFF7ED] flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#D4A373]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#374151]">
                      {a.subscription?.plan?.name || 'No plan'}
                    </p>
                    <p className="text-xs text-[#9A9A9A]">
                      {a.subscription?.plan?.price
                        ? formatCurrency(a.subscription.plan.price) + '/mo'
                        : 'Free'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Quick actions */}
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                Quick Actions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className={cn(
                    'flex-1 h-10 border-[#E5E7EB] text-sm',
                    a.status === 'active'
                      ? 'hover:border-[#DC2626] hover:text-[#DC2626] hover:bg-[#FEF2F2]'
                      : 'hover:border-[#2D6A4F] hover:text-[#2D6A4F] hover:bg-[#ECFDF5]',
                  )}
                  onClick={() => toggleAgentStatus(a.id, a.status)}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {a.status === 'active' ? 'Suspend' : 'Activate'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-10 border-[#E5E7EB] hover:border-[#D4A373] hover:text-[#D4A373] text-sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Change Plan
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Mobile tabbed content ────────────────────────────────────────

  const renderMobileContent = () => (
    <div className="md:hidden">
      <Tabs value={mobileTab} onValueChange={setMobileTab}>
        <TabsList className="w-full bg-[#F3F4F6] rounded-xl h-10 p-1">
          <TabsTrigger
            value="overview"
            className="flex-1 text-xs font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1B4332] data-[state=active]:shadow-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="agents"
            className="flex-1 text-xs font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1B4332] data-[state=active]:shadow-sm"
          >
            Agents
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="flex-1 text-xs font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1B4332] data-[state=active]:shadow-sm"
          >
            Activity
          </TabsTrigger>
          <TabsTrigger
            value="plans"
            className="flex-1 text-xs font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1B4332] data-[state=active]:shadow-sm"
          >
            Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {renderKPIs()}
          <div className="space-y-4">
            {renderTopPerformers()}
          </div>
        </TabsContent>

        <TabsContent value="agents" className="mt-4">
          {renderAgentsTable()}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          {renderRecentActivity()}
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          {renderPlansSection()}
        </TabsContent>
      </Tabs>
    </div>
  );

  // ── Desktop content ──────────────────────────────────────────────

  const renderDesktopContent = () => (
    <div className="hidden md:block">
      {/* Section 2: KPIs */}
      <div className="mb-6">{renderKPIs()}</div>

      {/* Section 3: Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">{renderAgentsTable()}</div>
        <div className="space-y-4">
          {renderTopPerformers()}
          {renderRecentActivity()}
        </div>
      </div>

      {/* Section 4: Plans */}
      {renderPlansSection()}
    </div>
  );

  // ── Main Render ──────────────────────────────────────────────────

  if (loading) return renderSkeletons();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDFBF7' }}>
      <style>{scrollbarStyles}</style>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* ── Section 1: Header Bar ──────────────────────────── */}
        <motion.header
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-[#1B4332] tracking-tight">
                  Control Tower
                </h1>
                <p className="text-xs text-[#9A9A9A] hidden sm:block">
                  PROPOS Admin Panel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-[#F3F4F6]">
                <div className="w-8 h-8 rounded-lg bg-[#1B4332] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1B4332] leading-tight">
                    Administrator
                  </p>
                  <p className="text-[10px] text-[#9A9A9A] leading-tight">Owner</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-[#6B7280] hover:text-[#1B4332] hover:bg-[#F3F4F6] h-9"
              >
                <ArrowUpRight className="w-4 h-4 mr-1 rotate-[-90deg]" />
                <span className="hidden sm:inline text-xs">Back</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-[#DC2626] hover:text-[#DC2626] hover:bg-[#FEF2F2] h-9"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline text-xs">Log out</span>
              </Button>
            </div>
          </div>

          {/* Search bar below header */}
          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A]" />
            <Input
              placeholder="Search agent by name, email, or city..."
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              className="pl-10 h-10 bg-white border-[#E5E7EB] shadow-sm text-sm focus:border-[#D4A373] focus:ring-[#D4A373]/20"
            />
          </div>
        </motion.header>

        {/* ── Content sections ──────────────────────────────── */}
        {renderMobileContent()}
        {renderDesktopContent()}
      </main>

      {/* ── Section 5: Agent Detail Dialog ──────────────────── */}
      {renderAgentDetail()}
    </div>
  );
}
