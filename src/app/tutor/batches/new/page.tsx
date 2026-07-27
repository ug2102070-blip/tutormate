"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { createBatch } from "@/actions/batchActions";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export default function CreateBatchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeClass, setGradeClass] = useState("");
  const [monthlyFee, setMonthlyFee] = useState<number>(1500);
  const [schedule, setSchedule] = useState<Array<{ day: string; time: string }>>([
    { day: "Sun", time: "4:00 PM - 5:30 PM" },
    { day: "Tue", time: "4:00 PM - 5:30 PM" },
    { day: "Thu", time: "4:00 PM - 5:30 PM" },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function addScheduleSlot() {
    setSchedule([...schedule, { day: "Sun", time: "5:00 PM - 6:30 PM" }]);
  }

  function removeScheduleSlot(index: number) {
    setSchedule(schedule.filter((_, idx) => idx !== index));
  }

  function updateScheduleSlot(index: number, field: "day" | "time", value: string) {
    const updated = [...schedule];
    updated[index][field] = value;
    setSchedule(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setLoading(true);

    try {
      await createBatch(
        {
          name,
          subject,
          gradeClass,
          monthlyFee: Number(monthlyFee),
          schedule,
        },
        user.id
      );
      router.push("/tutor/batches");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create batch.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/tutor/batches"
          className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Create New Batch
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Set up a class schedule and monthly fee structure
          </p>
        </div>
      </div>

      {error && (
        <div
          className="p-4 text-sm rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-medium"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] space-y-6 shadow-xs"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="batch-name"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Batch Name
            </label>
            <input
              id="batch-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HSC Physics Batch A"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 text-slate-900 dark:text-slate-100 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="batch-subject"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Subject
              </label>
              <input
                id="batch-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 text-slate-900 dark:text-slate-100 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="batch-class"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Grade / Class
              </label>
              <input
                id="batch-class"
                type="text"
                required
                value={gradeClass}
                onChange={(e) => setGradeClass(e.target.value)}
                placeholder="e.g. 11-12 / HSC"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 text-slate-900 dark:text-slate-100 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="batch-fee"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Monthly Fee per Student (BDT ৳)
            </label>
            <input
              id="batch-fee"
              type="number"
              required
              min={0}
              step={100}
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(Number(e.target.value))}
              placeholder="1500"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 text-slate-900 dark:text-slate-100 focus:bg-white focus:border-indigo-600 outline-none transition-colors font-semibold"
            />
          </div>
        </div>

        {/* Schedule Builder */}
        <div className="pt-6 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Class Days & Time Slots
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Specify weekly schedule for this batch
              </p>
            </div>
            <button
              type="button"
              onClick={addScheduleSlot}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" /> Add Day
            </button>
          </div>

          <div className="space-y-3">
            {schedule.map((slot, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60"
              >
                <select
                  value={slot.day}
                  onChange={(e) => updateScheduleSlot(index, "day", e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] text-slate-900 dark:text-slate-100 outline-none"
                >
                  {daysOfWeek.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={slot.time}
                  onChange={(e) => updateScheduleSlot(index, "time", e.target.value)}
                  placeholder="e.g. 4:00 PM - 5:30 PM"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] text-slate-900 dark:text-slate-100 font-medium outline-none"
                />

                {schedule.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeScheduleSlot(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Footer */}
        <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3">
          <Link
            href="/tutor/batches"
            className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {loading ? "Creating Batch..." : "Create Batch"}
          </button>
        </div>
      </form>
    </div>
  );
}
