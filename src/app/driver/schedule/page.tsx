'use client';

import { useState, useEffect, useCallback } from 'react';
import { DriverLayout } from '@/components/driver-layout';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/ui/loading-state';
import { DayOfWeek, ScheduleExceptionType } from '@prisma/client';
import {
  DriverScheduleOverviewDTO,
  WeeklyScheduleEntryDTO,
} from '@/modules/driver/domain/schedule-types';

const DAYS_LIST: { day: DayOfWeek; label: string }[] = [
  { day: DayOfWeek.MONDAY, label: 'Monday' },
  { day: DayOfWeek.TUESDAY, label: 'Tuesday' },
  { day: DayOfWeek.WEDNESDAY, label: 'Wednesday' },
  { day: DayOfWeek.THURSDAY, label: 'Thursday' },
  { day: DayOfWeek.FRIDAY, label: 'Friday' },
  { day: DayOfWeek.SATURDAY, label: 'Saturday' },
  { day: DayOfWeek.SUNDAY, label: 'Sunday' },
];

export default function DriverSchedulePage() {
  const [scheduleData, setScheduleData] = useState<DriverScheduleOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Editable Weekly Schedule state
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyScheduleEntryDTO[]>([]);

  // Exception form state
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [excDate, setExcDate] = useState('');
  const [excType, setExcType] = useState<ScheduleExceptionType>(ScheduleExceptionType.OFF);
  const [excStart, setExcStart] = useState('09:00');
  const [excEnd, setExcEnd] = useState('18:00');
  const [excReason, setExcReason] = useState('');
  const [submittingException, setSubmittingException] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch('/api/driver/schedule');
      const data = await res.json();

      if (res.ok && data.data) {
        const overview = data.data as DriverScheduleOverviewDTO;
        setScheduleData(overview);

        // Populate weekly form state ensuring all 7 days present
        const map = new Map(overview.weeklySchedule.map((e) => [e.dayOfWeek, e]));
        const entries: WeeklyScheduleEntryDTO[] = DAYS_LIST.map(({ day }) => {
          const found = map.get(day);
          if (found) return { ...found };
          return {
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '18:00',
            timezone: overview.timezone || 'Asia/Kolkata',
            isActive: false,
            isOvernight: false,
          };
        });
        setWeeklyEntries(entries);
      } else {
        throw new Error(data.message || 'Failed to load schedule');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error loading schedule', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadInitialSchedule() {
      try {
        const res = await fetch('/api/driver/schedule');
        const data = await res.json();
        if (ignore) return;

        if (res.ok && data.data) {
          const overview = data.data as DriverScheduleOverviewDTO;
          setScheduleData(overview);

          const map = new Map(overview.weeklySchedule.map((e) => [e.dayOfWeek, e]));
          const entries: WeeklyScheduleEntryDTO[] = DAYS_LIST.map(({ day }) => {
            const found = map.get(day);
            if (found) return { ...found };
            return {
              dayOfWeek: day,
              startTime: '09:00',
              endTime: '18:00',
              timezone: overview.timezone || 'Asia/Kolkata',
              isActive: false,
              isOvernight: false,
            };
          });
          setWeeklyEntries(entries);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setToast({
            message: err instanceof Error ? err.message : 'Error loading schedule',
            type: 'error',
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadInitialSchedule();
    return () => {
      ignore = true;
    };
  }, []);

  const handleEntryToggle = (day: DayOfWeek) => {
    setWeeklyEntries((prev) =>
      prev.map((e) => (e.dayOfWeek === day ? { ...e, isActive: !e.isActive } : e)),
    );
  };

  const handleTimeChange = (day: DayOfWeek, field: 'startTime' | 'endTime', val: string) => {
    setWeeklyEntries((prev) =>
      prev.map((e) => {
        if (e.dayOfWeek === day) {
          const updated = { ...e, [field]: val };
          const startMin =
            parseInt(updated.startTime.split(':')[0], 10) * 60 +
            parseInt(updated.startTime.split(':')[1], 10);
          const endMin =
            parseInt(updated.endTime.split(':')[0], 10) * 60 +
            parseInt(updated.endTime.split(':')[1], 10);
          updated.isOvernight = endMin <= startMin;
          return updated;
        }
        return e;
      }),
    );
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/driver/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: weeklyEntries.map((e) => ({
            dayOfWeek: e.dayOfWeek,
            startTime: e.startTime,
            endTime: e.endTime,
            timezone: e.timezone || 'Asia/Kolkata',
            isActive: e.isActive,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save schedule');
      }

      showToast('Weekly shift schedule updated successfully!');
      fetchSchedule();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error saving schedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excDate) {
      showToast('Please select a date for the exception', 'error');
      return;
    }

    try {
      setSubmittingException(true);
      const res = await fetch('/api/driver/schedule/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: excDate,
          exceptionType: excType,
          startTime: excType === ScheduleExceptionType.CUSTOM_HOURS ? excStart : null,
          endTime: excType === ScheduleExceptionType.CUSTOM_HOURS ? excEnd : null,
          reason: excReason.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add exception');
      }

      showToast('Schedule exception added successfully!');
      setShowExceptionModal(false);
      setExcReason('');
      fetchSchedule();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error adding exception', 'error');
    } finally {
      setSubmittingException(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      const res = await fetch(`/api/driver/schedule/exceptions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete exception');
      }
      showToast('Exception removed');
      fetchSchedule();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error removing exception', 'error');
    }
  };

  if (loading) {
    return (
      <DriverLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingState message="Loading your shift schedule…" />
        </div>
      </DriverLayout>
    );
  }

  const todayShift = scheduleData?.todayShift;

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-4 md:px-6 py-6 gap-6 max-w-6xl mx-auto">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border text-sm font-bold font-['Space_Grotesk'] ${
              toast.type === 'success'
                ? 'bg-[#25a475] text-[#00311f] border-[#68dba9]'
                : 'bg-[#93000a] text-[#ffdad6] border-[#ffb4ab]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        <PageHeader
          eyebrow="Shift & Roster Planning"
          title="Driver Schedule & Availability"
          subtitle="Configure your weekly working hours and planned leaves to stay dispatch eligible."
        />

        {/* Today's Shift Status Card */}
        <div className="p-6 rounded-2xl bg-[#181c24] border border-[#262a33] shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-inner ${
                todayShift?.isScheduled
                  ? 'bg-[#0053db]/20 text-[#70a1ff] border border-[#0053db]/50'
                  : 'bg-[#262a33] text-[#87948b] border border-[#31353e]'
              }`}
            >
              <span className="material-symbols-outlined text-3xl">
                {todayShift?.isScheduled ? 'schedule' : 'event_busy'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#87948b] uppercase tracking-wider">
                <span>TODAY ({todayShift?.dayOfWeek})</span>
                <span>•</span>
                <span
                  className={`font-bold ${
                    todayShift?.isScheduled ? 'text-[#68dba9]' : 'text-[#ff7675]'
                  }`}
                >
                  {todayShift?.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-0.5">
                {todayShift?.isScheduled
                  ? `Shift: ${todayShift.startTime} — ${todayShift.endTime}`
                  : 'No Active Shift Scheduled Today'}
              </h2>
              {todayShift?.isOvernight && (
                <span className="inline-block mt-1 text-[10px] text-[#f1c40f] bg-[#f39c12]/20 px-2 py-0.5 rounded border border-[#f39c12]/40 font-mono">
                  🌙 Overnight Shift (Crosses Midnight)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowExceptionModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-[#31353e] font-['Space_Grotesk'] w-full md:w-auto"
            >
              <span className="material-symbols-outlined text-base">event_note</span>
              <span>Request Leave / Exception</span>
            </button>
          </div>
        </div>

        {/* Weekly Schedule Section */}
        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#262a33] pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#68dba9]">calendar_view_week</span>
                Recurring Weekly Roster
              </h3>
              <p className="text-xs text-[#87948b] mt-0.5">
                Set your standard working hours for each day of the week (
                {scheduleData?.timezone || 'Asia/Kolkata'}).
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSchedule}
              className="px-5 py-2.5 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] disabled:opacity-50 text-[#003825] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md font-['Space_Grotesk']"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>{saving ? 'Saving…' : 'Save Weekly Schedule'}</span>
            </button>
          </div>

          {/* Weekly Days List */}
          <div className="space-y-3">
            {weeklyEntries.map((entry) => (
              <div
                key={entry.dayOfWeek}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  entry.isActive
                    ? 'bg-[#1c222d] border-[#0053db]/40 shadow-sm'
                    : 'bg-[#14171f] border-[#262a33] opacity-75'
                }`}
              >
                <div className="flex items-center gap-4 min-w-[160px]">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={entry.isActive}
                      onChange={() => handleEntryToggle(entry.dayOfWeek)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#262a33] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#68dba9]" />
                  </label>

                  <div>
                    <span className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] uppercase block">
                      {entry.dayOfWeek}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        entry.isActive ? 'text-[#68dba9]' : 'text-[#87948b]'
                      }`}
                    >
                      {entry.isActive ? 'ON SHIFT' : 'OFF'}
                    </span>
                  </div>
                </div>

                {entry.isActive ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#87948b] font-mono">Start:</span>
                      <input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) =>
                          handleTimeChange(entry.dayOfWeek, 'startTime', e.target.value)
                        }
                        className="bg-[#14171f] border border-[#31353e] rounded-lg px-3 py-1.5 text-xs text-[#dfe2ee] font-mono focus:outline-none focus:border-[#68dba9]"
                      />
                    </div>
                    <span className="text-xs text-[#87948b]">→</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#87948b] font-mono">End:</span>
                      <input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) =>
                          handleTimeChange(entry.dayOfWeek, 'endTime', e.target.value)
                        }
                        className="bg-[#14171f] border border-[#31353e] rounded-lg px-3 py-1.5 text-xs text-[#dfe2ee] font-mono focus:outline-none focus:border-[#68dba9]"
                      />
                    </div>
                    {entry.isOvernight && (
                      <span className="text-[10px] text-[#f1c40f] bg-[#f39c12]/20 px-2 py-1 rounded font-mono border border-[#f39c12]/40 shrink-0">
                        🌙 Overnight
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-[#87948b] italic">No shift active</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Schedule Exceptions & Leaves */}
        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
            <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#70a1ff]">event_note</span>
              Planned Leaves & Custom Schedule Overrides
            </h3>
          </div>

          {scheduleData?.exceptions && scheduleData.exceptions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scheduleData.exceptions.map((exc) => (
                <div
                  key={exc.id}
                  className="p-4 rounded-xl bg-[#1c222d] border border-[#262a33] flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#dfe2ee] font-mono">{exc.date}</span>
                      <span className="text-[10px] uppercase font-bold text-[#f1c40f] bg-[#f39c12]/20 px-2 py-0.5 rounded border border-[#f39c12]/40 font-mono">
                        {exc.exceptionType}
                      </span>
                    </div>
                    {exc.exceptionType === ScheduleExceptionType.CUSTOM_HOURS && (
                      <div className="text-xs text-[#68dba9] font-mono">
                        Custom Hours: {exc.startTime} — {exc.endTime}
                      </div>
                    )}
                    {exc.reason && (
                      <p className="text-xs text-[#bccac0] italic">&quot;{exc.reason}&quot;</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteException(exc.id)}
                    className="p-2 text-[#ff7675] hover:bg-[#93000a]/20 rounded-lg transition-colors"
                    title="Remove exception"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#87948b] italic py-2">
              No planned leaves or custom date exceptions configured.
            </p>
          )}
        </div>

        {/* Modal: Request Exception */}
        {showExceptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#181c24] border border-[#262a33] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Add Leave or Custom Date Override
                </h3>
                <button
                  type="button"
                  onClick={() => setShowExceptionModal(false)}
                  className="text-[#87948b] hover:text-[#dfe2ee]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleAddException} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#87948b] uppercase block mb-1 font-mono">
                    Exception Date
                  </label>
                  <input
                    type="date"
                    required
                    value={excDate}
                    onChange={(e) => setExcDate(e.target.value)}
                    className="w-full bg-[#14171f] border border-[#31353e] rounded-xl px-3 py-2 text-xs text-[#dfe2ee] font-mono focus:outline-none focus:border-[#68dba9]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#87948b] uppercase block mb-1 font-mono">
                    Type of Exception
                  </label>
                  <select
                    value={excType}
                    onChange={(e) => setExcType(e.target.value as ScheduleExceptionType)}
                    className="w-full bg-[#14171f] border border-[#31353e] rounded-xl px-3 py-2 text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                  >
                    <option value={ScheduleExceptionType.OFF}>Day Off</option>
                    <option value={ScheduleExceptionType.LEAVE}>Personal Leave</option>
                    <option value={ScheduleExceptionType.HOLIDAY}>Public Holiday</option>
                    <option value={ScheduleExceptionType.CUSTOM_HOURS}>
                      Custom Hours Override
                    </option>
                  </select>
                </div>

                {excType === ScheduleExceptionType.CUSTOM_HOURS && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-[#87948b] uppercase block mb-1 font-mono">
                        Start Time
                      </label>
                      <input
                        type="time"
                        required
                        value={excStart}
                        onChange={(e) => setExcStart(e.target.value)}
                        className="w-full bg-[#14171f] border border-[#31353e] rounded-xl px-3 py-2 text-xs text-[#dfe2ee] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#87948b] uppercase block mb-1 font-mono">
                        End Time
                      </label>
                      <input
                        type="time"
                        required
                        value={excEnd}
                        onChange={(e) => setExcEnd(e.target.value)}
                        className="w-full bg-[#14171f] border border-[#31353e] rounded-xl px-3 py-2 text-xs text-[#dfe2ee] font-mono"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-[#87948b] uppercase block mb-1 font-mono">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vehicle servicing, Family emergency"
                    value={excReason}
                    onChange={(e) => setExcReason(e.target.value)}
                    className="w-full bg-[#14171f] border border-[#31353e] rounded-xl px-3 py-2 text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExceptionModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#262a33] text-[#dfe2ee] text-xs font-bold font-['Space_Grotesk']"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingException}
                    className="px-5 py-2 rounded-xl bg-[#68dba9] text-[#003825] text-xs font-bold uppercase tracking-wider font-['Space_Grotesk'] disabled:opacity-50"
                  >
                    {submittingException ? 'Saving…' : 'Add Exception'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DriverLayout>
  );
}
