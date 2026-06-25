'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function RoiCalculator() {
  const [members, setMembers] = useState(250);
  const [fee, setFee] = useState(1500);

  const hoursSaved = Math.round(members * (10 / 60));
  const recoveryValue = Math.round(members * fee * 0.08);
  let softwareCost = 1999;
  if (members > 500) {
    softwareCost = 7999;
  } else if (members > 150) {
    softwareCost = 3999;
  }
  const netReturn = recoveryValue - softwareCost;

  return (
    <div className="roi-calculator-card neu-flat rounded-3xl p-6 md:p-10 max-w-4xl mx-auto transition-all">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-1">Calculate Your ROI</h3>
            <p className="text-sm text-slate-500">
              Adjust the sliders to estimate your savings & revenue boost.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-700">Active Members</span>
              <span className="text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {members} members
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="1000"
              step="10"
              value={members}
              onChange={(e) => setMembers(Number(e.target.value))}
              className="w-full h-2 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span>50</span>
              <span>500</span>
              <span>1,000</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-700">Avg. Monthly Fee</span>
              <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                ₹{fee.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              className="w-full h-2 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span>₹500</span>
              <span>₹2,500</span>
              <span>₹5,000</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Hours Saved /mo
              </span>
              <span className="text-2xl font-extrabold text-indigo-600">{hoursSaved}h</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Addl. Collection
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 font-sans">
                ₹{recoveryValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200/60">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span>FitFlow Monthly Cost</span>
              <span className="font-bold text-slate-700">
                ₹{softwareCost.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-slate-800">
              <span>Estimated Monthly Return</span>
              <span className="text-lg font-extrabold text-indigo-700 font-sans">
                {netReturn > 0
                  ? `+₹${netReturn.toLocaleString('en-IN')}`
                  : `₹${netReturn.toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>
          <Link
            href="/register"
            className="w-full text-center py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5 block"
          >
            Start Free Trial & Save Today
          </Link>
        </div>
      </div>
    </div>
  );
}
