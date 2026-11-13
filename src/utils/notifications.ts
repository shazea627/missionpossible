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
      ? `About ${travelMinutes} min travel${distanceKm ? ` (${distanceKm} km)` : ''}`
      : distanceKm !== undefined
      ? `${distanceKm} km from ${volunteer.startingLocation.label}`
      : `Depart from ${volunteer.startingLocation.label}`;

  const suggestedDepartureLabel = departure
    ? `${departure.departureTime12} (${bufferMinutes}-min early buffer)`
    : `Allow ${bufferMinutes} min extra before ${formatTime12Sg(opportunity.startTime24)}`;

  const firstName = volunteer.name.split(' ')[0];
  const leadText =
    offsetLabel.includes('24 hours')
      ? `Hi ${firstName}, your mission is tomorrow! Here’s everything you need to know:`
      : `Hi ${firstName}, friendly reminder for your upcoming mission (${offsetLabel}):`;

  const messageLines = [
    leadText,
    `Mission: ${opportunity.title} with ${opportunity.charityName}`,
    `When: ${opportunity.dateLabel} · ${opportunity.timeLabel}`,
    `Where: ${opportunity.location}, Singapore ${opportunity.postalCode}`,
    `Travel: ${travelSummary}`,
    `Suggested departure: ${suggestedDepartureLabel}`,
  ];

  return {
    id: `wa-sim-${Date.now()}`,
    isSimulated: true,
    offsetLabel,
    sentAtSg: getSingaporeNowTimeLabel(),
    recipientLabel: `${volunteer.name} · Preview Only (Simulated)`,
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
