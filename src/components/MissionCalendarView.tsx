import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  MapPin,
  Navigation,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  AvailabilityOverride,
  AvailabilitySlot,
  Opportunity,
  PublicHoliday,
  ShiftBooking,
  ShiftInvitation,
  VolunteerProfile,
} from '../types';
import { downloadAllConfirmedIcs, downloadShiftIcs } from '../utils/calendar';
import { SLOT_LABELS } from '../utils/matching';
import { formatIsoDateSg, getSingaporeTodayIso, getSlotsForIsoDate } from '../utils/time';

interface MissionCalendarViewProps {
  volunteer: VolunteerProfile;
  opportunities: Opportunity[];
  bookings: ShiftBooking[];
  invitations: ShiftInvitation[];
  holidays: PublicHoliday[];
  holidaysSource: 'live' | 'demo';
  availabilityOverrides: Record<string, AvailabilityOverride>;
  onUpdateAvailabilityOverride: (date: string, override: AvailabilityOverride | null) => void;
  onUpdateVolunteer: (updated: VolunteerProfile) => void;
  onBookShift: (opportunityId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onConfirmAttendance: (bookingId: string) => void;
  onPlanJourney: (opportunityId: string) => void;
  onRespondInvitation: (invitationId: string, accept: boolean) => void;
  onNotify: (title: string, description?: string) => void;
}

const WEEKDAY_WEEKEND_SLOTS: AvailabilitySlot[] = [
  'weekday-morning',
  'weekday-evening',
  'saturday-morning',
  'saturday-afternoon',
  'sunday-morning',
  'sunday-afternoon',
  'public-holiday',
];

function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T12:00:00+08:00`);
  const next = new Date(base.getTime() + days * 86400000);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const MissionCalendarView: React.FC<MissionCalendarViewProps> = ({
  volunteer,
  opportunities,
  bookings,
  invitations,
  holidays,
  holidaysSource,
  availabilityOverrides,
  onUpdateAvailabilityOverride,
  onUpdateVolunteer,
  onBookShift,
  onCancelBooking,
  onConfirmAttendance,
  onPlanJourney,
  onRespondInvitation,
  onNotify,
}) => {
  const todayIso = useMemo(() => getSingaporeTodayIso(), []);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const firstConfirmed = bookings.find(
      (b) => b.volunteerId === volunteer.id && b.status === 'Confirmed'
    );
    const opp = firstConfirmed
      ? opportunities.find((o) => o.id === firstConfirmed.opportunityId)
      : null;
    return opp?.isoDate ?? opportunities[1]?.isoDate ?? todayIso;
  });

  const [cursorMonth, setCursorMonth] = useState<{ year: number; month: number }>(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return { year: y || 2026, month: (m || 11) - 1 };
  });

  const [selectedEventOppId, setSelectedEventOppId] = useState<string | null>(() => {
    const firstConfirmed = bookings.find(
      (b) => b.volunteerId === volunteer.id && b.status === 'Confirmed'
    );
    return firstConfirmed?.opportunityId ?? null;
  });

  const holidayByDate = useMemo(() => {
    const map = new Map<string, PublicHoliday>();
    holidays.forEach((h) => map.set(h.date, h));
    return map;
  }, [holidays]);

  const myBookings = useMemo(
    () => bookings.filter((b) => b.volunteerId === volunteer.id),
    [bookings, volunteer.id]
  );

  const pendingInvites = useMemo(
    () =>
      invitations.filter(
        (i) => i.volunteerId === volunteer.id && i.status === 'Pending'
      ),
    [invitations, volunteer.id]
  );

  const confirmedBookingsWithOpp = useMemo(() => {
    return myBookings
      .filter((b) => b.status === 'Confirmed' || b.status === 'Waitlisted')
      .map((b) => ({
        booking: b,
        opportunity: opportunities.find((o) => o.id === b.opportunityId),
      }))
      .filter((x): x is { booking: ShiftBooking; opportunity: Opportunity } => Boolean(x.opportunity));
  }, [myBookings, opportunities]);

  const getEventsForDate = (isoDate: string) => {
    const dateBookings = myBookings
      .map((b) => ({
        booking: b,
        opportunity: opportunities.find((o) => o.id === b.opportunityId),
      }))
      .filter((x): x is { booking: ShiftBooking; opportunity: Opportunity } => Boolean(x.opportunity))
      .filter((x) => x.opportunity.isoDate === isoDate);

    const dateInvites = pendingInvites
      .map((inv) => ({
        invite: inv,
        opportunity: opportunities.find((o) => o.id === inv.opportunityId),
      }))
      .filter((x): x is { invite: ShiftInvitation; opportunity: Opportunity } => Boolean(x.opportunity))
      .filter((x) => x.opportunity.isoDate === isoDate);

    const bookedIds = new Set(
      dateBookings.filter((b) => b.booking.status !== 'Cancelled').map((b) => b.opportunity.id)
    );
    const inviteIds = new Set(dateInvites.map((i) => i.opportunity.id));

    const openShiftsOnDate = opportunities.filter(
      (o) => o.isoDate === isoDate && !bookedIds.has(o.id) && !inviteIds.has(o.id)
    );

    return { dateBookings, dateInvites, openShiftsOnDate };
  };

  // Monthly calendar grid builder
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(cursorMonth.year, cursorMonth.month, 1);
    const startWeekday = firstDayOfMonth.getDay(); // 0=Sun
    const daysInMonth = new Date(cursorMonth.year, cursorMonth.month + 1, 0).getDate();
    const cells: Array<{ isoDate: string; dayNum: number; inMonth: boolean }> = [];

    for (let i = startWeekday - 1; i >= 0; i -= 1) {
      const d = new Date(cursorMonth.year, cursorMonth.month, -i);
      cells.push({
        isoDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`,
        dayNum: d.getDate(),
        inMonth: false,
      });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        isoDate: `${cursorMonth.year}-${String(cursorMonth.month + 1).padStart(2, '0')}-${String(
          day
        ).padStart(2, '0')}`,
        dayNum: day,
        inMonth: true,
      });
    }
    while (cells.length % 7 !== 0) {
      const trailing = cells.length - (startWeekday + daysInMonth) + 1;
      const d = new Date(cursorMonth.year, cursorMonth.month + 1, trailing);
      cells.push({
        isoDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`,
        dayNum: d.getDate(),
        inMonth: false,
      });
    }
    return cells;
  }, [cursorMonth]);

  const monthLabel = new Date(cursorMonth.year, cursorMonth.month, 1).toLocaleDateString('en-SG', {
    month: 'long',
    year: 'numeric',
  });

  // Weekly dates around selectedDate (Sun..Sat)
  const weekDates = useMemo(() => {
    const parsed = new Date(`${selectedDate}T12:00:00+08:00`);
    const dow = Number.isNaN(parsed.getTime()) ? 0 : parsed.getDay();
    const startIso = addDays(selectedDate, -dow);
    return Array.from({ length: 7 }, (_, i) => addDays(startIso, i));
  }, [selectedDate]);

  const shiftMonth = (delta: number) => {
    const d = new Date(cursorMonth.year, cursorMonth.month + delta, 1);
    setCursorMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const selectedDateHoliday = holidayByDate.get(selectedDate);
  const selectedDateOverride = availabilityOverrides[selectedDate];
  const selectedDateEvents = getEventsForDate(selectedDate);
  const selectedDateSlots = getSlotsForIsoDate(selectedDate);

  // Opportunities matching volunteer's open availability & not blocked
  const matchingOpenOpportunities = useMemo(() => {
    const bookedIds = new Set(
      myBookings.filter((b) => b.status !== 'Cancelled').map((b) => b.opportunityId)
    );
    return opportunities.filter((opp) => {
      if (bookedIds.has(opp.id)) return false;
      const override = availabilityOverrides[opp.isoDate];
      if (override?.status === 'unavailable') return false;
      if (override?.status === 'available') return true;
      const isPh = holidayByDate.has(opp.isoDate);
      return (
        volunteer.availability.includes(opp.slot) ||
        (isPh && volunteer.availability.includes('public-holiday'))
      );
    });
  }, [opportunities, myBookings, availabilityOverrides, volunteer.availability, holidayByDate]);

  const selectedEventOpp = useMemo(
    () => opportunities.find((o) => o.id === selectedEventOppId) ?? null,
    [opportunities, selectedEventOppId]
  );

  const selectedEventBooking = useMemo(
    () =>
      selectedEventOpp
        ? myBookings.find((b) => b.opportunityId === selectedEventOpp.id && b.status !== 'Cancelled')
        : undefined,
    [myBookings, selectedEventOpp]
  );

  const selectedEventCancelled = useMemo(
    () =>
      selectedEventOpp
        ? myBookings.find((b) => b.opportunityId === selectedEventOpp.id && b.status === 'Cancelled')
        : undefined,
    [myBookings, selectedEventOpp]
  );

  const handleExportAllConfirmed = () => {
    const confirmedList = confirmedBookingsWithOpp
      .filter((x) => x.booking.status === 'Confirmed')
      .map((x) => x.opportunity);
    if (confirmedList.length === 0) {
      onNotify('No confirmed shifts to export', 'Register for a shift first to export your .ics calendar.');
      return;
    }
    const filename = downloadAllConfirmedIcs(confirmedList, volunteer.name);
    onNotify(
      'Confirmed schedule exported (.ics)',
      `Saved ${filename} with ${confirmedList.length} confirmed shift(s).`
    );
  };

  const toggleRecurringSlot = (slot: AvailabilitySlot) => {
    const exists = volunteer.availability.includes(slot);
    const next = exists
      ? volunteer.availability.filter((s) => s !== slot)
      : [...volunteer.availability, slot];
    onUpdateVolunteer({ ...volunteer, availability: next });
    onNotify(
      'Weekly availability updated',
      'Future mission recommendations updated without altering confirmed bookings.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-teal-700">
            Personal Volunteering Schedule · Singapore Holidays ({holidaysSource === 'live' ? 'data.gov.sg Live' : 'MOM Fallback'})
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            My Mission Calendar
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            View confirmed shifts, pending Rescue invitations, public holidays, and manage your
            weekly or date-specific availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['monthly', 'weekly', 'daily'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                  viewMode === mode
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'daily' ? 'Daily Agenda' : mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportAllConfirmed}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Confirmed (.ics)</span>
          </button>
        </div>
      </div>

      {/* Main Split: Calendar Surface (Left 8 cols) + Availability & Selected Event Detail (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          {/* Calendar Period Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  viewMode === 'monthly'
                    ? shiftMonth(-1)
                    : setSelectedDate(addDays(selectedDate, viewMode === 'weekly' ? -7 : -1))
                }
                aria-label="Previous period"
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 min-w-[160px] text-center">
                {viewMode === 'monthly'
                  ? monthLabel
                  : viewMode === 'weekly'
                  ? `${weekDates[0]} to ${weekDates[6]}`
                  : formatIsoDateSg(selectedDate)}
              </h3>
              <button
                type="button"
                onClick={() =>
                  viewMode === 'monthly'
                    ? shiftMonth(1)
                    : setSelectedDate(addDays(selectedDate, viewMode === 'weekly' ? 7 : 1))
                }
                aria-label="Next period"
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
              <span className="font-semibold text-teal-700">Confirmed</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-amber-700">Pending Rescue / Holiday</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-red-600">Cancelled</span>
              <span aria-hidden="true">·</span>
              <span>Open Shift</span>
            </div>
          </div>

          {viewMode === 'monthly' && (
            <div>
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 pb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {monthDays.map((cell) => {
                  const { dateBookings, dateInvites, openShiftsOnDate } = getEventsForDate(
                    cell.isoDate
                  );
                  const ph = holidayByDate.get(cell.isoDate);
                  const override = availabilityOverrides[cell.isoDate];
                  const isSelected = cell.isoDate === selectedDate;
                  const isToday = cell.isoDate === todayIso;

                  return (
                    <div
                      key={cell.isoDate}
                      onClick={() => setSelectedDate(cell.isoDate)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDate(cell.isoDate);
                        }
                      }}
                      className={`min-h-[92px] p-1.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/40'
                          : override?.status === 'unavailable'
                          ? 'border-slate-200 bg-slate-100/70'
                          : cell.inMonth
                          ? 'border-slate-200 bg-white hover:border-slate-300'
                          : 'border-slate-100 bg-[#FAFAF9] text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`font-mono-tabular font-semibold ${
                            isToday ? 'text-teal-700 underline underline-offset-2' : ''
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        {ph && (
                          <span className="text-[10px] font-semibold text-amber-700 truncate max-w-[64px]">
                            PH
                          </span>
                        )}
                      </div>

                      {ph && (
                        <p className="text-[10px] font-medium text-amber-800 truncate mt-0.5">
                          {ph.holiday}
                        </p>
                      )}

                      {override?.status === 'unavailable' && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Unavailable</p>
                      )}

                      <div className="mt-1 space-y-1">
                        {dateBookings.map(({ booking, opportunity }) => (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(cell.isoDate);
                              setSelectedEventOppId(opportunity.id);
                            }}
                            className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-semibold truncate cursor-pointer ${
                              booking.status === 'Cancelled'
                                ? 'bg-red-50 text-red-700 line-through'
                                : booking.status === 'Present'
                                ? 'bg-slate-800 text-white'
                                : 'bg-teal-700 text-white'
                            }`}
                          >
                            {opportunity.startTime24} {opportunity.title}
                          </button>
                        ))}
                        {dateInvites.map(({ invite, opportunity }) => (
                          <button
                            key={invite.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(cell.isoDate);
                              setSelectedEventOppId(opportunity.id);
                            }}
                            className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-semibold truncate bg-amber-100 text-amber-900 cursor-pointer"
                          >
                            Rescue: {opportunity.title}
                          </button>
                        ))}
                        {openShiftsOnDate.slice(0, 1).map((opp) => (
                          <button
                            key={opp.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(cell.isoDate);
                              setSelectedEventOppId(opp.id);
                            }}
                            className="w-full text-left px-1.5 py-0.5 rounded text-[10px] text-slate-700 bg-[#FAFAF9] border border-slate-200 truncate cursor-pointer"
                          >
                            + {opp.startTime24} Open
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'weekly' && (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {weekDates.map((iso) => {
                const { dateBookings, dateInvites, openShiftsOnDate } = getEventsForDate(iso);
                const ph = holidayByDate.get(iso);
                const isSelected = iso === selectedDate;
                return (
                  <div
                    key={iso}
                    onClick={() => setSelectedDate(iso)}
                    className={`p-3 rounded-xl border min-h-[210px] space-y-2 cursor-pointer ${
                      isSelected ? 'border-teal-600 bg-teal-50/30' : 'border-slate-200 bg-[#FAFAF9]'
                    }`}
                  >
                    <div className="border-b border-slate-200 pb-1.5">
                      <p className="font-mono-tabular text-xs font-bold text-slate-900">
                        {iso.slice(5)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(`${iso}T12:00:00+08:00`).toLocaleDateString('en-SG', {
                          weekday: 'short',
                        })}
                      </p>
                      {ph && (
                        <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                          {ph.holiday}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {dateBookings.map(({ booking, opportunity }) => (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(iso);
                            setSelectedEventOppId(opportunity.id);
                          }}
                          className={`w-full text-left p-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
                            booking.status === 'Cancelled'
                              ? 'bg-red-50 text-red-700 line-through'
                              : 'bg-teal-700 text-white'
                          }`}
                        >
                          <p className="font-mono-tabular">{opportunity.timeLabel}</p>
                          <p className="truncate">{opportunity.title}</p>
                        </button>
                      ))}
                      {dateInvites.map(({ invite, opportunity }) => (
                        <button
                          key={invite.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(iso);
                            setSelectedEventOppId(opportunity.id);
                          }}
                          className="w-full text-left p-2 rounded-lg text-[11px] font-semibold bg-amber-100 text-amber-900 cursor-pointer"
                        >
                          Rescue Invite · {opportunity.title}
                        </button>
                      ))}
                      {openShiftsOnDate.map((opp) => (
                        <button
                          key={opp.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(iso);
                            setSelectedEventOppId(opp.id);
                          }}
                          className="w-full text-left p-2 rounded-lg text-[11px] bg-white border border-slate-200 text-slate-700 cursor-pointer"
                        >
                          <p className="font-mono-tabular text-slate-500">{opp.timeLabel}</p>
                          <p className="font-medium truncate">{opp.title}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'daily' && (
            <div className="space-y-3">
              {selectedDateHoliday && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
                  <strong>Singapore Public Holiday:</strong> {selectedDateHoliday.holiday} (
                  {selectedDateHoliday.date})
                </div>
              )}

              {selectedDateEvents.dateBookings.length === 0 &&
              selectedDateEvents.dateInvites.length === 0 &&
              selectedDateEvents.openShiftsOnDate.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  No shifts scheduled for {formatIsoDateSg(selectedDate)}. Select another highlighted
                  date or adjust your availability.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.dateBookings.map(({ booking, opportunity }) => (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedEventOppId(opportunity.id)}
                      className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-teal-600 cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-semibold text-teal-700">
                          {booking.status}
                          {booking.attendanceConfirmed ? ' · Attendance Confirmed' : ''}
                        </p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                          {opportunity.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {opportunity.timeLabel} SGT · {opportunity.location} (S
                          {opportunity.postalCode})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlanJourney(opportunity.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg shrink-0 cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Plan My Journey</span>
                      </button>
                    </div>
                  ))}
                  {selectedDateEvents.openShiftsOnDate.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => setSelectedEventOppId(opp.id)}
                      className="border border-slate-200 bg-[#FAFAF9] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <p className="text-xs text-slate-500">
                          Available Opportunity · {opp.charityName}
                        </p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{opp.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {opp.timeLabel} SGT · {opp.location}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookShift(opp.id);
                        }}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shrink-0 cursor-pointer"
                      >
                        Register
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Selected Event Detail + Date Availability & Recurring Slots */}
        <div className="lg:col-span-4 space-y-5">
          {/* Selected Shift / Event Detail */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              {selectedEventOpp ? 'Selected Mission Detail' : 'Day Overview'}
            </h3>

            {selectedEventOpp ? (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-slate-500">
                    {selectedEventOpp.charityName} · {selectedEventOpp.cause}
                  </p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedEventOpp.title}
                  </p>
                </div>
                <div className="space-y-1 text-slate-600">
                  <p className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono-tabular">
                      {selectedEventOpp.dateLabel} · {selectedEventOpp.timeLabel} SGT
                    </span>
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {selectedEventOpp.location} (S{selectedEventOpp.postalCode})
                    </span>
                  </p>
                </div>

                {selectedEventBooking ? (
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <p className="font-semibold text-teal-700 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Status: {selectedEventBooking.status}
                      {selectedEventBooking.attendanceConfirmed ? ' · Attendance Confirmed' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onPlanJourney(selectedEventOpp.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Plan My Journey</span>
                      </button>
                      {selectedEventBooking.status === 'Confirmed' &&
                        !selectedEventBooking.attendanceConfirmed && (
                          <button
                            type="button"
                            onClick={() => onConfirmAttendance(selectedEventBooking.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Confirm Attendance</span>
                          </button>
                        )}
                      {selectedEventBooking.status === 'Confirmed' && (
                        <button
                          type="button"
                          onClick={() => {
                            const file = downloadShiftIcs(selectedEventOpp, volunteer.name);
                            onNotify('ICS file downloaded', `Saved ${file}.`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>.ics</span>
                        </button>
                      )}
                      {selectedEventBooking.status !== 'Present' && (
                        <button
                          type="button"
                          onClick={() => onCancelBooking(selectedEventBooking.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    {selectedEventCancelled && (
                      <p className="text-red-600 font-semibold">
                        Previously cancelled — open spot flagged for Rescue a Shift.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onBookShift(selectedEventOpp.id)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                      >
                        Register for Shift
                      </button>
                      <button
                        type="button"
                        onClick={() => onPlanJourney(selectedEventOpp.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-[#FAFAF9] border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Preview Route</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Click any shift or open opportunity on the calendar to inspect details, plan a
                route, or export an .ics file.
              </p>
            )}
          </div>

          {/* Availability Editor (Date-Specific + Recurring) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Volunteer Availability
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust availability for <strong className="font-mono-tabular">{selectedDate}</strong>{' '}
                or recurring slots. Confirmed bookings stay intact.
              </p>
            </div>

            <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 font-mono-tabular">
                  {selectedDate}
                </span>
                <span className="text-slate-500">
                  {selectedDateHoliday
                    ? selectedDateHoliday.holiday
                    : selectedDateSlots.map((s) => SLOT_LABELS[s].split(' ')[0])[0] ?? 'Day'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAvailabilityOverride(selectedDate, {
                      date: selectedDate,
                      status: 'available',
                    })
                  }
                  className={`px-2 py-1.5 font-semibold rounded-md border cursor-pointer ${
                    selectedDateOverride?.status === 'available'
                      ? 'bg-teal-700 border-teal-700 text-white'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  Available
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAvailabilityOverride(selectedDate, {
                      date: selectedDate,
                      status: 'unavailable',
                    })
                  }
                  className={`px-2 py-1.5 font-semibold rounded-md border cursor-pointer ${
                    selectedDateOverride?.status === 'unavailable'
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  Unavailable
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateAvailabilityOverride(selectedDate, null)}
                  className="px-2 py-1.5 font-medium rounded-md border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Default
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">Recurring Weekly Slots</p>
              <div className="grid grid-cols-2 gap-1.5">
                {WEEKDAY_WEEKEND_SLOTS.map((slot) => {
                  const active = volunteer.availability.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleRecurringSlot(slot)}
                      className={`px-2.5 py-2 text-left text-[11px] rounded-lg border cursor-pointer ${
                        active
                          ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                          : 'bg-[#FAFAF9] border-slate-200 text-slate-600'
                      }`}
                    >
                      {SLOT_LABELS[slot]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Open Shifts Matching Your Free Slots ({matchingOpenOpportunities.length})
              </p>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {matchingOpenOpportunities.slice(0, 4).map((opp) => (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => {
                      setSelectedDate(opp.isoDate);
                      setSelectedEventOppId(opp.id);
                    }}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-[#FAFAF9] hover:border-teal-600 text-xs cursor-pointer"
                  >
                    <p className="font-semibold text-slate-900 truncate">{opp.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono-tabular">
                      {opp.dateLabel} · {opp.timeLabel}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Rescue Invitations quick respond */}
          {pendingInvites.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-amber-900">
                Pending Rescue Invitations ({pendingInvites.length})
              </p>
              {pendingInvites.map((inv) => {
                const opp = opportunities.find((o) => o.id === inv.opportunityId);
                if (!opp) return null;
                return (
                  <div key={inv.id} className="bg-white border border-amber-200 rounded-xl p-3 text-xs space-y-2">
                    <p className="font-bold text-slate-900">{opp.title}</p>
                    <p className="text-slate-600">
                      {opp.dateLabel} · {opp.timeLabel}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onRespondInvitation(inv.id, true)}
                        className="px-3 py-1.5 font-semibold text-white bg-teal-700 rounded-lg cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onRespondInvitation(inv.id, false)}
                        className="px-3 py-1.5 font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
