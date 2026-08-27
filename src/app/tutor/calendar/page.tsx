"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar,
  BookOpen,
  Award,
  FileText,
  Megaphone,
  Loader2,
  Trash2,
} from "lucide-react";
import { getCalendarEvents, createEvent, deleteEvent } from "@/actions/calendarActions";
import type { CalendarEvent } from "@/types";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type EventType = "class" | "exam" | "assignment" | "event";

const EVENT_CONFIG: Record<EventType, { dot: string; bg: string; text: string; icon: any }> = {
  class:      { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", icon: BookOpen },
  exam:       { dot: "bg-orange-500",  bg: "bg-orange-50 dark:bg-orange-950",   text: "text-orange-700 dark:text-orange-300",   icon: Award },
  assignment: { dot: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-950",       text: "text-blue-700 dark:text-blue-300",       icon: FileText },
  event:      { dot: "bg-purple-500",  bg: "bg-purple-50 dark:bg-purple-950",   text: "text-purple-700 dark:text-purple-300",   icon: Megaphone },
};

export default function TutorCalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const {
    data: events = [],
    isLoading: loading,
    mutate: mutateEvents,
  } = useSWR<CalendarEvent[]>(
    user?.id ? `tutor-calendar-${year}-${month}` : null,
    () => getCalendarEvents(year, month),
    { dedupingInterval: 60_000 }
  );

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function dateStr(d: number) {
    return `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  function eventsForDay(d: number) {
    return events.filter(e => e.date === dateStr(d));
  }

  const selectedEvents = selectedDay ? events.filter(e => e.date === selectedDay) : [];
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  async function handleAddEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createEvent(formData);
      setShowAddModal(false);
      mutateEvents();
    } catch (err: any) {
      setAddError(err.message || "Failed to create event");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent(eventId);
      mutateEvents();
      setSelectedDay(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete event");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            📅 Calendar
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Class schedules, exams, assignments & custom events
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)" }}
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <Icon className="w-3.5 h-3.5" />
              <span className="capitalize">{type}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <button onClick={prevMonth} className="p-1.5 rounded-xl transition-all hover:bg-[var(--color-bg-secondary)] active:scale-90">
              <ChevronLeft className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
            </button>
            <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              {MONTHS[month - 1]} {year}
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-xl transition-all hover:bg-[var(--color-bg-secondary)] active:scale-90">
              <ChevronRight className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--color-border)" }}>
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                const ds = day ? dateStr(day) : null;
                const dayEvents = day ? eventsForDay(day) : [];
                const isToday = ds === todayStr;
                const isSelected = ds === selectedDay;
                const isWeekend = idx % 7 === 0 || idx % 7 === 6;
                const uniqueTypes = [...new Set(dayEvents.map(e => e.type as EventType))];

                return (
                  <div
                    key={idx}
                    onClick={() => day && setSelectedDay(isSelected ? null : ds!)}
                    className="relative min-h-[72px] p-1.5 transition-colors select-none"
                    style={{
                      borderRight: (idx + 1) % 7 !== 0 ? "1px solid var(--color-border)" : undefined,
                      borderBottom: idx < cells.length - 7 ? "1px solid var(--color-border)" : undefined,
                      background: isSelected
                        ? "var(--color-primary-50)"
                        : isWeekend && day
                        ? "var(--color-bg-secondary)"
                        : "transparent",
                      cursor: day ? "pointer" : "default",
                    }}
                  >
                    {day && (
                      <>
                        <div
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold mb-1`}
                          style={{
                            background: isToday ? "var(--color-primary)" : "transparent",
                            color: isToday ? "white" : isSelected ? "var(--color-primary)" : "var(--color-text)",
                          }}
                        >
                          {day}
                        </div>
                        <div className="flex flex-wrap gap-0.5">
                          {uniqueTypes.slice(0, 4).map(t => (
                            <div key={t} className={`w-1.5 h-1.5 rounded-full ${EVENT_CONFIG[t]?.dot || "bg-gray-400"}`} />
                          ))}
                          {dayEvents.length > 4 && (
                            <span className="text-[8px] font-bold" style={{ color: "var(--color-text-muted)" }}>
                              +{dayEvents.length - 4}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {selectedDay ? (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                  {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                <button onClick={() => setSelectedDay(null)} style={{ color: "var(--color-text-muted)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: "var(--color-text-muted)" }}>No events this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(ev => {
                    const cfg = EVENT_CONFIG[ev.type as EventType] || EVENT_CONFIG.event;
                    const Icon = cfg.icon;
                    return (
                      <div key={ev.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${cfg.bg} ${cfg.text}`} style={{ borderColor: "transparent" }}>
                        <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-snug">{ev.title}</p>
                          {ev.batchName && <p className="text-[10px] opacity-70 mt-0.5">{ev.batchName}</p>}
                        </div>
                        {ev.type === "event" && (
                          <button onClick={() => handleDelete(ev.id)} className="opacity-50 hover:opacity-100 transition-opacity shrink-0">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setShowAddModal(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border transition-all hover:bg-[var(--color-bg-secondary)]"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                <Plus className="w-3 h-3" /> Add event this day
              </button>
            </div>
          ) : (
            <div className="rounded-2xl p-6 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: "var(--color-text-muted)" }} />
              <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Click any date to see events</p>
            </div>
          )}

          {/* Month stats */}
          {!loading && (
            <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
                {MONTHS[month - 1]} Stats
              </h4>
              <div className="space-y-2.5">
                {(["class","exam","assignment","event"] as EventType[]).map(type => {
                  const count = events.filter(e => e.type === type).length;
                  const cfg = EVENT_CONFIG[type];
                  const Icon = cfg.icon;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <Icon className="w-3 h-3" style={{ color: "var(--color-text-muted)" }} />
                        <span className="text-xs capitalize" style={{ color: "var(--color-text-secondary)" }}>{type}s</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: count > 0 ? "var(--color-text)" : "var(--color-text-muted)" }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-2xl p-5 shadow-2xl"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Add Custom Event</h3>
              <button onClick={() => { setShowAddModal(false); setAddError(""); }} style={{ color: "var(--color-text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Title *</label>
                <input
                  name="title" required placeholder="e.g. Eid Holiday"
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Date *</label>
                <input
                  name="eventDate" type="date" required
                  defaultValue={selectedDay || todayStr}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Type *</label>
                <select
                  name="type" required
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                >
                  <option value="holiday">🏖️ Holiday</option>
                  <option value="announcement">📢 Announcement</option>
                  <option value="other">📌 Other</option>
                </select>
              </div>

              {addError && (
                <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "var(--color-error-bg,#fee2e2)", color: "var(--color-error,#dc2626)" }}>
                  {addError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowAddModal(false); setAddError(""); }}
                  className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl border"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-60 flex items-center justify-center gap-1"
                  style={{ background: "var(--color-primary)" }}>
                  {addLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  {addLoading ? "Adding..." : "Add Event"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
