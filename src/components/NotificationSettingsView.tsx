import React, { useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  Navigation,
} from 'lucide-react';
import {
  NotificationLogEntry,
  NotificationPreferences,
  Opportunity,
  ReminderOffset,
  ShiftBooking,
  TravelEstimate,
  VolunteerProfile,
} from '../types';
import {
  buildWhatsAppReminderPayload,
  REMINDER_OFFSET_LABELS,
  WhatsAppReminderPayload,
} from '../utils/notifications';

interface NotificationSettingsViewProps {
  volunteer: VolunteerProfile;
  opportunities: Opportunity[];
  bookings: ShiftBooking[];
  travelTimes: Record<string, TravelEstimate>;
  preferences: NotificationPreferences;
  notificationLog: NotificationLogEntry[];
  onUpdatePreferences: (next: NotificationPreferences) => void;
  onSimulateReminder: (payload: WhatsAppReminderPayload) => void;
  onViewMission: (opportunityId: string) => void;
  onPlanJourney: (opportunityId: string) => void;
  onConfirmAttendance: (opportunityId: string) => void;
}

export const NotificationSettingsView: React.FC<NotificationSettingsViewProps> = ({
  volunteer,
  opportunities,
  bookings,
  travelTimes,
  preferences,
  notificationLog,
  onUpdatePreferences,
  onSimulateReminder,
  onViewMission,
  onPlanJourney,
  onConfirmAttendance,
}) => {
  const confirmedBookings = useMemo(
    () =>
      bookings.filter(
        (b) => b.volunteerId === volunteer.id && b.status === 'Confirmed'
      ),
    [bookings, volunteer.id]
  );

  const selectableOpps = useMemo(() => {
    const confirmedOpps = confirmedBookings
      .map((b) => opportunities.find((o) => o.id === b.opportunityId))
      .filter((o): o is Opportunity => Boolean(o));
    return confirmedOpps.length > 0 ? confirmedOpps : opportunities.slice(0, 4);
  }, [confirmedBookings, opportunities]);

  const [selectedOppId, setSelectedOppId] = useState<string>(
    () => selectableOpps[0]?.id ?? 'opp-02'
  );
  const [selectedOffset, setSelectedOffset] = useState<ReminderOffset>('24h');

  const previewOpp =
    opportunities.find((o) => o.id === selectedOppId) ?? selectableOpps[0];
  const previewBooking = confirmedBookings.find(
    (b) => b.opportunityId === previewOpp?.id
  );
  const previewTravel = previewOpp ? travelTimes[previewOpp.id] : undefined;

  const previewPayload = useMemo(() => {
    if (!previewOpp) return null;
    return buildWhatsAppReminderPayload({
      volunteer,
      opportunity: previewOpp,
      travelMinutes: previewTravel?.minutes ?? null,
      distanceKm: previewTravel?.distanceKm,
      bufferMinutes: preferences.departureBufferMinutes,
      offsetLabel: REMINDER_OFFSET_LABELS[selectedOffset],
    });
  }, [
    previewOpp,
    volunteer,
    previewTravel,
    preferences.departureBufferMinutes,
    selectedOffset,
  ]);

  const toggleOffset = (offset: ReminderOffset) => {
    const exists = preferences.reminderOffsets.includes(offset);
    const nextOffsets = exists
      ? preferences.reminderOffsets.filter((o) => o !== offset)
      : [...preferences.reminderOffsets, offset];
    onUpdatePreferences({ ...preferences, reminderOffsets: nextOffsets });
  };

  const handleTriggerSimulation = () => {
    if (!previewPayload) return;
    onSimulateReminder(previewPayload);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Reminder Channels & Timing Controls */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Reminders &amp; Notifications
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Choose how and when you&apos;d like to be reminded about your upcoming missions.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300">
              <div>
                <p className="font-semibold text-slate-900">In-app reminders</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Show helpful confirmation banners and reminders while using MissionPossible.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.inAppEnabled}
                onChange={(e) =>
                  onUpdatePreferences({ ...preferences, inAppEnabled: e.target.checked })
                }
                className="w-5 h-5 mt-0.5 accent-teal-700"
              />
            </label>

            <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300">
              <div>
                <p className="font-semibold text-slate-900">
                  WhatsApp reminders (Preview only)
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Future integration. You can preview how reminders will look below—no real
                  WhatsApp messages are sent.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.whatsappEnabled}
                onChange={(e) =>
                  onUpdatePreferences({ ...preferences, whatsappEnabled: e.target.checked })
                }
                className="w-5 h-5 mt-0.5 accent-teal-700"
              />
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl bg-[#FAFAF9] border border-slate-200 text-xs sm:text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.consentAccepted}
                onChange={(e) =>
                  onUpdatePreferences({ ...preferences, consentAccepted: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 accent-teal-700 shrink-0"
              />
              <span>
                I&apos;d like to receive reminders, departure alerts, and schedule updates for
                missions I sign up for.
              </span>
            </label>
          </div>

          {/* Reminder Timing */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700">When should we remind you?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['24h', '3h', '1h'] as ReminderOffset[]).map((offset) => {
                const active = preferences.reminderOffsets.includes(offset);
                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => toggleOffset(offset)}
                    aria-pressed={active}
                    className={`px-3 min-h-[42px] text-xs font-semibold rounded-lg border text-left cursor-pointer transition-colors ${
                      active
                        ? 'bg-teal-50 border-teal-600 text-teal-900'
                        : 'bg-[#FAFAF9] border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {REMINDER_OFFSET_LABELS[offset]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Journey Departure & Shift Update Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2.5 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.departureRemindersEnabled}
                  onChange={(e) =>
                    onUpdatePreferences({
                      ...preferences,
                      departureRemindersEnabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-teal-700"
                />
                <span>Journey departure reminder</span>
              </label>

              <select
                value={preferences.departureBufferMinutes}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    departureBufferMinutes: Number(e.target.value) as 10 | 15 | 30,
                  })
                }
                aria-label="Arrival buffer before mission start"
                className="px-3 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg font-mono-tabular"
              >
                <option value={10}>Arrive 10 min early</option>
                <option value={15}>Arrive 15 min early</option>
                <option value={30}>Arrive 30 min early</option>
              </select>
            </div>

            <label className="flex items-center gap-2.5 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.lastMinuteAlertsEnabled}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    lastMinuteAlertsEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-teal-700"
              />
              <span>Notify me when nearby charities urgently need a replacement</span>
            </label>
          </div>
        </div>

        {/* Right: Clearly Labelled Simulated WhatsApp Preview */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  WhatsApp Reminder Preview (Simulation)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preview only — WhatsApp messaging is not connected yet.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTriggerSimulation}
                disabled={
                  !preferences.whatsappEnabled || !preferences.consentAccepted || !previewPayload
                }
                className="inline-flex items-center gap-1.5 px-4 min-h-[42px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-40 rounded-lg whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Preview Reminder</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sim-opp-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Mission
                </label>
                <select
                  id="sim-opp-select"
                  value={previewOpp?.id ?? ''}
                  onChange={(e) => setSelectedOppId(e.target.value)}
                  className="w-full px-3 min-h-[42px] text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg"
                >
                  {selectableOpps.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} ({o.dateLabel})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="sim-offset-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Timing
                </label>
                <select
                  id="sim-offset-select"
                  value={selectedOffset}
                  onChange={(e) => setSelectedOffset(e.target.value as ReminderOffset)}
                  className="w-full px-3 min-h-[42px] text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg"
                >
                  {(['24h', '3h', '1h'] as ReminderOffset[]).map((off) => (
                    <option key={off} value={off}>
                      {REMINDER_OFFSET_LABELS[off]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {previewPayload && (
              <div className="bg-[#EFEAE2] border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">
                    Simulated WhatsApp Card
                  </span>
                  <span className="font-mono-tabular">Preview Only</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs text-slate-800">
                  {previewPayload.messageLines.map((line, i) => (
                    <p key={i} className={i === 0 ? 'font-semibold text-slate-900' : ''}>
                      {line}
                    </p>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onViewMission(previewPayload.opportunity.id)}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-teal-700" />
                    <span>View My Mission</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPlanJourney(previewPayload.opportunity.id)}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-teal-700" />
                    <span>Plan My Journey</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmAttendance(previewPayload.opportunity.id)}
                    disabled={Boolean(previewBooking?.attendanceConfirmed)}
                    className={`inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-semibold rounded-lg cursor-pointer ${
                      previewBooking?.attendanceConfirmed
                        ? 'bg-teal-100 text-teal-900 cursor-default'
                        : 'bg-teal-700 text-white hover:bg-teal-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {previewBooking?.attendanceConfirmed
                        ? 'Attendance Confirmed'
                        : 'Confirm Attendance'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity & Reminder History */}
          {notificationLog.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-teal-700" />
                  <span>Recent Notifications ({notificationLog.length})</span>
                </h3>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  History
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                {notificationLog.map((entry) => (
                  <div key={entry.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{entry.title}</span>
                      <span className="font-mono-tabular text-[11px] text-teal-700 shrink-0">
                        {entry.timestampSg}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{entry.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
