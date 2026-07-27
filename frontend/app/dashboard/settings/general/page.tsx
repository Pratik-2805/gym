'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Dumbbell, Save } from 'lucide-react';
import PasskeyManager from '@/components/dashboard/PasskeyManager';


export default function GeneralSettingsPage() {
  const [gymName, setGymName] = useState('fit');
  const [gymLogo, setGymLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGym = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.gym?.name) {
            setGymName(data.user.gym.name);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGym();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // In a real app, this would be an API call to update the gym profile
      // await updateGymDetails({ name: gymName, logo: gymLogo });
      toast.success('Gym settings saved successfully!');
    } catch (err) {
      toast.error('Failed to save gym settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">General Settings</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Configure your workspace branding, security, and preferences.
          </p>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={saving}
          className="self-start rounded-xl bg-cyan-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-cyan-500 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-8 backdrop-blur-2xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-3 mb-6">
              <div className="p-2 bg-cyan-500/10 rounded-xl">
                <Dumbbell className="w-5 h-5 text-cyan-400" />
              </div>
              Brand & Workspace
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">Workspace Name</label>
                <input 
                  type="text"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="e.g. FitFlow"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-zinc-100 focus:outline-none focus:border-cyan-500 focus:bg-zinc-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">Brand Logo</label>
                
                {gymLogo ? (
                  <div className="mb-4 flex items-center gap-4 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
                    <img src={gymLogo} alt="Preview" className="h-12 w-12 object-contain rounded-lg border border-zinc-800" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-200">Custom Logo</p>
                      <p className="text-[10px] text-zinc-500">Currently active</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setGymLogo(null)}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 text-zinc-600">
                      <Dumbbell className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <input 
                        type="file"
                        accept="image/*"
                        id="brand-logo-file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setGymLogo(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label 
                        htmlFor="brand-logo-file"
                        className="inline-block px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 cursor-pointer text-xs font-bold text-zinc-300 hover:text-white transition-all"
                      >
                        Upload Image
                      </label>
                      <p className="text-[10px] text-zinc-500 mt-2">Recommended size: 256x256px (PNG or JPG)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <PasskeyManager />
        </div>
      </div>
    </div>
  );
}
