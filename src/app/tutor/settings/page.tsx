"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import type { TutorDoc } from "@/types";
import {
  Save,
  User,
  Phone,
  Wallet,
  ShieldCheck,
  Check,
  Palette,
  Key,
  Bell,
  Globe,
  MapPin,
  AlignLeft,
  Building2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Sliders,
} from "lucide-react";
import { ThemeSelect } from "@/components/ThemeSelect";
import { LanguageSelect } from "@/components/LanguageSelect";
import { useLanguage } from "@/context/LanguageContext";
import {
  getTutorProfile,
  updateTutorProfile,
  type TutorProfileInput,
} from "@/actions/tutorSettingsActions";

export default function TutorSettingsPage() {
  const { user, role, claims, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [tutor, setTutor] = useState<TutorDoc | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"profile" | "payouts" | "preferences" | "subscription">("profile");

  // Form State
  const [formData, setFormData] = useState<TutorProfileInput>({
    fullName: "",
    institution: "",
    contactPhone: "",
    bkashNumber: "",
    nagadNumber: "",
    bio: "",
    address: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    async function loadTutorProfile() {
      try {
        const data = await getTutorProfile();
        if (data) {
          setTutor(data);
          setFormData({
            fullName: data.fullName || user!.user_metadata?.full_name || "",
            institution: data.institution || "",
            contactPhone: data.contactPhone || "",
            bkashNumber: data.bkashNumber || "",
            nagadNumber: data.nagadNumber || "",
            bio: data.bio || "",
            address: data.address || "",
          });
        } else {
          setFormData({
            fullName: user!.user_metadata?.full_name || user!.email?.split("@")[0] || "",
            institution: "Independent",
            contactPhone: "",
            bkashNumber: "",
            nagadNumber: "",
            bio: "",
            address: "",
          });
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
      await updateTutorProfile(formData);
      await refreshUser();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to update profile. Please check your inputs.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const userInitials = (formData.fullName || user?.email || "T")
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-40 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
        <div className="h-96 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Profile Banner Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-black text-xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {formData.fullName || "Tutor Account"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  Verified Tutor
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-1 font-medium flex items-center gap-2 flex-wrap">
                <span>{user?.email}</span>
                <span>•</span>
                <span>{formData.institution || "Independent Coaching"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/tutor/notifications"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </Link>
            {(role === "owner" || role === "admin") && (
              <Link
                href="/tutor/permissions"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" /> Permissions
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {success && (
        <div
          className="px-4 py-3 text-sm font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-xs"
          role="status"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {t("settings.updatedSuccess") || "Settings updated successfully!"}
        </div>
      )}

      {error && (
        <div
          className="px-4 py-3 text-sm font-semibold rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-xs"
          role="alert"
        >
          <ShieldCheck className="w-5 h-5 text-rose-600" />
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "profile"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <User className="w-4 h-4" />
          {t("settings.profileBranding")}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payouts")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "payouts"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Payment Numbers (bKash/Nagad)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "preferences"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Language & Appearance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("subscription")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "subscription"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {t("settings.subscriptionStatus")}
        </button>
      </div>

      {/* TAB 1: Profile & Branding */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  {t("settings.profileBranding")}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your public coaching profile, contact details, and credentials.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {t("settings.fullName")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="e.g. MD Jahid Hasan"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131b2e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="institution"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {t("settings.institution")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      id="institution"
                      name="institution"
                      type="text"
                      value={formData.institution}
                      onChange={handleInputChange}
                      placeholder={t("settings.institutionPlaceholder") || "e.g. Excellence Coaching"}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131b2e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contactPhone"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {t("settings.contactPhone")} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      required
                      value={formData.contactPhone}
                      onChange={handleInputChange}
                      placeholder="01712345678"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131b2e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {t("settings.address")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address || ""}
                    onChange={handleInputChange}
                    placeholder={t("settings.addressPlaceholder") || "e.g. Dhanmondi, Dhaka"}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131b2e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="bio"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {t("settings.bio")}
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  value={formData.bio || ""}
                  onChange={handleInputChange}
                  placeholder={t("settings.bioPlaceholder") || "Write a little bit about your experience, subjects you teach..."}
                  className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131b2e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-y"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? (t("common.saving") || "Saving...") : (t("common.save") || "Save Changes")}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MFS Payment Numbers */}
      {activeTab === "payouts" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  {t("settings.paymentNumbers")}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  These numbers are displayed to students and parents during tuition fee collection.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* bKash Card */}
              <div className="p-4 rounded-xl border border-pink-200 dark:border-pink-500/20 bg-pink-50/20 dark:bg-pink-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-pink-700 dark:text-pink-400 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-pink-600 text-white font-black text-[10px]">
                      bKash
                    </span>
                    {t("settings.bkashNumber")}
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-pink-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="bkashNumber"
                    name="bkashNumber"
                    type="tel"
                    value={formData.bkashNumber || ""}
                    onChange={handleInputChange}
                    placeholder="01712345678"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-bold font-mono rounded-xl border border-pink-200 dark:border-pink-500/30 bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Used for instant student bKash payments.
                </p>
              </div>

              {/* Nagad Card */}
              <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-500/20 bg-orange-50/20 dark:bg-orange-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white font-black text-[10px]">
                      Nagad
                    </span>
                    {t("settings.nagadNumber")}
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-orange-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="nagadNumber"
                    name="nagadNumber"
                    type="tel"
                    value={formData.nagadNumber || ""}
                    onChange={handleInputChange}
                    placeholder="01812345678"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-bold font-mono rounded-xl border border-orange-200 dark:border-orange-500/30 bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Used for instant student Nagad payments.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? (t("common.saving") || "Saving...") : (t("common.save") || "Save Payment Numbers")}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Language & Appearance Preferences */}
      {activeTab === "preferences" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Language Preferences */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3">
              <Globe className="w-5 h-5 text-indigo-600" />
              {t("settings.langPref")}
            </div>
            <LanguageSelect />
          </div>

          {/* Appearance & Dark Mode */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3">
              <Palette className="w-5 h-5 text-indigo-600" />
              {t("settings.appearanceTheme")}
            </div>
            <ThemeSelect />
          </div>
        </div>
      )}

      {/* TAB 4: Plan & Subscription */}
      {activeTab === "subscription" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/20 dark:from-indigo-950/20 dark:via-[#131b2e] dark:to-[#131b2e] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 dark:border-indigo-500/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {t("settings.subscriptionStatus")}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("settings.subscriptionDesc")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  {tutor?.subscription?.status || "Active"}
                </span>
                <Link
                  href="/tutor/subscription"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("settings.manageUpgrade")}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200/80 dark:border-white/5">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("subscription.currentPlan") || "Current Plan"}
                </div>
                <div className="text-base font-black text-indigo-600 dark:text-indigo-400 capitalize mt-1">
                  {tutor?.subscription?.plan?.replace("_", " ") || "Free Trial"}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200/80 dark:border-white/5">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("settings.studentCapacity")}
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {t("settings.upTo")} {tutor?.subscription?.maxStudents || 50} Students
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200/80 dark:border-white/5">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("settings.validUntil")}
                </div>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  30 Days Free Trial
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
