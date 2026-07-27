'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, User, Mail, Lock, Building, ArrowRight, Fingerprint, ShieldCheck } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';

export default function RegisterPage() {
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPasskeyOnboarding, setShowPasskeyOnboarding] = useState(false);
  const [registeredGymSlug, setRegisteredGymSlug] = useState('');
  const [isOnboardingPasskey, setIsOnboardingPasskey] = useState(false);

  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName,
          ownerName,
          ownerEmail,
          ownerPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setRegisteredGymSlug(data.gym?.slug || '');
        setTimeout(() => {
          setShowPasskeyOnboarding(true);
        }, 1500);
      } else {
        setError(data.error || 'Failed to register. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setIsOnboardingPasskey(true);
    try {
      const optionsRes = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });

      if (!optionsRes.ok) {
        const errData = await optionsRes.json();
        throw new Error(errData.error || 'Failed to fetch registration options');
      }

      const options = await optionsRes.json();

      let attestationResponse;
      try {
        attestationResponse = await startRegistration({ optionsJSON: options });
      } catch (authErr) {
        console.warn('Authenticator registration failed:', authErr);
        setError('Passkey configuration cancelled. You can set it up later in Settings.');
        return;
      }

      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestationResponse),
        credentials: 'same-origin',
      });

      if (!verifyRes.ok) {
        const verifyErr = await verifyRes.json();
        throw new Error(verifyErr.error || 'Assertion verification failed');
      }

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        if (registeredGymSlug) {
          router.push(`/dashboard`);
        } else {
          router.push('/login');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Passkey setup failed. You can skip to continue.');
    } finally {
      setIsOnboardingPasskey(false);
    }
  };

  const handleSkipOnboarding = () => {
    if (registeredGymSlug) {
      router.push(`/dashboard`);
    } else {
      router.push('/login');
    }
  };

  if (showPasskeyOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 font-sans relative overflow-hidden">
        {/* Background Neon Glowing Orbs */}
        <div className="absolute left-1/4 top-1/4 -h-96 w-96 rounded-full bg-cyan-600/10 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 -h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />

        <div className="w-full max-w-md">
          {/* Header Logo */}
          <div className="mb-8 text-center flex flex-col items-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-0.5 shadow-xl shadow-cyan-500/10">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-zinc-950">
                <Dumbbell className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              FIT<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">FLOW</span>
            </h1>
            <p className="mt-2 text-xs text-zinc-500 font-medium">WhatsApp-First Gym Membership Management SaaS</p>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Fingerprint className="h-8 w-8 animate-pulse text-cyan-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Enable Biometric Login</h2>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                Secure your workspace with 1-click **Face ID, Touch ID, or Windows Hello**. You won't need to enter passwords in the future.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 text-left">
                {error}
              </div>
            )}

            <div className="space-y-3 pt-4">
              <button
                type="button"
                onClick={handleRegisterPasskey}
                disabled={isOnboardingPasskey}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 animate-shimmer"
              >
                {isOnboardingPasskey ? 'Registering Device...' : (
                  <>
                    Setup Biometric Passkey <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipOnboarding}
                disabled={isOnboardingPasskey}
                className="w-full flex items-center justify-center py-2.5 text-xs font-semibold text-zinc-550 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Skip & Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 font-sans relative overflow-hidden">
      <div className="absolute left-1/4 top-1/4 -h-96 w-96 rounded-full bg-cyan-600/10 blur-[120px]" />
      <div className="absolute right-1/4 bottom-1/4 -h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="w-full max-w-lg">
        {/* Header Logo */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-0.5 shadow-xl shadow-cyan-500/10">
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-zinc-950">
              <Dumbbell className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            FIT<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">FLOW</span>
          </h1>
          <p className="mt-2 text-xs text-zinc-500 font-medium">WhatsApp-First Gym Membership Management SaaS</p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Create Gym Tenant</h2>
            <p className="text-xs text-zinc-400 mt-1">Onboard your gym, setup first staff account & create default plans.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400">
              🎉 Gym registered successfully! Logging you in and redirecting to dashboard...
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Gym Info */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gym Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <Building className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="FitLife Club"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-3 pl-10 pr-4 text-xs text-white placeholder-zinc-600 focus:border-cyan-500 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Owner Info */}
            <div className="border-t border-zinc-800/80 pt-4 mt-4">
              <span className="block mb-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Gym Owner Account</span>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Alex Mercer"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-3 pl-10 pr-4 text-xs text-white placeholder-zinc-600 focus:border-cyan-500 focus:outline-none transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      placeholder="owner@fitlife.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-3 pl-10 pr-4 text-xs text-white placeholder-zinc-600 focus:border-cyan-500 focus:outline-none transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-3 pl-10 pr-4 text-xs text-white placeholder-zinc-600 focus:border-cyan-500 focus:outline-none transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || success}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
            >
              {isLoading ? 'Creating Tenant Gym...' : (
                <>
                  Register Gym & Owner <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Help */}
          <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
            <p className="text-xs text-zinc-500">
              Already have an account?{' '}
              <a href="/login" className="font-semibold text-cyan-400 hover:underline">
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
