'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, FileText, Search, User } from 'lucide-react';

interface MemberInfo {
  memberName: string;
  phone: string;
}

interface PlanInfo {
  name: string;
  durationDays: number;
}

interface InvoiceInfo {
  invoiceNumber: string;
}

interface Transaction {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  createdAt: string;
  member: MemberInfo | null;
  plan: PlanInfo | null;
  invoice: InvoiceInfo | null;
  paymentDetails?: { rejectReason?: string } | null;
}

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dashboard/payments`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      } else {
        setError('Failed to fetch transactions');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred while fetching transactions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAction = async (transactionId: string, action: 'APPROVE' | 'REJECT') => {
    setIsProcessing(transactionId);
    setError('');
    let reason = '';
    
    if (action === 'REJECT') {
      const userReason = prompt('Enter a reason for rejection (optional):');
      if (userReason === null) {
        setIsProcessing(null);
        return; // User cancelled
      }
      reason = userReason;
    }

    try {
      const res = await fetch(`/api/dashboard/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, action, reason }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await fetchTransactions(); // Refresh the list
      } else {
        setError(data.error || `Failed to ${action.toLowerCase()} transaction.`);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = txn.member?.memberName?.toLowerCase() || '';
    const phone = txn.member?.phone || '';
    const id = txn.id.toLowerCase();
    const invoice = txn.invoice?.invoiceNumber?.toLowerCase() || '';
    
    return name.includes(q) || phone.includes(q) || id.includes(q) || invoice.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">Payments & Transactions</h2>
          <p className="text-xs text-zinc-500 mt-1">Review, approve, and track member payments and active invoices.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex items-center gap-4 bg-zinc-950/40 p-3 rounded-2xl border border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by member name, phone, or invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Transactions Table/List */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden backdrop-blur-md">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-xs text-zinc-500">
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-zinc-500">
            <CreditCard className="h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-sm font-semibold">No transactions found</p>
            <p className="text-xs mt-1">When members purchase plans, their payments will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/50 text-zinc-400 uppercase tracking-wider text-[10px] font-bold border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Member</th>
                  <th className="px-6 py-4">Plan Details</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status & Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-cyan-950/40 flex items-center justify-center border border-cyan-900/30 text-cyan-500">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-zinc-100">{txn.member?.memberName || 'Unknown Member'}</div>
                          <div className="text-[10px] text-zinc-500">{txn.member?.phone || 'No phone'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-200">{txn.plan?.name || 'Unknown Plan'}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {txn.plan?.durationDays || 0} Days
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-zinc-100 text-sm">₹{txn.amount}</div>
                      {txn.invoice?.invoiceNumber && (
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5" title="Invoice Number">
                          <FileText className="h-3 w-3" /> {txn.invoice.invoiceNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="mb-1">
                        {txn.status === 'PAID' && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="h-3 w-3" /> PAID
                          </span>
                        )}
                        {txn.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                            <XCircle className="h-3 w-3" /> REJECTED
                          </span>
                        )}
                        {txn.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" /> PENDING
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {new Date(txn.createdAt).toLocaleString('en-IN')}
                      </div>
                      {txn.paymentDetails?.rejectReason && (
                        <div className="text-[9px] text-rose-500 mt-1 max-w-[150px] truncate" title={txn.paymentDetails.rejectReason}>
                          Reason: {txn.paymentDetails.rejectReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {txn.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(txn.id, 'APPROVE')}
                            disabled={isProcessing === txn.id}
                            className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/20"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(txn.id, 'REJECT')}
                            disabled={isProcessing === txn.id}
                            className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-rose-500/20"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-zinc-600">No actions available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
