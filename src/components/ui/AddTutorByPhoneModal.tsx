"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Phone,
  Search,
  Loader2,
  User,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { lookupTutorByPhone, addTutorToCenterByPhone } from "@/actions/ownerActions";

interface TutorLookupResult {
  found: boolean;
  tutor?: {
    tutorId: string;
    fullName: string;
    institution: string;
    contactPhone: string;
    alreadyInCenter: boolean;
  };
  message?: string;
}

interface AddTutorByPhoneModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddTutorByPhoneModal({ onClose, onAdded }: AddTutorByPhoneModalProps) {
  const [phone, setPhone] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "done" | "error">("idle");
  const [lookupResult, setLookupResult] = useState<TutorLookupResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (value: string) => {
    if (value.replace(/\D/g, "").length < 7) {
      setSearchStatus("idle");
      setLookupResult(null);
      return;
    }
    setSearchStatus("searching");
    setLookupResult(null);
    try {
      const res = await lookupTutorByPhone(value);
      setLookupResult(res);
      setSearchStatus("done");
    } catch {
      setSearchStatus("error");
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!phone) { setSearchStatus("idle"); setLookupResult(null); return; }
    debounceRef.current = setTimeout(() => doSearch(phone), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [phone, doSearch]);

  const handleAdd = async () => {
    if (!lookupResult?.tutor) return;
    setAdding(true);
    setAddError(null);
    try {
      await addTutorToCenterByPhone(lookupResult.tutor.tutorId);
      setAddSuccess(true);
      setTimeout(() => { onAdded(); onClose(); }, 1500);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add tutor.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white dark:bg-[#131b2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add Teacher by Phone
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Add registered teachers to your coaching center
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Phone Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Teacher Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                autoFocus
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className={`w-full pl-10 pr-10 py-3 text-sm rounded-xl border transition-all outline-none
                  ${searchStatus === "done" && lookupResult?.found
                    ? "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-500/5"
                    : searchStatus === "done" && !lookupResult?.found
                    ? "border-amber-400 bg-amber-50/30"
                    : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50"
                  } text-slate-900 dark:text-slate-100 focus:border-indigo-500`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {searchStatus === "searching" && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                {searchStatus === "done" && lookupResult?.found && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {searchStatus === "done" && !lookupResult?.found && <AlertCircle className="w-4 h-4 text-amber-500" />}
                {searchStatus === "error" && <AlertCircle className="w-4 h-4 text-rose-500" />}
                {searchStatus === "idle" && phone.length === 0 && <Search className="w-4 h-4 text-slate-300" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1.5 px-0.5">
              Search starts automatically as you type
            </p>
          </div>

          {/* Result */}
          {searchStatus === "done" && lookupResult && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              {lookupResult.found && lookupResult.tutor ? (
                <div className={`p-4 rounded-xl border ${
                  lookupResult.tutor.alreadyInCenter
                    ? "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
                    : "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center text-sm font-extrabold text-amber-700 dark:text-amber-400 shrink-0">
                      {lookupResult.tutor.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {lookupResult.tutor.fullName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                        {lookupResult.tutor.institution}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        {lookupResult.tutor.contactPhone}
                      </p>
                    </div>
                    {lookupResult.tutor.alreadyInCenter ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 shrink-0">
                        Already Added
                      </span>
                    ) : (
                      <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                  </div>

                  {lookupResult.tutor.alreadyInCenter && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 pt-2 border-t border-slate-200 dark:border-white/10">
                      This teacher is already added to your center.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {lookupResult.message || "No teacher found with this phone number."}
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1 font-medium">
                    Please ask the teacher to register on TutorMate first.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Add error */}
          {addError && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 text-sm text-rose-700 dark:text-rose-400 font-medium animate-in fade-in duration-200">
              {addError}
            </div>
          )}

          {/* Success */}
          {addSuccess && (
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">
                Teacher successfully added to center!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={adding}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={
              adding ||
              addSuccess ||
              !lookupResult?.found ||
              lookupResult?.tutor?.alreadyInCenter
            }
            className="flex-1 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {adding ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Add to Center</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
