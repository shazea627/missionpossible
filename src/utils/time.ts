import { AvailabilitySlot, Opportunity } from '../types';

export const SG_TIMEZONE = 'Asia/Singapore';

export function getSingaporeTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function getSingaporeNowTimeLabel(): string {
  return new Date().toLocaleTimeString('en-SG', {
    timeZone: SG_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatIsoDateSg(isoDate: string): string {
  const parsed = new Date(`${isoDate}T09:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-SG', {
    timeZone: SG_TIMEZONE,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function time24ToMinutes(time24: string): number {
  const [hhStr, mmStr] = time24.split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  return hh * 60 + mm;
}

export function minutesToTime24(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function formatTime12Sg(time24: string): string {
  const mins = time24ToMinutes(time24);
  const h24 = Math.floor(mins / 60) % 24;
  const mm = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
}

export interface SuggestedDeparture {
  departureTime24: string;
  departureTime12: string;
  targetArrivalTime24: string;
  targetArrivalTime12: string;
  departureMinutes: number;
  previousDay: boolean;
}

export function calculateSuggestedDeparture(
  startTime24: string,
  travelMinutes: number | null,
  bufferMinutes: 10 | 15 | 30
): SuggestedDeparture | null {
  if (travelMinutes === null || travelMinutes < 0) return null;
  const startMins = time24ToMinutes(startTime24);
  const targetArrivalMins = startMins - bufferMinutes;
  const departureMins = targetArrivalMins - travelMinutes;
  const departureTime24 = minutesToTime24(departureMins);
  const targetArrivalTime24 = minutesToTime24(targetArrivalMins);

  return {
    departureTime24,
    departureTime12: formatTime12Sg(departureTime24),
    targetArrivalTime24,
    targetArrivalTime12: formatTime12Sg(targetArrivalTime24),
    departureMinutes: departureMins,
    previousDay: departureMins < 0,
  };
}

export function shiftsOverlap(
  a: Pick<Opportunity, 'isoDate' | 'startTime24' | 'endTime24'>,
  b: Pick<Opportunity, 'isoDate' | 'startTime24' | 'endTime24'>
): boolean {
  if (a.isoDate !== b.isoDate) return false;
  const aStart = time24ToMinutes(a.startTime24);
  const aEnd = time24ToMinutes(a.endTime24);
  const bStart = time24ToMinutes(b.startTime24);
  const bEnd = time24ToMinutes(b.endTime24);
  return aStart < bEnd && bStart < aEnd;
}

export function minutesBetweenShifts(
  first: Pick<Opportunity, 'isoDate' | 'startTime24' | 'endTime24'>,
  second: Pick<Opportunity, 'isoDate' | 'startTime24' | 'endTime24'>
): number | null {
  if (first.isoDate !== second.isoDate) return null;
  return time24ToMinutes(second.startTime24) - time24ToMinutes(first.endTime24);
}

export function getSlotsForIsoDate(isoDate: string): AvailabilitySlot[] {
  const parsed = new Date(`${isoDate}T12:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return [];
  const day = parsed.getDay(); // 0 Sun .. 6 Sat
  if (day === 0) return ['sunday-morning', 'sunday-afternoon'];
  if (day === 6) return ['saturday-morning', 'saturday-afternoon'];
  return ['weekday-morning', 'weekday-evening'];
}
