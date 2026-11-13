import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudRain,
  ExternalLink,
  MapPin,
  Navigation,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  User,
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
import { calculateSuggestedDeparture } from '../utils/time';
import { MissionCalendarView } from './MissionCalendarView';
import { NotificationSettingsView } from './NotificationSettingsView';
import { OneMapExplorer } from './OneMapExplorer';
import { RoutePlannerView } from './RoutePlannerView';

interface VolunteerDashboardProps {
  volunteer: VolunteerProfile;
  allVolunteers?: VolunteerProfile[];
  onSelectVolunteer?: (volunteerId: string) => void;
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
  { id: 'walk', label: 'Walking' },
  { id: 'drive', label: 'Driving' },
  { id: 'cycle', label: 'Cycling' },
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

const MOBILE_VOLUNTEER_TABS: { id: VolunteerSubTab; label: string }[] = [
  { id: 'discover', label: 'Discover' },
  { id: 'calendar', label: 'My Calendar' },
  { id: 'my-volunteering', label: 'My Missions' },
  { id: 'route-planner', label: 'Plan My Journey' },
  { id: 'profile', label: 'Profile' },
];

function travelModeReadable(mode: TravelMode): string {
  switch (mode) {
    case 'pt':
      return 'Public transport';
    case 'walk':
      return 'Walking';
    case 'drive':
      return 'Driving';
    case 'cycle':
      return 'Cycling';
  }
}

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({
  volunteer,
  allVolunteers,
  onSelectVolunteer,
  opportunities,
  bookings,
  invitations,
  holidays,
  holidaysSource,
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
  const [fitFilter, setFitFilter] = useState<'all' | 'available' | 'urgent' | 'holiday'>('all');
  const [commitmentFilter, setCommitmentFilter] = useState<'all' | 'One-time' | 'Recurring'>('all');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Unified 3-Step Registration & Friendly Confirmation Modal
  const [registrationModal, setRegistrationModal] = useState<{
    step: 'review' | 'confirmed';
    opportunity: Opportunity;
    conflicts: ScheduleConflict[];
    travel?: TravelEstimate;
  } | null>(null);

  // Starting location search
  const [postalQuery, setPostalQuery] = useState(volunteer.startingLocation.postalCode);
  const [placeResults, setPlaceResults] = useState<OneMapSearchResult[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [placeSearchSource, setPlaceSearchSource] = useState<'live' | 'demo' | null>(null);
  const [placeSearchError, setPlaceSearchError] = useState('');

  // Travel times from starting location
  const [travelTimes, setTravelTimes] = useState<Record<string, TravelEstimate>>({});
  const [loadingTravel, setLoadingTravel] = useState(false);

  const normalizedTab: VolunteerSubTab =
    activeSubTab === 'notifications' ? 'profile' : activeSubTab;

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

  const handlePlaceSearch = async (e: React.FormEvent) => {
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
        setPlaceSearchError('No Singapore address or postal code matched that search.');
      }
    } catch {
      setPlaceSearchError('Unable to look up that address right now. Please try a preset area.');
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
    return holidays.filter((h) => h.date >= todayIso).slice(0, 5);
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
        if (fitFilter === 'urgent' && opportunity.urgency !== 'Urgent Fill') return false;
        if (
          fitFilter === 'holiday' &&
          !match.holidayMatch &&
          opportunity.slot !== 'public-holiday'
        ) {
          return false;
        }

        if (commitmentFilter !== 'all') {
          const oppCommitment = opportunity.commitmentType ?? 'One-time';
          if (oppCommitment !== commitmentFilter) return false;
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
  }, [opportunities, travelTimes, volunteer, holidays, fitFilter, commitmentFilter, searchQuery]);

  const handleOpenRegistrationModal = (opp: Opportunity) => {
    const conflicts = findConflictingBookings(
      opp,
      volunteer.id,
      bookings,
      opportunities
    );
    setRegistrationModal({
      step: 'review',
      opportunity: opp,
      conflicts,
      travel: travelTimes[opp.id],
    });
  };

  const handleConfirmRegistration = (oppId: string) => {
    onBookShift(oppId);
    setRegistrationModal((prev) =>
      prev && prev.opportunity.id === oppId ? { ...prev, step: 'confirmed' } : prev
    );
  };

  const handleDownloadIcs = (opp: Opportunity) => {
    const filename = downloadShiftIcs(opp, volunteer.name);
    onNotify(
      'Calendar invite saved (.ics)',
      `Downloaded ${filename}. Open it to add this mission to your calendar.`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Mobile Quick Navigation Strip (Desktop already shows 5 items cleanly in Navbar) */}
      <div className="md:hidden overflow-x-auto pb-1 -mx-1 px-1">
        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl min-w-full">
          {MOBILE_VOLUNTEER_TABS.map((tab) => {
            const active = normalizedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectSubTab(tab.id)}
                className={`flex-1 px-3 min-h-[40px] text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Urgent Shift Invitations Banner (Only when coordinator invited this volunteer) */}
      {pendingInvitations.length > 0 && (
        <div
          role="region"
          aria-label="Urgent shift invitations"
          className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-amber-900">
            <BellRing className="w-5 h-5 text-amber-700 shrink-0" />
            <h2 className="font-display text-base font-bold">
              You have {pendingInvitations.length === 1 ? 'an urgent shift invitation' : `${pendingInvitations.length} urgent shift invitations`}
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
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {opp.dateLabel} · {opp.timeLabel} · {opp.location} (S{opp.postalCode})
                    </p>
                    {inv.matchReasons.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {inv.matchReasons.slice(0, 3).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onRespondInvitation(inv.id, false)}
                      className="px-4 min-h-[42px] text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => onRespondInvitation(inv.id, true)}
                      className="px-4 min-h-[42px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                    >
                      Accept Spot
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {normalizedTab === 'discover' ? (
        <div className="space-y-7">
          {/* Calm Personalised Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Find a mission that fits your week, {volunteer.name.split(' ')[0]}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Showing opportunities near{' '}
                <strong className="font-semibold text-slate-800">
                  {volunteer.startingLocation.label}
                </strong>{' '}
                that work around your schedule.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onSelectSubTab('profile')}
                className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-teal-700" />
                <span>Edit Profile &amp; Alerts</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectSubTab('my-volunteering')}
                className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>My Missions ({upcomingBookings.length})</span>
              </button>
            </div>
          </div>

          {/* Question-Led Discovery Filter Card */}
          <section
            aria-label="Filter volunteering missions"
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Question 1: Where can I volunteer? */}
              <div className="space-y-2">
                <label htmlFor="onemap-postal" className="block text-xs font-bold text-slate-800">
                  Where are you starting from?
                </label>
                <form onSubmit={handlePlaceSearch} className="flex gap-1.5">
                  <input
                    id="onemap-postal"
                    type="text"
                    value={postalQuery}
                    onChange={(e) => setPostalQuery(e.target.value)}
                    placeholder="Postal code or MRT"
                    className="flex-1 min-w-0 px-3 min-h-[42px] text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <button
                    type="submit"
                    disabled={searchingPlace}
                    className="px-3.5 min-h-[42px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {searchingPlace ? '...' : 'Update'}
                  </button>
                </form>
                {placeSearchError && (
                  <p className="text-xs text-red-600">{placeSearchError}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
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
                      {loc.building.split(' ')[0]}
                    </button>
                  ))}
                </div>
                {placeResults.length > 0 && (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-[#FAFAF9]">
                    {placeResults.slice(0, 4).map((place, idx) => (
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

              {/* Question 2: How far & how will you travel? */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-slate-800">How far do you want to travel?</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="vol-travel-mode" className="block text-[11px] text-slate-500 mb-1">
                      Travel by
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
                      className="w-full px-2.5 min-h-[42px] text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      {TRAVEL_MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="vol-max-travel" className="block text-[11px] text-slate-500 mb-1">
                      Max travel time
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
                      className="w-full px-2.5 min-h-[42px] text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value={15}>Within 15 min</option>
                      <option value={30}>Within 30 min</option>
                      <option value={45}>Within 45 min</option>
                      <option value={60}>Within 60 min</option>
                      <option value={90}>Anywhere in SG</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="vol-duration" className="block text-[11px] text-slate-500 mb-1">
                    How much time do you have?
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
                    className="w-full px-2.5 min-h-[42px] text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="any">Any duration</option>
                    <option value="short">Short session (up to 2.5 hrs)</option>
                    <option value="medium">Half-day (2.5 – 4 hrs)</option>
                    <option value="long">Longer session (4+ hrs)</option>
                  </select>
                </div>
              </div>

              {/* Question 3: When am I free? */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800">When are you free?</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {WEEKDAY_WEEKEND_SLOTS.map((slot) => {
                    const active = volunteer.availability.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        aria-pressed={active}
                        className={`px-2 py-1.5 text-left text-[11px] rounded-lg border transition-colors cursor-pointer ${
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
                <label className="flex items-center gap-2 pt-1 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={volunteer.availability.includes('public-holiday')}
                    onChange={() => toggleSlot('public-holiday')}
                    className="w-4 h-4 accent-teal-700 rounded"
                  />
                  <span>Include public holidays</span>
                </label>
              </div>

              {/* Question 4: What causes do I care about? */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800">What causes do you care about?</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {ALL_CAUSES.map((cause) => {
                    const active = volunteer.causes.includes(cause);
                    return (
                      <button
                        key={cause}
                        type="button"
                        onClick={() => toggleCause(cause)}
                        aria-pressed={active}
                        className={`px-2.5 py-1.5 text-left text-[11px] rounded-lg border transition-colors cursor-pointer ${
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
            </div>

            {/* Progressive Disclosure: Search + More Filters (Skills & Commitment Type) */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, area, or charity..."
                    aria-label="Search missions"
                    className="pl-8 pr-3 min-h-[40px] w-full sm:w-64 text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowMoreFilters((prev) => !prev)}
                  aria-expanded={showMoreFilters}
                  className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold text-slate-700 bg-[#FAFAF9] border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700" />
                  <span>More filters</span>
                  {showMoreFilters ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMap((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-teal-700" />
                  <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  {loadingTravel ? 'Updating travel times...' : `${scoredOpportunities.length} missions shown`}
                </span>
              </div>
            </div>

            {showMoreFilters && (
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-8 space-y-2">
                  <p className="text-xs font-bold text-slate-800">
                    Skills you&apos;d like to use
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
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
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
                <div className="md:col-span-4 space-y-2">
                  <p className="text-xs font-bold text-slate-800">Commitment type</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['all', 'One-time', 'Recurring'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCommitmentFilter(type)}
                        className={`px-2.5 min-h-[38px] text-xs font-semibold rounded-lg border cursor-pointer ${
                          commitmentFilter === type
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'bg-[#FAFAF9] border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {type === 'all' ? 'Any' : type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Optional Map & Weather / Long-Weekend Context */}
          <div ref={recommendedRef} className="space-y-4">
            {showMap && (
              <OneMapExplorer
                startingLocation={volunteer.startingLocation}
                opportunities={scoredOpportunities.map((s) => s.opportunity)}
                travelTimes={travelTimes}
                selectedOppId={selectedOppId}
                onSelectOpportunity={(id) => setSelectedOppId(id)}
              />
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-1.5 text-slate-700">
                  <Sun className="w-4 h-4 text-amber-600 shrink-0" />
                  {weather.source === 'live' ? (
                    <span>
                      <strong>Weather outlook:</strong>{' '}
                      {weather.twentyFourHourSummary ?? 'Forecast active for outdoor missions.'}
                    </span>
                  ) : (
                    <span>
                      <strong>Outdoor missions:</strong> Weather outlook is shown when available within
                      the 4-day window.
                    </span>
                  )}
                </div>
                {longWeekendHolidays.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFitFilter((prev) => (prev === 'holiday' ? 'all' : 'holiday'))
                    }
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline underline-offset-2 cursor-pointer"
                  >
                    Upcoming holiday: {longWeekendHolidays[0].holiday} ({longWeekendHolidays[0].date})
                  </button>
                )}
              </div>

              {/* Clean Quick-Filter Segmented Bar */}
              <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                {(
                  [
                    { id: 'all', label: `All (${scoredOpportunities.length})` },
                    { id: 'available', label: 'Fits My Schedule' },
                    { id: 'urgent', label: 'Needs Volunteers Soon' },
                    { id: 'holiday', label: 'Public Holidays' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFitFilter(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                      fitFilter === item.id
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clean Mission Cards */}
            {scoredOpportunities.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <p className="font-display text-base font-bold text-slate-900">
                  No missions match these filters right now
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Try widening your travel time or resetting your filters to see all available
                  opportunities.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFitFilter('all');
                    setCommitmentFilter('all');
                    onUpdateVolunteer({
                      ...volunteer,
                      maxTravelMinutes: 90,
                      preferredDuration: 'any',
                    });
                  }}
                  className="mt-4 px-5 min-h-[42px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Reset Filters
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
                  const commitmentLabel = opportunity.commitmentType ?? 'One-time';

                  return (
                    <article
                      key={opportunity.id}
                      className={`bg-white border rounded-2xl p-6 transition-colors ${
                        isSelectedOnMap
                          ? 'border-teal-600 ring-1 ring-teal-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-800">
                              {opportunity.charityName}
                            </span>
                            {opportunity.charityVerificationStatus ===
                            'Authoritatively Verified' ? (
                              <span
                                title={`Verified Charity (UEN ${opportunity.charityUen})`}
                                className="inline-flex items-center gap-1 font-medium text-teal-700"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>{opportunity.charityVerificationStatus}</span>
                              </span>
                            )}
                            <span aria-hidden="true">·</span>
                            <span>{opportunity.cause}</span>
                            <span aria-hidden="true">·</span>
                            <span>{commitmentLabel}</span>
                            {opportunity.urgency === 'Urgent Fill' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-amber-700">
                                  Spot open urgently
                                </span>
                              </>
                            )}
                            {holidayHit && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-teal-700">
                                  {holidayHit.holiday}
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 mt-1.5">
                            {opportunity.title}
                          </h3>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <p
                            className={`font-mono-tabular text-xs font-semibold ${
                              spotsLeft > 0 ? 'text-teal-700' : 'text-slate-500'
                            }`}
                          >
                            {spotsLeft > 0
                              ? `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`
                              : 'Waitlist open'}
                          </p>
                          <a
                            href="https://www.charities.gov.sg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-teal-700 underline underline-offset-2 mt-1"
                          >
                            <span>Charity Registry</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                        {opportunity.description}
                      </p>

                      {/* Essential Facts Row */}
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {opportunity.dateLabel} · {opportunity.timeLabel} (
                            {opportunity.durationHours}h)
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {opportunity.location} (S{opportunity.postalCode})
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                          <Navigation className="w-3.5 h-3.5 text-teal-700" />
                          {travel?.minutes !== null && travel?.minutes !== undefined ? (
                            <span>
                              About {travel.minutes} min away ({travel.distanceKm} km)
                            </span>
                          ) : (
                            <span>
                              Travel time unavailable
                              {travel?.distanceKm !== undefined ? ` · ${travel.distanceKm} km away` : ''}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Outdoor Weather Note if in range */}
                      {opportunity.isOutdoor && (
                        <div className="mt-3 text-xs">
                          {dayForecast ? (
                            dayForecast.disruptionRisk ? (
                              <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                Rain possible on {dayForecast.date}: {dayForecast.forecast}
                                {dayForecast.tempLow !== null && dayForecast.tempHigh !== null
                                  ? ` · ${dayForecast.tempLow}–${dayForecast.tempHigh}°C`
                                  : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-slate-600">
                                <CloudRain className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                Weather ({dayForecast.date}): {dayForecast.forecast}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500">
                              Outdoor mission · Weather forecast not yet available for this date
                            </span>
                          )}
                        </div>
                      )}

                      {/* Plain-Language Fit Note + Single Clear Primary Action */}
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          {hasOverlapConflict ? (
                            <span className="font-semibold text-red-700">
                              Overlaps with another shift in your schedule
                            </span>
                          ) : match.reasons.length > 0 ? (
                            match.reasons.slice(0, 3).join(' · ')
                          ) : (
                            'Open to volunteers'
                          )}
                        </p>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenRoutePlanner(opportunity.id)}
                            className="inline-flex items-center gap-1 px-3 min-h-[40px] text-xs font-semibold text-slate-700 bg-[#FAFAF9] border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5 text-teal-700" />
                            <span>View Route</span>
                          </button>

                          {existingBooking ? (
                            <div className="inline-flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                                <CheckCircle2 className="w-4 h-4" />
                                {existingBooking.status === 'Present'
                                  ? 'Completed'
                                  : `Registered (${existingBooking.status})`}
                              </span>
                              {existingBooking.status === 'Confirmed' && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadIcs(opportunity)}
                                  className="inline-flex items-center gap-1 px-3 min-h-[40px] text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>Add to Calendar</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenRegistrationModal(opportunity)}
                              className={`inline-flex items-center justify-center gap-1.5 px-5 min-h-[42px] text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                hasOverlapConflict
                                  ? 'bg-red-700 hover:bg-red-800'
                                  : 'bg-teal-700 hover:bg-teal-800'
                              }`}
                            >
                              <CalendarCheck className="w-3.5 h-3.5" />
                              <span>
                                {hasOverlapConflict
                                  ? 'Check Conflict'
                                  : spotsLeft === 0
                                  ? 'Join Waitlist'
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
      ) : normalizedTab === 'calendar' ? (
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
          onBookShift={onBookShift}
          onSelectOpportunityToRegister={handleOpenRegistrationModal}
          onCancelBooking={onCancelBooking}
          onConfirmAttendance={onConfirmAttendanceByBookingId}
          onPlanJourney={onOpenRoutePlanner}
          onRespondInvitation={onRespondInvitation}
          onNotify={onNotify}
        />
      ) : normalizedTab === 'route-planner' ? (
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
      ) : normalizedTab === 'profile' ? (
        <div className="space-y-8">
          {/* Profile Header & Optional Persona Switch */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
                  <ShieldCheck className="w-4 h-4" />
                  Singpass {volunteer.singpassTier}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Starting from {volunteer.startingLocation.label} (S
                  {volunteer.startingLocation.postalCode})
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5">
                {volunteer.name}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Keep your starting address, travel preferences, causes, and reminder settings up to
                date.
              </p>
            </div>

            {allVolunteers && allVolunteers.length > 1 && onSelectVolunteer && (
              <div className="shrink-0">
                <label
                  htmlFor="switch-volunteer-profile"
                  className="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Active Volunteer Profile
                </label>
                <select
                  id="switch-volunteer-profile"
                  value={volunteer.id}
                  onChange={(e) => onSelectVolunteer(e.target.value)}
                  className="px-3.5 min-h-[42px] text-sm bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {allVolunteers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.district})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Profile Settings Form */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            <h2 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Volunteering Preferences &amp; Availability
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="prof-postal" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Preferred Starting Postal Code or Location
                  </label>
                  <form onSubmit={handlePlaceSearch} className="flex gap-2">
                    <input
                      id="prof-postal"
                      type="text"
                      value={postalQuery}
                      onChange={(e) => setPostalQuery(e.target.value)}
                      className="flex-1 min-w-0 px-3 min-h-[42px] text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      disabled={searchingPlace}
                      className="px-3.5 min-h-[42px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Locate
                    </button>
                  </form>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_SG_LOCATIONS.map((loc) => (
                      <button
                        key={loc.postal}
                        type="button"
                        onClick={() => handleSelectStartingPlace(loc, 'demo')}
                        className={`px-2.5 py-1 text-[11px] rounded border cursor-pointer ${
                          volunteer.startingLocation.postalCode === loc.postal
                            ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                            : 'bg-[#FAFAF9] border-slate-200 text-slate-600'
                        }`}
                      >
                        {loc.building.split(' ')[0]} ({loc.postal})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="prof-mode" className="block text-xs font-semibold text-slate-700 mb-1">
                      Transport Mode
                    </label>
                    <select
                      id="prof-mode"
                      value={volunteer.travelMode}
                      onChange={(e) =>
                        onUpdateVolunteer({
                          ...volunteer,
                          travelMode: e.target.value as TravelMode,
                        })
                      }
                      className="w-full px-2.5 min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      {TRAVEL_MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="prof-max" className="block text-xs font-semibold text-slate-700 mb-1">
                      Max Travel Time
                    </label>
                    <select
                      id="prof-max"
                      value={volunteer.maxTravelMinutes}
                      onChange={(e) =>
                        onUpdateVolunteer({
                          ...volunteer,
                          maxTravelMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>Any travel time</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700">Causes You Care About</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {ALL_CAUSES.map((cause) => {
                    const active = volunteer.causes.includes(cause);
                    return (
                      <button
                        key={cause}
                        type="button"
                        onClick={() => toggleCause(cause)}
                        className={`px-2.5 py-2 text-left text-xs rounded-lg border cursor-pointer ${
                          active
                            ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                            : 'bg-[#FAFAF9] border-slate-200 text-slate-600'
                        }`}
                      >
                        {cause}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-semibold text-slate-700 pt-1">Your Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SKILLS.map((skill) => {
                    const active = volunteer.skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`px-2.5 py-1.5 text-xs rounded-md border cursor-pointer ${
                          active
                            ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700">Weekly Free Time</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {WEEKDAY_WEEKEND_SLOTS.map((slot) => {
                    const active = volunteer.availability.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        className={`px-2.5 py-2 text-left text-xs rounded-lg border cursor-pointer ${
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
                <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={volunteer.availability.includes('public-holiday')}
                    onChange={() => toggleSlot('public-holiday')}
                    className="w-4 h-4 accent-teal-700 rounded"
                  />
                  <span>Available on Singapore public holidays</span>
                </label>
              </div>
            </div>
          </section>

          {/* Nested Reminders & Notification Settings */}
          <NotificationSettingsView
            volunteer={volunteer}
            opportunities={opportunities}
            bookings={bookings}
            travelTimes={travelTimes}
            preferences={notificationPreferences}
            notificationLog={notificationLog}
            onUpdatePreferences={onUpdateNotificationPreferences}
            onSimulateReminder={onSimulateReminder}
            onViewMission={() => onSelectSubTab('my-volunteering')}
            onPlanJourney={onOpenRoutePlanner}
            onConfirmAttendance={onConfirmAttendanceByOppId}
          />
        </div>
      ) : (
        /* TAB: MY MISSIONS (my-volunteering) */
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                My Missions
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Track your upcoming commitments, plan how to get there, and review completed hours.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectSubTab('discover')}
              className="inline-flex items-center justify-center gap-1.5 px-4 min-h-[42px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shrink-0 cursor-pointer"
            >
              <span>Find Another Mission</span>
            </button>
          </div>

          {/* Contributions Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs text-slate-500">Hours Contributed</p>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
                {volunteer.hoursLogged} hrs
              </p>
              <p className="text-xs text-slate-500 mt-1">Verified across partner charities</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs text-slate-500">Missions Completed</p>
              <p className="font-mono-tabular text-2xl font-bold text-teal-700 mt-1">
                {volunteer.shiftsCompleted}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {completedBookings.length} completed this session
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

          {/* Upcoming Missions with Embedded "Getting There" Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
              Upcoming Missions ({upcomingBookings.length})
            </h2>
            {upcomingBookings.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-600">
                  You don&apos;t have any upcoming missions yet.
                </p>
                <button
                  type="button"
                  onClick={() => onSelectSubTab('discover')}
                  className="mt-3 px-5 min-h-[42px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Discover Missions
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {upcomingBookings.map((booking) => {
                  const opp = opportunities.find((o) => o.id === booking.opportunityId);
                  if (!opp) return null;
                  const travel = travelTimes[opp.id];
                  const suggestedLeave =
                    travel?.minutes != null
                      ? calculateSuggestedDeparture(
                          opp.startTime24,
                          travel.minutes,
                          notificationPreferences.departureBufferMinutes
                        )
                      : null;

                  return (
                    <div
                      key={booking.id}
                      className="border border-slate-200 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                          <p className="font-display text-lg font-bold text-slate-900 mt-1">
                            {opp.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {opp.dateLabel} · {opp.timeLabel}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {booking.status === 'Confirmed' && !booking.attendanceConfirmed && (
                            <button
                              type="button"
                              onClick={() => onConfirmAttendanceByBookingId(booking.id)}
                              className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold text-slate-900 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm Attendance</span>
                            </button>
                          )}
                          {booking.status === 'Confirmed' && (
                            <button
                              type="button"
                              onClick={() => handleDownloadIcs(opp)}
                              className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Add to Calendar (.ics)</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onCancelBooking(booking.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>

                      {/* Friendly "Getting there" Sub-Card */}
                      <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs flex-1">
                          <div>
                            <p className="text-slate-500">Location</p>
                            <p className="font-semibold text-slate-900 mt-0.5">
                              {opp.location} (S{opp.postalCode})
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Estimated travel time</p>
                            <p className="font-semibold text-slate-900 mt-0.5">
                              {travel?.minutes != null
                                ? `About ${travel.minutes} mins (${travel.distanceKm} km)`
                                : travel?.distanceKm != null
                                ? `Unavailable · ${travel.distanceKm} km away`
                                : 'Check route planner'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Preferred transport</p>
                            <p className="font-semibold text-slate-900 mt-0.5">
                              {travelModeReadable(volunteer.travelMode)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Suggested departure</p>
                            <p className="font-semibold text-teal-800 mt-0.5">
                              {suggestedLeave
                                ? `${suggestedLeave.departureTime12} (${notificationPreferences.departureBufferMinutes}-min buffer)`
                                : 'Open View Route to check'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenRoutePlanner(opp.id)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 min-h-[40px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shrink-0 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>View Route</span>
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

      {/* Unified 3-Step Registration & Friendly Confirmation Modal */}
      {registrationModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            {registrationModal.step === 'review' ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-teal-700">
                      Confirm Your Mission
                    </p>
                    <h3
                      id="reg-modal-title"
                      className="font-display text-xl font-bold text-slate-900 mt-0.5"
                    >
                      {registrationModal.opportunity.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {registrationModal.opportunity.charityName} ·{' '}
                      {registrationModal.opportunity.cause}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRegistrationModal(null)}
                    aria-label="Close registration modal"
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Essential Details Summary */}
                <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
                  <p className="flex items-center gap-2 text-slate-800 font-medium">
                    <Clock className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>
                      {registrationModal.opportunity.dateLabel} ·{' '}
                      {registrationModal.opportunity.timeLabel} (
                      {registrationModal.opportunity.durationHours} hours)
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-800 font-medium">
                    <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>
                      {registrationModal.opportunity.location} (S
                      {registrationModal.opportunity.postalCode})
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-700">
                    <Navigation className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>
                      {registrationModal.travel?.minutes != null
                        ? `About ${registrationModal.travel.minutes} mins by ${travelModeReadable(
                            volunteer.travelMode
                          ).toLowerCase()} (${registrationModal.travel.distanceKm} km)`
                        : registrationModal.travel?.distanceKm != null
                        ? `${registrationModal.travel.distanceKm} km from ${volunteer.startingLocation.label}`
                        : `From ${volunteer.startingLocation.label}`}
                    </span>
                  </p>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600">
                  <p className="text-xs font-bold text-slate-800">What you&apos;ll be doing</p>
                  <p className="text-xs sm:text-sm leading-relaxed">
                    {registrationModal.opportunity.description}
                  </p>
                  <p className="text-xs text-slate-500 pt-1">
                    <strong>Helpful skills:</strong>{' '}
                    {registrationModal.opportunity.requiredSkills.length > 0
                      ? registrationModal.opportunity.requiredSkills.join(', ')
                      : 'No prior experience needed'}
                  </p>
                </div>

                {/* Conflict Detection Block */}
                {registrationModal.conflicts.length > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        {registrationModal.conflicts.some((c) => c.type === 'overlap')
                          ? 'This shift overlaps with your existing booking'
                          : 'Tight gap between two shifts on the same day'}
                      </span>
                    </div>
                    {registrationModal.conflicts.map((c) => (
                      <p key={c.booking.id} className="text-amber-900">
                        {c.message}
                      </p>
                    ))}
                    <div className="pt-1 space-y-1.5">
                      <p className="font-semibold text-slate-800">Conflict-free alternatives:</p>
                      {suggestConflictAlternatives(
                        registrationModal.opportunity,
                        volunteer,
                        opportunities,
                        travelTimes,
                        holidays,
                        bookings
                      )
                        .slice(0, 2)
                        .map(({ opportunity: alt }) => (
                          <div
                            key={alt.id}
                            className="flex items-center justify-between gap-2 bg-white border border-amber-200 rounded-lg p-2.5"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{alt.title}</p>
                              <p className="text-[11px] text-slate-500">
                                {alt.dateLabel} · {alt.timeLabel}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleConfirmRegistration(alt.id)}
                              className="px-3 min-h-[36px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shrink-0 cursor-pointer"
                            >
                              Choose Instead
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRegistrationModal(null)}
                    className="px-4 min-h-[44px] text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Go Back
                  </button>
                  {!registrationModal.conflicts.some((c) => c.type === 'overlap') ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleConfirmRegistration(registrationModal.opportunity.id)
                      }
                      className="px-6 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                    >
                      {registrationModal.opportunity.spotsFilled >=
                      registrationModal.opportunity.spotsTotal
                        ? 'Join Waitlist'
                        : 'Confirm Spot'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRegistrationModal(null);
                        onSelectSubTab('calendar');
                      }}
                      className="px-5 min-h-[44px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Review My Calendar
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* Friendly Step 3 Confirmation Screen */
              <div className="py-2 text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3
                    id="reg-modal-title"
                    className="font-display text-2xl font-bold text-slate-900"
                  >
                    You&apos;re making a difference!
                  </h3>
                  <p className="text-sm text-slate-600">
                    Your mission is confirmed. We&apos;ve added it to your calendar.
                  </p>
                </div>

                <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-4 text-left text-xs space-y-1">
                  <p className="font-bold text-slate-900 text-sm">
                    {registrationModal.opportunity.title}
                  </p>
                  <p className="text-slate-600">
                    {registrationModal.opportunity.charityName}
                  </p>
                  <p className="text-slate-600 pt-1">
                    {registrationModal.opportunity.dateLabel} ·{' '}
                    {registrationModal.opportunity.timeLabel} ·{' '}
                    {registrationModal.opportunity.location}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRegistrationModal(null);
                      onSelectSubTab('my-volunteering');
                    }}
                    className="px-4 min-h-[44px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                  >
                    View My Mission
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = registrationModal.opportunity.id;
                      setRegistrationModal(null);
                      onOpenRoutePlanner(id);
                    }}
                    className="px-4 min-h-[44px] text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Plan My Journey
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadIcs(registrationModal.opportunity)}
                    className="px-4 min-h-[44px] text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer"
                  >
                    Add to Calendar (.ics)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
