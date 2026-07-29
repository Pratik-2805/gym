'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CreditCard, Trash2, Plus, Clock, Activity, Search, Edit } from 'lucide-react';

interface MembershipInfo {
  id: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  member: {
    id: string;
    name: string;
    phone: string;
  };
}

interface PlanData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  memberships?: MembershipInfo[];
}

export default function PlansPage() {
  
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);
  const [viewingPlan, setViewingPlan] = useState<PlanData | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState('30');

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/plans`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const resetForm = () => {
    setIsAdding(false);
    setEditingPlan(null);
    setViewingPlan(null);
    setShowTemplatePreview(false);
    setName('');
    setDescription('');
    setPrice('');
    setDurationDays('30');
    setError('');
  };

  const startAdding = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleSelectPlan = (p: PlanData) => {
    setEditingPlan(p);
    setViewingPlan(null);
    setIsAdding(false);
    setName(p.name);
    setDescription(p.description || '');
    setPrice(p.price.toString());
    setDurationDays(p.durationDays.toString());
    setError('');
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`/api/dashboard/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          price: parseFloat(price),
          durationDays: parseInt(durationDays),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        resetForm();
        await fetchPlans();
      } else {
        setError(data.error || 'Failed to create plan.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    }
  };

  const handleUpdatePlan = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!editingPlan) return;

    const newPrice = parseFloat(price);
    const activeMembersCount = editingPlan.memberships?.length || 0;

    if (!showTemplatePreview && newPrice !== editingPlan.price && activeMembersCount > 0) {
      setShowTemplatePreview(true);
      return;
    }

    setError('');

    try {
      const res = await fetch(`/api/dashboard/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          price: parseFloat(price),
          durationDays: parseInt(durationDays),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        resetForm();
        await fetchPlans();
      } else {
        setError(data.error || 'Failed to update plan.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    }
  };

  const handleDeletePlan = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation(); // Prevent card selection on delete click
    if (!confirm('Are you sure you want to delete this membership plan? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/dashboard/plans/${planId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (editingPlan?.id === planId) {
          resetForm();
        }
        await fetchPlans();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">Membership Plans</h2>
          <p className="text-xs text-zinc-500 mt-1">Configure durations, pricing models, and benefits for your gym members.</p>
        </div>
        <button
          onClick={startAdding}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-cyan-500"
        >
          <Plus className="h-4 w-4" /> Create New Plan
        </button>
      </div>

      {/* Plans Layout Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-xs text-zinc-500 bg-zinc-950/40 rounded-2xl border border-zinc-800 xl:col-span-4">
            Loading plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-zinc-500 bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-800 xl:col-span-4">
            <CreditCard className="h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-sm font-semibold">No subscription plans found</p>
            <button
              onClick={startAdding}
              className="mt-2 text-xs font-bold text-cyan-400 hover:underline"
            >
              Create your first plan now
            </button>
          </div>
        ) : (
          <>
            {plans.map((p) => {
              const isSelected = editingPlan?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setViewingPlan(p);
                    setMemberSearchQuery('');
                  }}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border p-6 backdrop-blur-md transition-all cursor-pointer hover:bg-zinc-900/40 active:scale-[0.98] ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/30'
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">{p.name}</h3>
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-zinc-500">
                        <Clock className="h-3 w-3 text-cyan-400" /> {p.durationDays} Days Duration
                      </div>
                    </div>
                    
                    {/* Delete Plan */}
                    <button
                      onClick={(e) => handleDeletePlan(e, p.id)}
                      className="rounded-lg p-1.5 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
                      title="Delete Plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-extrabold text-zinc-100">₹{p.price}</span>
                    <span className="text-[10px] text-zinc-500 ml-1 font-medium">net price</span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed min-h-[40px]">
                    {p.description || 'Gives full access to all generic weights, cardio zones & trainers.'}
                  </p>

                  {p.memberships && p.memberships.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-bold text-zinc-400">
                      <span>{p.memberships.length} Active Member{p.memberships.length !== 1 ? 's' : ''}</span>
                      <span className="text-cyan-500 group-hover:underline">View details &rarr;</span>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-bold text-zinc-600">
                      <span>No active members</span>
                    </div>
                  )}
                </div>
              );
            })}
            
          </>
        )}
      </div>

      {/* View Plan Modal */}
      {viewingPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={() => setViewingPlan(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">{viewingPlan.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-extrabold text-cyan-400">₹{viewingPlan.price}</span>
                  <span className="text-xs text-zinc-500">for {viewingPlan.durationDays} days</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => setViewingPlan(null)}
                  className="text-zinc-400 hover:text-zinc-100 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => handleSelectPlan(viewingPlan)}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-100 hover:bg-zinc-700 transition-all"
                >
                  <Edit className="h-4 w-4" /> Edit Plan
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search members by name or phone..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none w-full"
              />
            </div>

            <div className="text-[11px] font-bold text-zinc-400 mb-2">
              Total Members: {viewingPlan.memberships?.length || 0}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {(() => {
                const filtered = (viewingPlan.memberships || []).filter(sub => {
                  if (!memberSearchQuery) return true;
                  const q = memberSearchQuery.toLowerCase();
                  return sub.member.name.toLowerCase().includes(q) || sub.member.phone.includes(q);
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-6 text-xs text-zinc-600">
                      No members match your search.
                    </div>
                  );
                }

                return filtered.map((sub) => (
                  <div key={sub.id} className="flex justify-between items-center bg-zinc-900/40 rounded-xl p-3 border border-zinc-800/50">
                    <div>
                      <div className="font-bold text-zinc-200 text-xs">{sub.member.name}</div>
                      <div className="text-zinc-500 font-mono text-[10px] mt-0.5">{sub.member.phone}</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="text-zinc-400 font-medium text-[10px]">
                        {new Date(sub.startDate).toLocaleDateString('en-IN')} - {new Date(sub.endDate).toLocaleDateString('en-IN')}
                      </div>
                      <span className={`inline-block px-1.5 py-0.5 rounded font-semibold tracking-wider text-[8px] uppercase ${
                        sub.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Plan Modal */}
      {(isAdding || editingPlan) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={resetForm}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-cyan-800 bg-zinc-950 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-2">
              <h3 className="text-lg font-bold text-zinc-100">
                {editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
              </h3>
              <button
                onClick={resetForm}
                className="text-zinc-400 hover:text-zinc-100 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            
            {error && (
              <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
                {error}
              </div>
            )}

            {showTemplatePreview && editingPlan ? (
              <div className="space-y-4 text-xs">
                <div className="bg-cyan-950/20 border border-cyan-800/50 rounded-xl p-4">
                  <p className="text-zinc-300 mb-2">You are changing the price from <strong className="text-white">₹{editingPlan.price}</strong> to <strong className="text-white">₹{price}</strong>.</p>
                  <p className="text-zinc-300 mb-4">This will automatically send the following WhatsApp message to <strong className="text-white">{editingPlan.memberships?.length || 0} active member{(editingPlan.memberships?.length || 0) !== 1 ? 's' : ''}</strong>:</p>
                  
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-zinc-400 leading-relaxed shadow-inner">
                    "Hi [Member Name], this is an update regarding your gym membership. The price for the {name} plan has been updated to ₹{price}. Please contact the front desk if you have any questions."
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={(e) => handleUpdatePlan(e)}
                    className="flex-1 rounded-xl bg-cyan-600 py-3 font-bold text-white hover:bg-cyan-500 transition-all"
                  >
                    Confirm & Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTemplatePreview(false)}
                    className="flex-1 rounded-xl border border-zinc-800 py-3 font-bold text-zinc-400 hover:bg-zinc-850 transition-all"
                  >
                    Back to Edit
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={editingPlan ? handleUpdatePlan : handleAddPlan} className="space-y-4 text-xs">
                <div>
                  <label className="mb-2 block font-semibold text-zinc-400 uppercase tracking-wider">Plan Name</label>
                  <input
                    type="text"
                    placeholder="e.g. 6 Months Premium"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block font-semibold text-zinc-400 uppercase tracking-wider">Price (₹ INR)</label>
                    <input
                      type="number"
                      placeholder="2999"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-semibold text-zinc-400 uppercase tracking-wider">Duration (Days)</label>
                    <select
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="30">30 Days (Monthly)</option>
                      <option value="90">90 Days (Quarterly)</option>
                      <option value="180">180 Days (Half-Yearly)</option>
                      <option value="365">365 Days (Annual)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-semibold text-zinc-400 uppercase tracking-wider">Plan Description</label>
                  <textarea
                    placeholder="List gym perks, timing access or trainer allowances..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-cyan-600 py-3 font-bold text-white hover:bg-cyan-500"
                  >
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-xl border border-zinc-800 py-3 font-bold text-zinc-400 hover:bg-zinc-850"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
