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
      const token = await user.getIdToken();
      await createBatch(
        {
          name,
          subject,
          gradeClass,
          monthlyFee: Number(monthlyFee),
          schedule,
        },
        token
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
          className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Create New Batch
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Set up a class schedule and monthly fee structure
          </p>
        </div>
      </div>

      {error && (
        <div
          className="p-3 text-sm rounded-lg"
          style={{
            backgroundColor: "rgb(239 68 68 / 0.1)",
            color: "var(--color-error)",
            border: "1px solid rgb(239 68 68 / 0.2)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] space-y-6 shadow-sm"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="batch-name"
              className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]"
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
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="batch-subject"
                className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]"
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
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="batch-class"
                className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]"
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
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="batch-fee"
              className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]"
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
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
            />
          </div>
        </div>

        {/* Schedule Builder */}
        <div className="pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                Class Days & Time Slots
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Specify weekly schedule for this batch
              </p>
            </div>
            <button
              type="button"
              onClick={addScheduleSlot}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Day
            </button>
          </div>

          <div className="space-y-3">
            {schedule.map((slot, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              >
                <select
                  value={slot.day}
                  onChange={(e) => updateScheduleSlot(index, "day", e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none"
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
                  className="flex-1 px-3 py-1.5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none"
                />

                {schedule.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeScheduleSlot(index)}
                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Footer */}
        <div className="pt-4 border-t border-[var(--color-border)] flex justify-end gap-3">
          <Link
            href="/tutor/batches"
            className="px-4 py-2.5 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
            }}
          >
            {loading ? "Creating Batch..." : "Create Batch"}
          </button>
        </div>
      </form>
    </div>
  );
}
