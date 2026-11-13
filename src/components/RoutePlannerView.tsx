import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Footprints,
  MapPin,
  Navigation,
  Route,
  TrainFront,
  Car,
} from 'lucide-react';
import {
  OneMapSearchResult,
  Opportunity,
  RoutePlanResult,
  ShiftBooking,
  StartingLocation,
  TravelEstimate,
  TravelMode,
  VolunteerProfile,
} from '../types';
import { calculateSuggestedDeparture, minutesBetweenShifts, shiftsOverlap, time24ToMinutes } from '../utils/time';
import { OneMapExplorer } from './OneMapExplorer';

interface RoutePlannerViewProps {
  volunteer: VolunteerProfile;
  opportunities: Opportunity[];
  bookings: ShiftBooking[];
  travelTimes: Record<string, TravelEstimate>;
  initialOpportunityId?: string | null;
  arrivalBufferMinutes: 10 | 15 | 30;
  onChangeBufferMinutes: (buffer: 10 | 15 | 30) => void;
  onUpdateVolunteer: (updated: VolunteerProfile) => void;
  onOpenCalendar: () => void;
  onNotify: (title: string, description?: string) => void;
}

const PLANNER_MODES: { id: 'pt' | 'walk' | 'drive'; label: string; icon: React.ReactNode }[] = [
  { id: 'pt', label: 'Public Transport', icon: <TrainFront className="w-3.5 h-3.5" /> },
  { id: 'walk', label: 'Walking', icon: <Footprints className="w-3.5 h-3.5" /> },
  { id: 'drive', label: 'Driving', icon: <Car className="w-3.5 h-3.5" /> },
];

const QUICK_ORIGIN_PRESETS: OneMapSearchResult[] = [
  {
    postal: '408600',
    building: 'Eunos MRT / Eunos Crescent',
    address: '30 Eunos Crescent, Singapore 408600',
    district: 'East',
    lat: 1.3198,
    lng: 103.9032,
  },
  {
    postal: '469662',
    building: 'Heartbeat@Bedok',
    address: '11 Bedok North Street 1, Singapore 469662',
    district: 'East',
    lat: 1.3264,
    lng: 103.9317,
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
];

interface MultiLegSummary {
  fromLabel: string;
  toOpportunity: Opportunity;
  route: RoutePlanResult | null;
  overlapWithPrev: boolean;
  gapMinutesFromPrev: number | null;
  tightTransition: boolean;
}

export const RoutePlannerView: React.FC<RoutePlannerViewProps> = ({
  volunteer,
  opportunities,
  bookings,
  travelTimes,
  initialOpportunityId,
  arrivalBufferMinutes,
  onChangeBufferMinutes,
  onUpdateVolunteer,
  onOpenCalendar,
  onNotify,
}) => {
  const [plannerTab, setPlannerTab] = useState<'single' | 'multi'>('single');

  const confirmedBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.volunteerId === volunteer.id &&
          (b.status === 'Confirmed' || b.status === 'Waitlisted')
      ),
    [bookings, volunteer.id]
  );

  const confirmedOpps = useMemo(
    () =>
      confirmedBookings
        .map((b) => opportunities.find((o) => o.id === b.opportunityId))
        .filter((o): o is Opportunity => Boolean(o)),
    [confirmedBookings, opportunities]
  );

  const selectableOpps = useMemo(() => {
    const confirmedIds = new Set(confirmedOpps.map((o) => o.id));
    const others = opportunities.filter((o) => !confirmedIds.has(o.id));
    return [...confirmedOpps, ...others];
  }, [confirmedOpps, opportunities]);

  const [selectedOppId, setSelectedOppId] = useState<string>(() => {
    if (initialOpportunityId && opportunities.some((o) => o.id === initialOpportunityId)) {
      return initialOpportunityId;
    }
    return confirmedOpps[0]?.id ?? 'opp-02';
  });

  useEffect(() => {
    if (initialOpportunityId && opportunities.some((o) => o.id === initialOpportunityId)) {
      setSelectedOppId(initialOpportunityId);
    }
  }, [initialOpportunityId, opportunities]);

  const selectedOpp = useMemo(
    () => opportunities.find((o) => o.id === selectedOppId) ?? selectableOpps[0],
    [opportunities, selectedOppId, selectableOpps]
  );

  const [origin, setOrigin] = useState<StartingLocation>(volunteer.startingLocation);
  useEffect(() => {
    setOrigin(volunteer.startingLocation);
  }, [volunteer.startingLocation]);

  const [originSearch, setOriginSearch] = useState(volunteer.startingLocation.postalCode);
  const [originResults, setOriginResults] = useState<OneMapSearchResult[]>([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [originError, setOriginError] = useState('');

  const [transportMode, setTransportMode] = useState<'pt' | 'walk' | 'drive'>(
    volunteer.travelMode === 'walk' || volunteer.travelMode === 'drive'
      ? volunteer.travelMode
      : 'pt'
  );

  const [routeResult, setRouteResult] = useState<RoutePlanResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Fetch detailed OneMap route whenever origin, selectedOpp, or transportMode changes
  useEffect(() => {
    if (!selectedOpp || plannerTab !== 'single') return;
    let active = true;
    const fetchDetailedRoute = async () => {
      setLoadingRoute(true);
      try {
        const res = await fetch('/api/onemap/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startLat: origin.lat,
            startLng: origin.lng,
            endLat: selectedOpp.lat,
            endLng: selectedOpp.lng,
            mode: transportMode,
            isoDate: selectedOpp.isoDate,
            startTime24: selectedOpp.startTime24,
          }),
        });
        if (!res.ok) throw new Error('Route request failed');
        const data = (await res.json()) as RoutePlanResult;
        if (active) setRouteResult(data);
      } catch {
        if (active) {
          setRouteResult({
            source: 'unavailable',
            mode: transportMode,
            minutes: null,
            distanceKm: travelTimes[selectedOpp.id]?.distanceKm ?? 0,
            instructions: [],
            polyline: [],
            reason: 'Unable to reach OneMap routing proxy right now.',
          });
        }
      } finally {
        if (active) setLoadingRoute(false);
      }
    };
    fetchDetailedRoute();
    return () => {
      active = false;
    };
  }, [origin.lat, origin.lng, selectedOpp, transportMode, plannerTab, travelTimes]);

  const handleOriginSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = originSearch.trim();
    if (!q) {
      setOriginError('Enter a 6-digit Singapore postal code or MRT/place name.');
      return;
    }
    setSearchingOrigin(true);
    setOriginError('');
    try {
      const res = await fetch(`/api/onemap/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as {
        source: 'live' | 'demo';
        results?: OneMapSearchResult[];
      };
      if (data.results && data.results.length > 0) {
        setOriginResults(data.results);
      } else {
        setOriginResults([]);
        setOriginError('No Singapore location matched that query.');
      }
    } catch {
      setOriginError('OneMap address lookup unavailable.');
    } finally {
      setSearchingOrigin(false);
    }
  };

  const applyOrigin = (place: OneMapSearchResult, saveAsDefault = false) => {
    const nextOrigin: StartingLocation = {
      postalCode: place.postal,
      label: place.building,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      source: 'live',
    };
    setOrigin(nextOrigin);
    setOriginSearch(place.postal !== 'NIL' ? place.postal : place.building);
    setOriginResults([]);
    if (saveAsDefault) {
      onUpdateVolunteer({
        ...volunteer,
        startingLocation: nextOrigin,
        travelMode: transportMode as TravelMode,
      });
      onNotify('Default starting location updated', `${place.building} (S${place.postal})`);
    }
  };

  const suggestedDeparture = selectedOpp
    ? calculateSuggestedDeparture(
        selectedOpp.startTime24,
        routeResult?.minutes ?? null,
        arrivalBufferMinutes
      )
    : null;

  // --- MULTI-MISSION SAME-DAY ROUTE PLANNER ---
  const uniqueDates = useMemo(() => {
    const set = new Set<string>(opportunities.map((o) => o.isoDate));
    return Array.from(set).sort();
  }, [opportunities]);

  const defaultMultiDate = useMemo(() => {
    // Prefer a date with confirmed shifts or multiple same-day shifts (e.g. dPlus6)
    const confirmedDate = confirmedOpps[0]?.isoDate;
    if (confirmedDate) return confirmedDate;
    const multiShiftDate = uniqueDates.find(
      (d) => opportunities.filter((o) => o.isoDate === d).length >= 2
    );
    return multiShiftDate ?? uniqueDates[0] ?? '';
  }, [confirmedOpps, uniqueDates, opportunities]);

  const [multiDate, setMultiDate] = useState<string>(defaultMultiDate);
  useEffect(() => {
    if (!multiDate && defaultMultiDate) setMultiDate(defaultMultiDate);
  }, [multiDate, defaultMultiDate]);

  const sameDayCandidates = useMemo(
    () =>
      opportunities
        .filter((o) => o.isoDate === multiDate)
        .sort((a, b) => time24ToMinutes(a.startTime24) - time24ToMinutes(b.startTime24)),
    [opportunities, multiDate]
  );

  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const confirmedOnDate = confirmedOpps
      .filter((o) => o.isoDate === multiDate)
      .map((o) => o.id);
    if (confirmedOnDate.length >= 2) {
      setMultiSelectedIds(confirmedOnDate);
      return;
    }
    if (confirmedOnDate.length === 1) {
      const firstNonOverlapping = sameDayCandidates.find(
        (o) =>
          o.id !== confirmedOnDate[0] &&
          !shiftsOverlap(
            o,
            sameDayCandidates.find((c) => c.id === confirmedOnDate[0])!
          )
      );
      setMultiSelectedIds(
        firstNonOverlapping
          ? [confirmedOnDate[0], firstNonOverlapping.id]
          : [confirmedOnDate[0]]
      );
      return;
    }
    // Pre-select compatible same-day pair (e.g., opp-13 morning + opp-02 afternoon) for quick exploration
    const nonOverlappingPair: string[] = [];
    for (const candidate of sameDayCandidates) {
      const overlaps = nonOverlappingPair.some((id) => {
        const existing = sameDayCandidates.find((o) => o.id === id);
        return existing ? shiftsOverlap(existing, candidate) : false;
      });
      if (!overlaps) nonOverlappingPair.push(candidate.id);
      if (nonOverlappingPair.length >= 2) break;
    }
    setMultiSelectedIds(nonOverlappingPair);
  }, [multiDate, confirmedOpps, sameDayCandidates]);

  const multiSortedStops = useMemo(
    () =>
      sameDayCandidates
        .filter((o) => multiSelectedIds.includes(o.id))
        .sort((a, b) => time24ToMinutes(a.startTime24) - time24ToMinutes(b.startTime24)),
    [sameDayCandidates, multiSelectedIds]
  );

  const [multiLegs, setMultiLegs] = useState<MultiLegSummary[]>([]);
  const [loadingMulti, setLoadingMulti] = useState(false);

  useEffect(() => {
    if (plannerTab !== 'multi' || multiSortedStops.length === 0) {
      setMultiLegs([]);
      return;
    }
    let active = true;
    const computeMultiLegs = async () => {
      setLoadingMulti(true);
      const nextLegs: MultiLegSummary[] = [];

      for (let i = 0; i < multiSortedStops.length; i += 1) {
        const stop = multiSortedStops[i];
        const prev = i === 0 ? null : multiSortedStops[i - 1];
        const fromLat = prev ? prev.lat : origin.lat;
        const fromLng = prev ? prev.lng : origin.lng;
        const fromLabel = prev ? prev.location : origin.label;

        let legRoute: RoutePlanResult | null = null;
        try {
          const res = await fetch('/api/onemap/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startLat: fromLat,
              startLng: fromLng,
              endLat: stop.lat,
              endLng: stop.lng,
              mode: transportMode,
              isoDate: stop.isoDate,
              startTime24: prev ? prev.endTime24 : stop.startTime24,
            }),
          });
          if (res.ok) {
            legRoute = (await res.json()) as RoutePlanResult;
          }
        } catch {
          legRoute = null;
        }

        const overlapWithPrev = prev ? shiftsOverlap(prev, stop) : false;
        const gapMinutesFromPrev = prev ? minutesBetweenShifts(prev, stop) : null;
        const neededWithBuffer =
          legRoute?.minutes !== null && legRoute?.minutes !== undefined
            ? legRoute.minutes + 10
            : 25;
        const tightTransition =
          !overlapWithPrev &&
          gapMinutesFromPrev !== null &&
          gapMinutesFromPrev < neededWithBuffer;

        nextLegs.push({
          fromLabel,
          toOpportunity: stop,
          route: legRoute,
          overlapWithPrev,
          gapMinutesFromPrev,
          tightTransition,
        });
      }

      if (active) {
        setMultiLegs(nextLegs);
        setLoadingMulti(false);
      }
    };
    computeMultiLegs();
    return () => {
      active = false;
    };
  }, [plannerTab, multiSortedStops, origin.lat, origin.lng, origin.label, transportMode]);

  const toggleMultiStop = (oppId: string) => {
    setMultiSelectedIds((prev) =>
      prev.includes(oppId) ? prev.filter((id) => id !== oppId) : [...prev, oppId]
    );
  };

  const hasMultiIssues = multiLegs.some((l) => l.overlapWithPrev || l.tightTransition);

  return (
    <div className="space-y-6">
      {/* Header & Single / Multi-Mission Mode Switch */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-teal-700">
            Smart Volunteer Route Planner · Singapore Local Time (SGT)
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Plan My Journey
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Calculate travel durations, suggested departure times with arrival buffers, and
            multi-mission itineraries across Singapore using OneMap routing.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start">
          <button
            type="button"
            onClick={() => setPlannerTab('single')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              plannerTab === 'single'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Single Mission Route
          </button>
          <button
            type="button"
            onClick={() => setPlannerTab('multi')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              plannerTab === 'multi'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Multi-Mission Day Route ({sameDayCandidates.length} on date)
          </button>
        </div>
      </div>

      {/* Shared Starting Location + Transport Mode + Buffer Configuration */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-2.5">
          <label
            htmlFor="route-origin-search"
            className="block text-xs font-semibold text-slate-700"
          >
            Starting Location or Singapore Postal Code
          </label>
          <form onSubmit={handleOriginSearchSubmit} className="flex gap-2">
            <input
              id="route-origin-search"
              type="text"
              value={originSearch}
              onChange={(e) => setOriginSearch(e.target.value)}
              placeholder="e.g. 408600 or Eunos MRT"
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="submit"
              disabled={searchingOrigin}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              {searchingOrigin ? '...' : 'Locate'}
            </button>
          </form>
          {originError && <p className="text-xs text-red-600">{originError}</p>}

          <div className="flex flex-wrap gap-1.5">
            {QUICK_ORIGIN_PRESETS.map((preset) => (
              <button
                key={preset.postal}
                type="button"
                onClick={() => applyOrigin(preset)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                  origin.postalCode === preset.postal
                    ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                    : 'bg-[#FAFAF9] border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {preset.building.split(' ')[0]} ({preset.postal})
              </button>
            ))}
          </div>

          {originResults.length > 0 && (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-[#FAFAF9]">
              {originResults.map((place, idx) => (
                <div
                  key={`${place.postal}-${idx}`}
                  className="px-3 py-2 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => applyOrigin(place)}
                    className="text-left min-w-0 flex-1 cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {place.building}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{place.address}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOrigin(place, true)}
                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Save default
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500">
            Active origin: <strong className="text-slate-800">{origin.label}</strong> (S
            {origin.postalCode})
          </p>
        </div>

        <div className="lg:col-span-4 space-y-2">
          <p className="text-xs font-semibold text-slate-700">Preferred Transport Mode</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PLANNER_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setTransportMode(m.id)}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                  transportMode === m.id
                    ? 'bg-teal-700 border-teal-700 text-white'
                    : 'bg-[#FAFAF9] border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {m.icon}
                <span>{m.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Queries OneMap routing for Public Transport, Walking, or Driving. Unavailable routes
            never invent directions.
          </p>
        </div>

        <div className="lg:col-span-3 space-y-2">
          <p className="text-xs font-semibold text-slate-700">Arrival Buffer (Before Shift)</p>
          <div className="grid grid-cols-3 gap-1.5">
            {([10, 15, 30] as const).map((buf) => (
              <button
                key={buf}
                type="button"
                onClick={() => onChangeBufferMinutes(buf)}
                className={`px-2.5 py-2.5 text-xs font-mono-tabular font-semibold rounded-lg border transition-colors cursor-pointer ${
                  arrivalBufferMinutes === buf
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-[#FAFAF9] border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {buf} min
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Recommended arrival buffer added ahead of shift check-in time.
          </p>
        </div>
      </div>

      {plannerTab === 'single' && selectedOpp ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Activity Selection & Departure Calculation */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div>
                <label
                  htmlFor="route-mission-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Select Volunteering Activity
                </label>
                <select
                  id="route-mission-select"
                  value={selectedOpp.id}
                  onChange={(e) => setSelectedOppId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {confirmedOpps.length > 0 && (
                    <optgroup label="Confirmed / Upcoming Bookings">
                      {confirmedOpps.map((o) => (
                        <option key={o.id} value={o.id}>
                          [Confirmed] {o.title} ({o.dateLabel}, {o.startTime24})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="All Singapore Shifts (Preview Journey)">
                    {opportunities
                      .filter((o) => !confirmedOpps.some((c) => c.id === o.id))
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title} ({o.dateLabel}, {o.startTime24})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <p className="font-semibold text-slate-900 text-sm">{selectedOpp.title}</p>
                <p className="text-slate-600">
                  {selectedOpp.charityName} · {selectedOpp.location} (S{selectedOpp.postalCode})
                </p>
                <p className="font-mono-tabular text-slate-700">
                  Shift window: {selectedOpp.dateLabel} · {selectedOpp.timeLabel} SGT
                </p>
              </div>

              {/* Journey Metrics & Suggested Departure */}
              <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Route Status</span>
                  <span
                    className={`font-semibold ${
                      routeResult?.source === 'live' ? 'text-teal-700' : 'text-amber-700'
                    }`}
                  >
                    {loadingRoute
                      ? 'Calculating via OneMap...'
                      : routeResult?.source === 'live'
                      ? 'OneMap Live Route'
                      : 'Live Route Unavailable'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <p className="text-[11px] text-slate-500">Estimated Duration</p>
                    <p className="font-mono-tabular text-xl font-bold text-slate-900 mt-0.5">
                      {routeResult?.minutes !== null && routeResult?.minutes !== undefined
                        ? `${routeResult.minutes} min`
                        : 'Unavailable'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Distance</p>
                    <p className="font-mono-tabular text-xl font-bold text-slate-900 mt-0.5">
                      {routeResult ? `${routeResult.distanceKm} km` : '—'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <p className="text-[11px] font-semibold text-teal-800">
                    Suggested Departure Time (Asia/Singapore)
                  </p>
                  {suggestedDeparture ? (
                    <div className="mt-1">
                      <p className="font-mono-tabular text-2xl font-bold text-teal-700">
                        {suggestedDeparture.departureTime24} SGT{' '}
                        <span className="text-sm font-medium text-slate-600">
                          ({suggestedDeparture.departureTime12})
                        </span>
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Leave {origin.label} at {suggestedDeparture.departureTime24} to reach{' '}
                        {selectedOpp.location} by{' '}
                        <strong className="font-mono-tabular">
                          {suggestedDeparture.targetArrivalTime24}
                        </strong>{' '}
                        ({arrivalBufferMinutes}-min buffer before {selectedOpp.startTime24} start).
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 mt-1">
                      Suggested departure time requires live OneMap travel minutes. Plan to arrive
                      by{' '}
                      <strong className="font-mono-tabular">
                        {calculateSuggestedDeparture(
                          selectedOpp.startTime24,
                          0,
                          arrivalBufferMinutes
                        )?.targetArrivalTime24}{' '}
                        SGT
                      </strong>{' '}
                      ({arrivalBufferMinutes}-min buffer before {selectedOpp.startTime24} start).
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Step-by-Step Route Instructions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Route Instructions
                </h3>
                {routeResult?.transitSummary && (
                  <span className="font-mono-tabular text-xs text-teal-700 font-semibold">
                    {routeResult.transitSummary}
                  </span>
                )}
              </div>

              {loadingRoute ? (
                <p className="text-xs text-slate-500 py-2">
                  Querying OneMap routing service for {transportMode.toUpperCase()}...
                </p>
              ) : routeResult && routeResult.instructions.length > 0 ? (
                <ol className="space-y-2.5 text-xs">
                  {routeResult.instructions.map((inst, idx) => (
                    <li
                      key={`${idx}-${inst.step}`}
                      className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="font-mono-tabular text-[11px] font-bold text-teal-700 mt-0.5 shrink-0">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <span className="text-slate-800 leading-relaxed">{inst.step}</span>
                      </div>
                      {inst.distanceText && (
                        <span className="font-mono-tabular text-[11px] text-slate-500 shrink-0">
                          {inst.distanceText}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
                  <p className="font-semibold text-slate-800">
                    Turn-by-turn directions unavailable for this request
                  </p>
                  <p>
                    {routeResult?.reason ??
                      'OneMap did not return step-by-step instructions for this origin/destination pair. Straight-line distance is shown without fabricating transit times or street directions.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Interactive OneMap Route Map */}
          <div className="lg:col-span-7 space-y-4">
            <OneMapExplorer
              startingLocation={origin}
              opportunities={[selectedOpp]}
              travelTimes={travelTimes}
              selectedOppId={selectedOpp.id}
              onSelectOpportunity={setSelectedOppId}
              routePolylines={
                routeResult?.polyline && routeResult.polyline.length >= 2
                  ? [routeResult.polyline]
                  : undefined
              }
              routeStops={[
                {
                  order: 1,
                  label: selectedOpp.title,
                  sublabel: `${selectedOpp.location} (S${selectedOpp.postalCode})`,
                  lat: selectedOpp.lat,
                  lng: selectedOpp.lng,
                },
              ]}
              title={`Journey Map: ${origin.label} → ${selectedOpp.location}`}
              subtitle={
                routeResult?.source === 'live'
                  ? `Showing OneMap ${transportMode.toUpperCase()} route (${routeResult.minutes} min · ${routeResult.distanceKm} km)`
                  : `Showing origin and shift destination (${routeResult?.distanceKm ?? '—'} km straight-line)`
              }
            />

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-600">
                Want to check how this shift fits alongside your other volunteer commitments?
              </span>
              <button
                type="button"
                onClick={onOpenCalendar}
                className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
              >
                <span>View in My Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MULTI-MISSION SAME-DAY ROUTE PLANNER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Same-Day Multi-Mission Planner
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select 2 or more shifts on the same date to verify travel feasibility without
                    altering your confirmed bookings.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="multi-date-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Select Date
                </label>
                <select
                  id="multi-date-select"
                  value={multiDate}
                  onChange={(e) => setMultiDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-[#FAFAF9] border border-slate-300 rounded-lg font-mono-tabular"
                >
                  {uniqueDates.map((date) => {
                    const count = opportunities.filter((o) => o.isoDate === date).length;
                    return (
                      <option key={date} value={date}>
                        {date} ({count} shift{count === 1 ? '' : 's'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700">
                  Shifts on {multiDate} (click to include/exclude)
                </p>
                {sameDayCandidates.map((opp) => {
                  const checked = multiSelectedIds.includes(opp.id);
                  const isConfirmed = confirmedOpps.some((c) => c.id === opp.id);
                  return (
                    <label
                      key={opp.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        checked
                          ? 'bg-teal-50/70 border-teal-600'
                          : 'bg-[#FAFAF9] border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMultiStop(opp.id)}
                        className="mt-0.5 accent-teal-700"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-semibold text-slate-900">
                          {opp.title}{' '}
                          {isConfirmed && (
                            <span className="text-teal-700 font-medium">· Confirmed</span>
                          )}
                        </p>
                        <p className="text-slate-600 mt-0.5 font-mono-tabular">
                          {opp.timeLabel} · {opp.location} (S{opp.postalCode})
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Chronological Feasibility & Inter-Shift Travel Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Chronological Schedule &amp; Feasibility
                </h3>
                {multiSortedStops.length >= 2 && !loadingMulti && (
                  <span
                    className={`text-xs font-semibold ${
                      hasMultiIssues ? 'text-amber-700' : 'text-teal-700'
                    }`}
                  >
                    {hasMultiIssues ? 'Attention Needed' : 'Schedule Feasible'}
                  </span>
                )}
              </div>

              {multiSortedStops.length === 0 ? (
                <p className="text-xs text-slate-500">Select at least one shift above to plot.</p>
              ) : loadingMulti ? (
                <p className="text-xs text-slate-500">
                  Calculating OneMap travel times between consecutive locations...
                </p>
              ) : (
                <div className="space-y-3">
                  {multiLegs.map((leg, idx) => (
                    <div
                      key={leg.toOpportunity.id}
                      className={`border rounded-xl p-4 space-y-1.5 text-xs ${
                        leg.overlapWithPrev
                          ? 'bg-red-50/70 border-red-300'
                          : leg.tightTransition
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-[#FAFAF9] border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-tabular font-bold text-slate-900">
                          Stop {idx + 1}: {leg.toOpportunity.timeLabel}
                        </span>
                        <span className="font-mono-tabular text-slate-600">
                          {leg.route?.minutes !== null && leg.route?.minutes !== undefined
                            ? `~${leg.route.minutes} min travel (${leg.route.distanceKm} km)`
                            : `Travel time unavailable (${leg.route?.distanceKm ?? '—'} km)`}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900">{leg.toOpportunity.title}</p>
                      <p className="text-slate-600">
                        From {leg.fromLabel} → {leg.toOpportunity.location} (S
                        {leg.toOpportunity.postalCode})
                      </p>

                      {leg.overlapWithPrev && (
                        <p className="inline-flex items-center gap-1.5 font-semibold text-red-700 pt-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Time overlap with previous shift. Choose non-overlapping hours.
                        </p>
                      )}
                      {!leg.overlapWithPrev && leg.tightTransition && (
                        <p className="inline-flex items-center gap-1.5 font-semibold text-amber-800 pt-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Only {leg.gapMinutesFromPrev} min between shifts—insufficient transit
                          buffer.
                        </p>
                      )}
                      {!leg.overlapWithPrev &&
                        !leg.tightTransition &&
                        leg.gapMinutesFromPrev !== null && (
                          <p className="inline-flex items-center gap-1.5 font-semibold text-teal-700 pt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            {leg.gapMinutesFromPrev} min transition gap — feasible between stops.
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              )}

              {multiSortedStops.length >= 2 && !loadingMulti && (
                <p className="text-[11px] text-slate-500 pt-1">
                  Recommendation:{' '}
                  {hasMultiIssues
                    ? 'Uncheck the overlapping or tight-gap shift above to maintain a safe Singapore transit buffer. Confirmed commitments are never automatically modified.'
                    : 'Your selected shifts run in sequence with comfortable travel time between venues.'}
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <OneMapExplorer
              startingLocation={origin}
              opportunities={multiSortedStops}
              travelTimes={travelTimes}
              selectedOppId={multiSortedStops[0]?.id ?? null}
              onSelectOpportunity={(id) => setSelectedOppId(id)}
              routePolylines={
                multiLegs
                  .map((l) => l.route?.polyline ?? [])
                  .filter((line) => line.length >= 2)
              }
              routeStops={multiSortedStops.map((stop, idx) => ({
                order: idx + 1,
                label: stop.title,
                sublabel: `${stop.timeLabel} · ${stop.location}`,
                lat: stop.lat,
                lng: stop.lng,
              }))}
              title={`Multi-Mission Route Map (${multiDate})`}
              subtitle="Numbered pins show chronological mission sequence from your starting location"
            />
          </div>
        </div>
      )}
    </div>
  );
};
