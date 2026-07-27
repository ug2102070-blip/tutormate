"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  BookOpen,
  Award,
  FileText,
  Megaphone,
  Loader2,
  X,
} from "lucide-react";
import { getCalendarEvents } from "@/actions/calendarActions";
import type { CalendarEvent } from "@/types";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type EventType = "class" | "exam" | "assignment" | "event";

const EVENT_CONFIG: Record<EventType, { dot: string; bg: string; text: string; icon: any; label: string }> = {
  class:      { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", icon: BookOpen,  label: "Class" },
  exam:       { dot: "bg-orange-500",  bg: "bg-orange-50",  text: "text-orange-700",  icon: Award,     label: "Exam" },
  assignment: { dot: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-700",    icon: FileText,  label: "Assignment" },
  event:      { dot: "bg-purple-500",  bg: "bg-purple-50",  text: "text-purple-700",  icon: Megaphone, label: "Event" },
};

export default function StudentCalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getCalendarEvents(year, month, user.id);
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, month, user?.id]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

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
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const selectedEvents = selectedDay ? events.filter(e => e.date === selectedDay) : [];

  // Upcoming events (next 7 days)
  const upcoming = events
    .filter(e => e.date >= todayStr)
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          📅 My Schedule
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          View your class schedule, exams, and assignment deadlines
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <Icon className="w-3.5 h-3.5" />
              <span>{cfg.label}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
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

          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--color-border)" }}>
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                const ds = day ? dateStr(day) : null;
                const dayEvents = day ? events.filter(e => e.date === ds) : [];
                const isToday = ds === todayStr;
                const isSelected = ds === selectedDay;
                const uniqueTypes = [...new Set(dayEvents.map(e => e.type as EventType))];
                const isWeekend = idx % 7 === 0 || idx % 7 === 6;

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
                          className="w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold mb-1"
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
                      <div key={ev.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${cfg.bg} ${cfg.text}`}>
                        <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-snug">{ev.title}</p>
                          {ev.batchName && <p className="text-[10px] opacity-70 mt-0.5">{ev.batchName}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl p-6 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: "var(--color-text-muted)" }} />
              <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Tap a date to see events</p>
            </div>
          )}

          {/* Upcoming Events */}
          {!loading && upcoming.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
                Upcoming
              </h4>
              <div className="space-y-2">
                {upcoming.map(ev => {
                  const cfg = EVENT_CONFIG[ev.type as EventType] || EVENT_CONFIG.event;
                  const Icon = cfg.icon;
                  const evDate = new Date(ev.date + "T00:00:00");
                  return (
                    <div key={ev.id} className="flex items-start gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-tight truncate" style={{ color: "var(--color-text)" }}>
                          {ev.title}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                          {evDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
