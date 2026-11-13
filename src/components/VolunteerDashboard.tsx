import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CloudRain,
  ExternalLink,
  MapPin,
  MessageSquare,
  Navigation,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sun,
  X,
  XCircle,
} from 'lucide-react';
import {
  AvailabilityOverride,
  AvailabilitySlot,
  CauseCategory,
  NotificationLogEntry,
  NotificationPreferences,
  OneMapSearchResult,
  Opportunity,
  PublicHoliday,
  ScheduleConflict,
  ShiftBooking,
  ShiftInvitation,
  TravelEstimate,
  TravelMode,
  VolunteerProfile,
  VolunteerSubTab,
  WeatherApiState,
} from '../types';
import { downloadShiftIcs } from '../utils/calendar';
import {
  calculateMatchScore,
  findConflictingBookings,
  SLOT_LABELS,
  suggestConflictAlternatives,
} from '../utils/matching';
import { WhatsAppReminderPayload } from '../utils/notifications';
import { MissionCalendarView } from './MissionCalendarView';
import { NotificationSettingsView } from './NotificationSettingsView';
import { OneMapExplorer } from './OneMapExplorer';
import { RoutePlannerView } from './RoutePlannerView';

interface VolunteerDashboardProps {
  volunteer: VolunteerProfile;
  opportunities: Opportunity[];
  bookings: ShiftBooking[];
  invitations: ShiftInvitation[];
  holidays: PublicHoliday[];
  holidaysSource: 'live' | 'demo';
  holidaysRateLimited?: boolean;
  dataGovAuthMode?: 'keyless-public' | 'optional-key-configured';
  weather: WeatherApiState;
  activeSubTab: VolunteerSubTab;
  onSelectSubTab: (tab: VolunteerSubTab) => void;
  routePlannerOppId: string | null;
  onOpenRoutePlanner: (oppId: string) => void;
  availabilityOverrides: Record<string, AvailabilityOverride>;
  onUpdateAvailabilityOverride: (date: string, override: AvailabilityOverride | null) => void;
  notificationPreferences: NotificationPreferences;
  notificationLog: NotificationLogEntry[];
  onUpdateNotificationPreferences: (next: NotificationPreferences) => void;
  onSimulateReminder: (payload: WhatsAppReminderPayload) => void;
  onConfirmAttendanceByBookingId: (bookingId: string) => void;
  onConfirmAttendanceByOppId: (oppId: string) => void;
  onUpdateVolunteer: (updated: VolunteerProfile) => void;
  onBookShift: (opportunityId: string) => void;
  onCancelBooking: (bookingId: string) => void;
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
];

const ALL_CAUSES: CauseCategory[] = [
  'Food Distribution',
  'Elderly Companionship',
  'Beach Cleanup',
  'Tutoring Children',
  'Animal Shelter Support',
  'Community Gardening',
];

const ALL_SKILLS = [
  'Logistics',
  'Meal Packing',
  'Mandarin',
  'Malay',
  'Tamil',
  'First Aid',
  'Tutoring',
  'Gardening',
  'Animal Care',
  'Driving',
];

const TRAVEL_MODES: { id: TravelMode; label: string }[] = [
  { id: 'pt', label: 'Public Transport' },
  { id: 'drive', label: 'Drive' },
  { id: 'walk', label: 'Walk' },
  { id: 'cycle', label: 'Cycle' },
];

const QUICK_SG_LOCATIONS: OneMapSearchResult[] = [
  {
    postal: '408600',
    building: 'Eunos MRT / Eunos Crescent',
    address: '30 Eunos Crescent, Singapore 408600',
    district: 'East',
    lat: 1.3198,
    lng: 103.9032,
  },
  {
    postal: '529510',
    building: 'Our Tampines Hub',
    address: '1 Tampines Walk, Singapore 529510',
    district: 'East',
    lat: 1.3529,
    lng: 103.9403,
  },
  {
    postal: '310177',
    building: 'Toa Payoh Central Hub',
    address: '177 Toa Payoh Central, Singapore 310177',
    district: 'Central',
    lat: 1.3332,
    lng: 103.8485,
  },
  {
    postal: '608532',
    building: 'Jurong East Gateway',
    address: '50 Jurong Gateway Road, Singapore 608532',
    district: 'West',
    lat: 1.3331,
    lng: 103.7429,
  },
];

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({
  volunteer,
  opportunities,
  bookings,
  invitations,
  holidays,
  holidaysSource,
  holidaysRateLimited = false,
  dataGovAuthMode = 'keyless-public',
  weather,
  activeSubTab,
  onSelectSubTab,
  routePlannerOppId,
  onOpenRoutePlanner,
  availabilityOverrides,
  onUpdateAvailabilityOverride,
  notificationPreferences,
  notificationLog,
  onUpdateNotificationPreferences,
  onSimulateReminder,
  onConfirmAttendanceByBookingId,
  onConfirmAttendanceByOppId,
  onUpdateVolunteer,
  onBookShift,
  onCancelBooking,
  onRespondInvitation,
  onNotify,
}) => {
  const recommendedRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fitFilter, setFitFilter] = useState<'all' | 'available' | 'rescue' | 'holiday'>('all');
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [missionRanAt, setMissionRanAt] = useState<string | null>(null);
  const [conflictModal, setConflictModal] = useState<{
    candidateOpp: Opportunity;
    conflicts: ScheduleConflict[];
  } | null>(null);

  // OneMap starting location search
  const [postalQuery, setPostalQuery] = useState(volunteer.startingLocation.postalCode);
  const [placeResults, setPlaceResults] = useState<OneMapSearchResult[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [placeSearchSource, setPlaceSearchSource] = useState<'live' | 'demo' | null>(null);
  const [placeSearchError, setPlaceSearchError] = useState('');

  // Travel times from starting location
  const [travelTimes, setTravelTimes] = useState<Record<string, TravelEstimate>>({});
  const [travelSource, setTravelSource] = useState<'live' | 'unavailable'>('unavailable');
  const [loadingTravel, setLoadingTravel] = useState(false);

  useEffect(() => {
    setPostalQuery(volunteer.startingLocation.postalCode);
  }, [volunteer.startingLocation.postalCode]);

  useEffect(() => {
    let active = true;
    const fetchTravelTimes = async () => {
      setLoadingTravel(true);
      try {
        const res = await fetch('/api/onemap/travel-times', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startLat: volunteer.startingLocation.lat,
            startLng: volunteer.startingLocation.lng,
            mode: volunteer.travelMode,
            destinations: opportunities.map((o) => ({ id: o.id, lat: o.lat, lng: o.lng })),
          }),
        });
        if (!res.ok) throw new Error('Travel calculation failed');
        const data = (await res.json()) as {
          source: 'live' | 'unavailable';
          travelTimes: Record<string, TravelEstimate>;
        };
        if (active && data.travelTimes) {
          setTravelTimes(data.travelTimes);
          setTravelSource(data.source);
        }
      } catch {
        // Keep previous state cleanly
      } finally {
        if (active) setLoadingTravel(false);
      }
    };
    fetchTravelTimes();
    return () => {
      active = false;
    };
  }, [
    volunteer.startingLocation.lat,
    volunteer.startingLocation.lng,
    volunteer.travelMode,
    opportunities,
  ]);

  const handleOneMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = postalQuery.trim();
    if (!q) {
      setPlaceSearchError('Please enter a 6-digit Singapore postal code or landmark.');
      return;
    }
    setSearchingPlace(true);
    setPlaceSearchError('');
    try {
      const res = await fetch(`/api/onemap/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as {
        source: 'live' | 'demo';
        results?: OneMapSearchResult[];
      };
      if (data.results && data.results.length > 0) {
        setPlaceResults(data.results);
        setPlaceSearchSource(data.source);
      } else {
        setPlaceResults([]);
        setPlaceSearchError('No Singapore address or postal code matched that query.');
      }
    } catch {
      setPlaceSearchError('Unable to reach OneMap search service right now.');
    } finally {
      setSearchingPlace(false);
    }
  };

  const handleSelectStartingPlace = (place: OneMapSearchResult, sourceTag: 'live' | 'demo') => {
    const district = (['Central', 'East', 'North-East', 'North', 'West'].includes(
      place.district ?? ''
    )
      ? place.district
      : volunteer.district) as VolunteerProfile['district'];

    onUpdateVolunteer({
      ...volunteer,
      district,
      startingLocation: {
        postalCode: place.postal,
        label: place.building,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        source: sourceTag,
      },
    });
    setPlaceResults([]);
    setPostalQuery(place.postal !== 'NIL' ? place.postal : place.building);
    onNotify('Starting location updated', `${place.building} (S${place.postal})`);
  };

  const toggleSlot = (slot: AvailabilitySlot) => {
    const exists = volunteer.availability.includes(slot);
    const nextSlots = exists
      ? volunteer.availability.filter((s) => s !== slot)
      : [...volunteer.availability, slot];
    onUpdateVolunteer({ ...volunteer, availability: nextSlots });
  };

  const toggleCause = (cause: CauseCategory) => {
    const exists = volunteer.causes.includes(cause);
    const nextCauses = exists
      ? volunteer.causes.filter((c) => c !== cause)
      : [...volunteer.causes, cause];
    onUpdateVolunteer({ ...volunteer, causes: nextCauses });
  };

  const toggleSkill = (skill: string) => {
    const exists = volunteer.skills.includes(skill);
    const nextSkills = exists
      ? volunteer.skills.filter((s) => s !== skill)
      : [...volunteer.skills, skill];
    onUpdateVolunteer({ ...volunteer, skills: nextSkills });
  };

  const pendingInvitations = useMemo(
    () =>
      invitations.filter(
        (inv) => inv.volunteerId === volunteer.id && inv.status === 'Pending'
      ),
    [invitations, volunteer.id]
  );

  const myBookings = useMemo(
    () => bookings.filter((b) => b.volunteerId === volunteer.id && b.status !== 'Cancelled'),
    [bookings, volunteer.id]
  );

  const upcomingBookings = myBookings.filter(
    (b) => b.status === 'Confirmed' || b.status === 'Waitlisted'
  );
  const completedBookings = myBookings.filter((b) => b.status === 'Present');

  const causesSupported = useMemo(() => {
    const set = new Set<CauseCategory>();
    myBookings.forEach((b) => {
      const opp = opportunities.find((o) => o.id === b.opportunityId);
      if (opp) set.add(opp.cause);
    });
    return Array.from(set);
  }, [myBookings, opportunities]);

  const upcomingHolidays = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return holidays.filter((h) => h.date >= todayIso).slice(0, 6);
  }, [holidays]);

  const longWeekendHolidays = useMemo(() => {
    return upcomingHolidays.filter((h) =>
      ['Friday', 'Saturday', 'Sunday', 'Monday'].includes(h.day)
    );
  }, [upcomingHolidays]);

  const holidayMap = useMemo(() => {
    const map = new Map<string, PublicHoliday>();
    holidays.forEach((h) => map.set(h.date, h));
    return map;
  }, [holidays]);

  const weatherByDate = useMemo(() => {
    const map = new Map<string, WeatherApiState['forecasts'][number]>();
    weather.forecasts.forEach((f) => map.set(f.date, f));
    return map;
  }, [weather.forecasts]);

  const scoredOpportunities = useMemo(() => {
    return opportunities
      .map((opp) => ({
        opportunity: opp,
        travel: travelTimes[opp.id],
        match: calculateMatchScore(volunteer, opp, travelTimes[opp.id], holidays),
      }))
      .filter(({ opportunity, travel, match }) => {
        // Duration preference filter
        if (volunteer.preferredDuration === 'short' && opportunity.durationHours > 2.5) {
          return false;
        }
        if (
          volunteer.preferredDuration === 'medium' &&
          (opportunity.durationHours < 2.5 || opportunity.durationHours > 4)
        ) {
          return false;
        }
        if (volunteer.preferredDuration === 'long' && opportunity.durationHours < 4) {
          return false;
        }

        // Travel convenience filter: if live travel minutes exist, enforce limit; otherwise enforce radius proxy when < 90
        if (volunteer.maxTravelMinutes < 90) {
          if (travel && travel.minutes !== null) {
            if (travel.minutes > volunteer.maxTravelMinutes) return false;
          } else if (travel && typeof travel.distanceKm === 'number') {
            const maxKmProxy =
              volunteer.maxTravelMinutes <= 15
                ? 4.5
                : volunteer.maxTravelMinutes <= 30
                ? 8.5
                : volunteer.maxTravelMinutes <= 45
                ? 13
                : 22;
            if (travel.distanceKm > maxKmProxy) return false;
          }
        }

        if (fitFilter === 'available' && !match.availabilityMatch) return false;
        if (fitFilter === 'rescue' && opportunity.urgency !== 'Urgent Fill') return false;
        if (
          fitFilter === 'holiday' &&
          !match.holidayMatch &&
          opportunity.slot !== 'public-holiday'
        ) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const hit =
            opportunity.title.toLowerCase().includes(q) ||
            opportunity.charityName.toLowerCase().includes(q) ||
            opportunity.location.toLowerCase().includes(q) ||
            opportunity.postalCode.includes(q) ||
            opportunity.cause.toLowerCase().includes(q) ||
            opportunity.requiredSkills.some((s) => s.toLowerCase().includes(q));
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => b.match.score - a.match.score);
  }, [opportunities, travelTimes, volunteer, holidays, fitFilter, searchQuery]);

  const handleFindMyMission = () => {
    onSelectSubTab('discover');
    setMissionRanAt(new Date().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }));
    onNotify(
      `Found ${scoredOpportunities.length} matched missions for ${volunteer.name}`,
      `Ranked by availability, skills, causes, and proximity to ${volunteer.startingLocation.label}.`
    );
    window.setTimeout(() => {
      recommendedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleAttemptBookShift = (opp: Opportunity) => {
    const conflicts = findConflictingBookings(
      opp,
      volunteer.id,
      bookings,
      opportunities
    );
    if (conflicts.length > 0) {
      setConflictModal({ candidateOpp: opp, conflicts });
      return;
    }
    onBookShift(opp.id);
  };

  const handleDownloadIcs = (opp: Opportunity) => {
    const filename = downloadShiftIcs(opp, volunteer.name);
    onNotify(
      'ICS calendar file downloaded',
      `Saved ${filename}. Open it to add to Apple Calendar, Outlook, or Google Calendar.`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Pending Rescue a Shift Invitations Banner */}
      {pendingInvitations.length > 0 && (
        <div
          role="region"
          aria-label="Shift Rescue Invitations"
          className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-amber-900">
            <BellRing className="w-5 h-5 text-amber-700 shrink-0" />
            <h2 className="font-display text-base font-bold">
              Rescue a Shift Invitation for {volunteer.name} ({pendingInvitations.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendingInvitations.map((inv) => {
              const opp = opportunities.find((o) => o.id === inv.opportunityId);
              if (!opp) return null;
              return (
                <div
                  key={inv.id}
                  className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {opp.title} · {inv.charityName}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {opp.dateLabel} · {opp.timeLabel} · {opp.location} (S{opp.postalCode}) ·{' '}
                      <span className="font-mono-tabular font-semibold text-teal-700">
                        {inv.matchScore}% match
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Why you matched: {inv.matchReasons.join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onRespondInvitation(inv.id, false)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => onRespondInvitation(inv.id, true)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                    >
                      Accept Invitation
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Volunteer Profile Header + Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
                <ShieldCheck className="w-4 h-4" />
                Singpass {volunteer.singpassTier}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Start: {volunteer.startingLocation.label} (S{volunteer.startingLocation.postalCode})
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Max travel:{' '}
                {volunteer.maxTravelMinutes < 90 ? `${volunteer.maxTravelMinutes} min` : 'Any'}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
              {volunteer.name}&apos;s Volunteering Hub
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Find shifts matched to your actual schedule, causes, skills, and Singapore travel
              convenience.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-8 shrink-0">
            <div>
              <p className="text-xs text-slate-500">Completed Hours</p>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-0.5">
                {volunteer.hoursLogged}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Missions Done</p>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-0.5">
                {volunteer.shiftsCompleted}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Upcoming Shifts</p>
              <p className="font-mono-tabular text-2xl font-bold text-teal-700 mt-0.5">
                {upcomingBookings.length}
              </p>
            </div>
          </div>
        </div>

        {/* Unified 5-Tab Volunteer Workspace Navigation */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => onSelectSubTab('discover')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === 'discover'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Discover Missions ({scoredOpportunities.length})
            </button>
            <button
              type="button"
              onClick={() => onSelectSubTab('calendar')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === 'calendar'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Calendar
            </button>
            <button
              type="button"
              onClick={() => onSelectSubTab('route-planner')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === 'route-planner'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Plan My Journey
            </button>
            <button
              type="button"
              onClick={() => onSelectSubTab('my-volunteering')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === 'my-volunteering'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Volunteering ({upcomingBookings.length})
            </button>
            <button
              type="button"
              onClick={() => onSelectSubTab('notifications')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === 'notifications'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Notification Settings
            </button>
          </div>
          {missionRanAt && activeSubTab === 'discover' && (
            <span className="font-mono-tabular text-xs text-teal-700">
              Last matched at {missionRanAt}
            </span>
          )}
        </div>
      </div>

      {activeSubTab === 'discover' ? (
        <div className="space-y-8">
          {/* SECTION A: FIND MY MISSION (Prominent Matching Form) */}
          <section
            aria-label="Find My Mission matching form"
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  A. Find My Mission
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure causes, skills, Singapore starting location, availability, duration,
                  and travel-time limit.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFindMyMission}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Find My Mission</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Column 1: Starting Location & Travel Preferences */}
              <div className="lg:col-span-4 space-y-4">
                <div>
                  <label htmlFor="onemap-postal" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Singapore Postal Code or Starting Location
                  </label>
                  <form onSubmit={handleOneMapSearch} className="flex gap-2">
                    <input
                      id="onemap-postal"
                      type="text"
                      value={postalQuery}
                      onChange={(e) => setPostalQuery(e.target.value)}
                      placeholder="e.g. 408600 or Eunos"
                      className="flex-1 min-w-0 px-3 py-2 text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <button
                      type="submit"
                      disabled={searchingPlace}
                      className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {searchingPlace ? '...' : 'Locate'}
                    </button>
                  </form>
                  {placeSearchError && (
                    <p className="text-xs text-red-600 mt-1">{placeSearchError}</p>
                  )}

                  {/* Quick SG Presets */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_SG_LOCATIONS.map((loc) => (
                      <button
                        key={loc.postal}
                        type="button"
                        onClick={() => handleSelectStartingPlace(loc, 'demo')}
                        className={`px-2 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                          volunteer.startingLocation.postalCode === loc.postal
                            ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                            : 'bg-[#FAFAF9] border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {loc.building.split(' ')[0]} ({loc.postal})
                      </button>
                    ))}
                  </div>

                  {placeResults.length > 0 && (
                    <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 bg-[#FAFAF9]">
                      <div className="px-3 py-1.5 text-[11px] text-slate-500 flex justify-between">
                        <span>Select location</span>
                        <span>{placeSearchSource === 'live' ? 'OneMap Live' : 'Demo SG Data'}</span>
                      </div>
                      {placeResults.map((place, idx) => (
                        <button
                          key={`${place.postal}-${idx}`}
                          type="button"
                          onClick={() =>
                            handleSelectStartingPlace(place, placeSearchSource ?? 'demo')
                          }
                          className="w-full text-left px-3 py-2 hover:bg-teal-50 cursor-pointer"
                        >
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {place.building}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{place.address}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="vol-travel-mode" className="block text-xs font-semibold text-slate-700 mb-1">
                      Transport Mode
                    </label>
                    <select
                      id="vol-travel-mode"
                      value={volunteer.travelMode}
                      onChange={(e) =>
                        onUpdateVolunteer({
                          ...volunteer,
                          travelMode: e.target.value as TravelMode,
                        })
                      }
                      className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      {TRAVEL_MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="vol-max-travel" className="block text-xs font-semibold text-slate-700 mb-1">
                      Max Travel Time
                    </label>
                    <select
                      id="vol-max-travel"
                      value={volunteer.maxTravelMinutes}
                      onChange={(e) =>
                        onUpdateVolunteer({
                          ...volunteer,
                          maxTravelMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>Any travel time</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="vol-duration" className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Volunteering Duration
                  </label>
                  <select
                    id="vol-duration"
                    value={volunteer.preferredDuration}
                    onChange={(e) =>
                      onUpdateVolunteer({
                        ...volunteer,
                        preferredDuration: e.target.value as VolunteerProfile['preferredDuration'],
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="any">Any duration</option>
                    <option value="short">Short shift (up to 2.5 hrs)</option>
                    <option value="medium">Half-day (2.5 – 4 hrs)</option>
                    <option value="long">Extended shift (4+ hrs)</option>
                  </select>
                </div>
              </div>

              {/* Column 2: Causes & Skills */}
              <div className="lg:col-span-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Preferred Volunteering Causes
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {ALL_CAUSES.map((cause) => {
                      const active = volunteer.causes.includes(cause);
                      return (
                        <button
                          key={cause}
                          type="button"
                          onClick={() => toggleCause(cause)}
                          aria-pressed={active}
                          className={`px-2.5 py-2 text-left text-xs rounded-lg border transition-colors cursor-pointer ${
                            active
                              ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                              : 'bg-[#FAFAF9] border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {cause}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Skills &amp; Interests
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SKILLS.map((skill) => {
                      const active = volunteer.skills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          aria-pressed={active}
                          className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                            active
                              ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Column 3: Availability Calendar & Public Holidays */}
              <div className="lg:col-span-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Weekly Availability Calendar
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {WEEKDAY_WEEKEND_SLOTS.map((slot) => {
                      const active = volunteer.availability.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleSlot(slot)}
                          aria-pressed={active}
                          className={`px-2.5 py-2 text-left text-xs rounded-lg border transition-colors cursor-pointer ${
                            active
                              ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                              : 'bg-[#FAFAF9] border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {SLOT_LABELS[slot]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Official Public Holiday Checkbox + Calendar Highlights */}
                <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={volunteer.availability.includes('public-holiday')}
                      onChange={() => toggleSlot('public-holiday')}
                      className="w-4 h-4 accent-teal-700 rounded"
                    />
                    <span>I&apos;m available on public holidays</span>
                  </label>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>Upcoming SG Holidays</span>
                    <span>
                      {holidaysSource === 'live'
                        ? dataGovAuthMode === 'optional-key-configured'
                          ? 'data.gov.sg Live (API Key)'
                          : 'data.gov.sg Live (Keyless)'
                        : holidaysRateLimited
                        ? 'Rate Limited · Fallback Active'
                        : 'Fallback MOM Dataset'}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {upcomingHolidays.map((h) => (
                      <div
                        key={`${h.date}-${h.holiday}`}
                        className="flex items-center justify-between text-xs py-0.5"
                      >
                        <span className="font-medium text-teal-900 truncate pr-2">{h.holiday}</span>
                        <span className="font-mono-tabular text-[11px] text-slate-500 shrink-0">
                          {h.date} ({h.day.slice(0, 3)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION B: RECOMMENDED MISSIONS + MAP + LONG WEEKEND DISCOVERY */}
          <div ref={recommendedRef} className="space-y-5">
            {/* Long Weekend Volunteering Discovery Strip */}
            {longWeekendHolidays.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-teal-700">
                    Long Weekend Volunteering Discovery
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    Official public holidays forming upcoming long weekends:{' '}
                    {longWeekendHolidays
                      .slice(0, 3)
                      .map((h) => `${h.holiday} (${h.date})`)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFitFilter('holiday')}
                  className="px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explore Long Weekend Shifts
                </button>
              </div>
            )}

            {/* Live Weather Status Strip */}
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Sun className="w-4 h-4 text-amber-600 shrink-0" />
                {weather.source === 'live' ? (
                  <span>
                    <strong>
                      NEA Weather Outlook (
                      {weather.supportedRange
                        ? `${weather.supportedRange.startDate} to ${weather.supportedRange.endDate}`
                        : '24-Hour Live'}
                      ):
                    </strong>{' '}
                    {weather.twentyFourHourSummary ?? '4-day forecast active for outdoor shifts.'}
                  </span>
                ) : (
                  <span>
                    <strong>NEA Weather Outlook:</strong>{' '}
                    {weather.rateLimited
                      ? 'data.gov.sg rate limit reached; future dates show "Forecast not yet available".'
                      : 'Live 4-day forecast currently unavailable; future dates show "Forecast not yet available".'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowMap((prev) => !prev)}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 whitespace-nowrap cursor-pointer"
              >
                {showMap ? 'Hide Map' : 'Show OneMap View'}
              </button>
            </div>

            {showMap && (
              <OneMapExplorer
                startingLocation={volunteer.startingLocation}
                opportunities={scoredOpportunities.map((s) => s.opportunity)}
                travelTimes={travelTimes}
                selectedOppId={selectedOppId}
                onSelectOpportunity={(id) => setSelectedOppId(id)}
              />
            )}

            {/* Recommended Missions Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFitFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                    fitFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Ranked ({scoredOpportunities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFitFilter('available')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                    fitFilter === 'available'
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fits My Availability
                </button>
                <button
                  type="button"
                  onClick={() => setFitFilter('rescue')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                    fitFilter === 'rescue'
                      ? 'bg-white text-amber-800 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rescue a Shift
                </button>
                <button
                  type="button"
                  onClick={() => setFitFilter('holiday')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                    fitFilter === 'holiday'
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Public Holidays
                </button>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Keyword filter..."
                  aria-label="Filter recommended missions"
                  className="px-3 py-1.5 text-xs bg-[#FAFAF9] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <span className="font-mono-tabular text-xs text-slate-500 whitespace-nowrap">
                  {loadingTravel
                    ? 'Calculating...'
                    : travelSource === 'live'
                    ? 'OneMap Routing Live'
                    : 'Distance Convenience Active'}
                </span>
              </div>
            </div>

            {/* Recommended Mission Cards */}
            {scoredOpportunities.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <p className="font-display text-base font-bold text-slate-900">
                  No missions match your current travel limit or filters
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Increase your maximum travel time or reset filters to view all 12 Singapore
                  opportunities.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFitFilter('all');
                    onUpdateVolunteer({
                      ...volunteer,
                      maxTravelMinutes: 90,
                      preferredDuration: 'any',
                    });
                  }}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Show All Opportunities
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {scoredOpportunities.map(({ opportunity, travel, match }) => {
                  const existingBooking = myBookings.find(
                    (b) => b.opportunityId === opportunity.id
                  );
                  const spotsLeft = Math.max(0, opportunity.spotsTotal - opportunity.spotsFilled);
                  const holidayHit = holidayMap.get(opportunity.isoDate);
                  const dayForecast = weatherByDate.get(opportunity.isoDate);
                  const isSelectedOnMap = selectedOppId === opportunity.id;
                  const conflicts = !existingBooking
                    ? findConflictingBookings(
                        opportunity,
                        volunteer.id,
                        bookings,
                        opportunities
                      )
                    : [];
                  const hasOverlapConflict = conflicts.some((c) => c.type === 'overlap');
                  const hasTightConflict =
                    !hasOverlapConflict && conflicts.some((c) => c.type === 'tight-transition');

                  return (
                    <article
                      key={opportunity.id}
                      className={`bg-white border rounded-2xl p-6 transition-colors ${
                        isSelectedOnMap
                          ? 'border-teal-600 ring-1 ring-teal-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-800">
                              {opportunity.charityName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{opportunity.cause}</span>
                            <span aria-hidden="true">·</span>
                            {opportunity.charityVerificationStatus ===
                            'Authoritatively Verified' ? (
                              <span className="inline-flex items-center gap-1 font-medium text-teal-700">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Verified UEN {opportunity.charityUen}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                {opportunity.charityVerificationStatus}
                              </span>
                            )}
                            <a
                              href="https://www.charities.gov.sg"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-slate-500 hover:text-teal-700 underline underline-offset-2"
                            >
                              <span>Charity Portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {opportunity.urgency === 'Urgent Fill' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-amber-700">
                                  Needs Replacement
                                </span>
                              </>
                            )}
                            {holidayHit && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-teal-700">
                                  Public Holiday: {holidayHit.holiday}
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="font-display text-lg font-bold text-slate-900 mt-1.5">
                            {opportunity.title}
                          </h3>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <p className="font-mono-tabular text-lg font-bold text-teal-700">
                            {match.score}% match
                          </p>
                          <p className="font-mono-tabular text-xs text-slate-500">
                            {spotsLeft > 0
                              ? `${spotsLeft} of ${opportunity.spotsTotal} volunteers needed`
                              : `Full (${opportunity.spotsFilled}/${opportunity.spotsTotal})`}
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        {opportunity.description}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {opportunity.dateLabel} · {opportunity.timeLabel} (
                          {opportunity.durationHours}h)
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {opportunity.location}, S{opportunity.postalCode} ({opportunity.district})
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                          <Navigation className="w-3.5 h-3.5 text-teal-700" />
                          {travel?.minutes !== null && travel?.minutes !== undefined ? (
                            <span className="font-mono-tabular">
                              {travel.minutes} min ({travel.distanceKm} km via OneMap)
                            </span>
                          ) : (
                            <span>
                              Travel time unavailable
                              {travel?.distanceKm !== undefined ? ` · ${travel.distanceKm} km away` : ''}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Compatibility & Conflict Status Strip */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className={match.travelMatch ? 'text-teal-700 font-medium' : 'text-amber-700 font-medium'}>
                          {match.travelMatch
                            ? `Transport compatible (${volunteer.travelMode.toUpperCase()})`
                            : 'Longer commute'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className={match.availabilityMatch ? 'text-teal-700 font-medium' : 'text-slate-500'}>
                          {match.availabilityMatch ? 'Fits availability' : 'Outside selected slots'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        {hasOverlapConflict ? (
                          <span className="font-semibold text-red-600">
                            Conflict: Overlaps existing booking
                          </span>
                        ) : hasTightConflict ? (
                          <span className="font-semibold text-amber-700">
                            Tight same-day transit window
                          </span>
                        ) : (
                          <span className="text-teal-700 font-medium">No schedule conflict</span>
                        )}
                      </div>

                      {/* Outdoor Weather Forecast + Wet-Weather Reminder (No Fabrication) */}
                      {opportunity.isOutdoor && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          {dayForecast ? (
                            dayForecast.disruptionRisk ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                Potential rain disruption ({dayForecast.date}):{' '}
                                {dayForecast.forecast}
                                {dayForecast.tempLow !== null && dayForecast.tempHigh !== null
                                  ? ` · ${dayForecast.tempLow}–${dayForecast.tempHigh}°C`
                                  : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-slate-700">
                                <CloudRain className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                NEA Forecast ({dayForecast.date}): {dayForecast.forecast}
                                {dayForecast.tempLow !== null && dayForecast.tempHigh !== null
                                  ? ` · ${dayForecast.tempLow}–${dayForecast.tempHigh}°C`
                                  : ''}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500">
                              Outdoor shift ({opportunity.isoDate}): Forecast not yet available.
                            </span>
                          )}
                          <span className="text-slate-500">
                            Reminder: Check the charity&apos;s wet-weather arrangements.
                          </span>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          {match.reasons.length > 0
                            ? `Reason for match: ${match.reasons.join(' · ')}`
                            : 'Outside selected availability slots'}
                        </p>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenRoutePlanner(opportunity.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-[#FAFAF9] border border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5 text-teal-700" />
                            <span>Plan Journey</span>
                          </button>

                          {existingBooking ? (
                            <div className="inline-flex flex-wrap items-center gap-2.5">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                                <CheckCircle2 className="w-4 h-4" />
                                {existingBooking.status === 'Present'
                                  ? 'Completed & Verified'
                                  : `Registered (${existingBooking.status})`}
                              </span>
                              {existingBooking.status === 'Confirmed' && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadIcs(opportunity)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>Download .ics</span>
                                </button>
                              )}
                              {existingBooking.status !== 'Present' && (
                                <button
                                  type="button"
                                  onClick={() => onCancelBooking(existingBooking.id)}
                                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAttemptBookShift(opportunity)}
                              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                hasOverlapConflict
                                  ? 'bg-red-700 hover:bg-red-800'
                                  : opportunity.urgency === 'Urgent Fill'
                                  ? 'bg-amber-600 hover:bg-amber-700'
                                  : 'bg-teal-700 hover:bg-teal-800'
                              }`}
                            >
                              <CalendarCheck className="w-3.5 h-3.5" />
                              <span>
                                {hasOverlapConflict
                                  ? 'Schedule Conflict'
                                  : spotsLeft === 0
                                  ? 'Join Waitlist'
                                  : opportunity.urgency === 'Urgent Fill'
                                  ? 'Rescue & Register'
                                  : 'Register'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeSubTab === 'calendar' ? (
        <MissionCalendarView
          volunteer={volunteer}
          opportunities={opportunities}
          bookings={bookings}
          invitations={invitations}
          holidays={holidays}
          holidaysSource={holidaysSource}
          availabilityOverrides={availabilityOverrides}
          onUpdateAvailabilityOverride={onUpdateAvailabilityOverride}
          onUpdateVolunteer={onUpdateVolunteer}
          onBookShift={(oppId) => {
            const opp = opportunities.find((o) => o.id === oppId);
            if (opp) handleAttemptBookShift(opp);
          }}
          onCancelBooking={onCancelBooking}
          onConfirmAttendance={onConfirmAttendanceByBookingId}
          onPlanJourney={onOpenRoutePlanner}
          onRespondInvitation={onRespondInvitation}
          onNotify={onNotify}
        />
      ) : activeSubTab === 'route-planner' ? (
        <RoutePlannerView
          volunteer={volunteer}
          opportunities={opportunities}
          bookings={bookings}
          travelTimes={travelTimes}
          initialOpportunityId={routePlannerOppId}
          arrivalBufferMinutes={notificationPreferences.departureBufferMinutes}
          onChangeBufferMinutes={(buf) =>
            onUpdateNotificationPreferences({
              ...notificationPreferences,
              departureBufferMinutes: buf,
            })
          }
          onUpdateVolunteer={onUpdateVolunteer}
          onOpenCalendar={() => onSelectSubTab('calendar')}
          onNotify={onNotify}
        />
      ) : activeSubTab === 'notifications' ? (
        <NotificationSettingsView
          volunteer={volunteer}
          opportunities={opportunities}
          bookings={bookings}
          travelTimes={travelTimes}
          preferences={notificationPreferences}
          notificationLog={notificationLog}
          onUpdatePreferences={onUpdateNotificationPreferences}
          onSimulateReminder={onSimulateReminder}
          onViewMission={() => onSelectSubTab('calendar')}
          onPlanJourney={onOpenRoutePlanner}
          onConfirmAttendance={onConfirmAttendanceByOppId}
        />
      ) : (
        /* SECTION C: MY VOLUNTEERING */
        <section className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs text-slate-500">Completed Volunteering Hours</p>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
                {volunteer.hoursLogged} hrs
              </p>
              <p className="text-xs text-slate-500 mt-1">Verified volunteering history</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs text-slate-500">Missions Completed</p>
              <p className="font-mono-tabular text-2xl font-bold text-teal-700 mt-1">
                {volunteer.shiftsCompleted}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {completedBookings.length} logged in current session
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs text-slate-500">Causes Supported</p>
              <p className="text-sm font-semibold text-slate-900 mt-2">
                {causesSupported.length > 0
                  ? causesSupported.join(', ')
                  : volunteer.causes.join(', ')}
              </p>
            </div>
          </div>

          {/* Calendar Integration Honesty Note */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">Calendar Export &amp; Reminder Shortcuts</p>
              <p className="mt-0.5">
                Direct Google Calendar sync is not enabled (OAuth not configured). Use{' '}
                <strong>Download .ics</strong> on any confirmed commitment or manage shifts inside{' '}
                <strong>My Calendar</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectSubTab('notifications')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Notification Settings</span>
            </button>
          </div>

          {/* Upcoming Commitments */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
              Upcoming Commitments ({upcomingBookings.length})
            </h2>
            {upcomingBookings.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-600">
                  You have no upcoming volunteer shifts booked yet.
                </p>
                <button
                  type="button"
                  onClick={() => onSelectSubTab('discover')}
                  className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Browse Recommended Missions
                </button>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {upcomingBookings.map((booking) => {
                  const opp = opportunities.find((o) => o.id === booking.opportunityId);
                  if (!opp) return null;
                  return (
                    <div
                      key={booking.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-teal-700">{booking.status}</span>
                          {booking.attendanceConfirmed && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-teal-800">
                                Attendance Confirmed ({booking.attendanceConfirmedAt ?? 'Ready'})
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{opp.charityName}</span>
                        </div>
                        <p className="text-base font-bold text-slate-900 mt-0.5">{opp.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {opp.dateLabel} · {opp.timeLabel} · {opp.location} (S{opp.postalCode})
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenRoutePlanner(opp.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-[#FAFAF9] border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-teal-700" />
                          <span>Plan My Journey</span>
                        </button>
                        {booking.status === 'Confirmed' && !booking.attendanceConfirmed && (
                          <button
                            type="button"
                            onClick={() => onConfirmAttendanceByBookingId(booking.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Attendance</span>
                          </button>
                        )}
                        {booking.status === 'Confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleDownloadIcs(opp)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Download .ics</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onCancelBooking(booking.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Shift</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Scheduling Conflict Detection Modal */}
      {conflictModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="conflict-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 id="conflict-modal-title" className="font-display text-lg font-bold text-slate-900">
                  {conflictModal.conflicts.some((c) => c.type === 'overlap')
                    ? 'Scheduling Conflict Detected'
                    : 'Tight Inter-Shift Transit Warning'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                aria-label="Close conflict dialog"
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
              <p className="font-semibold text-slate-900">
                Selected Shift: {conflictModal.candidateOpp.title} (
                {conflictModal.candidateOpp.dateLabel} · {conflictModal.candidateOpp.timeLabel})
              </p>
              {conflictModal.conflicts.map((c) => (
                <p key={c.booking.id} className="text-red-700 font-medium">
                  {c.message}
                </p>
              ))}
            </div>

            {/* Conflict-Free Alternative Suggestions */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Suggested Conflict-Free Alternatives
              </p>
              <div className="space-y-1.5">
                {suggestConflictAlternatives(
                  conflictModal.candidateOpp,
                  volunteer,
                  opportunities,
                  travelTimes,
                  holidays,
                  bookings
                ).map(({ opportunity: alt, score }) => (
                  <div
                    key={alt.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{alt.title}</p>
                      <p className="text-slate-500 mt-0.5 font-mono-tabular">
                        {alt.dateLabel} · {alt.timeLabel} · {score}% match
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setConflictModal(null);
                        onBookShift(alt.id);
                      }}
                      className="px-3 py-1.5 font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shrink-0 cursor-pointer"
                    >
                      Register Instead
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConflictModal(null);
                  onSelectSubTab('calendar');
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Manage in My Calendar
              </button>
              {!conflictModal.conflicts.some((c) => c.type === 'overlap') && (
                <button
                  type="button"
                  onClick={() => {
                    const id = conflictModal.candidateOpp.id;
                    setConflictModal(null);
                    onBookShift(id);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
                >
                  Register Anyway
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
