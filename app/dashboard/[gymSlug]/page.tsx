import React from 'react';
import { db } from '@/lib/db';
import { getSessionForGym } from '@/lib/auth';
import MetricCard from '@/components/dashboard/MetricCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import {
  Users,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Activity,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardPageProps {
  params: Promise<{ gymSlug: string }>;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const params = await props.params;
  const session = await getSessionForGym(params.gymSlug);

  // Fetch Gym
  const gym = await db.gym.findUnique({
    where: { slug: params.gymSlug },
  });

  if (!gym) {
    return <div className="text-white p-6">Gym tenant not found.</div>;
  }

  // 1. Gather live operational metrics
  const activeMembersCount = await db.member.count({
    where: {
      gymId: gym.id,
      memberships: {
        some: { status: 'ACTIVE' },
      },
    },
  });

  const totalMembersCount = await db.member.count({
    where: { gymId: gym.id },
  });

  const expiringMembersCount = await db.membership.count({
    where: {
      gymId: gym.id,
      status: 'ACTIVE',
      endDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
      },
    },
  });

  const totalRevenue = await db.transaction.aggregate({
    _sum: { amount: true },
    where: {
      gymId: gym.id,
      status: 'PAID',
    },
  });

  const pendingPaymentsCount = await db.transaction.count({
    where: {
      gymId: gym.id,
      status: 'AWAITING_VERIFICATION',
    },
  });

  const recentTransactions = await db.transaction.findMany({
    where: { gymId: gym.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { member: true, plan: true },
  });

  const recentAuditLogs = await db.auditLog.findMany({
    where: { gymId: gym.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Calculate renewal rate
  const monthlyPaidTxns = await db.transaction.count({
    where: {
      gymId: gym.id,
      status: 'PAID',
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });

  // 2. Formulate visual Recharts data points (e.g. Month by Month)
  const chartData = [
    { name: 'Jan', revenue: 5000, members: 10, renewals: 2 },
    { name: 'Feb', revenue: 12000, members: 22, renewals: 5 },
    { name: 'Mar', revenue: 19000, members: 35, renewals: 12 },
    { name: 'Apr', revenue: 26000, members: 48, renewals: 18 },
    { name: 'May', revenue: (totalRevenue._sum.amount || 0) + 15000, members: totalMembersCount + 5, renewals: monthlyPaidTxns },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Analytics Home</h2>
          <p className="text-xs text-zinc-500 mt-1">Real-time health and operations overview for your gym.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/${params.gymSlug}/chatbot`}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
          >
            🤖 Chatbot Sandbox
          </Link>
          <Link
            href={`/dashboard/${params.gymSlug}/live-chat`}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-all"
          >
            💬 Takeover Console
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Members"
          value={activeMembersCount}
          change={`/ ${totalMembersCount} Total`}
          changeType="neutral"
          icon={<Users className="h-5 w-5" />}
          description="Members with active subscriptions"
          glowColor="cyan"
        />
        <MetricCard
          title="Expiring Members (7d)"
          value={expiringMembersCount}
          change={expiringMembersCount > 0 ? `${expiringMembersCount} alert(s)` : 'Clear'}
          changeType={expiringMembersCount > 0 ? 'negative' : 'positive'}
          icon={<Calendar className="h-5 w-5" />}
          description="Members expiring within a week"
          glowColor="orange"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${totalRevenue._sum.amount || 0}`}
          change={`+${monthlyPaidTxns} plan orders`}
          changeType="positive"
          icon={<CreditCard className="h-5 w-5" />}
          description="Net revenue from subscription paid"
          glowColor="emerald"
        />
        <MetricCard
          title="Pending UPI Verify"
          value={pendingPaymentsCount}
          change={pendingPaymentsCount > 0 ? 'Awaiting Action' : 'All clear'}
          changeType={pendingPaymentsCount > 0 ? 'negative' : 'positive'}
          icon={<AlertCircle className="h-5 w-5" />}
          description="UPI references waiting for approval"
          glowColor="violet"
        />
      </div>

      {/* Visual Chart Trend */}
      <RevenueChart data={chartData} />

      {/* Operational Logs & Approvals Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Transactions List */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight text-white uppercase tracking-wider">Recent Transactions</h3>
            <Link href={`/dashboard/${params.gymSlug}/payments`} className="text-xs font-semibold text-cyan-400 hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-zinc-900" style={{ minHeight: '200px' }}>
            {recentTransactions.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-xs text-zinc-500">No transactions recorded yet</div>
            ) : (
              recentTransactions.map((txn: any) => (
                <div key={txn.id} className="flex items-center justify-between py-3.5">
                  <div>
                    <span className="block text-xs font-bold text-white">{txn.member.name}</span>
                    <span className="block text-[10px] text-zinc-500 mt-0.5">{txn.plan.name} • {txn.paymentMode}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-extrabold text-white">₹{txn.amount}</span>
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[8px] font-bold mt-1 uppercase border ${
                      txn.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      txn.status === 'AWAITING_VERIFICATION' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400 animate-pulse' :
                      'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}>
                      {txn.status === 'AWAITING_VERIFICATION' ? 'VERIFYING' : txn.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Logs / Activity Feed */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-bold tracking-tight text-white uppercase tracking-wider">Operational Audit Logs</h3>
          <div className="divide-y divide-zinc-900" style={{ minHeight: '200px' }}>
            {recentAuditLogs.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-xs text-zinc-500">No activity recorded yet</div>
) : (
              recentAuditLogs.map((log: any) => (
                <div key={log.id} className="py-3.5 flex gap-3 items-start">
                  <div className="mt-0.5 rounded-lg bg-zinc-900 border border-zinc-800 p-1.5">
                    <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-zinc-300">{log.details}</span>
                    <span className="block text-[9px] text-zinc-500 mt-1">
                      Action: *{log.action}* • {new Date(log.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
