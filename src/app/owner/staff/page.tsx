"use client";

import { useState } from "react";
import { UserCheck, Plus, ShieldCheck, Mail, Phone, Trash2, KeyRound } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Accountant" | "Receptionist" | "Manager";
  status: "active" | "inactive";
  joinedDate: string;
}

export default function OwnerStaffPage() {
  const { t } = useLanguage();
  const [staff, setStaff] = useState<StaffMember[]>([
    {
      id: "1",
      name: "Tariqul Islam",
      email: "tariqul@coaching.com",
      phone: "+8801711223344",
      role: "Accountant",
      status: "active",
      joinedDate: "2026-01-10",
    },
    {
      id: "2",
      name: "Nusrat Jahan",
      email: "nusrat@coaching.com",
      phone: "+8801822334455",
      role: "Receptionist",
      status: "active",
      joinedDate: "2026-03-01",
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"Accountant" | "Receptionist" | "Manager">("Accountant");

  function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newStaff: StaffMember = {
      id: Date.now().toString(),
      name,
      email,
      phone: phone || "N/A",
      role,
      status: "active",
      joinedDate: new Date().toISOString().split("T")[0],
    };

    setStaff([...staff, newStaff]);
    setName("");
    setEmail("");
    setPhone("");
    setShowModal(false);
  }

  function handleDelete(id: string) {
    setStaff(staff.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <UserCheck className="w-6 h-6 text-amber-500" /> {t("owner.staffRoles") || "Staff & Roles Management"}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            {t("owner.staffRolesDesc") || "Manage administrative staff, receptionists, accountants, and permission roles"}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 shrink-0"
          style={{ background: "linear-gradient(135deg, rgb(217, 119, 6) 0%, rgb(180, 83, 9) 100%)" }}
        >
          <Plus className="w-4 h-4" /> {t("owner.addStaffBtn") || "Add Staff Account"}
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staff.map((member) => (
          <div
            key={member.id}
            className="p-5 rounded-2xl border space-y-4 transition-all hover:shadow-xs"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm border shrink-0"
                  style={{
                    background: "rgba(245, 158, 11, 0.12)",
                    color: "rgb(217, 119, 6)",
                    borderColor: "rgba(245, 158, 11, 0.3)",
                  }}
                >
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
                    {member.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {member.role}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> {t("owner.activeStatus") || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(member.id)}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                title={t("owner.removeStaff") || "Remove staff"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div
              className="p-3 rounded-xl space-y-1.5 text-xs"
              style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 opacity-60" /> {member.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 opacity-60" /> {member.phone}
              </div>
            </div>

            <div
              className="pt-2 border-t flex items-center justify-between text-[11px]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            >
              <span>{t("owner.joinedOn") || "Joined:"} {member.joinedDate}</span>
              <span className="flex items-center gap-1 font-semibold hover:underline cursor-pointer text-amber-600">
                <KeyRound className="w-3 h-3" /> {t("owner.editPermissions") || "Edit Permissions"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4 animate-scale-in"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <h2 className="text-base font-extrabold" style={{ color: "var(--color-text)" }}>
              {t("owner.addStaffTitle") || "Add Staff Member"}
            </h2>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  {t("owner.fullNameLabel") || "Full Name"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("owner.fullNamePlaceholder") || "e.g. Tariqul Islam"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  {t("owner.emailAddressLabel") || "Email Address"}
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@coaching.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  {t("owner.phoneNumberLabel") || "Phone Number"}
                </label>
                <input
                  type="tel"
                  placeholder="+88017..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  {t("owner.staffRoleLabel") || "Staff Role"}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                >
                  <option value="Accountant">{t("owner.roleAccountant") || "Accountant (Fees & Financials)"}</option>
                  <option value="Receptionist">{t("owner.roleReceptionist") || "Receptionist (Student Enrollments)"}</option>
                  <option value="Manager">{t("owner.roleManager") || "Coaching Manager (Full Ops)"}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                >
                  {t("common.cancel") || "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl"
                  style={{ background: "rgb(217, 119, 6)" }}
                >
                  {t("owner.addStaffBtn") || "Add Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
