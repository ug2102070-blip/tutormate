"use client";

import { useEffect, useState } from "react";
import {
  User,
  Phone,
  Mail,
  Save,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

export default function ParentSettingsPage() {
  const supabase = createClient();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [profile, setProfile] = useState({
    displayName: "",
    email: "",
    phone: "",
  });
  const [childName, setChildName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, email, phone_number")
          .eq("id", user.id)
          .maybeSingle();

        setProfile({
          displayName: prof?.display_name ?? "",
          email: prof?.email ?? user.email ?? "",
          phone: prof?.phone_number ?? "",
        });

        // Fetch linked child name
        const { data: link } = await supabase
          .from("parent_links")
          .select("student_id, students(full_name)")
          .eq("parent_uid", user.id)
          .limit(1)
          .single();

        if (link) {
          setChildName((link as any).students?.full_name ?? null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          display_name: profile.displayName.trim(),
          phone_number: profile.phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateErr) throw new Error(updateErr.message);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          {t("settings.title") || "Settings"}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {t("settings.parentSubtitle") || "Manage your parent profile"}
        </p>
      </div>

      {/* Child info card */}
      {childName && (
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "rgba(139,92,246,0.15)", color: "rgb(109,40,217)" }}
          >
            {childName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgb(109,40,217)" }}>
              {t("settings.monitoringChild") || "Monitoring Child"}
            </p>
            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              {childName}
            </p>
          </div>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            {t("settings.profileInfo") || "Profile Information"}
          </h2>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              {t("settings.fullName") || "Full Name"}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
              <input
                value={profile.displayName}
                onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                placeholder="Your full name"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              {t("settings.emailAddress") || "Email Address"} <span className="text-[10px] opacity-60">({t("settings.cannotChange") || "cannot change"})</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
              <input
                value={profile.email}
                disabled
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none opacity-60 cursor-not-allowed"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              {t("settings.phoneNumber") || "Phone Number"}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
              <input
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+880 1700 000000"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="rounded-xl px-4 py-2.5 text-xs font-semibold text-red-500 flex gap-2 items-center"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl px-4 py-2.5 text-xs font-semibold text-emerald-600 flex gap-2 items-center"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("settings.profileUpdated") || "Profile updated successfully!"}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--color-primary)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? (t("common.saving") || "Saving...") : (t("common.saveChanges") || "Save Changes")}
        </button>
      </form>

      {/* Sign Out */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--color-text)" }}>{t("settings.account") || "Account"}</h2>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "rgba(239,68,68,0.08)", color: "rgb(220,38,38)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <LogOut className="w-4 h-4" />
          {t("common.signOut") || "Sign Out"}
        </button>
      </div>
    </div>
  );
}
