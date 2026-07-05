'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import {
  Users,
  UserCheck,
  Clock,
  UserMinus,
  CreditCard,
  TrendingUp,
  Plus,
  ArrowRight,
  Bot,
  Settings,
  ShieldCheck,
  ChevronRight,
  DollarSign,
  Fingerprint,
  X
} from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';
import ThreeDashboardAnimation from '@/components/dashboard/ThreeDashboardAnimation';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface MemberAnalyticsItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'NONE';
  activePlanName: string | null;
}

interface SummaryStats {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  noPlanMembers: number;
  conversionRate: number;
  totalRevenue: number;
}

interface TrendPoint {
  name: string;
  revenue: number;
  members: number;
}

interface PlanPopularity {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  totalSubscribers: number;
  activeSubscribers: number;
  revenue: number;
}

interface PaymentModeDistribution {
  mode: 'MANUAL_UPI' | 'RAZORPAY';
  count: number;
  revenue: number;
}

export default function DashboardPage() {
  const { gymSlug } = useParams() as { gymSlug: string };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [showPasskeyBanner, setShowPasskeyBanner] = useState(false);
  
  // States for API response
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanPopularity[]>([]);
  const [paymentDistribution, setPaymentDistribution] = useState<PaymentModeDistribution[]>([]);
  const [membersList, setMembersList] = useState<MemberAnalyticsItem[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dashboard/${gymSlug}/analytics`);
      if (!res.ok) {
        throw new Error('Failed to load dashboard data.');
      }
      const data = await res.json();
      setSummary(data.summary);
      setTrends(data.trends || []);
      setPlanDistribution(data.planDistribution || []);
      setPaymentDistribution(data.paymentDistribution || []);
      setMembersList(data.membersList || []);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchDashboardData();

    // Check if dismissed in localStorage
    const dismissed = localStorage.getItem('dismiss_passkey_prompt');
    if (!dismissed) {
      fetch('/api/auth/webauthn/credentials', { credentials: 'same-origin' })
        .then((res) => {
          if (res.ok) return res.json();
          return [];
        })
        .then((data) => {
          if (Array.isArray(data) && data.length === 0) {
            setShowPasskeyBanner(true);
          }
        })
        .catch((err) => console.error('Error fetching credentials for banner:', err));
    }
  }, [gymSlug]);

  const handleDismissBanner = () => {
    localStorage.setItem('dismiss_passkey_prompt', 'true');
    setShowPasskeyBanner(false);
  };

  const handleEnablePasskey = async () => {
    try {
      const optionsRes = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });
      if (!optionsRes.ok) throw new Error('Failed to get options');
      const options = await optionsRes.json();

      const attestation = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestation),
        credentials: 'same-origin',
      });
      if (!verifyRes.ok) throw new Error('Verification failed');

      // Success — hide the banner permanently
      localStorage.setItem('dismiss_passkey_prompt', 'true');
      setShowPasskeyBanner(false);
    } catch (err: any) {
      // User cancelled or error — just dismiss silently
      console.warn('Passkey banner registration skipped:', err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500" />
        <p className="text-sm font-semibold text-zinc-400">Loading your workspace dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-rose-500/10 p-4 border border-rose-500/20 text-rose-400">
          <Clock className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-white">Dashboard failed to load</h3>
        <p className="text-xs text-zinc-500 max-w-[280px] leading-relaxed">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Get recent 5 signups
  const recentSignups = membersList.slice(0, 5);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">Workspace Dashboard</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time operations summary, key membership highlights, and growth metrics.
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="self-start rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white transition-all"
        >
          Refresh Data
        </button>
      </div>

      {showPasskeyBanner && (
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 to-violet-950/30 p-4 sm:p-5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-cyan-500/30">
          <div className="absolute top-2 right-2">
            <button
              onClick={handleDismissBanner}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Dismiss prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-3.5 pr-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Fingerprint className="h-6 w-6 animate-pulse text-cyan-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Secure Your Workspace Account</h4>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Enable 1-tap **Face ID, Touch ID, or Windows Hello** to log in securely next time without entering passwords.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleEnablePasskey}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          >
            Enable Passkey <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {summary && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            title="Total Members"
            value={summary.totalMembers}
            icon={<Users className="h-4 w-4" />}
            glowColor="cyan"
            description="All time registered users"
          />
          <MetricCard
            title="Active Plan"
            value={summary.activeMembers}
            icon={<UserCheck className="h-4 w-4" />}
            glowColor="emerald"
            description={`${Math.round((summary.activeMembers / (summary.totalMembers || 1)) * 100)}% of total users`}
          />
          <MetricCard
            title="Expired Plan"
            value={summary.expiredMembers}
            icon={<Clock className="h-4 w-4" />}
            glowColor="orange"
            description="Inactive subscriptions"
          />
          <MetricCard
            title="Unsubscribed Leads"
            value={summary.noPlanMembers}
            icon={<UserMinus className="h-4 w-4" />}
            glowColor="violet"
            description="Registered without plan"
          />
          <MetricCard
            title="Total Revenue"
            value={`₹${summary.totalRevenue.toLocaleString('en-IN')}`}
            icon={<CreditCard className="h-4 w-4" />}
            glowColor="cyan"
            description="Paid transaction amounts"
          />
          <MetricCard
            title="Conversion Rate"
            value={`${summary.conversionRate}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            glowColor="emerald"
            description="Members subscribed to plans"
          />
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Side Section (Spans 2 columns) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Minimalist Revenue Area Chart */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-md">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Monthly Revenue Trend</h3>
                <p className="text-xs text-zinc-500">6-Month financial development</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-cyan-500/10">
                <DollarSign className="h-3 w-3" />
                <span>Revenue (₹)</span>
              </div>
            </div>

            <div className="h-72 w-full">
              {isMounted && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={288}>
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardRevenueGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                    <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                    <Tooltip
                      formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#09090b',
                        borderColor: '#27272a',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      labelClassName="font-bold text-zinc-400 mb-1"
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#dashboardRevenueGlow)" name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-600">No trend history available.</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Membership Plan Distribution */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight mb-1">Top Membership Plans</h3>
                <p className="text-xs text-zinc-500 mb-6">Distribution and count of active subscribers by plan</p>
              </div>

              <div className="space-y-4">
                {planDistribution.slice(0, 3).length > 0 ? (
                  planDistribution.slice(0, 3).map((plan) => {
                    const totalActive = summary?.activeMembers || 1;
                    const percentage = Math.round((plan.activeSubscribers / totalActive) * 100) || 0;

                    return (
                      <div key={plan.id} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-zinc-200 uppercase tracking-wide truncate max-w-[150px]">{plan.name}</span>
                          <span className="text-zinc-400">{plan.activeSubscribers} Active</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative h-2 flex-1 rounded-full bg-zinc-900 overflow-hidden border border-zinc-900">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                              style={{ width: `${Math.min(percentage || 1, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-cyan-400 w-8 text-right">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-zinc-500 border border-dashed border-zinc-900 rounded-xl">
                    No active membership plan distribution to display.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-md">
              <h3 className="text-base font-bold text-white tracking-tight mb-1">Quick Actions</h3>
              <p className="text-xs text-zinc-500 mb-5">Shortcuts to common operations</p>

              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={() => router.push(`/dashboard/${gymSlug}/members`)}
                  className="group flex flex-col justify-between p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/30 text-left transition-all hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:-translate-y-0.5"
                >
                  <Users className="h-4.5 w-4.5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="block text-xs font-bold text-zinc-200">Register</span>
                    <span className="text-[9px] font-medium text-zinc-500">Add member</span>
                  </div>
                </button>

                <button
                  onClick={() => router.push(`/dashboard/${gymSlug}/plans`)}
                  className="group flex flex-col justify-between p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/30 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:-translate-y-0.5"
                >
                  <Plus className="h-4.5 w-4.5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="block text-xs font-bold text-zinc-200">New Plan</span>
                    <span className="text-[9px] font-medium text-zinc-500">Configure rates</span>
                  </div>
                </button>

                <button
                  onClick={() => router.push(`/dashboard/${gymSlug}/payments`)}
                  className="group flex flex-col justify-between p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/30 text-left transition-all hover:border-orange-500/30 hover:bg-orange-500/5 hover:-translate-y-0.5"
                >
                  <CreditCard className="h-4.5 w-4.5 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="block text-xs font-bold text-zinc-200">Payments</span>
                    <span className="text-[9px] font-medium text-zinc-500">Collect dues</span>
                  </div>
                </button>

                <button
                  onClick={() => router.push(`/dashboard/${gymSlug}/chatbot`)}
                  className="group flex flex-col justify-between p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/30 text-left transition-all hover:border-violet-500/30 hover:bg-violet-500/5 hover:-translate-y-0.5"
                >
                  <Bot className="h-4.5 w-4.5 text-violet-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="block text-xs font-bold text-zinc-200">Chatbot</span>
                    <span className="text-[9px] font-medium text-zinc-500">Automate bot</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Section (Spans 1 column) */}
        <div className="space-y-8">
          
          {/* Live Check-in Widget with ThreeJS */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 backdrop-blur-md flex flex-col items-center">
            <div className="w-full text-left mb-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Check-in Terminal</h3>
              <p className="text-[11px] text-zinc-500">Interactive live WebSocket network state</p>
            </div>
            
            <div className="w-full bg-zinc-900/10 border border-zinc-900 rounded-xl p-3.5 relative overflow-hidden flex items-center justify-center">
              <ThreeDashboardAnimation />
            </div>
          </div>

          {/* Recent Signups Feed */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-md">
            <div className="mb-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Recent Signups</h3>
                <p className="text-xs text-zinc-500">Latest 5 members registered</p>
              </div>
              <button 
                onClick={() => router.push(`/dashboard/${gymSlug}/members`)}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 group transition-colors"
              >
                View All <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-4">
              {recentSignups.length > 0 ? (
                recentSignups.map((member) => {
                  const initials = member.name.substring(0, 2).toUpperCase() || 'M';
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-900/60 bg-zinc-950/40 hover:bg-zinc-900/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-800/40 text-cyan-400 font-extrabold text-xs shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-zinc-200 truncate max-w-[130px]">{member.name}</span>
                          <span className="block text-[10px] text-zinc-500 mt-0.5">{member.phone}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-bold tracking-wider text-[8px] uppercase border ${
                          member.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : member.status === 'EXPIRED'
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                          {member.status === 'NONE' ? 'No Plan' : member.status}
                        </span>
                        <span className="block text-[9px] text-zinc-500 font-medium mt-1">
                          {new Date(member.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-zinc-500 bg-zinc-900/20 rounded-xl border border-dashed border-zinc-900">
                  No registered members yet.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
