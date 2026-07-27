'use client';

import React, { useState, useEffect } from 'react';
import { Fingerprint, Trash2, Shield, Plus, Clock, Cpu, RefreshCcw } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { toast } from 'react-toastify';

interface PasskeyItem {
  id: string;
  credentialID: string;
  createdAt: string;
  counter: number;
}

interface PasskeyManagerProps {
  /** When true, renders a compact sidebar-friendly layout without the heavy card wrapper */
  compact?: boolean;
}

export default function PasskeyManager({ compact = false }: PasskeyManagerProps) {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Check if WebAuthn is supported by the browser
  useEffect(() => {
    if (!window.PublicKeyCredential) {
      setIsSupported(false);
    }
    fetchPasskeys();
  }, []);

  const fetchPasskeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/webauthn/credentials', { credentials: 'same-origin' });
      if (!res.ok) {
        throw new Error('Failed to load registered passkeys');
      }
      const data = await res.json();
      setPasskeys(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Could not load credentials list.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setRegistering(true);
    try {
      // 1. Get registration options from the server
      const optionsRes = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });

      if (!optionsRes.ok) {
        const errData = await optionsRes.json();
        throw new Error(errData.error || 'Failed to get registration options');
      }

      const options = await optionsRes.json();

      // 2. Trigger the browser passkey creation modal
      let attestationResponse;
      try {
        attestationResponse = await startRegistration({ optionsJSON: options });
      } catch (authErr: any) {
        console.warn('Authenticator cancelled or failed:', authErr);
        toast.warning('Credential registration cancelled.');
        return;
      }

      // 3. Post assertion verification back to server
      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestationResponse),
        credentials: 'same-origin',
      });

      if (!verifyRes.ok) {
        const verifyErr = await verifyRes.json();
        throw new Error(verifyErr.error || 'Verification failed');
      }

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        toast.success('Biometric Passkey registered successfully!');
        fetchPasskeys();
      } else {
        throw new Error('Verification did not return success status');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Passkey registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this passkey? You won't be able to log in with it anymore.")) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/webauthn/credentials/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete credential');
      }

      toast.success('Passkey revoked successfully');
      fetchPasskeys();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to revoke passkey');
    }
  };

  // ─── Compact sidebar layout ───────────────────────────────────────────────
  if (compact) {
    if (!isSupported) {
      return (
        <p className="text-[10px] text-zinc-500">
          WebAuthn not supported in this browser.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
            Biometric Passkeys
          </span>
          <button
            onClick={handleRegisterPasskey}
            disabled={registering}
            title="Add Biometric Passkey"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 text-[10px] font-bold transition-colors disabled:opacity-50 border border-cyan-600/30"
          >
            {registering ? (
              <RefreshCcw className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            {registering ? 'Adding…' : 'Add'}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <RefreshCcw className="w-3 h-3 animate-spin text-cyan-400" />
            Loading...
          </div>
        ) : passkeys.length > 0 ? (
          <div className="space-y-1.5">
            {passkeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between bg-zinc-900/60 rounded-xl px-3 py-2 border border-zinc-800"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-zinc-300 truncate">
                      ···{key.credentialID.substring(key.credentialID.length - 8)}
                    </span>
                    <span className="text-[9px] text-zinc-600">
                      {new Date(key.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePasskey(key.id)}
                  className="p-1 rounded-md text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Revoke Passkey"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-zinc-800 text-[10px] text-zinc-600">
            <Fingerprint className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
            <span>No passkeys — add one for passwordless login</span>
          </div>
        )}
      </div>
    );
  }

  // ─── Full card layout (standalone page / settings) ────────────────────────
  if (!isSupported) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-8 backdrop-blur-2xl">
        <h3 className="text-base font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-xl">
            <Fingerprint className="w-5 h-5 text-rose-400" />
          </div>
          Passkeys &amp; Biometrics
        </h3>
        <p className="text-sm text-zinc-500 mt-4">
          WebAuthn is not supported by your current browser or connection context. Web authentication
          requires a secure context (HTTPS) or a local host connection.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-8 backdrop-blur-2xl space-y-6 transition-all hover:border-zinc-700/60 hover:shadow-2xl hover:bg-zinc-900/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-850 pb-6 gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-xl">
              <Fingerprint className="w-5 h-5 text-cyan-400" />
            </div>
            Passkeys &amp; Biometrics
          </h3>
          <p className="text-xs text-zinc-500">
            Secure your account with face recognition, fingerprints, or platform passkeys.
          </p>
        </div>
        <button
          onClick={handleRegisterPasskey}
          disabled={registering}
          className="rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 px-6 py-2.5 text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50"
        >
          {registering ? (
            <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {registering ? 'Creating Key...' : 'Add Biometric Passkey'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-6 justify-center text-xs text-zinc-500">
          <RefreshCcw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Fetching credential records...</span>
        </div>
      ) : passkeys.length > 0 ? (
        <div className="divide-y divide-zinc-900">
          {passkeys.map((key) => (
            <div key={key.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-900/40 text-cyan-400 font-extrabold text-xs shrink-0">
                  <Shield className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-zinc-200">
                    Credential (ID: {key.credentialID.substring(0, 12)}...)
                  </span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-zinc-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created{' '}
                      {new Date(key.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      Counter: {key.counter} signatures
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeletePasskey(key.id)}
                className="p-2 rounded-lg border border-zinc-900 bg-zinc-950/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-300 transition-colors"
                title="Revoke Passkey"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-xs border border-dashed border-zinc-850 rounded-2xl flex flex-col items-center justify-center gap-2.5">
          <Fingerprint className="w-8 h-8 text-zinc-700" />
          <div>
            <p className="font-bold text-zinc-400">No passkeys configured</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Add a biometric device to log in passwordlessly next time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
