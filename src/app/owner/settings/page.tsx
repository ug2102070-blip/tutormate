"use client";

import { useEffect, useState } from "react";
import { Building2, Phone, MapPin, Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getOwnerCenterInfo, updateOwnerCenterInfo } from "@/actions/ownerActions";
import type { CoachingCenterDoc } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

export default function OwnerSettingsPage() {
  const { t, language } = useLanguage();
  const isBn = language === "bn";
  const [center, setCenter] = useState<CoachingCenterDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({ name: "", address: "", contactPhone: "" });

  useEffect(() => {
    (async () => {
      try {
        const data = await getOwnerCenterInfo();
        setCenter(data);
        if (data) {
          setForm({
            name: data.name ?? "",
            address: data.address ?? "",
            contactPhone: data.contactPhone ?? "",
          });
        }
      } catch (err: any) {
        setError(err.message);
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
      await updateOwnerCenterInfo(form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  if (!center) {
    return (
      <div className="rounded-2xl p-6 flex items-center gap-3"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-sm text-red-500">{t("owner.noCenterFound") || "No coaching center found. Create one from the Tutor portal."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          {t("owner.centerSettings") || "Center Settings"}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {t("owner.centerSettingsDesc") || "Update your coaching center information"}
        </p>
      </div>

      {/* Center Code Display */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
      >
        <Building2 className="w-5 h-5 shrink-0" style={{ color: "rgb(245,158,11)" }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
            {t("owner.centerJoinCode") || "Center Join Code"}
          </p>
          <p className="text-lg font-mono font-extrabold mt-0.5" style={{ color: "rgb(245,158,11)" }}>
            {center.code}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {t("owner.shareCodeDesc") || "Share this code with tutors so they can join your center."}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            {t("owner.centerInfo") || "Center Information"}
          </h2>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              {t("owner.centerNameLabel") || "Center Name"} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Bright Future Academy"
                required
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              {t("owner.addressLabel") || "Address"}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="e.g. Dhanmondi, Dhaka"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
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
              {t("owner.contactPhoneLabel") || "Contact Phone"}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
              <input
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="e.g. +880 1712 345678"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
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
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("owner.centerUpdateSuccess") || "Center information updated successfully!"}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-60"
          style={{ background: "rgb(245,158,11)" }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? (t("common.saving") || "Saving...") : (t("common.saveChanges") || "Save Changes")}
        </button>
      </form>

      {/* Info */}
      <div
        className="rounded-2xl p-4 text-xs space-y-1"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
      >
        <p className="font-semibold" style={{ color: "var(--color-text)" }}>{t("owner.centerDetails") || "Center Details"}</p>
        <p>{t("owner.created") || "Created:"} {new Date(center.createdAt).toLocaleDateString(isBn ? "bn-BD" : "en-BD", { year: "numeric", month: "long", day: "numeric" })}</p>
        <p>Center ID: <span className="font-mono opacity-70">{center.id}</span></p>
      </div>
    </div>
  );
}
