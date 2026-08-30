"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, Phone, User, CheckCircle2, AlertCircle, X } from "lucide-react";
import { lookupProfileByPhone } from "@/actions/tutorStudentActions";

type LookupResult =
  | { found: false }
  | {
      found: true;
      type: "profile";
      profile: {
        uid: string;
        displayName: string;
        email: string;
        phone: string;
        role: "student" | "parent";
      };
    }
  | {
      found: true;
      type: "existing_student";
      existingStudent: {
        id: string;
        fullName: string;
        phone: string;
        authUid: string | null;
        inviteCode: string;
      };
    };

interface PhoneSearchInputProps {
  onFound?: (result: LookupResult) => void;
  onClear?: () => void;
  placeholder?: string;
  label?: string;
}

export default function PhoneSearchInput({
  onFound,
  onClear,
  placeholder = "01XXXXXXXXX",
  label = "Search by Phone Number",
}: PhoneSearchInputProps) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "found" | "not_found" | "error">("idle");
  const [result, setResult] = useState<LookupResult | null>(null);

  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;

  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  const lastSearchedRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (value: string) => {
    const clean = value.trim();
    if (clean.replace(/\D/g, "").length < 7) {
      setStatus("idle");
      setResult(null);
      lastSearchedRef.current = "";
      return;
    }

    if (clean === lastSearchedRef.current) {
      return;
    }

    lastSearchedRef.current = clean;
    setStatus("searching");
    try {
      const res = await lookupProfileByPhone({ phone: clean });
      if (res.success && res.data) {
        setResult(res.data);
        setStatus(res.data.found ? "found" : "not_found");
        onFoundRef.current?.(res.data);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!phone) {
      setStatus("idle");
      setResult(null);
      lastSearchedRef.current = "";
      onClearRef.current?.();
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(phone), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [phone, doSearch]);

  const handleClear = () => {
    setPhone("");
    setStatus("idle");
    setResult(null);
    lastSearchedRef.current = "";
    onClearRef.current?.();
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
        {label}
      </label>

      {/* Input */}
      <div className="relative">
        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-3 text-sm rounded-xl border transition-all outline-none
            ${status === "found"
              ? "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-500/5"
              : status === "not_found"
              ? "border-amber-400 bg-amber-50/30 dark:bg-amber-500/5"
              : status === "error"
              ? "border-rose-400 bg-rose-50/30"
              : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50"
            } text-slate-900 dark:text-slate-100 focus:border-indigo-500`}
        />

        {/* Right icon — state indicator or clear */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === "searching" && (
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
          )}
          {status === "found" && (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
          {status === "not_found" && (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          )}
          {status === "error" && (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          )}
          {phone && status === "idle" && (
            <button onClick={handleClear} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Result card */}
      {status === "found" && result && result.found && (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              {result.type === "profile" ? (
                <>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {result.profile.displayName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {result.profile.phone} · {result.profile.role === "student" ? "Student" : "Parent"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {result.existingStudent.fullName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {result.existingStudent.phone} · Already in your student list
                  </p>
                </>
              )}
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-auto" />
          </div>
        </div>
      )}

      {status === "not_found" && (
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 animate-in fade-in duration-200">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            No account found with this phone number. Use the manual form to create a new profile.
          </p>
        </div>
      )}

      {status === "error" && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium px-1">
          An error occurred while searching. Please try again.
        </p>
      )}
    </div>
  );
}
