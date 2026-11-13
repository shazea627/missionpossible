import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Calendar,
  CheckCircle2,
  MessageSquare,
  Navigation,
  ShieldCheck,
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
  const [selectedOffset, setSelectedOffset] = useState<ReminderOffset>('1h');

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
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-teal-700">
            Reminder Preferences &amp; Simulated WhatsApp Experience
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Notification Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Configure shift reminder timing, departure buffer alerts, and preview simulated
            WhatsApp messages with one-click attendance confirmation.
          </p>
        </div>

        <div className="text-xs text-slate-600 bg-[#FAFAF9] border border-slate-200 rounded-xl px-4 py-2.5 shrink-0">
          <p className="font-semibold text-slate-900">WhatsApp Business API: Not Connected</p>
          <p className="text-[11px] text-slate-500">
            In-app simulation active · Zero external messages sent · Fictional demo contact only
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Opt-in Preferences & Timing Controls */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <h3 className="font-display text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Channel Opt-In &amp; Alert Preferences
          </h3>

          {/* Demo Contact (No real phone collection) */}
          <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Notification Recipient Profile</span>
              <span className="font-mono-tabular text-teal-700 font-semibold">Demo Profile</span>
            </div>
            <p className="text-slate-600">{preferences.demoContactLabel}</p>
            <p className="text-[11px] text-slate-500">
              No real phone number is collected or stored in this demo.
            </p>
          </div>

          {/* Channels */}
          <div className="space-y-3 text-xs sm:text-sm">
            <label className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <p className="font-semibold text-slate-900">WhatsApp Shift Reminders (Simulated)</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preview upcoming mission details, travel duration, and departure time alerts.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.whatsappEnabled}
                onChange={(e) =>
                  onUpdatePreferences({ ...preferences, whatsappEnabled: e.target.checked })
                }
                className="w-4 h-4 mt-1 accent-teal-700"
              />
            </label>

            <label className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <p className="font-semibold text-slate-900">In-App Notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Show toast banners and notification log entries inside MissionPossible.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.inAppEnabled}
                onChange={(e) =>
                  onUpdatePreferences({ ...preferences, inAppEnabled: e.target.checked })
                }
                className="w-4 h-4 mt-1 accent-teal-700"
              />
            </label>

            <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.consentAccepted}
                onChange={(e) =>
                  onUpdatePreferences({ ...preferences, consentAccepted: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 accent-teal-700 shrink-0"
              />
              <span>
                <strong>Opt-in Consent:</strong> I consent to receive shift reminders, departure
                buffers, and cancellation notices for shifts I register for (simulated preview in
                demo mode).
              </span>
            </label>
          </div>

          {/* Reminder Timing */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700">Shift Reminder Timing</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['24h', '3h', '1h'] as ReminderOffset[]).map((offset) => {
                const active = preferences.reminderOffsets.includes(offset);
                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => toggleOffset(offset)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left cursor-pointer ${
                      active
                        ? 'bg-teal-50 border-teal-600 text-teal-900'
                        : 'bg-[#FAFAF9] border-slate-200 text-slate-600'
                    }`}
                  >
                    {REMINDER_OFFSET_LABELS[offset]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Departure & Alert Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
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
                <span>Journey Departure Reminders</span>
              </label>

              <select
                value={preferences.departureBufferMinutes}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    departureBufferMinutes: Number(e.target.value) as 10 | 15 | 30,
                  })
                }
                aria-label="Departure reminder arrival buffer"
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono-tabular"
              >
                <option value={10}>10 min arrival buffer</option>
                <option value={15}>15 min arrival buffer</option>
                <option value={30}>30 min arrival buffer</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
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
              <span>Last-minute Rescue a Shift opportunity alerts</span>
            </label>

            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.cancellationAlertsEnabled}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    cancellationAlertsEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-teal-700"
              />
              <span>Shift schedule updates &amp; cancellation alerts</span>
            </label>
          </div>
        </div>

        {/* Right: WhatsApp Reminder Preview + Simulate Reminder */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  WhatsApp Reminder Preview (Simulated)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select an upcoming mission to preview the reminder message and test interactive
                  actions.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTriggerSimulation}
                disabled={!preferences.whatsappEnabled || !preferences.consentAccepted || !previewPayload}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-40 rounded-lg whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Simulate Reminder</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sim-opp-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Mission to Preview
                </label>
                <select
                  id="sim-opp-select"
                  value={previewOpp?.id ?? ''}
                  onChange={(e) => setSelectedOppId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg"
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
                  Reminder Trigger Window
                </label>
                <select
                  id="sim-offset-select"
                  value={selectedOffset}
                  onChange={(e) => setSelectedOffset(e.target.value as ReminderOffset)}
                  className="w-full px-3 py-2 text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg"
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
                    Simulated WhatsApp Message Preview
                  </span>
                  <span className="font-mono-tabular">Simulated · No Real SMS/WA Sent</span>
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
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-teal-700" />
                    <span>View My Mission</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPlanJourney(previewPayload.opportunity.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-teal-700" />
                    <span>Plan My Journey</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmAttendance(previewPayload.opportunity.id)}
                    disabled={Boolean(previewBooking?.attendanceConfirmed)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
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

          {/* Simulated Notification Delivery Log */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-teal-700" />
                <span>Simulated Notification Log ({notificationLog.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500">Local Demo History</span>
            </div>

            {notificationLog.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                No simulated notifications logged yet. Click <strong>Simulate Reminder</strong> or
                register/cancel a shift to populate the delivery log.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {notificationLog.map((entry) => (
                  <div key={entry.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{entry.title}</span>
                      <span className="font-mono-tabular text-[11px] text-teal-700 shrink-0">
                        {entry.status} · {entry.timestampSg}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{entry.summary}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{entry.channel}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
