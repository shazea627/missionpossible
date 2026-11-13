import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}

const searchCache = new Map<string, CachedEntry<unknown>>();
const routeCache = new Map<string, CachedEntry<unknown>>();
let holidaysCache: CachedEntry<unknown> | null = null;
let weatherCache: CachedEntry<unknown> | null = null;

let oneMapToken: string | null = null;
let oneMapTokenExpiry = 0;

function hasOneMapCredentials(): boolean {
  return Boolean(
    (process.env.ONEMAP_EMAIL && process.env.ONEMAP_PASSWORD) || process.env.ONEMAP_TOKEN
  );
}

function getOptionalDataGovSgApiKey(): string | null {
  const raw = process.env.DATA_GOV_SG_API_KEY?.trim();
  if (!raw || raw.startsWith('MY_')) return null;
  return raw;
}

function getDataGovSgHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const apiKey = getOptionalDataGovSgApiKey();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getOneMapToken(): Promise<string | null> {
  if (process.env.ONEMAP_TOKEN) {
    return process.env.ONEMAP_TOKEN;
  }
  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD;
  if (!email || !password) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (oneMapToken && oneMapTokenExpiry - 300 > nowSec) {
    return oneMapToken;
  }

  try {
    const res = await fetchWithTimeout('https://www.onemap.gov.sg/api/auth/post/getToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      access_token?: string;
      expiry_timestamp?: string | number;
    };
    if (!payload.access_token) return null;
    oneMapToken = payload.access_token;
    oneMapTokenExpiry = Number(payload.expiry_timestamp) || nowSec + 250000;
    return oneMapToken;
  } catch {
    return null;
  }
}

// --- Labelled Demonstration Singapore Locations (Fallback when OneMap credentials are absent) ---
interface SgPlace {
  postal: string;
  building: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
}

const DEMO_SG_PLACES: SgPlace[] = [
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
    postal: '469662',
    building: 'Heartbeat@Bedok',
    address: '11 Bedok North Street 1, Singapore 469662',
    district: 'East',
    lat: 1.3264,
    lng: 103.9317,
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
    postal: '579799',
    building: 'Bishan Community Club',
    address: '51 Bishan Street 13, Singapore 579799',
    district: 'Central',
    lat: 1.3496,
    lng: 103.8507,
  },
  {
    postal: '608532',
    building: 'Jurong East Regional Hub (JEM / Westgate)',
    address: '50 Jurong Gateway Road, Singapore 608532',
    district: 'West',
    lat: 1.3331,
    lng: 103.7429,
  },
  {
    postal: '449013',
    building: 'East Coast Park Area F',
    address: '1000 East Coast Parkway, Singapore 449013',
    district: 'East',
    lat: 1.3042,
    lng: 103.9308,
  },
  {
    postal: '059764',
    building: 'Chinatown Point / Kreta Ayer',
    address: '133 New Bridge Road, Singapore 059764',
    district: 'Central',
    lat: 1.2852,
    lng: 103.8448,
  },
  {
    postal: '200640',
    building: 'Jalan Besar Community Club',
    address: '69 Jellicoe Road, Singapore 200640',
    district: 'Central',
    lat: 1.3075,
    lng: 103.8617,
  },
  {
    postal: '160018',
    building: 'Tiong Bahru Active Ageing Centre',
    address: '18 Jalan Membina, Singapore 160018',
    district: 'Central',
    lat: 1.2846,
    lng: 103.8256,
  },
  {
    postal: '828868',
    building: 'One Punggol Regional Hub',
    address: '1 Punggol Drive, Singapore 828868',
    district: 'North-East',
    lat: 1.4083,
    lng: 103.9048,
  },
  {
    postal: '760101',
    building: 'Yishun Ring Road Care Hub',
    address: '101 Yishun Avenue 5, Singapore 760101',
    district: 'North',
    lat: 1.4307,
    lng: 103.8281,
  },
];

const SECTOR_CENTROIDS: Record<string, { label: string; district: string; lat: number; lng: number }> = {
  '0': { label: 'Marina / Chinatown / Raffles Place', district: 'Central', lat: 1.283, lng: 103.848 },
  '1': { label: 'Bukit Merah / Tiong Bahru / Queenstown', district: 'Central', lat: 1.289, lng: 103.809 },
  '2': { label: 'Orchard / Kallang / Jalan Besar', district: 'Central', lat: 1.305, lng: 103.852 },
  '3': { label: 'Toa Payoh / Novena / Geylang', district: 'Central', lat: 1.326, lng: 103.855 },
  '4': { label: 'Eunos / Bedok / East Coast', district: 'East', lat: 1.318, lng: 103.918 },
  '5': { label: 'Tampines / Pasir Ris / Bishan', district: 'East', lat: 1.356, lng: 103.925 },
  '6': { label: 'Jurong East / Clementi / Bukit Batok', district: 'West', lat: 1.338, lng: 103.735 },
  '7': { label: 'Woodlands / Yishun / Sembawang', district: 'North', lat: 1.434, lng: 103.812 },
  '8': { label: 'Sengkang / Punggol / Hougang', district: 'North-East', lat: 1.394, lng: 103.898 },
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// --- 1. Integration Status Endpoint ---
app.get('/api/integrations/status', (_req, res) => {
  const dataGovAuthMode = getOptionalDataGovSgApiKey()
    ? 'optional-key-configured'
    : 'keyless-public';

  res.json({
    onemap: {
      configured: hasOneMapCredentials(),
      mode: hasOneMapCredentials() ? 'live' : 'credentials-required',
      notes: hasOneMapCredentials()
        ? 'Server-side OneMap API credentials configured.'
        : 'Requires ONEMAP_EMAIL and ONEMAP_PASSWORD on server for live Search & Routing; map tiles remain active and routing falls back cleanly.',
    },
    holidays: {
      endpoint: 'https://data.gov.sg/api/action/datastore_search',
      requiresCredentials: false,
      authMode: dataGovAuthMode,
    },
    weather: {
      endpoint: 'https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook',
      requiresCredentials: false,
      authMode: dataGovAuthMode,
    },
    charityPortal: {
      url: 'https://www.charities.gov.sg',
      mode: 'external-verification',
    },
    googleCalendar: {
      configured: false,
      fallback: 'ics',
      notes: 'Google Calendar OAuth not enabled; ICS calendar invitation export active.',
    },
  });
});

// --- 2. OneMap Search Proxy ---
app.get('/api/onemap/search', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Search query parameter q is required.' });
  }

  const cacheKey = q.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  const token = await getOneMapToken();
  if (token) {
    try {
      const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
        q
      )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
      const apiRes = await fetchWithTimeout(url, {
        headers: { Authorization: token },
      });

      if (apiRes.status === 429) {
        return res.status(429).json({
          source: 'demo',
          rateLimited: true,
          reason: 'OneMap API rate limit reached. Showing demonstration Singapore address matches.',
          results: buildDemoSearchResults(q),
        });
      }

      if (apiRes.ok) {
        const json = (await apiRes.json()) as {
          results?: Array<{
            SEARCHVAL: string;
            ADDRESS: string;
            POSTAL: string;
            LATITUDE: string;
            LONGITUDE: string;
          }>;
        };
        const mapped = (json.results ?? []).slice(0, 6).map((r) => ({
          postal: r.POSTAL || 'NIL',
          building: r.SEARCHVAL,
          address: r.ADDRESS,
          lat: Number(r.LATITUDE),
          lng: Number(r.LONGITUDE),
        }));
        const payload = { source: 'live', results: mapped };
        searchCache.set(cacheKey, { data: payload, expiresAt: Date.now() + 15 * 60 * 1000 });
        return res.json(payload);
      }
    } catch {
      // Fall through cleanly to demonstration fallback
    }
  }

  const demoPayload = {
    source: 'demo',
    reason: hasOneMapCredentials()
      ? 'OneMap live service unreachable; using labelled demonstration Singapore data.'
      : 'OneMap server credentials not configured; using labelled demonstration Singapore postal & location data.',
    results: buildDemoSearchResults(q),
  };
  searchCache.set(cacheKey, { data: demoPayload, expiresAt: Date.now() + 5 * 60 * 1000 });
  return res.json(demoPayload);
});

function buildDemoSearchResults(query: string) {
  const q = query.trim().toLowerCase();
  const exactOrPartial = DEMO_SG_PLACES.filter(
    (p) =>
      p.postal.includes(q) ||
      p.building.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q)
  );
  if (exactOrPartial.length > 0) {
    return exactOrPartial.slice(0, 6);
  }

  if (/^\d{6}$/.test(q)) {
    const sector = SECTOR_CENTROIDS[q[0]] ?? SECTOR_CENTROIDS['4'];
    const subOffset = ((Number(q.slice(2, 4)) % 10) - 5) * 0.0022;
    return [
      {
        postal: q,
        building: `Singapore ${q} (${sector.label})`,
        address: `Postal Sector ${q.slice(0, 2)}, ${sector.label}, Singapore ${q}`,
        district: sector.district,
        lat: Number((sector.lat + subOffset).toFixed(4)),
        lng: Number((sector.lng - subOffset).toFixed(4)),
      },
    ];
  }

  return [];
}

// --- 3. OneMap Routing / Travel Time Proxy (Never Invents Live Routing Minutes) ---
app.post('/api/onemap/travel-times', async (req, res) => {
  const { startLat, startLng, mode = 'pt', destinations = [] } = req.body as {
    startLat: number;
    startLng: number;
    mode?: 'pt' | 'drive' | 'walk' | 'cycle';
    destinations: Array<{ id: string; lat: number; lng: number }>;
  };

  if (
    typeof startLat !== 'number' ||
    typeof startLng !== 'number' ||
    !Array.isArray(destinations)
  ) {
    return res.status(400).json({ error: 'Invalid start coordinates or destinations.' });
  }

  const token = await getOneMapToken();
  const results: Record<
    string,
    { minutes: number | null; distanceKm: number; source: 'live' | 'unavailable' }
  > = {};

  let usedLive = false;
  let rateLimited = false;

  if (token) {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateParam = `${mm}-${dd}-${yyyy}`;

    for (const dest of destinations.slice(0, 15)) {
      const rKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${dest.lat.toFixed(
        4
      )},${dest.lng.toFixed(4)}:${mode}`;
      const cached = routeCache.get(rKey);
      if (cached && cached.expiresAt > Date.now()) {
        results[dest.id] = cached.data as {
          minutes: number | null;
          distanceKm: number;
          source: 'live' | 'unavailable';
        };
        if (results[dest.id].source === 'live') usedLive = true;
        continue;
      }

      try {
        const params = new URLSearchParams({
          start: `${startLat},${startLng}`,
          end: `${dest.lat},${dest.lng}`,
          routeType: mode,
        });
        if (mode === 'pt') {
          params.set('date', dateParam);
          params.set('time', '09:00:00');
          params.set('mode', 'TRANSIT');
        }
        const routeRes = await fetchWithTimeout(
          `https://www.onemap.gov.sg/api/public/routingsvc/route?${params.toString()}`,
          { headers: { Authorization: token } },
          4500
        );

        if (routeRes.status === 429) {
          rateLimited = true;
          break;
        }

        if (routeRes.ok) {
          const payload = (await routeRes.json()) as {
            route_summary?: { total_time?: number; total_distance?: number };
            plan?: { itineraries?: Array<{ duration?: number }> };
          };

          const totalSeconds =
            payload.route_summary?.total_time ?? payload.plan?.itineraries?.[0]?.duration;
          const totalMeters = payload.route_summary?.total_distance;

          if (typeof totalSeconds === 'number' && totalSeconds > 0) {
            const entry = {
              minutes: Math.max(1, Math.round(totalSeconds / 60)),
              distanceKm:
                typeof totalMeters === 'number'
                  ? Math.round((totalMeters / 1000) * 10) / 10
                  : haversineKm(startLat, startLng, dest.lat, dest.lng),
              source: 'live' as const,
            };
            results[dest.id] = entry;
            routeCache.set(rKey, { data: entry, expiresAt: Date.now() + 15 * 60 * 1000 });
            usedLive = true;
            continue;
          }
        }
      } catch {
        // Fall through to unavailable for this route
      }
    }
  }

  for (const dest of destinations) {
    if (!results[dest.id]) {
      results[dest.id] = {
        minutes: null,
        distanceKm: haversineKm(startLat, startLng, dest.lat, dest.lng),
        source: 'unavailable',
      };
    }
  }

  return res.json({
    source: usedLive ? 'live' : 'unavailable',
    rateLimited,
    mode,
    reason: usedLive
      ? undefined
      : hasOneMapCredentials()
      ? 'OneMap routing unavailable or rate-limited; travel time unavailable.'
      : 'OneMap credentials (ONEMAP_EMAIL / ONEMAP_PASSWORD) not configured on server; live travel time unavailable.',
    travelTimes: results,
  });
});

function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b = 0;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function toOneMapDateParam(isoDate?: string): string {
  if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [yyyy, mm, dd] = isoDate.split('-');
    return `${mm}-${dd}-${yyyy}`;
  }
  const sgNow = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [yyyy, mm, dd] = sgNow.split('-');
  return `${mm}-${dd}-${yyyy}`;
}

interface RouteInstructionItem {
  step: string;
  distanceText?: string;
  mode?: string;
}

app.post('/api/onemap/route', async (req, res) => {
  const {
    startLat,
    startLng,
    endLat,
    endLng,
    mode = 'pt',
    isoDate,
    startTime24 = '09:00',
  } = req.body as {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    mode?: 'pt' | 'drive' | 'walk' | 'cycle';
    isoDate?: string;
    startTime24?: string;
  };

  if (
    typeof startLat !== 'number' ||
    typeof startLng !== 'number' ||
    typeof endLat !== 'number' ||
    typeof endLng !== 'number'
  ) {
    return res.status(400).json({ error: 'Valid start and end coordinates are required.' });
  }

  const straightLineKm = haversineKm(startLat, startLng, endLat, endLng);
  const dateParam = toOneMapDateParam(isoDate);
  const timeParam = /^\d{2}:\d{2}$/.test(startTime24) ? `${startTime24}:00` : '09:00:00';
  const cacheKey = `detailed:${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(
    4
  )},${endLng.toFixed(4)}:${mode}:${dateParam}:${timeParam}`;

  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  const token = await getOneMapToken();
  if (!token) {
    return res.json({
      source: 'unavailable',
      mode,
      minutes: null,
      distanceKm: straightLineKm,
      instructions: [],
      polyline: [],
      reason:
        'OneMap server credentials (ONEMAP_EMAIL / ONEMAP_PASSWORD) are not configured; route directions and live travel time are unavailable.',
    });
  }

  try {
    const params = new URLSearchParams({
      start: `${startLat},${startLng}`,
      end: `${endLat},${endLng}`,
      routeType: mode,
    });
    if (mode === 'pt') {
      params.set('date', dateParam);
      params.set('time', timeParam);
      params.set('mode', 'TRANSIT');
      params.set('numItineraries', '1');
    }

    const routeRes = await fetchWithTimeout(
      `https://www.onemap.gov.sg/api/public/routingsvc/route?${params.toString()}`,
      { headers: { Authorization: token } },
      6500
    );

    if (routeRes.status === 429) {
      return res.json({
        source: 'unavailable',
        rateLimited: true,
        mode,
        minutes: null,
        distanceKm: straightLineKm,
        instructions: [],
        polyline: [],
        reason: 'OneMap routing API rate limit reached; live directions temporarily unavailable.',
      });
    }

    if (routeRes.ok) {
      const payload = (await routeRes.json()) as {
        status?: number;
        status_message?: string;
        route_summary?: { total_time?: number; total_distance?: number };
        route_instructions?: Array<[string, string, number, string, number, string, ...unknown[]]>;
        route_geometry?: string;
        plan?: {
          itineraries?: Array<{
            duration?: number;
            walkDistance?: number;
            legs?: Array<{
              mode?: string;
              distance?: number;
              duration?: number;
              route?: string;
              routeShortName?: string;
              from?: { name?: string };
              to?: { name?: string };
              legGeometry?: { points?: string };
            }>;
          }>;
        };
      };

      if (mode === 'pt' && payload.plan?.itineraries?.[0]) {
        const itin = payload.plan.itineraries[0];
        const durationSec = Number(itin.duration ?? 0);
        const legs = Array.isArray(itin.legs) ? itin.legs : [];
        const totalMeters = legs.reduce((sum, leg) => sum + Number(leg.distance ?? 0), 0);
        const polyline: [number, number][] = [];
        const instructions: RouteInstructionItem[] = [];

        for (const leg of legs) {
          if (leg.legGeometry?.points) {
            polyline.push(...decodePolyline(leg.legGeometry.points));
          }
          const legMode = (leg.mode ?? 'TRANSIT').toUpperCase();
          const fromName = leg.from?.name || 'Origin';
          const toName = leg.to?.name || 'Stop';
          const legMins = leg.duration ? Math.max(1, Math.round(leg.duration / 60)) : null;
          const distLabel =
            typeof leg.distance === 'number' && leg.distance > 0
              ? leg.distance >= 1000
                ? `${(leg.distance / 1000).toFixed(1)} km`
                : `${Math.round(leg.distance)} m`
              : undefined;
          const serviceName = leg.routeShortName || leg.route;

          if (legMode === 'WALK') {
            instructions.push({
              step: `Walk from ${fromName} to ${toName}${legMins ? ` (~${legMins} min)` : ''}`,
              distanceText: distLabel,
              mode: 'WALK',
            });
          } else {
            instructions.push({
              step: `Take ${legMode}${serviceName ? ` (${serviceName})` : ''} from ${fromName} to ${toName}${
                legMins ? ` (~${legMins} min)` : ''
              }`,
              distanceText: distLabel,
              mode: legMode,
            });
          }
        }

        if (durationSec > 0) {
          const resultPayload = {
            source: 'live' as const,
            mode,
            minutes: Math.max(1, Math.round(durationSec / 60)),
            distanceKm:
              totalMeters > 0 ? Math.round((totalMeters / 1000) * 10) / 10 : straightLineKm,
            instructions,
            polyline,
            transitSummary: `${legs.filter((l) => l.mode !== 'WALK').length} transit leg(s)`,
          };
          routeCache.set(cacheKey, { data: resultPayload, expiresAt: Date.now() + 15 * 60 * 1000 });
          return res.json(resultPayload);
        }
      }

      if (payload.route_summary?.total_time && payload.route_summary.total_time > 0) {
        const totalSeconds = payload.route_summary.total_time;
        const totalMeters = payload.route_summary.total_distance;
        const rawInstructions = Array.isArray(payload.route_instructions)
          ? payload.route_instructions
          : [];
        const instructions: RouteInstructionItem[] = rawInstructions.slice(0, 14).map((row) => {
          const dir = String(row[0] ?? 'Continue');
          const road = String(row[1] ?? '').trim();
          const meters = Number(row[2] ?? 0);
          const distText =
            meters > 0
              ? meters >= 1000
                ? `${(meters / 1000).toFixed(1)} km`
                : `${Math.round(meters)} m`
              : undefined;
          return {
            step: road && road !== '-' ? `${dir} onto ${road}` : dir,
            distanceText: distText,
            mode: mode.toUpperCase(),
          };
        });
        const polyline = payload.route_geometry ? decodePolyline(payload.route_geometry) : [];
        const resultPayload = {
          source: 'live' as const,
          mode,
          minutes: Math.max(1, Math.round(totalSeconds / 60)),
          distanceKm:
            typeof totalMeters === 'number'
              ? Math.round((totalMeters / 1000) * 10) / 10
              : straightLineKm,
          instructions,
          polyline,
        };
        routeCache.set(cacheKey, { data: resultPayload, expiresAt: Date.now() + 15 * 60 * 1000 });
        return res.json(resultPayload);
      }
    }
  } catch {
    // Fall through cleanly without inventing directions
  }

  return res.json({
    source: 'unavailable',
    mode,
    minutes: null,
    distanceKm: straightLineKm,
    instructions: [],
    polyline: [],
    reason: `OneMap could not return a ${mode.toUpperCase()} route between these points; straight-line distance shown without invented directions.`,
  });
});

// --- 4. data.gov.sg Public Holidays Proxy ---
const DEMO_SG_HOLIDAYS = [
  { date: '2026-11-08', day: 'Sunday', holiday: 'Deepavali' },
  { date: '2026-11-09', day: 'Monday', holiday: 'Deepavali (Observed Holiday)' },
  { date: '2026-12-25', day: 'Friday', holiday: 'Christmas Day' },
  { date: '2027-01-01', day: 'Friday', holiday: "New Year's Day" },
  { date: '2027-02-06', day: 'Saturday', holiday: 'Chinese New Year' },
  { date: '2027-02-07', day: 'Sunday', holiday: 'Chinese New Year (Day 2)' },
  { date: '2027-02-08', day: 'Monday', holiday: 'Chinese New Year (Observed Holiday)' },
  { date: '2027-03-10', day: 'Wednesday', holiday: 'Hari Raya Puasa' },
  { date: '2027-03-26', day: 'Friday', holiday: 'Good Friday' },
  { date: '2027-05-01', day: 'Saturday', holiday: 'Labour Day' },
];

app.get('/api/sg/holidays', async (_req, res) => {
  if (holidaysCache && holidaysCache.expiresAt > Date.now()) {
    return res.json(holidaysCache.data);
  }

  const headers = getDataGovSgHeaders();
  const authMode = getOptionalDataGovSgApiKey() ? 'optional-key-configured' : 'keyless-public';
  let rateLimited = false;
  let failureReason =
    'data.gov.sg live endpoint unreachable; displaying fallback MOM Singapore Public Holiday dataset.';

  try {
    const datasetId = 'd_8ef23381f9417e4d4254ee8b4dcdb176';
    const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${datasetId}&limit=200`;
    const apiRes = await fetchWithTimeout(url, { headers });

    if (apiRes.status === 429) {
      rateLimited = true;
      failureReason =
        'data.gov.sg public holidays API rate limit reached; displaying fallback MOM holiday dates.';
    } else if (apiRes.ok) {
      const json = (await apiRes.json()) as {
        success?: boolean;
        result?: {
          records?: Array<{ date: string; day: string; holiday: string }>;
        };
      };
      const records = (json.result?.records ?? [])
        .filter((r) => r.date && r.holiday)
        .map((r) => ({
          date: r.date.slice(0, 10),
          day: r.day,
          holiday: r.holiday,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      if (records.length > 0) {
        const payload = {
          source: 'live',
          authMode,
          rateLimited: false,
          datasetId,
          holidays: records,
        };
        holidaysCache = { data: payload, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
        return res.json(payload);
      }
      failureReason =
        'data.gov.sg holiday dataset returned no records; displaying fallback MOM holiday dates.';
    } else {
      failureReason = `data.gov.sg holidays API returned HTTP ${apiRes.status}; displaying fallback MOM holiday dates.`;
    }
  } catch {
    // Graceful non-blocking fallback when network/timeout occurs
  }

  const fallbackPayload = {
    source: 'demo',
    authMode,
    rateLimited,
    reason: failureReason,
    holidays: DEMO_SG_HOLIDAYS,
  };
  holidaysCache = {
    data: fallbackPayload,
    expiresAt: Date.now() + (rateLimited ? 2 : 10) * 60 * 1000,
  };
  return res.json(fallbackPayload);
});

// --- 5. data.gov.sg Weather Forecast Proxy ---
function isWeatherDisruption(forecastText: string): boolean {
  return /(thunder|rain|shower|squall|heavy|windy)/i.test(forecastText);
}

app.get('/api/sg/weather', async (_req, res) => {
  if (weatherCache && weatherCache.expiresAt > Date.now()) {
    return res.json(weatherCache.data);
  }

  const headers = getDataGovSgHeaders();
  const authMode = getOptionalDataGovSgApiKey() ? 'optional-key-configured' : 'keyless-public';
  let rateLimited = false;
  let failureReason =
    'Live NEA weather forecast (data.gov.sg) is currently unavailable. Forecasts are never fabricated outside the official API.';

  try {
    const [fourDayRes, twentyFourRes] = await Promise.all([
      fetchWithTimeout('https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook', {
        headers,
      }),
      fetchWithTimeout('https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast', {
        headers,
      }),
    ]);

    if (fourDayRes.status === 429 || twentyFourRes.status === 429) {
      rateLimited = true;
      failureReason =
        'data.gov.sg weather API rate limit reached. Showing no invented forecasts; retry shortly.';
    } else {
      const fourDayJson = fourDayRes.ok ? ((await fourDayRes.json()) as any) : null;
      const twentyFourJson = twentyFourRes.ok ? ((await twentyFourRes.json()) as any) : null;

      const outlookRecord = fourDayJson?.data?.records?.[0] ?? fourDayJson?.data?.items?.[0];
      const fourDayForecasts: Array<{
        date: string;
        day: string;
        forecast: string;
        tempLow: number | null;
        tempHigh: number | null;
        humidityLow: number | null;
        humidityHigh: number | null;
        disruptionRisk: boolean;
      }> = [];

      if (Array.isArray(outlookRecord?.forecasts)) {
        for (const item of outlookRecord.forecasts) {
          const rawDate = String(item.timestamp ?? item.date ?? '').slice(0, 10);
          const text = String(item.forecast?.text ?? item.forecast ?? '').trim();
          if (!rawDate || !text) continue;
          fourDayForecasts.push({
            date: rawDate,
            day: String(item.day ?? ''),
            forecast: text,
            tempLow: Number(item.temperature?.low ?? NaN) || null,
            tempHigh: Number(item.temperature?.high ?? NaN) || null,
            humidityLow: Number(item.relativeHumidity?.low ?? item.humidity?.low ?? NaN) || null,
            humidityHigh:
              Number(item.relativeHumidity?.high ?? item.humidity?.high ?? NaN) || null,
            disruptionRisk: isWeatherDisruption(text),
          });
        }
      }

      const general24 = twentyFourJson?.data?.records?.[0]?.general;
      const currentSummary = general24?.forecast?.text ?? general24?.forecast ?? null;

      if (fourDayForecasts.length > 0 || currentSummary) {
        const sortedDates = fourDayForecasts.map((f) => f.date).sort();
        const payload = {
          source: 'live',
          authMode,
          rateLimited: false,
          updatedAt:
            outlookRecord?.updatedTimestamp ?? outlookRecord?.timestamp ?? new Date().toISOString(),
          supportedRange:
            sortedDates.length > 0
              ? {
                  startDate: sortedDates[0],
                  endDate: sortedDates[sortedDates.length - 1],
                }
              : null,
          twentyFourHourSummary: currentSummary,
          forecasts: fourDayForecasts,
        };
        weatherCache = { data: payload, expiresAt: Date.now() + 30 * 60 * 1000 };
        return res.json(payload);
      }

      if (!fourDayRes.ok && !twentyFourRes.ok) {
        failureReason = `data.gov.sg weather API returned HTTP ${fourDayRes.status}; forecasts remain unavailable without fabrication.`;
      }
    }
  } catch {
    // Do NOT invent weather forecasts if NEA API is unavailable
  }

  const unavailablePayload = {
    source: 'unavailable',
    authMode,
    rateLimited,
    supportedRange: null,
    twentyFourHourSummary: null,
    forecasts: [],
    error: failureReason,
  };
  weatherCache = {
    data: unavailablePayload,
    expiresAt: Date.now() + (rateLimited ? 2 : 5) * 60 * 1000,
  };
  return res.json(unavailablePayload);
});

// --- Vite Dev / Production Static Mounting ---
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`MissionPossible server listening on http://localhost:${PORT}`);
  });
}

startServer();
