'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import {
  Dumbbell, Bot, QrCode, Bell, ArrowRight, Check, Send, Phone, Settings,
  ChevronDown, Zap, ShieldCheck, Menu, X, MessageCircle, Users, BarChart3,
  Star, ChevronRight, CheckCircle2, TrendingUp, Globe, Headphones, Sparkles,
  Play, ArrowUpRight, Shield, Clock, Target, Layers,
} from 'lucide-react';

/* ─────────── Animation helpers ─────────── */
function FadeUp({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SlideIn({ children, className = '', delay = 0, from = 'left' }: { children: React.ReactNode; className?: string; delay?: number; from?: 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: from === 'left' ? -40 : 40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(e * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─────────── 3D Floating Phone (Demo section only) ─────────── */
function FloatingPhone3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [rot, setRot] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setRot({
        x: ((e.clientY - cy) / rect.height) * -12,
        y: ((e.clientX - cx) / rect.width) * 12,
      });
    };
    const onLeave = () => setRot({ x: 0, y: 0 });
    if (parent) { parent.addEventListener('mousemove', onMove); parent.addEventListener('mouseleave', onLeave); }
    return () => { if (parent) { parent.removeEventListener('mousemove', onMove); parent.removeEventListener('mouseleave', onLeave); } };
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-3">
      <motion.div
        animate={{ rotateX: rot.x, rotateY: rot.y, y: [0, -8, 0] }}
        transition={{
          rotateX: { type: 'spring', stiffness: 180, damping: 22 },
          rotateY: { type: 'spring', stiffness: 180, damping: 22 },
          y: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
        }}
        style={{ transformStyle: 'preserve-3d', perspective: 900 }}
      >
        {/* Glow shadow */}
        <div className="absolute -inset-3 bg-gradient-to-b from-indigo-200/40 via-violet-200/20 to-transparent rounded-[48px] blur-2xl" />
        {/* Phone body */}
        <div className="relative w-[190px] bg-gradient-to-b from-slate-700 to-slate-900 rounded-[36px] p-2.5 shadow-2xl shadow-slate-900/20 border border-white/20">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 h-5 w-20 bg-slate-900 rounded-full z-20" />
          <div className="bg-gradient-to-b from-[#1a5a30] to-[#16803d] rounded-[28px] overflow-hidden h-[320px]">
            <div className="bg-[#0d5c2e] px-3 py-2 pt-7 flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold text-white">FF</div>
              <div>
                <p className="text-[8px] font-bold text-white">FitFlow Gym</p>
                <p className="text-[7px] text-emerald-300">online</p>
              </div>
              <Phone className="h-2.5 w-2.5 text-white/60 ml-auto" />
            </div>
            <div className="px-2 py-2 space-y-1.5 bg-[#ECE5DD] h-[260px]">
              {[
                { text: 'Welcome to FitFlow! 🏋️', mine: false },
                { text: '1️⃣ My Membership\n2️⃣ Renew Plan\n3️⃣ View Plans', mine: false },
                { text: '1', mine: true },
                { text: '👤 Alex Mercer\n📅 5 days left', mine: false },
              ].map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: b.mine ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.18 }}
                  className={`flex ${b.mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-2 py-1 text-[7px] leading-snug shadow-sm whitespace-pre-line ${b.mine ? 'bg-[#DCF8C6] text-slate-800 rounded-tr-sm' : 'bg-white text-slate-800 rounded-tl-sm'}`}>
                    {b.text}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2/3 h-3 bg-slate-900/20 blur-xl rounded-full" />
      </motion.div>

      <div className="text-center mt-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">INTERACTIVE 3D</p>
        <p className="text-[10px] text-slate-400">Floating Preview</p>
      </div>
    </div>
  );
}

/* ─────────── Gradient Orb ─────────── */
function GlowOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full pointer-events-none ${className}`} />;
}

/* ─────────── types ─────────── */
interface ChatMessage { id: string; type: 'INBOUND' | 'CHATBOT'; message: string; time: string; }

/* ═══════════════════════════════════════════════════════
   MAIN PAGE — PREMIUM LIGHT MODE
   ═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* WhatsApp Simulator */
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { id: 'w0', type: 'CHATBOT', message: 'Welcome to FitFlow Gym! 🏋️\n\n1️⃣ My Membership\n2️⃣ Renew Plan\n3️⃣ View Plans\n4️⃣ Contact Gym\n\nReply with a number.', time: '3:49 PM' },
  ]);
  const [simInput, setSimInput] = useState('');
  const [typing, setTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  const fire = (txt: string) => {
    if (!txt.trim() || typing) return;
    setMsgs(p => [...p, { id: `u${Date.now()}`, type: 'INBOUND', message: txt, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setSimInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const n = txt.trim().toLowerCase();
      let r = '';
      if (n === '1') r = '👤 *Alex Mercer*\n📅 Expiring Soon — 5 days left\n🏷️ Platinum Plus (3 Months)\n📅 Valid Till: 30 Jun 2026\n\nReply *2* to renew early!';
      else if (n === '2') r = '🔄 *Renew Membership*\n\n• *P1* — Gold (1M) ₹1,499\n• *P2* — Platinum (3M) ₹3,999\n• *P3* — VIP Club (12M) ₹12,999\n\nReply with a plan code.';
      else if (n === '3') r = '📋 *Plans*\n\n🥇 Gold — ₹1,499/mo\n🏆 Platinum — ₹3,999/3mo\n👑 VIP Club — ₹12,999/yr\n\nReply with plan code to buy!';
      else if (n === '4') r = '📞 *Contact*\n📍 42 Fitness Ave, Sector 5\n✉️ support@fitflow.app\n☎️ +91 98765 43210\n\nBot paused — a staff member will reply.';
      else if (n.startsWith('p')) r = '💳 *Payment Link Generated!*\nAmount: ₹3,999\n\nScan UPI QR or click the Razorpay link sent to your phone.\n\nAfter payment reply:\n*PAID <txn-id>*';
      else if (n.startsWith('paid')) r = '✅ *Payment Verified!*\n⚡ Plan extended 90 days.\nNew expiry: 28 Sep 2026\n\nThank you! Flex on 💪🔥';
      else r = 'I didn\'t catch that.\n\n1️⃣ Membership\n2️⃣ Renew\n3️⃣ Plans\n4️⃣ Contact';
      setMsgs(p => [...p, { id: `b${Date.now()}`, type: 'CHATBOT', message: r, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }, 900);
  };

  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: 'How does the WhatsApp bot work?', a: 'Members text your gym\'s WhatsApp number. FitFlow auto-responds with membership info, renewal links, and UPI payment QR codes — no staff needed.' },
    { q: 'Do members need to install an app?', a: 'Nope! Everything happens inside WhatsApp, which your members already use daily. Zero friction.' },
    { q: 'How do payments work?', a: 'FitFlow generates dynamic UPI QR codes & Razorpay checkout links per member. Webhooks auto-confirm payment and extend memberships instantly.' },
    { q: 'What is Human Takeover?', a: 'One click pauses the bot for a specific member so your staff can chat with them directly through FitFlow\'s live inbox.' },
    { q: 'Can I customize alert schedules?', a: 'Yes — set alerts for 3 days before expiry, day-of, and post-expiry with personalized templates including member name, plan, and payment link.' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden">

      {/* ═══════════════════════════════
           NAVBAR
          ═══════════════════════════════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 backdrop-blur-2xl shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 select-none group">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
              <Dumbbell className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">Fit<span className="text-indigo-600">Flow</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
            {['Features', 'How It Works', 'Demo', 'Pricing', 'FAQ'].map(t => (
              <a key={t} href={`#${t.toLowerCase().replace(/\s+/g, '-')}`}
                className="hover:text-indigo-600 transition-colors relative group">
                {t}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 rounded-full group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-500 hover:text-slate-900 px-4 py-2 transition-colors">Log In</Link>
            <Link href="/register" className="text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5">
              Get Started Free
            </Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-slate-600">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="md:hidden overflow-hidden bg-white/98 backdrop-blur-2xl border-t border-slate-100">
              <nav className="flex flex-col gap-1 p-4 text-sm font-semibold text-slate-600">
                {['Features', 'How It Works', 'Demo', 'Pricing', 'FAQ'].map(t => (
                  <a key={t} href={`#${t.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 px-4 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">{t}</a>
                ))}
                <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col gap-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="py-2.5 text-center text-slate-600">Log In</Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="py-2.5 text-center text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl font-bold">Get Started Free</Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ═══════════════════════════════
           HERO
          ═══════════════════════════════ */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        {/* Subtle mesh background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:64px_64px] opacity-40" />
        <GlowOrb className="top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-indigo-100/60 to-violet-100/40 blur-3xl -translate-y-1/3 translate-x-1/4" />
        <GlowOrb className="bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-rose-100/30 to-orange-100/20 blur-3xl translate-y-1/4 -translate-x-1/4" />

        <div className="relative max-w-7xl mx-auto px-6 z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <span className="inline-flex items-center gap-2 bg-white text-indigo-700 text-xs font-bold px-4 py-2 rounded-full border border-indigo-100 shadow-md shadow-indigo-100/60 mb-8">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Now Live — WhatsApp Automation for Gyms
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              </span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
              className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.08] tracking-tight">
              <span className="text-slate-900">Your Gym,</span><br />
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Fully Automated</span><br />
              <span className="text-slate-900">via WhatsApp</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="mt-7 text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Members check status, renew plans & pay via UPI — all inside WhatsApp.
              You manage everything from one beautiful dashboard. No more chasing payments.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all">
                Start Free — No Card Required <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="#demo" className="group inline-flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 font-bold text-sm px-8 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
                <Play className="h-4 w-4 fill-current text-indigo-500" /> Try Live Demo
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="mt-10 flex items-center justify-center gap-6 flex-wrap">
              {[
                { icon: ShieldCheck, label: 'Razorpay Secured', color: 'text-emerald-600' },
                { icon: Zap, label: 'Setup in 10 min', color: 'text-amber-600' },
                { icon: Users, label: '500+ Gym Owners', color: 'text-indigo-600' },
              ].map((b, i) => (
                <div key={i} className={`flex items-center gap-1.5 text-xs font-semibold ${b.color}`}>
                  <b.icon className="h-4 w-4" /> {b.label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Hero Dashboard Card */}
          <motion.div initial={{ opacity: 0, y: 60, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.9, type: 'spring', stiffness: 40 }}
            className="mt-16 max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/[0.08] border border-slate-100 overflow-hidden ring-1 ring-slate-900/[0.03]">
              <div className="bg-slate-50/80 border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 bg-white rounded-lg border border-slate-200 px-4 py-1.5 text-xs text-slate-400 text-center font-medium">
                  fitflow.app/dashboard
                </div>
              </div>
              <div className="p-5 md:p-8 bg-gradient-to-br from-slate-50/60 to-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Revenue', value: '₹1,84,400', change: '+12%', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: TrendingUp },
                    { label: 'Active Members', value: '184', change: '92% retained', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: Users },
                    { label: 'Bot Chats Today', value: '47', change: '12 active now', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', icon: MessageCircle },
                    { label: 'Auto Renewals', value: '38', change: 'This week', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Zap },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 + i * 0.08 }}
                      className={`bg-white rounded-2xl border ${s.border} p-4 shadow-sm hover:shadow-md transition-shadow`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
                        <div className={`h-8 w-8 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}><s.icon className="h-4 w-4" /></div>
                      </div>
                      <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                      <p className={`text-[11px] font-semibold mt-0.5 ${s.color}`}>{s.change}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Revenue — Last 6 Months</p>
                  <div className="h-32 flex items-end gap-3 px-1">
                    {[35, 50, 42, 68, 82, 100].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <motion.div style={{ height: `${h}%` }} initial={{ height: 0 }} animate={{ height: `${h}%` }}
                          transition={{ delay: 1.2 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                          className="w-full rounded-xl bg-gradient-to-t from-indigo-600 to-violet-500 shadow-sm" />
                        <span className="text-[10px] font-semibold text-slate-400">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats / Trusted By ── */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: 85, suffix: '%', l: 'Faster Renewals', icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
            { v: 10, suffix: '×', l: 'Less App Friction', icon: Target, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
            { v: 24, suffix: 'L+', l: 'Payments Processed', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
            { v: 99, suffix: '.8%', l: 'Bot Uptime', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          ].map((s, i) => (
            <FadeUp key={i} delay={i * 0.1}>
              <div className="group">
                <div className={`inline-flex h-12 w-12 rounded-2xl ${s.bg} border items-center justify-center mb-3 group-hover:scale-110 transition-transform ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-slate-900">
                  <AnimatedCounter target={s.v} suffix={s.suffix} />
                </p>
                <p className="text-sm font-medium text-slate-400 mt-1">{s.l}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════
           FEATURES — Bento Grid
          ═══════════════════════════════ */}
      <section id="features" className="py-24 md:py-28 bg-[#FAFBFE] relative overflow-hidden">
        <GlowOrb className="top-0 right-0 w-[600px] h-[600px] bg-indigo-50/80 blur-3xl translate-x-1/3 -translate-y-1/3" />

        <div className="relative max-w-7xl mx-auto px-6 z-10">
          <FadeUp className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
              <Sparkles className="h-3.5 w-3.5" /> Powerful Features
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Everything your gym needs,{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">in one place</span>
            </h2>
            <p className="mt-4 text-slate-500 text-lg leading-relaxed">From WhatsApp automation to UPI payments — run your entire membership lifecycle effortlessly.</p>
          </FadeUp>

          <div className="grid md:grid-cols-6 gap-5">
            {/* Large hero card */}
            <FadeUp className="md:col-span-4">
              <div className="group h-full bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl translate-x-1/3 -translate-y-1/3" />
                <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/20">
                    <Bot className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">WhatsApp Chatbot</h3>
                  <p className="text-indigo-100 leading-relaxed max-w-md text-[15px]">Members text your gym number, the bot replies instantly — check membership, view plans, initiate renewals, get payment links. Zero staff effort required.</p>
                  <div className="mt-6 flex gap-3 flex-wrap">
                    {['Auto-replies', 'Multi-language', '24/7 active'].map(t => (
                      <span key={t} className="text-xs font-semibold bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Small stacked cards */}
            <div className="md:col-span-2 flex flex-col gap-5">
              {[
                { icon: QrCode, bg: 'bg-emerald-50', color: 'text-emerald-600', border: 'border-emerald-100', title: 'Instant UPI Payments', desc: 'Auto QR codes & Razorpay links. Webhooks verify & extend memberships.' },
                { icon: Bell, bg: 'bg-amber-50', color: 'text-amber-600', border: 'border-amber-100', title: 'Smart Renewal Alerts', desc: 'Automated reminders with personalized templates & payment links.' },
              ].map((c, i) => (
                <FadeUp key={i} delay={0.1 + i * 0.05}>
                  <div className={`group bg-white rounded-3xl border ${c.border} p-6 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 shadow-sm`}>
                    <div className={`h-12 w-12 rounded-2xl ${c.bg} flex items-center justify-center ${c.color} mb-4 group-hover:scale-110 transition-transform`}>
                      <c.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1.5">{c.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{c.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>

            {/* Bottom 3-column row */}
            {[
              { icon: ShieldCheck, bg: 'bg-rose-50', color: 'text-rose-600', border: 'border-rose-100', title: 'Human Takeover', desc: 'Pause bot, chat directly through live inbox.' },
              { icon: BarChart3, bg: 'bg-blue-50', color: 'text-blue-600', border: 'border-blue-100', title: 'Revenue Dashboard', desc: 'Real-time payments, members & trend analytics.' },
              { icon: Settings, bg: 'bg-violet-50', color: 'text-violet-600', border: 'border-violet-100', title: 'Plan & CRM Manager', desc: 'Create tiers, manage profiles, configure bot.' },
            ].map((f, i) => (
              <FadeUp key={i} delay={0.1 + i * 0.08} className="md:col-span-2">
                <div className={`group bg-white rounded-3xl border ${f.border} p-6 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 shadow-sm h-full`}>
                  <div className={`h-12 w-12 rounded-2xl ${f.bg} flex items-center justify-center ${f.color} mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════
           HOW IT WORKS
          ═══════════════════════════════ */}
      <section id="how-it-works" className="py-24 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp className="text-center max-w-2xl mx-auto mb-20">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-violet-600 uppercase tracking-widest bg-violet-50 px-4 py-2 rounded-full border border-violet-100">
              <CheckCircle2 className="h-3.5 w-3.5" /> Simple Setup
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Go live in <span className="text-violet-600">10 minutes</span>
            </h2>
            <p className="mt-4 text-slate-500 text-lg leading-relaxed">Three steps to fully automate gym memberships.</p>
          </FadeUp>

          <div className="space-y-16 md:space-y-0 md:grid md:grid-cols-3 md:gap-10 relative">
            <div className="hidden md:block absolute top-14 left-[18%] right-[18%] h-0.5 bg-gradient-to-r from-indigo-200 via-violet-200 to-emerald-200 rounded-full" />
            {[
              { step: '01', title: 'Register Your Gym', desc: 'Sign up, add gym details, create membership plans, and connect your WhatsApp Business number.', icon: Globe, gradient: 'from-indigo-500 to-blue-600', shadow: 'shadow-indigo-500/25' },
              { step: '02', title: 'Members Text You', desc: 'Members message your WhatsApp. Bot auto-replies with status, plans, and UPI payment links instantly.', icon: MessageCircle, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/25' },
              { step: '03', title: 'Payments Auto-Sync', desc: 'UPI/Razorpay webhooks verify payments and extend memberships automatically. You just watch.', icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/25' },
            ].map((s, i) => (
              <FadeUp key={i} delay={i * 0.15}>
                <div className="text-center group">
                  <div className={`h-16 w-16 bg-gradient-to-br ${s.gradient} rounded-3xl flex items-center justify-center text-white shadow-xl ${s.shadow} mx-auto mb-6 relative z-10 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300`}>
                    <s.icon className="h-7 w-7" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">Step {s.step}</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-2 mb-3">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════
           LIVE DEMO — 3-column layout
          ═══════════════════════════════ */}
      <section id="demo" className="py-24 md:py-28 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/30 relative overflow-hidden">
        <GlowOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-100/40 blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-6 z-10">
          <FadeUp className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
              <Play className="h-3.5 w-3.5 fill-current" /> Interactive Demo
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              See the bot <span className="text-emerald-600">in action</span>
            </h2>
            <p className="mt-4 text-slate-500 text-lg leading-relaxed">Click the prompts or type your own — this is exactly what your members will see.</p>
          </FadeUp>

          {/* 3-column layout matching screenshot */}
          <div className="grid lg:grid-cols-[280px_1fr_240px] xl:grid-cols-[300px_1fr_260px] gap-8 items-start">

            {/* LEFT — Quick Prompts */}
            <SlideIn from="left" delay={0.1} className="lg:sticky lg:top-28">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Quick Prompts</h3>
                  <p className="text-sm text-slate-500">Test member: <span className="text-indigo-600 font-semibold">Alex Mercer</span></p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { cmd: '1', emoji: '👤', label: 'Check Membership', sub: 'Reply: 1', border: 'border-blue-200 bg-blue-50/40', hover: 'hover:bg-blue-50 hover:border-blue-300 hover:shadow-blue-100' },
                    { cmd: '2', emoji: '🔄', label: 'Renew Plan', sub: 'Reply: 2', border: 'border-violet-200 bg-violet-50/40', hover: 'hover:bg-violet-50 hover:border-violet-300 hover:shadow-violet-100' },
                    { cmd: 'P2', emoji: '💳', label: 'Select Platinum', sub: 'Reply: P2', border: 'border-emerald-200 bg-emerald-50/40', hover: 'hover:bg-emerald-50 hover:border-emerald-300 hover:shadow-emerald-100' },
                    { cmd: 'PAID txn789', emoji: '✅', label: 'Confirm Payment', sub: 'Reply: PAID T28789', border: 'border-amber-200 bg-amber-50/40', hover: 'hover:bg-amber-50 hover:border-amber-300 hover:shadow-amber-100' },
                    { cmd: '3', emoji: '📋', label: 'View All Plans', sub: 'Reply: 3', border: 'border-rose-200 bg-rose-50/40', hover: 'hover:bg-rose-50 hover:border-rose-300 hover:shadow-rose-100' },
                    { cmd: '4', emoji: '📞', label: 'Contact Staff', sub: 'Reply: 4', border: 'border-slate-200 bg-slate-50/40', hover: 'hover:bg-slate-50 hover:border-slate-300 hover:shadow-slate-100' },
                  ].map((p, i) => (
                    <motion.button
                      key={i}
                      onClick={() => fire(p.cmd)}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.97 }}
                      className={`group w-full flex items-center gap-3 border ${p.border} ${p.hover} rounded-2xl p-3.5 text-left transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md`}
                    >
                      <span className="text-xl flex-shrink-0">{p.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{p.label}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{p.sub}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                    </motion.button>
                  ))}
                </div>

                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                  <p className="text-xs text-indigo-700 font-semibold leading-relaxed">
                    💡 In production, Razorpay webhooks auto-verify payments and extend memberships in real-time.
                  </p>
                </div>
              </div>
            </SlideIn>

            {/* CENTER — Phone Simulator */}
            <FadeUp delay={0.2} className="flex justify-center lg:sticky lg:top-28">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-b from-indigo-200/30 via-violet-200/20 to-transparent rounded-[52px] blur-2xl" />
                <div className="relative w-[340px] bg-gradient-to-b from-slate-700 to-slate-900 rounded-[44px] p-3 shadow-2xl shadow-slate-900/25 border border-white/10">
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-6 w-28 bg-slate-900 rounded-full z-20" />
                  <div className="bg-white rounded-[32px] overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-4 py-4 pt-9 flex items-center gap-3 text-white">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold backdrop-blur-sm">FF</div>
                      <div>
                        <p className="text-sm font-bold">FitFlow Gym</p>
                        <p className="text-[10px] text-emerald-200">online</p>
                      </div>
                      <Phone className="h-4 w-4 ml-auto text-white/70" />
                    </div>

                    <div ref={chatRef} className="h-[400px] overflow-y-auto px-3 py-3 space-y-2 bg-[#ECE5DD]"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.015\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                      {msgs.map(m => {
                        const mine = m.type === 'INBOUND';
                        return (
                          <motion.div key={m.id} initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${mine ? 'bg-[#DCF8C6] text-slate-800 rounded-tr-sm' : 'bg-white text-slate-800 rounded-tl-sm'}`}>
                              <span className="whitespace-pre-line">{m.message}</span>
                              <p className={`text-[9px] mt-1 text-right ${mine ? 'text-emerald-700/40' : 'text-slate-400'}`}>
                                {m.time} {mine && '✓✓'}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                      {typing && (
                        <div className="flex justify-start">
                          <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" />
                            <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce [animation-delay:.15s]" />
                            <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce [animation-delay:.3s]" />
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={e => { e.preventDefault(); fire(simInput); }} className="flex items-center gap-2 bg-[#F0F0F0] border-t border-slate-200 p-2.5">
                      <input value={simInput} onChange={e => setSimInput(e.target.value)} placeholder="Type a message…" disabled={typing}
                        className="flex-1 bg-white rounded-full px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50 border border-slate-200" />
                      <button type="submit" disabled={!simInput.trim() || typing}
                        className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 transition-colors cursor-pointer border-0 shadow-md shadow-emerald-600/25">
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* RIGHT — 3D Floating Preview */}
            <SlideIn from="right" delay={0.3} className="hidden lg:flex flex-col items-center justify-start lg:sticky lg:top-28 pt-4">
              <FloatingPhone3D />

              <div className="mt-6 space-y-3 w-full">
                {[
                  { icon: CheckCircle2, text: 'Zero app install needed', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { icon: Zap, text: 'Auto payment verify', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                  { icon: Shield, text: 'Secure & encrypted', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                ].map((b, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.12 }}
                    className={`flex items-center gap-2.5 ${b.bg} border ${b.border} rounded-xl px-3 py-2.5 shadow-sm`}>
                    <b.icon className={`h-4 w-4 ${b.color} flex-shrink-0`} />
                    <span className="text-[12px] font-semibold text-slate-700">{b.text}</span>
                  </motion.div>
                ))}
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════
           TESTIMONIALS
          ═══════════════════════════════ */}
      <section className="py-24 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
              <Star className="h-3.5 w-3.5 fill-current" /> Trusted by Gym Owners
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Real results from <span className="text-amber-600">real gyms</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Rajesh Sharma', gym: 'PowerFit Gym, Mumbai', text: 'We went from chasing 40+ expired members monthly to fully automated renewals. Revenue jumped 30% in 2 months.', avatar: 'RS', bg: 'bg-indigo-100', color: 'text-indigo-600' },
              { name: 'Priya Menon', gym: 'FlexZone Studio, Bangalore', text: 'Members love renewing via WhatsApp. Our staff spends zero time on billing now — it\'s completely automated.', avatar: 'PM', bg: 'bg-violet-100', color: 'text-violet-600' },
              { name: 'Amit Patel', gym: 'IronCore Fitness, Ahmedabad', text: 'The human takeover feature is brilliant. Bot handles 95% of queries and we step in only when needed.', avatar: 'AP', bg: 'bg-emerald-100', color: 'text-emerald-600' },
            ].map((t, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="bg-slate-50 rounded-3xl p-8 hover:bg-white hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col border border-transparent hover:border-slate-100">
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
                  </div>
                  <p className="text-[15px] text-slate-600 leading-relaxed flex-1">"{t.text}"</p>
                  <div className="mt-6 pt-5 border-t border-slate-200/60 flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-full ${t.bg} flex items-center justify-center text-sm font-bold ${t.color}`}>{t.avatar}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.gym}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════
           PRICING
          ═══════════════════════════════ */}
      <section id="pricing" className="py-24 md:py-28 bg-[#FAFBFE] relative overflow-hidden">
        <GlowOrb className="bottom-0 left-0 w-[500px] h-[500px] bg-violet-50/80 blur-3xl -translate-x-1/3 translate-y-1/3" />

        <div className="relative max-w-6xl mx-auto px-6 z-10">
          <FadeUp className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
              <Layers className="h-3.5 w-3.5" /> Pricing Plans
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Plans that <span className="text-indigo-600">grow with you</span>
            </h2>

            <div className="mt-8 flex items-center justify-center gap-3">
              <span className={`text-sm font-semibold transition-colors ${!annual ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
              <button onClick={() => setAnnual(!annual)} className="w-14 h-8 rounded-full bg-slate-200 p-1 flex items-center cursor-pointer border-0 hover:bg-slate-300 transition-colors">
                <motion.div animate={{ x: annual ? 24 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="h-6 w-6 rounded-full bg-indigo-600 shadow-md" />
              </button>
              <span className={`text-sm font-semibold transition-colors ${annual ? 'text-slate-900' : 'text-slate-400'}`}>
                Annual <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full ml-1 border border-emerald-100">Save 20%</span>
              </span>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Starter', price: annual ? '₹1,599' : '₹1,999', desc: 'Perfect for small gyms.', features: ['Up to 150 members', 'WhatsApp bot automation', 'UPI + Razorpay payments', 'Daily expiry alerts', 'Email support'], cta: 'Start Free Trial', highlight: false },
              { name: 'Pro', price: annual ? '₹3,199' : '₹3,999', desc: 'For growing studios.', features: ['Up to 500 members', 'Human Takeover & Live Chat', 'Custom bot templates', 'Advanced alert schedules', 'Priority support'], cta: 'Choose Pro', highlight: true },
              { name: 'Enterprise', price: annual ? '₹6,399' : '₹7,999', desc: 'Multi-branch networks.', features: ['Unlimited members', 'Multi-location support', 'Dedicated database', 'Custom API webhooks', '24/7 account manager'], cta: 'Contact Sales', highlight: false },
            ].map((p, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className={`relative rounded-3xl h-full flex flex-col ${p.highlight ? 'z-10' : ''}`}>
                  {p.highlight && <div className="absolute -inset-[2px] bg-gradient-to-b from-indigo-500 via-violet-500 to-purple-500 rounded-[26px]" />}
                  <div className={`relative bg-white rounded-3xl p-8 flex flex-col flex-1 ${p.highlight ? 'shadow-xl shadow-indigo-500/15' : 'border border-slate-200 hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 transition-all'}`}>
                    {p.highlight && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">Most Popular</span>}
                    <div className="pt-1">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">{p.name}</h3>
                      <AnimatePresence mode="wait">
                        <motion.p key={p.price} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                          className="text-4xl font-extrabold text-slate-900 mt-2">
                          {p.price}<span className="text-base text-slate-400 font-medium">/mo</span>
                        </motion.p>
                      </AnimatePresence>
                      <p className="text-sm mt-1 text-slate-500">{p.desc}</p>
                    </div>
                    <ul className="mt-8 space-y-3.5 flex-1">
                      {p.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-3 text-sm">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${p.highlight ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Check className="h-3 w-3" />
                          </div>
                          <span className="text-slate-600">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/register" className={`mt-8 w-full text-center py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 block ${p.highlight ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5' : 'bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white'}`}>
                      {p.cta}
                    </Link>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════
           FAQ
          ═══════════════════════════════ */}
      <section id="faq" className="py-24 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <FadeUp className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-violet-600 uppercase tracking-widest bg-violet-50 px-4 py-2 rounded-full border border-violet-100">FAQ</span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">Common questions</h2>
          </FadeUp>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <FadeUp key={i} delay={i * 0.05}>
                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden hover:bg-white hover:shadow-md hover:border-slate-200 transition-all">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left cursor-pointer border-0 bg-transparent">
                    <span className="text-[15px] font-bold text-slate-800">{f.q}</span>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ml-4 ${openFaq === i ? 'rotate-180 text-indigo-500' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                        <p className="px-5 pb-5 text-sm text-slate-500 leading-relaxed">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════
           CTA BANNER
          ═══════════════════════════════ */}
      <section className="relative py-24 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
          <FadeUp>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Ready to automate<br />your gym?
            </h2>
            <p className="mt-5 text-indigo-100 max-w-xl mx-auto text-lg leading-relaxed">Join hundreds of gym owners who have eliminated manual billing. Setup takes under 10 minutes.</p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="group inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-extrabold text-sm px-10 py-4 rounded-2xl shadow-xl hover:-translate-y-0.5 hover:shadow-2xl transition-all">
                Start Your Free Trial <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white hover:bg-white/10 font-semibold text-sm px-10 py-4 rounded-2xl transition-all">
                Log In to Dashboard <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════
           FOOTER
          ═══════════════════════════════ */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <span className="text-base font-extrabold text-white">Fit<span className="text-indigo-400">Flow</span></span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">WhatsApp-first gym membership automation. Built for modern fitness businesses.</p>
              <div className="flex gap-2 pt-1">
                {['Twitter', 'GitHub', 'Discord'].map(s => (
                  <span key={s} className="text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg cursor-pointer transition-all">{s}</span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Live Demo</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><span className="text-slate-600">Razorpay SLA</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5">Support</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><Headphones className="h-3.5 w-3.5 text-slate-600" /> help@fitflow.app</li>
                <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-600" /> +91 98765 43210</li>
                <li className="flex items-center gap-2 text-emerald-400 font-medium"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> All systems online</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>© 2026 FitFlow Inc. All rights reserved.</p>
            <p>Made with ❤️ for gym owners everywhere</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
