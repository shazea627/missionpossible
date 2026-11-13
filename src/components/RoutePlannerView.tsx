import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle2,
  Footprints,
  TrainFront,
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
import {
  calculateSuggestedDeparture,
  minutesBetweenShifts,
  shiftsOverlap,
  time24ToMinutes,
} from '../utils/time';
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
  { id: 'pt', label: 'Public Transport', icon: <TrainFront className="w-4 h-4" /> },
  { id: 'walk', label: 'Walking', icon: <Footprints className="w-4 h-4" /> },
  { id: 'drive', label: 'Driving', icon: <Car className="w-4 h-4" /> },
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
            reason: 'Live route timing could not be loaded right now.',
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
      setOriginError('Please enter a 6-digit Singapore postal code or landmark.');
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
        setOriginError('We could not find a matching Singapore address or postal code.');
      }
    } catch {
      setOriginError('Address search is temporarily unavailable. Try a preset neighbourhood below.');
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
      onNotify('Starting location saved', `${place.building} (Singapore ${place.postal})`);
    }
  };

  const suggestedDeparture = selectedOpp
    ? calculateSuggestedDeparture(
        selectedOpp.startTime24,
        routeResult?.minutes ?? null,
        arrivalBufferMinutes
      )
    : null;

  // Multi-mission planning
  const uniqueDates = useMemo(() => {
    const set = new Set<string>(opportunities.map((o) => o.isoDate));
    return Array.from(set).sort();
  }, [opportunities]);

  const defaultMultiDate = useMemo(() => {
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

  const activeModeLabel =
    PLANNER_MODES.find((m) => m.id === transportMode)?.label ?? 'Public Transport';

  return (
    <div className="space-y-6">
      {/* Header & Single / Multi-Mission Switch */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Plan My Journey
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            See how to get to your mission, how long it takes, and what time to leave.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg shrink-0 self-start">
          <button
            type="button"
            onClick={() => setPlannerTab('single')}
            className={`px-3.5 min-h-[40px] text-xs sm:text-sm font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              plannerTab === 'single'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Single Mission
          </button>
          <button
            type="button"
            onClick={() => setPlannerTab('multi')}
            className={`px-3.5 min-h-[40px] text-xs sm:text-sm font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              plannerTab === 'multi'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Multiple Missions in One Day
          </button>
        </div>
      </div>

      {/* Journey Setup Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-2.5">
          <label
            htmlFor="route-origin-search"
            className="block text-xs font-semibold text-slate-700"
          >
            Where are you leaving from?
          </label>
          <form onSubmit={handleOriginSearchSubmit} className="flex gap-2">
            <input
              id="route-origin-search"
              type="text"
              value={originSearch}
              onChange={(e) => setOriginSearch(e.target.value)}
              placeholder="Postal code or MRT station"
              className="flex-1 min-w-0 px-3.5 min-h-[44px] text-sm bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="submit"
              disabled={searchingOrigin}
              className="px-4 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              {searchingOrigin ? 'Finding...' : 'Set Start'}
            </button>
          </form>
          {originError && (
            <p role="alert" className="text-xs text-red-600">
              {originError}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {QUICK_ORIGIN_PRESETS.map((preset) => (
              <button
                key={preset.postal}
                type="button"
                onClick={() => applyOrigin(preset)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                  origin.postalCode === preset.postal
                    ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                    : 'bg-[#FAFAF9] border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {preset.building.split(' ')[0]}
              </button>
            ))}
          </div>

          {originResults.length > 0 && (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-[#FAFAF9]">
              {originResults.map((place, idx) => (
                <div
                  key={`${place.postal}-${idx}`}
                  className="px-3 py-2.5 flex items-center justify-between gap-2"
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
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Save as home
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500">
            Starting from <strong className="text-slate-800">{origin.label}</strong>
          </p>
        </div>

        <div className="lg:col-span-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-700">How are you travelling?</p>
          <div className="grid grid-cols-3 gap-2">
            {PLANNER_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setTransportMode(m.id)}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 min-h-[44px] text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
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
          <p className="text-xs text-slate-500">
            Select how you prefer to travel so we can estimate your departure time.
          </p>
        </div>

        <div className="lg:col-span-3 space-y-2.5">
          <p className="text-xs font-semibold text-slate-700">Arrive early by</p>
          <div className="grid grid-cols-3 gap-2">
            {([10, 15, 30] as const).map((buf) => (
              <button
                key={buf}
                type="button"
                onClick={() => onChangeBufferMinutes(buf)}
                className={`px-2.5 min-h-[44px] text-xs font-mono-tabular font-semibold rounded-lg border transition-colors cursor-pointer ${
                  arrivalBufferMinutes === buf
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-[#FAFAF9] border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {buf} min
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">Gives you time to settle in before the shift starts.</p>
        </div>
      </div>

      {plannerTab === 'single' && selectedOpp ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Getting There Summary & Directions */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div>
                <label
                  htmlFor="route-mission-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Choose a mission
                </label>
                <select
                  id="route-mission-select"
                  value={selectedOpp.id}
                  onChange={(e) => setSelectedOppId(e.target.value)}
                  className="w-full px-3 min-h-[44px] text-sm bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {confirmedOpps.length > 0 && (
                    <optgroup label="Your Confirmed Missions">
                      {confirmedOpps.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title} ({o.dateLabel})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Other Upcoming Missions">
                    {opportunities
                      .filter((o) => !confirmedOpps.some((c) => c.id === o.id))
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title} ({o.dateLabel})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Getting There Overview */}
              <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Getting there
                  </h2>
                  <span className="text-xs font-medium text-teal-700">{activeModeLabel}</span>
                </div>

                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Location</dt>
                    <dd className="font-medium text-slate-900 text-right">
                      {selectedOpp.location} (S{selectedOpp.postalCode})
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Estimated travel time</dt>
                    <dd className="font-mono-tabular font-semibold text-slate-900 text-right">
                      {loadingRoute
                        ? 'Checking...'
                        : routeResult?.minutes !== null && routeResult?.minutes !== undefined
                        ? `${routeResult.minutes} min (${routeResult.distanceKm} km)`
                        : `Unavailable (${routeResult?.distanceKm ?? '—'} km away)`}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Shift starts</dt>
                    <dd className="font-mono-tabular font-medium text-slate-900 text-right">
                      {selectedOpp.dateLabel} · {selectedOpp.startTime24}
                    </dd>
                  </div>
                </dl>

                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-semibold text-teal-800">Suggested departure time</p>
                  {suggestedDeparture ? (
                    <div className="mt-1">
                      <p className="font-mono-tabular text-2xl font-bold text-teal-700">
                        {suggestedDeparture.departureTime12}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Leave {origin.label} around {suggestedDeparture.departureTime12} to arrive{' '}
                        {arrivalBufferMinutes} minutes before your {selectedOpp.startTime24} start.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 mt-1">
                      Live travel time isn&apos;t available right now. Plan to arrive around{' '}
                      <strong className="font-mono-tabular">
                        {calculateSuggestedDeparture(
                          selectedOpp.startTime24,
                          0,
                          arrivalBufferMinutes
                        )?.targetArrivalTime12}
                      </strong>{' '}
                      ({arrivalBufferMinutes} minutes before the shift starts).
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Step-by-Step Route Directions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Step-by-step route
                </h3>
                {routeResult?.transitSummary && (
                  <span className="font-mono-tabular text-xs text-teal-700 font-semibold">
                    {routeResult.transitSummary}
                  </span>
                )}
              </div>

              {loadingRoute ? (
                <p className="text-sm text-slate-500 py-2">Finding your route...</p>
              ) : routeResult && routeResult.instructions.length > 0 ? (
                <ol className="space-y-3 text-sm">
                  {routeResult.instructions.map((inst, idx) => (
                    <li
                      key={`${idx}-${inst.step}`}
                      className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="font-mono-tabular text-xs font-bold text-teal-700 mt-0.5 shrink-0">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <span className="text-slate-800 leading-relaxed">{inst.step}</span>
                      </div>
                      {inst.distanceText && (
                        <span className="font-mono-tabular text-xs text-slate-500 shrink-0 mt-0.5">
                          {inst.distanceText}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">
                    Turn-by-turn directions aren&apos;t available for this route
                  </p>
                  <p className="text-xs">
                    You can still check the destination pin on the map ({routeResult?.distanceKm ?? '—'} km away).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Interactive OneMap View */}
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
              title={`${origin.label} → ${selectedOpp.location}`}
              subtitle={
                routeResult?.source === 'live' && routeResult.minutes !== null
                  ? `Estimated ${routeResult.minutes} min by ${activeModeLabel.toLowerCase()} (${routeResult.distanceKm} km)`
                  : `Showing route distance (${routeResult?.distanceKm ?? '—'} km)`
              }
            />

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-slate-600">
                Want to see how this fits with your other upcoming commitments?
              </span>
              <button
                type="button"
                onClick={onOpenCalendar}
                className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
              >
                <span>Open My Calendar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MULTI-MISSION SAME-DAY PLANNER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Combine missions on the same day
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pick 2 or more missions to check travel time between them. Nothing changes on your
                  calendar until you register.
                </p>
              </div>

              <div>
                <label
                  htmlFor="multi-date-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Choose a date
                </label>
                <select
                  id="multi-date-select"
                  value={multiDate}
                  onChange={(e) => setMultiDate(e.target.value)}
                  className="w-full px-3 min-h-[42px] text-sm bg-[#FAFAF9] border border-slate-300 rounded-lg font-mono-tabular"
                >
                  {uniqueDates.map((date) => {
                    const count = opportunities.filter((o) => o.isoDate === date).length;
                    return (
                      <option key={date} value={date}>
                        {date} ({count} mission{count === 1 ? '' : 's'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700">Missions on {multiDate}</p>
                {sameDayCandidates.map((opp) => {
                  const checked = multiSelectedIds.includes(opp.id);
                  const isConfirmed = confirmedOpps.some((c) => c.id === opp.id);
                  return (
                    <label
                      key={opp.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                        checked
                          ? 'bg-teal-50/70 border-teal-600'
                          : 'bg-[#FAFAF9] border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMultiStop(opp.id)}
                        className="mt-1 w-4 h-4 accent-teal-700"
                      />
                      <div className="min-w-0 flex-1 text-xs sm:text-sm">
                        <p className="font-semibold text-slate-900">
                          {opp.title}{' '}
                          {isConfirmed && (
                            <span className="text-teal-700 font-medium">· Confirmed</span>
                          )}
                        </p>
                        <p className="text-slate-600 mt-0.5 text-xs font-mono-tabular">
                          {opp.timeLabel} · {opp.location}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Day Schedule Check
                </h3>
                {multiSortedStops.length >= 2 && !loadingMulti && (
                  <span
                    className={`text-xs font-semibold ${
                      hasMultiIssues ? 'text-amber-700' : 'text-teal-700'
                    }`}
                  >
                    {hasMultiIssues ? 'Tight timing' : 'Works well together'}
                  </span>
                )}
              </div>

              {multiSortedStops.length === 0 ? (
                <p className="text-xs text-slate-500">Select at least one mission above.</p>
              ) : loadingMulti ? (
                <p className="text-xs text-slate-500">Checking travel time between stops...</p>
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
                            ? `~${leg.route.minutes} min travel`
                            : `${leg.route?.distanceKm ?? '—'} km`}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {leg.toOpportunity.title}
                      </p>
                      <p className="text-slate-600">
                        From {leg.fromLabel} → {leg.toOpportunity.location}
                      </p>

                      {leg.overlapWithPrev && (
                        <p className="inline-flex items-center gap-1.5 font-semibold text-red-700 pt-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          These two missions happen at the same time.
                        </p>
                      )}
                      {!leg.overlapWithPrev && leg.tightTransition && (
                        <p className="inline-flex items-center gap-1.5 font-semibold text-amber-800 pt-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Only {leg.gapMinutesFromPrev} min between missions—may feel rushed.
                        </p>
                      )}
                      {!leg.overlapWithPrev &&
                        !leg.tightTransition &&
                        leg.gapMinutesFromPrev !== null && (
                          <p className="inline-flex items-center gap-1.5 font-semibold text-teal-700 pt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            {leg.gapMinutesFromPrev} min gap — plenty of time to travel.
                          </p>
                        )}
                    </div>
                  ))}
                </div>
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
              routePolylines={multiLegs
                .map((l) => l.route?.polyline ?? [])
                .filter((line) => line.length >= 2)}
              routeStops={multiSortedStops.map((stop, idx) => ({
                order: idx + 1,
                label: stop.title,
                sublabel: `${stop.timeLabel} · ${stop.location}`,
                lat: stop.lat,
                lng: stop.lng,
              }))}
              title={`Day Route (${multiDate})`}
              subtitle="Numbered pins show your route order from your starting location"
            />
          </div>
        </div>
      )}
    </div>
  );
};
