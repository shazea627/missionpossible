import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  LifeBuoy,
  Plus,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import {
  AttendanceStatus,
  AvailabilitySlot,
  CauseCategory,
  CharityOrg,
  District,
  Opportunity,
  PublicHoliday,
  ShiftBooking,
  ShiftInvitation,
  VolunteerProfile,
} from '../types';
import { calculateMatchScore, SLOT_LABELS } from '../utils/matching';

interface CharityDashboardProps {
  charities: CharityOrg[];
  opportunities: Opportunity[];
  bookings: ShiftBooking[];
  invitations: ShiftInvitation[];
  volunteerPool: VolunteerProfile[];
  holidays: PublicHoliday[];
  onCreateOpportunity: (opp: Omit<Opportunity, 'id' | 'spotsFilled'>) => void;
  onUpdateBookingStatus: (bookingId: string, status: AttendanceStatus) => void;
  onSimulateCancellation: (opportunityId: string) => void;
  onSendRescueInvitation: (
    opportunityId: string,
    volunteer: VolunteerProfile,
    matchScore: number,
    matchReasons: string[]
  ) => void;
  onSwitchToVolunteer?: (volunteerId: string) => void;
  onNotify: (title: string, description?: string) => void;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export const CharityDashboard: React.FC<CharityDashboardProps> = ({
  charities,
  opportunities,
  bookings,
  invitations,
  volunteerPool,
  holidays,
  onCreateOpportunity,
  onUpdateBookingStatus,
  onSimulateCancellation,
  onSendRescueInvitation,
  onSwitchToVolunteer,
  onNotify,
}) => {
  const [selectedCharityId, setSelectedCharityId] = useState<string>(charities[0]?.id ?? 'char-01');
  const [selectedOppId, setSelectedOppId] = useState<string>('opp-01');
  const [rescueOpen, setRescueOpen] = useState<boolean>(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create Shift form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [postalCode, setPostalCode] = useState('408600');
  const [isoDate, setIsoDate] = useState('2026-11-21');
  const [timeLabel, setTimeLabel] = useState('09:00 – 13:00');
  const [slot, setSlot] = useState<AvailabilitySlot>('saturday-morning');
  const [durationHours, setDurationHours] = useState(4);
  const [spotsTotal, setSpotsTotal] = useState(10);
  const [skillsInput, setSkillsInput] = useState('Logistics, Meal Packing');
  const [urgency, setUrgency] = useState<'Normal' | 'Urgent Fill'>('Normal');
  const [isOutdoor, setIsOutdoor] = useState(false);
  const [formError, setFormError] = useState('');

  const activeCharity = useMemo(
    () => charities.find((c) => c.id === selectedCharityId) ?? charities[0],
    [charities, selectedCharityId]
  );

  const charityOpportunities = useMemo(
    () => opportunities.filter((o) => o.charityId === activeCharity.id),
    [opportunities, activeCharity.id]
  );

  const activeOpportunity = useMemo(() => {
    const found = charityOpportunities.find((o) => o.id === selectedOppId);
    return found ?? charityOpportunities[0] ?? opportunities[0];
  }, [charityOpportunities, opportunities, selectedOppId]);

  const oppBookings = useMemo(
    () => bookings.filter((b) => b.opportunityId === activeOpportunity?.id),
    [bookings, activeOpportunity]
  );

  const confirmedCount = oppBookings.filter(
    (b) => b.status === 'Confirmed' || b.status === 'Present'
  ).length;
  const remainingVacancies = activeOpportunity
    ? Math.max(0, activeOpportunity.spotsTotal - activeOpportunity.spotsFilled)
    : 0;

  // Rescue a Shift Engine (10-Step Workflow)
  const rescueAnalysis = useMemo(() => {
    if (!activeOpportunity) {
      return { eligible: [], excludedConflicts: 0, excludedSkills: 0 };
    }

    const alreadyOnThisShift = new Set(
      oppBookings
        .filter((b) => b.status === 'Confirmed' || b.status === 'Present' || b.status === 'Waitlisted')
        .map((b) => b.volunteerId)
    );

    let excludedConflicts = 0;
    let excludedSkills = 0;

    const eligible = volunteerPool
      .filter((vol) => !alreadyOnThisShift.has(vol.id))
      .filter((vol) => {
        // 3. Availability overlap check
        const holidayHit = holidays.some((h) => h.date === activeOpportunity.isoDate);
        const avail =
          vol.availability.includes(activeOpportunity.slot) ||
          (holidayHit && vol.availability.includes('public-holiday'));
        if (!avail) return false;

        // 4. Exclude volunteers with conflicting confirmed commitments on same date or slot
        const hasConflict = bookings.some((b) => {
          if (b.volunteerId !== vol.id) return false;
          if (b.status !== 'Confirmed' && b.status !== 'Present') return false;
          const bookedOpp = opportunities.find((o) => o.id === b.opportunityId);
          if (!bookedOpp) return false;
          return (
            bookedOpp.isoDate === activeOpportunity.isoDate &&
            bookedOpp.slot === activeOpportunity.slot
          );
        });
        if (hasConflict) {
          excludedConflicts += 1;
          return false;
        }

        // 5. Mandatory skill check: must share at least 1 required skill if skills are specified
        if (activeOpportunity.requiredSkills.length > 0) {
          const hasRequired = activeOpportunity.requiredSkills.some((reqSkill) =>
            vol.skills.some((vs) => vs.toLowerCase() === reqSkill.toLowerCase())
          );
          if (!hasRequired) {
            excludedSkills += 1;
            return false;
          }
        }
        return true;
      })
      .map((vol) => {
        const dist = distanceKm(
          vol.startingLocation.lat,
          vol.startingLocation.lng,
          activeOpportunity.lat,
          activeOpportunity.lng
        );
        const match = calculateMatchScore(
          vol,
          activeOpportunity,
          { minutes: null, distanceKm: dist, source: 'unavailable' },
          holidays
        );
        const existingInvite = invitations.find(
          (inv) =>
            inv.opportunityId === activeOpportunity.id &&
            inv.volunteerId === vol.id
        );
        return {
          volunteer: vol,
          distanceKm: dist,
          match,
          existingInvite,
        };
      })
      .sort((a, b) => {
        // Prioritize Alex Tan / highest match score + proximity
        if (b.match.score !== a.match.score) return b.match.score - a.match.score;
        return a.distanceKm - b.distanceKm;
      });

    return { eligible, excludedConflicts, excludedSkills };
  }, [activeOpportunity, oppBookings, volunteerPool, holidays, bookings, opportunities, invitations]);

  const totalSpots = charityOpportunities.reduce((sum, o) => sum + o.spotsTotal, 0);
  const filledSpots = charityOpportunities.reduce((sum, o) => sum + o.spotsFilled, 0);
  const fillRate = totalSpots > 0 ? Math.round((filledSpots / totalSpots) * 100) : 0;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim() || !location.trim()) {
      setFormError('Please provide both a shift title and venue location.');
      return;
    }

    let resolvedLat = 1.3198;
    let resolvedLng = 103.9032;
    if (/^\d{6}$/.test(postalCode.trim())) {
      try {
        const res = await fetch(`/api/onemap/search?q=${encodeURIComponent(postalCode.trim())}`);
        const data = (await res.json()) as { results?: Array<{ lat: number; lng: number }> };
        if (data.results?.[0]) {
          resolvedLat = data.results[0].lat;
          resolvedLng = data.results[0].lng;
        }
      } catch {
        // Use fallback coordinate
      }
    }

    const parsedDate = new Date(`${isoDate}T09:00:00`);
    const dateLabel = Number.isNaN(parsedDate.getTime())
      ? isoDate
      : parsedDate.toLocaleDateString('en-SG', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        });

    onCreateOpportunity({
      title: title.trim(),
      charityId: activeCharity.id,
      charityName: activeCharity.name,
      charityUen: activeCharity.uen,
      charityVerificationStatus: activeCharity.verificationStatus,
      cause: activeCharity.primaryCause as CauseCategory,
      district: activeCharity.district as District,
      location: location.trim(),
      postalCode: postalCode.trim() || '408600',
      lat: resolvedLat,
      lng: resolvedLng,
      isoDate,
      dateLabel,
      timeLabel: timeLabel.trim() || '09:00 – 13:00',
      startTime24: '09:00',
      endTime24: '13:00',
      slot,
      durationHours: Number(durationHours) || 4,
      requiredSkills: skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      spotsTotal: Number(spotsTotal) || 10,
      urgency,
      isOutdoor,
      corporateFriendly: true,
      description: `Community volunteer shift coordinated by ${activeCharity.name}.`,
    });

    setTitle('');
    setLocation('');
    setShowCreateForm(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {activeCharity.verificationStatus === 'Authoritatively Verified' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
                <ShieldCheck className="w-4 h-4" />
                {activeCharity.verificationStatus} (UEN {activeCharity.uen})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                <ShieldAlert className="w-4 h-4" />
                {activeCharity.verificationStatus} (UEN {activeCharity.uen})
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>{activeCharity.ipcStatus ? 'IPC Registered' : 'Non-IPC NGO'}</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.charities.gov.sg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
            >
              <span>Singapore Charity Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            {activeCharity.name}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{activeCharity.verificationNote}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <select
            value={activeCharity.id}
            onChange={(e) => setSelectedCharityId(e.target.value)}
            aria-label="Switch charity organisation"
            className="px-3.5 py-2.5 text-sm bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            {charities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showCreateForm ? 'Close Form' : 'Publish New Shift'}</span>
          </button>
        </div>
      </div>

      {/* Create Shift Inline Drawer */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Publish New Volunteer Shift
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="shift-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Shift Title
              </label>
              <input
                id="shift-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekend Pantry Packing"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="shift-location" className="block text-xs font-semibold text-slate-700 mb-1">
                Venue &amp; Postal Code
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  id="shift-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Venue address"
                  className="col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  aria-label="Singapore postal code"
                  className="px-2.5 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
            </div>
            <div>
              <label htmlFor="shift-slot" className="block text-xs font-semibold text-slate-700 mb-1">
                Availability Window
              </label>
              <select
                id="shift-slot"
                value={slot}
                onChange={(e) => setSlot(e.target.value as AvailabilitySlot)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                {Object.entries(SLOT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="shift-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Date &amp; Time
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="shift-date"
                  type="date"
                  value={isoDate}
                  onChange={(e) => setIsoDate(e.target.value)}
                  className="px-2.5 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
                <input
                  type="text"
                  value={timeLabel}
                  onChange={(e) => setTimeLabel(e.target.value)}
                  aria-label="Shift time range"
                  className="px-2.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label htmlFor="shift-spots" className="block text-xs font-semibold text-slate-700 mb-1">
                Required Volunteers &amp; Hours
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="shift-spots"
                  type="number"
                  min={1}
                  max={100}
                  value={spotsTotal}
                  onChange={(e) => setSpotsTotal(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  aria-label="Duration hours"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
            </div>
            <div>
              <label htmlFor="shift-skills" className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Skills &amp; Setting
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="shift-skills"
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="px-2.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <label className="inline-flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOutdoor}
                    onChange={(e) => setIsOutdoor(e.target.checked)}
                    className="accent-teal-700"
                  />
                  <span>Outdoor</span>
                </label>
              </div>
            </div>
          </div>

          {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
            >
              Publish Shift
            </button>
          </div>
        </form>
      )}

      {/* Cancellation & Rescue a Shift Alerts for Charity Coordinator */}
      {(() => {
        const charityOppIds = new Set(charityOpportunities.map((o) => o.id));
        const recentCancellations = bookings.filter(
          (b) => charityOppIds.has(b.opportunityId) && b.status === 'Cancelled'
        );
        if (recentCancellations.length === 0) return null;
        return (
          <div
            role="region"
            aria-label="Volunteer cancellation alerts"
            className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900">
                Cancellation Alert ({recentCancellations.length}) · Action Required
              </p>
              <p className="text-xs text-amber-900">
                {recentCancellations
                  .slice(0, 2)
                  .map((c) => {
                    const opp = charityOpportunities.find((o) => o.id === c.opportunityId);
                    return `${c.volunteerName} cancelled "${opp?.title ?? 'Shift'}"`;
                  })
                  .join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const firstOppId = recentCancellations[0]?.opportunityId;
                if (firstOppId) setSelectedOppId(firstOppId);
                setRescueOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Find Replacement via Rescue a Shift</span>
            </button>
          </div>
        );
      })()}

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs text-slate-500">Organisation Shift Fill Rate</p>
          <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">{fillRate}%</p>
          <p className="text-xs text-teal-700 mt-1">
            {filledSpots} of {totalSpots} roster spots confirmed
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs text-slate-500">Selected Shift Staffing</p>
          <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
            {activeOpportunity ? `${activeOpportunity.spotsFilled} / ${activeOpportunity.spotsTotal}` : '—'}
          </p>
          <p
            className={`text-xs font-semibold mt-1 ${
              remainingVacancies > 0 ? 'text-amber-700' : 'text-teal-700'
            }`}
          >
            {remainingVacancies > 0
              ? `Needs Replacement (${remainingVacancies} vacancy)`
              : 'Fully Staffed'}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs text-slate-500">Eligible Rescue Pool</p>
          <p className="font-mono-tabular text-2xl font-bold text-teal-700 mt-1">
            {rescueAnalysis.eligible.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Screened from {volunteerPool.length} active volunteers
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs text-slate-500">Schedule Conflicts Excluded</p>
          <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
            {rescueAnalysis.excludedConflicts}
          </p>
          <p className="text-xs text-slate-500 mt-1">Volunteers booked elsewhere</p>
        </div>
      </div>

      {/* Main Split: Shifts Overview + Roster & Rescue a Shift */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Upcoming Shifts List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-display text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            Upcoming Shifts &amp; Staffing Status ({charityOpportunities.length})
          </h2>
          <div className="mt-3 space-y-2.5">
            {charityOpportunities.map((opp) => {
              const selected = activeOpportunity?.id === opp.id;
              const openSpots = Math.max(0, opp.spotsTotal - opp.spotsFilled);
              return (
                <button
                  key={opp.id}
                  type="button"
                  onClick={() => setSelectedOppId(opp.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-teal-50/70 border-teal-600'
                      : 'bg-[#FAFAF9] border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{opp.title}</p>
                    <span
                      className={`font-mono-tabular text-xs font-bold shrink-0 ${
                        openSpots > 0 ? 'text-amber-700' : 'text-teal-700'
                      }`}
                    >
                      {opp.spotsFilled}/{opp.spotsTotal}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {opp.dateLabel} · {opp.timeLabel} · {opp.location} (S{opp.postalCode})
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Required: {opp.spotsTotal} · Confirmed: {opp.spotsFilled}
                    </span>
                    <span
                      className={`font-semibold ${
                        openSpots > 0 ? 'text-amber-700' : 'text-teal-700'
                      }`}
                    >
                      {openSpots > 0
                        ? opp.urgency === 'Urgent Fill'
                          ? `Needs Replacement (${openSpots})`
                          : `${openSpots} vacancies`
                        : 'Fully Staffed'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Shift Roster + Rescue a Shift Workflow */}
        {activeOpportunity && (
          <div className="lg:col-span-7 space-y-6">
            {/* Shift Staffing Status + Simulate Cancellation */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    {activeOpportunity.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeOpportunity.dateLabel} · {activeOpportunity.timeLabel} ·{' '}
                    {activeOpportunity.location} (S{activeOpportunity.postalCode})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {confirmedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onSimulateCancellation(activeOpportunity.id);
                        setRescueOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Simulate Volunteer Cancellation</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRescueOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>Rescue a Shift</span>
                  </button>
                </div>
              </div>

              {/* Staffing Progress Bar */}
              <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
                    {remainingVacancies > 0 ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-800">
                          Status: Needs Replacement ({remainingVacancies} vacancy)
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-teal-700" />
                        <span className="text-teal-800">Status: Fully Staffed</span>
                      </>
                    )}
                  </span>
                  <span className="font-mono-tabular font-semibold text-slate-700">
                    Confirmed: {activeOpportunity.spotsFilled} / Required:{' '}
                    {activeOpportunity.spotsTotal}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      remainingVacancies > 0 ? 'bg-amber-500' : 'bg-teal-700'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (activeOpportunity.spotsFilled / activeOpportunity.spotsTotal) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Roster Table */}
              {oppBookings.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">
                  No volunteers booked on this shift yet.
                </p>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-2 pr-4">Volunteer</th>
                        <th className="py-2 pr-4">Skills</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {oppBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 pr-4">
                            <p className="font-semibold text-slate-900">{booking.volunteerName}</p>
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-slate-600">
                            {booking.volunteerSkills.slice(0, 2).join(', ')}
                          </td>
                          <td className="py-2.5 pr-4">
                            <div className="flex flex-col">
                              <span
                                className={`text-xs font-semibold ${
                                  booking.status === 'Present' || booking.status === 'Confirmed'
                                    ? 'text-teal-700'
                                    : booking.status === 'Waitlisted'
                                    ? 'text-amber-700'
                                    : 'text-red-600'
                                }`}
                              >
                                {booking.status}
                              </span>
                              {booking.attendanceConfirmed && booking.status === 'Confirmed' && (
                                <span className="text-[11px] font-medium text-teal-800">
                                  Pre-shift confirmed ({booking.attendanceConfirmedAt ?? 'Today'})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="inline-flex items-center gap-2">
                              {booking.status === 'Confirmed' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateBookingStatus(booking.id, 'Present')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
                                  >
                                    <UserCheck className="w-3 h-3" />
                                    <span>Present</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateBookingStatus(booking.id, 'Cancelled')}
                                    className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              {booking.status === 'Present' && (
                                <span className="text-xs font-semibold text-teal-700 font-mono-tabular">
                                  {booking.hoursCredited}h verified
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rescue a Shift Replacement Matcher */}
            {rescueOpen && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Rescue a Shift — Eligible Replacement Shortlist
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Filtered by overlapping availability ({SLOT_LABELS[activeOpportunity.slot]}),
                      mandatory skills ({activeOpportunity.requiredSkills.join(', ') || 'Any'}),
                      excluding {rescueAnalysis.excludedConflicts} schedule conflict(s).
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono-tabular text-xs font-semibold text-teal-700 shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    {rescueAnalysis.eligible.length} eligible
                  </span>
                </div>

                {rescueAnalysis.eligible.length === 0 ? (
                  <p className="py-4 text-xs text-slate-500">
                    No unbooked conflict-free replacements matched all criteria for this shift.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {rescueAnalysis.eligible.slice(0, 5).map(({ volunteer, distanceKm: dist, match, existingInvite }) => (
                      <div
                        key={volunteer.id}
                        className="py-4 first:pt-2 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">{volunteer.name}</p>
                            <span className="font-mono-tabular text-xs font-bold text-teal-700">
                              {match.score}% match
                            </span>
                            <span className="text-xs text-slate-500">
                              · {volunteer.startingLocation.label} ({dist} km away)
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Skills: {volunteer.skills.join(', ')} · Causes:{' '}
                            {volunteer.causes.join(', ')}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Why they match: {match.reasons.join(' · ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {existingInvite?.status === 'Pending' ? (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-xs font-semibold text-amber-700">
                                Invitation Sent (Pending)
                              </span>
                              {onSwitchToVolunteer && (
                                <button
                                  type="button"
                                  onClick={() => onSwitchToVolunteer(volunteer.id)}
                                  className="px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer"
                                >
                                  Switch to {volunteer.name.split(' ')[0]}&apos;s View &rarr;
                                </button>
                              )}
                            </div>
                          ) : existingInvite?.status === 'Accepted' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                              <CheckCircle2 className="w-4 h-4" />
                              Accepted &amp; Confirmed
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onSendRescueInvitation(
                                  activeOpportunity.id,
                                  volunteer,
                                  match.score,
                                  match.reasons
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Invitation</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
