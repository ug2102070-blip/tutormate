"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { getCalendarEvents, createEvent, deleteEvent } from "@/actions/calendarActions";
import { CalendarEvent } from "@/types";
import { format, startOfMonth, getDaysInMonth, getDay, addMonths, subMonths, isSameDay } from "date-fns";
import { useRouter } from "next/navigation";

export function HeaderCalendar({ role }: { role: "tutor" | "student" }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  // For tutor event creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        if (!showCreateModal) setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCreateModal]);

  const loadEvents = async (date: Date) => {
    setLoading(true);
    try {
      const data = await getCalendarEvents(date.getFullYear(), date.getMonth() + 1);
      setEvents(data || []);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadEvents(currentDate);
    }
  }, [isOpen, currentDate]);

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const monthStart = startOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(monthStart);
  const startDayOfWeek = getDay(monthStart);

  const days = (Array.from({ length: startDayOfWeek }, () => null) as (Date | null)[])
    .concat(Array.from({ length: daysInMonth }, (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)));

  const selectedDateEvents = selectedDate 
    ? events.filter(e => e.date === format(selectedDate, "yyyy-MM-dd"))
    : [];

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      // Fallback date if not selected
      if (!formData.get("eventDate") && selectedDate) {
        formData.set("eventDate", format(selectedDate, "yyyy-MM-dd"));
      }
      await createEvent(formData);
      setShowCreateModal(false);
      loadEvents(currentDate);
    } catch (err) {
      console.error(err);
      alert("Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent(id);
      loadEvents(currentDate);
    } catch (err) {
      console.error(err);
      alert("Failed to delete event");
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl transition-colors border hover:border-slate-200 ${isOpen ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 text-indigo-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50'}`}
        aria-label="Calendar"
      >
        <CalendarDays className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0b0f19]/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">
              {format(currentDate, "MMMM yyyy")}
            </h3>
            <div className="flex items-center gap-1">
              {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin mr-2" />}
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-600 dark:text-slate-400">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNextMonth} className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-600 dark:text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            <div className="grid grid-cols-7 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const dateStr = format(day, "yyyy-MM-dd");
                const dayEvents = events.filter(e => e.date === dateStr);
                const hasEvents = dayEvents.length > 0;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`relative aspect-square flex items-center justify-center text-sm font-medium rounded-full transition-all hover:bg-indigo-50 hover:text-indigo-600
                      ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white shadow-sm' : ''}
                      ${isToday && !isSelected ? 'text-indigo-600 font-bold bg-indigo-50/50' : ''}
                      ${!isSelected && !isToday ? 'text-slate-700 dark:text-slate-300' : ''}
                    `}
                  >
                    {format(day, "d")}
                    {hasEvents && !isSelected && (
                      <div className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Events List for Selected Date */}
          <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#0b0f19] p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a date"}
              </h4>
              {role === "tutor" && selectedDate && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-xs flex items-center gap-1 text-indigo-600 font-semibold hover:text-indigo-700 bg-indigo-100/50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>

            {selectedDateEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDateEvents.map(event => (
                  <div key={event.id} className="group flex items-start gap-3 bg-white dark:bg-[#131b2e] p-2.5 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${event.type === 'exam' ? 'bg-orange-500' : event.type === 'assignment' ? 'bg-blue-500' : event.type === 'class' ? 'bg-green-500' : 'bg-purple-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">{event.title}</p>
                      {event.batchName && (
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{event.batchName}</p>
                      )}
                    </div>
                    {role === "tutor" && event.type === "event" && (
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete event"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4 font-medium">No events for this day.</p>
            )}
          </div>

          {/* Create Modal Overlay */}
          {showCreateModal && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col p-4 animate-in fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">New Event</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-medium">&times;</button>
              </div>
              <form onSubmit={handleCreateSubmit} className="space-y-3 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Title</label>
                  <input type="text" name="title" required placeholder="e.g. Eid Holiday" className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Date</label>
                  <input type="date" name="eventDate" required defaultValue={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""} className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Type</label>
                  <select name="type" required className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                    <option value="announcement">Announcement</option>
                    <option value="holiday">Holiday</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Batch (Optional ID)</label>
                  <input type="text" name="batchId" placeholder="UUID or leave empty for all" className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                    {isSubmitting ? "Saving..." : "Save Event"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
