'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Settings, QrCode, CreditCard, RefreshCw, Save, CheckCircle2 } from 'lucide-react';

interface SettingsData {
  chatbotSettings: {
    gymId: string;
  } | null;
  paymentSettings: {
    upiId: string | null;
    upiName: string | null;
    razorpayKeyId: string | null;
    razorpayKeySecret: string | null;
    isRazorpayEnabled: boolean;
  } | null;
}

export default function SettingsPage() {
  const { gymSlug } = useParams() as { gymSlug: string };
  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [isRazorpayEnabled, setIsRazorpayEnabled] = useState(false);

  // WhatsApp connection states
  const [waStatus, setWaStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY'>('DISCONNECTED');
  const [waQrCode, setWaQrCode] = useState('');
  const [isWaLoading, setIsWaLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${gymSlug}/chatbot`);
      if (res.ok) {
        const data: SettingsData = await res.json();
        setUpiId(data.paymentSettings?.upiId || '');
        setUpiName(data.paymentSettings?.upiName || '');
        setRazorpayKeyId(data.paymentSettings?.razorpayKeyId || '');
        setRazorpayKeySecret(data.paymentSettings?.razorpayKeySecret || '');
        setIsRazorpayEnabled(data.paymentSettings?.isRazorpayEnabled || false);
      }

      // Fetch active WhatsApp session status
      const waRes = await fetch(`/api/dashboard/${gymSlug}/whatsapp/status`);
      if (waRes.ok) {
        const waData = await waRes.json();
        setWaStatus(waData.status || 'DISCONNECTED');
        setWaQrCode(waData.qrCode || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [gymSlug]);

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setError('');

    try {
      const res = await fetch(`/api/dashboard/${gymSlug}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upiId,
          upiName,
          razorpayKeyId,
          razorpayKeySecret,
          isRazorpayEnabled,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await fetchSettings();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    setIsWaLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${gymSlug}/whatsapp/connect`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data.status);
        setWaQrCode(data.qrCode || '');
        
        // Start polling to detect successful connection
        pollWaStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWaLoading(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!confirm('Disconnect WhatsApp Business session? Outbound chatbot services will stop.')) return;
    setIsWaLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${gymSlug}/whatsapp/disconnect`, { method: 'POST' });
      if (res.ok) {
        setWaStatus('DISCONNECTED');
        setWaQrCode('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWaLoading(false);
    }
  };

  // Poll for connection activation
  const pollWaStatus = () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/dashboard/${gymSlug}/whatsapp/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'CONNECTED') {
            setWaStatus('CONNECTED');
            setWaQrCode('');
            clearInterval(interval);
          } else {
            setWaQrCode(data.qrCode || '');
            setWaStatus(data.status);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 4000);

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Integrations Setup</h2>
        <p className="text-xs text-zinc-500 mt-1">Connect your WhatsApp Business account and set up active payment channels.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* WhatsApp QR Pairing Settings */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-md space-y-6">
          <h3 className="text-sm font-bold tracking-tight text-white uppercase tracking-wider flex items-center gap-2">
            <QrCode className="h-4 w-4 text-cyan-400" /> WhatsApp Integration
          </h3>

          <div className="rounded-xl border border-zinc-850 bg-zinc-900/10 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase">Connection Status</span>
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold border uppercase ${
                waStatus === 'CONNECTED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                waStatus === 'QR_READY' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400 animate-pulse' :
                'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}>
                {waStatus}
              </span>
            </div>

            {waStatus === 'CONNECTED' ? (
              <div className="space-y-4 text-xs text-zinc-400">
                <p className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Connected to active WhatsApp Account.
                </p>
                <p className="leading-relaxed">
                  FitFlow is listening to incoming messages and firing chatbots in real time. You can safely continue using WhatsApp on your phone or web browser concurrently.
                </p>
                <button
                  onClick={handleDisconnectWhatsApp}
                  disabled={isWaLoading}
                  className="w-full rounded-xl border border-rose-900 bg-rose-950/20 py-2.5 font-bold text-rose-400 hover:bg-rose-900/10"
                >
                  Disconnect WhatsApp Account
                </button>
              </div>
            ) : waStatus === 'QR_READY' && waQrCode ? (
              <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
                <div className="rounded-xl bg-white p-3 border border-zinc-800 shadow-xl">
                  {/* Public QR representation for Baileys */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(waQrCode)}`}
                    alt="WhatsApp QR Code"
                    className="h-48 w-48"
                  />
                </div>
                <div className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  <p className="font-bold text-zinc-200">Scan QR Code to Pair</p>
                  <p className="mt-1">Open WhatsApp &gt; Linked Devices &gt; Link a Device, and point your camera to pair instantly.</p>
                </div>
                {/* Simulated trigger for testing: click to auto-connect */}
                <button
                  onClick={async () => {
                    await fetch(`/api/dashboard/${gymSlug}/whatsapp/connect/simulate-success`, { method: 'POST' });
                    await fetchSettings();
                  }}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 shadow-lg shadow-cyan-600/20"
                >
                  ⚡ Simulate Pairing Success
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Connect your existing WhatsApp Business number. No specialized business accounts needed! Just scan the paired device QR.
                </p>
                <button
                  onClick={handleConnectWhatsApp}
                  disabled={isWaLoading}
                  className="w-full rounded-xl bg-cyan-600 py-3 text-xs font-bold text-white hover:bg-cyan-500 shadow-lg shadow-cyan-600/20 disabled:opacity-40"
                >
                  {isWaLoading ? 'Initializing Connection...' : 'Pair WhatsApp Number via QR'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Settings Configurations */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-md space-y-6">
          <h3 className="text-sm font-bold tracking-tight text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-cyan-400" /> Payment Credentials
          </h3>

          {saveSuccess && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400">
              ✓ Credentials updated and saved successfully!
            </div>
          )}

          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-xs text-zinc-500">Loading configurations...</div>
          ) : (
            <form onSubmit={handleSavePaymentSettings} className="space-y-6 text-xs">
              {/* Mode 1: Manual UPI setup */}
              <div className="space-y-4">
                <span className="block font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-2">
                  Mode 1: Manual UPI Configuration
                </span>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block font-semibold text-zinc-400 uppercase tracking-wider">UPI ID</label>
                    <input
                      type="text"
                      placeholder="e.g. gymowner@okaxis"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-semibold text-zinc-400 uppercase tracking-wider">Business Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g. FitLife Fitness"
                      value={upiName}
                      onChange={(e) => setUpiName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mode 2: Razorpay credentials */}
              <div className="space-y-4 border-t border-zinc-900 pt-6">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-400 uppercase tracking-widest">
                    Mode 2: Razorpay Gateway
                  </span>
                  <input
                    type="checkbox"
                    checked={isRazorpayEnabled}
                    onChange={(e) => setIsRazorpayEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-850 bg-zinc-900 text-cyan-600 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                  />
                </div>

                {isRazorpayEnabled && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-semibold text-zinc-400 uppercase tracking-wider">Razorpay Key ID</label>
                      <input
                        type="text"
                        placeholder="rzp_test_key1234"
                        value={razorpayKeyId}
                        onChange={(e) => setRazorpayKeyId(e.target.value)}
                        required={isRazorpayEnabled}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block font-semibold text-zinc-400 uppercase tracking-wider">Razorpay Key Secret</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={razorpayKeySecret}
                        onChange={(e) => setRazorpayKeySecret(e.target.value)}
                        required={isRazorpayEnabled}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-cyan-600 py-3 font-bold text-white transition-all hover:bg-cyan-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {isSaving ? 'Saving Configurations...' : 'Save Payment Credentials'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
