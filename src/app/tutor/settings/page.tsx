"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TutorDoc } from "@/types";
import { Save, User, Phone, Wallet, ShieldCheck, Check } from "lucide-react";

export default function TutorSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [tutor, setTutor] = useState<TutorDoc | null>(null);
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");
  const [nagadNumber, setNagadNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    async function loadTutorProfile() {
      try {
        const { data } = await supabase
          .from("tutors")
          .select("*")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (data) {
          setTutor({
            id: data.id,
            fullName: data.full_name,
            institution: data.institution,
            contactPhone: data.contact_phone,
            bkashNumber: data.bkash_number,
            nagadNumber: data.nagad_number,
            subscription: data.subscription,
            stats: { totalStudents: 0, activeBatches: 0, pendingDoubtsCount: 0 },
            createdAt: data.created_at,
          });
          setFullName(data.full_name || user!.user_metadata?.full_name || "");
          setInstitution(data.institution || "");
          setContactPhone(data.contact_phone || "");
          setBkashNumber(data.bkash_number || "");
          setNagadNumber(data.nagad_number || "");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load settings.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadTutorProfile();
  }, [user]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      // Update Supabase Auth metadata
      await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      // Update `tutors` table
      await supabase
        .from("tutors")
        .update({
          full_name: fullName,
          institution,
          contact_phone: contactPhone,
          bkash_number: bkashNumber || null,
          nagad_number: nagadNumber || null,
        })
        .eq("user_id", user.id);

      // Update `profiles` table
      await supabase
        .from("profiles")
        .update({
          display_name: fullName,
          phone_number: contactPhone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      await refreshUser();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-64 rounded-2xl animate-shimmer border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Account & Profile Settings
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">
          Manage your personal details, coaching branding, bKash/Nagad payment info, and subscription
        </p>
      </div>

      {success && (
        <div
          className="p-4 text-sm font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 animate-fade-in flex items-center gap-2"
          role="status"
        >
          <Check className="w-4 h-4 text-emerald-600" /> Settings updated successfully!
        </div>
      )}

      {error && (
        <div
          className="p-4 text-sm font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Personal & Branding Section */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white space-y-5 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-indigo-600" /> Profile & Coaching Branding
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="settings-name"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Full Name
              </label>
              <input
                id="settings-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="settings-institution"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Institution / Coaching Name
                </label>
                <input
                  id="settings-institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Excellence Coaching"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-phone"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Contact Phone
                </label>
                <input
                  id="settings-phone"
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="01712345678"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Numbers Section */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white space-y-5 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            <Wallet className="w-4 h-4 text-emerald-600" /> Fee Collection Payment Numbers (bKash / Nagad)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="settings-bkash"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5 text-pink-600" /> bKash Personal Number
              </label>
              <input
                id="settings-bkash"
                type="tel"
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value)}
                placeholder="01712345678"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="settings-nagad"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5 text-orange-600" /> Nagad Personal Number
              </label>
              <input
                id="settings-nagad"
                type="tel"
                value={nagadNumber}
                onChange={(e) => setNagadNumber(e.target.value)}
                placeholder="01812345678"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Subscription Info Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Subscription Plan Status
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              {tutor?.subscription?.status || "Active"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <div className="text-xs font-semibold text-slate-500">Current Plan</div>
              <div className="text-sm font-extrabold text-slate-900 capitalize mt-0.5">
                {tutor?.subscription?.plan?.replace("_", " ") || "Free Trial"}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500">Student Capacity Limit</div>
              <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                Up to {tutor?.subscription?.maxStudents || 50} Students
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500">Valid Until</div>
              <div className="text-sm font-extrabold text-indigo-700 mt-0.5">
                30 Days Free Trial
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
