"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  Store,
  MapPin,
  FileText,
  Mail,
  Globe,
  Briefcase,
  Save,
  RefreshCcw,
  Plus,
  Trash2,
  Info,
  CheckCircle,
  Image as ImageIcon,
  Upload,
} from "lucide-react";

interface BusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  vertical?: string;
  websites?: string[];
  profile_picture_url?: string;
}

const VERTICALS = [
  { value: "ALCOHOL", label: "Alcoholic Beverages" },
  { value: "APPAREL", label: "Clothing and Apparel" },
  { value: "AUTO", label: "Automotive" },
  { value: "BEAUTY", label: "Beauty, Spa and Salon" },
  { value: "EDU", label: "Education" },
  { value: "ENTERTAIN", label: "Entertainment" },
  { value: "EVENT_PLAN", label: "Event Planning and Service" },
  { value: "FINANCE", label: "Finance and Banking" },
  { value: "GOVT", label: "Public Service" },
  { value: "GROCERY", label: "Food and Grocery" },
  { value: "HEALTH", label: "Medical and Health" },
  { value: "HOTEL", label: "Hotel and Lodging" },
  { value: "NONPROFIT", label: "Non-profit" },
  { value: "ONLINE_GAMBLING", label: "Online Gambling & Gaming" },
  { value: "OTC_DRUGS", label: "Over-the-Counter Drugs" },
  { value: "OTHER", label: "Other" },
  { value: "PHYSICAL_GAMBLING", label: "Non-Online Gambling & Gaming" },
  { value: "PROF_SERVICES", label: "Professional Services" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "RETAIL", label: "Shopping and Retail" },
  { value: "TRAVEL", label: "Travel and Transportation" },
];

export default function BusinessProfileForm({ gymSlug }: { gymSlug: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile>({
    about: "",
    address: "",
    description: "",
    email: "",
    vertical: "OTHER",
    websites: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [gymSlug]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${gymSlug}/whatsapp/business-profile`);
      if (res.ok) {
        const data = await res.json();
        setProfile({
          about: data.about || "",
          address: data.address || "",
          description: data.description || "",
          email: data.email || "",
          vertical: data.vertical || "OTHER",
          websites: data.websites || [],
          profile_picture_url: data.profile_picture_url || "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch business profile:", err);
      toast.error("Could not load WhatsApp Business Profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (profile.websites && profile.websites.length > 2) {
      toast.error("Maximum 2 websites allowed.");
      return;
    }
    
    // Website validation (must start with http:// or https://)
    if (profile.websites?.some((url) => !url.startsWith("http://") && !url.startsWith("https://"))) {
      toast.error("Websites must start with http:// or https://");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("about", profile.about || "");
      formData.append("address", profile.address || "");
      formData.append("description", profile.description || "");
      formData.append("email", profile.email || "");
      formData.append("vertical", profile.vertical || "");
      formData.append("websites", JSON.stringify(profile.websites?.filter(Boolean) || []));

      if (profilePictureFile) {
        formData.append("profile_picture", profilePictureFile);
      }

      const res = await fetch(`/api/dashboard/${gymSlug}/whatsapp/business-profile`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      toast.success("WhatsApp Business Profile updated successfully!");
      setIsEditing(false);
      setProfilePictureFile(null);
      setPreviewUrl(null);
      await fetchProfile();
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving the profile.");
    } finally {
      setSaving(false);
    }
  };

  const updateWebsite = (index: number, value: string) => {
    const newWebsites = [...(profile.websites || [])];
    newWebsites[index] = value;
    setProfile({ ...profile, websites: newWebsites });
  };

  const addWebsite = () => {
    const current = profile.websites || [];
    if (current.length < 2) {
      setProfile({ ...profile, websites: [...current, "https://"] });
    }
  };

  const removeWebsite = (index: number) => {
    const newWebsites = (profile.websites || []).filter((_, i) => i !== index);
    setProfile({ ...profile, websites: newWebsites });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      toast.error("Only JPG and PNG images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture must be under 5MB.");
      return;
    }

    setProfilePictureFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  if (loading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 text-zinc-500 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 backdrop-blur-md">
        <RefreshCcw className="h-6 w-6 animate-spin text-cyan-400" />
        <span className="text-sm font-medium">Loading Business Profile...</span>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/60 p-8 backdrop-blur-2xl space-y-8 transition-all hover:border-zinc-700/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:bg-zinc-900/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-6 gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-white flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl">
              <Store className="w-5 h-5 text-cyan-400" />
            </div>
            WhatsApp Business Profile
          </h3>
          <p className="text-sm text-zinc-400 font-medium mt-2">
            Customize how your business appears to customers on WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md hover:shadow-lg flex items-center gap-2 border border-zinc-700"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                disabled={saving}
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 text-xs font-bold text-zinc-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 px-6 py-2.5 text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-2 transform hover:-translate-y-0.5"
              >
                {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="space-y-2 group">
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pink-500" />
              Profile Picture (JPG/PNG, Max 5MB)
            </label>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-20 h-20 rounded-full border border-zinc-800 bg-zinc-900 overflow-hidden flex items-center justify-center shrink-0">
                {(previewUrl || profile.profile_picture_url) ? (
                  <img src={previewUrl || profile.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-8 h-8 text-zinc-700" />
                )}
              </div>
              {isEditing ? (
                <div>
                  <label className="cursor-pointer rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-semibold text-white transition-all flex items-center gap-2 border border-zinc-700 inline-block">
                    <Upload className="w-4 h-4" />
                    Upload Image
                    <input type="file" accept="image/jpeg, image/png" className="hidden" onChange={handleFileChange} />
                  </label>
                  {profilePictureFile && (
                    <p className="text-xs text-zinc-400 mt-2 truncate w-40">
                      {profilePictureFile.name}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium text-zinc-500">
                  {profile.profile_picture_url ? "Current Picture" : "No picture set"}
                </p>
              )}
            </div>
          </div>

          {/* About */}
          <div className="space-y-2 group">
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-500" />
              About Text (Max 139 chars)
            </label>
            {isEditing ? (
              <input
                type="text"
                maxLength={139}
                value={profile.about}
                onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                placeholder="e.g. We help you achieve your fitness goals."
              />
            ) : (
              <p className="text-base font-semibold text-white bg-zinc-900/30 px-4 py-3 rounded-xl border border-transparent">
                {profile.about || "—"}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2 group">
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              Description (Max 512 chars)
            </label>
            {isEditing ? (
              <textarea
                maxLength={512}
                rows={3}
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                placeholder="Detailed description of your gym, facilities, and services."
              />
            ) : (
              <p className="text-base font-medium text-zinc-300 bg-zinc-900/30 px-4 py-3 rounded-xl border border-transparent min-h-[80px]">
                {profile.description || "—"}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2 group">
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              Address
            </label>
            {isEditing ? (
              <textarea
                maxLength={256}
                rows={2}
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                placeholder="Your gym's physical address"
              />
            ) : (
              <p className="text-base font-medium text-zinc-300 bg-zinc-900/30 px-4 py-3 rounded-xl border border-transparent">
                {profile.address || "—"}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Email */}
          <div className="space-y-2 group">
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Mail className="w-4 h-4 text-rose-500" />
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                maxLength={128}
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                placeholder="contact@yourgym.com"
              />
            ) : (
              <p className="text-base font-medium text-white bg-zinc-900/30 px-4 py-3 rounded-xl border border-transparent">
                {profile.email || "—"}
              </p>
            )}
          </div>

          {/* Vertical (Industry) */}
          <div className="space-y-2 group">
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-500" />
              Industry Category
            </label>
            {isEditing ? (
              <select
                value={profile.vertical}
                onChange={(e) => setProfile({ ...profile, vertical: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer appearance-none"
              >
                {VERTICALS.map((v) => (
                  <option key={v.value} value={v.value} className="bg-zinc-900">
                    {v.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-base font-medium text-white bg-zinc-900/30 px-4 py-3 rounded-xl border border-transparent">
                {VERTICALS.find(v => v.value === profile.vertical)?.label || profile.vertical || "—"}
              </p>
            )}
          </div>

          {/* Websites */}
          <div className="space-y-3 group">
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                Websites (Max 2)
              </span>
              {isEditing && (profile.websites?.length || 0) < 2 && (
                <button
                  type="button"
                  onClick={addWebsite}
                  className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </label>
            
            <div className="space-y-3">
              {profile.websites && profile.websites.length > 0 ? (
                profile.websites.map((website, index) => (
                  <div key={index} className="flex gap-2">
                    {isEditing ? (
                      <>
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => updateWebsite(index, e.target.value)}
                          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="https://www.yourgym.com"
                        />
                        <button
                          type="button"
                          onClick={() => removeWebsite(index)}
                          className="p-3 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <a
                        href={website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-medium text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-500/30 hover:decoration-blue-400 transition-all bg-zinc-900/30 px-4 py-3 rounded-xl w-full block truncate"
                      >
                        {website}
                      </a>
                    )}
                  </div>
                ))
              ) : (
                !isEditing && <p className="text-sm text-zinc-500 italic bg-zinc-900/30 px-4 py-3 rounded-xl border border-transparent">No websites added</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
