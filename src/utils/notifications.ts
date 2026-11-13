import {
  NotificationLogEntry,
  NotificationPreferences,
  Opportunity,
  ReminderOffset,
  VolunteerProfile,
} from '../types';
import { calculateSuggestedDeparture, formatTime12Sg, getSingaporeNowTimeLabel } from './time';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  whatsappEnabled: true,
  inAppEnabled: true,
  consentAccepted: true,
  demoContactLabel: 'Alex Tan · Demo Contact (In-App Simulation)',
  reminderOffsets: ['24h', '1h'],
  departureRemindersEnabled: true,
  departureBufferMinutes: 15,
  lastMinuteAlertsEnabled: true,
  cancellationAlertsEnabled: true,
};

export const REMINDER_OFFSET_LABELS: Record<ReminderOffset, string> = {
  '24h': '24 hours before shift',
  '3h': '3 hours before shift',
  '1h': '1 hour before shift',
};

export interface WhatsAppReminderPayload {
  id: string;
  isSimulated: true;
  offsetLabel: string;
  sentAtSg: string;
  recipientLabel: string;
  opportunity: Opportunity;
  travelMinutes: number | null;
  distanceKm?: number;
  bufferMinutes: 10 | 15 | 30;
  suggestedDepartureLabel: string;
  messageLines: string[];
}

export function buildWhatsAppReminderPayload(params: {
  volunteer: VolunteerProfile;
  opportunity: Opportunity;
  travelMinutes: number | null;
  distanceKm?: number;
  bufferMinutes: 10 | 15 | 30;
  offsetLabel?: string;
}): WhatsAppReminderPayload {
  const {
    volunteer,
    opportunity,
    travelMinutes,
    distanceKm,
    bufferMinutes,
    offsetLabel = '1 hour before shift',
  } = params;

  const departure = calculateSuggestedDeparture(
    opportunity.startTime24,
    travelMinutes,
    bufferMinutes
  );

  const travelSummary =
    travelMinutes !== null
      ? `~${travelMinutes} min via OneMap${distanceKm ? ` (${distanceKm} km)` : ''}`
      : distanceKm !== undefined
      ? `Travel time unavailable (${distanceKm} km from ${volunteer.startingLocation.label})`
      : `Depart from ${volunteer.startingLocation.label}`;

  const suggestedDepartureLabel = departure
    ? `${departure.departureTime24} SGT (${departure.departureTime12}) with ${bufferMinutes}-min buffer`
    : `Allow ${bufferMinutes}-min buffer before ${opportunity.startTime24} SGT (${formatTime12Sg(
        opportunity.startTime24
      )})`;

  const messageLines = [
    `Hi ${volunteer.name.split(' ')[0]}, reminder for your MissionPossible shift (${offsetLabel}):`,
    `Mission: ${opportunity.title}`,
    `Charity: ${opportunity.charityName}`,
    `When: ${opportunity.dateLabel} · ${opportunity.timeLabel} (SGT)`,
    `Where: ${opportunity.location}, Singapore ${opportunity.postalCode}`,
    `Est. Journey: ${travelSummary}`,
    `Suggested Departure: ${suggestedDepartureLabel}`,
  ];

  return {
    id: `wa-sim-${Date.now()}`,
    isSimulated: true,
    offsetLabel,
    sentAtSg: getSingaporeNowTimeLabel(),
    recipientLabel: `${volunteer.name} · Simulated WhatsApp Preview`,
    opportunity,
    travelMinutes,
    distanceKm,
    bufferMinutes,
    suggestedDepartureLabel,
    messageLines,
  };
}

export function createNotificationLogEntry(params: {
  channel: NotificationLogEntry['channel'];
  title: string;
  summary: string;
  opportunityId?: string;
  status: NotificationLogEntry['status'];
}): NotificationLogEntry {
  return {
    id: `nlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestampSg: getSingaporeNowTimeLabel(),
    ...params,
  };
}
