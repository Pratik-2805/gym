'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  Dumbbell,
  ArrowRight,
  Heart,
  Zap,
  Shield,
  Globe,
  Users,
  Target,
  Code2,
  MessageCircle,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Bot,
  CreditCard,
  BarChart3,
} from 'lucide-react';

import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import TearLoader from '../../components/landing/TearLoader';

/* ── Animation helpers ── */
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

function GlowOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full pointer-events-none ${className}`} />;
}

export default function AboutPage() {
  const timeline = [
    {
      year: '2024',
      title: 'The Idea',
      desc:
        'Frustrated by manual member tracking and payment follow-ups at local gyms, the FitFlow concept was born — automate it all via WhatsApp.',
      icon: Sparkles,
      color: 'bg-indigo-600',
    },
    {
      year: '2025',
      title: 'First Bot Goes Live',
      desc:
        'Our WhatsApp chatbot launched with 5 pilot gyms in Mumbai. Within weeks, renewal rates jumped 40%. The product-market fit was undeniable.',
      icon: Bot,
      color: 'bg-violet-600',
    },
    {
      year: '2025',
      title: 'UPI & Razorpay Integration',
      desc:
        'Automated UPI QR code generation and Razorpay webhooks for instant payment verification. Members could now pay and auto-renew without any staff involvement.',
      icon: CreditCard,
      color: 'bg-emerald-600',
    },
    {
      year: '2026',
      title: '500+ Gyms Onboarded',
      desc:
        'FitFlow now powers gym operations across India — from boutique studios to multi-branch chains. Processing lakhs in automated renewals every month.',
      icon: TrendingUp,
      color: 'bg-amber-600',
    },
  ];

  const values = [
    {
      icon: Zap,
      title: 'Zero Friction',
      desc: 'No app downloads, no portals. Everything happens inside WhatsApp — where your members already are.',
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      icon: Heart,
      title: 'Built for Gym Owners',
      desc: 'We obsess over the problems real gym owners face. Every feature is designed to save time and recover revenue.',
      color: 'text-rose-600 bg-rose-50 border-rose-100',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      desc: 'End-to-end encryption, Razorpay-grade security, and 99.8% uptime SLA. Your data is always safe.',
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      icon: Globe,
      title: 'India-First Design',
      desc: 'UPI payments, INR pricing, WhatsApp-native. Built ground-up for the Indian fitness market.',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      icon: Users,
      title: 'Community Driven',
      desc: 'Our roadmap is shaped by gym owners. Feature requests, feedback, and real-world testing drive every release.',
      color: 'text-violet-600 bg-violet-50 border-violet-100',
    },
    {
      icon: Target,
      title: 'Results Obsessed',
      desc: "We measure success by one metric: how much revenue we help you recover. If you don't grow, we don't grow.",
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
  ];

  const techStack = [
    { name: 'Next.js', desc: 'Frontend Framework', icon: Code2 },
    { name: 'WhatsApp API', desc: 'Business Messaging', icon: MessageCircle },
    { name: 'Razorpay', desc: 'Payment Gateway', icon: CreditCard },
    { name: 'Prisma + PostgreSQL', desc: 'Database Layer', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-900 font-sans overflow-x-hidden relative noir-mode-active">
      {/* Tear Effect Loader */}
      <TearLoader />

      {/* Noir Checkerboard Overlay */}
      <div className="noir-checkerboard" />

      {/* NAVBAR */}
      <Navbar />

      {/* HERO */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-transparent">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />
        <GlowOrb className="top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100/50 to-violet-100/30 blur-3xl -translate-y-1/3 translate-x-1/4" />
        <GlowOrb className="bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-rose-100/20 to-orange-100/10 blur-3xl translate-y-1/4 -translate-x-1/4" />

        <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span className="inline-flex items-center gap-2 bg-[#f0f2f5] neu-flat text-indigo-700 text-xs font-bold px-4 py-2 rounded-full border border-white/80 shadow-xs mb-8">
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> Our Story
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-900"
          >
            We&apos;re on a mission to make{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              every gym effortless
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed"
          >
            FitFlow was born from a simple frustration: gym owners spending hours chasing payments instead of helping
            members get fit. We built the automation layer so you can focus on what matters.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
            >
              Start Free Trial{' '}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/#demo"
              className="group inline-flex items-center justify-center gap-2 bg-[#f0f2f5] neu-button text-slate-700 hover:text-indigo-600 font-bold text-sm px-8 py-4 rounded-2xl shadow-sm transition-all"
            >
              See Product Demo <ArrowUpRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-24 md:py-28 bg-[#f0f2f5] border-y border-slate-200 relative overflow-hidden">
        <GlowOrb className="top-1/2 left-0 w-[400px] h-[400px] bg-violet-100/40 blur-[100px] -translate-x-1/2 -translate-y-1/2" />

        <div className="relative max-w-4xl mx-auto px-6 z-10">
          <FadeUp className="text-center mb-20">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-violet-600 uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-full shadow-xs">
              <Sparkles className="h-3.5 w-3.5" /> Our Journey
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              From idea to <span className="text-violet-600">500+ gyms</span>
            </h2>
          </FadeUp>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-8 md:left-1/2 -translate-x-px top-0 bottom-0 w-1 bg-black" />

            <div className="space-y-12">
              {timeline.map((item, i) => (
                <FadeUp key={i} delay={i * 0.15}>
                  <div
                    className={`relative flex items-start gap-6 md:gap-12 ${
                      i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                      <div
                        className={`h-12 w-12 ${item.color} rounded-2xl flex items-center justify-center text-white border-4 border-black shadow-[3px_3px_0px_#000000]`}
                      >
                        <item.icon className="h-5 w-5" />
                      </div>
                    </div>

                    {/* Content Card (Brutalist + Neumorphic Neubrutalist Style) */}
                    <div
                      className={`ml-20 md:ml-0 ${
                        i % 2 === 0
                          ? 'md:w-[calc(50%-40px)] md:text-right'
                          : 'md:w-[calc(50%-40px)] md:ml-auto'
                      }`}
                    >
                      <div className="feature-card neu-flat p-6 rounded-2xl text-left border-4 border-black shadow-[6px_6px_0px_#000000] inline-block w-full">
                        <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest">
                          {item.year}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-24 md:py-28 bg-[#f0f2f5]">
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-full shadow-xs">
              <Heart className="h-3.5 w-3.5 fill-current" /> What We Stand For
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Our <span className="text-emerald-600">core values</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <FadeUp key={i} delay={i * 0.08}>
                <div className="feature-card neu-flat rounded-3xl p-6 transition-all duration-300 h-full flex flex-col">
                  <div
                    className={`neu-button h-12 w-12 rounded-2xl flex items-center justify-center mb-4 text-emerald-600`}
                  >
                    <v.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{v.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="py-24 md:py-28 bg-[#f0f2f5] border-t border-slate-200 relative overflow-hidden">
        <GlowOrb className="top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 blur-[100px] translate-x-1/3 -translate-y-1/3" />

        <div className="relative max-w-4xl mx-auto px-6 z-10">
          <FadeUp className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-full shadow-xs">
              <Code2 className="h-3.5 w-3.5" /> Under the Hood
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Built with <span className="text-indigo-600">modern tech</span>
            </h2>
            <p className="mt-4 text-slate-500 text-lg leading-relaxed">
              Reliable, fast, and scalable infrastructure powering your gym operations.
            </p>
          </FadeUp>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {techStack.map((t, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="feature-card neu-flat rounded-2xl p-5 text-center group hover:border-indigo-500/20 transition-all flex flex-col items-center">
                  <div className="neu-button h-12 w-12 rounded-2xl flex items-center justify-center mb-3 text-indigo-600 group-hover:scale-110 transition-transform">
                    <t.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-[11px] text-slate-455 text-slate-400 mt-0.5">{t.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
          <FadeUp>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Join the FitFlow
              <br />
              revolution
            </h2>
            <p className="mt-5 text-indigo-100 max-w-xl mx-auto text-lg leading-relaxed">
              500+ gym owners have already switched to automated operations. Your gym deserves the same.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-extrabold text-sm px-10 py-4 rounded-2xl shadow-xl hover:-translate-y-0.5 hover:shadow-2xl transition-all"
              >
                Start Your Free Trial{' '}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white hover:bg-white/10 font-semibold text-sm px-10 py-4 rounded-2xl transition-all"
              >
                Back to Home <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
