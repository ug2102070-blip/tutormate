"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Save,
  User,
  Phone,
  MapPin,
  Building2,
  Globe,
  Palette,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Loader2,
} from "lucide-react";
import { ThemeSelect } from "@/components/ThemeSelect";
import { LanguageSelect } from "@/components/LanguageSelect";
import { useLanguage } from "@/context/LanguageContext";
import {
  getStudentProfile,
  updateStudentProfile,
  type StudentProfileInput,
  type StudentProfileDoc,
} from "@/actions/studentSettingsActions";

type Tab = "profile" | "preferences";

export default function StudentSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<StudentProfileDoc | null>(null);

  const [formData, setFormData] = useState<StudentProfileInput>({
    fullName: "",
    phone: "",
    institution: "",
    address: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const data = await getStudentProfile();
        if (data) {
          setProfile(data);
          setFormData({
            fullName: data.fullName || user!.user_metadata?.full_name || "",
            phone: data.phone || "",
            institution: data.institution || "",
            address: data.address || "",
          });
        } else {
          setFormData({
            fullName: user!.user_metadata?.full_name || user!.email?.split("@")[0] || "",
            phone: "",
            institution: "",
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

    load();
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await updateStudentProfile(formData);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to update profile. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const initials = (formData.fullName || user?.email || "S")
    .slice(0, 2)
    .toUpperCase();

  // ── Loading skeleton ──────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-36 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
        <div className="h-80 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
      </div>
    );
  }

  // ── Main Page ─────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">

      {/* ── Profile Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-cyan-900 via-indigo-950 to-slate-900 text-white p-6 shadow-sm">
        {/* Decorative orb */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white font-black text-xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {formData.fullName || "Student Account"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                Student
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1 font-medium flex items-center gap-2 flex-wrap">
              <span>{profile?.email ?? user?.email}</span>
              {formData.institution && (
                <>
                  <span>•</span>
                  <span>{formData.institution}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Feedback alerts ── */}
      {success && (
        <div
          className="px-4 py-3 text-sm font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-xs"
          role="status"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {t("settings.updatedSuccess") || "Profile updated successfully!"}
        </div>
      )}

      {error && (
        <div
          className="px-4 py-3 text-sm font-semibold rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-xs"
          role="alert"
        >
          <ShieldCheck className="w-5 h-5 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Tab nav ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { key: "profile", label: "My Profile", Icon: User },
            { key: "preferences", label: "Language & Appearance", Icon: Sliders },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === key
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          TAB 1 — Profile
      ════════════════════════════════════════ */}
      {activeTab === "profile" && (
        <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs space-y-5">
            {/* Header */}
            <div className="border-b border-slate-100 dark:border-white/5 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                {t("settings.profileBranding") || "Profile Information"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update your personal details and contact information.
              </p>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {t("settings.fullName") || "Full Name"}{" "}
                  <span className="text-rose-500">*</span>
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
                    onChange={handleChange}
                    placeholder="e.g. Rahim Uddin"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131b2e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {t("settings.contactPhone") || "Phone Number"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone ?? ""}
                    onChange={handleChange}
                    placeholder="01712345678"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131b2e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Institution + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="institution"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {t("settings.institution") || "School / College"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      id="institution"
                      name="institution"
                      type="text"
                      value={formData.institution ?? ""}
                      onChange={handleChange}
                      placeholder="e.g. Dhaka College"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131b2e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {t("settings.address") || "Address"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      value={formData.address ?? ""}
                      onChange={handleChange}
                      placeholder="e.g. Mirpur, Dhaka"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131b2e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              id="student-settings-save-btn"
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving
                ? t("common.saving") || "Saving..."
                : t("common.save") || "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {/* ════════════════════════════════════════
          TAB 2 — Preferences
      ════════════════════════════════════════ */}
      {activeTab === "preferences" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Language */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3">
              <Globe className="w-5 h-5 text-indigo-600" />
              {t("settings.langPref") || "Language Preference"}
            </div>
            <LanguageSelect />
          </div>

          {/* Theme */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3">
              <Palette className="w-5 h-5 text-indigo-600" />
              {t("settings.appearanceTheme") || "Appearance & Theme"}
            </div>
            <ThemeSelect />
          </div>
        </div>
      )}
    </div>
  );
}
